"""
Subscription status management.

Premium is now managed via Stripe (see billing.py).
This module provides the subscription status endpoint.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..auth import get_current_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/subscription", tags=["subscription"])


def get_or_create_user(db: Session, user_id: str, email: str | None = None) -> User:
    """Get existing user or create a new one."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        user = User(user_id=user_id, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif email and user.email != email:
        user.email = email
        db.commit()
        db.refresh(user)
    return user


@router.get("/status")
async def get_subscription_status(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current subscription status for the user."""
    user_id = user.get("sub") or user.get("user_id")
    user_email = user.get("email")
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
            "export": True,
        }
    }
