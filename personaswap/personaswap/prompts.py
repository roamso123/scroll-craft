"""Prompt assembly.

A run supplies a persona and a free-text description of what should change.
Everything else — identity consistency, motion fidelity, the negative prompt —
is boilerplate the pipeline adds so every clip in a batch is driven the same
way. Consistency across a batch is what makes the output feel like one persona
rather than a dozen near-misses.
"""

from __future__ import annotations

from .config import Config, Persona

# Kling motion-control regenerates the scene with your character driven by the
# reference clip, so the prompt opens by stating that relationship rather than
# describing a face replacement.
DEFAULT_LEAD = (
    "The character in the reference image performs the motion from the "
    "reference video."
)

# Holding the original performance steady is the whole point of a motion swap:
# the body, timing and camera are the asset, only the identity changes.
MOTION_LOCK = (
    "Preserve the original motion, body position, timing, framing and camera "
    "movement exactly. Do not alter the pacing or add cuts."
)

QUALITY_FLOOR = (
    "Keep the swapped face photoreal and consistently lit to match the scene, "
    "with natural skin texture and stable identity across every frame."
)

DEFAULT_NEGATIVE = (
    "identity drift, face morphing, warping, flicker, jitter, double exposure, "
    "blurry face, plastic skin, distorted hands, text, watermark, scene change"
)


def build(cfg: Config, persona: Persona, changes: str = "", *,
          outfit: str = "", background: str = "", body: str = "") -> str:
    """Compose the prompt sent with each clip.

    `changes` is the free-text field; `outfit`/`background`/`body` are the same
    thing with labels, for when a batch wants one axis pinned and the rest left
    alone. Both styles can be combined.
    """
    parts: list[str] = [(cfg.style_lead or DEFAULT_LEAD).strip().rstrip(".") + "."]

    if persona.look:
        parts.append(f"The character: {persona.look}.")

    if outfit:
        parts.append(f"Wardrobe: {outfit}.")
    if background:
        parts.append(f"Background and setting: {background}.")
    if body:
        parts.append(f"Body and proportions: {body}.")
    if changes:
        parts.append(changes.strip().rstrip(".") + ".")

    parts.append(MOTION_LOCK)
    parts.append(QUALITY_FLOOR)

    if cfg.style_base:
        parts.append(cfg.style_base.strip().rstrip(".") + ".")

    return " ".join(p.strip() for p in parts if p.strip())


def payload(cfg: Config, video_url: str, face_url: str, prompt: str) -> dict:
    """Map our three logical inputs onto the model's own field names.

    Inputs named in [swap].array_fields are wrapped in a single-element list,
    which is how Kling wants `input_urls` and `video_urls`.
    """
    names = cfg.swap.fields
    arrays = set(cfg.swap.array_fields)
    body: dict = {}
    for logical, value in (("video", video_url), ("face", face_url), ("prompt", prompt)):
        body[names[logical]] = [value] if logical in arrays else value

    # Anything else the model requires rides in [swap.extra], verbatim. Nothing
    # is injected automatically: an unrecognised field is a 400 on some models,
    # and DEFAULT_NEGATIVE is only used if the config asks for it.
    for key, value in cfg.swap.extra.items():
        body.setdefault(key, value)
    return body
