from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Diaper, Baby
from ..schemas import DiaperCreate, DiaperUpdate, DiaperResponse
from ..auth import get_user_id

router = APIRouter(prefix="/diapers", tags=["diapers"])


def verify_baby_ownership(db: Session, baby_id: int, user_id: str):
    """Verify the baby belongs to the user."""
    baby = db.query(Baby).filter(Baby.id == baby_id, Baby.user_id == user_id).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    return baby


@router.get("/", response_model=List[DiaperResponse])
def get_diapers(
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Get all diaper changes for a baby."""
    verify_baby_ownership(db, baby_id, user_id)
    
    return db.query(Diaper).filter(
        Diaper.baby_id == baby_id
    ).order_by(Diaper.time.desc()).offset(skip).limit(limit).all()


@router.get("/{diaper_id}", response_model=DiaperResponse)
def get_diaper(
    diaper_id: int,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Get a specific diaper change by ID."""
    diaper = db.query(Diaper).join(Baby).filter(
        Diaper.id == diaper_id,
        Baby.user_id == user_id
    ).first()
    
    if not diaper:
        raise HTTPException(status_code=404, detail="Diaper not found")
    
    return diaper


@router.post("/", response_model=DiaperResponse, status_code=status.HTTP_201_CREATED)
def create_diaper(
    diaper_data: DiaperCreate,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Log a new diaper change."""
    verify_baby_ownership(db, diaper_data.baby_id, user_id)
    
    diaper = Diaper(
        baby_id=diaper_data.baby_id,
        time=diaper_data.time,
        type=diaper_data.type,
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
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Update a diaper record."""
    diaper = db.query(Diaper).join(Baby).filter(
        Diaper.id == diaper_id,
        Baby.user_id == user_id
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
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Delete a diaper record."""
    diaper = db.query(Diaper).join(Baby).filter(
        Diaper.id == diaper_id,
        Baby.user_id == user_id
    ).first()
    
    if not diaper:
        raise HTTPException(status_code=404, detail="Diaper not found")
    
    db.delete(diaper)
    db.commit()
    return None
