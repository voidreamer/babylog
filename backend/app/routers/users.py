"""User profile endpoints for onboarding/tour state and account deletion."""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..auth import get_current_user
from ..config import get_settings
from ..database import get_db
from ..models import User, Baby, AnalyticsEvent, PushSubscription, utc_now
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


@router.delete("/me")
async def delete_account(
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
            print(f"Warning: failed to delete Supabase auth user: {e}")

    return {"ok": True, "message": "Account and all data deleted"}
