"""Shared utilities for routers."""

import json

from fastapi import HTTPException
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from ..models import Baby


def baby_access_filter(user_id: str, user_email: str, db: Session):
    """Reusable filter: user owns the baby OR the baby is shared with their email.

    PostgreSQL uses JSONB containment (GIN-indexable @>). SQLite — used by the
    local test suite — falls back to a json_each() scan with equivalent semantics.
    """
    if not user_email:
        return Baby.user_id == user_id

    if db.get_bind().dialect.name == "sqlite":
        shared = text(
            "EXISTS (SELECT 1 FROM json_each(babies.shared_with) "
            "WHERE json_extract(json_each.value, '$.email') = :shared_email)"
        ).bindparams(shared_email=user_email)
    else:
        # json.dumps guarantees valid JSON even if the email contains quotes/braces
        shared = Baby.shared_with.op("@>")(json.dumps([{"email": user_email}]))

    return or_(Baby.user_id == user_id, shared)


def verify_baby_access(db: Session, baby_id: int, user_id: str, user_email: str) -> tuple[Baby, str]:
    """Verify the user can access this baby (owns it or it's shared with them).

    Returns (baby, role) where role is 'owner', 'caregiver', or 'viewer'.
    """
    baby = db.query(Baby).filter(Baby.id == baby_id, baby_access_filter(user_id, user_email, db)).first()

    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    if baby.user_id == user_id:
        return baby, "owner"

    # Find role from shared_with JSONB
    for entry in baby.shared_with or []:
        if entry.get("email") == user_email:
            return baby, entry.get("role", "caregiver")

    return baby, "viewer"


def require_write_access(role: str):
    """Raise 403 if the role is 'viewer' (read-only access)."""
    if role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot modify data. Ask the owner to upgrade your role.")
