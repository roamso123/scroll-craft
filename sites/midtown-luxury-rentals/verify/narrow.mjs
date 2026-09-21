import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
for (const w of [320,390,768,1024,1440,1920]) {
  const p=await b.newPage({viewport:{width:w,height:800}});
  await p.goto('http://127.0.0.1:4500/index.html',{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
  const r=await p.evaluate(()=>({
    hOverflow: document.documentElement.scrollWidth - innerWidth,
    railOverflow: document.querySelector('.rail').scrollWidth - innerWidth,
    sheetH: Math.round(document.getElementById('sheet').getBoundingClientRect().height),
    sheetFits: document.getElementById('sheet').getBoundingClientRect().bottom <= innerHeight + 1,
    heroFits: document.querySelector('.arrival__card [data-book]').getBoundingClientRect().bottom
              < document.getElementById('sheet').getBoundingClientRect().top,
    hp: document.getElementById('figHp').textContent,
    doc:(document.documentElement.scrollHeight/innerHeight).toFixed(2)
  }));
  console.log(w, JSON.stringify(r));
  await p.close();
}
await b.close();
