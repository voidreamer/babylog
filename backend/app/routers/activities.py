from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..database import get_db
from ..logging_config import get_logger
from ..models import Baby, Bath, Potty, Solid, Supplement, TummyTime
from ..rate_limit import RATE_READ, RATE_WRITE, limiter
from ..schemas import (
    BathCreate,
    BathResponse,
    PottyCreate,
    PottyResponse,
    SolidCreate,
    SolidResponse,
    SupplementCreate,
    SupplementResponse,
    TummyTimeCreate,
    TummyTimeResponse,
)
from .utils import baby_access_filter, require_write_access, verify_baby_access

logger = get_logger(__name__)

router = APIRouter(prefix="/activities", tags=["activities"])


# ============================================================================
# Potty Training
# ============================================================================


@router.get("/potty", response_model=list[PottyResponse])
@limiter.limit(RATE_READ)
def get_potty_logs(
    request: Request,
    baby_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all potty logs for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return db.query(Potty).filter(Potty.baby_id == baby_id).order_by(Potty.time.desc()).offset(skip).limit(limit).all()


@router.post("/potty", response_model=PottyResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_potty_log(
    request: Request,
    potty_data: PottyCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Log a potty training event."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, potty_data.baby_id, user_id, user_email)
    require_write_access(role)

    potty = Potty(
        baby_id=potty_data.baby_id,
        time=potty_data.time,
        result=potty_data.result,
        potty_type=potty_data.potty_type,
        notes=potty_data.notes,
    )
    db.add(potty)
    db.commit()
    db.refresh(potty)
    logger.info("Created potty log", extra={"baby_id": potty.baby_id, "potty_id": potty.id})
    return potty


@router.delete("/potty/{potty_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_potty_log(
    request: Request,
    potty_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a potty log."""
    user_id = user.get("sub")

    potty = db.query(Potty).join(Baby).filter(Potty.id == potty_id, baby_access_filter(user_id, user_email, db)).first()

    if not potty:
        logger.warning("Delete potty not found", extra={"potty_id": potty_id})
        raise HTTPException(status_code=404, detail="Potty log not found")

    _, role = verify_baby_access(db, potty.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted potty log", extra={"potty_id": potty_id, "baby_id": potty.baby_id})
    db.delete(potty)
    db.commit()
    return None


@router.put("/potty/{potty_id}", response_model=PottyResponse)
@limiter.limit(RATE_WRITE)
def update_potty_log(
    request: Request,
    potty_id: int,
    potty_data: PottyCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a potty log."""
    user_id = user.get("sub")

    potty = db.query(Potty).join(Baby).filter(Potty.id == potty_id, baby_access_filter(user_id, user_email, db)).first()

    if not potty:
        raise HTTPException(status_code=404, detail="Potty log not found")

    _, role = verify_baby_access(db, potty.baby_id, user_id, user_email)
    require_write_access(role)

    potty.time = potty_data.time
    potty.result = potty_data.result
    potty.potty_type = potty_data.potty_type
    potty.notes = potty_data.notes
    db.commit()
    db.refresh(potty)
    return potty


# ============================================================================
# Tummy Time
# ============================================================================


@router.get("/tummy-time", response_model=list[TummyTimeResponse])
@limiter.limit(RATE_READ)
def get_tummy_times(
    request: Request,
    baby_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all tummy time logs for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return (
        db.query(TummyTime)
        .filter(TummyTime.baby_id == baby_id)
        .order_by(TummyTime.start_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/tummy-time", response_model=TummyTimeResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_tummy_time(
    request: Request,
    tummy_data: TummyTimeCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Log a tummy time session."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, tummy_data.baby_id, user_id, user_email)
    require_write_access(role)

    tummy = TummyTime(
        baby_id=tummy_data.baby_id,
        start_time=tummy_data.start_time,
        duration_minutes=tummy_data.duration_minutes,
        notes=tummy_data.notes,
    )
    db.add(tummy)
    db.commit()
    db.refresh(tummy)
    logger.info("Created tummy time", extra={"baby_id": tummy.baby_id, "tummy_id": tummy.id})
    return tummy


@router.delete("/tummy-time/{tummy_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_tummy_time(
    request: Request,
    tummy_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a tummy time log."""
    user_id = user.get("sub")

    tummy = (
        db.query(TummyTime)
        .join(Baby)
        .filter(TummyTime.id == tummy_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not tummy:
        logger.warning("Delete tummy time not found", extra={"tummy_id": tummy_id})
        raise HTTPException(status_code=404, detail="Tummy time not found")

    _, role = verify_baby_access(db, tummy.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted tummy time", extra={"tummy_id": tummy_id, "baby_id": tummy.baby_id})
    db.delete(tummy)
    db.commit()
    return None


@router.put("/tummy-time/{tummy_id}", response_model=TummyTimeResponse)
@limiter.limit(RATE_WRITE)
def update_tummy_time(
    request: Request,
    tummy_id: int,
    tummy_data: TummyTimeCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a tummy time log."""
    user_id = user.get("sub")

    tummy = (
        db.query(TummyTime)
        .join(Baby)
        .filter(TummyTime.id == tummy_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not tummy:
        raise HTTPException(status_code=404, detail="Tummy time not found")

    _, role = verify_baby_access(db, tummy.baby_id, user_id, user_email)
    require_write_access(role)

    tummy.start_time = tummy_data.start_time
    tummy.duration_minutes = tummy_data.duration_minutes
    tummy.notes = tummy_data.notes
    db.commit()
    db.refresh(tummy)
    return tummy


# ============================================================================
# Bath Time
# ============================================================================


@router.get("/baths", response_model=list[BathResponse])
@limiter.limit(RATE_READ)
def get_baths(
    request: Request,
    baby_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all bath logs for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return db.query(Bath).filter(Bath.baby_id == baby_id).order_by(Bath.time.desc()).offset(skip).limit(limit).all()


@router.post("/baths", response_model=BathResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_bath(
    request: Request,
    bath_data: BathCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Log a bath."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, bath_data.baby_id, user_id, user_email)
    require_write_access(role)

    bath = Bath(baby_id=bath_data.baby_id, time=bath_data.time, notes=bath_data.notes)
    db.add(bath)
    db.commit()
    db.refresh(bath)
    logger.info("Created bath", extra={"baby_id": bath.baby_id, "bath_id": bath.id})
    return bath


@router.delete("/baths/{bath_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_bath(
    request: Request,
    bath_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a bath log."""
    user_id = user.get("sub")

    bath = db.query(Bath).join(Baby).filter(Bath.id == bath_id, baby_access_filter(user_id, user_email, db)).first()

    if not bath:
        logger.warning("Delete bath not found", extra={"bath_id": bath_id})
        raise HTTPException(status_code=404, detail="Bath not found")

    _, role = verify_baby_access(db, bath.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted bath", extra={"bath_id": bath_id, "baby_id": bath.baby_id})
    db.delete(bath)
    db.commit()
    return None


@router.put("/baths/{bath_id}", response_model=BathResponse)
@limiter.limit(RATE_WRITE)
def update_bath(
    request: Request,
    bath_id: int,
    bath_data: BathCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a bath log."""
    user_id = user.get("sub")

    bath = db.query(Bath).join(Baby).filter(Bath.id == bath_id, baby_access_filter(user_id, user_email, db)).first()

    if not bath:
        raise HTTPException(status_code=404, detail="Bath not found")

    _, role = verify_baby_access(db, bath.baby_id, user_id, user_email)
    require_write_access(role)

    bath.time = bath_data.time
    bath.notes = bath_data.notes
    db.commit()
    db.refresh(bath)
    return bath


# ============================================================================
# Supplements (Vitamin D, Iron, etc.)
# ============================================================================


@router.get("/supplements", response_model=list[SupplementResponse])
@limiter.limit(RATE_READ)
def get_supplements(
    request: Request,
    baby_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all supplement logs for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return (
        db.query(Supplement)
        .filter(Supplement.baby_id == baby_id)
        .order_by(Supplement.time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/supplements", response_model=SupplementResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_supplement(
    request: Request,
    supplement_data: SupplementCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Log a supplement given to baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, supplement_data.baby_id, user_id, user_email)
    require_write_access(role)

    supplement = Supplement(
        baby_id=supplement_data.baby_id,
        time=supplement_data.time,
        name=supplement_data.name,
        dosage=supplement_data.dosage,
        notes=supplement_data.notes,
    )
    db.add(supplement)
    db.commit()
    db.refresh(supplement)
    logger.info("Created supplement", extra={"baby_id": supplement.baby_id, "supplement_id": supplement.id})
    return supplement


@router.delete("/supplements/{supplement_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_supplement(
    request: Request,
    supplement_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a supplement log."""
    user_id = user.get("sub")

    supplement = (
        db.query(Supplement)
        .join(Baby)
        .filter(Supplement.id == supplement_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not supplement:
        logger.warning("Delete supplement not found", extra={"supplement_id": supplement_id})
        raise HTTPException(status_code=404, detail="Supplement log not found")

    _, role = verify_baby_access(db, supplement.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted supplement", extra={"supplement_id": supplement_id, "baby_id": supplement.baby_id})
    db.delete(supplement)
    db.commit()
    return None


@router.put("/supplements/{supplement_id}", response_model=SupplementResponse)
@limiter.limit(RATE_WRITE)
def update_supplement(
    request: Request,
    supplement_id: int,
    supplement_data: SupplementCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a supplement log."""
    user_id = user.get("sub")

    supplement = (
        db.query(Supplement)
        .join(Baby)
        .filter(Supplement.id == supplement_id, baby_access_filter(user_id, user_email, db))
        .first()
    )

    if not supplement:
        raise HTTPException(status_code=404, detail="Supplement log not found")

    _, role = verify_baby_access(db, supplement.baby_id, user_id, user_email)
    require_write_access(role)

    supplement.time = supplement_data.time
    supplement.name = supplement_data.name
    supplement.dosage = supplement_data.dosage
    supplement.notes = supplement_data.notes
    db.commit()
    db.refresh(supplement)
    return supplement


# ============================================================================
# Solid Foods
# ============================================================================


@router.get("/solids", response_model=list[SolidResponse])
@limiter.limit(RATE_READ)
def get_solids(
    request: Request,
    baby_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all solid food logs for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return db.query(Solid).filter(Solid.baby_id == baby_id).order_by(Solid.time.desc()).offset(skip).limit(limit).all()


@router.post("/solids", response_model=SolidResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_solid(
    request: Request,
    solid_data: SolidCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Log a solid food meal."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, solid_data.baby_id, user_id, user_email)
    require_write_access(role)

    solid = Solid(
        baby_id=solid_data.baby_id,
        time=solid_data.time,
        food_name=solid_data.food_name,
        amount=solid_data.amount,
        reaction=solid_data.reaction,
        notes=solid_data.notes,
    )
    db.add(solid)
    db.commit()
    db.refresh(solid)
    logger.info("Created solid food log", extra={"baby_id": solid.baby_id, "solid_id": solid.id})
    return solid


@router.delete("/solids/{solid_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_solid(
    request: Request,
    solid_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Delete a solid food log."""
    user_id = user.get("sub")

    solid = db.query(Solid).join(Baby).filter(Solid.id == solid_id, baby_access_filter(user_id, user_email, db)).first()

    if not solid:
        logger.warning("Delete solid not found", extra={"solid_id": solid_id})
        raise HTTPException(status_code=404, detail="Solid food log not found")

    _, role = verify_baby_access(db, solid.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted solid food log", extra={"solid_id": solid_id, "baby_id": solid.baby_id})
    db.delete(solid)
    db.commit()
    return None


@router.put("/solids/{solid_id}", response_model=SolidResponse)
@limiter.limit(RATE_WRITE)
def update_solid(
    request: Request,
    solid_id: int,
    solid_data: SolidCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Update a solid food log."""
    user_id = user.get("sub")

    solid = db.query(Solid).join(Baby).filter(Solid.id == solid_id, baby_access_filter(user_id, user_email, db)).first()

    if not solid:
        raise HTTPException(status_code=404, detail="Solid food log not found")

    _, role = verify_baby_access(db, solid.baby_id, user_id, user_email)
    require_write_access(role)

    solid.time = solid_data.time
    solid.food_name = solid_data.food_name
    solid.amount = solid_data.amount
    solid.reaction = solid_data.reaction
    solid.notes = solid_data.notes
    db.commit()
    db.refresh(solid)
    return solid
