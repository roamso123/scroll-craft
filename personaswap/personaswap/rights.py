"""Release checks.

A standard model release usually covers capture and distribution but is silent
on synthetic alteration of the performer's likeness. The pipeline therefore
refuses to process a clip unless its release explicitly says it is covered, and
records which release authorised each output.
"""

from __future__ import annotations

from datetime import date

from .config import Config, Release


class RightsError(RuntimeError):
    pass


def _parse(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def check(cfg: Config, release_id: str, *, on: date | None = None) -> Release:
    """Return the release if it authorises synthetic alteration today."""
    rel = cfg.release(release_id)
    when = on or date.today()

    if not rel.covers_synthetic_alteration:
        raise RightsError(
            f"release {rel.id!r} is not marked as covering synthetic alteration. "
            "Set covers_synthetic_alteration = true only once the signed "
            "agreement actually grants it."
        )

    expires = _parse(rel.expires)
    if expires and expires < when:
        raise RightsError(f"release {rel.id!r} expired on {rel.expires}")

    return rel


def describe(rel: Release) -> dict:
    """The slice of the release worth recording next to an output file."""
    return {
        "release_id": rel.id,
        "talent": rel.talent,
        "signed": rel.signed,
        "expires": rel.expires,
        "covers_synthetic_alteration": rel.covers_synthetic_alteration,
    }
