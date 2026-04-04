"""
Telegram bot integration for HeyBub baby tracker.

Handles incoming webhook updates, routes commands, and interacts with
the database to log events and return status summaries.
"""

import re
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import SessionLocal
from ..logging_config import get_logger
from ..models import Baby, Diaper, Feeding, Sleep, User

logger = get_logger(__name__)

TELEGRAM_API = "https://api.telegram.org"

# ---------------------------------------------------------------------------
# Telegram API helpers
# ---------------------------------------------------------------------------


def bot_url(method: str) -> str:
    token = get_settings().telegram_bot_token
    return f"{TELEGRAM_API}/bot{token}/{method}"


def send_message(chat_id: int, text: str, parse_mode: str = "HTML") -> dict:
    """Send a message to a Telegram chat."""
    try:
        resp = httpx.post(
            bot_url("sendMessage"),
            json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.error("Telegram sendMessage failed", extra={"chat_id": chat_id, "error": str(exc)})
        return {}


# ---------------------------------------------------------------------------
# Update dispatcher
# ---------------------------------------------------------------------------


def handle_update(update: dict) -> None:
    """Main entry point for processing a Telegram webhook update."""
    message = update.get("message")
    if not message:
        return

    text: str = (message.get("text") or "").strip()
    chat_id: int = message["chat"]["id"]

    if not text.startswith("/"):
        send_message(chat_id, "Send /help to see available commands.")
        return

    parts = text.split(maxsplit=1)
    command = parts[0].lower().split("@")[0]  # strip @BotName suffix
    args = parts[1] if len(parts) > 1 else ""

    handlers = {
        "/start": _cmd_start,
        "/link": _cmd_link,
        "/status": _cmd_status,
        "/feed": _cmd_feed,
        "/diaper": _cmd_diaper,
        "/sleep": _cmd_sleep,
        "/summary": _cmd_summary,
        "/help": _cmd_help,
    }

    handler = handlers.get(command)
    if handler is None:
        send_message(chat_id, "Unknown command. Send /help to see available commands.")
        return

    try:
        handler(chat_id, args)
    except Exception:
        logger.exception("Error handling command %s", command, extra={"chat_id": chat_id})
        send_message(chat_id, "Something went wrong. Please try again.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

NOT_LINKED = "Your Telegram account is not linked yet.\nUse /link &lt;email&gt; to connect your HeyBub account."


def _get_user_by_chat_id(db: Session, chat_id: int) -> User | None:
    return db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()


def _get_first_baby(db: Session, user: User) -> Baby | None:
    return db.query(Baby).filter(Baby.user_id == user.user_id).order_by(Baby.id).first()


def _today_range() -> tuple[datetime, datetime]:
    """Return (start, end) for today in UTC."""
    now = datetime.now(UTC)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end


def _fmt_time(dt: datetime | None) -> str:
    if dt is None:
        return "N/A"
    return dt.strftime("%-I:%M %p")


def _parse_amount(raw: str) -> tuple[int | None, int | None]:
    """Parse a quantity string like '4oz', '120ml', '15min'.

    Returns (amount_ml, duration_minutes).  Only one will be set.
    """
    raw = raw.strip().lower()
    if not raw:
        return None, None

    m = re.match(r"(\d+(?:\.\d+)?)\s*(oz|ml|min)", raw)
    if not m:
        return None, None

    value = float(m.group(1))
    unit = m.group(2)

    if unit == "oz":
        return round(value * 30), None
    elif unit == "ml":
        return round(value), None
    elif unit == "min":
        return None, round(value)
    return None, None


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------


def _cmd_start(chat_id: int, _args: str) -> None:
    send_message(
        chat_id,
        (
            "<b>Welcome to HeyBub!</b>\n\n"
            "Link your account with:\n"
            "<code>/link your@email.com</code>\n\n"
            "Then you can log events and check on your baby right here.\n"
            "Send /help to see all commands."
        ),
    )


def _cmd_link(chat_id: int, args: str) -> None:
    email = args.strip().lower()
    if not email or "@" not in email:
        send_message(chat_id, "Usage: /link &lt;email&gt;\nExample: <code>/link parent@example.com</code>")
        return

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            send_message(
                chat_id,
                f"No HeyBub account found for <b>{email}</b>.\nMake sure you use the same email as your app login.",
            )
            return

        user.telegram_chat_id = str(chat_id)
        db.commit()
        logger.info("Telegram account linked", extra={"user_id": user.user_id, "chat_id": chat_id})
        send_message(chat_id, "Account linked successfully! Send /status to see today's activity.")
    finally:
        db.close()


def _cmd_status(chat_id: int, _args: str) -> None:
    db: Session = SessionLocal()
    try:
        user = _get_user_by_chat_id(db, chat_id)
        if not user:
            send_message(chat_id, NOT_LINKED)
            return

        baby = _get_first_baby(db, user)
        if not baby:
            send_message(chat_id, "No babies found. Add a baby in the app first.")
            return

        today_start, today_end = _today_range()

        last_feeding = db.query(Feeding).filter(Feeding.baby_id == baby.id).order_by(Feeding.time.desc()).first()
        last_diaper = db.query(Diaper).filter(Diaper.baby_id == baby.id).order_by(Diaper.time.desc()).first()
        last_sleep = db.query(Sleep).filter(Sleep.baby_id == baby.id).order_by(Sleep.start_time.desc()).first()

        feeding_count = (
            db.query(Feeding)
            .filter(Feeding.baby_id == baby.id, Feeding.time >= today_start, Feeding.time < today_end)
            .count()
        )
        diaper_count = (
            db.query(Diaper)
            .filter(Diaper.baby_id == baby.id, Diaper.time >= today_start, Diaper.time < today_end)
            .count()
        )
        nap_count = (
            db.query(Sleep)
            .filter(Sleep.baby_id == baby.id, Sleep.start_time >= today_start, Sleep.start_time < today_end)
            .count()
        )

        active_sleep = db.query(Sleep).filter(Sleep.baby_id == baby.id, Sleep.end_time.is_(None)).first()

        lines = [f"<b>Status for {baby.name}</b>\n"]

        if last_feeding:
            lines.append(f"Last feeding: {_fmt_time(last_feeding.time)} ({last_feeding.type})")
        else:
            lines.append("Last feeding: none recorded")

        if last_diaper:
            lines.append(f"Last diaper: {_fmt_time(last_diaper.time)} ({last_diaper.type})")
        else:
            lines.append("Last diaper: none recorded")

        if active_sleep:
            lines.append(f"Currently sleeping since {_fmt_time(active_sleep.start_time)}")
        elif last_sleep:
            lines.append(f"Last sleep: {_fmt_time(last_sleep.start_time)}")
        else:
            lines.append("Last sleep: none recorded")

        lines.append(f"\nToday: {feeding_count} feedings, {diaper_count} diapers, {nap_count} naps")

        send_message(chat_id, "\n".join(lines))
    finally:
        db.close()


def _cmd_feed(chat_id: int, args: str) -> None:
    db: Session = SessionLocal()
    try:
        user = _get_user_by_chat_id(db, chat_id)
        if not user:
            send_message(chat_id, NOT_LINKED)
            return

        baby = _get_first_baby(db, user)
        if not baby:
            send_message(chat_id, "No babies found. Add a baby in the app first.")
            return

        parts = args.strip().split()
        if not parts:
            send_message(
                chat_id,
                (
                    "Usage: /feed &lt;type&gt; [amount]\n"
                    "Types: formula, breast, bottle, solid\n"
                    "Examples:\n"
                    "  <code>/feed formula 4oz</code>\n"
                    "  <code>/feed breast 15min</code>\n"
                    "  <code>/feed bottle 120ml</code>"
                ),
            )
            return

        valid_types = {"formula", "breast", "bottle", "solid"}
        feed_type = parts[0].lower()
        if feed_type not in valid_types:
            send_message(
                chat_id, f"Unknown feeding type '<b>{feed_type}</b>'. Use one of: formula, breast, bottle, solid"
            )
            return

        amount_ml, duration = None, None
        if len(parts) > 1:
            amount_ml, duration = _parse_amount(parts[1])

        now = datetime.now(UTC)
        feeding = Feeding(
            baby_id=baby.id,
            time=now,
            type=feed_type,
            amount_ml=amount_ml,
            duration_minutes=duration,
            notes="Logged via Telegram",
        )
        db.add(feeding)
        db.commit()

        detail_parts = [feed_type]
        if amount_ml:
            detail_parts.append(f"{amount_ml}ml")
        if duration:
            detail_parts.append(f"{duration}min")

        logger.info("Feeding logged via Telegram", extra={"baby_id": baby.id, "feeding_id": feeding.id})
        send_message(chat_id, f"Feeding logged for {baby.name}: {' '.join(detail_parts)} at {_fmt_time(now)}")
    finally:
        db.close()


def _cmd_diaper(chat_id: int, args: str) -> None:
    db: Session = SessionLocal()
    try:
        user = _get_user_by_chat_id(db, chat_id)
        if not user:
            send_message(chat_id, NOT_LINKED)
            return

        baby = _get_first_baby(db, user)
        if not baby:
            send_message(chat_id, "No babies found. Add a baby in the app first.")
            return

        diaper_type = args.strip().lower()
        valid_types = {"pee", "poo", "mixed"}
        if diaper_type not in valid_types:
            send_message(
                chat_id,
                "Usage: /diaper &lt;type&gt;\nTypes: pee, poo, mixed\nExample: <code>/diaper pee</code>",
            )
            return

        now = datetime.now(UTC)
        diaper = Diaper(
            baby_id=baby.id,
            time=now,
            type=diaper_type,
            notes="Logged via Telegram",
        )
        db.add(diaper)
        db.commit()

        logger.info("Diaper logged via Telegram", extra={"baby_id": baby.id, "diaper_id": diaper.id})
        send_message(chat_id, f"Diaper logged for {baby.name}: {diaper_type} at {_fmt_time(now)}")
    finally:
        db.close()


def _cmd_sleep(chat_id: int, args: str) -> None:
    db: Session = SessionLocal()
    try:
        user = _get_user_by_chat_id(db, chat_id)
        if not user:
            send_message(chat_id, NOT_LINKED)
            return

        baby = _get_first_baby(db, user)
        if not baby:
            send_message(chat_id, "No babies found. Add a baby in the app first.")
            return

        action = args.strip().lower()
        now = datetime.now(UTC)

        if action == "start":
            # Check for an already-active sleep
            active = db.query(Sleep).filter(Sleep.baby_id == baby.id, Sleep.end_time.is_(None)).first()
            if active:
                send_message(
                    chat_id,
                    f"{baby.name} is already sleeping (since {_fmt_time(active.start_time)}). Send /sleep end first.",
                )
                return

            sleep = Sleep(
                baby_id=baby.id,
                start_time=now,
                notes="Logged via Telegram",
            )
            db.add(sleep)
            db.commit()
            logger.info("Sleep started via Telegram", extra={"baby_id": baby.id, "sleep_id": sleep.id})
            send_message(chat_id, f"Sleep started for {baby.name} at {_fmt_time(now)}")

        elif action == "end":
            active = (
                db.query(Sleep)
                .filter(Sleep.baby_id == baby.id, Sleep.end_time.is_(None))
                .order_by(Sleep.start_time.desc())
                .first()
            )
            if not active:
                send_message(chat_id, f"No active sleep found for {baby.name}. Send /sleep start first.")
                return

            active.end_time = now
            db.commit()
            dur = int((now - active.start_time).total_seconds() / 60)
            logger.info(
                "Sleep ended via Telegram", extra={"baby_id": baby.id, "sleep_id": active.id, "duration_min": dur}
            )
            send_message(chat_id, f"Sleep ended for {baby.name}. Duration: {dur} minutes.")
        else:
            send_message(chat_id, "Usage: /sleep start or /sleep end")
    finally:
        db.close()


def _cmd_summary(chat_id: int, _args: str) -> None:
    db: Session = SessionLocal()
    try:
        user = _get_user_by_chat_id(db, chat_id)
        if not user:
            send_message(chat_id, NOT_LINKED)
            return

        baby = _get_first_baby(db, user)
        if not baby:
            send_message(chat_id, "No babies found. Add a baby in the app first.")
            return

        today_start, today_end = _today_range()

        # Feedings
        feedings = (
            db.query(Feeding)
            .filter(Feeding.baby_id == baby.id, Feeding.time >= today_start, Feeding.time < today_end)
            .order_by(Feeding.time.desc())
            .all()
        )
        last_feed = feedings[0] if feedings else None
        feed_detail = ""
        if last_feed:
            amt = f" {last_feed.amount_ml}ml" if last_feed.amount_ml else ""
            feed_detail = f" (last: {_fmt_time(last_feed.time)}, {last_feed.type}{amt})"

        # Diapers
        diapers = (
            db.query(Diaper)
            .filter(Diaper.baby_id == baby.id, Diaper.time >= today_start, Diaper.time < today_end)
            .all()
        )
        pee_count = sum(1 for d in diapers if d.type == "pee")
        poo_count = sum(1 for d in diapers if d.type == "poo")
        mixed_count = sum(1 for d in diapers if d.type == "mixed")
        diaper_breakdown = ", ".join(
            part
            for part in [
                f"{pee_count} pee" if pee_count else "",
                f"{poo_count} poo" if poo_count else "",
                f"{mixed_count} mixed" if mixed_count else "",
            ]
            if part
        )

        # Sleeps
        sleeps = (
            db.query(Sleep)
            .filter(Sleep.baby_id == baby.id, Sleep.start_time >= today_start, Sleep.start_time < today_end)
            .order_by(Sleep.start_time.desc())
            .all()
        )
        total_sleep_min = 0
        for s in sleeps:
            if s.end_time:
                total_sleep_min += int((s.end_time - s.start_time).total_seconds() / 60)
        hours, mins = divmod(total_sleep_min, 60)
        sleep_total_str = f"{hours}h {mins}m" if hours else f"{mins}m"

        last_nap = sleeps[0] if sleeps else None
        nap_detail = ""
        if last_nap and last_nap.end_time:
            nap_detail = f" (last nap: {_fmt_time(last_nap.start_time)}-{_fmt_time(last_nap.end_time)})"
        elif last_nap:
            nap_detail = f" (sleeping since {_fmt_time(last_nap.start_time)})"

        lines = [
            f"Today's Summary for <b>{baby.name}</b>\n",
            f"Feedings: {len(feedings)}{feed_detail}",
            f"Diapers: {len(diapers)}" + (f" ({diaper_breakdown})" if diaper_breakdown else ""),
            f"Sleep: {sleep_total_str} total{nap_detail}",
        ]

        send_message(chat_id, "\n".join(lines))
    finally:
        db.close()


def _cmd_help(chat_id: int, _args: str) -> None:
    send_message(
        chat_id,
        (
            "<b>HeyBub Bot Commands</b>\n\n"
            "/link &lt;email&gt; - Link your HeyBub account\n"
            "/status - Today's quick status\n"
            "/feed &lt;type&gt; [amount] - Log a feeding\n"
            "  Types: formula, breast, bottle, solid\n"
            "  Amount: 4oz, 120ml, 15min\n"
            "/diaper &lt;type&gt; - Log a diaper change\n"
            "  Types: pee, poo, mixed\n"
            "/sleep start - Start sleep tracking\n"
            "/sleep end - End sleep tracking\n"
            "/summary - Detailed daily summary\n"
            "/help - Show this message"
        ),
    )
