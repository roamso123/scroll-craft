# Quality Window Tinting

A four-page marketing site for Quality Window Tinting, 6801 John F. Kennedy Blvd,
North Bergen, NJ 07047, (973) 687-6640.

Static HTML, CSS and one vanilla JS file. No build step, no dependencies, no
framework, and no CDN. Open `index.html` straight off the disk or drop the
folder on any static host. Everything but the map works with the network
unplugged.

```
index.html      landing page, shade simulator, call and book actions
services.html   automotive, residential, commercial, removal and repair
book.html       four-question booking survey
contact.html    address, hours, map, directions
css/site.css    all styling, tokens at the top
js/site.js      nav, reveals, hero drift, simulator, survey
assets/         logo, mark, favicon (SVG)
assets/fonts.css   @font-face rules
assets/fonts/      Archivo and Geist woff2, plus their licences
```

## Design

Off-black grounds (`#07070A`, `#101017`, `#16161F`), one purple accent
(`#8B5CF6` with `#C4B5FD` for lift), white ink. Archivo for display, Geist for
text, both self-hosted in `assets/fonts/` with system fallbacks. They are
variable fonts, so one file per family and subset covers every weight, 140KB
for the lot. Both are SIL Open Font License 1.1 and the licences ship beside
them.

There are no photographs. The hero plane and the shade simulator are rendered in
CSS, so nothing crops badly, nothing is a square thumbnail, and nothing waits on
a photo shoot. Drop real photography in later as full-bleed sections.

Change the palette by editing the six colour tokens in `:root` at the top of
`css/site.css`. Nothing else hardcodes a colour.

## The shade simulator

On the landing page. The visitor drags a divider across a rendered dusk street
to compare bare glass against film, and steps through 50 / 35 / 20 / 5 percent
VLT. It is labelled on the page as an approximation, not a photograph of
finished work.

## The booking survey

Four questions, then a summary the visitor sends by text, email or clipboard.
**There is no backend.** Nothing is stored and nothing is posted anywhere; the
request only leaves the device when the visitor sends it.

To collect submissions server side instead, give the `<form data-survey>` in
`book.html` an `action` and `method` pointing at a handler (Formspree, Netlify
Forms, your own endpoint) and submit it from the review step.

`services.html` deep-links into the survey with `book.html?service=automotive`
and friends, which preselects question one.

## Before this goes live

Three placeholders need the shop's real answers. Each is marked with an HTML
comment at the spot.

- **Hours.** Google gives only the 7:00 PM closing time, so the site says
  "Closes 7:00 PM. Call for same-day availability." Replace with the full
  weekly hours in `contact.html` and in each footer.
- **Service list.** `services.html` reflects standard offerings for a shop of
  this type. Confirm what is actually offered and cut what is not.
- **Reviews.** The 4.4 rating and 54 review count are from the Google Business
  listing at build time and will drift. Update or remove them.

No prices, no heat-rejection percentages and no invented statistics appear
anywhere, because none were supplied.

## Portability

The only thing on this site that reaches the network is the Google Maps embed
on `contact.html`. It degrades to a dark panel with an "Open the route in
Google Maps" link underneath, so an offline or blocked map costs the visitor
nothing. Delete the `<iframe>` if you would rather not call Google at all.

No analytics, no trackers, no third-party scripts, no cookies, and no local
storage.

## Verified

Chromium at 1440x900 and 390x844: all four pages, no console or page errors, no
horizontal overflow, and the same again with every non-file request blocked,
where the fonts still load from disk. Simulator, mobile menu, survey (all four steps, validation,
summary, SMS and mail links, deep-link prefill) exercised in the browser. Text
contrast measured on the composited render, lowest 6.3:1. Renders correctly with
JavaScript disabled and with `prefers-reduced-motion: reduce`.

Not verified: a real iOS or Android device, and the Google Maps embed on
`contact.html`, which the build sandbox blocked from loading. Its fallback
link was verified.
