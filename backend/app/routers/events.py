from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime, timedelta
from typing import List
from ..database import get_db
from ..models import Baby, Feeding, Diaper, Sleep, Pumping
from ..schemas import (
    TimelineEvent, DashboardStats, DailySummary,
    FeedingResponse, DiaperResponse, SleepResponse, PumpingResponse
)
from ..auth import get_current_user, get_user_email
from .utils import verify_baby_access

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/timeline", response_model=List[TimelineEvent])
def get_timeline(
    baby_id: int,
    date: str | None = None,
    tz_offset: int = 0,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get all events for a specific day as a timeline.
    
    Args:
        date: Local date as YYYY-MM-DD
        tz_offset: Timezone offset in minutes (e.g., -300 for EST/UTC-5)
    """
    user_id = user.get("sub")
    verify_baby_access(db, baby_id, user_id, user_email)
    
    # Parse date string (YYYY-MM-DD) or use today
    if date:
        try:
            target_date = datetime.strptime(date.split('T')[0], '%Y-%m-%d')
        except ValueError:
            target_date = datetime.utcnow()
    else:
        target_date = datetime.utcnow()
    
    # Calculate day boundaries in UTC, adjusted for user's timezone
    # tz_offset is negative for west of UTC (e.g., -300 for EST)
    # Local midnight = UTC midnight minus the offset
    local_midnight = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_day_utc = local_midnight - timedelta(minutes=tz_offset)
    end_of_day_utc = start_of_day_utc + timedelta(days=1)
    
    events = []
    
    # Feedings
    feedings = db.query(Feeding).filter(
        Feeding.baby_id == baby_id,
        Feeding.time >= start_of_day_utc,
        Feeding.time < end_of_day_utc
    ).all()
    
    for f in feedings:
        events.append(TimelineEvent(
            id=f.id,
            event_type="feeding",
            time=f.time,
            details={
                "type": f.type,
                "duration_minutes": f.duration_minutes,
                "amount_ml": f.amount_ml,
                "notes": f.notes
            }
        ))
    
    # Diapers
    diapers = db.query(Diaper).filter(
        Diaper.baby_id == baby_id,
        Diaper.time >= start_of_day_utc,
        Diaper.time < end_of_day_utc
    ).all()
    
    for d in diapers:
        events.append(TimelineEvent(
            id=d.id,
            event_type="diaper",
            time=d.time,
            details={
                "type": d.type,
                "poo_color": d.poo_color,
                "poo_consistency": d.poo_consistency,
                "poo_amount": d.poo_amount,
                "notes": d.notes
            }
        ))
    
    # Sleeps (using start_time)
    sleeps = db.query(Sleep).filter(
        Sleep.baby_id == baby_id,
        Sleep.start_time >= start_of_day_utc,
        Sleep.start_time < end_of_day_utc
    ).all()
    
    for s in sleeps:
        events.append(TimelineEvent(
            id=s.id,
            event_type="sleep",
            time=s.start_time,
            details={
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "duration_minutes": s.duration_minutes,
                "notes": s.notes
            }
        ))
    
    # Pumpings
    pumpings = db.query(Pumping).filter(
        Pumping.baby_id == baby_id,
        Pumping.time >= start_of_day_utc,
        Pumping.time < end_of_day_utc
    ).all()
    
    for p in pumpings:
        events.append(TimelineEvent(
            id=p.id,
            event_type="pumping",
            time=p.time,
            details={
                "duration_minutes": p.duration_minutes,
                "amount_ml": p.amount_ml,
                "notes": p.notes
            }
        ))
    
    # Sort by time descending
    events.sort(key=lambda x: x.time, reverse=True)
    
    return events


def get_daily_summary_for_baby(db: Session, baby_id: int, date: datetime, tz_offset: int = 0) -> DailySummary:
    """Calculate daily summary statistics.
    
    Args:
        db: Database session
        baby_id: ID of the baby
        date: Target date (parsed from local date string)
        tz_offset: Timezone offset in minutes (e.g., -300 for EST/UTC-5)
    """
    # Calculate day boundaries in UTC, adjusted for user's timezone
    local_midnight = date.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_day = local_midnight - timedelta(minutes=tz_offset)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Feedings
    feedings = db.query(Feeding).filter(
        Feeding.baby_id == baby_id,
        Feeding.time >= start_of_day,
        Feeding.time < end_of_day
    ).all()
    
    total_ml = sum(f.amount_ml or 0 for f in feedings)
    breast_count = sum(1 for f in feedings if f.type == 'breast')
    bottle_count = sum(1 for f in feedings if f.type == 'bottle')
    formula_count = sum(1 for f in feedings if f.type == 'formula')
    solid_count = sum(1 for f in feedings if f.type == 'solid')
    
    # Diapers
    diapers = db.query(Diaper).filter(
        Diaper.baby_id == baby_id,
        Diaper.time >= start_of_day,
        Diaper.time < end_of_day
    ).all()
    
    pee_count = sum(1 for d in diapers if d.type == 'pee')
    poo_count = sum(1 for d in diapers if d.type == 'poo')
    mixed_count = sum(1 for d in diapers if d.type == 'mixed')
    
    # Sleeps
    sleeps = db.query(Sleep).filter(
        Sleep.baby_id == baby_id,
        Sleep.start_time >= start_of_day,
        Sleep.start_time < end_of_day
    ).all()
    
    total_sleep_minutes = sum(s.duration_minutes or 0 for s in sleeps)
    
    # Pumpings
    pumpings = db.query(Pumping).filter(
        Pumping.baby_id == baby_id,
        Pumping.time >= start_of_day,
        Pumping.time < end_of_day
    ).all()
    
    total_pumping_ml = sum(p.amount_ml or 0 for p in pumpings)
    
    return DailySummary(
        date=local_midnight.strftime("%Y-%m-%d"),
        total_feedings=len(feedings),
        total_ml=total_ml,
        breast_count=breast_count,
        bottle_count=bottle_count,
        formula_count=formula_count,
        solid_count=solid_count,
        total_diapers=len(diapers),
        pee_count=pee_count,
        poo_count=poo_count,
        mixed_count=mixed_count,
        total_sleep_minutes=total_sleep_minutes,
        sleep_count=len(sleeps),
        total_pumping_ml=total_pumping_ml,
        pumping_count=len(pumpings)
    )


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    baby_id: int,
    local_date: str | None = None,
    tz_offset: int = 0,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get dashboard stats with last events, current sleep status, and daily summary.
    
    Args:
        local_date: Local date as YYYY-MM-DD
        tz_offset: Timezone offset in minutes (e.g., -300 for EST/UTC-5)
    """
    user_id = user.get("sub")
    verify_baby_access(db, baby_id, user_id, user_email)
    
    # Last feeding
    last_feeding = db.query(Feeding).filter(
        Feeding.baby_id == baby_id
    ).order_by(Feeding.time.desc()).first()
    
    # Last diaper
    last_diaper = db.query(Diaper).filter(
        Diaper.baby_id == baby_id
    ).order_by(Diaper.time.desc()).first()
    
    # Last completed sleep
    last_sleep = db.query(Sleep).filter(
        Sleep.baby_id == baby_id,
        Sleep.end_time.isnot(None)
    ).order_by(Sleep.start_time.desc()).first()
    
    # Current sleep (if baby is sleeping now)
    current_sleep = db.query(Sleep).filter(
        Sleep.baby_id == baby_id,
        Sleep.end_time.is_(None)
    ).order_by(Sleep.start_time.desc()).first()
    
    # Last pumping
    last_pumping = db.query(Pumping).filter(
        Pumping.baby_id == baby_id
    ).order_by(Pumping.time.desc()).first()
    
    # Parse local date for daily summary (YYYY-MM-DD format)
    if local_date:
        try:
            summary_date = datetime.strptime(local_date.split('T')[0], '%Y-%m-%d')
        except ValueError:
            summary_date = datetime.utcnow()
    else:
        summary_date = datetime.utcnow()
    
    # Daily summary (with timezone offset)
    daily_summary = get_daily_summary_for_baby(db, baby_id, summary_date, tz_offset)
    
    return DashboardStats(
        last_feeding=FeedingResponse.model_validate(last_feeding) if last_feeding else None,
        last_diaper=DiaperResponse.model_validate(last_diaper) if last_diaper else None,
        last_sleep=SleepResponse.model_validate(last_sleep) if last_sleep else None,
        last_pumping=PumpingResponse.model_validate(last_pumping) if last_pumping else None,
        current_sleep=SleepResponse.model_validate(current_sleep) if current_sleep else None,
        daily_summary=daily_summary
    )


@router.get("/summary/{date}", response_model=DailySummary)
def get_summary(
    baby_id: int,
    date: str,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get summary for a specific date."""
    user_id = user.get("sub")
    verify_baby_access(db, baby_id, user_id, user_email)
    
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    return get_daily_summary_for_baby(db, baby_id, target_date)
