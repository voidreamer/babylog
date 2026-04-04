from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email, get_user_id
from ..database import get_db
from ..logging_config import get_logger
from ..models import Baby
from ..rate_limit import RATE_READ, RATE_WRITE, limiter
from ..schemas import BabyCreate, BabyResponse, BabyShareRequest, BabyUpdate, CaregiverRoleUpdate
from .utils import baby_access_filter

logger = get_logger(__name__)

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


@router.get("/", response_model=list[BabyResponse])
@limiter.limit(RATE_READ)
def get_babies(
    request: Request,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get all babies for the current user (owned or shared)."""
    user_id = user.get("sub")

    babies = db.query(Baby).filter(baby_access_filter(user_id, user_email)).all()

    return [baby_to_response(b, user_id) for b in babies]


@router.get("/{baby_id}", response_model=BabyResponse)
@limiter.limit(RATE_READ)
def get_baby(
    request: Request,
    baby_id: int,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Get a specific baby by ID."""
    user_id = user.get("sub")

    baby = db.query(Baby).filter(Baby.id == baby_id, baby_access_filter(user_id, user_email)).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return baby_to_response(baby, user_id)


@router.post("/", response_model=BabyResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_WRITE)
def create_baby(
    request: Request,
    baby_data: BabyCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Create a new baby."""
    user_id = user.get("sub")

    baby = Baby(
        user_id=user_id,
        owner_email=user_email,
        name=baby_data.name,
        birth_date=baby_data.birth_date,
        gender=baby_data.gender,
        shared_with=[],
    )
    db.add(baby)
    db.commit()
    db.refresh(baby)
    logger.info("Created baby", extra={"baby_id": baby.id, "user_id": user_id})
    return baby_to_response(baby, user_id)


@router.put("/{baby_id}", response_model=BabyResponse)
@limiter.limit(RATE_WRITE)
def update_baby(
    request: Request,
    baby_id: int,
    baby_data: BabyUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a baby's information. Only owner can update."""
    user_id = user.get("sub")

    # Only owner can update
    baby = db.query(Baby).filter(Baby.id == baby_id, Baby.user_id == user_id).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found or you don't have permission")

    update_data = baby_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(baby, field, value)

    db.commit()
    db.refresh(baby)
    return baby_to_response(baby, user_id)


@router.delete("/{baby_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_WRITE)
def delete_baby(request: Request, baby_id: int, user_id: str = Depends(get_user_id), db: Session = Depends(get_db)):
    """Delete a baby and all associated records. Only owner can delete."""
    baby = db.query(Baby).filter(Baby.id == baby_id, Baby.user_id == user_id).first()

    if not baby:
        logger.warning("Delete baby not found", extra={"baby_id": baby_id, "user_id": user_id})
        raise HTTPException(status_code=404, detail="Baby not found or you don't have permission")

    logger.info("Deleted baby", extra={"baby_id": baby_id, "user_id": user_id})
    db.delete(baby)
    db.commit()
    return None


# ============================================================================
# Sharing Endpoints
# ============================================================================


@router.post("/{baby_id}/share", response_model=BabyResponse)
@limiter.limit(RATE_WRITE)
def share_baby(
    request: Request,
    baby_id: int,
    share_request: BabyShareRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Share a baby with another user by email. Only owner can share."""
    user_id = user.get("sub")

    baby = db.query(Baby).filter(Baby.id == baby_id, Baby.user_id == user_id).first()

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
    logger.info("Shared baby", extra={"baby_id": baby_id, "shared_with": email, "role": role})

    return baby_to_response(baby, user_id)


@router.delete("/{baby_id}/share/{email}")
@limiter.limit(RATE_WRITE)
def unshare_baby(
    request: Request, baby_id: int, email: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Remove sharing for a baby. Only owner can unshare."""
    user_id = user.get("sub")

    baby = db.query(Baby).filter(Baby.id == baby_id, Baby.user_id == user_id).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found or you don't have permission")

    email = email.lower().strip()

    if baby.shared_with:
        baby.shared_with = [e for e in baby.shared_with if e.get("email") != email]
        db.commit()
        db.refresh(baby)
        logger.info("Unshared baby", extra={"baby_id": baby_id, "removed_email": email})

    return baby_to_response(baby, user_id)


@router.patch("/{baby_id}/share/{email}", response_model=BabyResponse)
@limiter.limit(RATE_WRITE)
def update_caregiver_role(
    request: Request,
    baby_id: int,
    email: str,
    role_update: CaregiverRoleUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a caregiver's role. Only owner can change roles."""
    user_id = user.get("sub")

    baby = db.query(Baby).filter(Baby.id == baby_id, Baby.user_id == user_id).first()

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
