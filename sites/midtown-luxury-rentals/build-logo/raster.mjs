import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const jobs=[
  ['assets/logo.svg','assets/logo.png',1400,3192/3504,true],
  ['assets/mark.svg','assets/mark.png',1400,1262/3011,true],
  ['assets/favicon.svg','assets/apple-touch-icon.png',180,1,false],
];
for(const [src,out,W,ratio,transparent] of jobs){
  const H=Math.round(W*ratio);
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
  await p.goto('http://127.0.0.1:4500/build-logo/raster.html?src=../'+src+'&w='+W+'&h='+H,{waitUntil:'networkidle'});
  await p.waitForTimeout(250);
  await p.screenshot({path:out, omitBackground:transparent});
  console.log(out, W+'x'+H);
  await p.close();
}
await b.close();
