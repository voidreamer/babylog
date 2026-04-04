"""
Push notification utility module.

Provides helpers for sending Web Push notifications via pywebpush
with VAPID authentication.
"""

import json

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from .config import Settings
from .logging_config import get_logger
from .models import PushSubscription

logger = get_logger(__name__)


def send_push(subscription: PushSubscription, payload: dict, settings: Settings) -> tuple[bool, int | None]:
    """
    Send a push notification to a single subscription.

    Returns (success, http_status_code).
    success is True when the push was accepted, False otherwise.
    http_status_code is the response status (e.g. 201, 410) or None on unexpected errors.
    """
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh_key,
                    "auth": subscription.auth_key,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={
                "sub": f"mailto:{settings.vapid_contact_email}",
            },
        )
        return (True, 201)
    except WebPushException as e:
        status_code = e.response.status_code if e.response is not None else None
        logger.warning(
            "Push send failed for subscription %s: %s (status=%s)",
            subscription.id,
            str(e),
            status_code,
            extra={
                "subscription_id": subscription.id,
                "user_id": subscription.user_id,
                "status_code": status_code,
            },
        )
        return (False, status_code)
    except Exception as e:
        logger.exception(
            "Unexpected error sending push to subscription %s: %s",
            subscription.id,
            str(e),
            extra={"subscription_id": subscription.id},
        )
        return (False, None)


def send_push_to_user(
    db: Session,
    user_id: str,
    payload: dict,
    settings: Settings,
) -> tuple[int, int]:
    """
    Send a push notification to all subscriptions for a given user.

    Returns (success_count, failure_count).
    Cleans up expired subscriptions (410 Gone) automatically.
    """
    subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()

    if not subscriptions:
        logger.info(
            "No push subscriptions found for user %s",
            user_id,
            extra={"user_id": user_id},
        )
        return (0, 0)

    success_count = 0
    failure_count = 0
    expired_ids: list[int] = []

    for sub in subscriptions:
        ok, status_code = send_push(sub, payload, settings)
        if ok:
            success_count += 1
        else:
            failure_count += 1
            if status_code == 410:
                expired_ids.append(sub.id)

    # Clean up expired subscriptions
    if expired_ids:
        db.query(PushSubscription).filter(PushSubscription.id.in_(expired_ids)).delete(synchronize_session="fetch")
        db.commit()
        logger.info(
            "Deleted %d expired push subscriptions for user %s",
            len(expired_ids),
            user_id,
            extra={"user_id": user_id, "deleted_count": len(expired_ids)},
        )

    return (success_count, failure_count)
