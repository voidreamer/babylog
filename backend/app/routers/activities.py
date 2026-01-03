from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from ..database import get_db
from ..models import Potty, TummyTime, Bath, Baby
from ..schemas import (
    PottyCreate, PottyResponse,
    TummyTimeCreate, TummyTimeResponse,
    BathCreate, BathResponse
)
from ..auth import get_current_user, get_user_email
from .utils import verify_baby_access

router = APIRouter(prefix="/activities", tags=["activities"])


# ============================================================================
# Potty Training
# ============================================================================

@router.get("/potty", response_model=List[PottyResponse])
def get_potty_logs(
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get all potty logs for a baby."""
    user_id = user.get("sub")
    verify_baby_access(db, baby_id, user_id, user_email)
    
    return db.query(Potty).filter(
        Potty.baby_id == baby_id
    ).order_by(Potty.time.desc()).offset(skip).limit(limit).all()


@router.post("/potty", response_model=PottyResponse, status_code=status.HTTP_201_CREATED)
def create_potty_log(
    potty_data: PottyCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Log a potty training event."""
    user_id = user.get("sub")
    verify_baby_access(db, potty_data.baby_id, user_id, user_email)
    
    potty = Potty(
        baby_id=potty_data.baby_id,
        time=potty_data.time,
        result=potty_data.result,
        potty_type=potty_data.potty_type,
        notes=potty_data.notes
    )
    db.add(potty)
    db.commit()
    db.refresh(potty)
    return potty


@router.delete("/potty/{potty_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_potty_log(
    potty_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Delete a potty log."""
    user_id = user.get("sub")
    
    potty = db.query(Potty).join(Baby).filter(
        Potty.id == potty_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.any(user_email)
        )
    ).first()
    
    if not potty:
        raise HTTPException(status_code=404, detail="Potty log not found")
    
    db.delete(potty)
    db.commit()
    return None


# ============================================================================
# Tummy Time
# ============================================================================

@router.get("/tummy-time", response_model=List[TummyTimeResponse])
def get_tummy_times(
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get all tummy time logs for a baby."""
    user_id = user.get("sub")
    verify_baby_access(db, baby_id, user_id, user_email)
    
    return db.query(TummyTime).filter(
        TummyTime.baby_id == baby_id
    ).order_by(TummyTime.start_time.desc()).offset(skip).limit(limit).all()


@router.post("/tummy-time", response_model=TummyTimeResponse, status_code=status.HTTP_201_CREATED)
def create_tummy_time(
    tummy_data: TummyTimeCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Log a tummy time session."""
    user_id = user.get("sub")
    verify_baby_access(db, tummy_data.baby_id, user_id, user_email)
    
    tummy = TummyTime(
        baby_id=tummy_data.baby_id,
        start_time=tummy_data.start_time,
        duration_minutes=tummy_data.duration_minutes,
        notes=tummy_data.notes
    )
    db.add(tummy)
    db.commit()
    db.refresh(tummy)
    return tummy


@router.delete("/tummy-time/{tummy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tummy_time(
    tummy_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Delete a tummy time log."""
    user_id = user.get("sub")
    
    tummy = db.query(TummyTime).join(Baby).filter(
        TummyTime.id == tummy_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.any(user_email)
        )
    ).first()
    
    if not tummy:
        raise HTTPException(status_code=404, detail="Tummy time not found")
    
    db.delete(tummy)
    db.commit()
    return None


# ============================================================================
# Bath Time
# ============================================================================

@router.get("/baths", response_model=List[BathResponse])
def get_baths(
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get all bath logs for a baby."""
    user_id = user.get("sub")
    verify_baby_access(db, baby_id, user_id, user_email)
    
    return db.query(Bath).filter(
        Bath.baby_id == baby_id
    ).order_by(Bath.time.desc()).offset(skip).limit(limit).all()


@router.post("/baths", response_model=BathResponse, status_code=status.HTTP_201_CREATED)
def create_bath(
    bath_data: BathCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Log a bath."""
    user_id = user.get("sub")
    verify_baby_access(db, bath_data.baby_id, user_id, user_email)
    
    bath = Bath(
        baby_id=bath_data.baby_id,
        time=bath_data.time,
        notes=bath_data.notes
    )
    db.add(bath)
    db.commit()
    db.refresh(bath)
    return bath


@router.delete("/baths/{bath_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bath(
    bath_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Delete a bath log."""
    user_id = user.get("sub")
    
    bath = db.query(Bath).join(Baby).filter(
        Bath.id == bath_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.any(user_email)
        )
    ).first()
    
    if not bath:
        raise HTTPException(status_code=404, detail="Bath not found")
    
    db.delete(bath)
    db.commit()
    return None
