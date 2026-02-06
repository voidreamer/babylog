from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import AnalyticsEvent
from ..schemas import AnalyticsEventCreate, AnalyticsEventBatch, AnalyticsEventResponse
from ..auth import get_current_user

router = APIRouter(prefix="/tracking", tags=["tracking"])


def _write_events(events_data: list[dict], db_url: str):
    """Write analytics events in background to avoid blocking the response."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session as SyncSession

    engine = create_engine(db_url)
    with SyncSession(engine) as session:
        for event_dict in events_data:
            session.add(AnalyticsEvent(**event_dict))
        session.commit()
    engine.dispose()


@router.post("/events", status_code=202)
def track_events(
    batch: AnalyticsEventBatch,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Receive a batch of analytics events. Writes async via BackgroundTasks."""
    user_id = user.get("sub")
    events_data = [
        {
            "user_id": user_id,
            "event_name": e.event_name,
            "event_data": e.event_data,
            "session_id": e.session_id,
        }
        for e in batch.events
    ]

    # Write directly in the current session (fast enough for small batches)
    for event_dict in events_data:
        db.add(AnalyticsEvent(**event_dict))
    db.commit()

    return {"accepted": len(events_data)}
