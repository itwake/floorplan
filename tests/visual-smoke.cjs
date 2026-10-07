'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const runtime = process.env.FLOORPLAN_NODE_MODULES || 'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright')); }
const base = process.env.FLOORPLAN_BASE_URL || 'http://127.0.0.1:4190';
const out = path.resolve(process.env.FLOORPLAN_SCREENSHOT_DIR || path.join(__dirname, '..', '..', 'qa-floorplan-20261007'));
const executablePath = process.env.FLOORPLAN_CHROME || [chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const timeout = 60000;

(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const screenshots = [], errors = [];
  try {
    for (const mode of process.argv.includes('--phone-only') ? ['phone'] : ['desktop','phone']) {
      const context = await browser.newContext(mode === 'phone' ? {viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true} : {viewport:{width:1440,height:1000}});
      const page = await context.newPage();
      page.setDefaultTimeout(timeout);
      page.on('pageerror', e => {errors.push(mode+': '+e.message);console.error('pageerror',mode,e.message);});
      for (const scheme of mode === 'phone' || process.argv.includes('--family-only') ? ['family'] : ['wood','family','laundry']) {
        await page.goto(`${base}/?scheme=${scheme}`,{waitUntil:'networkidle',timeout});
        await page.waitForFunction(() => document.querySelectorAll('#gFurn > .furn').length>0,null,{timeout});
        const two = path.join(out,`${mode}-${scheme}-2d.png`);
        await page.screenshot({path:two});screenshots.push(two);
        await page.waitForFunction(() => typeof window.View3D?.enter === 'function',null,{timeout});
        await page.locator('[data-view="3d"]').click();
        await page.waitForFunction(() => document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('#stage').classList.contains('animating'),null,{timeout});
        const expand = !await page.locator('[data-cut="1.2"]').isVisible();
        if(expand)await page.locator('#moreTools').click();
        await page.waitForTimeout(2000);
        await page.locator('[data-cut="1.2"]').click();
        if(expand)await page.locator('#moreTools').click();
        // Header collapse resizes and clears the WebGL canvas. Wait for an
        // actual painted scene, not just the transition CSS flag / labels.
        await page.waitForFunction(() => {
          const cv=document.querySelector('#view3d canvas');if(!cv?.width)return false;
          const probe=document.createElement('canvas');probe.width=64;probe.height=64;
          const g=probe.getContext('2d');g.drawImage(cv,0,0,64,64);
          const d=g.getImageData(0,0,64,64).data,colors=new Set();
          for(let i=0;i<d.length;i+=4)colors.add((d[i]<<16)|(d[i+1]<<8)|d[i+2]);
          return colors.size>20;
        },null,{timeout});
        const three = path.join(out,`${mode}-${scheme}-3d.png`);
        await page.screenshot({path:three});screenshots.push(three);
      }
      await context.close();
    }
    assert.equal(errors.length,0,errors.join('\n'));
    console.log(JSON.stringify({status:'PASS',screenshots,errors},null,2));
  } finally {await browser.close();}
})().catch(e => {console.error(e.stack||e);process.exitCode=1;});
