"""Getting source clips into the ledger.

Two routes, both of which assume the footage is yours:

  local  — a directory of files you shot or licensed.
  graph  — the Instagram Graph API, which only ever returns media for an
           account you hold a token for. That is the sanctioned route and the
           reason there is no scraper here: pulling an arbitrary public page
           would be both a terms-of-service breach and a rights problem, and
           it is not what an agency working its own roster needs.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .store import Store, sha256_file

VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"}
GRAPH = "https://graph.instagram.com/v21.0"


@dataclass
class Probe:
    duration: float | None = None
    width: int | None = None
    height: int | None = None


def probe(path: Path) -> Probe:
    """Read duration and dimensions with ffprobe; absent ffprobe is not fatal."""
    if not shutil.which("ffprobe"):
        return Probe()
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height:format=duration",
        "-of", "json", str(path),
    ]
    try:
        out = subprocess.run(cmd, check=True, capture_output=True, timeout=120).stdout
        data = json.loads(out)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return Probe()
    stream = (data.get("streams") or [{}])[0]
    duration = (data.get("format") or {}).get("duration")
    return Probe(
        duration=float(duration) if duration else None,
        width=stream.get("width"),
        height=stream.get("height"),
    )


def add_local(store: Store, folder: str | Path, release_id: str) -> tuple[int, int]:
    """Register every video under `folder`. Returns (added, already_known)."""
    root = Path(folder).resolve()
    if not root.exists():
        raise FileNotFoundError(f"source directory not found: {root}")

    added = skipped = 0
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in VIDEO_SUFFIXES:
            continue
        info = probe(path)
        is_new = store.add_clip(
            sha256_file(path), str(path), release_id,
            source="local", origin=str(path),
            duration=info.duration, width=info.width, height=info.height,
        )
        added, skipped = (added + 1, skipped) if is_new else (added, skipped + 1)
    return added, skipped


def _graph_get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))


def fetch_graph(token: str, dest: str | Path, *, user: str = "me",
                limit: int = 50) -> list[Path]:
    """Download video media for the account the token belongs to.

    The token has to come from the Instagram Graph API for a Business or
    Creator account you manage. There is deliberately no other way in.
    """
    out_dir = Path(dest).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    query = urllib.parse.urlencode({
        "fields": "id,media_type,media_url,permalink,timestamp",
        "limit": str(min(limit, 100)),
        "access_token": token,
    })
    url = f"{GRAPH}/{user}/media?{query}"

    downloaded: list[Path] = []
    while url and len(downloaded) < limit:
        page = _graph_get(url)
        for item in page.get("data", []):
            if item.get("media_type") not in {"VIDEO", "REELS"}:
                continue
            media_url = item.get("media_url")
            if not media_url:
                continue  # expired CDN link; it will reappear on the next pull
            target = out_dir / f"ig_{item['id']}.mp4"
            if not target.exists():
                with urllib.request.urlopen(media_url, timeout=600) as res, target.open("wb") as fh:
                    while chunk := res.read(1 << 20):
                        fh.write(chunk)
            downloaded.append(target)
            if len(downloaded) >= limit:
                break
        url = (page.get("paging") or {}).get("next")
    return downloaded


def add_graph(store: Store, token: str, dest: str | Path, release_id: str,
              *, user: str = "me", limit: int = 50) -> tuple[int, int]:
    files = fetch_graph(token, dest, user=user, limit=limit)
    added = skipped = 0
    for path in files:
        info = probe(path)
        is_new = store.add_clip(
            sha256_file(path), str(path), release_id,
            source="instagram", origin=path.name,
            duration=info.duration, width=info.width, height=info.height,
        )
        added, skipped = (added + 1, skipped) if is_new else (added, skipped + 1)
    return added, skipped
