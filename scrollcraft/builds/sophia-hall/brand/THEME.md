# Sophia Hall — brand theme

Fictional brand, built for this concept site.

## The mark

`mark.svg` — a monogram inside an **open ring**. The ring is the brand's whole
idea: a breath that never closes. It reappears at page scale as the breathing
ring in the method act and as the shape the close settles into, so the logo is
not decoration on top of the site, it is the site's smallest instance.

The S is one continuous stroke. The H's crossbar is a shallow curve, because
the brand has **no straight lines and no corners anywhere** — that rule is
absolute and it governs the site too.

- `mark.svg` — monogram, square, for avatars, favicons, stamps. Clear space on
  all sides = the ring's stroke width × 3.
- `logo-lockup.svg` — horizontal lockup with the wordmark and the strapline
  "TRAIN WITH BREATH". Minimum width 180px; below that use the mark alone.
- The wordmark in the SVG is live text in Outfit. Convert to outlines before
  sending to print.

**Do not:** recolour the ring to evergreen, close the ring's gap, put the mark
in a square or rounded-square container, or set the wordmark in any other face.

## The pairing

| Role | Value | Notes |
|---|---|---|
| Canvas | `#FBFAF7` | Soft white. The page is white top to bottom; grounds drift only within a few points of it. |
| Surface | `#FFFFFF` | Lifted surfaces are brighter than the ground, never darker. |
| Ink | `#0E3B32` | Evergreen. 11.8:1 on canvas. |
| Ink soft | `#4E6C64` | Tinted from the ink. 5.4:1 on canvas. |
| Accent | `#F4573C` | Coral. Owns action, the ring, and the effort readout. |
| Accent ink | `#22100B` | On coral fills. 7.4:1. White on coral is 3.5:1 and is used for large display type only. |

Two wash tints (`--sh-accent-soft`, `--sh-mint`) exist for fills. They are the
same two hues, not new ones. `--sh-gold` touches the award medallion art only
and never type; it is not a third brand colour.

## Type

- **Display: Outfit** (500/600). Geometric, round-shouldered, warm. Tracking
  tightens as size grows.
- **Text: Manrope** (400/500/600). Open apertures, friendly, reads well small.
- Two families, no third. Emphasis inside a heading is weight, never a
  borrowed serif.

## Motion

Everything on the site shares one oscillator, `--sh-breath`, and one intensity,
`--sh-effort`, both written by the effort loop from scroll velocity. Nothing
animates on its own timer. That is what makes a page of moving parts read as
one living thing rather than as several widgets.

Under `prefers-reduced-motion: reduce` the oscillator is frozen at rest, every
shape holds its resting size, and the readout shows the resting rate.
