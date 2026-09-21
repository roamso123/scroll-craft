import { chromium } from 'playwright-core';
const exe='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const [w,h,tag,rm]=[+process.argv[2],+process.argv[3],process.argv[4],process.argv[5]==='rm'];
const b=await chromium.launch({executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,
  reducedMotion: rm?'reduce':'no-preference', isMobile:w<500, hasTouch:w<500});
await p.goto('http://127.0.0.1:4500/index.html',{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(800);
const H=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
const stops=[0,0.09,0.20,0.30,0.40,0.50,0.60,0.70,0.80,0.90,1];
for(const [i,f] of stops.entries()){
  await p.evaluate(v=>scrollTo(0,v),Math.round(H*f)); await p.waitForTimeout(950);
  await p.screenshot({path:`verify/out/${tag}-${String(i).padStart(2,'0')}.png`});
}
await b.close();
