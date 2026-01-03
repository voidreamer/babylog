from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from ..database import get_db
from ..models import Diaper, Baby
from ..schemas import DiaperCreate, DiaperUpdate, DiaperResponse
from ..auth import get_current_user, get_user_email
from .utils import verify_baby_access

router = APIRouter(prefix="/diapers", tags=["diapers"])


@router.get("/", response_model=List[DiaperResponse])
def get_diapers(
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get all diaper changes for a baby."""
    user_id = user.get("sub")
    verify_baby_access(db, baby_id, user_id, user_email)
    
    return db.query(Diaper).filter(
        Diaper.baby_id == baby_id
    ).order_by(Diaper.time.desc()).offset(skip).limit(limit).all()


@router.get("/{diaper_id}", response_model=DiaperResponse)
def get_diaper(
    diaper_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get a specific diaper change by ID."""
    user_id = user.get("sub")
    
    diaper = db.query(Diaper).join(Baby).filter(
        Diaper.id == diaper_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.any(user_email)
        )
    ).first()
    
    if not diaper:
        raise HTTPException(status_code=404, detail="Diaper not found")
    
    return diaper


@router.post("/", response_model=DiaperResponse, status_code=status.HTTP_201_CREATED)
def create_diaper(
    diaper_data: DiaperCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Log a new diaper change."""
    user_id = user.get("sub")
    verify_baby_access(db, diaper_data.baby_id, user_id, user_email)
    
    diaper = Diaper(
        baby_id=diaper_data.baby_id,
        time=diaper_data.time,
        type=diaper_data.type,
        poo_color=diaper_data.poo_color,
        poo_consistency=diaper_data.poo_consistency,
        poo_amount=diaper_data.poo_amount,
        notes=diaper_data.notes
    )
    db.add(diaper)
    db.commit()
    db.refresh(diaper)
    return diaper


@router.put("/{diaper_id}", response_model=DiaperResponse)
def update_diaper(
    diaper_id: int,
    diaper_data: DiaperUpdate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Update a diaper record."""
    user_id = user.get("sub")
    
    diaper = db.query(Diaper).join(Baby).filter(
        Diaper.id == diaper_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.any(user_email)
        )
    ).first()
    
    if not diaper:
        raise HTTPException(status_code=404, detail="Diaper not found")
    
    update_data = diaper_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(diaper, field, value)
    
    db.commit()
    db.refresh(diaper)
    return diaper


@router.delete("/{diaper_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diaper(
    diaper_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Delete a diaper record."""
    user_id = user.get("sub")
    
    diaper = db.query(Diaper).join(Baby).filter(
        Diaper.id == diaper_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.any(user_email)
        )
    ).first()
    
    if not diaper:
        raise HTTPException(status_code=404, detail="Diaper not found")
    
    db.delete(diaper)
    db.commit()
    return None
