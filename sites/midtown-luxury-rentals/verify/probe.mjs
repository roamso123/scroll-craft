import { chromium } from 'playwright-core';
const exe='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch({executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await p.goto('http://127.0.0.1:4500/index.html',{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
const info=await p.evaluate(()=>{
  const rail=document.querySelector('.rail');
  return {
    docH:(document.documentElement.scrollHeight/innerHeight).toFixed(2)+'vh',
    railScrollW:rail.scrollWidth, vw:innerWidth, overflow:rail.scrollWidth-innerWidth,
    pending:[...document.querySelectorAll('.is-pending')].map(e=>e.dataset.slot),
    carNodes:document.querySelectorAll('[data-car]').length,
    sheetName:document.getElementById('sheetName').textContent,
    figs:['figHp','figSixty','figSeats','figDrive'].map(i=>document.getElementById(i).textContent),
    h1:document.querySelector('h1').textContent,
    acts:[...document.querySelectorAll('[data-sc-act]')].map(e=>e.dataset.scAct+':'+(e.dataset.scSpan||'-')),
  };
});
console.log(JSON.stringify(info,null,1));
// walk the page, sample the sheet
const H=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
const samples=[];
for(let i=0;i<=16;i++){
  const y=Math.round(H*i/16);
  await p.evaluate(v=>scrollTo(0,v),y); await p.waitForTimeout(140);
  samples.push(await p.evaluate(()=>({n:document.getElementById('sheetName').textContent,hp:document.getElementById('figHp').textContent,s60:document.getElementById('figSixty').textContent})));
}
console.log(samples.map((s,i)=>i+' '+s.n+' | '+s.hp+'hp | '+s.s60).join('\n'));
console.log('ERRORS:',errs.length?errs:'none');
await b.close();
