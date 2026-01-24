from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from datetime import datetime, timedelta
from typing import List, Optional
from ..database import get_db
from ..models import Baby, Feeding, Diaper, Sleep, Pumping, Potty, TummyTime, Bath, Supplement
from ..schemas import (
    TimelineEvent, DashboardStats, DailySummary,
    FeedingResponse, DiaperResponse, SleepResponse, PumpingResponse,
    PottyResponse, TummyTimeResponse, BathResponse, SupplementResponse
)
from ..auth import get_current_user, get_user_email
from .utils import verify_baby_access

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/timeline", response_model=List[TimelineEvent])
def get_timeline(
    baby_id: int,
    date: Optional[str] = None,
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
    # getTimezoneOffset() returns positive for west of UTC (e.g., 300 for EST/UTC-5)
    # To convert local midnight to UTC: add the offset
    # Jan 1 00:00 EST + 300min = Jan 1 05:00 UTC
    local_midnight = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_day_utc = local_midnight + timedelta(minutes=tz_offset)
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
    
    # Sleeps (using start_time OR end_time to catch sleeps spanning midnight)
    # Include sleeps that:
    # 1. Start during the day, OR
    # 2. End during the day (for sleeps that started the previous day)
    sleeps = db.query(Sleep).filter(
        Sleep.baby_id == baby_id,
        or_(
            # Sleep starts during this day
            and_(Sleep.start_time >= start_of_day_utc, Sleep.start_time < end_of_day_utc),
            # Sleep ends during this day (started before midnight)
            and_(Sleep.end_time >= start_of_day_utc, Sleep.end_time < end_of_day_utc)
        )
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
    
    # Potty
    potty_logs = db.query(Potty).filter(
        Potty.baby_id == baby_id,
        Potty.time >= start_of_day_utc,
        Potty.time < end_of_day_utc
    ).all()
    
    for pt in potty_logs:
        events.append(TimelineEvent(
            id=pt.id,
            event_type="potty",
            time=pt.time,
            details={
                "result": pt.result,
                "potty_type": pt.potty_type,
                "notes": pt.notes
            }
        ))
    
    # Tummy Time
    tummy_times = db.query(TummyTime).filter(
        TummyTime.baby_id == baby_id,
        TummyTime.start_time >= start_of_day_utc,
        TummyTime.start_time < end_of_day_utc
    ).all()
    
    for tt in tummy_times:
        events.append(TimelineEvent(
            id=tt.id,
            event_type="tummy",
            time=tt.start_time,
            details={
                "duration_minutes": tt.duration_minutes,
                "notes": tt.notes
            }
        ))
    
    # Baths
    baths = db.query(Bath).filter(
        Bath.baby_id == baby_id,
        Bath.time >= start_of_day_utc,
        Bath.time < end_of_day_utc
    ).all()
    
    for b in baths:
        events.append(TimelineEvent(
            id=b.id,
            event_type="bath",
            time=b.time,
            details={
                "notes": b.notes
            }
        ))
    
    # Supplements
    supplements = db.query(Supplement).filter(
        Supplement.baby_id == baby_id,
        Supplement.time >= start_of_day_utc,
        Supplement.time < end_of_day_utc
    ).all()
    
    for sup in supplements:
        events.append(TimelineEvent(
            id=sup.id,
            event_type="supplement",
            time=sup.time,
            details={
                "name": sup.name,
                "dosage": sup.dosage,
                "notes": sup.notes
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
        tz_offset: Timezone offset in minutes (e.g., 300 for EST/UTC-5)
    """
    # Calculate day boundaries in UTC, adjusted for user's timezone
    # Add offset to convert local midnight to UTC
    local_midnight = date.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_day = local_midnight + timedelta(minutes=tz_offset)
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
    
    # Sleeps - include sleeps that overlap with this day (start, end, or span the day)
    # A sleep overlaps with the day if:
    # 1. Sleep starts during this day, OR
    # 2. Sleep ends during this day (started previous day), OR
    # 3. Sleep spans the entire day (started before and ends after)
    sleeps = db.query(Sleep).filter(
        Sleep.baby_id == baby_id,
        or_(
            # Sleep starts during this day
            and_(Sleep.start_time >= start_of_day, Sleep.start_time < end_of_day),
            # Sleep ends during this day (started before this day)
            and_(Sleep.end_time > start_of_day, Sleep.end_time <= end_of_day, Sleep.start_time < start_of_day),
            # Sleep spans the entire day
            and_(Sleep.start_time < start_of_day, Sleep.end_time > end_of_day)
        )
    ).all()

    # Calculate sleep minutes that fall within this day only
    total_sleep_minutes = 0
    for s in sleeps:
        if s.end_time is None:
            # Ongoing sleep - count from start (or day start if started earlier) to now
            effective_start = max(s.start_time, start_of_day)
            effective_end = min(datetime.utcnow(), end_of_day)
        else:
            # Completed sleep - count only the portion within this day
            effective_start = max(s.start_time, start_of_day)
            effective_end = min(s.end_time, end_of_day)

        if effective_end > effective_start:
            minutes = int((effective_end - effective_start).total_seconds() / 60)
            total_sleep_minutes += minutes
    
    # Pumpings
    pumpings = db.query(Pumping).filter(
        Pumping.baby_id == baby_id,
        Pumping.time >= start_of_day,
        Pumping.time < end_of_day
    ).all()
    
    total_pumping_ml = sum(p.amount_ml or 0 for p in pumpings)
    
    # Potty
    potty_logs = db.query(Potty).filter(
        Potty.baby_id == baby_id,
        Potty.time >= start_of_day,
        Potty.time < end_of_day
    ).all()
    
    potty_success_count = sum(1 for p in potty_logs if p.result == 'success')
    
    # Tummy Time
    tummy_times = db.query(TummyTime).filter(
        TummyTime.baby_id == baby_id,
        TummyTime.start_time >= start_of_day,
        TummyTime.start_time < end_of_day
    ).all()
    
    tummy_minutes = sum(t.duration_minutes or 0 for t in tummy_times)
    
    # Baths
    baths = db.query(Bath).filter(
        Bath.baby_id == baby_id,
        Bath.time >= start_of_day,
        Bath.time < end_of_day
    ).all()
    
    # Supplements
    supplements = db.query(Supplement).filter(
        Supplement.baby_id == baby_id,
        Supplement.time >= start_of_day,
        Supplement.time < end_of_day
    ).all()
    
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
        pumping_count=len(pumpings),
        potty_count=len(potty_logs),
        potty_success_count=potty_success_count,
        tummy_count=len(tummy_times),
        tummy_minutes=tummy_minutes,
        bath_count=len(baths),
        supplement_count=len(supplements)
    )


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    baby_id: int,
    local_date: Optional[str] = None,
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
    
    # Last potty
    last_potty = db.query(Potty).filter(
        Potty.baby_id == baby_id
    ).order_by(Potty.time.desc()).first()
    
    # Last tummy time
    last_tummy = db.query(TummyTime).filter(
        TummyTime.baby_id == baby_id
    ).order_by(TummyTime.start_time.desc()).first()
    
    # Last bath
    last_bath = db.query(Bath).filter(
        Bath.baby_id == baby_id
    ).order_by(Bath.time.desc()).first()
    
    # Last supplement
    last_supplement = db.query(Supplement).filter(
        Supplement.baby_id == baby_id
    ).order_by(Supplement.time.desc()).first()
    
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
        last_potty=PottyResponse.model_validate(last_potty) if last_potty else None,
        last_tummy=TummyTimeResponse.model_validate(last_tummy) if last_tummy else None,
        last_bath=BathResponse.model_validate(last_bath) if last_bath else None,
        last_supplement=SupplementResponse.model_validate(last_supplement) if last_supplement else None,
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
