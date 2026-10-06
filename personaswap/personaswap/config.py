"""Configuration: one TOML file holding paths, model wiring, personas, releases."""

from __future__ import annotations

import tomllib
from dataclasses import dataclass, field
from pathlib import Path

CONFIG_NAME = "personaswap.toml"

# House default for the swap model. Overridable per project with
# [swap].model; this is what applies when the key is absent.
DEFAULT_MODEL = "gpt-6-astra"


class ConfigError(RuntimeError):
    pass


@dataclass
class Persona:
    """A synthetic target identity. `face` is the generated reference still."""
    name: str
    face: str
    look: str = ""
    synthetic: bool = True


@dataclass
class Release:
    """The paperwork behind a source clip."""
    id: str
    talent: str = ""
    signed: str = ""
    expires: str = ""
    covers_synthetic_alteration: bool = False
    notes: str = ""


@dataclass
class Swap:
    """How to drive the chosen kie.ai model.

    `fields` maps our three logical inputs onto whatever the model actually
    calls them, so a new model is a config change rather than a code change.
    """
    model: str = DEFAULT_MODEL
    fields: dict[str, str] = field(default_factory=lambda: {
        "video": "video_url", "face": "image_url", "prompt": "prompt"})
    extra: dict = field(default_factory=dict)


@dataclass
class Config:
    root: Path
    source_dir: Path
    output_dir: Path
    state_db: Path
    concurrency: int
    max_retries: int
    poll_timeout_s: int
    swap: Swap
    style_base: str
    tag_metadata: bool
    sidecar: bool
    personas: dict[str, Persona]
    releases: dict[str, Release]

    def persona(self, name: str) -> Persona:
        if name not in self.personas:
            known = ", ".join(sorted(self.personas)) or "none defined"
            raise ConfigError(f"unknown persona {name!r}. Known: {known}")
        return self.personas[name]

    def release(self, rid: str) -> Release:
        if rid not in self.releases:
            known = ", ".join(sorted(self.releases)) or "none defined"
            raise ConfigError(f"unknown release {rid!r}. Known: {known}")
        return self.releases[rid]


def find_config(start: Path | None = None) -> Path:
    here = (start or Path.cwd()).resolve()
    for folder in [here, *here.parents]:
        candidate = folder / CONFIG_NAME
        if candidate.exists():
            return candidate
    raise ConfigError(f"no {CONFIG_NAME} found. Run `personaswap init` first.")


def load(path: str | Path | None = None) -> Config:
    cfg_path = Path(path).resolve() if path else find_config()
    raw = tomllib.loads(cfg_path.read_text(encoding="utf-8"))
    root = cfg_path.parent

    paths = raw.get("paths", {})
    run = raw.get("run", {})
    swap_raw = raw.get("swap", {})
    style = raw.get("style", {})
    prov = raw.get("provenance", {})

    def under(key: str, default: str) -> Path:
        value = Path(paths.get(key, default))
        return value if value.is_absolute() else (root / value)

    personas = {}
    for name, body in (raw.get("personas") or {}).items():
        if "face" not in body:
            raise ConfigError(f"persona {name!r} needs a `face` reference image")
        personas[name] = Persona(
            name=name,
            face=body["face"],
            look=body.get("look", ""),
            synthetic=bool(body.get("synthetic", True)),
        )

    releases = {}
    for rid, body in (raw.get("releases") or {}).items():
        releases[rid] = Release(
            id=rid,
            talent=body.get("talent", ""),
            signed=body.get("signed", ""),
            expires=body.get("expires", ""),
            covers_synthetic_alteration=bool(body.get("covers_synthetic_alteration", False)),
            notes=body.get("notes", ""),
        )

    default_fields = {"video": "video_url", "face": "image_url", "prompt": "prompt"}
    return Config(
        root=root,
        source_dir=under("source", "media/source"),
        output_dir=under("output", "media/output"),
        state_db=under("state", ".personaswap/state.db"),
        concurrency=int(run.get("concurrency", 2)),
        max_retries=int(run.get("max_retries", 3)),
        poll_timeout_s=int(run.get("poll_timeout_s", 1800)),
        swap=Swap(
            model=swap_raw.get("model") or DEFAULT_MODEL,
            fields={**default_fields, **(swap_raw.get("fields") or {})},
            extra=dict(swap_raw.get("extra") or {}),
        ),
        style_base=style.get("base", ""),
        tag_metadata=bool(prov.get("tag_metadata", True)),
        sidecar=bool(prov.get("sidecar", True)),
        personas=personas,
        releases=releases,
    )
