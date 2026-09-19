# PER Miami Exotic Rentals

A scroll-driven site for PER Miami Exotic Rentals, built with the
`scroll-craft` skill in this repository. One page, no framework, no build step.

Every car, rate, promise and phone number is the owner's own, read from
`permiamiexoticrentals.com`. Every photograph is the owner's own. Nothing was
generated and no image-generation credits were spent.

## Run it

It has to be served over HTTP, not opened as a file.

```bash
node ../../plugins/nateherk-design/skills/scroll-craft/scripts/serve.mjs --root . --port 4500
# then open http://localhost:4500
```

Any static host works: the whole site is `index.html`, two stylesheets, two
scripts and `assets/`.

## What is here

```
index.html              the page. Real headings, real labels, real reading order
per.css                 this page's layer: tokens, chrome, the five acts, the tag
per.js                  the standing index, the key tag, the booking survey
scrollcraft.css/.js     the engine, copied unmodified from the skill
assets/                 graded photographs, the keyed wordmark, two hero planes,
                        and the two self-hosted webfonts
src/assets.mjs          the asset pipeline that produced assets/ (see below)
src/sheet.mjs           builds a contact sheet from a screenshot run
BRIEF.md                the brief, the feeling curve, the peak, the grammar,
                        the signature move and the score
verification/           the contact sheets the build was checked against
```

## The booking survey

Three steps (car and days, dates and delivery, contact), validated in the
browser, then `POST /api/bookings` with JSON:

```json
{
  "car": "Rolls-Royce Cullinan",
  "days": 3,
  "rate": 1999,
  "estimate": 5997,
  "from": "2026-10-02",
  "to": "2026-10-05",
  "where": "Fontainebleau, Miami Beach",
  "name": "...",
  "phone": "...",
  "email": ""
}
```

**That endpoint does not exist yet.** Until it is wired up, the form is honest
about it: the request is not reported as filed. The visitor gets the whole
request written out, a text link and a call link to (305) 494-5165, and a copy
button. Point `fetch("/api/bookings", …)` in `per.js` at whatever service will
take the booking (a form service, a mail relay, a CRM webhook) and the same
form starts reporting "Request filed" instead.

The rate table lives in the `<option data-rate>` attributes in `index.html` and
is read from there by the estimate line and the key tag, so **prices are
changed in one place**.

## The key tag

The one interaction built for this site alone. A valet tag hangs in the corner
for the whole page and stamps itself with whichever car is in front of the
reader: the hero, whichever card is centred in the collection, the Rolls-Royce
at the peak, or any row the pointer touches in the fleet index. Clicking a
Reserve outranks the scroll and locks the tag to that car. At the booking plate
the tag hands itself over: it flies into the car field, which is already set to
the car it last stamped.

Under reduced motion it still stamps and still fills the field; the swing, the
flip and the flight are what go. It is `aria-hidden` because it mirrors the
`<select>`, which is the real control.

## Rebuilding the assets

`src/assets.mjs` documents exactly how each asset was derived, and needs
`sharp` plus the owner's original uploads:

```bash
npm i sharp
node src/assets.mjs            # wordmark, car photographs, hero planes
node src/assets.mjs cutout     # the keyed hero cutout this build rejected
```

The source photographs are 560x508 phone frames. They are upscaled to 1400px
for layout room, with a restrained grade, and **the layout is designed around
that ceiling**: the peak frame downscales its source rather than stretching it.
The single biggest improvement available to this site is higher-resolution
photography of the same cars. Drop larger originals in, re-run the pipeline,
and nothing else needs to change.

## Verification

Checked with the skill's harness at 1440x900, at 390x844, and with reduced
motion, plus the functional passes:

- no dead scroll, and every cue clears 4.5:1 measured on the composited page
- rail overflow measured at 1280, 1440 and 1920 (the pan act travels at all
  three); under reduced motion the rail becomes a native scroll region
- keyboard: every focus stop is on screen and lit, including the cued Reserve
  inside the pinned peak act and the cards parked off the edge of the rail
- the survey: validation, the estimate, the endpoint failure path, the text
  and copy handoffs
- no console errors and no failed requests beyond the stub endpoint's 404

Not covered: a real iPhone or Safari of any kind, and nothing on the page has
been through a real network. There is no video on the page, so the iOS
clip-lifecycle failures the skill warns about do not apply here.
