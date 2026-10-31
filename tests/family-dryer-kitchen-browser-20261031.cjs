'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_dryer-kitchen-qa.cjs'))('playwright'));}
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,''),dir=path.resolve(__dirname,'../../output/dryer-kitchen-20261031-qa');
const plans=require('../data/house-plans.js'),before=require('../tools/family-dryer-kitchen-20261031.cjs').beforeFamilyDryerKitchen(plans).schemes.family;
(async()=>{fs.mkdirSync(dir,{recursive:true});const errors=[],browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});
await page.goto(base+'/?scheme=family&v=dryer-kitchen-20261031',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>document.querySelectorAll('#gFurn > .furn').length>0,null,{timeout:60000});
const snap=()=>page.evaluate(()=>({objects:state.furniture.length,dryer:state.furniture.find(q=>q.id==='laundry_dryer'),point:state.furniture.find(q=>q.id==='family-elec-p36'),housing:state.furniture.some(q=>q.id==='family-dryer-kitchen-housing'),oldHousing:state.furniture.some(q=>q.id==='drawing-balcony-dryer-cabinet'),opening:HOUSE_PLAN.WIN_META.find(q=>q.id==='window_kitchen_balcony').lowerServiceOpeningMm,revision:HOUSE_PLAN.metadata.familyDryerKitchenUpdate.id,marked:!!document.querySelector('[data-dryer-use-zone]')}));
let current=await snap();assert.equal(current.objects,124);assert.deepEqual([current.dryer.cx,current.dryer.cy,current.dryer.rot],[7485,11460,180]);assert.deepEqual(current.opening,{x1:7145,x2:7825,bottom:0,top:870});assert.equal(current.point.cx,7926);assert.ok(current.housing&&!current.oldHousing&&current.marked);
await page.screenshot({path:path.join(dir,'plan.png')});console.log('2D and service opening passed');
async function seed(custom){await page.evaluate(({old,custom})=>{const s=structuredClone(state);s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>id!=='family-dryer-kitchen-20261031');const pt=s.furniture.find(q=>q.id==='family-elec-p36');if(custom){pt.cx+=40;pt.ownerNote='private point';}localStorage.setItem(STORE,JSON.stringify(s));},{old:before,custom});await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>state.appliedLayoutRevisions.includes('family-dryer-kitchen-20261031'));}
await seed(false);current=await snap();assert.equal(current.dryer.cy,11460);assert.equal(current.point.cx,7926);assert.ok(current.housing&&!current.oldHousing);
await seed(true);current=await snap();assert.equal(current.point.cx,7140);assert.equal(current.point.ownerNote,'private point');assert.equal(current.point.layoutCustomPlacementRevision,'family-dryer-kitchen-20261031');assert.equal(current.point.electricalDesign.anchor.kind,'window-sill');
console.log('Existing defaults migrate, and private P36 placement retains its anchor');
await page.evaluate(()=>localStorage.removeItem(STORE));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>state.furniture.length===124);
if(process.argv.includes('--migration-only')){assert.deepEqual(errors,[]);return;}
await page.locator('[data-view="3d"]').click({noWaitAfter:true,timeout:120000});
await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&Boolean(document.querySelector('#view3d canvas')),null,{timeout:120000});
await page.waitForFunction(()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const p=document.createElement('canvas');p.width=p.height=32;const g=p.getContext('2d');g.drawImage(c,0,0,32,32);const a=g.getImageData(0,0,32,32).data,s=new Set();for(let i=0;i<a.length;i+=4)s.add((a[i]<<16)|(a[i+1]<<8)|a[i+2]);return s.size>15;},null,{timeout:120000});
await page.waitForFunction(()=>window.View3D.focusBalconyRecess(),null,{timeout:120000});await page.waitForTimeout(1600);
await page.screenshot({path:path.join(dir,'dryer-3d.png'),timeout:120000});assert.deepEqual(errors,[]);console.log('PASS 3D dryer view',path.join(dir,'dryer-3d.png'));
}finally{await browser.close();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
