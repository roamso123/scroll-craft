#!/usr/bin/env node
/**
 * Cool Guys Wrap - asset generation.
 *
 *   node tools/generate.mjs            generate anything missing
 *   node tools/generate.mjs --force    regenerate everything
 *   node tools/generate.mjs --only chrome
 *
 * Strategy. We do NOT generate a render per colour: that would be 14 colours x
 * 7 finishes = 98 stills. Instead we generate the car once per FINISH in a
 * neutral mid-grey, so each plate carries nothing but the lighting, and tint
 * the colour in the browser through a body mask.
 *
 *   01-grey     the base plate, gloss, neutral mid-grey. Everything else is
 *               generated image-to-image from this one so the pose holds.
 *   02-dark     the same car repainted near-black. Never shipped: the mask is
 *               the per-pixel difference between 01 and 02, which is exactly
 *               the set of pixels that are painted bodywork.
 *   03..08      the remaining six finishes, same pose, same grey.
 *
 * 8 stills, ~224 credits at the documented 28/still.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, "..");
const OUT = path.join(SITE, "out");
const KIE = path.resolve(SITE, "../../plugins/nateherk-design/skills/scroll-craft/scripts/kie.mjs");

/* One style preamble, reused verbatim in every prompt. This is the single
   thing that makes eight separate generations look like one shoot. */
const PREAMBLE = [
  "Photoreal automotive studio photography, shot on a 50mm lens at headlight height.",
  "Subject: one mid-engine V10 supercar with a low wide wedge profile, scissor-door silhouette,",
  "sharp hexagonal design language, deep side intakes behind the doors and a high flat rear deck.",
  "No badges, no logos, no numberplate, no text anywhere on the car or in the frame.",
  "Set: a blacked-out cyclorama studio on a matte black floor, nothing else in the room.",
  "Lighting: two large soft overhead strip softboxes raking the length of the body, one cool rim",
  "light from behind the rear quarter, deep black falloff everywhere else.",
  "Framing: front three-quarter view, the car facing left, the entire car inside the frame with",
  "clean empty black space above the roof for a headline.",
  "Colour-neutral, no colour cast, no people, no equipment reflections, no background objects.",
].join(" ");

/* Every follow-up says the same thing: hold everything, change one property. */
const HOLD =
  "Identical car, identical pose, identical framing, identical lighting, identical camera position. " +
  "Nothing in the frame moves or changes shape.";

const GREY =
  "The car is painted a flat neutral mid-grey, an even 50 percent grey with no colour tint at all, " +
  "so the surface reads purely as light and shade.";

const JOBS = [
  {
    key: "grey",
    file: "01-grey.png",
    base: true,
    scene: GREY + " The finish is a clean automotive gloss, wet and reflective, with a crisp specular highlight running the length of the shoulder line.",
  },
  {
    key: "dark",
    file: "02-dark.png",
    scene: HOLD + " Only the paint colour changes: the car is now painted near-black, a very dark charcoal, same gloss finish. " +
           "The wheels, tyres, glass, lights, grilles and floor stay exactly as they are.",
  },
  {
    key: "satin",
    file: "03-satin.png",
    scene: HOLD + " " + GREY + " Only the surface finish changes: it is now a satin wrap finish with a soft low sheen, " +
           "highlights broad and diffused, no mirror reflections anywhere on the body.",
  },
  {
    key: "matte",
    file: "04-matte.png",
    scene: HOLD + " " + GREY + " Only the surface finish changes: it is now a completely flat matte wrap finish with no specular " +
           "highlights at all, the body reading purely as shape and shadow.",
  },
  {
    key: "metallic",
    file: "05-metallic.png",
    scene: HOLD + " " + GREY + " Only the surface finish changes: it is now a metallic wrap finish with fine metal flake suspended " +
           "in the film, sparkling under the strip lights, highlights tight and glittering.",
  },
  {
    key: "chrome",
    file: "06-chrome.png",
    scene: HOLD + " Only the surface finish changes: the body is now a full mirror chrome wrap, polished liquid metal reflecting the " +
           "studio, with a hard horizon line running across the flank where the bright ceiling meets the black floor. " +
           "The wheels, tyres, glass and lights stay exactly as they are.",
  },
  {
    key: "carbon",
    file: "07-carbon.png",
    scene: HOLD + " Only the surface finish changes: the body is now wrapped in exposed 2x2 twill carbon fibre under a gloss clear coat, " +
           "the woven diagonal pattern clearly visible across every panel and following the curvature of the bodywork.",
  },
  {
    key: "shift",
    file: "08-shift.png",
    scene: HOLD + " Only the surface finish changes: the body is now a colour-shift chameleon wrap, the panels turning between two " +
           "different hues as the angle changes across the car, bright where the light rakes and deep where it falls away.",
  },
];

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const onlyIdx = argv.indexOf("--only");
const only = onlyIdx > -1 ? argv[onlyIdx + 1] : null;

fs.mkdirSync(OUT, { recursive: true });

function kie(args) {
  execFileSync("node", [KIE, ...args], { stdio: "inherit", cwd: SITE });
}

const base = JOBS.find((j) => j.base);
const basePath = path.join(OUT, base.file);

for (const job of JOBS) {
  if (only && job.key !== only) continue;
  const dest = path.join(OUT, job.file);
  if (fs.existsSync(dest) && !force) {
    console.log(`skip ${job.file} (exists)`);
    continue;
  }
  const prompt = `${PREAMBLE}\n\n${job.scene}`;
  const args = ["still", prompt, dest, "--ar", "16:9"];
  // everything after the base plate is an edit of it, so the pose holds
  if (!job.base) {
    if (!fs.existsSync(basePath)) {
      throw new Error(`base plate missing: ${basePath}. Generate it first (no --only, or --only grey).`);
    }
    args.push("--ref", basePath);
  }
  console.log(`\n--- ${job.file} ---`);
  kie(args);
}

console.log("\nDone. Look at every PNG in out/ before processing:");
console.log("  node tools/process.mjs");
