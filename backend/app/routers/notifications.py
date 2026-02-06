import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import PushSubscription
from ..schemas import PushSubscriptionCreate, PushSubscriptionResponse, PushNotificationSend
from ..auth import get_current_user
from ..config import get_settings

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
def subscribe(
    sub_data: PushSubscriptionCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a Web Push subscription for the current user."""
    user_id = user.get("sub")

    # Upsert: if endpoint already exists, update keys
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == sub_data.endpoint
    ).first()

    if existing:
        existing.user_id = user_id
        existing.p256dh_key = sub_data.p256dh_key
        existing.auth_key = sub_data.auth_key
        db.commit()
        db.refresh(existing)
        return existing

    subscription = PushSubscription(
        user_id=user_id,
        endpoint=sub_data.endpoint,
        p256dh_key=sub_data.p256dh_key,
        auth_key=sub_data.auth_key,
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.delete("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    endpoint: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a push subscription."""
    user_id = user.get("sub")
    sub = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == user_id,
    ).first()

    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    db.delete(sub)
    db.commit()
    return None


@router.post("/send", status_code=200)
def send_notification(
    payload: PushNotificationSend,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send push notifications (admin-only in production).

    Requires pywebpush to be installed. Returns count of notifications sent.
    """
    settings = get_settings()

    # Only allow in development or for admin users
    if settings.environment in ("prod", "staging"):
        # Simple admin check — extend with proper role system later
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="pywebpush not installed. Run: pip install pywebpush"
        )

    vapid_private_key = settings.vapid_private_key
    vapid_claims = {"sub": f"mailto:{settings.vapid_contact_email}"}

    if not vapid_private_key:
        raise HTTPException(status_code=500, detail="VAPID keys not configured")

    # Get target subscriptions
    query = db.query(PushSubscription)
    if payload.user_ids:
        query = query.filter(PushSubscription.user_id.in_(payload.user_ids))
    subscriptions = query.all()

    sent_count = 0
    failed_count = 0
    notification_data = json.dumps({
        "title": payload.title,
        "body": payload.body,
    })

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh_key,
                "auth": sub.auth_key,
            }
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=notification_data,
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims,
            )
            sent_count += 1
        except Exception:
            failed_count += 1
            # Optionally remove stale subscriptions (410 Gone)

    return {"sent": sent_count, "failed": failed_count}
