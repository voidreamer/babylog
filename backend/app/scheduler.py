"""
Notification scheduler - runs via EventBridge every 15 minutes.
Checks for upcoming events and sends push notifications to subscribed users.
"""

import json
from datetime import datetime, timezone, timedelta

from sqlalchemy import or_, func

from .database import SessionLocal
from .models import (
    Baby,
    DoctorVisit,
    Feeding,
    Medication,
    PushSubscription,
    Vaccination,
)
from .push import send_push_to_user
from .config import get_settings
from .logging_config import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)
settings = get_settings()

# In-memory set to avoid duplicate feeding alerts within a single invocation.
# Each Lambda invocation starts fresh, so this only deduplicates within one run.
_feeding_alerts_sent: set[int] = set()

# Medication reminder windows (UTC hours). Notifications are sent if current
# time is within 15 minutes of these hours.
MEDICATION_REMINDER_HOURS = [9, 13, 17, 21]

# Feeding gap threshold in hours before an alert is sent.
FEEDING_GAP_HOURS = 4


def handler(event, context):
    """EventBridge Lambda handler - runs every 15 minutes."""
    logger.info("Notification scheduler started", extra={"event": event})
    db = SessionLocal()
    try:
        results = {
            "appointments": check_upcoming_appointments(db),
            "medications": check_medication_reminders(db),
            "feeding_alerts": check_feeding_alerts(db),
        }
        logger.info("Scheduler completed", extra=results)
        return {"statusCode": 200, "body": json.dumps(results)}
    except Exception as e:
        logger.exception("Scheduler error")
        return {"statusCode": 500, "body": str(e)}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_subscribed_user_ids(db) -> set[str]:
    """Return the set of user_ids that have at least one push subscription."""
    rows = (
        db.query(PushSubscription.user_id)
        .distinct()
        .all()
    )
    return {r[0] for r in rows}


def _baby_owner_map(db, baby_ids: list[int]) -> dict[int, str]:
    """Map baby_id -> user_id for the given baby IDs."""
    if not baby_ids:
        return {}
    rows = (
        db.query(Baby.id, Baby.user_id)
        .filter(Baby.id.in_(baby_ids))
        .all()
    )
    return {r[0]: r[1] for r in rows}


def _baby_name_map(db, baby_ids: list[int]) -> dict[int, str]:
    """Map baby_id -> baby name for the given baby IDs."""
    if not baby_ids:
        return {}
    rows = (
        db.query(Baby.id, Baby.name)
        .filter(Baby.id.in_(baby_ids))
        .all()
    )
    return {r[0]: r[1] for r in rows}


# ---------------------------------------------------------------------------
# Appointment reminders (doctor visits & vaccinations)
# ---------------------------------------------------------------------------

def check_upcoming_appointments(db) -> dict:
    """
    Send reminders for doctor visits and vaccinations happening today or
    tomorrow.

    Timing windows (UTC):
    - "tomorrow" reminders: sent between 18:00-22:00 UTC
    - "today" reminders: sent between 07:00-09:00 UTC
    """
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    sent = 0
    errors = 0

    subscribed_users = _get_subscribed_user_ids(db)
    if not subscribed_users:
        return {"sent": 0, "errors": 0}

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    tomorrow_end = tomorrow_start + timedelta(days=1)

    # Determine which window we are in
    check_tomorrow = 18 <= current_hour < 22
    check_today = 7 <= current_hour < 9

    if not check_tomorrow and not check_today:
        return {"sent": 0, "errors": 0, "reason": "outside_notification_window"}

    # --- Doctor Visits ---
    if check_today:
        visits = (
            db.query(DoctorVisit)
            .filter(
                DoctorVisit.visit_date >= today_start,
                DoctorVisit.visit_date < tomorrow_start,
            )
            .all()
        )
        label = "today"
    else:
        visits = (
            db.query(DoctorVisit)
            .filter(
                DoctorVisit.visit_date >= tomorrow_start,
                DoctorVisit.visit_date < tomorrow_end,
            )
            .all()
        )
        label = "tomorrow"

    if visits:
        baby_ids = [v.baby_id for v in visits]
        owners = _baby_owner_map(db, baby_ids)
        names = _baby_name_map(db, baby_ids)

        for visit in visits:
            user_id = owners.get(visit.baby_id)
            baby_name = names.get(visit.baby_id, "Your baby")
            if user_id and user_id in subscribed_users:
                time_str = visit.visit_date.strftime("%I:%M %p")
                payload = {
                    "title": "Doctor Visit Reminder",
                    "body": f"Reminder: {baby_name} has a doctor visit {label} at {time_str}",
                    "tag": f"doctor-visit-{visit.id}",
                }
                try:
                    send_push_to_user(db, user_id, payload, settings)
                    sent += 1
                except Exception:
                    logger.exception("Failed to send doctor visit reminder for visit %s", visit.id)
                    errors += 1

    # --- Vaccinations with next_due_date ---
    if check_today:
        vaccinations = (
            db.query(Vaccination)
            .filter(
                Vaccination.next_due_date >= today_start,
                Vaccination.next_due_date < tomorrow_start,
            )
            .all()
        )
    else:
        vaccinations = (
            db.query(Vaccination)
            .filter(
                Vaccination.next_due_date >= tomorrow_start,
                Vaccination.next_due_date < tomorrow_end,
            )
            .all()
        )

    if vaccinations:
        baby_ids = [v.baby_id for v in vaccinations]
        owners = _baby_owner_map(db, baby_ids)
        names = _baby_name_map(db, baby_ids)

        for vacc in vaccinations:
            user_id = owners.get(vacc.baby_id)
            baby_name = names.get(vacc.baby_id, "Your baby")
            if user_id and user_id in subscribed_users:
                payload = {
                    "title": "Vaccination Reminder",
                    "body": (
                        f"Reminder: {baby_name} has a {vacc.vaccine_name} "
                        f"vaccination due {label}"
                    ),
                    "tag": f"vaccination-{vacc.id}",
                }
                try:
                    send_push_to_user(db, user_id, payload, settings)
                    sent += 1
                except Exception:
                    logger.exception("Failed to send vaccination reminder for vaccination %s", vacc.id)
                    errors += 1

    return {"sent": sent, "errors": errors}


