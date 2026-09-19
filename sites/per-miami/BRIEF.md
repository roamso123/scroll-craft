# BRIEF — PER Miami Exotic Rentals

**Status: partly interviewed.** Three questions were put to the owner and
answered directly (structure, booking destination, register). The remaining
five of the eight Step 0 topics are **authored decisions**, marked below, taken
from what the owner supplied: the logo, the five rooftop photographs, the
colour direction, and their live site at `permiamiexoticrentals.com`, which is
where every car, price, claim and phone number on this page comes from.

Nothing here is invented. Where a fact was not available it is absent, not
estimated.

---

## The eight topics

**1 · Vibe, three to five words** — *authored.*
Concierge, not showroom. Dark, exact, expensive, unhurried. References drawn
from the supplied material rather than from websites: the logo's green-to-blue
gradient on black, a museum object label, a valet key tag.

**2 · The scroll journey, section by section** — *authored, from the owner's
own site order.* Their site is a fleet list with a price and a Book button per
car, a phone number, three promises, and a contact form. That is a catalog, so
the journey is a walk through the catalog: the car in front of you, then the
room walking past you, then the rest of the fleet as a price list, then the
flagship, then the ask.

**3 · The energy curve** — *authored.* Low and steady for the first two
thirds. One spike at the Rolls-Royce. Down to quiet for the ask.

**4 · How it should feel, and the one moment** — *authored.* Below.

**5 · One thing no other site does** — *authored.* See the signature move.

**6 · Distance from premium-minimal** — **owner answered:** "Dark premium,
gradient as signal." Near-black grounds, generous air, the brand gradient only
where it carries meaning: green for money, blue for action.

**7 · One unbroken world, or distinct scenes** — **owner answered:** "Walkable
fleet collection." Objects in a room, each with a label and its own Reserve
button, a jumpable index for navigation, a booking plate at the end.

**8 · What assets exist** — **supplied:** the `PER` wordmark (a 674x362 raster
on black) and five rooftop photographs at 560x508. No footage, no brand
document, no type specimen. No image generation was used and no API key was
needed: everything on the page is the owner's own photography.

**Booking destination** — **owner answered:** "Stub a real endpoint." The
survey POSTs to `/api/bookings`. Nothing is hosted yet, so a failed POST falls
back to a plain-text summary plus a call and text link to the real number, and
the page says so rather than pretending the request was filed.

---

## The feeling curve

Written before the acts existed.

```
1  Arrival     the rooftop at eye height, one car sitting there, its rate
               already stated, nothing asked of the visitor yet
2  Appetite    the room walks past them: three cars, each labelled like an
               exhibit, each one gettable
3  Restraint   the type goes small and factual, the rest of the fleet as a
               price list, no photographs. The page stops performing
4  Awe         the frame wipes open and the white Rolls-Royce is the whole
               screen at $1,999, the largest number on the page
5  Resolve     the key tag they have been carrying lands in the form, the ask
               is one plate, and the page stops
```

No two adjacent acts share a feeling. Act 3 is the authored silence: it is
deliberately the quietest, smallest, least photographic thing on the page so
that act 4 has something to be a change from. The verification pass should read
its stillness as intent, not as dead scroll.

## The peak

> the price list went small and quiet, and then the whole screen wiped open
> into the white Rolls and the tag in the corner flipped to $1,999

Act 4. It gets the largest span on the page (3.6 against 2.0, 4.2, ~1.2 and
~2.0), the only edge-to-edge wipe, the best of the five photographs, and the
silence of act 3 in front of it.

## The tell-someone sentence

> It's the site where a key tag in the corner keeps picking up whichever car
> you're looking at, and at the end you hand it to the booking form.

## Signature move — the key tag

A valet key tag hangs in the corner of the page for its whole length. It is not
a progress readout and it is not a label: it **stamps itself** with whichever
car is currently in front of the reader, flipping on its cord as the collection
walks past. Its cord swings with scroll velocity, so the page reads as being
driven rather than played back. At the booking plate the tag stops being chrome:
it detaches, travels into the form, and docks into the car field, which is
already set to the car it last stamped. Handing the tag over is the booking.

It is bespoke page JS driven off act progress and the rail's own geometry. The
engine is untouched. It is one interaction, not a parameter change to a kit
device, and it is the same moment as the tell-someone sentence above.

Under reduced motion the tag still stamps and still prefills the field; the
swing and the flight are dropped. It is `aria-hidden` because it mirrors a real
`<select>` that carries the same value, so nothing depends on it.

## Grammar

**Gallery / catalog.** The fleet is a range, and the visitor's real question is
"what are the options and what do they cost", not "should I believe you".

Why the other seven lost:

- **Filmic one-shot** carries a burden of proof and cannot meet it here: there
  is no single argument to carry, and the owner asked for a walkable collection.
