# SS Auto Sound — website

Static, four-page marketing site for SS Auto Sound (1839 E Tremont Ave, Bronx, NY 10460).

Fully portable: no build step, no framework, no CDN and no network needed. Unzip it and
double-click `index.html`, or drop the folder on any static host (Netlify, Vercel, GitHub
Pages, cPanel, S3) exactly as it is. Every asset the pages use ships inside the folder,
including the webfont; the only outbound links are the tap-to-call number and the Google
Maps directions link, which are meant to leave the site.

```
index.html      Landing page — hero, call-now / view-services CTAs, three disciplines,
                proof strip, process, Google reviews, closing CTA
services.html   Full service list: automotive, window tint, commercial, residential
about.html      The shop, how a job runs, reviews
contact.html    Phone, address, live hours state, request form
assets/
  site.css      Design floor — tokens, layout, components, responsive, reduced-motion
  site.js       Sticky nav, mobile menu, scroll reveals, hero drift, today's hours
  inter.css     @font-face declarations for the bundled webfont
  fonts/        Inter variable font, latin subsets (SIL Open Font License 1.1)
  logo.svg      Horizontal lockup
  favicon.svg   Mark only
```

## Design floor

Backtones run black (`#050506`) to graphite; red (`#E11D2E`) is reserved for signals —
CTAs, the open/closed state, rules, list bullets, stars. Text is white through slate.
Imagery is drawn, not photographed: the hero is a masked SVG sound field that fades to
nothing at its edges, so there are no hard photo squares anywhere on the site.

Type is Inter, bundled in `assets/fonts/` as a variable woff2 so it renders the same
offline as online; the stack falls back to the system UI font if the file is ever missing.

## Before going live

- `contact.html` — the form posts to `mailto:info@ssautosound.com`. Swap in the real shop
  inbox, or point it at a form service (Formspree, Basin, Netlify Forms).
- Add real install photography if wanted; use full-bleed or masked treatments only.
- Structured data in `index.html` carries the rating (3.9) and review count (21) from the
  Google listing. Refresh those numbers when they move.
