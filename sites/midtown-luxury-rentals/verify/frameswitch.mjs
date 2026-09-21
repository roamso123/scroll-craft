import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await b.newPage({viewport:{width:1440,height:900}});
const bad=[]; p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url().split('/').pop())});
await p.goto('http://127.0.0.1:4500/index.html',{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
const r=await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('.obj').forEach(o=>{
    const img=o.querySelector('.obj__frame img');
    const btns=[...o.querySelectorAll('.frames__b')];
    btns.forEach(bt=>bt.click());
    const last=btns[btns.length-1];
    out.push({car:o.dataset.car, frames:btns.map(x=>x.textContent).join('/'),
      srcNow:img.getAttribute('src').split('/').pop(), altNow:img.alt.slice(0,50),
      pressed:btns.filter(x=>x.getAttribute('aria-pressed')==='true').length});
    btns[0].click();
  });
  return out;
});
r.forEach(x=>console.log(JSON.stringify(x)));
await p.waitForTimeout(600);
console.log('bad responses:', bad.length?bad:'none');
await p.close(); await b.close();
