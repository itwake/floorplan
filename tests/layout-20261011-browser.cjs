'use strict';

// Disposable browser context only. The read-only mesh inspector and QA camera
// are injected into the HTTP response, never shipped or saved in a user draft.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js'),{beforeLayout20261011}=require('./layout-20261011.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
const base=process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4193',out=path.resolve(process.env.FLOORPLAN_LAYOUT_SHOTS||path.join(root,'..','output','layout-20261011-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const tol=.3,eq=(a,b,label)=>assert.ok(Math.abs(a-b)<tol,`${label}: ${a} != ${b}`);
const hook=`window.__layoutQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow>.999&&furnGrow>.999),
 inspect:()=>{
  scene.updateMatrixWorld(true);
  const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};
  const furniture=Object.fromEntries(furnG.children.map(g=>{const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push({...bounds(o),role:o.userData.role||null,led:Boolean(o.userData.cabinetLEDStrip)});});return[g.userData.fid,{...bounds(g),variant:g.userData.modelVariant||null,center:[g.position.x*1000+OX,g.position.z*1000+OY],rotation:g.rotation.y,meshes}];}));
  const door=doors.find(d=>d.entry),start=door.pivot.localToWorld(new THREE.Vector3()),end=door.pivot.localToWorld(new THREE.Vector3(door.L,0,0));
  return{furniture,entry:{open:door.open,start:[start.x*1000+OX,start.z*1000+OY],end:[end.x*1000+OX,end.z*1000+OY],angle:door.cur,openAngle:door.a1},bifoldCount:doors.filter(d=>d.bifold).length,triangles:renderer.info.render.triangles};
 },
 camera:(position,target)=>{
  fly=null;opt.cut=1.2;syncCutBtns();sync();showLabels(false);opt.labels=false;
  orbit.enableDamping=false;orbit.minDistance=.1;orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));
  camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);
 }
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const probe=document.createElement('canvas');probe.width=probe.height=64;const g=probe.getContext('2d');g.drawImage(c,0,0,64,64);const pixels=g.getImageData(0,0,64,64).data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);return colors.size>25;};

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 const errors=[],report=[],screenshots=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await context.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
 await context.route(base+'/**',async route=>{if(route.request().resourceType()!=='document')return route.fallback();const response=await route.fetch(),html=await response.text();assert.ok(html.includes('window.View3D ='));return route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});});
 const open=async(id,three=false)=>{await page.goto(`${base}/?scheme=${id}${three?'&view=3d':''}`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&state.furniture.length);assert.equal(await page.locator('#schemeSelect').inputValue(),id);};
 const reload=async()=>{await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D);};
 const oldDraft=async(id,custom=false)=>page.evaluate(({old,custom})=>{
  const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);delete s.appliedLayoutRevisions;
  if(custom){
   for(const id of ['bed_b','family-f1','fit-dining_sideboard_wall']){const f=s.furniture.find(f=>f.id===id);if(f){f.cx+=37;f.w+=20;f.color='#668899';f.name='QA '+id;}}
   const garage=s.furniture.find(f=>f.id==='fit-family_garage');if(garage)garage.name='QA customized removed garage';
   s.furniture=s.furniture.filter(f=>f.id!=='bed_a');s.measures=[{a:{x:1,y:2},b:{x:1001,y:2}}];s.rooms.living.mat='terrazzo';
  }
  localStorage.setItem(STORE,JSON.stringify(s));return{key:STORE,old:structuredClone(s)};
 },{old:beforeLayout20261011(plans.schemes[id]),custom});
 const reset=async()=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await page.locator('details.menu > summary').click();await page.locator('#reset').click();await page.locator('details.menu').evaluate(e=>e.open=false);};
 const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});screenshots.push(file);};
 try{
  for(const id of (process.argv.includes('--published-smoke')?[]:['wood','family','laundry','screen'])){
   await open(id);const prior=await oldDraft(id);await reload();
   const migrated=await page.evaluate(()=>({key:STORE,state:structuredClone(state),saved:JSON.parse(localStorage.getItem(STORE))}));
   assert.equal(migrated.key,prior.key,id+': key changed');assert.equal(migrated.state.furniture.length,plans.schemes[id].defaultFurniture.length);
   for(const fresh of plans.schemes[id].defaultFurniture){const actual=migrated.state.furniture.find(f=>f.id===fresh.id);assert.ok(actual,fresh.id+' missing after migration');for(const k of ['cx','cy','w','d','rot','heightMm','name','color','mattressMm','parts'])assert.deepEqual(actual[k],fresh[k],id+'/'+fresh.id+' migration '+k);}
   assert.deepEqual(migrated.state.layoutMigrationKeptIds,[]);for(const revision of [plans.schemes[id].metadata.entryFamilyUpdate,plans.schemes[id].metadata.bedroomUpdate].filter(Boolean))assert.ok(migrated.saved.appliedLayoutRevisions.includes(revision.id));
   await reload();assert.equal(await page.evaluate(()=>state.furniture.length),plans.schemes[id].defaultFurniture.length,id+': repeated migration duplicated');
   if(['family','screen'].includes(id)){
    await page.evaluate(()=>{state.furniture=state.furniture.filter(f=>f.id!=='draft-chair-b');save();});await reload();assert.equal(await page.evaluate(()=>Boolean(getF('draft-chair-b'))),false,'deleted addition resurrected');
    const custom=await oldDraft(id,true);await reload();const current=await page.evaluate(()=>structuredClone(state));
    for(const fid of ['bed_b','family-f1','fit-dining_sideboard_wall'])for(const k of ['cx','w','color','name'])assert.deepEqual(current.furniture.find(f=>f.id===fid)[k],custom.old.furniture.find(f=>f.id===fid)[k],id+'/'+fid+' custom '+k);
    assert.equal(current.furniture.some(f=>f.id==='bed_a'),false,'deleted bed resurrected');assert.deepEqual(current.measures,custom.old.measures);assert.equal(current.rooms.living.mat,'terrazzo');assert.ok(current.layoutMigrationKeptIds.length);await page.locator('[data-layout-migration-warning]').waitFor({state:'visible'});
    if(id==='family'){
     for(const fid of ['fit-family_garage','garage-folded_stroller','garage-child_bike','bed_b_niche_console'])assert.equal(current.furniture.some(f=>f.id===fid),false,'removed object visible '+fid);
     const garage=current.layoutMigrationArchive.find(q=>q.furniture.id==='fit-family_garage');assert.equal(garage.furniture.name,'QA customized removed garage');
    }
    await page.evaluate(()=>save());await reload();assert.deepEqual(await page.evaluate(()=>state.measures),custom.old.measures);
    await page.evaluate(()=>{const s=defaultState();s.furniture=[];delete s.appliedLayoutRevisions;localStorage.setItem(STORE,JSON.stringify(s));});await reload();assert.equal(await page.evaluate(()=>state.furniture.length),0,'empty draft filled');
   }
   await reset();assert.equal(await page.evaluate(()=>state.furniture.length),plans.schemes[id].defaultFurniture.length);report.push({id,defaultUpgrade:true,storageKeyStable:true,customEditsAndDeletionsPreserved:true});
  }
  // Inspect actual WebGL meshes, not merely serialized furniture geometry.
  for(const id of ['wood','family','laundry','screen']){
   await open(id,true);await page.waitForFunction(()=>window.__layoutQA.ready());await page.waitForFunction(painted);
   const actual=await page.evaluate(()=>window.__layoutQA.inspect()),p=plans.schemes[id],source=p.DOORS.find(d=>d.entry);assert.ok(actual.triangles>1000);assert.equal(actual.entry.open,true);
   for(let i=0;i<2;i++){eq(actual.entry.start[i],source.h[i],id+' door hinge');eq(actual.entry.end[i],source.h[i]+source.o[i]*source.len,id+' door end');}assert.ok(actual.entry.end[1]>13950,id+' actual entry is not outward');
   if(id==='wood')assert.equal(actual.bifoldCount,2);else assert.equal(actual.bifoldCount,0,id+' unexpected actual storage door');
   if(id==='family')for(const fid of ['fit-family_garage','garage-folded_stroller','garage-child_bike','bed_b_niche_console'])assert.equal(actual.furniture[fid],undefined,'removed 3D object still built '+fid);
   if(['family','screen'].includes(id)){
    for(const fid of ['bed_a','bed_b','family-f1','family-f3','draft-desk-b','draft-chair-b','draft-night-b','draft-desk-a','draft-chair-a','draft-night-a']){
     const f=p.defaultFurniture.find(f=>f.id===fid),g=actual.furniture[fid];assert.ok(g?.meshes.length,fid+': 3D mesh missing');eq(g.center[0],f.cx,fid+' real x');eq(g.center[1],f.cy,fid+' real y');eq(g.rotation,-f.rot*Math.PI/180,fid+' real rotation');
     const a=f.rot*Math.PI/180,w=Math.abs(Math.cos(a))*f.w+Math.abs(Math.sin(a))*f.d,d=Math.abs(Math.sin(a))*f.w+Math.abs(Math.cos(a))*f.d;
     // Tiny rounded geometry float error is allowed, not excess textile size.
     if(f.type==='bed'||fid.startsWith('family-f')){eq(g.min[0],f.cx-w/2,fid+' world west');eq(g.max[0],f.cx+w/2,fid+' world east');eq(g.min[2],f.cy-d/2,fid+' world north');eq(g.max[2],f.cy+d/2,fid+' world south');}
     if(f.type==='bed'){assert.equal(g.variant,'confirmed-mattress-frame');const m=g.meshes.find(m=>m.role==='bed-mattress');assert.ok(m);eq(m.max[0]-m.min[0],f.mattressMm[1],fid+' mattress length');eq(m.max[2]-m.min[2],f.mattressMm[0],fid+' mattress width');}
    }
    const b=actual.furniture.bed_b,bc=actual.furniture['family-f1'],a=actual.furniture.bed_a,ac=actual.furniture['family-f3'];eq(bc.min[0]-b.max[0],555,id+' real B gap');eq(a.min[0]-ac.max[0],555,id+' real A gap');
    await page.evaluate(()=>window.__layoutQA.camera([8600,6600,7800],[3500,400,1650]));await page.waitForFunction(painted);await shot(id+'-bedrooms-3d');
   }
   const sb=actual.furniture['fit-dining_sideboard_wall'];assert.ok(sb?.meshes.some(m=>m.led));eq(sb.max[1],2700,id+' real ceiling sideboard height');
   // Cabinet inspection should no longer close an outward entry door.
   await page.evaluate(()=>window.View3D.flyToFurniture('fit-entry_shoe_station'));await page.waitForFunction(()=>window.__layoutQA.ready());assert.equal(await page.evaluate(()=>window.__layoutQA.inspect().entry.open),true);
   if(id==='family'){
    await page.evaluate(()=>window.__layoutQA.camera([9500,8500,15500],[4350,800,11400]));await page.waitForFunction(painted);await shot('family-public-3d');
    await page.evaluate(()=>window.__layoutQA.camera([5300,2000,12000],[2440,1350,12000]));await page.waitForFunction(painted);await shot('family-sideboard-3d');
   }
  }
  await open('family');await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);fitView();});await shot('family-plan');
  await open('screen');await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);fitView();});await shot('screen-plan');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',migration:report,actual3DAllFourOutward:true,bothBedroomsActual555mm:true,actualMattressSizesCorrect:true,removedGarageNotBuilt:true,ceilingSideboardWithLEDs:true,browserErrors:errors,screenshots},null,2));
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
