#!/usr/bin/env node
/**
 * Cool Guys Wrap - turn the raw generations into web assets.
 *
 *   node tools/process.mjs [--gamma 1.0] [--width 2000]
 *
 * Two jobs.
 *
 * 1. THE PAINT MASK. 01-grey and 02-dark are the same car in the same light,
 *    repainted. Subtract one from the other and what is left is exactly the
 *    paint: high where the body responds strongly to a colour change, low on
 *    a blown specular (which should stay white whatever the colour), low on
 *    glass, tyres and floor, zero on the background. That map is not a cutout,
 *    it is a tint-strength map, which is what a repaint actually wants.
 *
 * 2. ENCODING. Each finish plate goes out as webp at a desktop and a phone
 *    width. The masks ship as 8-bit greyscale png.
 *
 * Also reports per-plate drift against the base, because every plate shares
 * one mask and a pose that moved makes the tint sit off the car.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, "..");
const OUT = path.join(SITE, "out");
const ASSETS = path.join(SITE, "assets");

const argv = process.argv.slice(2);
const num = (name, dflt) => {
  const i = argv.indexOf(name);
  return i > -1 && argv[i + 1] ? Number(argv[i + 1]) : dflt;
};
const GAMMA = num("--gamma", 1.0);
const W_DESK = num("--width", 2000);
const W_PHONE = 1000;

const PLATES = [
  ["gloss",    "01-grey.png"],
  ["satin",    "03-satin.png"],
  ["matte",    "04-matte.png"],
  ["metallic", "05-metallic.png"],
  ["chrome",   "06-chrome.png"],
  ["carbon",   "07-carbon.png"],
  ["shift",    "08-shift.png"],
];

fs.mkdirSync(ASSETS, { recursive: true });

const p = (f) => path.join(OUT, f);
function need(f) {
  if (!fs.existsSync(p(f))) throw new Error(`missing ${p(f)} - run tools/generate.mjs first`);
  return p(f);
}

/* ---------------------------------------------------------- the mask ---- */
const greyFile = need("01-grey.png");
const darkFile = need("02-dark.png");

const meta = await sharp(greyFile).metadata();
const { width, height } = meta;
console.log(`base plate ${width}x${height}`);

const rawGrey = await sharp(greyFile).removeAlpha().raw().toBuffer();
const rawDark = await sharp(darkFile).removeAlpha().resize(width, height, { fit: "fill" }).raw().toBuffer();

const n = width * height;
const mask = Buffer.alloc(n);
let maxDiff = 0;
const diffs = new Float32Array(n);

for (let i = 0; i < n; i++) {
  const o = i * 3;
  // luminance difference, which is what a repaint moves
  const lg = 0.2126 * rawGrey[o] + 0.7152 * rawGrey[o + 1] + 0.0722 * rawGrey[o + 2];
  const ld = 0.2126 * rawDark[o] + 0.7152 * rawDark[o + 1] + 0.0722 * rawDark[o + 2];
  const d = Math.max(0, lg - ld);
  diffs[i] = d;
  if (d > maxDiff) maxDiff = d;
}
console.log(`peak paint response: ${maxDiff.toFixed(1)}/255`);

for (let i = 0; i < n; i++) {
  let v = diffs[i] / (maxDiff || 1);
  // a small floor kills sensor noise in the black surround
  v = v < 0.06 ? 0 : (v - 0.06) / 0.94;
  if (GAMMA !== 1) v = Math.pow(v, GAMMA);
  mask[i] = Math.round(Math.min(1, v) * 255);
}

/* CSS mask-image keys on ALPHA, not luminance, so a greyscale png is silently
   inert: every pixel reads as fully opaque and nothing is masked at all. The
   failure is invisible on a black ground, because the blends that leak through
   mostly resolve to black anyway. Bake the map into the alpha channel. */
const rgba = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  rgba[i * 4] = 255;
  rgba[i * 4 + 1] = 255;
  rgba[i * 4 + 2] = 255;
  rgba[i * 4 + 3] = mask[i];
}
const maskImg = sharp(rgba, { raw: { width, height, channels: 4 } })
  .blur(1.2); // a half-pixel feather stops the tint edge crawling

await maskImg.clone().resize(W_DESK).png({ compressionLevel: 9 }).toFile(path.join(ASSETS, "mask.png"));
await maskImg.clone().resize(W_PHONE).png({ compressionLevel: 9 }).toFile(path.join(ASSETS, "mask-m.png"));
console.log("wrote assets/mask.png, assets/mask-m.png");

/* how much of the frame is paint - a sanity check on the mask */
let lit = 0;
for (let i = 0; i < n; i++) if (mask[i] > 24) lit++;
console.log(`paint covers ${((lit / n) * 100).toFixed(1)}% of the frame`);

/* ------------------------------------------------ drift + encoding ---- */
/* Both sides of the drift comparison must land on the same grid. Passing a
   null height with fit:"fill" leaves the height alone, which silently compares
   a thumbnail against the top slice of a full-height image. */
const TW = 320, TH = Math.round((320 * height) / width);
const thumb = (f) =>
  sharp(f).removeAlpha().resize(TW, TH, { fit: "fill" }).greyscale().raw().toBuffer();

const baseSmall = await thumb(greyFile);

for (const [key, file] of PLATES) {
  const src = need(file);

  // drift: mean absolute difference against the base at thumbnail scale.
  // Finish changes move it a lot on their own, so this only catches gross
  // pose shifts. Look at the plates as well.
  const small = await thumb(src);
  if (small.length !== baseSmall.length) throw new Error(`${file}: thumbnail size mismatch`);
  let sum = 0;
  for (let i = 0; i < small.length; i++) sum += Math.abs(small[i] - baseSmall[i]);
  const drift = sum / small.length;

  await sharp(src).resize(W_DESK).webp({ quality: 84 }).toFile(path.join(ASSETS, `car-${key}.webp`));
  await sharp(src).resize(W_PHONE).webp({ quality: 82 }).toFile(path.join(ASSETS, `car-${key}-m.webp`));

  const kb = (fs.statSync(path.join(ASSETS, `car-${key}.webp`)).size / 1024).toFixed(0);
  console.log(`car-${key}.webp  ${kb}KB   drift vs base ${drift.toFixed(1)}`);
}

/* ------------------------------------------ write the ratio back ---- */
/* seedream returns dimensions near the ratio you asked for rather than exactly
   it, so the page takes its aspect ratio from the file that actually shipped. */
const pagePath = path.join(SITE, "index.html");
const page = fs.readFileSync(pagePath, "utf8");
const ar = `${width}/${height}`;
const arRe = /--plate-ar:[^;]+;/;
if (!arRe.test(page)) {
  console.warn(`\nWARNING: no --plate-ar token in index.html (wanted ${ar})`);
} else {
  const patched = page.replace(arRe, `--plate-ar:${ar};`);
  if (patched !== page) fs.writeFileSync(pagePath, patched);
  console.log(`\nindex.html --plate-ar is ${ar}`);
}

console.log("\nDone. Look at assets/mask.png over a plate before shipping.");
