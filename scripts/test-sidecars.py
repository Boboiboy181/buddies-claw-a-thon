#!/usr/bin/env python3
"""
Round-trip smoke test for TTS + STT sidecars.
  TTS: synthesizes a Vietnamese sentence → saves to /tmp/tts_test.mp3
  STT: transcribes that audio back → prints the result

Usage:
  python scripts/test-sidecars.py
  python scripts/test-sidecars.py --tts-only
  python scripts/test-sidecars.py --stt-only --audio /path/to/file.mp3
"""

import argparse
import sys
import requests

TTS_URL = "http://localhost:8002"
STT_URL = "http://localhost:8001"
TEST_TEXT = "Xin chào! Đây là bài kiểm tra giọng nói tiếng Việt."
OUT_FILE = "tts_test.mp3"

GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"
def ok(s): return print(f"  {GREEN}✓{RESET} {s}")
def err(s): return print(f"  {RED}✗{RESET} {s}")


def test_tts() -> bytes:
    print(f"\n── TTS sidecar ({TTS_URL}) ──────────────────────")

    r = requests.get(f"{TTS_URL}/health", timeout=5)
    r.raise_for_status()
    ok(f"Health: {r.json()}")

    r = requests.post(
        f"{TTS_URL}/v1/audio/speech",
        data={"input": TEST_TEXT, "voice": "vi-VN-HoaiMyNeural"},
        timeout=30,
    )
    r.raise_for_status()
    audio = r.content
    assert len(
        audio) > 1_000, f"Audio too small ({len(audio)} bytes) — likely an error response"

    with open(OUT_FILE, "wb") as f:
        f.write(audio)
    ok(f"Synthesized {len(audio):,} bytes → {OUT_FILE}")
    ok(f'Input text: "{TEST_TEXT}"')
    return audio


def test_stt(audio: bytes, filename: str = "test.mp3") -> str:
    print(f"\n── STT sidecar ({STT_URL}) ──────────────────────")

    r = requests.get(f"{STT_URL}/health", timeout=5)
    r.raise_for_status()
    ok(f"Health: {r.json()}")

    mime = "audio/mpeg" if filename.endswith(".mp3") else "audio/wav"
    r = requests.post(
        f"{STT_URL}/v1/audio/transcriptions",
        files={"file": (filename, audio, mime)},
        data={"language": "vi", "response_format": "verbose_json"},
        timeout=120,
    )
    r.raise_for_status()
    result = r.json()

    text = result.get("text", "")
    duration = result.get("duration")
    segments = result.get("segments", [])

    ok(f'Transcript: "{text}"')
    if duration:
        ok(f"Duration: {duration:.2f}s, segments: {len(segments)}")
    return text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tts-only", action="store_true")
    parser.add_argument("--stt-only", action="store_true")
    parser.add_argument("--audio", help="Audio file path for --stt-only mode")
    args = parser.parse_args()

    failed = False

    if not args.stt_only:
        try:
            audio = test_tts()
        except Exception as e:
            err(f"TTS failed: {e}")
            failed = True
            audio = None
    else:
        audio = None

    if not args.tts_only:
        try:
            if args.audio:
                with open(args.audio, "rb") as f:
                    audio = f.read()
                filename = args.audio.rsplit("/", 1)[-1]
            elif audio is None:
                err("No audio to transcribe (TTS failed or --stt-only without --audio)")
                failed = True
            else:
                filename = "test.mp3"

            if audio:
                transcript = test_stt(audio, filename)

                if not args.stt_only:
                    print(f"\n── Round-trip check ───────────────────────────")
                    keywords = ["xin chào", "kiểm tra", "tiếng việt"]
                    hits = [kw for kw in keywords if kw in transcript.lower()]
                    if hits:
                        ok(f"Matched keywords: {hits}")
                    else:
                        err(f"No expected keywords found — check the transcript above")
                        failed = True
        except Exception as e:
            err(f"STT failed: {e}")
            failed = True

    print()
    if failed:
        print(f"{RED}FAILED{RESET} — see errors above")
        sys.exit(1)
    else:
        print(f"{GREEN}ALL PASSED{RESET}")


if __name__ == "__main__":
    main()
