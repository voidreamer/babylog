"""
Voice command parsing via LLM (Groq) with function calling.

Accepts a transcript + baby context, returns a structured action
or a clarification question for conversational flow.
"""

from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..config import get_settings
from ..database import get_db
from ..logging_config import get_logger
from ..models import Baby, Diaper, Feeding, Sleep
from ..rate_limit import RATE_WRITE, limiter
from .utils import verify_baby_access

logger = get_logger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"


# -- Request / Response schemas --


class VoiceParseRequest(BaseModel):
    transcript: str
    baby_id: int
    conversation_history: list[dict] | None = None


class VoiceParseResponse(BaseModel):
    type: str  # "action" | "clarification" | "status_response" | "error"
    action: str | None = None
    params: dict | None = None
    confirmation_text: str | None = None
    question: str | None = None
    status_text: str | None = None


# -- Tool definitions for the LLM --

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "createFeeding",
            "description": "Log a feeding. Types: breast, bottle, formula, solid. 'formula' means formula milk specifically. If user just says 'formula', use type='formula' with no amount unless specified.",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["breast", "bottle", "formula", "solid"],
                    },
                    "amount_ml": {
                        "type": "integer",
                        "description": "Amount in ml. Convert oz to ml (1oz=30ml). Only include if user specified an amount.",
                    },
                    "duration_minutes": {
                        "type": "integer",
                        "description": "Duration in minutes (for breast feeding only).",
                    },
                },
                "required": ["type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "createDiaper",
            "description": "Log a diaper change.",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["pee", "poo", "mixed"],
                    },
                    "poo_color": {
                        "type": "string",
                        "enum": [
                            "yellow",
                            "brown",
                            "green",
                            "black",
                            "red",
                            "white",
                            "orange",
                        ],
                    },
                },
                "required": ["type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "startSleep",
            "description": "Start tracking a sleep/nap session. Use when baby falls asleep.",
            "parameters": {
                "type": "object",
                "properties": {
                    "notes": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "endSleep",
            "description": "End the current sleep session. Use when baby wakes up.",
            "parameters": {
                "type": "object",
                "properties": {
                    "notes": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "createPumping",
            "description": "Log a breast pump session.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount_ml": {"type": "integer"},
                    "duration_minutes": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "createTummyTime",
            "description": "Log tummy time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "duration_minutes": {"type": "integer"},
                },
                "required": ["duration_minutes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "createBath",
            "description": "Log a bath.",
            "parameters": {
                "type": "object",
                "properties": {
                    "notes": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "createSupplement",
            "description": "Log a supplement. Map spoken names: 'vitamin d'→'vitamin_d', 'vitamin D'→'vitamin_d', 'DHA'→'dha', etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "enum": ["vitamin_d", "iron", "dha", "probiotic", "multivitamin", "other"],
                        "description": "Supplement type. Use vitamin_d for 'vitamin d/D3'.",
                    },
                    "dosage": {"type": "string"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "createSolid",
            "description": "Log solid food introduction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "food_name": {"type": "string"},
                    "reaction": {"type": "string"},
                },
                "required": ["food_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getStatus",
            "description": "Answer a question about baby's day (last feeding, sleep status, totals).",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "What the user wants to know.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "askClarification",
            "description": "Ask the user a follow-up question when the command is ambiguous.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The clarifying question to ask.",
                    },
                },
                "required": ["question"],
            },
        },
    },
]


def _build_baby_context(db: Session, baby: Baby) -> str:
    """Build a natural language context string about the baby's current state."""
    now = datetime.now(UTC).replace(tzinfo=None)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Active sleep
    active_sleep = (
        db.query(Sleep)
        .filter(Sleep.baby_id == baby.id, Sleep.end_time.is_(None))
        .order_by(Sleep.start_time.desc())
        .first()
    )

    # Last feeding
    last_feeding = db.query(Feeding).filter(Feeding.baby_id == baby.id).order_by(Feeding.time.desc()).first()

    # Last diaper
    last_diaper = db.query(Diaper).filter(Diaper.baby_id == baby.id).order_by(Diaper.time.desc()).first()

    # Today's counts
    today_feedings = db.query(Feeding).filter(Feeding.baby_id == baby.id, Feeding.time >= today_start).count()
    today_diapers = db.query(Diaper).filter(Diaper.baby_id == baby.id, Diaper.time >= today_start).count()
    today_sleeps = db.query(Sleep).filter(Sleep.baby_id == baby.id, Sleep.start_time >= today_start).count()

    lines = [f"Baby: {baby.name}"]

    if baby.birth_date:
        bd = baby.birth_date.date() if hasattr(baby.birth_date, "date") else baby.birth_date
        age_days = (now.date() - bd).days
        months = age_days // 30
        if months > 0:
            lines.append(f"Age: {months} months")

    if active_sleep:
        mins = int((now - active_sleep.start_time).total_seconds() / 60)
        lines.append(f"Currently SLEEPING (started {mins} minutes ago)")
    else:
        lines.append("Currently AWAKE")

    if last_feeding:
        mins = int((now - last_feeding.time).total_seconds() / 60)
        hrs = mins // 60
        desc = f"{last_feeding.type}"
        if last_feeding.amount_ml:
            oz = round(last_feeding.amount_ml / 30, 1)
            desc += f" {oz}oz"
        if hrs > 0:
            lines.append(f"Last feeding: {desc}, {hrs}h {mins % 60}m ago")
        else:
            lines.append(f"Last feeding: {desc}, {mins}m ago")

    if last_diaper:
        mins = int((now - last_diaper.time).total_seconds() / 60)
        hrs = mins // 60
        if hrs > 0:
            lines.append(f"Last diaper: {last_diaper.type}, {hrs}h {mins % 60}m ago")
        else:
            lines.append(f"Last diaper: {last_diaper.type}, {mins}m ago")

    lines.append(f"Today: {today_feedings} feedings, {today_diapers} diapers, {today_sleeps} naps")

    return "\n".join(lines)


SYSTEM_PROMPT = """You are HeyBub, a baby tracking voice assistant. Parse the parent's voice command into a function call.

CONTEXT (current baby state):
{context}

RULES:
- If user says "sleep", "nap", "asleep" and baby is currently AWAKE → call startSleep()
- If user says "sleep", "nap", "woke up", "awake" and baby is currently SLEEPING → call endSleep()
- Convert ounces to ml: 1oz = 30ml (e.g., "4 ounces" → amount_ml=120)
- "wet diaper" or "pee" → createDiaper(type="pee")
- "dirty diaper" or "poo" or "poop" → createDiaper(type="poo")
- "formula" alone → createFeeding(type="formula") — do NOT add amount unless user said one
- ONLY include parameters the user explicitly mentioned. Do NOT invent amounts, durations, or notes.
- If the command is unclear or missing critical info, use askClarification()
- For status questions ("how's the day", "when did she eat"), use getStatus()
- Use the baby's name in any clarification or status response
- Keep responses SHORT (under 15 words for confirmations)
- Respond warmly — this is for tired parents"""


@router.post("/parse", response_model=VoiceParseResponse)
@limiter.limit(RATE_WRITE)
async def parse_voice_command(
    request: Request,
    body: VoiceParseRequest,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Parse a voice transcript into a structured action using LLM."""
    settings = get_settings()
    if not settings.groq_api_key:
        raise HTTPException(503, "Voice parsing not configured (missing GROQ_API_KEY)")

    user_id = user.get("sub")
    baby, _role = verify_baby_access(db, body.baby_id, user_id, user_email)

    # Build context
    context = _build_baby_context(db, baby)
    system_prompt = SYSTEM_PROMPT.replace("{context}", context)

    # Build messages
    messages = [{"role": "system", "content": system_prompt}]
    if body.conversation_history:
        messages.extend(body.conversation_history)
    messages.append({"role": "user", "content": body.transcript})

    # Call Groq
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "tools": TOOLS,
                    "tool_choice": "auto",
                    "temperature": 0.1,
                    "max_tokens": 200,
                },
            )
            resp.raise_for_status()
    except httpx.TimeoutException:
        logger.warning("Groq API timeout for voice parse")
        raise HTTPException(504, "Voice parsing timed out")
    except httpx.HTTPStatusError as e:
        error_body = e.response.text
        logger.error("Groq API error (status=%s): %s", e.response.status_code, error_body)
        # If tool_use_failed, retry without tools — let LLM respond as text
        if "tool_use_failed" in error_body:
            logger.info("Retrying without tools due to tool_use_failed")
            try:
                async with httpx.AsyncClient(timeout=10) as client2:
                    resp = await client2.post(
                        GROQ_API_URL,
                        headers={
                            "Authorization": f"Bearer {settings.groq_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": GROQ_MODEL,
                            "messages": messages,
                            "temperature": 0.1,
                            "max_tokens": 200,
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"].get("content", "")
                    return VoiceParseResponse(
                        type="clarification",
                        question=content or "Could you say that again?",
                    )
            except Exception:
                pass
        raise HTTPException(502, "Voice parsing service error")

    data = resp.json()
    choice = data["choices"][0]
    message = choice["message"]

    # Handle tool call
    if message.get("tool_calls"):
        tool_call = message["tool_calls"][0]
        fn_name = tool_call["function"]["name"]
        import json

        try:
            fn_args = json.loads(tool_call["function"]["arguments"])
        except json.JSONDecodeError:
            return VoiceParseResponse(
                type="clarification",
                question="Sorry, could you say that again?",
            )

        logger.info(
            "Voice parsed: %s(%s) from '%s'",
            fn_name,
            fn_args,
            body.transcript,
            extra={
                "baby_id": body.baby_id,
                "action": fn_name,
                "params": fn_args,
            },
        )

        if fn_name == "askClarification":
            return VoiceParseResponse(
                type="clarification",
                question=fn_args.get("question", "Could you say that again?"),
            )

        if fn_name == "getStatus":
            # Build a status response from current context
            return VoiceParseResponse(
                type="status_response",
                action="getStatus",
                params=fn_args,
                status_text=context.replace("\n", ". "),
            )

        # Generate confirmation text
        confirmation = _generate_confirmation(fn_name, fn_args, baby.name)

        return VoiceParseResponse(
            type="action",
            action=fn_name,
            params=fn_args,
            confirmation_text=confirmation,
        )

    # Fallback: LLM responded with text instead of a tool call
    content = message.get("content", "")
    if content:
        return VoiceParseResponse(
            type="clarification",
            question=content,
        )

    return VoiceParseResponse(
        type="error",
        confirmation_text="Sorry, I didn't understand that.",
    )


def _generate_confirmation(action: str, params: dict, baby_name: str) -> str:
    """Generate a short spoken confirmation for an action."""
    name = baby_name

    if action == "createFeeding":
        ftype = params.get("type", "feeding")
        amt = params.get("amount_ml")
        dur = params.get("duration_minutes")
        if amt:
            oz = round(amt / 30, 1)
            return f"Logged {oz} ounce {ftype} feeding for {name}"
        if dur:
            return f"Logged {dur} minute {ftype} feeding for {name}"
        return f"Logged {ftype} feeding for {name}"

    if action == "createDiaper":
        dtype = params.get("type", "diaper")
        return f"Logged {dtype} diaper for {name}"

    if action == "startSleep":
        return f"Sleep started for {name}"

    if action == "endSleep":
        return f"Nap ended for {name}"

    if action == "createPumping":
        amt = params.get("amount_ml")
        if amt:
            return f"Logged {round(amt / 30, 1)} ounce pumping session"
        return "Logged pumping session"

    if action == "createTummyTime":
        dur = params.get("duration_minutes", "")
        return f"Logged {dur} minute tummy time for {name}"

    if action == "createBath":
        return f"Logged bath for {name}"

    if action == "createSupplement":
        return f"Logged {params.get('name', 'supplement')} for {name}"

    if action == "createSolid":
        return f"Logged {params.get('food_name', 'solid food')} for {name}"

    return "Done"
