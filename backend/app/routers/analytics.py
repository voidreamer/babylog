"""
Analytics router for baby pattern analysis and predictions.

Provides:
- Pattern analysis (average times, intervals)
- Predictions (next feeding, next nap)
- Comparison with scientific benchmarks
- Today vs. average comparisons
"""

from datetime import datetime, timedelta, timezone, date, time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import logging

from ..database import get_db
from ..auth import get_current_user, get_user_email
from ..models import Baby, Feeding, Sleep, Diaper
from ..benchmarks import get_all_benchmarks, calculate_age_weeks

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


def make_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware (UTC)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def get_baby_or_404(db: Session, baby_id: int, user_id: str, user_email: str) -> Baby:
    """Get baby by ID, ensuring user has access."""
    baby = db.query(Baby).filter(Baby.id == baby_id).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    # Check ownership or sharing (by user_id or email)
    has_access = (
        baby.user_id == user_id or 
        (user_email and user_email in (baby.shared_with_emails or []))
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized")
    return baby


def calculate_average_time_of_day(timestamps: List[datetime]) -> Optional[str]:
    """Calculate average time of day from list of timestamps."""
    if not timestamps:
        return None
    
    # Convert to minutes since midnight
    minutes_list = []
    for ts in timestamps:
        ts = make_aware(ts)
        minutes_list.append(ts.hour * 60 + ts.minute)
    
    avg_minutes = sum(minutes_list) / len(minutes_list)
    hours = int(avg_minutes // 60)
    mins = int(avg_minutes % 60)
    return f"{hours:02d}:{mins:02d}"


def calculate_average_interval(timestamps: List[datetime]) -> Optional[float]:
    """Calculate average interval between timestamps in hours."""
    if len(timestamps) < 2:
        return None
    
    # Sort timestamps (ensure timezone-aware)
    sorted_ts = sorted([make_aware(ts) for ts in timestamps])
    
    # Calculate intervals
    intervals = []
    for i in range(1, len(sorted_ts)):
        diff = (sorted_ts[i] - sorted_ts[i-1]).total_seconds() / 3600
        # Filter out unreasonable intervals (> 24 hours)
        if diff < 24:
            intervals.append(diff)
    
    if not intervals:
        return None
    return round(sum(intervals) / len(intervals), 2)


def predict_next_event(
    timestamps: List[datetime], 
    avg_interval_hours: Optional[float]
) -> Optional[dict]:
    """Predict next event based on last occurrence and average interval."""
    if not timestamps or not avg_interval_hours:
        return None
    
    last_event = make_aware(max(timestamps))
    predicted_time = last_event + timedelta(hours=avg_interval_hours)
    now = datetime.now(timezone.utc)
    
    # Calculate minutes until predicted event
    diff = predicted_time - now
    in_minutes = int(diff.total_seconds() / 60)
    
    return {
        "time": predicted_time.isoformat(),
        "in_minutes": in_minutes,
        "past_due": in_minutes < 0,
    }


@router.get("/{baby_id}")
async def get_baby_analytics(
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
        baby = get_baby_or_404(db, baby_id, user_id, user_email)
        
        # Calculate date range
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # ==========================================================================
        # Fetch data
        # ==========================================================================
        
        # Feedings in analysis window
        feedings = db.query(Feeding).filter(
            Feeding.baby_id == baby_id,
        ).order_by(Feeding.time.desc()).limit(100).all()
        
        # Filter by date in Python to avoid timezone issues
        feedings = [f for f in feedings if make_aware(f.time) >= start_date]
        
        # Today's feedings
        todays_feedings = [f for f in feedings if make_aware(f.time) >= today_start]
        
        # Sleep records in analysis window
        sleeps = db.query(Sleep).filter(
            Sleep.baby_id == baby_id,
        ).order_by(Sleep.start_time.desc()).limit(100).all()
        
        # Filter by date in Python
        sleeps = [s for s in sleeps if make_aware(s.start_time) >= start_date]
        
        # Today's completed sleeps
        todays_sleeps = [
            s for s in sleeps 
            if make_aware(s.start_time) >= today_start and s.end_time
        ]
        
        # Diapers in analysis window
        diapers = db.query(Diaper).filter(
            Diaper.baby_id == baby_id,
        ).order_by(Diaper.time.desc()).limit(100).all()
        
        # Filter by date in Python
        diapers = [d for d in diapers if make_aware(d.time) >= start_date]
        
        # Today's diapers
        todays_diapers = [d for d in diapers if make_aware(d.time) >= today_start]
        
        # ==========================================================================
        # Calculate patterns
        # ==========================================================================
        
        feeding_times = [f.time for f in feedings]
        avg_feeding_interval = calculate_average_interval(feeding_times)
        
        # Wake times (end of sleep)
        wake_times = [s.end_time for s in sleeps if s.end_time]
        usual_wake_time = calculate_average_time_of_day(wake_times)
        
        # Bedtimes (start of overnight sleep - after 6pm)
        bedtimes = []
        for s in sleeps:
            st = make_aware(s.start_time)
            if st.hour >= 18 or st.hour <= 3:
                bedtimes.append(st)
        usual_bedtime = calculate_average_time_of_day(bedtimes)
        
        # Nap durations (daytime sleep)
        nap_durations = []
        for s in sleeps:
            if s.duration_minutes:
                st = make_aware(s.start_time)
                if 6 <= st.hour < 18 and s.duration_minutes < 180:
                    nap_durations.append(s.duration_minutes)
        avg_nap_duration = round(sum(nap_durations) / len(nap_durations)) if nap_durations else None
        
        # ==========================================================================
        # Calculate predictions
        # ==========================================================================
        
        next_feeding = predict_next_event(feeding_times, avg_feeding_interval)
        
        # Next nap prediction
        sleep_start_times = [s.start_time for s in sleeps]
        avg_sleep_interval = calculate_average_interval(sleep_start_times)
        next_nap = predict_next_event(sleep_start_times, avg_sleep_interval)
        
        # ==========================================================================
        # Get benchmarks
        # ==========================================================================
        
        birth_date = None
        if baby.birth_date:
            bd = make_aware(baby.birth_date)
            birth_date = bd.date() if hasattr(bd, 'date') else bd
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
            } if has_enough_data else None,
            
            "predictions": {
                "next_feeding": next_feeding,
                "next_nap": next_nap,
            } if has_enough_data else None,
            
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
