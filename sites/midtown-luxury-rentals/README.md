# Midtown Luxury Rentals

A scroll-craft build. Gallery / catalog grammar: the fleet is the page.

```
python3 -m http.server 4500   # or any static server
open http://localhost:4500
```

Everything is static. No build step, no backend, no third-party requests: the
two typefaces are self-hosted in `assets/fonts/`.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page. Tokens and all site CSS live in its `<style>`. |
| `midtown.js` | The build sheet, the hero planes, the rail settle, the booking survey. |
| `scrollcraft.js` / `.css` | The engine, copied verbatim. Never edited per project. |
| `BRIEF.md` | The brief, the feeling curve, the peak, and the content rules. |
| `assets/` | Stills, the mark, the self-hosted fonts. |
| `build-logo/` | The vectoriser and the original raster the mark was traced from. |
| `verify/` | The verification scripts. Their screenshots land in `verify/out/`. |

## The stills

21 frames, one studio shoot, named `v-<car>-<frame>.jpg` where frame is `ext`,
`rear` or `int`. Seven vehicles: `maybach`, `m5`, `m4`, `g63`, `911`,
`escalade`, `c63`.

Each vehicle card carries a frame strip so the visitor picks the view; the
switcher swaps the alt text with the source, because a strip that leaves
"three-quarter front view" on a rear shot is worse than no alt text at all.
The cabin section uses the four interiors that are confirmed to be the car
they are filed under.

**Three files are uploaded but not placed**, because the frame is a different
vehicle from the one its name claims and the page states vehicle identity
beside every frame:

| File | What is actually in it |
|---|---|
| `v-m5-int.jpg` | An Audi RS cabin: red and black RS seats, Audi wheel and MMI screen. Not an M5. |
| `v-c63-int.jpg` | A Mercedes A-Class AMG cabin: turbine vents, compact dash. Not a C 63 W205. |
| `v-911-int.jpg` | Not an interior. A dark coupe in side view with the door ajar, and a different car from the red Carrera S in `v-911-ext`. |

To place them, either supply the matching frame under the same name, or say
which vehicle each belongs to and it gets a card and a `FLEET` entry.

## The mark

The supplied logo was a soft screen grab on a black card, with silver rather
than white ink. It is vectorised in `build-logo/vectorize.py`: two colour
fields, upscaled, gaussian-smoothed and thresholded, then traced with potrace
into an ink layer and an accent layer. The smoothing matters. Tracing the raw
mask of a blurry source fits hundreds of tiny curves to its ragged edge, which
looks wrong at size and is most of the file weight.

| File | What it is |
|---|---|
| `assets/logo.svg` | The full stacked mark. Transparent, `#F4F4F6` and `#D13622`. |
| `assets/mark.svg` | The arc and car glyph, for the bar lockup. |
| `assets/favicon.svg` | The car knocked out of an accent tile. |
| `assets/*-currentcolor.svg` | Ink left inheritable. Inline these; `<img>` cannot resolve `currentColor`. |
| `assets/logo.png`, `mark.png`, `apple-touch-icon.png` | Transparent raster exports. |

The glyph is the mark with its set text removed, dropped by connected component
rather than cropped, so nothing is clipped. The shield's bottom chevron goes
with it: the empty middle of the shield is most of the glyph's height, and at
bar size that gap is all a reader gets.

To rebuild after replacing `build-logo/source.png`:

```
pip install pillow numpy scipy && apt-get install potrace
python3 build-logo/vectorize.py     # the SVGs
node build-logo/raster.mjs          # the PNG exports, needs the local server
```

## Adding or changing a vehicle

One place: the `FLEET` array at the top of `midtown.js`. It drives the index
panel, the booking form's vehicle list, and the build sheet's figures. The card
in the rail carries its own visible spec list, so change both.

`sixty: null` means the maker does not publish a 0-60 figure. The sheet then
prints `n/p` instead of blending a neighbour's number into the gap. The Escalade
is the current case.

## Content rules this build holds to

- **No invented numbers.** There are no rates on the page. Every vehicle figure
  is manufacturer specification for the model shown, and the page says so.
  The only company figures used are ones the business publishes: the showroom
  address, the two phone numbers, the four delivery states, and "over 70".
- **Rate on request** is the price line everywhere. If real rates arrive, they
  replace `.rate` in the cards and the `sheet__rate` span.
- **One label per intent.** Every booking control reads "Book now". Each one
  carries a visually hidden suffix naming its object so twelve identical buttons
  are still usable by ear.

## The booking survey

Three steps and a review, in a native `<dialog>`. It validates the 24-hour
self-drive minimum, requires an address when delivery or collection is chosen,
and refuses a dropoff before its pickup.

It has no backend. The review step assembles the request and offers three real
actions: text it to (631) 392-1450, call the desk, or copy it. If a form
endpoint is added later, post `summary()` from `midtown.js` and keep the three
actions as the fallback.

## Verification

Run a server on 4500, then from this folder:

```
node verify/narrow.mjs      # overflow, sheet fit and hero fit at 320 to 1920
node verify/contrast.mjs    # text contrast measured on the composited hero
node verify/audit.mjs       # walks the booking survey on desktop and phone
node verify/a11y.mjs        # focus order, headings, alt text, the index panel
node verify/frames.mjs 1440 900 d          # desktop frames
node verify/frames.mjs 390 844 m           # phone frames
node verify/frames.mjs 1440 900 r rm       # reduced motion
```

They need `playwright-core` (already installed here) and a Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; change the path at the top
of each script for another machine.

**Not covered by any of these: a real phone.** Headless Chromium does not
reproduce iOS touch scrolling or Safari's `<dialog>` and `sms:` behaviour. The
build sheet's rAF loop and the survey both want a pass on real hardware.
