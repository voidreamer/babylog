"""
Push notification endpoints.

Provides subscribe/unsubscribe management, test sends, listing
active subscriptions, and an admin endpoint for sending to arbitrary users.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import Settings, get_settings
from ..database import get_db
from ..logging_config import get_logger
from ..models import PushSubscription
from ..push import send_push_to_user
from ..rate_limit import RATE_ADMIN, RATE_READ, RATE_WRITE, limiter
from ..schemas import (
    PushSendRequest,
    PushSubscribeRequest,
    PushSubscriptionResponse,
    PushUnsubscribeRequest,
)
from .admin import verify_admin_key

router = APIRouter(prefix="/notifications", tags=["notifications"])
logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# POST /notifications/subscribe
# ---------------------------------------------------------------------------


@router.post("/subscribe", status_code=201)
@limiter.limit(RATE_WRITE)
async def subscribe(
    request: Request,
    body: PushSubscribeRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Register or update a push subscription for the current user.

    Returns 201 on new subscription, 200 on update.
    """
    user_id = user.get("sub")

    # Check if endpoint already exists for this user
    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == body.endpoint,
        )
        .first()
    )

    if existing:
        existing.p256dh_key = body.p256dh_key
        existing.auth_key = body.auth_key
        db.commit()
        db.refresh(existing)
        logger.info(
            "Updated push subscription %s for user %s",
            existing.id,
            user_id,
            extra={"subscription_id": existing.id, "user_id": user_id},
        )
        # Return 200 for update (override the default 201)
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=200,
            content={"id": existing.id, "status": "updated"},
        )

    subscription = PushSubscription(
        user_id=user_id,
        endpoint=body.endpoint,
        p256dh_key=body.p256dh_key,
        auth_key=body.auth_key,
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    logger.info(
        "Created push subscription %s for user %s",
        subscription.id,
        user_id,
        extra={"subscription_id": subscription.id, "user_id": user_id},
    )
    return {"id": subscription.id, "status": "created"}


# ---------------------------------------------------------------------------
# DELETE /notifications/unsubscribe
# ---------------------------------------------------------------------------


@router.delete("/unsubscribe", status_code=204)
@limiter.limit(RATE_WRITE)
async def unsubscribe(
    request: Request,
    body: PushUnsubscribeRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Remove a push subscription for the current user."""
    user_id = user.get("sub")

    deleted = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == body.endpoint,
        )
        .delete(synchronize_session="fetch")
    )
    db.commit()

    if not deleted:
        raise HTTPException(status_code=404, detail="Subscription not found")

    logger.info(
        "Deleted push subscription for user %s",
        user_id,
        extra={"user_id": user_id},
    )
    return None


# ---------------------------------------------------------------------------
# POST /notifications/test
# ---------------------------------------------------------------------------


@router.post("/test")
@limiter.limit(RATE_WRITE)
async def send_test_notification(
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """
    Send a test push notification to all of the current user's subscriptions.

    Returns the count of successful sends.
    """
    user_id = user.get("sub")

    payload = {
        "title": "HeyBub",
        "body": "Notifications are working!",
        "icon": "/icon-192.png",
    }

    success, failure = send_push_to_user(db, user_id, payload, settings)

    logger.info(
        "Test push sent for user %s: %d success, %d failure",
        user_id,
        success,
        failure,
        extra={"user_id": user_id, "success": success, "failure": failure},
    )
    return {"success_count": success, "failure_count": failure}


# ---------------------------------------------------------------------------
# GET /notifications/subscriptions
# ---------------------------------------------------------------------------


@router.get("/subscriptions", response_model=list[PushSubscriptionResponse])
@limiter.limit(RATE_READ)
async def list_subscriptions(
    request: Request,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Return the current user's active push subscriptions (with truncated endpoints)."""
    user_id = user.get("sub")

    subs = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user_id)
        .order_by(PushSubscription.created_at.desc())
        .all()
    )

    results = []
    for s in subs:
        # Show only the domain portion of the endpoint for privacy
        endpoint_preview = s.endpoint
        if len(endpoint_preview) > 60:
            endpoint_preview = endpoint_preview[:50] + "..."

        results.append(
            PushSubscriptionResponse(
                id=s.id,
                endpoint_preview=endpoint_preview,
                created_at=s.created_at,
            )
        )

    return results


# ---------------------------------------------------------------------------
# POST /notifications/send  (admin-only)
# ---------------------------------------------------------------------------


@router.post("/send")
@limiter.limit(RATE_ADMIN)
async def send_notification(
    request: Request,
    body: PushSendRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _admin: bool = Depends(verify_admin_key),
):
    """
    Send a push notification to a specific user.

    Requires X-Admin-Key header. Sends to all subscriptions for the target user.
    """
    payload: dict = {
        "title": body.title,
        "body": body.body,
    }
    if body.url is not None:
        payload["url"] = body.url
    if body.baby_id is not None:
        payload["baby_id"] = body.baby_id

    success, failure = send_push_to_user(db, body.user_id, payload, settings)

    logger.info(
        "Admin push to user %s: %d success, %d failure",
        body.user_id,
        success,
        failure,
        extra={
            "target_user_id": body.user_id,
            "success": success,
            "failure": failure,
        },
    )
    return {"success_count": success, "failure_count": failure}
