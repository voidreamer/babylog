from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..database import get_db
from ..logging_config import get_logger
from ..models import Baby, Diaper
from ..rate_limit import RATE_READ, RATE_WRITE, limiter
from ..schemas import DiaperCreate, DiaperResponse, DiaperUpdate
from .utils import baby_access_filter, require_write_access, verify_baby_access

logger = get_logger(__name__)

router = APIRouter(prefix="/diapers", tags=["diapers"])


@router.get("/", response_model=list[DiaperResponse])
@limiter.limit(RATE_READ)
def get_diapers(
    request: Request,
    baby_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all diaper changes for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return (
        db.query(Diaper).filter(Diaper.baby_id == baby_id).order_by(Diaper.time.desc()).offset(skip).limit(limit).all()
    )


@router.get("/{diaper_id}", response_model=DiaperResponse)
@limiter.limit(RATE_READ)
def get_diaper(
    request: Request,
    diaper_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get a specific diaper change by ID."""
    user_id = user.get("sub")

    diaper = (
        db.query(Diaper).join(Baby).filter(Diaper.id == diaper_id, baby_access_filter(user_id, user_email, db)).first()
    )

    if not diaper:
        raise HTTPException(status_code=404, detail="Diaper not found")

    return diaper


@router.post("/", response_model=DiaperResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_diaper(
    request: Request,
    diaper_data: DiaperCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Log a new diaper change."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, diaper_data.baby_id, user_id, user_email)
    require_write_access(role)

    diaper = Diaper(
        baby_id=diaper_data.baby_id,
        time=diaper_data.time,
        type=diaper_data.type,
        poo_color=diaper_data.poo_color,
        poo_consistency=diaper_data.poo_consistency,
        poo_amount=diaper_data.poo_amount,
        notes=diaper_data.notes,
    )
    db.add(diaper)
    db.commit()
    db.refresh(diaper)
    logger.info("Created diaper", extra={"baby_id": diaper.baby_id, "diaper_id": diaper.id})
    return diaper


@router.put("/{diaper_id}", response_model=DiaperResponse)
@limiter.limit(RATE_WRITE)
def update_diaper(
    request: Request,
    diaper_id: int,
    diaper_data: DiaperUpdate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a diaper record."""
    user_id = user.get("sub")

    diaper = (
        db.query(Diaper).join(Baby).filter(Diaper.id == diaper_id, baby_access_filter(user_id, user_email, db)).first()
    )

    if not diaper:
        raise HTTPException(status_code=404, detail="Diaper not found")

    # Verify write access
    _, role = verify_baby_access(db, diaper.baby_id, user_id, user_email)
    require_write_access(role)

    update_data = diaper_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(diaper, field, value)

    db.commit()
    db.refresh(diaper)
    return diaper


@router.delete("/{diaper_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_diaper(
    request: Request,
    diaper_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a diaper record."""
    user_id = user.get("sub")

    diaper = (
        db.query(Diaper).join(Baby).filter(Diaper.id == diaper_id, baby_access_filter(user_id, user_email, db)).first()
    )

    if not diaper:
        logger.warning("Delete diaper not found", extra={"diaper_id": diaper_id})
        raise HTTPException(status_code=404, detail="Diaper not found")

    # Verify write access
    _, role = verify_baby_access(db, diaper.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted diaper", extra={"diaper_id": diaper_id, "baby_id": diaper.baby_id})
    db.delete(diaper)
    db.commit()
    return None
