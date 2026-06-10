from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..database import get_db
from ..logging_config import get_logger
from ..models import Baby, Feeding
from ..rate_limit import RATE_READ, RATE_WRITE, limiter
from ..schemas import FeedingCreate, FeedingResponse, FeedingUpdate
from .utils import baby_access_filter, require_write_access, verify_baby_access

logger = get_logger(__name__)

router = APIRouter(prefix="/feedings", tags=["feedings"])


@router.get("/", response_model=list[FeedingResponse])
@limiter.limit(RATE_READ)
def get_feedings(
    request: Request,
    baby_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all feedings for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return (
        db.query(Feeding)
        .filter(Feeding.baby_id == baby_id)
        .order_by(Feeding.time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{feeding_id}", response_model=FeedingResponse)
@limiter.limit(RATE_READ)
def get_feeding(
    request: Request,
    feeding_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get a specific feeding by ID."""
    user_id = user.get("sub")

    feeding = (
        db.query(Feeding)
        .join(Baby)
        .filter(Feeding.id == feeding_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding not found")

    return feeding


@router.post("/", response_model=FeedingResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_feeding(
    request: Request,
    feeding_data: FeedingCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Log a new feeding."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, feeding_data.baby_id, user_id, user_email)
    require_write_access(role)

    feeding = Feeding(
        baby_id=feeding_data.baby_id,
        time=feeding_data.time,
        type=feeding_data.type,
        duration_minutes=feeding_data.duration_minutes,
        amount_ml=feeding_data.amount_ml,
        notes=feeding_data.notes,
    )
    db.add(feeding)
    db.commit()
    db.refresh(feeding)
    logger.info("Created feeding", extra={"baby_id": feeding.baby_id, "feeding_id": feeding.id})
    return feeding


@router.put("/{feeding_id}", response_model=FeedingResponse)
@limiter.limit(RATE_WRITE)
def update_feeding(
    request: Request,
    feeding_id: int,
    feeding_data: FeedingUpdate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a feeding record."""
    user_id = user.get("sub")

    feeding = (
        db.query(Feeding)
        .join(Baby)
        .filter(Feeding.id == feeding_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding not found")

    # Verify write access
    _, role = verify_baby_access(db, feeding.baby_id, user_id, user_email)
    require_write_access(role)

    update_data = feeding_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(feeding, field, value)

    db.commit()
    db.refresh(feeding)
    return feeding


@router.delete("/{feeding_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_feeding(
    request: Request,
    feeding_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a feeding record."""
    user_id = user.get("sub")

    feeding = (
        db.query(Feeding)
        .join(Baby)
        .filter(Feeding.id == feeding_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not feeding:
        logger.warning("Delete feeding not found", extra={"feeding_id": feeding_id})
        raise HTTPException(status_code=404, detail="Feeding not found")

    # Verify write access
    _, role = verify_baby_access(db, feeding.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted feeding", extra={"feeding_id": feeding_id, "baby_id": feeding.baby_id})
    db.delete(feeding)
    db.commit()
    return None
