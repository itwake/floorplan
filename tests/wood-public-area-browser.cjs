'use strict';
// Isolated browser drafts only. Test-only camera/mesh hooks are injected into
// the response and never shipped. No real user's localStorage is modified.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js'),{previousPlan}=require('./wood-public-area-helpers.cjs');
const prior=previousPlan(plans.schemes.wood),runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
const base=process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4190',out=path.resolve(process.env.FLOORPLAN_WOOD_SHOTS||path.join(root,'..','qa-wood-living-20261009'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const hook=`window.__woodQA=(position)=>{
 fly=null;opt.mode='orbit';orbit.enabled=true;orbit.minDistance=.35;grow=1;furnGrow=1;
 if(position){opt.cut=2.7;sync(true);applyGrow();showLabels(false);opt.labels=false;
   const [x,y,z,tx,ty,tz]=position;camera.position.set(wx(x),y,wz(z));orbit.target.set(wx(tx),ty,wz(tz));camera.lookAt(orbit.target);orbit.update();}
 active=false;cancelAnimationFrame(raf);raf=0;renderer.render(scene,camera);scene.updateMatrixWorld(true);
 const ids=['wood-f5','wood-f6','wood-living-rug','wood-f7','wood-f8','fit-sofa_back_storage','fit-wood_garage'];
 const meshes=ids.map(id=>{const f=getF(id),g=furnG.children.find(o=>o.userData.fid===id);let count=0;g.traverse(o=>{if(o.isMesh)count++;});return {id,x:g.position.x,z:g.position.z,expectedX:wx(f.cx),expectedZ:wz(f.cy),rotation:g.rotation.y,meshCount:count};});
 const tv=furnG.children.find(o=>o.userData.fid==='wood-f6'),screen=tv.children.find(o=>Math.abs((o.geometry?.parameters?.width||0)-1.43)<.001);
 const screenX=screen.getWorldPosition(new THREE.Vector3()).x;
 return {meshes,screenX,expectedScreenX:wx(5485),bifolds:doors.filter(d=>d.bifold).map(d=>({open:d.open,angle:d.cur,closedAngle:d.a0,secondAngle:d.second.rotation.y,leaves:2}))};
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const probe=document.createElement('canvas');probe.width=probe.height=64;const g=probe.getContext('2d');g.drawImage(c,0,0,64,64);const d=g.getImageData(0,0,64,64).data,s=new Set();for(let i=0;i<d.length;i+=4)s.add(d[i]+'-'+d[i+1]+'-'+d[i+2]);return s.size>30;};
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1500,height:1030}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await context.route(base+'/**',async route=>{if(route.request().resourceType()!=='document')return route.continue();const response=await route.fetch(),html=await response.text();return route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});});
 const reload=async()=>{await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>state.schemeId==='wood');};
 const oldDraft=async(custom=false)=>page.evaluate(({old,custom})=>{
   const d=defaultState();d.furniture=structuredClone(old.defaultFurniture);delete d.appliedLayoutRevisions;
   if(custom){const sofa=d.furniture.find(f=>f.id==='wood-f5');sofa.cx+=123;sofa.color='#668899';sofa.name='QA 自定义沙发';d.furniture=d.furniture.filter(f=>f.id!=='wood-f7');d.measures=[{a:{x:1,y:2},b:{x:1001,y:2}}];d.rooms.living.mat='terrazzo';}
   localStorage.setItem(STORE,JSON.stringify(d));return {store:STORE,sofa:d.furniture.find(f=>f.id==='wood-f5')};
 },{old:prior,custom});
 try{
   await page.goto(base+'/?scheme=wood',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HOUSE_PLANS&&state.furniture.length);
   const first=await oldDraft();await reload();
   const migrated=await page.evaluate(()=>({store:STORE,state:structuredClone(state),saved:JSON.parse(localStorage.getItem(STORE))}));
   assert.equal(migrated.store,first.store);assert.equal(migrated.state.furniture.length,50);
   for(const fresh of plans.schemes.wood.defaultFurniture){const f=migrated.state.furniture.find(f=>f.id===fresh.id);for(const k of ['cx','cy','w','d','rot','heightMm','color'])assert.deepEqual(f[k],fresh[k],f.id+' migration '+k);}
   assert.deepEqual(migrated.state.layoutMigrationKeptIds,[]);assert.ok(migrated.saved.appliedLayoutRevisions.includes('wood-public-area-20261009'));
   await reload();assert.equal(await page.evaluate(()=>state.furniture.length),50,'upgrade duplicated additions');
   await page.evaluate(()=>{state.furniture=state.furniture.filter(f=>f.id!=='fit-sofa_back_storage');save();});await reload();assert.equal(await page.evaluate(()=>Boolean(getF('fit-sofa_back_storage'))),false,'deleted addition resurrected');
   const custom=await oldDraft(true);await reload();
   assert.equal(await page.evaluate(()=>getF('wood-f5').cx),custom.sofa.cx);assert.equal(await page.evaluate(()=>getF('wood-f5').color),'#668899');assert.equal(await page.evaluate(()=>getF('wood-f5').name),'QA 自定义沙发');
   assert.equal(await page.evaluate(()=>Boolean(getF('wood-f7'))),false,'deleted existing object resurrected');
   assert.equal(await page.evaluate(()=>state.rooms.living.mat),'terrazzo');assert.equal(await page.evaluate(()=>state.measures.length),1);
   await page.locator('[data-layout-migration-warning]').waitFor({state:'visible'});
   await page.evaluate(()=>{const d=defaultState();d.furniture=[];delete d.appliedLayoutRevisions;localStorage.setItem(STORE,JSON.stringify(d));});await reload();assert.equal(await page.evaluate(()=>state.furniture.length),0,'cleared draft refilled');
   if(!await page.locator('details.menu').evaluate(e=>e.open))await page.locator('details.menu > summary').click();await page.locator('#reset').click();assert.equal(await page.evaluate(()=>state.furniture.length),50);
   await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);fitView();});
   await page.screenshot({path:path.join(out,'wood-plan-full.png')});
   await page.evaluate(()=>{const rect=svg.getBoundingClientRect();view.s=Math.min(rect.width/5200,rect.height/8300);view.x0=4500-rect.width/view.s/2;view.y0=10000-rect.height/view.s/2;applyView();});
   await page.screenshot({path:path.join(out,'wood-plan-public.png')});
   await page.waitForFunction(()=>typeof window.View3D?.enter==='function');await page.locator('[data-view="3d"]').click();
   await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('#stage').classList.contains('animating'));
   // Stop continuous SwiftShader rendering, then inspect/render real meshes.
   const model=await page.evaluate(()=>window.__woodQA([9500,9.8,15300,4400,.55,10500]));
   for(const m of model.meshes){assert.ok(Math.abs(m.x-m.expectedX)<1e-6&&Math.abs(m.z-m.expectedZ)<1e-6,m.id+' actual mesh misplaced');assert.ok(m.meshCount>0);}
   assert.ok(Math.abs(model.screenX-model.expectedScreenX)<1e-6,'TV screen not horizontally centred');
   assert.equal(model.bifolds.length,2);for(const d of model.bifolds){assert.equal(d.open,false);assert.equal(d.angle,d.closedAngle);assert.equal(d.secondAngle,0);}
   await page.waitForFunction(painted);await page.screenshot({path:path.join(out,'wood-public-3d.png')});
   await page.evaluate(()=>window.__woodQA([7000,5.3,11000,5400,.75,8100]));await page.waitForFunction(painted);await page.screenshot({path:path.join(out,'wood-living-3d.png')});
   await page.evaluate(()=>window.__woodQA([3100,1.7,11400,2870,1.4,12870]));await page.waitForFunction(painted);await page.screenshot({path:path.join(out,'wood-library-closed-3d.png')});
   assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',defaultDraftUpgraded:true,customEditsPreserved:true,deletedNotRestored:true,emptyDraftPreserved:true,markerSaved:true,reset:true,actual3D:model,browserErrors:errors,out},null,2));
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
