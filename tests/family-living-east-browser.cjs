'use strict';

// Root runs this once: one isolated Chrome process, with real UI clicks.
// Remote smoke fetches its own published assets; the document hook only
// observes actual renderer state and supplies inspection camera positions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js');
const {beforeFamilyLivingEast,REVISION}=require('../tools/family-living-east-20261018.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-living-east-qa.cjs'))('playwright'));}
let base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,'');
const published=process.argv.includes('--published-smoke'),out=path.resolve(process.env.FLOORPLAN_LIVING_EAST_SHOTS||path.join(root,'..','output','family-living-east-20261018-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const family=plans.schemes.family,baseline=beforeFamilyLivingEast(family),meta=family.metadata.familyLivingEastUpdate;
const CABINET='fit-dining_sideboard_wall',SOFA='family-f6',BACK='fit-sofa_back_storage',CHAIR='family-f27';
const current=id=>family.defaultFurniture.find(f=>f.id===id),old=id=>baseline.defaultFurniture.find(f=>f.id===id);
const sorted=items=>structuredClone(items).sort((a,b)=>a.id.localeCompare(b.id));
const equalDefaults=items=>assert.deepEqual(sorted(items),sorted(family.defaultFurniture),'current default arrangement exact');
const eq=(a,b,label,tol=.6)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol,label+': '+a+' != '+b);
const sameBounds=(a,b,label)=>{for(const key of['min','max'])for(let i=0;i<3;i++)eq(a[key][i],b[key][i],label+' '+key+i,.05);};
const hook=`window.__familyLivingEastQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow===1&&furnGrow===1),
 cornerSettled:id=>{const c=cabinetDoorControllers.get(id),ds=cabinetDoors.filter(d=>d.cabinetFid===id);return Boolean(c?.open&&c.progress>1-1e-10&&ds.length===4&&ds.every(d=>Math.abs(d.pivot.rotation.y-d.a1)<1e-9));},
 cornerStatus:id=>{const c=cabinetDoorControllers.get(id);return{controller:c?{fid:c.fid,open:c.open,progress:c.progress}:null,doors:cabinetDoors.filter(d=>d.cabinetFid===id).map(d=>({partId:d.pivot.userData.cabinetDoorPartId,rotation:d.pivot.rotation.y,a0:d.a0,a1:d.a1,openingSweepDegrees:d.openingSweepDegrees}))};},
 inspect:()=>{scene.updateMatrixWorld(true);const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};const furniture=Object.fromEntries(furnG.children.map(g=>{const meshes=[],pivots=[];g.traverse(o=>{if(o.isMesh)meshes.push({...bounds(o),partId:o.userData.cabinetPartId||null,role:o.userData.role||null,leaf:Boolean(o.userData.cabinetDoorLeaf),pull:Boolean(o.userData.cabinetDoorPull),geometry:o.geometry.type});if(o.userData.cabinetDoorPartId){const p=o.getWorldPosition(new THREE.Vector3());pivots.push({partId:o.userData.cabinetDoorPartId,group:o.userData.cabinetDoorGroup,rotation:o.rotation.y,world:[p.x*1000+OX,p.y*1000,p.z*1000+OY]});}});return[g.userData.fid,{...bounds(g),center:[g.position.x*1000+OX,g.position.z*1000+OY],rotation:g.rotation.y,meshes,pivots}];}));return{furniture,controllers:[...cabinetDoorControllers.values()].map(c=>({fid:c.fid,open:c.open,progress:c.progress})),doors:cabinetDoors.map(d=>({partId:d.pivot.userData.cabinetDoorPartId,a0:d.a0,a1:d.a1,openingSweepDegrees:d.openingSweepDegrees})),triangles:renderer.info.render.triangles};},
 camera:(position,target,cut)=>{fly=null;opt.cut=cut??H;syncCutBtns();sync();showLabels(false);opt.labels=false;orbit.enableDamping=false;orbit.minDistance=.1;orbit.maxPolarAngle=Math.PI;orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);}
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const p=document.createElement('canvas');p.width=p.height=48;const g=p.getContext('2d');g.drawImage(c,0,0,48,48);const a=g.getImageData(0,0,48,48).data,s=new Set();for(let i=0;i<a.length;i+=4)s.add((a[i]<<16)|(a[i+1]<<8)|a[i+2]);return s.size>25;};

(async()=>{
 assert.equal(meta?.id,REVISION);assert.ok(!current(BACK));
 assert.deepEqual([current(SOFA).cx,current(SOFA).cy,current(SOFA).w,current(SOFA).d,current(SOFA).rot],[6260,8025,2410,980,90]);
 assert.deepEqual([current(CABINET).cx,current(CABINET).cy,current(CABINET).w,current(CABINET).d,current(CABINET).rot],[2937.5,11745,1625,4290,0]);
 const changed=new Set(meta.changedFurnitureIds||[]),removed=new Set(meta.removedFurnitureIds||[]);
 let server,browser,context,page;const report={revision:REVISION,otherSchemes:[],migration:null,geometry:null,corner:null},errors=[],networkFailures=[],screenshots=[];
 try{
  if(process.argv.includes('--self-host')){
   assert.ok(!published,'local hosting cannot verify publication');
   server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(u.pathname)==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,''),file=path.resolve(root,name),relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});base='http://127.0.0.1:'+server.address().port;console.log('Self-hosted read-only living east QA:',base);
  }
  fs.mkdirSync(out,{recursive:true});const proxy=published&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
  browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(proxy?{proxy:{server:proxy}}:{})});context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>networkFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('dialog',d=>d.accept());await context.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
  await context.route(base+'/**',async route=>{if(route.request().resourceType()!=='document')return route.fallback();try{const response=await route.fetch({timeout:90000}),html=await response.text();assert.ok(html.includes('window.View3D ='));await route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});}catch(e){networkFailures.push({url:route.request().url(),error:'QA document interception: '+e.message});await route.abort('failed').catch(()=>{});}});
  const ready=()=>page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture)&&!switching);
  const open=async id=>{await page.goto(base+'/?scheme='+id,{waitUntil:'domcontentloaded'});await ready();assert.equal(await page.locator('#schemeSelect').inputValue(),id);};
  const reload=async()=>{await page.reload({waitUntil:'domcontentloaded'});await ready();};
  const snapshot=()=>page.evaluate(()=>structuredClone(state));
  const inspect=()=>page.evaluate(()=>window.__familyLivingEastQA.inspect());
  const click=async selector=>{await page.locator(selector).evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'}));await page.waitForFunction(selector=>{const e=document.querySelector(selector);if(!e||e.disabled)return false;const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return r.width>0&&r.height>0&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&document.elementFromPoint(x,y)?.closest(selector)===e;},selector);const r=await page.locator(selector).boundingBox();assert.ok(r);await page.mouse.click(r.x+r.width/2,r.y+r.height/2);};
  const reset=async()=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await click('details.menu > summary');await click('#reset');await page.locator('details.menu').evaluate(e=>e.open=false);};
  const go3d=async()=>{await page.waitForFunction(()=>!switching);if(await page.evaluate(()=>viewMode)!=='3d')await click('#viewSeg [data-view="3d"]');await page.waitForFunction(()=>window.__familyLivingEastQA.ready()&&!switching);await page.waitForFunction(painted);};
  const go2d=async()=>{await page.waitForFunction(()=>!switching);if(await page.evaluate(()=>viewMode)!=='2d')await click('#viewSeg [data-view="2d"]');await page.waitForFunction(()=>viewMode==='2d'&&!switching&&!document.body.classList.contains('m3d'));};
  const selectCabinet=()=>page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},CABINET);
  const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});screenshots.push(file);};

  console.log('Living east: other three schemes, source and defaults remain exact');
  for(const id of['wood','laundry','screen']){await open(id);assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),plans.schemes[id]);assert.deepEqual(await page.evaluate(()=>structuredClone(state.furniture)),plans.schemes[id].defaultFurniture);assert.equal(await page.evaluate(()=>HOUSE_PLAN.metadata.familyLivingEastUpdate),undefined);report.otherSchemes.push(id);}
  await open('family');assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),family);equalDefaults((await snapshot()).furniture);
  assert.equal(await page.evaluate(()=>STORE),`floorplan:house-design:family:${plans.version}:${baseline.metadata.source.sha256.slice(0,12)}`);
  if(!published){
   const seed=mode=>page.evaluate(({old,mode,revision,changed,cabinetId})=>{const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>id!==revision);
    if(mode==='custom-placement'||mode==='custom-size'){
     for(const id of changed){const f=s.furniture.find(f=>f.id===id);if(!f)continue;Object.assign(f,{cx:f.cx+31,cy:f.cy-27,rot:f.rot+5,name:'私人 '+f.name,color:'#abcdee'});f.userExtension={preserve:['owner',19]};if(mode==='custom-size'&&id===cabinetId)Object.assign(f,{w:f.w+51,d:f.d+77,heightMm:f.heightMm+9});}
     s.furniture=s.furniture.filter(f=>f.id!=='kitchen_heater');s.rooms.living.mat='terrazzo';s.measures=[{a:{x:500,y:600},b:{x:900,y:600}}];s.demolished=['w29'];
    }
    if(mode==='deleted')s.furniture=s.furniture.filter(f=>!changed.includes(f.id));if(mode==='empty')s.furniture=[];
    localStorage.setItem(STORE,JSON.stringify(s));return structuredClone(s);
   },{old:baseline,mode,revision:REVISION,changed:[...changed],cabinetId:CABINET});
   console.log('Living east migration: defaults, private positions/sizes, deletions, idempotence');
   await seed('default');await reload();equalDefaults((await snapshot()).furniture);let s=await snapshot();assert.equal(s.appliedLayoutRevisions.filter(id=>id===REVISION).length,1);assert.ok(s.layoutMigrationArchive.some(a=>a.revisionId===REVISION&&a.furniture.id===BACK));await reload();assert.deepEqual(await snapshot(),s);
   for(const mode of['custom-placement','custom-size']){
    const before=await seed(mode);await reload();s=await snapshot();
    for(const id of changed){const a=s.furniture.find(f=>f.id===id),b=before.furniture.find(f=>f.id===id);if(!b)continue;assert.ok(a,id+' remains');for(const key of['cx','cy','rot','name','color','userExtension'])assert.deepEqual(a[key],b[key],mode+' '+id+' private '+key);}
    if(mode==='custom-size'){const a=s.furniture.find(f=>f.id===CABINET),b=before.furniture.find(f=>f.id===CABINET);for(const key of['w','d','heightMm','parts','baseWidthMm','baseDepthMm','baseHeightMm','cornerDoorDesign'])assert.deepEqual(a[key],b[key],'custom-sized cabinet assembly remains intact '+key);}
    for(const f of before.furniture)if(!changed.has(f.id)&&!removed.has(f.id))assert.deepEqual(s.furniture.find(q=>q.id===f.id),f,'private unrelated '+f.id);
    assert.equal(s.furniture.some(f=>f.id==='kitchen_heater'),false);assert.deepEqual(s.rooms,before.rooms);assert.deepEqual(s.measures,before.measures);assert.deepEqual(s.demolished,before.demolished);assert.equal(s.furniture.some(f=>f.id===BACK),false);await reload();assert.deepEqual(await snapshot(),s,'private migration idempotent');
   }
   await seed('deleted');await reload();assert.ok((await snapshot()).furniture.every(f=>!changed.has(f.id)));await reload();assert.ok((await snapshot()).furniture.every(f=>!changed.has(f.id)));await seed('empty');await reload();assert.equal((await snapshot()).furniture.length,0);await reset();equalDefaults((await snapshot()).furniture);
   report.migration={defaultUpdateExact:true,removedBackCabinetArchived:true,privateAffectedPositionsNamesColorsAndExtensionsPreserved:true,privateCabinetSizeAndAssemblyPreserved:true,privateAppliancesAndElectricalPointsPreserved:true,allUnrelatedFurnitureRoomsMeasuresDemolishedPreserved:true,deletedAndEmptyNotRevived:true,idempotent:true,storageKeySourceStable:true};
  }

  console.log('Living east: real 2D poses and shorter full-height sideboard');
  for(const id of[SOFA,CABINET]){const f=current(id),transform=await page.locator('#gFurn [data-fid="'+id+'"]').getAttribute('transform');assert.equal(transform,`translate(${f.cx} ${f.cy}) rotate(${f.rot})`);}
  assert.equal(await page.locator('#gFurn [data-fid="'+BACK+'"]').count(),0);
  await selectCabinet();assert.equal(await page.locator('#fD').inputValue(),'4290');assert.equal(await page.locator('#fH').inputValue(),'2700');assert.equal(await page.locator('#toggleCornerDoors').count(),1);
  await page.evaluate(()=>{closeDrawers();select(null);fitView();});await shot('family-living-east-full-plan');

  let previousScene;
  if(!published){
   console.log('Living east: capture old real solids once for independent corner/unrelated regression');
   await page.evaluate(({old,revision})=>{const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);if(!s.appliedLayoutRevisions.includes(revision))s.appliedLayoutRevisions.push(revision);localStorage.setItem(STORE,JSON.stringify(s));},{old:baseline,revision:REVISION});await reload();await go3d();previousScene=await inspect();await go2d();await reset();equalDefaults((await snapshot()).furniture);
  }
  await go3d();await page.evaluate(()=>window.__familyLivingEastQA.camera([3000,3600,10900],[5250,700,8200],2.7));await page.waitForFunction(painted);
  let actual=await inspect();assert.ok(actual.triangles>1000);assert.deepEqual(Object.keys(actual.furniture).sort(),family.defaultFurniture.map(f=>f.id).sort());assert.equal(actual.furniture[BACK],undefined);
  for(const f of family.defaultFurniture){const g=actual.furniture[f.id];assert.ok(g.meshes.length,f.id+' rendered solids');eq(g.center[0],f.cx,f.id+' centre x');eq(g.center[1],f.cy,f.id+' centre y');eq(g.rotation,-f.rot*Math.PI/180,f.id+' rotation',1e-8);if(previousScene&&!changed.has(f.id)){const previous=previousScene.furniture[f.id];sameBounds(g,previous,f.id+' unchanged world bounds');assert.deepEqual(g.meshes,previous.meshes,f.id+' unchanged mesh solids');}}
  const sofa=actual.furniture[SOFA],cab=actual.furniture[CABINET];
  eq(sofa.rotation,-Math.PI/2,'east wall sofa faces west',1e-9);eq(sofa.max[0],6750,'sofa back reaches east wall');eq(sofa.min[0],5770,'sofa west front');
  eq(cab.min[2],9600,'sideboard physical north end');eq(cab.max[2],13890,'sideboard south end fixed');eq(cab.min[0],2125,'sideboard west');eq(cab.max[0],3750,'return cabinet east edge');eq(cab.max[1],2700,'full-height cabinet top');
  const stableParts=cab.meshes.filter(m=>/^corner800-|^corner-return-/.test(m.partId||''));assert.ok(stableParts.length>30);
  if(previousScene){const before=previousScene.furniture[CABINET];for(const m of stableParts){const same=before.meshes.filter(p=>p.partId===m.partId&&p.role===m.role&&p.leaf===m.leaf&&p.pull===m.pull&&p.geometry===m.geometry);assert.ok(same.some(p=>['min','max'].every(key=>p[key].every((v,i)=>Math.abs(v-m[key][i])<.05))),m.partId+' south corner actual world geometry unchanged');}
   for(const p of cab.pivots){const b=before.pivots.find(q=>q.partId===p.partId);assert.ok(b);for(let i=0;i<3;i++)eq(p.world[i],b.world[i],p.partId+' fixed world hinge '+i,.05);eq(p.rotation,b.rotation,p.partId+' unchanged closed hinge',1e-9);}
  }
  const ledChecks=[];for(const strip of cab.meshes.filter(m=>m.role==='led-strip')){const support=cab.meshes.find(m=>m!==strip&&!/led|door|book|rail|pull/.test(m.role||'')&&Math.abs(m.min[1]-strip.max[1])<.6&&m.min[0]<=strip.min[0]+.6&&m.max[0]>=strip.max[0]-.6&&m.min[2]<=strip.min[2]+.6&&m.max[2]>=strip.max[2]-.6);assert.ok(support,strip.partId+' actual light is attached below a real board, not floating');ledChecks.push({strip:strip.partId,support:support.partId});}
  assert.ok(ledChecks.length>=8);
  const countertop=cab.meshes.find(m=>m.partId==='reference-west-central-countertop');assert.ok(countertop);eq(countertop.max[1],850,'actual appliance support countertop top');
  const applianceChecks=[];for(const f of family.defaultFurniture.filter(f=>f.id.startsWith('family-sideboard-'))){const g=actual.furniture[f.id],a=f.rot*Math.PI/180,hx=(Math.abs(Math.cos(a))*f.w+Math.abs(Math.sin(a))*f.d)/2,hy=(Math.abs(Math.sin(a))*f.w+Math.abs(Math.cos(a))*f.d)/2;eq(g.min[1],850,f.id+' actual base stands on countertop',1.5);assert.ok(f.cx-hx>=countertop.min[0]-.6&&f.cx+hx<=countertop.max[0]+.6&&f.cy-hy>=countertop.min[2]-.6&&f.cy+hy<=countertop.max[2]+.6,f.id+' envelope fully supported by resized countertop');applianceChecks.push({id:f.id,actualBottom:g.min[1],cy:f.cy});}
  assert.equal(applianceChecks.length,5);for(const n of[19,20,21,22,23]){const f=current('family-elec-p'+n);assert.ok(f);assert.ok(f.cy>=countertop.min[2]&&f.cy<=countertop.max[2],'P'+n+' remains on shorter niche');assert.equal(f.electricalDesign.installationApproved,false);assert.equal(f.electricalDesign.ratingAmps,null);}
  const p17=current('family-elec-p17');assert.equal(p17.cy,9420,'living low point is moved beyond sofa');assert.equal(p17.electricalDesign.installationApproved,false);
  const drawerFronts=cab.meshes.filter(m=>m.role==='drawer-front'),table=actual.furniture['family-f23'];assert.equal(drawerFronts.length,3);assert.ok(table);
  for(const front of drawerFronts){assert.ok(front.min[2]>=12330-.6&&front.max[2]<=12730+.6,'new400mm drawer column is at south end of central counter');const extended={min:[front.min[0],front.min[1],front.min[2]],max:[front.max[0]+400,front.max[1],front.max[2]]};assert.ok(![0,1,2].every(i=>Math.min(extended.max[i],table.max[i])-Math.max(extended.min[i],table.min[i])>.6),'400mm illustrative drawer travel avoids the actual dining table; no claim about the dining chair');}
  await shot('family-living-east-living-3d');
  await page.evaluate(()=>window.__familyLivingEastQA.camera([5000,2250,11900],[2350,1400,11400],2.7));await page.waitForFunction(painted);await shot('family-living-east-sideboard-3d');
  report.geometry={allCurrentCentersRotationsExact:true,sofaWestFacingBackOnEastWall6750:true,noSofaBackCabinet:true,actualSideboardNorth9600South13890Height2700:true,southCornerAndReturnWorldSolidsUnchanged:!!previousScene,hingeWorldPositionsUnchanged:!!previousScene,allUnrelatedRealMeshBoundsExact:!!previousScene,lightStripsWithActualBoardSupport:ledChecks,allFiveAppliancesOnActual850Countertop:applianceChecks,fivePowerPointsOnShortNicheStillUnapproved:true,p17MovedBeyondSofaTo9420:true,three400mmDrawersAtSouthEndClearOfActualDiningTable:true};

  console.log('Living east: real corner controls preserve 180 degrees, temporary chair and exact restoration');
  await selectCabinet();const originalChair=await page.evaluate(id=>structuredClone(getF(id)),CHAIR),originalFurniture=(await snapshot()).furniture;
  await click('#toggleCornerDoors');assert.equal(await page.evaluate(id=>getF(id).cornerDoorOpen,CABINET),false,'normal opening remains guarded by dining chair');
  // Poll just four hinge rotations: recomputing Box3 for the entire house on
  // each predicate can starve SwiftShader's asynchronous animation frames.
  // The renderer converges asymptotically, so endpoint accuracy is checked
  // more tightly here than the unchanged exact-angle assertion below.
  await click('#prepareCornerChair');await page.waitForFunction(id=>window.__familyLivingEastQA.cornerSettled(id),CABINET,{polling:250,timeout:180000});
  let opened=await inspect();const parked=await page.evaluate(id=>structuredClone(getF(id)),CHAIR);eq(parked.cx-originalChair.cx,465,'temporary chair still moves exactly465 east');eq(parked.cy,originalChair.cy,'temporary chair y remains fixed');eq(parked.cx,3420,'parking world x fixed');eq(parked.cy,12080,'parking world y fixed');
  assert.equal(opened.furniture[CABINET].pivots.length,4);for(const pivot of opened.furniture[CABINET].pivots){const door=opened.doors.find(d=>d.partId===pivot.partId);assert.ok(door);eq(Math.abs(door.openingSweepDegrees),180,pivot.partId+' explicit180');eq(pivot.rotation,door.a1,pivot.partId+' actual fully open hinge',1e-8);}
  const operational=(await snapshot()).furniture;for(const f of originalFurniture)if(![CABINET,CHAIR].includes(f.id))assert.deepEqual(operational.find(q=>q.id===f.id),f,'opening cannot move unrelated furniture '+f.id);
  await click('#toggleCornerDoors');await page.waitForFunction(id=>window.View3D.cornerDoorsClosed(id),CABINET);await click('#restoreCornerChair');assert.deepEqual(await page.evaluate(id=>structuredClone(getF(id)),CHAIR),originalChair,'restore exact original dining chair');assert.equal(await page.evaluate(id=>getF(id).cornerChairParking,CABINET),undefined);
  report.corner={blockedOrdinaryOpeningStillGuarded:true,fourActual180Hinges:true,temporaryChairExactly465EastTo342012080:true,unrelatedFurnitureUnchangedByOperation:true,closeThenExplicitRestoreExact:true};
  await go2d();await page.evaluate(()=>{closeDrawers();select(null);fitView();});await shot('family-living-east-final-plan');equalDefaults((await snapshot()).furniture);
  assert.deepEqual(errors,[]);assert.deepEqual(networkFailures,[]);const result={status:'PASS',...report,browserErrors:errors,networkFailures,screenshots};fs.writeFileSync(path.join(out,published?'browser-report-smoke.json':'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(e){let cornerStatus=null;try{cornerStatus=await page?.evaluate(id=>window.__familyLivingEastQA?.cornerStatus(id),CABINET);}catch{}const result={status:'FAIL',progress:report,error:e.stack||String(e),url:page?.url(),cornerStatus,browserErrors:errors,networkFailures};fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure-report.json'),JSON.stringify(result,null,2)+'\n');try{await page?.screenshot({path:path.join(out,'failure.png'),timeout:10000});}catch{}console.error(JSON.stringify(result,null,2));throw e;}finally{await context?.close();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
