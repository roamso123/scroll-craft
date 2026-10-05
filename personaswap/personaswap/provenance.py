"""Provenance: say in the file itself that the output is synthetic.

Two cheap, durable markers. A sidecar JSON holding the full recipe (source
hash, persona, prompt, model, task id, release) is the agency's audit trail.
An ffmpeg metadata tag travels with the video even when the sidecar is lost.

This is not C2PA signing. If you need cryptographically verifiable provenance,
run the output through a C2PA signer as a later step; the sidecar carries the
assertions you would feed it.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import time
from pathlib import Path

SYNTHETIC_NOTE = "AI-generated face replacement. Synthetic media."


def write_sidecar(video: Path, record: dict) -> Path:
    out = video.with_suffix(video.suffix + ".json")
    out.write_text(json.dumps(record, indent=2, sort_keys=True), encoding="utf-8")
    return out


def tag(video: Path, persona: str, model: str) -> bool:
    """Stamp synthetic-content metadata into the container. True if applied.

    ffmpeg cannot write metadata in place, so this remuxes to a temp file and
    swaps it in. Streams are copied, so it is lossless and fast.
    """
    if not shutil.which("ffmpeg"):
        return False
    tmp = video.with_name(video.stem + ".tagged" + video.suffix)
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(video),
        "-map", "0", "-c", "copy",
        "-metadata", f"comment={SYNTHETIC_NOTE} persona={persona} model={model}",
        "-metadata", "description=Contains AI-generated content (face replacement).",
        "-metadata", f"creation_time={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        str(tmp),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=600)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        tmp.unlink(missing_ok=True)
        return False
    tmp.replace(video)
    return True
