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
| Midtown Luxury Rentals | Gallery / catalog | Fixed bar with an object index that jumps, plus the build sheet doubling as chrome | Object one full bleed on four independent planes, labelled, no title screen | flow(1.05) > pan(5) > flow+reveal(1.6) > flow+rows(1.4) > flow+count(1.3) > plate(1.0); 6 acts, 9.9vh, zero pinned acts, zero scrub | Inquiry plate typeset as an object label, footer inside it, survey behind it | The travelling build sheet: a fixed spec panel whose figures interpolate between the two objects contesting the frame, and whose button is loaded with whichever one wins | Black studio floor, single-source vehicle stills | Desktop 1440, phone 390 art-directed separately |

*(First row. The gate was vacuous for this build; from the next one on, the row
above is the constraint.)*

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Gallery / catalog** grammar, with `pan` as the spine rather than as one act.
- **An object index as the navigation**, opening as a side panel that jumps.
- **A persistent bottom build sheet** as both chrome and the primary booking
  control. Any later build that puts a fixed readout at the bottom edge is
  standing on this one.
- **Figures that interpolate between objects** rather than counting up on entry.
  A later build reaching for a scrubbed or blended numeric readout is repeating
  this move, whatever it is counting.
- **A close that is an inquiry plate set in the object-label schema**, with the
  footer inside the same block.
- The **6 acts at 9.9vh with no pinned act and no scrub** shape.

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
