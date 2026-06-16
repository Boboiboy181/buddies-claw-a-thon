import asyncio
import io
import logging
import os
import time

import edge_tts
from fastapi import FastAPI, Form, HTTPException
from fastapi.responses import Response

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# vi-VN-HoaiMyNeural = female, vi-VN-NamMinhNeural = male
DEFAULT_VOICE = os.getenv("TTS_VOICE", "vi-VN-HoaiMyNeural")
MAX_RETRIES = 3

app = FastAPI(title="edge-tts sidecar")


@app.get("/health")
def health():
    return {"ok": True, "voice": DEFAULT_VOICE}


async def _synthesize_once(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    audio = buf.getvalue()
    if not audio:
        raise RuntimeError("No audio was received. Please verify that your parameters are correct.")
    return audio


@app.post("/v1/audio/speech")
async def synthesize(
    input: str = Form(...),
    voice: str = Form(None),
    model: str = Form("tts-1"),
    response_format: str = Form("mp3"),
):
    chosen_voice = voice or DEFAULT_VOICE
    t0 = time.monotonic()
    label = input[:60] + "…" if len(input) > 60 else input
    log.info(f"TTS call chars={len(input)} voice={chosen_voice} preview=\"{label}\"")

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            audio = await _synthesize_once(input, chosen_voice)
            ms = int((time.monotonic() - t0) * 1000)
            log.info(f"TTS done  chars={len(input)} bytes={len(audio)} ms={ms} attempt={attempt}")
            return Response(content=audio, media_type="audio/mpeg")
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                wait = attempt * 1.5
                log.warning(f"TTS attempt {attempt}/{MAX_RETRIES} failed: {e} — retrying in {wait:.1f}s")
                await asyncio.sleep(wait)
            else:
                log.error(f"TTS failed after {MAX_RETRIES} attempts: {e}")

    raise HTTPException(status_code=500, detail=str(last_error))