# ---------------------------------------------------------------------------
# Medication reminders
# ---------------------------------------------------------------------------

def check_medication_reminders(db) -> dict:
    """
    Send medication reminders at fixed UTC windows (9, 13, 17, 21).
    Only fires if the current time is within 15 minutes of a window.
    """
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    current_minute = now.minute
    sent = 0
    errors = 0

    # Check if we are within 15 minutes of a medication window
    in_window = False
    for hour in MEDICATION_REMINDER_HOURS:
        if current_hour == hour and current_minute < 15:
            in_window = True
            break

    if not in_window:
        return {"sent": 0, "errors": 0, "reason": "outside_medication_window"}

    subscribed_users = _get_subscribed_user_ids(db)
    if not subscribed_users:
        return {"sent": 0, "errors": 0}

    today = now.date()

    medications = (
        db.query(Medication)
        .filter(
            Medication.is_active.is_(True),
            or_(
                Medication.end_date.is_(None),
                func.date(Medication.end_date) >= today,
            ),
        )
        .all()
    )

    if not medications:
        return {"sent": 0, "errors": 0}

    baby_ids = list({m.baby_id for m in medications})
    owners = _baby_owner_map(db, baby_ids)
    names = _baby_name_map(db, baby_ids)

    for med in medications:
        user_id = owners.get(med.baby_id)
        baby_name = names.get(med.baby_id, "Your baby")
        if user_id and user_id in subscribed_users:
            dosage_str = f" ({med.dosage})" if med.dosage else ""
            payload = {
                "title": "Medication Reminder",
                "body": (
                    f"Medication reminder: Give {med.medication_name}"
                    f"{dosage_str} to {baby_name}"
                ),
                "tag": f"medication-{med.id}-{current_hour}",
            }
            try:
                send_push_to_user(db, user_id, payload, settings)
                sent += 1
            except Exception:
                logger.exception("Failed to send medication reminder for medication %s", med.id)
                errors += 1

    return {"sent": sent, "errors": errors}


# ---------------------------------------------------------------------------
# Feeding gap alerts
# ---------------------------------------------------------------------------

def check_feeding_alerts(db) -> dict:
    """
    Alert when a baby has not been fed in over FEEDING_GAP_HOURS hours.

    Uses an in-memory set to avoid sending duplicate alerts for the same baby
    within a single Lambda invocation. Across invocations, the ``tag`` field
    in the push payload (which includes the hour) lets the browser de-duplicate
    notifications naturally.
    """
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(hours=FEEDING_GAP_HOURS)
    sent = 0
    errors = 0

    subscribed_users = _get_subscribed_user_ids(db)
    if not subscribed_users:
        return {"sent": 0, "errors": 0}

    # Get all babies belonging to subscribed users
    babies = (
        db.query(Baby)
        .filter(Baby.user_id.in_(subscribed_users))
        .all()
    )

    if not babies:
        return {"sent": 0, "errors": 0}

    for baby in babies:
        if baby.id in _feeding_alerts_sent:
            continue

        # Find the most recent feeding for this baby
        last_feeding = (
            db.query(Feeding)
            .filter(Feeding.baby_id == baby.id)
            .order_by(Feeding.time.desc())
            .first()
        )

        if last_feeding is None:
            # No feedings recorded - skip (don't alert on newly added babies)
            continue

        if last_feeding.time < threshold:
            gap = now - last_feeding.time
            total_minutes = int(gap.total_seconds() / 60)
            hours = total_minutes // 60
            minutes = total_minutes % 60

            payload = {
                "title": "Feeding Alert",
                "body": (
                    f"{baby.name} hasn't been fed in "
                    f"{hours}h {minutes}m"
                ),
                "tag": f"feeding-alert-{baby.id}-{now.hour}",
            }
            try:
                send_push_to_user(db, baby.user_id, payload, settings)
                sent += 1
                _feeding_alerts_sent.add(baby.id)
            except Exception:
                logger.exception("Failed to send feeding alert for baby %s", baby.id)
                errors += 1

    return {"sent": sent, "errors": errors}
