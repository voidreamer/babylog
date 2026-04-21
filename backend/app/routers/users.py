"""User profile endpoints for onboarding/tour state and account deletion."""

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import get_settings
from ..database import get_db
from ..logging_config import get_logger
from ..models import AnalyticsEvent, Baby, PushSubscription, User, utc_now
from ..rate_limit import RATE_READ, RATE_WRITE, limiter
from .subscription import get_or_create_user

SUPPORTED_COUNTRIES = {"us", "ca"}


class UserPatch(BaseModel):
    country: str | None = None

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


def _get_user(user: dict, db: Session):
    user_id = user.get("sub") or user.get("user_id")
    user_email = user.get("email")
    return get_or_create_user(db, user_id, user_email)


@router.get("/me")
@limiter.limit(RATE_READ)
async def get_user_info(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = _get_user(user, db)
    return {
        "onboarding_completed": db_user.onboarding_completed_at is not None,
        "tour_completed": db_user.tour_completed_at is not None,
        "country": db_user.country,
    }


@router.patch("/me")
@limiter.limit(RATE_WRITE)
async def update_user(
    request: Request,
    patch: UserPatch,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = _get_user(user, db)
    if patch.country is not None:
        normalized = patch.country.strip().lower()
        if normalized not in SUPPORTED_COUNTRIES:
            raise HTTPException(status_code=400, detail="Unsupported country")
        db_user.country = normalized
    db.commit()
    return {"ok": True, "country": db_user.country}


@router.post("/me/onboarding")
@limiter.limit(RATE_WRITE)
async def complete_onboarding(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = _get_user(user, db)
    if not db_user.onboarding_completed_at:
        db_user.onboarding_completed_at = utc_now()
        db.commit()
    return {"ok": True}


@router.post("/me/tour")
@limiter.limit(RATE_WRITE)
async def complete_tour(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = _get_user(user, db)
    if not db_user.tour_completed_at:
        db_user.tour_completed_at = utc_now()
        db.commit()
    return {"ok": True}


@router.delete("/me")
@limiter.limit(RATE_WRITE)
async def delete_account(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete user account and all associated data. Apple App Store requirement."""
    user_id = user.get("sub") or user.get("user_id")
    settings = get_settings()

    # 1. Delete all babies owned by this user (cascades to feedings, diapers, sleeps, etc.)
    babies = db.query(Baby).filter(Baby.user_id == user_id).all()
    for baby in babies:
        db.delete(baby)

    # 2. Delete analytics events
    db.query(AnalyticsEvent).filter(AnalyticsEvent.user_id == user_id).delete()

    # 3. Delete push subscriptions
    db.query(PushSubscription).filter(PushSubscription.user_id == user_id).delete()

    # 4. Delete user record
    db.query(User).filter(User.user_id == user_id).delete()

    db.commit()
    logger.info("Deleted user account", extra={"user_id": user_id})

    # 5. Delete Supabase auth user (best-effort, don't fail if this errors)
    if settings.supabase_url and settings.supabase_service_key:
        try:
            supabase_user_id = user.get("sub")
            async with httpx.AsyncClient() as client:
                await client.delete(
                    f"{settings.supabase_url}/auth/v1/admin/users/{supabase_user_id}",
                    headers={
                        "Authorization": f"Bearer {settings.supabase_service_key}",
                        "apikey": settings.supabase_service_key,
                    },
                )
        except Exception as e:
            # Log but don't fail — DB data is already gone
            logger.warning("Failed to delete Supabase auth user", extra={"user_id": user_id, "error": str(e)})

    return {"ok": True, "message": "Account and all data deleted"}
