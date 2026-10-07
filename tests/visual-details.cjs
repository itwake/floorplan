'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const runtime = process.env.FLOORPLAN_NODE_MODULES || 'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
const base=process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4190',out=path.resolve(process.env.FLOORPLAN_SCREENSHOT_DIR||path.join(__dirname,'..','..','qa-floorplan-20261007'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),screenshots=[];
  try{
    for(const focus of (process.argv.includes('--garage-only') ? [{id:'800-library-north',x:2880,y:12940,cut:2.8,north:true}] : [{id:'bay-living',x:2300,y:7450,cut:1.2},{id:'balcony',x:7400,y:10400,cut:1.2},{id:'800-library-north',x:2880,y:12940,cut:2.8,north:true}])){
      await page.goto(`${base}/?scheme=family`,{waitUntil:'networkidle',timeout:60000});
      await page.waitForFunction(()=>typeof window.View3D?.enter==='function',null,{timeout:60000});
      await page.evaluate(f=>{view.s=.21;view.x0=f.x-svg.clientWidth/(2*view.s);view.y0=f.y-svg.clientHeight/(2*view.s);applyView();},focus);
      await page.locator('[data-view="3d"]').click();
      await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('#stage').classList.contains('animating'),null,{timeout:60000});
      if(focus.cut<2)await page.locator('[data-cut="1.2"]').click();
      await page.locator('[data-t="labels"]').click();
      if(focus.north){
        const b=await page.locator('#view3d canvas').boundingBox(),x=b.x+b.width*.12,y=b.y+b.height*.42;
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+b.height*.5875,y-b.height*.13,{steps:24});await page.mouse.up();
        await page.waitForTimeout(800);
      }
      const p=path.join(out,`desktop-family-${focus.id}-detail.png`);await page.screenshot({path:p});screenshots.push(p);
    }
    console.log(JSON.stringify({status:'PASS',screenshots},null,2));
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
