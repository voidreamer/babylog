"""
Rest Planner router — predicts parent rest windows based on baby sleep/feeding patterns.

Analyzes historical nap clusters and feeding intervals to project
when the baby will nap during the remainder of the day, giving
parents actionable rest windows.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import logging

from ..database import get_db
from ..auth import get_current_user, get_user_email
from ..models import Baby, Feeding, Sleep
from ..benchmarks import calculate_age_weeks, get_wake_window_benchmarks
from ..predictions import make_aware, calculate_standard_deviation, calculate_sleep_pressure

router = APIRouter(prefix="/rest-planner", tags=["rest-planner"])
logger = logging.getLogger(__name__)


def get_baby_or_404(db: Session, baby_id: int, user_id: str, user_email: str) -> Baby:
    """Get baby by ID, ensuring user has access."""
    from fastapi import HTTPException
    baby = db.query(Baby).filter(Baby.id == baby_id).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    has_access = (
        baby.user_id == user_id
        or (user_email and user_email in (baby.shared_with_emails or []))
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized")
    return baby


# =============================================================================
# Nap Clustering
# =============================================================================

def cluster_naps(sleeps: List[Sleep], tz_offset: int) -> Dict[str, dict]:
    """
    Group historical daytime naps into morning/midday/afternoon clusters.

    Returns dict keyed by cluster name with avg_start_minutes (from midnight),
    avg_duration, std_dev_start, and sample count.
    """
    clusters: Dict[str, List[dict]] = {
        "morning": [],    # 6:00-10:00
        "midday": [],     # 10:00-14:00
        "afternoon": [],  # 14:00-18:00
    }

    for s in sleeps:
        if not s.end_time or not s.duration_minutes:
            continue
        duration = s.duration_minutes
        if duration >= 180:
            continue  # skip overnight sleeps

        st = make_aware(s.start_time) - timedelta(minutes=tz_offset)
        hour = st.hour

        if 6 <= hour < 10:
            bucket = "morning"
        elif 10 <= hour < 14:
            bucket = "midday"
        elif 14 <= hour < 18:
            bucket = "afternoon"
        else:
            continue  # skip nighttime

        minutes_from_midnight = st.hour * 60 + st.minute
        clusters[bucket].append({
            "start_minutes": minutes_from_midnight,
            "duration": duration,
        })

    result = {}
    for name, naps in clusters.items():
        if len(naps) < 2:
            continue
        starts = [n["start_minutes"] for n in naps]
        durations = [n["duration"] for n in naps]
        result[name] = {
            "avg_start_minutes": sum(starts) / len(starts),
            "avg_duration": sum(durations) / len(durations),
            "std_dev_start": calculate_standard_deviation(starts),
            "count": len(naps),
        }
    return result


# =============================================================================
# Rest Window Projection
# =============================================================================

def project_rest_windows(
    last_wake_time: Optional[datetime],
    active_sleep: Optional[Sleep],
    nap_clusters: Dict[str, dict],
    wake_window_minutes: int,
    avg_nap_duration: float,
    feeding_times: List[datetime],
    avg_feeding_interval_minutes: Optional[float],
    tz_offset: int,
    now: datetime,
) -> List[dict]:
    """
    Chain forward from last wake time to project today's remaining rest windows.
    """
    windows = []
    # Default bedtime 20:00 local
    local_now = now - timedelta(minutes=tz_offset)
    bedtime_local = local_now.replace(hour=20, minute=0, second=0, microsecond=0)
    bedtime_utc = bedtime_local + timedelta(minutes=tz_offset)

    # If baby is currently sleeping, add a "rest now" window
    if active_sleep:
        sleep_start = make_aware(active_sleep.start_time)
        elapsed = (now - sleep_start).total_seconds() / 60
        predicted_remaining = max(0, avg_nap_duration - elapsed)
        predicted_end = now + timedelta(minutes=predicted_remaining)

        windows.append({
            "start": sleep_start.isoformat(),
            "end": predicted_end.isoformat(),
            "duration_minutes": round(predicted_remaining),
            "label": "current_nap",
            "is_current": True,
        })
        # After this nap, chain forward
        chain_start = predicted_end
    elif last_wake_time:
        chain_start = last_wake_time
    else:
        return windows

    # Chain forward: wake window → nap → wake window → nap ...
    cursor = chain_start
    max_iterations = 6
    for _ in range(max_iterations):
        next_nap_start = cursor + timedelta(minutes=wake_window_minutes)
        if next_nap_start >= bedtime_utc:
            break

        # Find matching cluster for this nap's local time
        local_start = next_nap_start - timedelta(minutes=tz_offset)
        hour = local_start.hour
        duration = avg_nap_duration  # fallback

        if 6 <= hour < 10 and "morning" in nap_clusters:
            duration = nap_clusters["morning"]["avg_duration"]
        elif 10 <= hour < 14 and "midday" in nap_clusters:
            duration = nap_clusters["midday"]["avg_duration"]
        elif 14 <= hour < 18 and "afternoon" in nap_clusters:
            duration = nap_clusters["afternoon"]["avg_duration"]

        nap_end = next_nap_start + timedelta(minutes=duration)

        # Skip windows already in the past
        if nap_end <= now:
            cursor = nap_end
            continue

        # Determine label
        if 6 <= hour < 10:
            label = "morning_nap"
        elif 10 <= hour < 14:
            label = "midday_nap"
        else:
            label = "afternoon_nap"

        # Check for feeding overlap
        notes = []
        has_feeding_overlap = False
        if avg_feeding_interval_minutes and feeding_times:
            last_feed = max(make_aware(ft) for ft in feeding_times)
            feed_cursor = last_feed
            while feed_cursor < nap_end:
                feed_cursor += timedelta(minutes=avg_feeding_interval_minutes)
                if next_nap_start <= feed_cursor <= nap_end:
                    has_feeding_overlap = True
                    break
            if has_feeding_overlap:
                notes.append("feedingMayOverlap")
            else:
                notes.append("noFeedingOverlap")

        windows.append({
            "start": next_nap_start.isoformat(),
            "end": nap_end.isoformat(),
            "duration_minutes": round(duration),
            "label": label,
            "is_current": False,
            "has_feeding_overlap": has_feeding_overlap,
            "notes": notes,
        })

        cursor = nap_end

    return windows


# =============================================================================
# Scoring
# =============================================================================

def score_window(window: dict, nap_clusters: Dict[str, dict]) -> dict:
    """Add confidence and quality scores to a rest window."""
    label = window.get("label", "")
    cluster_name = label.replace("_nap", "")
    cluster = nap_clusters.get(cluster_name)

    # Confidence
    if cluster and cluster["count"] >= 5 and cluster["std_dev_start"] < 60:
        confidence = "high"
    elif cluster and cluster["count"] >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    # Quality score
    score = 0
    duration = window.get("duration_minutes", 0)
    if duration >= 60:
        score += 2
    elif duration >= 30:
        score += 1
    if not window.get("has_feeding_overlap", False):
        score += 1
    if confidence == "high":
        score += 1
    elif confidence == "medium":
        score += 0

    if score >= 4:
        quality = "great"
    elif score >= 2:
        quality = "good"
    else:
        quality = "fair"

    window["confidence"] = confidence
    window["quality"] = quality
    return window


# =============================================================================
# Main Endpoint
# =============================================================================

@router.get("/{baby_id}")
async def get_rest_plan(
    baby_id: int,
    days: int = Query(default=7, ge=3, le=14, description="Days of history to analyze"),
    tz_offset: int = Query(default=0, description="Timezone offset in minutes"),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
):
    """
    Predict parent rest windows for the remainder of today.

    Analyzes historical nap clusters + feeding intervals to project
    when the baby will sleep, giving actionable rest windows.
    """
    from fastapi import HTTPException
    try:
        user_id = user.get("sub")
        baby = get_baby_or_404(db, baby_id, user_id, user_email)
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        # ------------------------------------------------------------------
        # Phase 1: Data Gathering
        # ------------------------------------------------------------------
        sleeps = db.query(Sleep).filter(
            Sleep.baby_id == baby_id,
        ).order_by(Sleep.start_time.desc()).limit(200).all()
        sleeps = [s for s in sleeps if make_aware(s.start_time) >= start_date]

        feedings = db.query(Feeding).filter(
            Feeding.baby_id == baby_id,
        ).order_by(Feeding.time.desc()).limit(200).all()
        feedings = [f for f in feedings if make_aware(f.time) >= start_date]

        active_sleep = db.query(Sleep).filter(
            Sleep.baby_id == baby_id,
            Sleep.end_time.is_(None),
        ).first()

        # Baby age
        birth_date = None
        if baby.birth_date:
            bd = make_aware(baby.birth_date)
            birth_date = bd.date() if hasattr(bd, "date") else bd
        age_weeks = calculate_age_weeks(birth_date) if birth_date else 0

        # Not enough data?  Return minimal response so frontend can hide section
        completed_sleeps = [s for s in sleeps if s.end_time]
        if len(completed_sleeps) < 3:
            return {
                "baby_id": baby_id,
                "generated_at": now.isoformat(),
                "current_state": None,
                "rest_windows": [],
                "summary": {
                    "total_rest_minutes_remaining": 0,
                    "next_rest_in_minutes": None,
                    "rest_windows_count": 0,
                    "message_key": "no_rest_predicted",
                },
                "patterns_used": {
                    "avg_nap_duration": None,
                    "avg_wake_window": None,
                    "avg_feeding_interval": None,
                    "data_days": days,
                    "has_enough_data": False,
                },
            }

        # ------------------------------------------------------------------
        # Phase 2: Nap Pattern Clustering
        # ------------------------------------------------------------------
        nap_clusters = cluster_naps(completed_sleeps, tz_offset)

        # Compute overall averages
        nap_durations = []
        for s in completed_sleeps:
            st = make_aware(s.start_time) - timedelta(minutes=tz_offset)
            if 6 <= st.hour < 18 and s.duration_minutes and s.duration_minutes < 180:
                nap_durations.append(s.duration_minutes)
        avg_nap_duration = (sum(nap_durations) / len(nap_durations)) if nap_durations else 60.0

        # Wake window from benchmarks
        wake_benchmarks = get_wake_window_benchmarks(age_weeks)
        wake_window_minutes = wake_benchmarks["optimal_minutes"]

        # Feeding interval
        feeding_times = [f.time for f in feedings]
        avg_feeding_interval_minutes = None
        if len(feeding_times) >= 2:
            sorted_ft = sorted([make_aware(ft) for ft in feeding_times])
            intervals = []
            for i in range(1, len(sorted_ft)):
                diff = (sorted_ft[i] - sorted_ft[i - 1]).total_seconds() / 60
                if 0 < diff < 24 * 60:
                    intervals.append(diff)
            if intervals:
                avg_feeding_interval_minutes = sum(intervals) / len(intervals)

        # Last wake time
        wake_times = [make_aware(s.end_time) for s in completed_sleeps if s.end_time]
        last_wake_time = max(wake_times) if wake_times else None

        # ------------------------------------------------------------------
        # Phase 3: Project Rest Windows
        # ------------------------------------------------------------------
        windows = project_rest_windows(
            last_wake_time=last_wake_time,
            active_sleep=active_sleep,
            nap_clusters=nap_clusters,
            wake_window_minutes=wake_window_minutes,
            avg_nap_duration=avg_nap_duration,
            feeding_times=feeding_times,
            avg_feeding_interval_minutes=avg_feeding_interval_minutes,
            tz_offset=tz_offset,
            now=now,
        )

        # ------------------------------------------------------------------
        # Phase 4: Scoring
        # ------------------------------------------------------------------
        for w in windows:
            score_window(w, nap_clusters)

        # ------------------------------------------------------------------
        # Current state
        # ------------------------------------------------------------------
        is_sleeping = active_sleep is not None
        minutes_awake = 0
        if not is_sleeping and last_wake_time:
            minutes_awake = int((now - last_wake_time).total_seconds() / 60)

        sleep_pressure = None
        if not is_sleeping and last_wake_time:
            sleep_pressure = calculate_sleep_pressure(last_wake_time, age_weeks, now)

        last_feed_minutes_ago = None
        if feeding_times:
            last_feed = max(make_aware(ft) for ft in feeding_times)
            last_feed_minutes_ago = int((now - last_feed).total_seconds() / 60)

        current_state = {
            "is_sleeping": is_sleeping,
            "minutes_awake": minutes_awake,
            "sleep_pressure": sleep_pressure.get("score") if sleep_pressure else None,
            "last_feed_minutes_ago": last_feed_minutes_ago,
        }

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        future_windows = [w for w in windows if not w.get("is_current")]
        total_rest = sum(w["duration_minutes"] for w in windows)

        if is_sleeping:
            message_key = "rest_now"
            next_rest_in = 0
        elif future_windows:
            first_future = future_windows[0]
            first_start = datetime.fromisoformat(first_future["start"])
            mins_until = int((first_start - now).total_seconds() / 60)
            if mins_until <= 15:
                message_key = "rest_soon"
            else:
                message_key = "rest_later"
            next_rest_in = max(0, mins_until)
        else:
            message_key = "no_rest_predicted"
            next_rest_in = None

        summary = {
            "total_rest_minutes_remaining": total_rest,
            "next_rest_in_minutes": next_rest_in,
            "rest_windows_count": len(windows),
            "message_key": message_key,
        }

        patterns_used = {
            "avg_nap_duration": round(avg_nap_duration),
            "avg_wake_window": wake_window_minutes,
            "avg_feeding_interval": round(avg_feeding_interval_minutes) if avg_feeding_interval_minutes else None,
            "data_days": days,
            "has_enough_data": True,
        }

        return {
            "baby_id": baby_id,
            "generated_at": now.isoformat(),
            "current_state": current_state,
            "rest_windows": windows,
            "summary": summary,
            "patterns_used": patterns_used,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Rest planner error for baby {baby_id}: {str(e)}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Rest planner calculation failed: {str(e)}")
