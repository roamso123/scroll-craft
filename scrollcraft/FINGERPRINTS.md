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
| sophia-hall | Continuous ribbon (new) | Floating centre pill carrying a live effort readout and one CTA; no bar, no edges | Four-plane parallax portrait with a greet kinetic headline; no clip | parallax > flow+count > pin(peak 3.6) > pan(5) > reveal > pointer > pin(1.3); 7 sections, 15.1vh desktop / 16.4vh phone | Breathing ring settles to resting with the visitor's own session totals inside it; magnetic CTA in the ring | The effort loop: scroll velocity drives one page-wide oscillator and a bpm readout that recovers when you stop | Soft-white ribbon, evergreen and coral, authored vector art (no generated imagery) | Fictional independent fitness trainer |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Continuous ribbon** as a grammar, and its absolute ban on visible right
  angles and hard section edges.
- **The effort loop** (scroll *velocity* driving one shared oscillator, a
  recovering rate readout, and a session summary at the close).
- The **floating centre pill** nav that carries a live readout rather than links.
- The **breath ring** as both peak device and close shape.
- 7 sections at 15.1 viewport-heights with zero `scrub` acts.

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