- **Chaptered editorial** wants long-form substance. The owner asked for a page
  that is not text heavy.
- **Live surface** needs a product surface to operate. A rental fleet has none.
- **Continuous world** requires worldflight and real camera footage. There is
  no footage, no image-generation key and no full ffmpeg on this machine, so it
  could only be faked from five stills, which is the fragile build the skill
  warns about.
- **Typographic poster** would throw away five real photographs of the actual
  cars, which are the most persuasive thing the brand owns.
- **Split stage** needs two sides. There is no comparison here.
- **Rhythmic cutlist** bans `pin` and `dwell` and reads as nightlife energy.
  The owner chose dark premium, and a booking form needs a calm surface.

Grammar constraints honoured: object labels carry fact, not pitch, on one
schema for every object; no single hero claim; no scrim copy over media; nav is
a jumpable index of objects; the close is an inquiry plate typeset like a label.
Its bans hold: no kinetic headline, no spotlight, no magnet, no scrub at all.

## Hero depth

Four planes, three of them derived from the owner's own frame, moving at
different rates with real occlusion:

```
sky       CSS gradient, no travel
skyline   the far building, keyed off the sky into genuine alpha   -1.1
plate     the photograph in its frame, pushing in as it travels    -0.45
deck      the parking deck, in front of the plate, overlapping it   0.9
label     real markup at 1x, between the plate and the deck
```

**A keyed cutout of the hero car was built and rejected.** The source is a
560px phone frame, so the matte upscales soft and the inpainted plate behind it
shows; `lab/macan-cutout-check.png` and `lab/macan-mask-check.png` are the
evidence, and `node src/assets.mjs cutout` reproduces them. Keeping the car
inside its photograph and building depth around the plate is the honest version
at this resolution. Both keys that did ship (the wordmark's black ground, the
skyline's sky) are clean, and both are in `lab/` to be looked at.

## Palette

Two brand stops, each with one job, which is what the logo already does:

```
--sc-canvas     #05070A    off-black, blue-tinted. No pure black anywhere
--sc-surface    #0C1319
--sc-ink        #EDF3F5
--sc-ink-soft   #93A6B2    cool-tinted, never flat grey
--sc-accent     #2BB8F5    brand blue: every action, every focus ring
--per-rate      #2BE49A    brand green: rate figures only, never a control
```

The taste floor says one accent. This page carries two stops of the brand's own
gradient under strict roles because the logo is literally a green-to-blue
gradient and the owner's live site already uses green for prices and blue for
the call button. Green never becomes a button; blue never becomes a price.

## Score

| Act | Beat | Device | Why this one | Span |
|---|---|---|---|---|
| 1 | Object one, in the room | `parallax` (4 planes) + pointer lean | The hero has to be an object already in view with its label, and depth has to come from the scene around it | 2.0 |
| 2 | The collection | `pan` + `tilt` | Lateral travel reads as breadth, which is the whole question a fleet answers | 4.2 |
| 3 | The index | `flow` + `in` | Twelve real prices are information, not experience. Compress it and let it be the silence | ~1.2 |
| 4 | The flagship | `reveal` (up, edge to edge) on a `pin` | A wipe is a change of state, and this is the one moment the page raises its voice | 3.6 |
| 5 | The ask | `flow`, static plate | A form inside a pinned stage is a keyboard trap. The close resolves by holding still | ~2.0 |

Five device families (parallax, pan, flow/in, reveal, pointer). No family twice
in a row. No `scrub` at all, so no clip weight and no frozen-clip class of
failure. Total roughly 13 viewport-heights, clear of the 6-to-7 acts at
13.6-13.8vh band.

## Fleet and prices

Every figure is the owner's own published rate, read from their site. Photographed
cars carry two spec fields only (body, seats) because those are facts about the
vehicle; no horsepower, no 0-60 and no counters, since trim-level numbers would
be invented precision.

| Car | Rate / day | On the page as |
|---|---|---|
| Porsche Macan | $199 | act 1, object one |
| Audi S5 Sportback | $299 | act 2 |
| Maserati Grecale | $299 | act 2 |
| Cadillac Escalade ESV | $399 | act 2 |
| Corvette C8 Z51 | $449 | act 3, index |
| Mercedes G-Wagon | $699 | act 3, index |
| Mercedes GLS 600 Maybach | $799 | act 3, index |
| Audi R8 V10 Spyder | $849 | act 3, index |
| McLaren GT | $1,049 | act 3, index |
| Lamborghini Urus | $1,099 | act 3, index |
| Bentley Continental GT Speed | $1,199 | act 3, index |
| Rolls-Royce Cullinan | $1,999 | act 4, the peak |

Phone: (305) 494-5165. One action label everywhere: **Reserve**.
