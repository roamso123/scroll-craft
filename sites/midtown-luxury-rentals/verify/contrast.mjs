import { chromium } from 'playwright-core';
const exe='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch({executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage']});
for (const vp of [{width:1440,height:900},{width:390,height:844}]) {
const p=await b.newPage({viewport:vp,deviceScaleFactor:1});
await p.goto('http://127.0.0.1:4500/index.html',{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
// hide the copy, photograph the frame beneath it, sample the brightest pixel under each line
const out=await p.evaluate(async ()=>{
  const targets=[...document.querySelectorAll('.arrival__card h1, .arrival__card h2, .arrival__card .spec dd, .arrival__card .rate, .bar__mark span')];
  const boxes=targets.map(t=>({sel:t.tagName+'.'+(t.className||'')+' “'+t.textContent.trim().slice(0,22)+'”',
     r:t.getBoundingClientRect(), col:getComputedStyle(t).color}));
  return boxes.map(x=>({sel:x.sel,col:x.col,x:Math.round(x.r.left),y:Math.round(x.r.top),w:Math.round(x.r.width),h:Math.round(x.r.height)}));
});
const card=await p.$('.arrival__card');
await p.evaluate(()=>{document.querySelector('.arrival__card').style.visibility='hidden';
  document.querySelector('.bar__mark span').style.visibility='hidden';});
await p.waitForTimeout(120);
const buf=await p.screenshot();
await p.evaluate(()=>{document.querySelector('.arrival__card').style.visibility='';
  document.querySelector('.bar__mark span').style.visibility='';});
// decode png without a lib: use the browser
const b64=buf.toString('base64');
const res=await p.evaluate(async ({b64,out})=>{
  const img=new Image(); img.src='data:image/png;base64,'+b64;
  await img.decode();
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
  c.getContext('2d').drawImage(img,0,0);
  const ctx=c.getContext('2d');
  const lin=v=>{v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
  const L=(r,g,bb)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(bb);
  const parse=s=>s.match(/\d+/g).slice(0,3).map(Number);
  return out.map(o=>{
    if(o.w<1||o.h<1) return {sel:o.sel,ratio:'n/a'};
    const d=ctx.getImageData(Math.max(0,o.x),Math.max(0,o.y),Math.min(o.w,img.width-o.x),Math.min(o.h,img.height-o.y)).data;
    let maxL=0,minL=1;
    for(let i=0;i<d.length;i+=4){const l=L(d[i],d[i+1],d[i+2]); if(l>maxL)maxL=l; if(l<minL)minL=l;}
    const [r,g,bb]=parse(o.col); const fg=L(r,g,bb);
    const worst=Math.min((Math.max(fg,maxL)+0.05)/(Math.min(fg,maxL)+0.05),(Math.max(fg,minL)+0.05)/(Math.min(fg,minL)+0.05));
    return {sel:o.sel,ratio:worst.toFixed(2)};
  });
},{b64,out});
console.log('--- '+vp.width);
res.forEach(r=>console.log('  '+r.ratio.padStart(6)+'  '+r.sel));
await p.close();
}
await b.close();
