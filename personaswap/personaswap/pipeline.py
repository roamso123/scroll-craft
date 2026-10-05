"""Batch orchestration: queue, submit, poll, download, record.

Everything slow is network wait, so clips run on a small thread pool. Each
clip is independent: one failure never takes the batch down, and the ledger
means a rerun picks up only what is still owed.
"""

from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

from . import prompts, provenance, rights
from .config import Config, Persona
from .kie import Kie, KieError
from .store import DONE, FAILED, SUBMITTED, Store


@dataclass
class Outcome:
    fingerprint: str
    clip: str
    state: str
    out_path: str | None = None
    error: str | None = None


class Runner:
    def __init__(self, cfg: Config, store: Store, kie: Kie | None = None, *,
                 verbose: bool = True):
        self.cfg = cfg
        self.store = store
        self._kie = kie
        self.verbose = verbose
        self._face_urls: dict[str, str] = {}
        self._lock = threading.RLock()
        self._log_lock = threading.Lock()

    @property
    def kie(self) -> Kie:
        """Built on first use, so queueing and dry runs need no API key."""
        with self._lock:
            if self._kie is None:
                self._kie = Kie()
            return self._kie

    def log(self, message: str) -> None:
        if self.verbose:
            with self._log_lock:
                print(message, flush=True)

    # ---------------------------------------------------------------- queue --
    def queue(self, persona: Persona, prompt: str, *, clips=None) -> tuple[list[str], int]:
        """Create one job per clip. Returns (new fingerprints, skipped count).

        Every clip is rights-checked here, before anything is billed.
        """
        rows = clips if clips is not None else self.store.clips()
        if not rows:
            raise RuntimeError("no clips registered. Run `personaswap ingest` first.")

        fresh: list[str] = []
        skipped = 0
        for clip in rows:
            rights.check(self.cfg, clip["release_id"])  # raises RightsError
            fp, is_new = self.store.queue_job(
                clip["sha"], persona.name, prompt, self.cfg.swap.model)
            if is_new:
                fresh.append(fp)
            else:
                skipped += 1
        return fresh, skipped

    # ----------------------------------------------------------------- face --
    def face_url(self, persona: Persona) -> str:
        """Upload the persona reference once per run, not once per clip."""
        with self._lock:
            if persona.name in self._face_urls:
                return self._face_urls[persona.name]
        path = Path(persona.face)
        if not path.is_absolute():
            path = self.cfg.root / path
        url = self.kie.as_url(path, folder="personaswap/faces")
        with self._lock:
            self._face_urls[persona.name] = url
        return url

    # ------------------------------------------------------------- one clip --
    def run_one(self, fp: str) -> Outcome:
        job = self.store.job(fp)
        if job is None:
            return Outcome(fp, "?", FAILED, error="job vanished from ledger")

        clip = self.store.clip(job["clip_sha"])
        name = Path(clip["path"]).name
        persona = self.cfg.persona(job["persona"])
        self.store.bump_attempt(fp)

        try:
            rel = rights.check(self.cfg, clip["release_id"])

            # Resume a task that was already submitted rather than paying twice.
            task_id = job["task_id"] if job["state"] == SUBMITTED else None
            if task_id:
                self.log(f"  {name}: resuming task {task_id}")
            else:
                video_url = self.kie.as_url(clip["path"], folder="personaswap/source")
                body = prompts.payload(
                    self.cfg, video_url, self.face_url(persona), job["prompt"])
                task_id = self.kie.create_task(self.cfg.swap.model, body)
                self.store.update(fp, task_id=task_id, state=SUBMITTED, error=None)
                self.log(f"  {name}: submitted {task_id}")

            urls = self.kie.wait(task_id, timeout_s=self.cfg.poll_timeout_s)

            out_path = self.cfg.output_dir / persona.name / f"{Path(name).stem}__{persona.name}.mp4"
            self.kie.download(urls[0], out_path)

            if self.cfg.tag_metadata:
                provenance.tag(out_path, persona.name, self.cfg.swap.model)
            if self.cfg.sidecar:
                provenance.write_sidecar(out_path, {
                    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "synthetic": True,
                    "note": provenance.SYNTHETIC_NOTE,
                    "persona": {"name": persona.name, "synthetic_identity": persona.synthetic},
                    "model": self.cfg.swap.model,
                    "task_id": task_id,
                    "prompt": job["prompt"],
                    "source": {
                        "file": Path(clip["path"]).name,
                        "sha256": clip["sha"],
                        "origin": clip["origin"],
                    },
                    "rights": rights.describe(rel),
                })

            self.store.update(fp, state=DONE, out_path=str(out_path),
                              result_url=urls[0], error=None)
            self.log(f"  {name}: done -> {out_path}")
            return Outcome(fp, name, DONE, out_path=str(out_path))

        except (KieError, rights.RightsError, OSError) as err:
            message = str(err)[:800]
            self.store.update(fp, state=FAILED, error=message)
            self.log(f"  {name}: FAILED {message.splitlines()[0][:160]}")
            return Outcome(fp, name, FAILED, error=message)

    # ------------------------------------------------------------- the pool --
    def run(self, fingerprints: list[str]) -> list[Outcome]:
        if not fingerprints:
            return []
        workers = max(1, min(self.cfg.concurrency, len(fingerprints)))
        results: list[Outcome] = []
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(self.run_one, fp): fp for fp in fingerprints}
            for future in as_completed(futures):
                results.append(future.result())
        return results
