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
| `assets/` | Stills, the logo, the self-hosted fonts. |
| `verify/` | The verification scripts. Their screenshots land in `verify/out/`. |

## Dropping in the remaining stills

Nine frames are still slots. Drop a file at the path below and it appears; no
markup change is needed, and until it lands the page shows a labelled slot
rather than a broken image.

| File | Frame |
|---|---|
| `assets/m5-front.jpg` | BMW M5 Competition, three-quarter front |
| `assets/m4-conv-front.jpg` | BMW M4 Competition Convertible, three-quarter front |
| `assets/g63-front.jpg` | Mercedes-AMG G 63, three-quarter front |
| `assets/911-front.jpg` | Porsche 911 Carrera S, three-quarter front |
| `assets/escalade-front.jpg` | Cadillac Escalade ESV, three-quarter front |
| `assets/c63-front.jpg` | Mercedes-AMG C 63 S, three-quarter front |
| `assets/escalade-cabin.jpg` | Escalade interior |
| `assets/g63-cabin.jpg` | G 63 interior |
| `assets/m4-conv-cabin.jpg` | M4 Convertible interior |

Frames are cropped to 16:10 in the rail and to 16:10 or 21:9 in the cabin grid,
so anything at or above 1400px wide works. Already in place: the logo, the
Maybach front, rear and cabin, and the M5 rear.

The Audi RS and A-Class cabin frames have no fleet entry yet. Add the vehicle to
`FLEET` in `midtown.js`, add an `<article class="obj">` to the rail with a
matching `data-car`, and both the index and the build sheet pick it up.

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
