"""Shared utilities for routers."""
from typing import Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from fastapi import HTTPException
from ..models import Baby


def baby_access_filter(user_id: str, user_email: str):
    """Reusable SQLAlchemy OR filter for JSONB containment.

    Returns an OR clause: user owns the baby OR baby is shared with their email.
    """
    if user_email:
        return or_(
            Baby.user_id == user_id,
            Baby.shared_with.op("@>")(f'[{{"email":"{user_email}"}}]')
        )
    return Baby.user_id == user_id


def verify_baby_access(db: Session, baby_id: int, user_id: str, user_email: str) -> Tuple[Baby, str]:
    """Verify the user can access this baby (owns it or it's shared with them).

    Returns (baby, role) where role is 'owner', 'caregiver', or 'viewer'.
    """
    baby = db.query(Baby).filter(
        Baby.id == baby_id,
        baby_access_filter(user_id, user_email)
    ).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    if baby.user_id == user_id:
        return baby, "owner"

    # Find role from shared_with JSONB
    for entry in (baby.shared_with or []):
        if entry.get("email") == user_email:
            return baby, entry.get("role", "caregiver")

    return baby, "viewer"


def require_write_access(role: str):
    """Raise 403 if the role is 'viewer' (read-only access)."""
    if role == "viewer":
        raise HTTPException(
            status_code=403,
            detail="Viewers cannot modify data. Ask the owner to upgrade your role."
        )
