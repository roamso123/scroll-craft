import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await b.newPage({viewport:{width:1100,height:760}});
await p.goto('http://127.0.0.1:4500/build-logo/preview.html',{waitUntil:'networkidle'});
await p.waitForTimeout(400);
await p.screenshot({path:'build-logo/preview.png'});
await b.close();
