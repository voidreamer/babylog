"""
Analytics router for baby pattern analysis and predictions.

Provides:
- Pattern analysis (average times, intervals)
- Predictions (next feeding, next nap)
- Comparison with scientific benchmarks
- Today vs. average comparisons
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..benchmarks import calculate_age_weeks, get_all_benchmarks
from ..database import get_db
from ..logging_config import get_logger
from ..models import Diaper, Feeding, Sleep
from ..predictions import (
    calculate_confidence_interval,
    calculate_daily_totals,
    calculate_intervals_hours,
    calculate_sleep_pressure,
    detect_trend,
    predict_next_nap_wake_window,
)
from ..rate_limit import RATE_READ, limiter
from .utils import verify_baby_access

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = get_logger(__name__)


def make_aware(dt: datetime | None) -> datetime | None:
    """Ensure datetime is timezone-aware (UTC)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def calculate_average_time_of_day(timestamps: list[datetime], reference_hour: int = 0) -> str | None:
    """Calculate average time of day from list of timestamps using circular averaging.

    Uses circular mean to handle midnight wraparound correctly.
    reference_hour shifts the circle so the target times cluster together
    (e.g., use 12 for bedtimes that span 10pm-2am).
    """
    if not timestamps:
        return None

    import math

    # Convert to radians on a 24h circle, shifted by reference
    angles = []
    for ts in timestamps:
        ts = make_aware(ts)
        minutes = ts.hour * 60 + ts.minute
        # Shift so reference_hour maps to 0
        shifted = (minutes - reference_hour * 60) % 1440
        angle = shifted / 1440 * 2 * math.pi
        angles.append(angle)

    # Circular mean
    sin_sum = sum(math.sin(a) for a in angles)
    cos_sum = sum(math.cos(a) for a in angles)
    avg_angle = math.atan2(sin_sum, cos_sum)
    if avg_angle < 0:
        avg_angle += 2 * math.pi

    # Convert back to minutes, un-shift
    avg_minutes = (avg_angle / (2 * math.pi) * 1440 + reference_hour * 60) % 1440
    hours = int(avg_minutes // 60)
    mins = int(avg_minutes % 60)
    return f"{hours:02d}:{mins:02d}"


def calculate_average_interval(timestamps: list[datetime]) -> float | None:
    """Calculate average interval between timestamps in hours."""
    if len(timestamps) < 2:
        return None

    # Sort timestamps (ensure timezone-aware)
    sorted_ts = sorted([make_aware(ts) for ts in timestamps])

    # Calculate intervals
    intervals = []
    for i in range(1, len(sorted_ts)):
        diff = (sorted_ts[i] - sorted_ts[i - 1]).total_seconds() / 3600
        # Filter out unreasonable intervals (> 24 hours)
        if diff < 24:
            intervals.append(diff)

    if not intervals:
        return None
    return round(sum(intervals) / len(intervals), 2)


def predict_next_event(timestamps: list[datetime], avg_interval_hours: float | None) -> dict | None:
    """Predict next event based on last occurrence and average interval."""
    if not timestamps or not avg_interval_hours:
        return None

    last_event = make_aware(max(timestamps))
    predicted_time = last_event + timedelta(hours=avg_interval_hours)
    now = datetime.now(UTC)

    # Calculate minutes until predicted event
    diff = predicted_time - now
    in_minutes = int(diff.total_seconds() / 60)

    return {
        "time": predicted_time.isoformat(),
        "in_minutes": in_minutes,
        "past_due": in_minutes < 0,
    }


@router.get("/{baby_id}")
@limiter.limit(RATE_READ)
async def get_baby_analytics(
    request: Request,
    baby_id: int,
    days: int = Query(default=7, ge=3, le=30, description="Days of data to analyze"),
    tz_offset: int = Query(default=0, description="Timezone offset in minutes"),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
):
    """
    Get comprehensive analytics for a baby.

    Returns patterns, predictions, benchmarks, and comparisons.
    """
    try:
        user_id = user.get("sub")
        baby, _role = verify_baby_access(db, baby_id, user_id, user_email)

        # Calculate date range
        now = datetime.now(UTC)
        start_date = now - timedelta(days=days)

        # Calculate user's local "today" start using their timezone offset
        # tz_offset is minutes behind UTC (e.g., EST = 300 means UTC-5)
        user_now = now - timedelta(minutes=tz_offset)
        today_start = user_now.replace(hour=0, minute=0, second=0, microsecond=0)
        # Convert back to UTC for comparison
        today_start_utc = today_start + timedelta(minutes=tz_offset)

        # ==========================================================================
        # Fetch data
        # ==========================================================================

        # Feedings in analysis window
        feedings = (
            db.query(Feeding)
            .filter(
                Feeding.baby_id == baby_id,
            )
            .order_by(Feeding.time.desc())
            .limit(100)
            .all()
        )

        # Filter by date in Python to avoid timezone issues
        feedings = [f for f in feedings if make_aware(f.time) >= start_date]

        # Today's feedings
        todays_feedings = [f for f in feedings if make_aware(f.time) >= today_start_utc]

        # Sleep records in analysis window
        sleeps = (
            db.query(Sleep)
            .filter(
                Sleep.baby_id == baby_id,
            )
            .order_by(Sleep.start_time.desc())
            .limit(100)
            .all()
        )

        # Filter by date in Python
        sleeps = [s for s in sleeps if make_aware(s.start_time) >= start_date]

        # Today's completed sleeps
        todays_sleeps = [s for s in sleeps if make_aware(s.start_time) >= today_start_utc and s.end_time]

        # Diapers in analysis window
        diapers = (
            db.query(Diaper)
            .filter(
                Diaper.baby_id == baby_id,
            )
            .order_by(Diaper.time.desc())
            .limit(100)
            .all()
        )

        # Filter by date in Python
        diapers = [d for d in diapers if make_aware(d.time) >= start_date]

        # Today's diapers
        todays_diapers = [d for d in diapers if make_aware(d.time) >= today_start_utc]

        # ==========================================================================
        # Calculate patterns
        # ==========================================================================

        # Get baby's birth date and age for calculations (needed for pattern logic)
        birth_date = None
        if baby.birth_date:
            bd = make_aware(baby.birth_date)
            birth_date = bd.date() if hasattr(bd, "date") else bd

        age_weeks = 0
        if birth_date:
            age_weeks = calculate_age_weeks(birth_date)

        feeding_times = [f.time for f in feedings]
        avg_feeding_interval = calculate_average_interval(feeding_times)

        # Wake times (end of sleep)
        wake_times = [s.end_time for s in sleeps if s.end_time]

        # Determine sleep pattern display based on age
        # Newborns (0-12 weeks): Show wake interval instead of specific times
        # Older babies (12+ weeks): Show specific wake/bedtime if consolidated
        usual_wake_time = None
        usual_bedtime = None
        wake_interval_hours = None
        longest_sleep_block_hours = None
        night_sleep_avg_hours = None
        day_sleep_avg_hours = None

        # Classify sleep blocks into night vs day
        night_durations = []  # minutes
        day_durations = []  # minutes
        for s in sleeps:
            if not s.duration_minutes:
                continue
            st = make_aware(s.start_time)
            # Night sleep: starts between 6pm and 6am
            if st.hour >= 18 or st.hour < 6:
                night_durations.append(s.duration_minutes)
            else:
                day_durations.append(s.duration_minutes)

        if night_durations:
            night_sleep_avg_hours = round(sum(night_durations) / len(night_durations) / 60, 1)
        if day_durations:
            day_sleep_avg_hours = round(sum(day_durations) / len(day_durations) / 60, 1)

        # Longest sleep block
        all_durations = [s.duration_minutes for s in sleeps if s.duration_minutes]
        if all_durations:
            longest_sleep_block_hours = round(max(all_durations) / 60, 1)

        if age_weeks < 12:
            # Newborn pattern: calculate average interval between wake times
            if len(wake_times) >= 3:
                wake_intervals = []
                sorted_wakes = sorted([make_aware(wt) for wt in wake_times])
                for i in range(1, len(sorted_wakes)):
                    interval_hours = (sorted_wakes[i] - sorted_wakes[i - 1]).total_seconds() / 3600
                    if interval_hours < 8:  # Filter out unreasonably long gaps
                        wake_intervals.append(interval_hours)
                if wake_intervals:
                    wake_interval_hours = round(sum(wake_intervals) / len(wake_intervals), 1)
        else:
            # Older baby: separate morning wakes from nap wakes
            # Morning wake = wake times between 4am and 10am
            morning_wakes = [wt for wt in wake_times if 4 <= make_aware(wt).hour < 10]
            if morning_wakes:
                usual_wake_time = calculate_average_time_of_day(morning_wakes, reference_hour=6)

            # Bedtimes: start of sleep between 6pm and 3am (overnight sleep)
            bedtimes = []
            for s in sleeps:
                st = make_aware(s.start_time)
                if st.hour >= 18 or st.hour <= 3:
                    # Only count if the sleep is longer than 60 minutes (not a catnap)
                    if s.duration_minutes and s.duration_minutes > 60:
                        bedtimes.append(st)
            if bedtimes:
                usual_bedtime = calculate_average_time_of_day(bedtimes, reference_hour=21)

        # Nap durations (daytime sleep)
        nap_durations = []
        for s in sleeps:
            if s.duration_minutes:
                st = make_aware(s.start_time)
                if 6 <= st.hour < 18 and s.duration_minutes < 180:
                    nap_durations.append(s.duration_minutes)
        avg_nap_duration = round(sum(nap_durations) / len(nap_durations)) if nap_durations else None

        # ==========================================================================
        # Calculate predictions (enhanced with new features)
        # ==========================================================================

        # Feeding prediction with confidence intervals
        next_feeding = predict_next_event(feeding_times, avg_feeding_interval)
        feeding_intervals = calculate_intervals_hours(feeding_times)
        feeding_confidence = calculate_confidence_interval(feeding_intervals)
        if next_feeding and feeding_confidence:
            next_feeding["confidence"] = feeding_confidence

        # Next nap prediction using wake windows (replaces naive interval approach)
        # Find the most recent wake time (end of last sleep)
        last_wake_time = None
        if wake_times:
            last_wake_time = max(make_aware(wt) for wt in wake_times)

        # Check if baby is currently sleeping (active sleep session)
        active_sleep = db.query(Sleep).filter(Sleep.baby_id == baby_id, Sleep.end_time.is_(None)).first()

        if active_sleep:
            # Baby is sleeping - no nap prediction needed
            next_nap = {
                "status": "sleeping",
                "status_label": "Currently sleeping",
                "started_at": make_aware(active_sleep.start_time).isoformat(),
            }
            sleep_pressure = None
        else:
            # Use wake window-based prediction
            next_nap = predict_next_nap_wake_window(last_wake_time, age_weeks, now)

            # Calculate sleep pressure (tiredness score)
            sleep_pressure = calculate_sleep_pressure(last_wake_time, age_weeks, now)

        # ==========================================================================
        # Trend detection (7-14 day patterns)
        # ==========================================================================

        # Calculate daily sleep totals for trend analysis
        sleep_daily_totals = calculate_daily_totals(
            sleeps,
            get_value=lambda s: (s.duration_minutes or 0) / 60,  # Convert to hours
            get_date=lambda s: make_aware(s.start_time).date(),
            days=14,
        )
        sleep_trend = detect_trend(sleep_daily_totals, metric_name="sleep")

        # Calculate daily feeding counts for trend
        feeding_daily_counts = calculate_daily_totals(
            feedings,
            get_value=lambda f: 1,  # Count each feeding
            get_date=lambda f: make_aware(f.time).date(),
            days=14,
        )
        feeding_trend = detect_trend(feeding_daily_counts, metric_name="feeding")

        # ==========================================================================
        # Get benchmarks
        # ==========================================================================

        benchmarks = get_all_benchmarks(birth_date)

        # ==========================================================================
        # Today vs. average comparisons
        # ==========================================================================

        # Daily averages
        avg_feedings_per_day = len(feedings) / days if days > 0 else 0
        avg_diapers_per_day = len(diapers) / days if days > 0 else 0

        # Total sleep today
        todays_sleep_minutes = sum(s.duration_minutes or 0 for s in todays_sleeps)

        # Average daily sleep
        total_sleep_minutes = sum(s.duration_minutes or 0 for s in sleeps if s.duration_minutes)
        avg_sleep_per_day = total_sleep_minutes / days if days > 0 else 0

        # Diaper breakdown today
        todays_wet = len([d for d in todays_diapers if d.type in ("pee", "mixed")])
        todays_dirty = len([d for d in todays_diapers if d.type in ("poo", "mixed")])

        # ==========================================================================
        # Build response
        # ==========================================================================

        # Check if we have enough data for patterns
        has_enough_data = len(feedings) >= 5 or len(sleeps) >= 3

        return {
            "baby_id": baby_id,
            "analysis_window_days": days,
            "data_points": {
                "feedings": len(feedings),
                "sleeps": len(sleeps),
                "diapers": len(diapers),
            },
            "has_enough_data": has_enough_data,
            "patterns": {
                "avg_feeding_interval_hours": avg_feeding_interval,
                "avg_nap_duration_minutes": avg_nap_duration,
                "usual_wake_time": usual_wake_time,
                "usual_bedtime": usual_bedtime,
                "wake_interval_hours": wake_interval_hours,  # For newborns
                "night_sleep_avg_hours": night_sleep_avg_hours,
                "day_sleep_avg_hours": day_sleep_avg_hours,
                "longest_sleep_block_hours": longest_sleep_block_hours,
                "age_weeks": age_weeks,  # Include age for frontend logic
            }
            if has_enough_data
            else None,
            "predictions": {
                "next_feeding": next_feeding,
                "next_nap": next_nap,
                "sleep_pressure": sleep_pressure,
            }
            if has_enough_data
            else None,
            "trends": {
                "sleep": sleep_trend,
                "feeding": feeding_trend,
            },
            "benchmarks": benchmarks,
            "today_vs_average": {
                "feedings": {
                    "today": len(todays_feedings),
                    "daily_avg": round(avg_feedings_per_day, 1),
                },
                "diapers": {
                    "today": len(todays_diapers),
                    "daily_avg": round(avg_diapers_per_day, 1),
                    "wet_today": todays_wet,
                    "dirty_today": todays_dirty,
                },
                "sleep_hours": {
                    "today": round(todays_sleep_minutes / 60, 1),
                    "daily_avg": round(avg_sleep_per_day / 60, 1),
                },
            },
        }
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.exception(f"Analytics error for baby {baby_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analytics calculation failed: {str(e)}")
