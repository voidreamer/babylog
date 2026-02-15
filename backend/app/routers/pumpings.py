from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Pumping, Baby
from ..schemas import PumpingCreate, PumpingUpdate, PumpingResponse
from ..auth import get_current_user, get_user_email
from .utils import verify_baby_access, require_write_access, baby_access_filter

router = APIRouter(prefix="/pumpings", tags=["pumpings"])


@router.get("/", response_model=List[PumpingResponse])
def get_pumpings(
    baby_id: int,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get all pumping sessions for a baby."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, baby_id, user_id, user_email)

    return db.query(Pumping).filter(
        Pumping.baby_id == baby_id
    ).order_by(Pumping.time.desc()).offset(skip).limit(limit).all()


@router.get("/{pumping_id}", response_model=PumpingResponse)
def get_pumping(
    pumping_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get a specific pumping session by ID."""
    user_id = user.get("sub")

    pumping = db.query(Pumping).join(Baby).filter(
        Pumping.id == pumping_id,
        baby_access_filter(user_id, user_email)
    ).first()
    
    if not pumping:
        raise HTTPException(status_code=404, detail="Pumping not found")
    
    return pumping


@router.post("/", response_model=PumpingResponse, status_code=status.HTTP_201_CREATED)
def create_pumping(
    pumping_data: PumpingCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
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
        notes=pumping_data.notes
    )
    db.add(pumping)
    db.commit()
    db.refresh(pumping)
    return pumping


@router.put("/{pumping_id}", response_model=PumpingResponse)
def update_pumping(
    pumping_id: int,
    pumping_data: PumpingUpdate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Update a pumping record."""
    user_id = user.get("sub")

    pumping = db.query(Pumping).join(Baby).filter(
        Pumping.id == pumping_id,
        baby_access_filter(user_id, user_email)
    ).first()

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
def delete_pumping(
    pumping_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Delete a pumping record."""
    user_id = user.get("sub")

    pumping = db.query(Pumping).join(Baby).filter(
        Pumping.id == pumping_id,
        baby_access_filter(user_id, user_email)
    ).first()

    if not pumping:
        raise HTTPException(status_code=404, detail="Pumping not found")

    # Verify write access
    _, role = verify_baby_access(db, pumping.baby_id, user_id, user_email)
    require_write_access(role)

    db.delete(pumping)
    db.commit()
    return None
