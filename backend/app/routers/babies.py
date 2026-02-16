from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Baby
from ..schemas import BabyCreate, BabyUpdate, BabyResponse, BabyShareRequest, CaregiverRoleUpdate
from ..auth import get_user_id, get_user_email, get_current_user
from .utils import baby_access_filter

router = APIRouter(prefix="/babies", tags=["babies"])


def baby_to_response(baby: Baby, user_id: str) -> dict:
    """Convert baby to response with is_owner field."""
    return {
        "id": baby.id,
        "user_id": baby.user_id,
        "owner_email": baby.owner_email,
        "name": baby.name,
        "birth_date": baby.birth_date,
        "gender": baby.gender,
        "profile_photo_url": baby.profile_photo_url,
        "blood_type": baby.blood_type,
        "birthplace": baby.birthplace,
        "birth_time": baby.birth_time,
        "shared_with": baby.shared_with or [],
        "is_owner": baby.user_id == user_id,
        "created_at": baby.created_at,
    }


@router.get("/", response_model=List[BabyResponse])
def get_babies(
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get all babies for the current user (owned or shared)."""
    user_id = user.get("sub")

    babies = db.query(Baby).filter(
        baby_access_filter(user_id, user_email)
    ).all()

    return [baby_to_response(b, user_id) for b in babies]


@router.get("/{baby_id}", response_model=BabyResponse)
def get_baby(
    baby_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Get a specific baby by ID."""
    user_id = user.get("sub")

    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        baby_access_filter(user_id, user_email)
    ).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return baby_to_response(baby, user_id)


@router.post("/", response_model=BabyResponse, status_code=status.HTTP_201_CREATED)
def create_baby(
    baby_data: BabyCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Create a new baby."""
    user_id = user.get("sub")

    baby = Baby(
        user_id=user_id,
        owner_email=user_email,
        name=baby_data.name,
        birth_date=baby_data.birth_date,
        gender=baby_data.gender,
        shared_with=[]
    )
    db.add(baby)
    db.commit()
    db.refresh(baby)
    return baby_to_response(baby, user_id)


@router.put("/{baby_id}", response_model=BabyResponse)
def update_baby(
    baby_id: int,
    baby_data: BabyUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a baby's information. Only owner can update."""
    user_id = user.get("sub")

    # Only owner can update
    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        Baby.user_id == user_id
    ).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found or you don't have permission")

    update_data = baby_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(baby, field, value)

    db.commit()
    db.refresh(baby)
    return baby_to_response(baby, user_id)


@router.delete("/{baby_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_baby(
    baby_id: int,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Delete a baby and all associated records. Only owner can delete."""
    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        Baby.user_id == user_id
    ).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found or you don't have permission")

    db.delete(baby)
    db.commit()
    return None


# ============================================================================
# Sharing Endpoints
# ============================================================================

@router.post("/{baby_id}/share", response_model=BabyResponse)
def share_baby(
    baby_id: int,
    share_request: BabyShareRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share a baby with another user by email. Only owner can share."""
    user_id = user.get("sub")

    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        Baby.user_id == user_id
    ).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found or you don't have permission")

    email = share_request.email.lower().strip()
    role = share_request.role

    # Initialize if None
    if baby.shared_with is None:
        baby.shared_with = []

    # Check if already shared
    for entry in baby.shared_with:
        if entry.get("email") == email:
            raise HTTPException(status_code=400, detail="Baby already shared with this email")

    # Add to shared list
    baby.shared_with = baby.shared_with + [{"email": email, "role": role}]
    db.commit()
    db.refresh(baby)

    return baby_to_response(baby, user_id)


@router.delete("/{baby_id}/share/{email}")
def unshare_baby(
    baby_id: int,
    email: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove sharing for a baby. Only owner can unshare."""
    user_id = user.get("sub")

    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        Baby.user_id == user_id
    ).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found or you don't have permission")

    email = email.lower().strip()

    if baby.shared_with:
        baby.shared_with = [e for e in baby.shared_with if e.get("email") != email]
        db.commit()
        db.refresh(baby)

    return baby_to_response(baby, user_id)


@router.patch("/{baby_id}/share/{email}", response_model=BabyResponse)
def update_caregiver_role(
    baby_id: int,
    email: str,
    role_update: CaregiverRoleUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a caregiver's role. Only owner can change roles."""
    user_id = user.get("sub")

    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        Baby.user_id == user_id
    ).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found or you don't have permission")

    email = email.lower().strip()

    if not baby.shared_with:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    updated = False
    new_shared = []
    for entry in baby.shared_with:
        if entry.get("email") == email:
            new_shared.append({"email": email, "role": role_update.role})
            updated = True
        else:
            new_shared.append(entry)

    if not updated:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    baby.shared_with = new_shared
    db.commit()
    db.refresh(baby)

    return baby_to_response(baby, user_id)
