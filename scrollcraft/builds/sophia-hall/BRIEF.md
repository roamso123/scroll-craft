# BRIEF — Sophia Hall, independent fitness trainer

**Self-authored under explicit creative delegation.** The user supplied the
subject, the art-direction constraints (one strict colour pairing, mostly white
ground, no square or sharp lines, everything flowing and blending between
sections, one landing page, a photo of her in athletic gear, social / client /
physical proof, restrained photography volume, "a lot of aesthetic alive moving
animated things") and then handed over the rest. Everything below that is not a
direct quote is an authored decision, labelled as such.

**Fiction notice.** The user asked for a *fully simulated, made-up* trainer.
Sophia Hall does not exist. Every follower count, client number, award, review
and press mention on the page is invented. The skill's "only real numbers in a
counter" rule is overridden here by the explicit brief; the page carries a
visible concept-demo line in the footer so nobody reads the figures as claims.

---

## The eight topics

**1. Vibe in three to five words.** *(authored)* Warm, capable, unhurried,
alive. References: the inside of a sunlit pilates studio at 7am; a Nike
Training Club print campaign with the athlete laughing rather than grimacing;
the soft-edged, liquid page transitions of a good weather app.

**2. The scroll journey, section by section.** *(authored)*
Her, first, in athletic gear, in her own light. Then the proof at a glance:
who follows her, how many people she has actually coached, how long. Then how
she trains — the part that is hers and not everyone's. Then what you can
actually book. Then the people who already did, in their words. Then what the
industry has handed her. Then one place to start.

**3. The energy curve.** *(authored)* Calm open — she is the loudest thing on
the first screen and she is standing still. Rises through the proof band. The
intense stretch is the method, in the middle. Comes down steadily through
programmes and reviews, settles fully at the close.

**4. How they should feel, stage by stage, and the ONE moment.** See the
feeling curve below. The peak is the method act.

**5. One thing this site does that no site they have seen does.** *(authored)*
The page treats the visitor's scrolling as effort. Scroll velocity, not scroll
position, drives a live rate readout in the chrome; the whole page's breathing
speeds up with it and recovers when the visitor stops. At the close the page
hands back a summary of the session they just did.

**6. How far from premium-minimal.** *(authored)* Warm/playful end of the
range, held to the taste floor. Not luxury-quiet, not maximalist. Friendly is
the brief: "super trainer friendly."

**7. One unbroken world, or distinct scenes?** *(user, paraphrased from "all
flowy blending pages together")* One unbroken surface. No hard cuts, no visible
section edges — every boundary is a curve that blends into the next ground.

**8. What assets do they already have?** Nothing. Fully generated brand. The
kie.ai key supplied for this session cannot reach `api.kie.ai` from this
environment (the network policy returns 403 at the proxy) and the container has
no ffmpeg, so the shipped build uses authored vector art in every photographic
slot. `ASSETS.md` holds the exact prompts and the one-line swap so photoreal
stills replace them with no markup change.

---

## The feeling curve

```
1  Recognition   she is there, lit, still, breathing — before a word is read
2  Trust         the numbers arrive on their own, quietly, in her handwriting
3  Intimacy      the ring breathes and the page breathes with it: her method,
                 one line at a time, nothing else on screen        ← PEAK
4  Appetite      four ways in, travelling sideways, each one landing whole
5  Warmth        four people saying the plain thing that changed
6  Respect       what the industry handed her, surfaced under the pointer
7  Resolve       the ring settles, the session totals up, one thing to do
```

No two adjacent acts share a feeling. Act 2 is deliberately the quiet before
the peak: no motion beyond the counters and the drift, no imagery.

## The peak

> "Halfway down it stops being a website — there's this ring that's actually
> breathing, and the faster you scroll the harder the page is breathing with
> you, and then it just holds while she tells you how she trains."

It lives in act 3. It gets the largest span on the page, the only full-stage
silence, and the whole asset budget of the middle.

## The tell-someone sentence

**It's the site where the page gets out of breath with you and gives you your
session back at the end.**

## Authored silence

- Act 2 holds an almost-empty white field for roughly half a viewport before
  the first counter fires. That is intentional, not dead scroll.
- Act 3 opens on the ring alone, no copy, for the first ~12% of its span.

## Grammar, gate, signature move

**Grammar: Continuous ribbon** (new; see REPORT section in the final message).
The page is one unbroken soft-edged surface. Every section boundary is a curve
that the next ground grows through, never an edge.

- **Forbids:** right angles anywhere a visitor can see one — no square cards,
  no straight dividers, no boxed sections, no hard cuts between grounds; dark
  grounds; full-frame scrims; chapter numbers; any device that snaps.
- **Nav:** a floating soft pill that carries the live rate readout and one CTA
  label, used everywhere on the page.
- **Hero:** layered depth portrait on independently-moving curved planes.
- **Close:** the breathing ring settles to resting rate with the session
  summary inside it, and the CTA sits in the ring.

**Signature move: the effort loop.** One oscillator, driven by scroll
*velocity*, shared by the whole page: the rate readout in the chrome, the
breath of every blob and ring, the warmth of the accent, and the session
summary at the close. Stop scrolling and it recovers toward resting over
several seconds, visibly. It is not a kit device and no parameter change
produces it.

**Fingerprint gate:** the registry at `scrollcraft/FINGERPRINTS.md` was empty
before this build, so there is no row to clear. Row appended after shipping.

## Score

| # | Beat | Device family | Why this one |
|---|---|---|---|
| 1 | Recognition | `parallax` (4 planes) + `kinetic` + greet cue | Depth without video: she is separated from her ground and the ground moves under her |
| 2 | Trust | `flow` + `in` + `count` | Numbers should arrive where the reader is calm, not compete with the hero |
| 3 | Method (PEAK) | `pin` + bespoke breath ring | The frame has to hold still for the one act that is an argument |
| 4 | Range | `pan` | Lateral travel reads as breadth; four programmes are options, not a hierarchy |
| 5 | Warmth | `reveal` + `flow` | A quote becoming visible edge-first reads as someone turning to speak |
| 6 | Respect | pointer (`tilt`, `spotlight`) | Awards are objects you pick up and turn over |
| 7 | Resolve | `pin` + `magnet` | The page stops moving and starts responding |

Checks: 6 device families, never the same twice in a row, zero `scrub` acts
(no video pipeline available), one peak with the largest span, no act shares a
feeling with its neighbour, total measured page length recorded in `lab/`.
