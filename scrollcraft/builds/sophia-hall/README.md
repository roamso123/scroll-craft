# Sophia Hall — build notes

A one-page scroll site for a **fictional** independent fitness trainer, built
with the `scroll-craft` skill. Read `BRIEF.md` first; it holds the brief, the
feeling curve, the peak and the score.

## Run it

```bash
node ../../../plugins/nateherk-design/skills/scroll-craft/scripts/serve.mjs --root . --port 4500
# http://localhost:4500
```

## What is in here

```
index.html          the page. Real markup; the engine drives it off data-sc-*
styles.css          page styles (the grammar's no-right-angles rule lives here)
effort.js           THE SIGNATURE MOVE: one oscillator driven by scroll velocity
fonts.css           self-hosted Outfit + Manrope
brand/theme.css     the six colour roles and two faces. Rebrand here, nowhere else
brand/THEME.md      the theme spec: mark, pairing, type, motion
brand/mark.svg      the monogram in its open ring
brand/logo-lockup.svg  horizontal lockup with wordmark and strapline
assets/             authored vector art (hero figure, bust) + the font files
scrollcraft.css/js  the engine, copied verbatim. Never edited per project
ASSETS.md           the generation prompts, and how to swap photoreal stills in
lab/                verification screenshots (gitignored, regenerate locally)
```

## Verified

Three passes with `scripts/shoot.mjs`, all green on the shipped build:

| Pass | Result |
|---|---|
| Desktop 1440×900 | 15.1vh, 4 acts walked at 6 positions each, no dead scroll, every cue peaks, all contrast ≥4.5:1 |
| Phone 390×844 | 16.4vh, same, after clipping the subject plane out of the copy band |
| Reduced motion | Rail becomes a native scroll region, readout holds 58 bpm resting, ring static, nothing lost |

Also measured by hand: rail overflow is 1182px at 1440 and 947px at 1920 (the
pan act genuinely travels), and tab order runs mark → CTA → socials → programme
CTA → close CTA → footer with no traps.

**Not covered:** a real phone. Headless Chrome cannot reproduce iOS touch
scrolling or Low Power Mode, and this page's whole character is a velocity
reading taken from the scroller.

## The fiction

Sophia Hall does not exist. Every number, award, review and press mention is
invented, and the footer says so on the page. The skill's "only real numbers in
a counter" rule was overridden by the explicit brief.
