"""
Transcription server for HeyBub voice input.
Runs faster-whisper on Oracle Cloud free tier ARM VM (4 CPU, 24GB RAM).
Serves web/PWA users who can't use on-device whisper.cpp.
"""

import os
import tempfile
import logging

from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HeyBub Transcription Server")

# CORS — only the HeyBub API (Lambda proxy) should call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Locked down by shared secret, not CORS
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Auth: shared secret
SHARED_SECRET = os.environ.get("TRANSCRIPTION_SECRET", "dev-secret")

# Lazy-load model on first request
_model = None


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        model_size = os.environ.get("WHISPER_MODEL", "base")
        compute_type = os.environ.get("COMPUTE_TYPE", "int8")
        logger.info(f"Loading whisper model: {model_size} ({compute_type})")
        _model = WhisperModel(model_size, device="cpu", compute_type=compute_type)
        logger.info("Model loaded")
    return _model


class TranscribeResponse(BaseModel):
    transcript: str
    language: str


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio: UploadFile = File(...),
    x_transcription_secret: str = Header(alias="X-Transcription-Secret"),
):
    """Transcribe an audio file and return the text."""
    if x_transcription_secret != SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Invalid secret")

    # Write uploaded audio to temp file (faster-whisper needs file path)
    suffix = ".webm"
    if audio.content_type:
        if "wav" in audio.content_type:
            suffix = ".wav"
        elif "ogg" in audio.content_type:
            suffix = ".ogg"
        elif "mp4" in audio.content_type or "m4a" in audio.content_type:
            suffix = ".m4a"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        content = await audio.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=413, detail="Audio file too large (max 10MB)")
        tmp.write(content)
        tmp.flush()

        model = get_model()
        segments, info = model.transcribe(
            tmp.name,
            beam_size=5,
            vad_filter=True,  # Skip silence
        )

        transcript = " ".join(seg.text.strip() for seg in segments)

    return TranscribeResponse(
        transcript=transcript.strip(),
        language=info.language,
    )


@app.get("/health")
def health():
    return {"status": "healthy"}
