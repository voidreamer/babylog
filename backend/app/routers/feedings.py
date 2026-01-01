from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from ..database import get_db
from ..models import Feeding, Baby
from ..schemas import FeedingCreate, FeedingUpdate, FeedingResponse
from ..auth import get_current_user
from .utils import verify_baby_access

router = APIRouter(prefix="/feedings", tags=["feedings"])


@router.get("/", response_model=List[FeedingResponse])
def get_feedings(
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all feedings for a baby."""
    user_id = user.get("sub")
    user_email = user.get("email", "")
    verify_baby_access(db, baby_id, user_id, user_email)
    
    return db.query(Feeding).filter(
        Feeding.baby_id == baby_id
    ).order_by(Feeding.time.desc()).offset(skip).limit(limit).all()


@router.get("/{feeding_id}", response_model=FeedingResponse)
def get_feeding(
    feeding_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific feeding by ID."""
    user_id = user.get("sub")
    user_email = user.get("email", "")
    
    feeding = db.query(Feeding).join(Baby).filter(
        Feeding.id == feeding_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.contains([user_email])
        )
    ).first()
    
    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding not found")
    
    return feeding


@router.post("/", response_model=FeedingResponse, status_code=status.HTTP_201_CREATED)
def create_feeding(
    feeding_data: FeedingCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log a new feeding."""
    user_id = user.get("sub")
    user_email = user.get("email", "")
    verify_baby_access(db, feeding_data.baby_id, user_id, user_email)
    
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
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a feeding record."""
    user_id = user.get("sub")
    user_email = user.get("email", "")
    
    feeding = db.query(Feeding).join(Baby).filter(
        Feeding.id == feeding_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.contains([user_email])
        )
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
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a feeding record."""
    user_id = user.get("sub")
    user_email = user.get("email", "")
    
    feeding = db.query(Feeding).join(Baby).filter(
        Feeding.id == feeding_id,
        or_(
            Baby.user_id == user_id,
            Baby.shared_with_emails.contains([user_email])
        )
    ).first()
    
    if not feeding:
        raise HTTPException(status_code=404, detail="Feeding not found")
    
    db.delete(feeding)
    db.commit()
    return None
