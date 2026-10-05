"""SQLite job ledger.

Two jobs are the same job when the same source clip, persona, prompt and model
line up, so a rerun resumes instead of re-billing. That fingerprint is the
primary key the whole pipeline leans on.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import time
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS clips (
    sha        TEXT PRIMARY KEY,
    path       TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'local',
    origin     TEXT,
    duration   REAL,
    width      INTEGER,
    height     INTEGER,
    release_id TEXT NOT NULL,
    added_at   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    fingerprint TEXT PRIMARY KEY,
    clip_sha    TEXT NOT NULL REFERENCES clips(sha),
    persona     TEXT NOT NULL,
    prompt      TEXT NOT NULL,
    model       TEXT NOT NULL,
    task_id     TEXT,
    state       TEXT NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    out_path    TEXT,
    result_url  TEXT,
    error       TEXT,
    created_at  REAL NOT NULL,
    updated_at  REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS jobs_state ON jobs(state);
"""

# Lifecycle: pending -> submitted -> done | failed
PENDING, SUBMITTED, DONE, FAILED = "pending", "submitted", "done", "failed"


def sha256_file(path: str | Path, chunk: int = 1 << 20) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as fh:
        while block := fh.read(chunk):
            digest.update(block)
    return digest.hexdigest()


def fingerprint(clip_sha: str, persona: str, prompt: str, model: str) -> str:
    raw = json.dumps([clip_sha, persona, prompt, model], sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


class Store:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path, check_same_thread=False, timeout=30)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript(SCHEMA)
        self.db.commit()

    def close(self) -> None:
        self.db.close()

    # --------------------------------------------------------------- clips --
    def add_clip(self, sha: str, path: str, release_id: str, *, source: str = "local",
                 origin: str | None = None, duration: float | None = None,
                 width: int | None = None, height: int | None = None) -> bool:
        """Returns True if this clip is new to the ledger."""
        cur = self.db.execute(
            "INSERT OR IGNORE INTO clips"
            " (sha, path, source, origin, duration, width, height, release_id, added_at)"
            " VALUES (?,?,?,?,?,?,?,?,?)",
            (sha, str(path), source, origin, duration, width, height, release_id, time.time()),
        )
        self.db.commit()
        return cur.rowcount > 0

    def clips(self) -> list[sqlite3.Row]:
        return list(self.db.execute("SELECT * FROM clips ORDER BY added_at"))

    def clip(self, sha: str) -> sqlite3.Row | None:
        return self.db.execute("SELECT * FROM clips WHERE sha=?", (sha,)).fetchone()

    # ---------------------------------------------------------------- jobs --
    def queue_job(self, clip_sha: str, persona: str, prompt: str, model: str) -> tuple[str, bool]:
        """Insert a job if that exact combination has not been run. (id, is_new)"""
        fp = fingerprint(clip_sha, persona, prompt, model)
        now = time.time()
        cur = self.db.execute(
            "INSERT OR IGNORE INTO jobs"
            " (fingerprint, clip_sha, persona, prompt, model, state, created_at, updated_at)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (fp, clip_sha, persona, prompt, model, PENDING, now, now),
        )
        self.db.commit()
        return fp, cur.rowcount > 0

    def update(self, fp: str, **fields) -> None:
        if not fields:
            return
        fields["updated_at"] = time.time()
        assigns = ", ".join(f"{k}=?" for k in fields)
        self.db.execute(f"UPDATE jobs SET {assigns} WHERE fingerprint=?",
                        (*fields.values(), fp))
        self.db.commit()

    def bump_attempt(self, fp: str) -> None:
        self.db.execute(
            "UPDATE jobs SET attempts=attempts+1, updated_at=? WHERE fingerprint=?",
            (time.time(), fp))
        self.db.commit()

    def job(self, fp: str) -> sqlite3.Row | None:
        return self.db.execute("SELECT * FROM jobs WHERE fingerprint=?", (fp,)).fetchone()

    def jobs(self, state: str | None = None) -> list[sqlite3.Row]:
        if state:
            return list(self.db.execute(
                "SELECT * FROM jobs WHERE state=? ORDER BY created_at", (state,)))
        return list(self.db.execute("SELECT * FROM jobs ORDER BY created_at"))

    def runnable(self, max_retries: int) -> list[sqlite3.Row]:
        """Jobs still owed work: never submitted, or failed inside the retry budget."""
        return list(self.db.execute(
            "SELECT * FROM jobs WHERE state=? OR (state=? AND attempts < ?)"
            " ORDER BY created_at",
            (PENDING, FAILED, max_retries)))

    def tally(self) -> dict[str, int]:
        rows = self.db.execute("SELECT state, COUNT(*) n FROM jobs GROUP BY state")
        return {r["state"]: r["n"] for r in rows}
