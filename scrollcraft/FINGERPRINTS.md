# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| `per-miami` | Gallery / catalog | Standing index of objects, left column on desktop, one jumpable row on a phone, marks where the reader is | Object one already in view: a framed plate on a pure gradient ground, with a travelling glow behind it, a gradient floor overtaking its lower edge and the label crossing the frame. No photography in the hero except the car itself | pin 2.0 > pan 4.2 > flow > pin 3.6 > flow · 5 acts · 11.7vh | Inquiry plate typeset as an object label: a three-step booking survey that the key tag docks into, holding still | The key tag: stamps whichever car is in front of the reader, then hands itself to the form | Photographic, the owner's own rooftop frames, dark premium | Static HTML/CSS/JS |

First build in this registry, so the gate had nothing to clear. It shares
nothing with a prior row because there was none.

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Gallery / catalog** grammar, with object labels on one schema and rates as
  the only figures on the page.
- **A standing index of objects as the nav**, marking position and jumping.
- **A framed plate hero on a gradient ground**: the subject stays inside its
  photograph, nothing photographic sits behind or in front of it, and depth
  comes from three rates and two overlaps. The photographic backdrop this build
  shipped first (a keyed skyline, a cropped deck) was cut on the owner's
  instruction: at a 560px source both read as smears. A later build wanting
  literal diorama depth needs source frames that can carry it.
- **Close as an inquiry plate carrying a multi-step form**, resolved by holding
  still rather than by a pinned CTA island.
- **The key tag** signature move, and with it the shape of "a persistent object
  that accumulates state and is handed to the form at the end".
- **5 acts at 11.7vh**, and the `pin > pan > flow > pin > flow` sequence.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
