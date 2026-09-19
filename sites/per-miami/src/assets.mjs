/* Asset pipeline for the PER Miami build.
   Inputs are the owner's own photographs and logo, so nothing is generated.
   Run: node src/assets.mjs            (from the build folder)

   Three jobs:
     1  wordmark   key the black studio ground off the logo, keep the gradient
     2  objects    upscale + grade each car photo, write webp at two widths
     3  hero       cut the hero car out, rebuild the plate behind it
*/
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const UP = "/root/.claude/uploads/68cdc8f5-88a0-5e36-a7ca-2d78d8ac28c4";
const OUT = "assets";
mkdirSync(OUT, { recursive: true });
mkdirSync("lab", { recursive: true });   // the inspection sheets this pipeline writes

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/* ------------------------------------------------------------ 1  wordmark */
async function wordmark() {
  const src = `${UP}/f8d630c1-image.jpg`;
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.alloc(w * h * 4);
  let minX = w, minY = h, maxX = 0, maxY = 0;

  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    const p = i * ch;
    const r = data[p], g = data[p + 1], b = data[p + 2];
    // The ground is black, the glyphs are a green-to-blue gradient, so
    // luminance alone separates them. Unpremultiply so the antialiased edge
    // pixels keep the glyph's own colour instead of a muddied dark version.
    const a = Math.max(0, Math.min(1, (luma(r, g, b) - 6) / 30));
    const k = a > 0.08 ? 1 / a : 1;
    out[j] = Math.min(255, r * k);
    out[j + 1] = Math.min(255, g * k);
    out[j + 2] = Math.min(255, b * k);
    out[j + 3] = Math.round(a * 255);
    if (a > 0.5) {
      const x = i % w, y = (i / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const pad = 2;
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  const cw = Math.min(w - left, maxX - minX + pad * 2);
  const chh = Math.min(h - top, maxY - minY + pad * 2);

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: cw, height: chh })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/per-wordmark.png`);
  console.log(`wordmark  ${cw}x${chh}  (from ${w}x${h})`);
  return { width: cw, height: chh };
}

/* ------------------------------------------------------------- 2  objects */
const CARS = [
  { id: "macan", file: "2639e140-image.png" },
  { id: "s5", file: "91ba7fe9-image.jpg" },
  { id: "grecale", file: "14fbb03d-image.jpg" },
  { id: "escalade", file: "550c8d67-image.png" },
  { id: "cullinan", file: "568751c0-image.png" },
];

async function objects() {
  for (const c of CARS) {
    const base = sharp(`${UP}/${c.file}`)
      .resize({ width: 1400, kernel: sharp.kernel.lanczos3 })
      // The sources are 560px phone frames. Upscaling buys layout room, not
      // detail, so the grade is deliberately restrained: a small contrast lift
      // and one sharpen pass, nothing that turns grain into edges.
      .modulate({ saturation: 1.04, brightness: 1.0 })
      .linear(1.06, -6)
      .sharpen({ sigma: 0.8, m1: 0.4, m2: 0.7 });
    await base.clone().webp({ quality: 88 }).toFile(`${OUT}/${c.id}.webp`);
    await base.clone().resize({ width: 780 }).webp({ quality: 84 }).toFile(`${OUT}/${c.id}-m.webp`);
    const meta = await sharp(`${OUT}/${c.id}.webp`).metadata();
    console.log(`object    ${c.id.padEnd(9)} ${meta.width}x${meta.height}`);
  }
}

/* ---------------------------------------------------------------- 3  hero
   The hero car has to move independently of the deck behind it, which needs
   two things the photograph does not have: an alpha cutout, and a plate with
   the car removed. Both are derived here rather than hand-traced.

   The key is a luminance one. It works on this frame because the subject is a
   near-black car against a bright sky, a bright concrete barrier and a pale
   deck: the only other dark regions are the treeline and a few windows, and
   they are separate components.
*/
function connectedMask(mask, w, h) {
  // largest 4-connected component of mask (1 = candidate subject)
  const label = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  let best = { id: -1, size: 0 }, id = 0;
  for (let s = 0; s < w * h; s++) {
    if (mask[s] !== 1 || label[s] !== -1) continue;
    let sp = 0, size = 0;
    stack[sp++] = s; label[s] = id;
    while (sp) {
      const p = stack[--sp]; size++;
      const x = p % w, y = (p / w) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const n of nb) if (n >= 0 && mask[n] === 1 && label[n] === -1) { label[n] = id; stack[sp++] = n; }
    }
    if (size > best.size) best = { id, size };
    id++;
  }
  const out = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) if (label[s] === best.id) out[s] = 1;
  return { out, size: best.size };
}

function fillHoles(mask, w, h) {
  // any background-labelled pixel that cannot reach the border through
  // background is a hole inside the subject (windows, reflections, grille gaps)
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  const push = (p) => { if (!seen[p] && !mask[p]) { seen[p] = 1; stack[sp++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp) {
    const p = stack[--sp];
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  const out = new Uint8Array(mask);
  for (let p = 0; p < w * h; p++) if (!mask[p] && !seen[p]) out[p] = 1;
  return out;
}

function dilate(mask, w, h, r) {
  let cur = mask;
  for (let i = 0; i < r; i++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (cur[p]) continue;
      if ((x > 0 && cur[p - 1]) || (x < w - 1 && cur[p + 1]) ||
          (y > 0 && cur[p - w]) || (y < h - 1 && cur[p + w])) next[p] = 1;
    }
    cur = next;
  }
  return cur;
}

function erode(mask, w, h, r) {
  let cur = mask;
  for (let i = 0; i < r; i++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!cur[p]) continue;
      if ((x > 0 && !cur[p - 1]) || (x < w - 1 && !cur[p + 1]) ||
          (y > 0 && !cur[p - w]) || (y < h - 1 && !cur[p + w])) next[p] = 0;
    }
    cur = next;
  }
  return cur;
}

async function hero({ file, id, threshold, minY = 0, open = 3 }) {
  const src = sharp(`${UP}/${file}`).resize({ width: 1400, kernel: sharp.kernel.lanczos3 });
  const { data, info } = await src.clone().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  const cand = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch;
    const y = (p / w) | 0;
    if (y < minY * h) continue; // the treeline and the skyline sit above the car
    if (luma(data[i], data[i + 1], data[i + 2]) < threshold) cand[p] = 1;
  }
  // An opening first: the dark line along the base of the barrier wall is a
  // few pixels tall and bridges the car to half the frame, so labelling the
  // raw threshold returns the wall as part of the subject. Eroding breaks the
  // bridge, the component picks up the car alone, and dilating restores the
  // silhouette it just lost.
  const opened = erode(cand, w, h, open);
  const { out: core, size } = connectedMask(opened, w, h);
  const car = dilate(core, w, h, open);
  const solid = fillHoles(car, w, h);

  // bbox of the subject
  let minX = w, maxX = 0, minYY = h, maxYY = 0;
  for (let p = 0; p < w * h; p++) if (solid[p]) {
    const x = p % w, y = (p / w) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minYY) minYY = y; if (y > maxYY) maxYY = y;
  }
  console.log(`hero      ${id} mask ${size}px  bbox ${minX},${minYY} ${maxX - minX}x${maxYY - minYY}`);

  /* the cutout: soft alpha from the solid mask, cropped to the bbox */
  const pad = 6;
  const left = Math.max(0, minX - pad), top = Math.max(0, minYY - pad);
  const cw = Math.min(w - left, maxX - minX + pad * 2), chh = Math.min(h - top, maxYY - minYY + pad * 2);
  const alpha = Buffer.alloc(w * h);
  for (let p = 0; p < w * h; p++) alpha[p] = solid[p] ? 255 : 0;
  // sharp promotes a 1-channel raw buffer to 3 channels, so read the stride
  // back rather than assuming it: indexing a 3-channel buffer as if it were
  // 1-channel reads the top third of the frame and keys the subject away.
  const soft = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .blur(1.1).raw().toBuffer({ resolveWithObject: true });
  const softAlpha = soft.data, sch = soft.info.channels;

  const rgba = Buffer.alloc(w * h * 4);
  for (let p = 0, j = 0; p < w * h; p++, j += 4) {
    const i = p * ch;
    rgba[j] = data[i]; rgba[j + 1] = data[i + 1]; rgba[j + 2] = data[i + 2];
    // pull the alpha in slightly so the key does not carry a light matte line
    rgba[j + 3] = Math.max(0, Math.min(255, (softAlpha[p * sch] - 40) * 1.35));
  }
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: cw, height: chh })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${id}-subject.png`);

  /* the plate: the same frame with the subject painted out by interpolating
     each row between its nearest surviving pixels. The deck, the barrier and
     the sky are all horizontal bands here, so a row-wise fill rebuilds them
     without a visible patch, and the cutout covers most of it anyway. */
  const gone = dilate(solid, w, h, 5);
  const plate = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const p = row + x, i = p * ch, j = p * 3;
      if (!gone[p]) { plate[j] = data[i]; plate[j + 1] = data[i + 1]; plate[j + 2] = data[i + 2]; continue; }
      let l = x, r = x;
      while (l >= 0 && gone[row + l]) l--;
      while (r < w && gone[row + r]) r++;
      const lp = l >= 0 ? (row + l) * ch : -1, rp = r < w ? (row + r) * ch : -1;
      const t = lp >= 0 && rp >= 0 ? (x - l) / (r - l) : rp >= 0 ? 1 : 0;
      for (let c = 0; c < 3; c++) {
        const a = lp >= 0 ? data[lp + c] : data[rp + c];
        const b = rp >= 0 ? data[rp + c] : data[lp + c];
        plate[j + c] = a + (b - a) * t;
      }
    }
  }
  const plateImg = sharp(plate, { raw: { width: w, height: h, channels: 3 } })
    .modulate({ saturation: 1.02 }).linear(1.04, -4);
  await plateImg.clone().webp({ quality: 86 }).toFile(`${OUT}/${id}-plate.webp`);
  await plateImg.clone().resize({ width: 820 }).webp({ quality: 82 }).toFile(`${OUT}/${id}-plate-m.webp`);

  /* the mask itself, for when the key picks up something it should not */
  const dbg = Buffer.alloc(w * h * 3);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch, j = p * 3;
    const lit = solid[p] ? 1 : 0;
    dbg[j] = lit ? 255 : data[i] * 0.35;
    dbg[j + 1] = lit ? 0 : data[i + 1] * 0.35;
    dbg[j + 2] = lit ? 170 : data[i + 2] * 0.35;
  }
  await sharp(dbg, { raw: { width: w, height: h, channels: 3 } })
    .resize({ width: 700 }).png().toFile(`lab/${id}-mask-check.png`);

  /* an inspection sheet: the cutout over magenta, so edge defects show */
  await sharp({ create: { width: cw, height: chh, channels: 4, background: "#ff00aa" } })
    .composite([{ input: `${OUT}/${id}-subject.png` }])
    .png().toFile(`lab/${id}-cutout-check.png`);
}

