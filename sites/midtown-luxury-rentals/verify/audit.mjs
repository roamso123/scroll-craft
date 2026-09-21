import { chromium } from 'playwright-core';
const exe='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch({executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage']});
for (const vp of [{width:1440,height:900},{width:390,height:844}]) {
  const p=await b.newPage({viewport:vp,deviceScaleFactor:1,isMobile:vp.width<500,hasTouch:vp.width<500});
  await p.goto('http://127.0.0.1:4500/index.html',{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
  const m=await p.evaluate(()=>{
    const s=document.getElementById('sheet'), r=s.getBoundingClientRect();
    const kids=[...s.children].map(c=>({c:c.className,h:Math.round(c.getBoundingClientRect().height),t:Math.round(c.getBoundingClientRect().top)}));
    return {sheetH:Math.round(r.height), sheetTop:Math.round(r.top), vh:innerHeight, kids,
      figsBottom: Math.round(s.querySelector('.sheet__figs').getBoundingClientRect().bottom),
      hOverflow: document.documentElement.scrollWidth - innerWidth};
  });
  console.log(vp.width, JSON.stringify(m));
  // open the booking survey and walk it
  await p.click('.arrival__card [data-book]');
  await p.waitForTimeout(400);
  const step1=await p.evaluate(()=>({open:document.getElementById('bookDialog').open, veh:document.getElementById('fVehicle').value, svc:document.querySelector('input[name=service]:checked')?.value}));
  console.log('  step1', JSON.stringify(step1));
  await p.click('#nextBtn'); await p.waitForTimeout(250);
  console.log('  after next w/o dates:', await p.evaluate(()=>document.getElementById('stepName').textContent));
  // fill step 2 badly (dropoff before pickup)
  await p.fill('#fPickDate','2026-10-01'); await p.fill('#fPickTime','10:00');
  await p.fill('#fDropDate','2026-10-01'); await p.fill('#fDropTime','12:00');
  await p.click('#nextBtn'); await p.waitForTimeout(250);
  console.log('  24h rule:', await p.evaluate(()=>document.getElementById('bookErr').hidden?'(none)':document.getElementById('bookErr').textContent));
  await p.fill('#fDropDate','2026-10-03');
  await p.check('input[name=pickupWhere][value=Delivery]'); await p.waitForTimeout(150);
  await p.click('#nextBtn'); await p.waitForTimeout(250);
  console.log('  addr rule:', await p.evaluate(()=>document.getElementById('bookErr').hidden?'(none)':document.getElementById('bookErr').textContent));
  await p.fill('#fPickAddr','12 Main St, Huntington, NY 11743');
  await p.click('#nextBtn'); await p.waitForTimeout(250);
  console.log('  step3:', await p.evaluate(()=>document.getElementById('stepName').textContent));
  await p.fill('#fName','Alex Rivera'); await p.fill('#fPhone','(631) 555-0134'); await p.fill('#fEmail','alex@example.com');
  await p.click('#nextBtn'); await p.waitForTimeout(350);
  const rev=await p.evaluate(()=>({step:document.getElementById('stepName').textContent,
     rows:[...document.querySelectorAll('#reviewList div')].map(d=>d.querySelector('dt').textContent+': '+d.querySelector('dd').textContent),
     sms:document.getElementById('sendSms').href.slice(0,60)}));
  console.log('  review:', rev.step); rev.rows.forEach(r=>console.log('    '+r));
  console.log('  sms:', rev.sms);
  await p.screenshot({path:`verify/out/book-${vp.width}.png`});
  await p.close();
}
await b.close();
