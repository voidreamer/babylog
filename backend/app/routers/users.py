"""User profile endpoints for onboarding/tour state."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..auth import get_current_user
from ..database import get_db
from ..models import utc_now
from .subscription import get_or_create_user

router = APIRouter(prefix="/users", tags=["users"])


def _get_user(user: dict, db: Session):
    user_id = user.get("sub") or user.get("user_id")
    user_email = user.get("email")
    return get_or_create_user(db, user_id, user_email)


@router.get("/me")
async def get_user_info(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = _get_user(user, db)
    return {
        "onboarding_completed": db_user.onboarding_completed_at is not None,
        "tour_completed": db_user.tour_completed_at is not None,
    }


@router.post("/me/onboarding")
async def complete_onboarding(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = _get_user(user, db)
    if not db_user.onboarding_completed_at:
        db_user.onboarding_completed_at = utc_now()
        db.commit()
    return {"ok": True}


@router.post("/me/tour")
async def complete_tour(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = _get_user(user, db)
    if not db_user.tour_completed_at:
        db_user.tour_completed_at = utc_now()
        db.commit()
    return {"ok": True}
