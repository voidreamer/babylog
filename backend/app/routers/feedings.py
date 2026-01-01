from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Feeding, Baby
from ..schemas import FeedingCreate, FeedingUpdate, FeedingResponse
from ..auth import get_user_id

router = APIRouter(prefix="/feedings", tags=["feedings"])


def verify_baby_ownership(db: Session, baby_id: int, user_id: str):
    """Verify the baby belongs to the user."""
    baby = db.query(Baby).filter(Baby.id == baby_id, Baby.user_id == user_id).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    return baby


@router.get("/", response_model=List[FeedingResponse])
def get_feedings(
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Get all feedings for a baby."""
    verify_baby_ownership(db, baby_id, user_id)
    
    return db.query(Feeding).filter(
        Feeding.baby_id == baby_id
    ).order_by(Feeding.time.desc()).offset(skip).limit(limit).all()


@router.get("/{feeding_id}", response_model=FeedingResponse)
def get_feeding(
    feeding_id: int,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Get a specific feeding by ID."""
    feeding = db.query(Feeding).join(Baby).filter(
        Feeding.id == feeding_id,
        Baby.user_id == user_id
    ).first()
    
    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding not found")
    
    return feeding


@router.post("/", response_model=FeedingResponse, status_code=status.HTTP_201_CREATED)
def create_feeding(
    feeding_data: FeedingCreate,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Log a new feeding."""
    verify_baby_ownership(db, feeding_data.baby_id, user_id)
    
    feeding = Feeding(
        baby_id=feeding_data.baby_id,
        time=feeding_data.time,
        type=feeding_data.type,
        duration_minutes=feeding_data.duration_minutes,
        amount_ml=feeding_data.amount_ml,
        notes=feeding_data.notes
    )
    db.add(feeding)
    db.commit()
    db.refresh(feeding)
    return feeding


@router.put("/{feeding_id}", response_model=FeedingResponse)
def update_feeding(
    feeding_id: int,
    feeding_data: FeedingUpdate,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Update a feeding record."""
    feeding = db.query(Feeding).join(Baby).filter(
        Feeding.id == feeding_id,
        Baby.user_id == user_id
    ).first()
    
    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding not found")
    
    update_data = feeding_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(feeding, field, value)
    
    db.commit()
    db.refresh(feeding)
    return feeding


@router.delete("/{feeding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feeding(
    feeding_id: int,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Delete a feeding record."""
    feeding = db.query(Feeding).join(Baby).filter(
        Feeding.id == feeding_id,
        Baby.user_id == user_id
    ).first()
    
    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding not found")
    
    db.delete(feeding)
    db.commit()
    return None
