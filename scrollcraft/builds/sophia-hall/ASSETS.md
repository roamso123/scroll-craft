# Assets — what shipped, and how to swap in photography

## What shipped

Every photographic slot on the page currently holds **authored vector art**, not
a photograph:

| Slot | File | Used by |
|---|---|---|
| Hero subject plane | `assets/hero-portrait.svg` | act 1, the parallax subject plane |
| Proof-band portrait | `assets/headshot.svg` | act 2, circular crop |
| Hero ground / mid / foreground planes | CSS blobs in `styles.css` | act 1 |
| Programme glyphs, award medallions, review avatars | inline SVG in `index.html` | acts 4, 5, 6 |

**Why.** This container has no ffmpeg and its network policy blocks
`api.kie.ai` at the proxy (403 on CONNECT), so `scripts/kie.mjs` cannot run
here even with a valid key. The build therefore ships zero generated imagery
and zero video, which also means zero `scrub` acts.

## Swapping in photoreal stills

Every slot is a plain `<img>` with both `width` and `height` set. Generate,
look at the file, then replace the `src`. No markup or CSS change is needed as
long as the aspect ratio is kept.

The style preamble below is used **verbatim** in every prompt. That is what
makes separate generations look like one shoot; do not paraphrase it per shot.

> **Style preamble.** Editorial fitness photography, natural window light from
> camera left, soft falloff, warm neutral studio with an off-white seamless
> backdrop, shallow depth of field at f/2.0, 85mm lens, subtle film grain, no
> colour cast, no hard shadows, no gym equipment clutter. Subject: Sophia, a
> woman in her mid-thirties, athletic build, dark hair tied back, wearing deep
> evergreen training gear. Calm and capable, never straining.

```bash
cd scrollcraft/builds/sophia-hall
K=../../../plugins/nateherk-design/skills/scroll-craft/scripts/kie.mjs

# 1 · hero subject. Needs a clean cut-out: generate on seamless, then key it.
node $K still "<preamble>

Full body, standing three-quarters to camera, weight on one hip, one hand
resting at her waist, mid-breath, looking just past the lens. Full figure in
frame with headroom above and floor below." out/hero-portrait.png --ar 2:3

# 2 · proof-band portrait
node $K still "<preamble>

Head and shoulders, square crop, a quarter turn to camera, unforced half
smile, eyes on the lens." out/headshot.png --ar 1:1
```

Then cut the hero subject out of its backdrop and save with real alpha (the
hero's depth reads only if the subject plane is transparent and **solid below
its silhouette** — see `references/devices.md §6`). Save as
`assets/hero-portrait.png`, point the `<img>` at it, and reshoot the
verification pass.

**Do not** reuse the same filename when replacing art: phones cache the old
bytes. `hero-portrait-2.png`, not `hero-portrait.png` again.

## If video becomes available

The page is scored with no `scrub` act on purpose, and it does not need one.
If a clip is added later it belongs in act 1 behind the subject plane, not as a
new act: the score already has six device families and adding a seventh act
would break the feeling curve's shape.
