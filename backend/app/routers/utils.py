"""Shared utilities for routers."""
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from fastapi import HTTPException
from ..models import Baby


def verify_baby_access(db: Session, baby_id: int, user_id: str, user_email: str):
    """Verify the user can access this baby (owns it or it's shared with them)."""
    # Build query - if no email, only check user_id
    if user_email:
        baby = db.query(Baby).filter(
            Baby.id == baby_id,
            or_(
                Baby.user_id == user_id,
                Baby.shared_with_emails.any(user_email)
            )
        ).first()
    else:
        baby = db.query(Baby).filter(
            Baby.id == baby_id,
            Baby.user_id == user_id
        ).first()
    
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    return baby
