"""End-to-end smoke test with the kie.ai network layer stubbed.

Exercises the parts that are ours: config, rights gating, ingest, prompt
assembly, field mapping, the job ledger's idempotency, provenance writing.
Run: python3 tests/smoke.py
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from personaswap import config as config_mod          # noqa: E402
from personaswap import ingest, prompts, rights       # noqa: E402
from personaswap.kie import Kie                       # noqa: E402
from personaswap.pipeline import Runner               # noqa: E402
from personaswap.store import DONE, Store             # noqa: E402

PASS, FAIL = "  ok  ", " FAIL "
failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    print(f"[{PASS if condition else FAIL}] {label}{(' — ' + detail) if detail and not condition else ''}")
    if not condition:
        failures.append(label)


class FakeKie(Kie):
    """Records calls; fabricates a result video instead of hitting the API."""

    def __init__(self, sample: Path):
        self.sample = sample
        self.tasks: list[tuple[str, dict]] = []
        self.uploads: list[str] = []

    def upload(self, path, folder="personaswap"):
        self.uploads.append(str(path))
        return f"https://fake.cdn/{Path(path).name}"

    def create_task(self, model, payload, callback=None):
        self.tasks.append((model, payload))
        return f"task-{len(self.tasks)}"

    def wait(self, task_id, timeout_s=1800, on_poll=None):
        return [f"https://fake.cdn/{task_id}.mp4"]

    def download(self, url, dest):
        out = Path(dest).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(self.sample, out)
        return out


def make_media(root: Path) -> tuple[Path, Path]:
    """A real 1s video and a real png, so ffprobe/ffmpeg paths are exercised."""
    video = root / "media/source/clip01.mp4"
    face = root / "personas/aurora/face.png"
    video.parent.mkdir(parents=True, exist_ok=True)
    face.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "testsrc=size=320x240:rate=12:duration=1", str(video)],
        check=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "color=c=gray:size=64x64:duration=1", "-frames:v", "1", str(face)],
        check=True)
    return video, face


CONFIG = """
[paths]
source = "media/source"
output = "media/output"
state  = ".personaswap/state.db"

[run]
concurrency = 2
max_retries = 3

[swap]
model = "test/motion-swap"
[swap.fields]
video  = "input_video"
face   = "identity_image"
prompt = "instruction"
[swap.extra]
fidelity = 0.8

[style]
base = "natural colour grade"

[provenance]
tag_metadata = true
sidecar = true

[personas.aurora]
face = "personas/aurora/face.png"
look = "warm olive skin, dark wavy hair"
synthetic = true

[releases.GOOD]
talent = "Talent Name"
signed = "2026-01-04"
expires = "2099-01-01"
covers_synthetic_alteration = true

[releases.NOCLAUSE]
talent = "Other Talent"
covers_synthetic_alteration = false

