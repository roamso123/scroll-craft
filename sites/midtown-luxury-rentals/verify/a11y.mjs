import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:4500/index.html',{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
const order=[];
for(let i=0;i<14;i++){ await p.keyboard.press('Tab');
  order.push(await p.evaluate(()=>{const a=document.activeElement;
    return a.tagName+(a.id?'#'+a.id:'')+' “'+(a.textContent||a.value||'').trim().slice(0,26)+'”';}));}
console.log('TAB ORDER:'); order.forEach((o,i)=>console.log(' '+(i+1)+' '+o));
// headings + landmarks
console.log('HEADINGS:', await p.evaluate(()=>[...document.querySelectorAll('h1,h2,h3')].map(h=>h.tagName+':'+h.textContent.trim().slice(0,32))));
console.log('imgs missing alt:', await p.evaluate(()=>[...document.images].filter(i=>!i.hasAttribute('alt')).length));
console.log('buttons w/o label:', await p.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length));
// index panel jumps
await p.click('#indexBtn'); await p.waitForTimeout(300);
console.log('index open:', await p.evaluate(()=>document.getElementById('indexPanel').open));
console.log('index rows:', await p.evaluate(()=>document.querySelectorAll('#indexPanel a').length));
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
console.log('esc closes:', await p.evaluate(()=>!document.getElementById('indexPanel').open));
await b.close();
