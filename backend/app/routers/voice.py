from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, Literal

from ..database import get_db
from ..models import Feeding, Diaper, Sleep, Pumping, Potty, TummyTime, Bath, Supplement
from ..schemas import (
    FeedingTypeEnum, DiaperTypeEnum, PottyResultEnum, PottyTypeEnum,
    SupplementNameEnum, serialize_datetime,
)
from ..auth import get_current_user, get_user_email
from .utils import verify_baby_access, require_write_access

router = APIRouter(prefix="/voice", tags=["voice"])


# ============================================================================
# Schemas
# ============================================================================

VoiceEventType = Literal[
    "feeding", "diaper", "sleep", "pumping",
    "potty", "tummy_time", "bath", "supplement",
]

SleepAction = Literal["start", "end"]


class VoiceEventCreate(BaseModel):
    baby_id: int
    event_type: VoiceEventType
    transcript: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)

    # Feeding fields
    feed_type: Optional[FeedingTypeEnum] = None
    amount_ml: Optional[int] = None
    duration_minutes: Optional[int] = None

    # Diaper fields
    diaper_type: Optional[DiaperTypeEnum] = None

    # Sleep fields
    sleep_action: Optional[SleepAction] = None

    # Pumping fields (amount_ml + duration_minutes shared with feeding)

    # Potty fields
    potty_result: Optional[PottyResultEnum] = None
    potty_type: Optional[PottyTypeEnum] = None

    # Supplement fields
    supplement_name: Optional[SupplementNameEnum] = None
    dosage: Optional[str] = None


class VoiceEventResponse(BaseModel):
    success: bool
    event_type: str
    event_id: int
    summary: str


# ============================================================================
# Dispatcher
# ============================================================================

def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dispatch_feeding(db: Session, data: VoiceEventCreate) -> tuple[int, str]:
    feed_type = data.feed_type or "bottle"
    feeding = Feeding(
        baby_id=data.baby_id,
        time=_now(),
        type=feed_type,
        amount_ml=data.amount_ml,
        duration_minutes=data.duration_minutes,
        notes=data.notes,
    )
    db.add(feeding)
    db.commit()
    db.refresh(feeding)

    parts = [feed_type.capitalize(), "feeding"]
    if data.amount_ml:
        parts.append(f"{data.amount_ml}ml")
    if data.duration_minutes:
        parts.append(f"{data.duration_minutes}min")
    return feeding.id, " ".join(parts)


def _dispatch_diaper(db: Session, data: VoiceEventCreate) -> tuple[int, str]:
    diaper_type = data.diaper_type or "mixed"
    diaper = Diaper(
        baby_id=data.baby_id,
        time=_now(),
        type=diaper_type,
        notes=data.notes,
    )
    db.add(diaper)
    db.commit()
    db.refresh(diaper)

    label = {"pee": "Wet", "poo": "Dirty", "mixed": "Mixed"}.get(diaper_type, diaper_type)
    return diaper.id, f"{label} diaper"


def _dispatch_sleep(db: Session, data: VoiceEventCreate) -> tuple[int, str]:
    action = data.sleep_action or "start"

    if action == "end":
        # Find the active (open) sleep session
        active = db.query(Sleep).filter(
            Sleep.baby_id == data.baby_id,
            Sleep.end_time.is_(None),
        ).order_by(Sleep.start_time.desc()).first()

        if not active:
            raise HTTPException(
                status_code=400,
                detail="No active sleep session to end",
            )

        active.end_time = _now()
        if data.notes:
            active.notes = data.notes
        db.commit()
        db.refresh(active)
        return active.id, "Sleep ended"

    # Start new sleep
    sleep = Sleep(
        baby_id=data.baby_id,
        start_time=_now(),
        notes=data.notes,
    )
    db.add(sleep)
    db.commit()
    db.refresh(sleep)
    return sleep.id, "Sleep started"


def _dispatch_pumping(db: Session, data: VoiceEventCreate) -> tuple[int, str]:
    pumping = Pumping(
        baby_id=data.baby_id,
        time=_now(),
        amount_ml=data.amount_ml,
        duration_minutes=data.duration_minutes,
        notes=data.notes,
    )
    db.add(pumping)
    db.commit()
    db.refresh(pumping)

    parts = ["Pumping"]
    if data.amount_ml:
        parts.append(f"{data.amount_ml}ml")
    if data.duration_minutes:
        parts.append(f"{data.duration_minutes}min")
    return pumping.id, " ".join(parts)


def _dispatch_potty(db: Session, data: VoiceEventCreate) -> tuple[int, str]:
    result = data.potty_result or "attempt"
    potty = Potty(
        baby_id=data.baby_id,
        time=_now(),
        result=result,
        potty_type=data.potty_type,
        notes=data.notes,
    )
    db.add(potty)
    db.commit()
    db.refresh(potty)
    return potty.id, f"Potty {result}"


def _dispatch_tummy_time(db: Session, data: VoiceEventCreate) -> tuple[int, str]:
    tummy = TummyTime(
        baby_id=data.baby_id,
        start_time=_now(),
        duration_minutes=data.duration_minutes,
        notes=data.notes,
    )
    db.add(tummy)
    db.commit()
    db.refresh(tummy)

    summary = "Tummy time"
    if data.duration_minutes:
        summary += f" {data.duration_minutes}min"
    return tummy.id, summary


def _dispatch_bath(db: Session, data: VoiceEventCreate) -> tuple[int, str]:
    bath = Bath(
        baby_id=data.baby_id,
        time=_now(),
        notes=data.notes,
    )
    db.add(bath)
    db.commit()
    db.refresh(bath)
    return bath.id, "Bath"


def _dispatch_supplement(db: Session, data: VoiceEventCreate) -> tuple[int, str]:
    name = data.supplement_name or "other"
    supplement = Supplement(
        baby_id=data.baby_id,
        time=_now(),
        name=name,
        dosage=data.dosage,
        notes=data.notes,
    )
    db.add(supplement)
    db.commit()
    db.refresh(supplement)

    label = name.replace("_", " ").title()
    return supplement.id, f"Supplement: {label}"


_DISPATCHERS = {
    "feeding": _dispatch_feeding,
    "diaper": _dispatch_diaper,
    "sleep": _dispatch_sleep,
    "pumping": _dispatch_pumping,
    "potty": _dispatch_potty,
    "tummy_time": _dispatch_tummy_time,
    "bath": _dispatch_bath,
    "supplement": _dispatch_supplement,
}


# ============================================================================
# Endpoint
# ============================================================================

@router.post("/log", response_model=VoiceEventResponse, status_code=status.HTTP_201_CREATED)
def log_voice_event(
    data: VoiceEventCreate,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Dispatch a voice-parsed event to the correct model."""
    user_id = user.get("sub")
    baby, role = verify_baby_access(db, data.baby_id, user_id, user_email)
    require_write_access(role)

    dispatcher = _DISPATCHERS.get(data.event_type)
    if not dispatcher:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {data.event_type}")

    event_id, summary = dispatcher(db, data)

    return VoiceEventResponse(
        success=True,
        event_type=data.event_type,
        event_id=event_id,
        summary=summary,
    )
