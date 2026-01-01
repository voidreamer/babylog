from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Baby
from ..schemas import BabyCreate, BabyUpdate, BabyResponse
from ..auth import get_user_id

router = APIRouter(prefix="/babies", tags=["babies"])


@router.get("/", response_model=List[BabyResponse])
def get_babies(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Get all babies for the current user."""
    return db.query(Baby).filter(Baby.user_id == user_id).all()


@router.get("/{baby_id}", response_model=BabyResponse)
def get_baby(
    baby_id: int,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Get a specific baby by ID."""
    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        Baby.user_id == user_id
    ).first()
    
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return baby


@router.post("/", response_model=BabyResponse, status_code=status.HTTP_201_CREATED)
def create_baby(
    baby_data: BabyCreate,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Create a new baby."""
    baby = Baby(
        user_id=user_id,
        name=baby_data.name,
        birth_date=baby_data.birth_date
    )
    db.add(baby)
    db.commit()
    db.refresh(baby)
    return baby


@router.put("/{baby_id}", response_model=BabyResponse)
def update_baby(
    baby_id: int,
    baby_data: BabyUpdate,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Update a baby's information."""
    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        Baby.user_id == user_id
    ).first()
    
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    update_data = baby_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(baby, field, value)
    
    db.commit()
    db.refresh(baby)
    return baby


@router.delete("/{baby_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_baby(
    baby_id: int,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Delete a baby and all associated records."""
    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        Baby.user_id == user_id
    ).first()
    
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db.delete(baby)
    db.commit()
    return None
