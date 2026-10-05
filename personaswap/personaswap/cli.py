"""Command line entry point."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

from . import config as config_mod
from . import ingest, prompts, rights
from .config import ConfigError
from .kie import Kie, KieError
from .pipeline import Runner
from .store import DONE, FAILED, Store, fingerprint

TEMPLATE = Path(__file__).resolve().parent.parent / "personaswap.example.toml"


def _load(args) -> tuple[config_mod.Config, Store]:
    cfg = config_mod.load(args.config)
    return cfg, Store(cfg.state_db)


# ----------------------------------------------------------------- commands --
def cmd_init(args) -> int:
    target = Path(args.directory).resolve()
    dest = target / config_mod.CONFIG_NAME
    if dest.exists() and not args.force:
        print(f"{dest} already exists (use --force to overwrite)")
        return 1
    target.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(TEMPLATE, dest)
    for sub in ("media/source", "media/output", "personas"):
        (target / sub).mkdir(parents=True, exist_ok=True)
    print(f"wrote {dest}")
    print("next: set [swap].model, add a persona, record a release, then `personaswap ingest`")
    return 0


def cmd_probe(args) -> int:
    cfg = config_mod.load(args.config)
    kie = Kie()
    print("credit:", json.dumps(kie.credit()))
    print("model: ", cfg.swap.model or "(unset — set [swap].model)")
    print("fields:", json.dumps(cfg.swap.fields))
    print("personas:", ", ".join(sorted(cfg.personas)) or "(none)")
    print("releases:", ", ".join(sorted(cfg.releases)) or "(none)")
    for name, persona in sorted(cfg.personas.items()):
        face = Path(persona.face)
        face = face if face.is_absolute() else cfg.root / face
        print(f"  persona {name}: face {'OK' if face.exists() else 'MISSING'} ({face})")
    return 0


def cmd_ingest(args) -> int:
    cfg, store = _load(args)
    try:
        rights.check(cfg, args.release)  # fail before downloading anything
    except (ConfigError, rights.RightsError) as err:
        print(f"rights: {err}", file=sys.stderr)
        return 2

    if args.source == "local":
        folder = args.path or cfg.source_dir
        added, known = ingest.add_local(store, folder, args.release)
    else:
        token = args.token or os.environ.get("IG_ACCESS_TOKEN", "")
        if not token:
            print("graph ingest needs --token or IG_ACCESS_TOKEN", file=sys.stderr)
            return 2
        added, known = ingest.add_graph(
            store, token, cfg.source_dir, args.release,
            user=args.user, limit=args.limit)
    print(f"registered {added} new clip(s), {known} already known")
    return 0


def cmd_run(args) -> int:
    cfg, store = _load(args)
    if not cfg.swap.model:
        print("set [swap].model in personaswap.toml first", file=sys.stderr)
        return 2
    try:
        persona = cfg.persona(args.persona)
    except ConfigError as err:
        print(err, file=sys.stderr)
        return 2

    prompt = prompts.build(
        cfg, persona, args.changes or "",
        outfit=args.outfit or "", background=args.background or "",
        body=args.body or "")

    clips = store.clips()
    if args.limit:
        clips = clips[: args.limit]

    runner = Runner(cfg, store, verbose=False)
    try:
        fresh, skipped = runner.queue(persona, prompt, clips=clips)
    except (rights.RightsError, ConfigError, RuntimeError) as err:
        print(f"refusing to queue: {err}", file=sys.stderr)
        return 2

    # Only this persona and prompt; unrelated jobs are not this run's business.
    scope = {fingerprint(c["sha"], persona.name, prompt, cfg.swap.model) for c in clips}
    pending = [row["fingerprint"] for row in store.runnable(cfg.max_retries)
               if row["fingerprint"] in scope]
    print(f"prompt: {prompt}")
    print(f"queued {len(fresh)} new, {skipped} already queued, {len(pending)} to run")

    if args.dry_run:
        print("(dry run — nothing submitted)")
        return 0
    if not pending:
        print("nothing to do")
        return 0

    runner.verbose = True
    results = runner.run(pending)
    ok = sum(1 for r in results if r.state == DONE)
    print(f"\n{ok}/{len(results)} succeeded -> {cfg.output_dir}")
    return 0 if ok == len(results) else 1


def cmd_status(args) -> int:
    cfg, store = _load(args)
    tally = store.tally()
    print("clips: ", len(store.clips()))
    print("jobs:  ", json.dumps(tally) if tally else "none")
    if args.verbose:
        for job in store.jobs():
            mark = {DONE: "ok", FAILED: "!!"}.get(job["state"], "..")
            clip = store.clip(job["clip_sha"])
            note = job["error"] or job["out_path"] or job["state"]
            print(f"  [{mark}] {Path(clip['path']).name} -> {str(note)[:90]}")
    return 0


def cmd_retry(args) -> int:
    cfg, store = _load(args)
    failed = store.jobs(FAILED)
    if not failed:
        print("no failed jobs")
        return 0
    for job in failed:  # clear the counter so the retry budget starts fresh
        store.update(job["fingerprint"], attempts=0, error=None)
    runner = Runner(cfg, store)
    results = runner.run([j["fingerprint"] for j in failed])
    ok = sum(1 for r in results if r.state == DONE)
    print(f"{ok}/{len(results)} recovered")
    return 0 if ok == len(results) else 1


def cmd_models(args) -> int:
    """Resolve a real model id. The market catalogue moves, so ask the API."""
    kie = Kie()
    for path in ("/api/v1/jobs/models", "/api/v1/market/models", "/api/v1/models"):
        try:
            print(f"-- {path}")
            print(json.dumps(kie._retrying("GET", f"https://api.kie.ai{path}"))[:4000])
            return 0
        except KieError as err:
            print(f"   {str(err)[:140]}")
    print("\nNo catalogue endpoint answered. Read the model id off the model's "
          "page in the kie.ai dashboard and put it in [swap].model.")
    return 1


# -------------------------------------------------------------------- parser --
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="personaswap",
        description="Batch persona replacement over footage you hold the rights to.")
    p.add_argument("--config", help=f"path to {config_mod.CONFIG_NAME}")
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("init", help="write a starter config")
    s.add_argument("directory", nargs="?", default=".")
    s.add_argument("--force", action="store_true")
    s.set_defaults(func=cmd_init)

    s = sub.add_parser("probe", help="check key, credit, model and personas")
    s.set_defaults(func=cmd_probe)

    s = sub.add_parser("models", help="try to list model ids from the API")
    s.set_defaults(func=cmd_models)

    s = sub.add_parser("ingest", help="register source clips")
    s.add_argument("source", choices=["local", "graph"])
    s.add_argument("--release", required=True, help="release id from [releases]")
    s.add_argument("--path", help="local folder (default: [paths].source)")
    s.add_argument("--token", help="Instagram Graph token (or IG_ACCESS_TOKEN)")
    s.add_argument("--user", default="me", help="IG user id the token manages")
    s.add_argument("--limit", type=int, default=50)
    s.set_defaults(func=cmd_ingest)

    s = sub.add_parser("run", help="swap every registered clip to one persona")
    s.add_argument("--persona", required=True)
    s.add_argument("--changes", help="free-text description of what to change")
    s.add_argument("--outfit")
    s.add_argument("--background")
    s.add_argument("--body")
    s.add_argument("--limit", type=int, help="only the first N clips")
    s.add_argument("--dry-run", action="store_true", help="print the prompt, submit nothing")
    s.set_defaults(func=cmd_run)

    s = sub.add_parser("status", help="ledger summary")
    s.add_argument("-v", "--verbose", action="store_true")
    s.set_defaults(func=cmd_status)

    s = sub.add_parser("retry", help="re-run failed jobs")
    s.set_defaults(func=cmd_retry)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except (ConfigError, rights.RightsError) as err:
        print(f"error: {err}", file=sys.stderr)
        return 2
    except KieError as err:
        print(f"kie.ai: {err}", file=sys.stderr)
        return 3
    except KeyboardInterrupt:
        print("\ninterrupted — rerun to resume", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
