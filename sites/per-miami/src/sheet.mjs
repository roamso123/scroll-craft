/* Contact sheet builder.
   shoot.mjs writes one PNG per scroll position and stitches them with ffmpeg;
   there is no full ffmpeg on this machine, so the sheet is composited here
   instead. Looking at the frames side by side is the whole point of shooting
   contiguously, and a folder of PNGs does not get looked at that way.

   node src/sheet.mjs lab/shots [cols] [thumbWidth]
*/
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] || "lab/shots";
const cols = +(process.argv[3] || 4);
const tw = +(process.argv[4] || 460);

const files = readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort();
if (!files.length) { console.error("no frames in " + dir); process.exit(1); }

const first = await sharp(join(dir, files[0])).metadata();
const th = Math.round((first.height / first.width) * tw);
const rows = Math.ceil(files.length / cols);
const gap = 8, pad = 8, labelH = 18;

const W = pad * 2 + cols * tw + (cols - 1) * gap;
const H = pad * 2 + rows * (th + labelH) + (rows - 1) * gap;

const tiles = [];
for (let i = 0; i < files.length; i++) {
  const x = pad + (i % cols) * (tw + gap);
  const y = pad + Math.floor(i / cols) * (th + labelH + gap);
  tiles.push({
    input: await sharp(join(dir, files[i])).resize({ width: tw }).png().toBuffer(),
    left: x, top: y + labelH
  });
  const n = files[i].replace(".png", "");
  tiles.push({
    input: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${labelH}">
         <text x="2" y="13" font-family="monospace" font-size="12" fill="#8FA">${n}</text>
       </svg>`),
    left: x, top: y
  });
}

const out = join(dir, "sheet.png");
await sharp({ create: { width: W, height: H, channels: 3, background: "#101418" } })
  .composite(tiles).png().toFile(out);
console.log(`${out}  ${W}x${H}  ${files.length} frames, ${cols} across`);
