# L&T Auto Repair

A four page static site for L&T Auto Repair, 475 Chili Ave, Rochester, New York.
No build step, no framework, no dependencies. Open `index.html` or serve the
folder and it runs.

```bash
python3 -m http.server 4510    # then visit http://127.0.0.1:4510
```

## Pages

| File | What it does |
|---|---|
| `index.html` | Landing page. Hero with both calls to action, how a repair goes, a short service register, hours and location, closing call. |
| `services.html` | The full service register, grouped into five families. |
| `book.html` | The booking survey: five steps, a review screen, a confirmation. |
| `visit.html` | Hours, address, directions, and what to do before dropping the car off. |

## Design floor

Six colour roles and two faces drive everything, declared once at the top of
`css/site.css`:

```css
--canvas #08070A   --surface #100E15   --surface-2 #17141F
--ink #F6F4FA      --ink-soft #9C93B0  --ink-faint #847C9B
--accent #B18CFF   --accent-dim #8A63E0  --accent-ink #0B0810
```

One purple hue, two lightnesses, on off black. Change those nine values and the
whole site re-skins. Spacing is a 4px scale (`--s1` to `--s11`), type is a fluid
ramp (`--t-xs` to `--t-4xl`).

Fonts are self hosted in `fonts/` (Archivo for display, Outfit for text, latin
subsets only, about 350KB). Nothing is fetched from a third party at runtime.

Every text colour was measured against the ground it sits on. The lowest pair
on the site is 4.57:1, above the 4.5:1 floor for body text.

## The logo

Two filled letterforms, L in bone and T in purple, sharing a baseline. Kept as
flat rectangles rather than strokes so it stays legible at 26px in the header.

- `img/mark.svg` the mark on its own
- `img/favicon.svg` the mark inside a rounded tile, for the browser tab and app icon
- The header and footer inline the same paths so the mark costs no request

## Hours live in one place

`js/site.js` opens with a `HOURS` table keyed by weekday. It drives the open or
closed pill in the hero, the highlight on today's row in the hours table, and
the day validation in the booking form. Change the hours there and all three
follow. The table in the HTML is the printed copy and needs editing too.

## The booking survey

Five steps, then a review screen where every line has an edit link back to its
step, then a confirmation carrying a reference code.

**It is front end only right now. Nothing leaves the browser.** Validation,
review and confirmation all work; the submission is the one piece left to wire.
Open `js/book.js` and set the constant at the top:

```js
var LT_BOOKING_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';
```

Anything that accepts a JSON POST works: Formspree, a Netlify function, your own
handler. The payload is a single object with `services`, `vehicle`, `symptom`,
`flags`, `dropoff`, `customer`, `reference` and `submittedAt`. If the request
fails, the form tells the visitor to call instead rather than losing the booking
silently. Leave the constant `null` and everything still works locally.

## Photography

The site is deliberately built without photographs: light, grain and type carry
it, so there are no boxed thumbnails breaking the flow. If you want photography
later, the two places it belongs are the hero on `index.html` and one full bleed
band between sections. Both should run edge to edge, never in a square card.

Assets could not be generated in the session that built this, because
`api.kie.ai` is blocked by the environment's egress policy. To generate them
from a machine with normal network access, from the repository root:

```bash
export KIE_AI_API_KEY=your-key-here     # never commit this
SKILL=plugins/nateherk-design/skills/scroll-craft

# one style preamble, reused verbatim in every prompt, is what makes
# separate images look like one shoot
PRE="Photographed on a full frame camera, 35mm, available light, deep shadow,
cool desaturated grade with a faint violet cast, matte blacks, no lens flare,
no text, no logos, documentary rather than advertising."

node $SKILL/scripts/kie.mjs still "$PRE

Interior of a small independent auto repair shop at dusk, one car on a lift,
a single work lamp, tools racked on the back wall, nobody in frame." \
  site/lt-auto-repair/img/shop.png --ar 21:9
```

Look at every frame before using it, and reroll rather than shipping a weak one.
Drop the result in `img/`, then add it as a full bleed layer behind
`.hero__inner` with the existing `.hero__glow` elements on top.

## Before it goes live

- [ ] Confirm the service list matches what the shop actually takes on. It is marked with a comment in `services.html` and covers standard independent repair work rather than anything verified with the owner.
- [ ] Confirm the hours and phone number. They came from public listings, not from the shop.
- [ ] Wire `LT_BOOKING_ENDPOINT`.
- [ ] Replace `example.com` in `robots.txt` and `sitemap.xml` with the real domain.
- [ ] Add an Open Graph image if the site will be shared on social.

## Verified

Checked with headless Chromium at 1440x900 and 390x844: no horizontal overflow
on any page, the booking survey blocks on every invalid step and reaches its
confirmation, reduced motion leaves nothing faded out, one `h1` per page with no
heading level jumps, every form control labelled, every tab stop carries a
visible focus ring, and no console errors.

Not checked: a real phone, and any browser other than Chromium.