[releases.EXPIRED]
talent = "Third Talent"
expires = "2020-01-01"
covers_synthetic_alteration = true
"""


def main() -> int:
    root = Path(tempfile.mkdtemp(prefix="personaswap-smoke-"))
    (root / "personaswap.toml").write_text(CONFIG)
    sample, _face = make_media(root)

    cfg = config_mod.load(root / "personaswap.toml")
    check("config loads", cfg.swap.model == "test/motion-swap")
    check("field mapping read", cfg.swap.fields["video"] == "input_video")
    check("persona parsed", cfg.persona("aurora").look.startswith("warm olive"))

    # -- rights gate ------------------------------------------------------
    check("release without clause is refused",
          not _ok(lambda: rights.check(cfg, "NOCLAUSE")))
    check("expired release is refused",
          not _ok(lambda: rights.check(cfg, "EXPIRED")))
    check("valid release passes", _ok(lambda: rights.check(cfg, "GOOD")))

    # -- ingest -----------------------------------------------------------
    store = Store(cfg.state_db)
    added, known = ingest.add_local(store, cfg.source_dir, "GOOD")
    check("ingest registers the clip", added == 1 and known == 0, f"{added}/{known}")
    again_added, again_known = ingest.add_local(store, cfg.source_dir, "GOOD")
    check("re-ingest is idempotent", again_added == 0 and again_known == 1)
    clip = store.clips()[0]
    check("ffprobe read duration", (clip["duration"] or 0) > 0.5, str(clip["duration"]))
    check("ffprobe read dimensions", clip["width"] == 320 and clip["height"] == 240)

    # -- prompt -----------------------------------------------------------
    prompt = prompts.build(cfg, cfg.persona("aurora"),
                           "golden hour", outfit="navy slip dress",
                           background="rooftop terrace", body="taller frame")
    for fragment in ("aurora", "navy slip dress", "rooftop terrace",
                     "taller frame", "golden hour", "natural colour grade"):
        check(f"prompt carries {fragment!r}", fragment in prompt)
    check("prompt locks motion", "Preserve the original motion" in prompt)

    body = prompts.payload(cfg, "https://v", "https://f", prompt)
    check("payload uses mapped names",
          set(body) == {"input_video", "identity_image", "instruction",
                        "fidelity", "negative_prompt"}, str(sorted(body)))
    check("payload keeps extra passthrough", body["fidelity"] == 0.8)

    # -- run --------------------------------------------------------------
    fake = FakeKie(sample)
    runner = Runner(cfg, store, fake, verbose=False)
    fresh, skipped = runner.queue(cfg.persona("aurora"), prompt)
    check("one job queued", len(fresh) == 1 and skipped == 0)
    _again, skipped2 = runner.queue(cfg.persona("aurora"), prompt)
    check("re-queue is deduplicated", skipped2 == 1)

    results = runner.run(fresh)
    check("job completed", len(results) == 1 and results[0].state == DONE,
          results[0].error or "")

    out = Path(results[0].out_path) if results[0].out_path else None
    check("output written", bool(out and out.exists()))
    check("output under persona folder", bool(out and out.parent.name == "aurora"))

    # -- provenance -------------------------------------------------------
    if out and out.exists():
        side = out.with_suffix(out.suffix + ".json")
        check("sidecar written", side.exists())
        if side.exists():
            rec = json.loads(side.read_text())
            check("sidecar marks synthetic", rec.get("synthetic") is True)
            check("sidecar records source hash", rec["source"]["sha256"] == clip["sha"])
            check("sidecar records release", rec["rights"]["release_id"] == "GOOD")
            check("sidecar records prompt", rec["prompt"] == prompt)
        meta = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format_tags",
             "-of", "json", str(out)], capture_output=True, text=True).stdout
        check("container tagged synthetic", "Synthetic media" in meta, meta[:200])

    # -- the call we actually made ----------------------------------------
    check("exactly one task created", len(fake.tasks) == 1)
    model, sent = fake.tasks[0]
    check("task used configured model", model == "test/motion-swap")
    check("task sent the video", sent["input_video"].endswith("clip01.mp4"))
    check("task sent the face", sent["identity_image"].endswith("face.png"))
    check("face uploaded once", sum(1 for u in fake.uploads if u.endswith("face.png")) == 1)

    # -- resume -----------------------------------------------------------
    check("ledger shows done", store.tally().get(DONE) == 1)
    runner2 = Runner(cfg, store, FakeKie(sample), verbose=False)
    pending = store.runnable(cfg.max_retries)
    check("nothing left to run", pending == [], f"{len(pending)} pending")

    store.close()
    shutil.rmtree(root, ignore_errors=True)

    print()
    if failures:
        print(f"{len(failures)} FAILED: " + "; ".join(failures))
        return 1
    print("all checks passed")
    return 0


def _ok(fn) -> bool:
    try:
        fn()
        return True
    except Exception:
        return False


if __name__ == "__main__":
    raise SystemExit(main())
