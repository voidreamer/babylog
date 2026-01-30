"""
Subscription and promo code management.

Handles premium feature unlocking via promo codes.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..auth import get_current_user
from ..config import get_settings
from ..database import get_db
from ..models import User, utc_now

router = APIRouter(prefix="/subscription", tags=["subscription"])
settings = get_settings()

# Rate limiter for this router
limiter = Limiter(key_func=get_remote_address)

# Promo codes removed — premium access is now handled via Stripe subscriptions.
# See billing.py for the Stripe integration.
VALID_PROMO_CODES: dict = {}


class PromoCodeRequest(BaseModel):
    code: str


class PromoCodeResponse(BaseModel):
    valid: bool
    premium: bool
    message: str


def get_or_create_user(db: Session, user_id: str, email: str | None = None) -> User:
    """Get existing user or create a new one."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        user = User(user_id=user_id, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif email and user.email != email:
        # Update email if it changed
        user.email = email
        db.commit()
        db.refresh(user)
    return user


@router.post("/redeem", response_model=PromoCodeResponse)
@limiter.limit("5/minute")  # Prevent brute force attempts
async def redeem_promo_code(
    request: Request,
    promo_request: PromoCodeRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate and redeem a promo code.

    Returns whether the code is valid and what features it unlocks.
    Stores the redemption in the database and associates premium status with user.
    """
    code = promo_request.code.strip().upper()

    if not code:
        raise HTTPException(status_code=400, detail="Promo code required")

    promo = VALID_PROMO_CODES.get(code)

    if not promo:
        return PromoCodeResponse(
            valid=False,
            premium=False,
            message="Invalid promo code"
        )

    # Get or create user record
    user_id = user.get("sub") or user.get("user_id")
    user_email = user.get("email")
    db_user = get_or_create_user(db, user_id, user_email)

    # Check if user is already premium
    if db_user.is_premium:
        return PromoCodeResponse(
            valid=True,
            premium=True,
            message="You already have premium access!"
        )

    # Activate premium for this user
    db_user.is_premium = True
    db_user.premium_since = utc_now()
    db_user.promo_code_used = code
    db.commit()

    return PromoCodeResponse(
        valid=True,
        premium=True,
        message=f"Code redeemed! {promo.get('description', '')} - Premium unlocked!"
    )


@router.get("/status")
async def get_subscription_status(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current subscription status for the user.

    Checks the database for the user's premium status.
    """
    user_id = user.get("sub") or user.get("user_id")
    user_email = user.get("email")

    # Get or create user record
    db_user = get_or_create_user(db, user_id, user_email)

    is_premium = db_user.is_premium

    return {
        "tier": "premium" if is_premium else "free",
        "premium": is_premium,
        "premium_since": db_user.premium_since.isoformat() if db_user.premium_since else None,
        "features": {
            "predictions": is_premium,
            "patterns": is_premium,
            "trends": is_premium,
            "export": True,  # Export is free for everyone
        }
    }