/* --------------------------------------------------------- 4  hero planes
   What the hero actually ships. The car stays inside its photograph: at a
   560px source a keyed cutout upscales into a soft matte, which reads cheap
   next to the frame it is supposed to break out of (see lab/macan-cutout-
   check.png for the evidence). Depth comes from the scene around the plate
   instead, and every plane below is a real key or a real crop of the owner's
   own frame:

     sky       a gradient, authored in CSS, furthest back
     skyline   the deck's far wall and the building behind it, keyed off the
               sky, so it is a genuine alpha silhouette and not a rectangle
     plate     the photograph itself, in its frame, pushing in as it travels
     deck      the parking deck in front of the plate, overlapping its corner
*/
async function heroPlanes() {
  const src = sharp(`${UP}/2639e140-image.png`).resize({ width: 1800, kernel: sharp.kernel.lanczos3 });
  const { data, info } = await src.clone().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  /* skyline: rows through the horizon, with the sky keyed away. The sky is a
     smooth blue with a strong blue-over-red bias; concrete, limestone and
     treeline all sit the other side of that line, which makes this key far
     more reliable than a subject key. */
  // The band stops above the car's roofline on purpose. Navy paint carries the
  // same blue bias the sky does, so a band that reaches the roof keys the roof
  // away; the deck's barrier wall belongs to the plate photograph instead.
  const top = Math.round(h * 0.175), band = Math.round(h * 0.16);
  const sky = Buffer.alloc(w * band * 4);
  for (let y = 0; y < band; y++) for (let x = 0; x < w; x++) {
    const p = ((y + top) * w + x) * ch, j = (y * w + x) * 4;
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const blueBias = b - r;                       // ~40+ in open sky, <18 on the wall
    const t = Math.max(0, Math.min(1, (blueBias - 20) / 14));
    sky[j] = r; sky[j + 1] = g; sky[j + 2] = b;
    sky[j + 3] = Math.round((1 - t) * 255);
  }
  // lossy webp with alpha: these two planes are the heaviest things in the
  // hero, and as PNGs they were 0.9MB of the page's 2.1MB of assets
  await sharp(sky, { raw: { width: w, height: band, channels: 4 } })
    .webp({ quality: 84, alphaQuality: 90 }).toFile(`${OUT}/hero-skyline.webp`);
  await sharp(`${OUT}/hero-skyline.webp`)
    .flatten({ background: "#ff00aa" })
    .resize({ width: 900 }).png().toFile("lab/skyline-check.png");
  console.log(`plane     skyline   ${w}x${band}`);

  /* deck: the foreground. Opaque from its first row down, per the layered-hero
     rule that a plane must be solid below its silhouette, with only the top
     edge softened so it beds into the plate rather than cutting across it. */
  // below 0.80 the frame is clean deck: any higher and the strip carries the
  // car's own bumper and shadow, which would put a second car in front of the
  // first one. A foreground plane may not duplicate its subject.
  const dTop = Math.round(h * 0.855), dH = h - dTop;
  const deck = Buffer.alloc(w * dH * 4);
  for (let y = 0; y < dH; y++) for (let x = 0; x < w; x++) {
    const p = ((y + dTop) * w + x) * ch, j = (y * w + x) * 4;
    deck[j] = data[p]; deck[j + 1] = data[p + 1]; deck[j + 2] = data[p + 2];
    deck[j + 3] = Math.round(Math.min(1, y / (dH * 0.30)) * 255);
  }
  await sharp(deck, { raw: { width: w, height: dH, channels: 4 } })
    .modulate({ saturation: 0.86, brightness: 0.62 })
    .webp({ quality: 84, alphaQuality: 90 }).toFile(`${OUT}/hero-deck.webp`);
  console.log(`plane     deck      ${w}x${dH}`);
}

const which = process.argv[2] || "all";
if (which === "all" || which === "wordmark") await wordmark();
if (which === "all" || which === "objects") await objects();
if (which === "all" || which === "planes") await heroPlanes();
// kept for the record: the cutout route this build rejected, and its evidence
if (which === "cutout") {
  await hero({ file: "2639e140-image.png", id: "macan", threshold: 78, minY: 0.32 });
}
