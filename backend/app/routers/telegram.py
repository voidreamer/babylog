"""
Telegram bot webhook and account-linking endpoints.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_user_id
from ..bot.telegram import handle_update, bot_url
from ..config import get_settings
from ..database import get_db
from ..logging_config import get_logger
from ..models import User
from ..rate_limit import limiter, RATE_WRITE, RATE_ADMIN
from .admin import verify_admin_key
from ..schemas import TelegramLinkRequest

logger = get_logger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Handle incoming Telegram webhook updates.

    Telegram sends updates here after the webhook URL is registered.
    We return 200 immediately so Telegram does not retry.
    """
    body = await request.json()
    logger.info("Telegram webhook received", extra={"update_id": body.get("update_id")})
    handle_update(body)
    return {"ok": True}


@router.post("/set-webhook")
@limiter.limit(RATE_ADMIN)
def set_webhook(request: Request, _authorized: bool = Depends(verify_admin_key)):
    """Register the webhook URL with Telegram.  Admin only.

    Reads the current server's base URL from the incoming request so the
    correct public endpoint is set automatically.
    """
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=400, detail="TELEGRAM_BOT_TOKEN is not configured")

    # Build the public webhook URL from the request origin
    base = str(request.base_url).rstrip("/")
    webhook_url = f"{base}/telegram/webhook"

    try:
        resp = httpx.post(
            bot_url("setWebhook"),
            json={"url": webhook_url},
            timeout=10,
        )
        resp.raise_for_status()
        result = resp.json()
    except httpx.HTTPError as exc:
        logger.error("Failed to set Telegram webhook", extra={"error": str(exc)})
        raise HTTPException(status_code=502, detail="Failed to register webhook with Telegram")

    logger.info("Telegram webhook set", extra={"url": webhook_url, "result": result})
    return {"ok": True, "webhook_url": webhook_url, "telegram_response": result}


@router.post("/link")
@limiter.limit(RATE_WRITE)
def link_telegram(
    request: Request,
    chat_id_data: TelegramLinkRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Link a Telegram chat to the current user account.

    Called from the frontend settings page after the user obtains their
    Telegram chat ID (e.g. from the bot's /start response).
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.telegram_chat_id = str(chat_id_data.chat_id)
    db.commit()
    logger.info("Telegram linked via API", extra={"user_id": user_id, "chat_id": chat_id_data.chat_id})
    return {"linked": True}


@router.delete("/link")
@limiter.limit(RATE_WRITE)
def unlink_telegram(
    request: Request,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Unlink the Telegram chat from the current user account."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.telegram_chat_id = None
    db.commit()
    logger.info("Telegram unlinked via API", extra={"user_id": user_id})
    return {"linked": False}
