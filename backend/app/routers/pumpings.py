from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..database import get_db
from ..logging_config import get_logger
from ..models import Baby, Pumping
from ..rate_limit import RATE_READ, RATE_WRITE, limiter
from ..schemas import PumpingCreate, PumpingResponse, PumpingUpdate
from .utils import baby_access_filter, require_write_access, verify_baby_access

logger = get_logger(__name__)

router = APIRouter(prefix="/pumpings", tags=["pumpings"])


@router.get("/", response_model=list[PumpingResponse])
@limiter.limit(RATE_READ)
def get_pumpings(
    request: Request,
    baby_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all pumping sessions for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return (
        db.query(Pumping)
        .filter(Pumping.baby_id == baby_id)
        .order_by(Pumping.time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{pumping_id}", response_model=PumpingResponse)
@limiter.limit(RATE_READ)
def get_pumping(
    request: Request,
    pumping_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get a specific pumping session by ID."""
    user_id = user.get("sub")

    pumping = (
        db.query(Pumping)
        .join(Baby)
        .filter(Pumping.id == pumping_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not pumping:
        raise HTTPException(status_code=404, detail="Pumping not found")

    return pumping


@router.post("/", response_model=PumpingResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_pumping(
    request: Request,
    pumping_data: PumpingCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Log a new pumping session."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, pumping_data.baby_id, user_id, user_email)
    require_write_access(role)

    pumping = Pumping(
        baby_id=pumping_data.baby_id,
        time=pumping_data.time,
        duration_minutes=pumping_data.duration_minutes,
        amount_ml=pumping_data.amount_ml,
        notes=pumping_data.notes,
    )
    db.add(pumping)
    db.commit()
    db.refresh(pumping)
    logger.info("Created pumping", extra={"baby_id": pumping.baby_id, "pumping_id": pumping.id})
    return pumping


@router.put("/{pumping_id}", response_model=PumpingResponse)
@limiter.limit(RATE_WRITE)
def update_pumping(
    request: Request,
    pumping_id: int,
    pumping_data: PumpingUpdate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a pumping record."""
    user_id = user.get("sub")

    pumping = (
        db.query(Pumping)
        .join(Baby)
        .filter(Pumping.id == pumping_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not pumping:
        raise HTTPException(status_code=404, detail="Pumping not found")

    # Verify write access
    _, role = verify_baby_access(db, pumping.baby_id, user_id, user_email)
    require_write_access(role)

    update_data = pumping_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pumping, field, value)

    db.commit()
    db.refresh(pumping)
    return pumping


@router.delete("/{pumping_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_pumping(
    request: Request,
    pumping_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a pumping record."""
    user_id = user.get("sub")

    pumping = (
        db.query(Pumping)
        .join(Baby)
        .filter(Pumping.id == pumping_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not pumping:
        logger.warning("Delete pumping not found", extra={"pumping_id": pumping_id})
        raise HTTPException(status_code=404, detail="Pumping not found")

    # Verify write access
    _, role = verify_baby_access(db, pumping.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted pumping", extra={"pumping_id": pumping_id, "baby_id": pumping.baby_id})
    db.delete(pumping)
    db.commit()
    return None
