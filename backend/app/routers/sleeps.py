from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..database import get_db
from ..logging_config import get_logger
from ..models import Baby, Sleep
from ..rate_limit import RATE_READ, RATE_WRITE, limiter
from ..schemas import SleepCreate, SleepResponse, SleepUpdate
from .utils import baby_access_filter, require_write_access, verify_baby_access

logger = get_logger(__name__)

router = APIRouter(prefix="/sleeps", tags=["sleeps"])


@router.get("/", response_model=list[SleepResponse])
@limiter.limit(RATE_READ)
def get_sleeps(
    request: Request,
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all sleep sessions for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return (
        db.query(Sleep)
        .filter(Sleep.baby_id == baby_id)
        .order_by(Sleep.start_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/current", response_model=SleepResponse | None)
@limiter.limit(RATE_READ)
def get_current_sleep(
    request: Request,
    baby_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get the current active sleep session (if baby is sleeping)."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return (
        db.query(Sleep)
        .filter(Sleep.baby_id == baby_id, Sleep.end_time.is_(None))
        .order_by(Sleep.start_time.desc())
        .first()
    )


@router.get("/{sleep_id}", response_model=SleepResponse)
@limiter.limit(RATE_READ)
def get_sleep(
    request: Request,
    sleep_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get a specific sleep session by ID."""
    user_id = user.get("sub")

    sleep = db.query(Sleep).join(Baby).filter(Sleep.id == sleep_id, baby_access_filter(user_id, user_email)).first()

    if not sleep:
        raise HTTPException(status_code=404, detail="Sleep not found")

    return sleep


@router.post("/", response_model=SleepResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_sleep(
    request: Request,
    sleep_data: SleepCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Start or log a sleep session."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, sleep_data.baby_id, user_id, user_email)
    require_write_access(role)

    sleep = Sleep(
        baby_id=sleep_data.baby_id,
        start_time=sleep_data.start_time,
        end_time=sleep_data.end_time,
        notes=sleep_data.notes,
    )
    db.add(sleep)
    db.commit()
    db.refresh(sleep)
    logger.info("Created sleep", extra={"baby_id": sleep.baby_id, "sleep_id": sleep.id})
    return sleep


@router.put("/{sleep_id}", response_model=SleepResponse)
@limiter.limit(RATE_WRITE)
def update_sleep(
    request: Request,
    sleep_id: int,
    sleep_data: SleepUpdate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a sleep session (e.g., end the sleep)."""
    user_id = user.get("sub")

    sleep = db.query(Sleep).join(Baby).filter(Sleep.id == sleep_id, baby_access_filter(user_id, user_email)).first()

    if not sleep:
        raise HTTPException(status_code=404, detail="Sleep not found")

    # Verify write access
    _, role = verify_baby_access(db, sleep.baby_id, user_id, user_email)
    require_write_access(role)

    update_data = sleep_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sleep, field, value)

    db.commit()
    db.refresh(sleep)
    return sleep


@router.post("/{sleep_id}/end", response_model=SleepResponse)
@limiter.limit(RATE_WRITE)
def end_sleep(
    request: Request,
    sleep_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """End an active sleep session (sets end_time to now)."""
    user_id = user.get("sub")

    sleep = db.query(Sleep).join(Baby).filter(Sleep.id == sleep_id, baby_access_filter(user_id, user_email)).first()

    if not sleep:
        raise HTTPException(status_code=404, detail="Sleep not found")

    # Verify write access
    _, role = verify_baby_access(db, sleep.baby_id, user_id, user_email)
    require_write_access(role)

    if sleep.end_time:
        raise HTTPException(status_code=400, detail="Sleep already ended")

    sleep.end_time = datetime.now(UTC).replace(tzinfo=None)
    db.commit()
    db.refresh(sleep)
    return sleep


@router.delete("/{sleep_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_sleep(
    request: Request,
    sleep_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a sleep record."""
    user_id = user.get("sub")

    sleep = db.query(Sleep).join(Baby).filter(Sleep.id == sleep_id, baby_access_filter(user_id, user_email)).first()

    if not sleep:
        logger.warning("Delete sleep not found", extra={"sleep_id": sleep_id})
        raise HTTPException(status_code=404, detail="Sleep not found")

    # Verify write access
    _, role = verify_baby_access(db, sleep.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted sleep", extra={"sleep_id": sleep_id, "baby_id": sleep.baby_id})
    db.delete(sleep)
    db.commit()
    return None
