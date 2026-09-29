/**
 * Stand-in plates, rendered from car-fallback.svg in Chromium.
 *
 * These are NOT the deliverable. They exercise the exact pipeline the kie.ai
 * plates will go through (neutral mid-grey base, near-black twin for the mask,
 * one plate per finish) so that process.mjs and the page compositing are proven
 * before any credits are spent.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const SITE = '/home/user/scroll-craft/sites/cool-guys-wrap';
const OUT = `${SITE}/out`;
const svg = fs.readFileSync(`${SITE}/car-fallback.svg`, 'utf8');

// the finish CSS that used to live in the page, now only needed to bake plates
const FINISH_CSS = `
.fx{opacity:0}
.fx-shade{opacity:1}
svg[data-finish="gloss"] .fx-gloss, svg[data-finish="satin"] .fx-satin,
svg[data-finish="matte"] .fx-matte, svg[data-finish="metallic"] .fx-metallic,
svg[data-finish="chrome"] .fx-chrome, svg[data-finish="carbon"] .fx-carbon,
svg[data-finish="shift"] .fx-shift{opacity:1}
svg[data-finish="matte"] .fx-shade{opacity:.45}
svg[data-finish="chrome"] .fx-shade{opacity:.2}
.sweep{transform:translateX(520px)}
svg[data-finish="gloss"] .sweep{filter:blur(5px);opacity:.92}
svg[data-finish="satin"] .sweep{filter:blur(17px);opacity:.5}
svg[data-finish="matte"] .sweep{filter:blur(34px);opacity:.2}
svg[data-finish="metallic"] .sweep{filter:blur(9px);opacity:.75}
svg[data-finish="chrome"] .sweep{filter:blur(2px);opacity:1}
svg[data-finish="carbon"] .sweep{filter:blur(7px);opacity:.7}
svg[data-finish="shift"] .sweep{filter:blur(8px);opacity:.72}
#gShift .shift-a{stop-color:var(--wrap-2);stop-opacity:0}
#gShift .shift-b{stop-color:var(--wrap-2);stop-opacity:.82}
#gShift .shift-c{stop-color:var(--wrap-2);stop-opacity:.24}
.paint{fill:var(--wrap)}
.glass{fill:url(#gGlass)} .trim{fill:#0B0C0E} .trim-2{fill:#131519}
.mesh{fill:url(#pMesh)} .caliper{fill:#9AA0A6}
.seam{fill:none;stroke:rgba(0,0,0,.42);stroke-width:2;stroke-linecap:round}
`;

// 16:9 frame, matching what seedream returns for --ar 16:9
const W = 2432, H = 1368;

function page(wrap, finish) {
  return `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;background:#000;width:${W}px;height:${H}px;overflow:hidden}
  :root{--wrap:${wrap};--wrap-2:#888}
  .frame{width:${W}px;height:${H}px;display:grid;place-items:center}
  svg{width:${Math.round(W * 0.92)}px;height:auto;display:block}
  ${FINISH_CSS}
  </style><div class="frame">${svg.replace('data-finish="gloss"', `data-finish="${finish}"`)}</div>`;
}

const JOBS = [
  ['01-grey.png', '#808080', 'gloss'],
  ['02-dark.png', '#141414', 'gloss'],
  ['03-satin.png', '#808080', 'satin'],
  ['04-matte.png', '#808080', 'matte'],
  ['05-metallic.png', '#808080', 'metallic'],
  ['06-chrome.png', '#808080', 'chrome'],
  ['07-carbon.png', '#808080', 'carbon'],
  ['08-shift.png', '#808080', 'shift'],
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const p = await ctx.newPage();

for (const [file, wrap, finish] of JOBS) {
  await p.setContent(page(wrap, finish));
  await p.waitForTimeout(220);
  await p.screenshot({ path: `${OUT}/${file}` });
  console.log(file, wrap, finish);
}
await browser.close();
