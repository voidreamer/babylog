"""
Billing router — Stripe subscriptions for HeyBub Premium.
"""

import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..auth import get_current_user
from ..database import get_db
from ..models import User, utc_now
from .subscription import get_or_create_user

router = APIRouter(prefix="/billing", tags=["billing"])

# ---------------------------------------------------------------------------
# Stripe config (read once at import time — Lambda keeps these warm)
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_MONTHLY = os.environ.get("STRIPE_PRICE_MONTHLY", "")
STRIPE_PRICE_YEARLY = os.environ.get("STRIPE_PRICE_YEARLY", "")

stripe.api_key = STRIPE_SECRET_KEY


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionStatusResponse(BaseModel):
    is_premium: bool
    plan: str | None = None
    expires_at: str | None = None
    cancel_at_period_end: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_or_create_stripe_customer(email: str, user_id: str, db_user: User) -> str:
    """Return existing Stripe customer id or create one."""
    if db_user.stripe_customer_id:
        return db_user.stripe_customer_id

    # Search by email first
    customers = stripe.Customer.list(email=email, limit=1)
    if customers.data:
        cust_id = customers.data[0].id
    else:
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id},
        )
        cust_id = customer.id

    db_user.stripe_customer_id = cust_id
    return cust_id


def _plan_from_price(price_id: str) -> str | None:
    if price_id == STRIPE_PRICE_MONTHLY:
        return "monthly"
    if price_id == STRIPE_PRICE_YEARLY:
        return "yearly"
    return None


# ---------------------------------------------------------------------------
# POST /billing/create-checkout-session
# ---------------------------------------------------------------------------
@router.post("/create-checkout-session", response_model=CheckoutResponse)
async def create_checkout_session(
    body: CheckoutRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.price_id not in (STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY):
        raise HTTPException(400, "Invalid price_id")

    user_id = user.get("sub") or user.get("user_id")
    email = user.get("email", "")
    db_user = get_or_create_user(db, user_id, email)
    customer_id = _get_or_create_stripe_customer(email, user_id, db_user)
    db.commit()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": body.price_id, "quantity": 1}],
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        subscription_data={"trial_period_days": 7},
        metadata={"user_id": user_id},
    )
    return CheckoutResponse(checkout_url=session.url)


# ---------------------------------------------------------------------------
# POST /billing/webhook
# ---------------------------------------------------------------------------
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(400, "Invalid signature")
    else:
        # Dev fallback — no secret configured
        import json
        event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        _handle_checkout_completed(obj, db)
    elif etype == "customer.subscription.updated":
        _handle_subscription_updated(obj, db)
    elif etype == "customer.subscription.deleted":
        _handle_subscription_deleted(obj, db)

    db.commit()
    return Response(status_code=200)


def _find_user_by_stripe_customer(customer_id: str, db: Session) -> User | None:
    return db.query(User).filter(User.stripe_customer_id == customer_id).first()


def _handle_checkout_completed(session_obj: dict, db: Session):
    customer_id = session_obj.get("customer")
    subscription_id = session_obj.get("subscription")
    user_id = (session_obj.get("metadata") or {}).get("user_id")

    db_user = _find_user_by_stripe_customer(customer_id, db)
    if not db_user and user_id:
        db_user = db.query(User).filter(User.user_id == user_id).first()
    if not db_user:
        return

    db_user.is_premium = True
    db_user.stripe_customer_id = customer_id
    db_user.stripe_subscription_id = subscription_id
    db_user.premium_since = utc_now()

    # Fetch subscription to get price / period end
    if subscription_id:
        sub = stripe.Subscription.retrieve(subscription_id)
        if sub.get("items", {}).get("data"):
            price_id = sub["items"]["data"][0]["price"]["id"]
            db_user.premium_plan = _plan_from_price(price_id)
        from datetime import datetime, timezone
        db_user.premium_expires_at = datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc)


def _handle_subscription_updated(sub_obj: dict, db: Session):
    customer_id = sub_obj.get("customer")
    db_user = _find_user_by_stripe_customer(customer_id, db)
    if not db_user:
        return

    status = sub_obj.get("status")
    db_user.is_premium = status in ("active", "trialing")
    db_user.stripe_subscription_id = sub_obj.get("id")

    if sub_obj.get("items", {}).get("data"):
        price_id = sub_obj["items"]["data"][0]["price"]["id"]
        db_user.premium_plan = _plan_from_price(price_id)

    from datetime import datetime, timezone
    db_user.premium_expires_at = datetime.fromtimestamp(sub_obj["current_period_end"], tz=timezone.utc)


def _handle_subscription_deleted(sub_obj: dict, db: Session):
    customer_id = sub_obj.get("customer")
    db_user = _find_user_by_stripe_customer(customer_id, db)
    if not db_user:
        return

    db_user.is_premium = False
    db_user.premium_plan = None
    db_user.stripe_subscription_id = None


# ---------------------------------------------------------------------------
# GET /billing/subscription
# ---------------------------------------------------------------------------
@router.get("/subscription", response_model=SubscriptionStatusResponse)
async def get_subscription(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub") or user.get("user_id")
    email = user.get("email", "")
    db_user = get_or_create_user(db, user_id, email)

    cancel_at_period_end = False
    if db_user.stripe_subscription_id and db_user.is_premium:
        try:
            sub = stripe.Subscription.retrieve(db_user.stripe_subscription_id)
            cancel_at_period_end = sub.get("cancel_at_period_end", False)
        except Exception:
            pass

    return SubscriptionStatusResponse(
        is_premium=db_user.is_premium,
        plan=db_user.premium_plan,
        expires_at=db_user.premium_expires_at.isoformat() if db_user.premium_expires_at else None,
        cancel_at_period_end=cancel_at_period_end,
    )


# ---------------------------------------------------------------------------
# POST /billing/portal
# ---------------------------------------------------------------------------
@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub") or user.get("user_id")
    email = user.get("email", "")
    db_user = get_or_create_user(db, user_id, email)

    if not db_user.stripe_customer_id:
        raise HTTPException(400, "No billing account found. Subscribe first.")

    session = stripe.billing_portal.Session.create(
        customer=db_user.stripe_customer_id,
        return_url=f"https://app.heybub.app/",
    )
    return PortalResponse(portal_url=session.url)
