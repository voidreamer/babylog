"""
Voice command parsing via LLM (Groq) with function calling.

Accepts a transcript + baby context, returns a structured action
or a clarification question for conversational flow.
"""

from datetime import UTC, datetime, timedelta

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
GROQ_MODEL = "llama-3.3-70b-versatile"

# Timeout budget: a status question makes two sequential Groq calls; together
# they must land under the frontend's 15s request abort (frontend/src/api/client.ts).
GROQ_PARSE_TIMEOUT = 8.0
GROQ_STATUS_TIMEOUT = 6.0

# Shared client so back-to-back calls (parse → status answer) reuse the same
# TLS connection. Module-level survives warm Lambda invocations.
_groq_client: httpx.AsyncClient | None = None


def _get_groq_client() -> httpx.AsyncClient:
    global _groq_client
    if _groq_client is None or _groq_client.is_closed:
        _groq_client = httpx.AsyncClient()
    return _groq_client


async def _call_groq(
    api_key: str,
    messages: list[dict],
    *,
    tools: list[dict] | None = None,
    temperature: float = 0.1,
    max_tokens: int = 200,
    timeout: float = GROQ_PARSE_TIMEOUT,
) -> dict:
    """Single home for the Groq chat-completions call (URL/model/auth/timeout)."""
    payload: dict = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if tools is not None:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    resp = await _get_groq_client().post(
        GROQ_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()


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

# Shared param for point-in-time events so parents can log retroactively
# ("120ml 20 minutes ago"). The client back-dates the timestamp; the value
# never reaches the REST API. Deliberately NOT on start/endSleep — retroactive
# sleep interacts badly with the active-sleep auto-correct guard.
_MINUTES_AGO_PARAM = {
    "minutes_ago": {
        "type": "integer",
        "description": (
            "How many minutes ago this happened, if the user said so "
            "('20 minutes ago', 'an hour ago' = 60). Omit when it just happened. "
            "NEVER invent this."
        ),
    },
}

# Confirmations come from the model so they match the user's language; the
# hardcoded English _generate_confirmation remains as fallback. Popped from
# params before they reach the client.
_CONFIRMATION_PARAM = {
    "confirmation": {
        "type": "string",
        "description": (
            "REQUIRED: very short (under 12 words) warm confirmation of what "
            "was logged, in the same language as the user's message."
        ),
    },
}

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
                    **_MINUTES_AGO_PARAM,
                    **_CONFIRMATION_PARAM,
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
                    **_MINUTES_AGO_PARAM,
                    **_CONFIRMATION_PARAM,
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
                    **_CONFIRMATION_PARAM,
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
                    **_CONFIRMATION_PARAM,
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
                    **_MINUTES_AGO_PARAM,
                    **_CONFIRMATION_PARAM,
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
                    **_MINUTES_AGO_PARAM,
                    **_CONFIRMATION_PARAM,
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
                    **_MINUTES_AGO_PARAM,
                    **_CONFIRMATION_PARAM,
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
                    **_MINUTES_AGO_PARAM,
                    **_CONFIRMATION_PARAM,
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
                    **_MINUTES_AGO_PARAM,
                    **_CONFIRMATION_PARAM,
                },
                "required": ["food_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "createPotty",
            "description": "Log a potty-training event (potty seat/toilet, NOT a diaper change).",
            "parameters": {
                "type": "object",
                "properties": {
                    "result": {
                        "type": "string",
                        "enum": ["success", "accident", "attempt"],
                    },
                    "potty_type": {
                        "type": "string",
                        "enum": ["pee", "poo", "both"],
                    },
                    "notes": {"type": "string"},
                    **_MINUTES_AGO_PARAM,
                    **_CONFIRMATION_PARAM,
                },
                "required": ["result"],
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


# Actions whose minutes_ago the server resolves into a concrete `time` param.
# Sleep tools are deliberately absent: retroactive sleep would fight the
# active-sleep auto-correct guard.
POINT_IN_TIME_ACTIONS = {
    "createFeeding",
    "createDiaper",
    "createPumping",
    "createTummyTime",
    "createBath",
    "createSupplement",
    "createSolid",
    "createPotty",
}


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
- "potty", "used the potty", "potty accident" → createPotty (potty training, not a diaper)
- "formula" alone → createFeeding(type="formula") — do NOT add amount unless user said one
- If the user says it happened in the past ("20 minutes ago", "an hour ago"), set minutes_ago. NEVER invent it.
- ONLY include parameters the user explicitly mentioned. Do NOT invent amounts, durations, or notes.
- If the command is unclear or missing critical info, use askClarification()
- For status questions ("how's the day", "when did she eat"), use getStatus()
- Use the baby's name in any clarification or status response
- Keep responses SHORT (under 15 words for confirmations)
- Every action call MUST include `confirmation` — a very short warm confirmation in the user's language
- Respond in the same language as the user's message
- Respond warmly — this is for tired parents"""


async def _generate_status_answer(
    api_key: str,
    question: str,
    query: str | None,
    history: list[dict] | None,
    context: str,
) -> str:
    """Answer a status question in natural language (second, tool-less LLM pass).

    The old behavior returned the raw context dump ("Baby: Mila. Currently
    AWAKE. ...") — robotic and ignores what was actually asked. Falls back to
    that dump if the call fails, so status questions never hard-error.
    """
    fallback = context.replace("\n", ". ")
    messages: list[dict] = [
        {
            "role": "system",
            "content": (
                "You are HeyBub, a warm baby-tracking assistant talking to a "
                "tired parent. Answer their question in 1-3 short sentences "
                "using ONLY this data — never invent numbers or events. "
                "Respond in the same language as the question.\n\n"
                f"{context}"
            ),
        },
    ]
    # Prior turns give follow-ups ("and yesterday?") their referent.
    if history:
        messages.extend(history[-10:])
    user_content = question
    if query and query.strip() and query.strip().lower() != question.strip().lower():
        # The tool-calling pass already distilled the question with history in
        # view — pass its reading along.
        user_content = f"{question}\n(interpreted as: {query})"
    messages.append({"role": "user", "content": user_content})

    try:
        data = await _call_groq(
            api_key, messages, temperature=0.3, max_tokens=150, timeout=GROQ_STATUS_TIMEOUT
        )
        content = (data["choices"][0]["message"].get("content") or "").strip()
        return content or fallback
    except Exception:
        logger.warning("Status answer generation failed; falling back to raw context")
        return fallback


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
        data = await _call_groq(settings.groq_api_key, messages, tools=TOOLS)
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
                retry_data = await _call_groq(settings.groq_api_key, messages)
                content = retry_data["choices"][0]["message"].get("content", "")
                return VoiceParseResponse(
                    type="clarification",
                    question=content or "Could you say that again?",
                )
            except Exception:
                pass
        raise HTTPException(502, "Voice parsing service error")

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

        # The model writes the confirmation so it matches the user's language;
        # popped here so it never reaches the REST payload.
        llm_confirmation = str(fn_args.pop("confirmation", "") or "").strip()

        # Guard: auto-correct sleep direction if LLM got it wrong
        active_sleep = db.query(Sleep).filter(Sleep.baby_id == body.baby_id, Sleep.end_time.is_(None)).first()
        sleep_corrected = False
        if fn_name == "startSleep" and active_sleep:
            logger.warning("LLM said startSleep but baby is already sleeping — correcting to endSleep")
            fn_name = "endSleep"
            sleep_corrected = True
        elif fn_name == "endSleep" and not active_sleep:
            logger.warning("LLM said endSleep but baby is not sleeping — correcting to startSleep")
            fn_name = "startSleep"
            sleep_corrected = True
        if sleep_corrected:
            # The model's confirmation describes the direction it originally
            # picked — wrong after the correction.
            llm_confirmation = ""

        # Resolve minutes_ago into a concrete timestamp here — the server owns
        # "now". The value is popped for every action so a hallucinated
        # minutes_ago on the sleep tools (whose schemas don't declare it, but
        # nothing forces the LLM to comply) can never back-date a session.
        raw_minutes = fn_args.pop("minutes_ago", None)
        if fn_name in POINT_IN_TIME_ACTIONS and raw_minutes is not None:
            try:
                minutes = int(raw_minutes)
            except (TypeError, ValueError):
                minutes = 0
            minutes = max(0, min(minutes, 24 * 60))
            if minutes:
                resolved = datetime.now(UTC) - timedelta(minutes=minutes)
                fn_args["time"] = resolved.isoformat().replace("+00:00", "Z")

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
            status_text = await _generate_status_answer(
                settings.groq_api_key,
                body.transcript,
                fn_args.get("query"),
                body.conversation_history,
                context,
            )
            return VoiceParseResponse(
                type="status_response",
                action="getStatus",
                params=fn_args,
                status_text=status_text,
            )

        confirmation = llm_confirmation or _generate_confirmation(fn_name, fn_args, baby.name)

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

    if action == "createPotty":
        return f"Logged potty {params.get('result', 'attempt')} for {name}"

    return "Done"
