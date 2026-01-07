"""
Subscription and promo code management.

Handles premium feature unlocking via promo codes.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..auth import get_current_user
from ..config import get_settings

router = APIRouter(prefix="/subscription", tags=["subscription"])
settings = get_settings()

# Rate limiter for this router
limiter = Limiter(key_func=get_remote_address)

# Promo codes stored server-side (in production, these would be in a database)
# Format: code -> {premium: bool, expires: date or None}
VALID_PROMO_CODES = {
    "SIMPLEBABY2026": {"premium": True, "description": "Launch promo"},
    "BETATESTER": {"premium": True, "description": "Beta tester reward"},
}


class PromoCodeRequest(BaseModel):
    code: str


class PromoCodeResponse(BaseModel):
    valid: bool
    premium: bool
    message: str


@router.post("/redeem", response_model=PromoCodeResponse)
@limiter.limit("5/minute")  # Prevent brute force attempts
async def redeem_promo_code(
    request: Request,
    promo_request: PromoCodeRequest,
    user: dict = Depends(get_current_user)
):
    """
    Validate and redeem a promo code.

    Returns whether the code is valid and what features it unlocks.
    In production, this would also store the redemption in the database.
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

    # In production, you would:
    # 1. Check if code has already been redeemed by this user
    # 2. Check if code has usage limits
    # 3. Store the redemption in database
    # 4. Associate premium status with user account

    return PromoCodeResponse(
        valid=True,
        premium=promo.get("premium", False),
        message=f"Code redeemed! {promo.get('description', '')}"
    )


@router.get("/status")
async def get_subscription_status(
    user: dict = Depends(get_current_user)
):
    """
    Get current subscription status for the user.

    In production, this would check the database for:
    - Active subscriptions
    - Redeemed promo codes
    - Trial status
    """
    # For now, return free tier
    # In production, query database for user's subscription
    return {
        "tier": "free",
        "premium": False,
        "features": {
            "predictions": False,
            "patterns": False,
            "trends": False,
            "export": False,
        }
    }
