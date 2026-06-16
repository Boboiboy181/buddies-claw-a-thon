import os
import io
import tempfile
import logging
import time

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

MODEL_SIZE    = os.getenv("WHISPER_MODEL", "medium")
DEVICE        = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE  = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

log.info(f"Loading faster-whisper model={MODEL_SIZE} device={DEVICE} compute={COMPUTE_TYPE}")
_model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
log.info("Model ready")

app = FastAPI(title="faster-whisper STT sidecar")


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_SIZE, "device": DEVICE}


@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    model: str = Form("medium"),
    language: str = Form(None),
    response_format: str = Form("json"),
):
    audio = await file.read()
    ext = (file.filename or "audio.wav").rsplit(".", 1)[-1].lower()

    t0 = time.monotonic()
    log.info(f"STT call file={file.filename} bytes={len(audio)} lang={language}")

    suffix = f".{ext}"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio)
        tmp_path = tmp.name

    try:
        segments_gen, info = _model.transcribe(
            tmp_path,
            language=language or None,
            word_timestamps=(response_format == "verbose_json"),
        )
        segments = list(segments_gen)
    finally:
        os.unlink(tmp_path)

    text = " ".join(s.text.strip() for s in segments)
    ms = int((time.monotonic() - t0) * 1000)
    log.info(f"STT done  file={file.filename} bytes={len(audio)} ms={ms} words={len(text.split())}")

    if response_format == "verbose_json":
        return {
            "task": "transcribe",
            "language": info.language,
            "duration": info.duration,
            "text": text,
            "segments": [
                {
                    "id": s.id,
                    "start": round(s.start, 3),
                    "end": round(s.end, 3),
                    "text": s.text,
                    "avg_logprob": round(s.avg_logprob, 4),
                    "no_speech_prob": round(s.no_speech_prob, 4),
                }
                for s in segments
            ],
        }

    return {"text": text}
