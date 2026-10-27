'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-drawing-qa.cjs'))('playwright'));}
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,''),dir=path.resolve(__dirname,'../../output/drawing-20261027-qa');
const plans=require('../data/house-plans.js'),before=require('../tools/family-drawing-20261027.cjs').beforeFamilyDrawing(plans).schemes.family;
(async()=>{fs.mkdirSync(dir,{recursive:true});const errors=[],browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});
await page.goto(base+'/?scheme=family',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>document.querySelectorAll('#gFurn > .furn').length>0,null,{timeout:60000});
const plan=await page.evaluate(()=>({walls:HOUSE_PLAN.WALLS.length,objects:state.furniture.length,revision:HOUSE_PLAN.metadata.familyDrawingUpdate.id,dimensions:document.querySelector('#gDims').textContent}));
assert.equal(plan.walls,42);assert.equal(plan.objects,124);assert.match(plan.dimensions,/13770/);assert.match(plan.dimensions,/7970/);
await page.screenshot({path:path.join(dir,'drawing-2d.png')});console.log('2D passed',JSON.stringify(plan));
await page.evaluate(old=>{const s=structuredClone(state);s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>id!=='family-drawing-20261027');s.demolished=['w29'];const cab=s.furniture.find(f=>f.id==='fit-dining_sideboard_wall');cab.parts[0].w+=7;cab.ownerNote='retain custom';s.furniture=s.furniture.filter(f=>f.id!=='kitchen_heater');localStorage.setItem(STORE,JSON.stringify(s));},before);
await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>state.appliedLayoutRevisions.includes('family-drawing-20261027'));
const migrated=await page.evaluate(()=>({cab:state.furniture.find(f=>f.id==='fit-dining_sideboard_wall'),deleted:!state.furniture.some(f=>f.id==='kitchen_heater'),demolished:state.demolished,archive:state.layoutMigrationWallArchive||[]}));
assert.equal(migrated.cab.ownerNote,'retain custom');assert.equal(migrated.cab.layoutCustomPartsRevision,'family-drawing-20261027');assert.ok(migrated.deleted);assert.deepEqual(migrated.demolished,[]);assert.equal(migrated.archive[0].wallId,'w29');
console.log('Migration preserved custom cabinet and deletion; archived old wall selection');
await page.evaluate(()=>localStorage.removeItem(STORE));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>state.furniture.length===124);
if(process.argv.includes('--migration-only')){assert.deepEqual(errors,[]);return;}
await page.locator('[data-view="3d"]').click({noWaitAfter:true,timeout:120000});console.log('3D requested');
await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&Boolean(document.querySelector('#view3d canvas')),null,{timeout:120000});
await page.waitForFunction(()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const p=document.createElement('canvas');p.width=p.height=32;const g=p.getContext('2d');g.drawImage(c,0,0,32,32);const a=g.getImageData(0,0,32,32).data,s=new Set();for(let i=0;i<a.length;i+=4)s.add((a[i]<<16)|(a[i+1]<<8)|a[i+2]);return s.size>15;},null,{timeout:120000});
await page.screenshot({path:path.join(dir,'drawing-3d.png')});assert.deepEqual(errors,[]);console.log('PASS 3D rendered',path.join(dir,'drawing-3d.png'));
}finally{await browser.close();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
