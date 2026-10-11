'use strict';

// This isolated-browser harness adds inspection hooks only to an intercepted
// disposable HTML response. Nothing is shipped or written to a user's browser.
// Door operation uses actual pointer clicks on the rendered WebGL surface.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js');
const {beforeFamilyStudyLaundry}=require('../tools/family-study-laundry-20261011.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
const base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,''),out=path.resolve(process.env.FLOORPLAN_STUDY_LAUNDRY_SHOTS||path.join(root,'..','output','family-study-laundry-publish-20261011-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const revisionId='family-study-laundry-confirmed-20261011',tol=.4,eq=(a,b,label)=>assert.ok(Math.abs(a-b)<tol,`${label}: ${a} != ${b}`);
const targetIds=['study_full_desk','study_window_return','fit-study_bookwall','study_north_sofa','laundry_washer','laundry_dryer','vanity_guest'];
const hook=`window.__familyStudyLaundryQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow>.999&&furnGrow>.999),
 doorSettled:(id,open)=>{const d=doors.find(d=>d.sourceId===id);return Boolean(d&&d.open===open&&Math.abs(d.cur-(open?d.a1:d.a0))<.0001);},
 inspect:()=>{
  scene.updateMatrixWorld(true);
  const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};
  const wanted=${JSON.stringify(targetIds)};
  const furniture=Object.fromEntries(furnG.children.map(g=>{
   const meshes=[];
   if(wanted.includes(g.userData.fid))g.traverse(o=>{
    if(!o.isMesh)return;const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>({metalness:m.metalness,roughness:m.roughness,color:m.color?.getHexString()}));
    const center=o.localToWorld(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).transformDirection(o.matrixWorld);
    meshes.push({...bounds(o),role:o.userData.role||null,materials,center:[center.x*1000+OX,center.y*1000,center.z*1000+OY],normal:[normal.x,normal.y,normal.z]});
   });
   return[g.userData.fid,{...bounds(g),center:[g.position.x*1000+OX,g.position.z*1000+OY],rotation:g.rotation.y,modelVariant:g.userData.modelVariant||null,meshes}];
  }));
  const doorGeometry=Object.fromEntries(doors.filter(d=>d.sourceId).map(d=>{
   const start=d.pivot.localToWorld(new THREE.Vector3()),end=d.pivot.localToWorld(new THREE.Vector3(d.L,0,0));
   return[d.sourceId,{open:d.open,start:[start.x*1000+OX,start.z*1000+OY],end:[end.x*1000+OX,end.z*1000+OY],angle:d.cur,closedAngle:d.a0,openAngle:d.a1,lengthMm:d.L*1000}];
  }));
  const sliding=[];archUp.traverse(o=>{if(!o.isMesh)return;const b=bounds(o);
   if(o.userData.doorSourceId==='balcony_door')sliding.push({...b,role:o.userData.role||o.userData.modelVariant});
   else if(o.material===glassMat&&b.min[0]>=6750-.4&&b.max[0]<=6870+.4&&b.min[2]>=9600-.4&&b.max[2]<=11100+.4&&Math.abs(b.max[0]-b.min[0]-20)<.4)sliding.push({...b,role:'sliding-leaf'});
  });
  const sills=[];archFloor.traverse(o=>{if(o.isMesh){const b=bounds(o);if(Math.abs(b.min[0]-6750)<.4&&Math.abs(b.max[0]-6870)<.4&&Math.abs(b.min[2]-9600)<.4&&Math.abs(b.max[2]-11100)<.4)sills.push(b);}});
  return{furniture,doors:doorGeometry,sliding,sills,triangles:renderer.info.render.triangles};
 },
 doorClickPoint:(id,debug=false)=>{
  const d=doors.find(d=>d.sourceId===id);if(!d)return null;scene.updateMatrixWorld(true);
  const r=renderer.domElement.getBoundingClientRect(),probes=[];
  for(const x of [.2,.4,.6,.8])for(const y of [.4,.7,1])for(const z of [-.021,.021]){
   const p=d.pivot.localToWorld(new THREE.Vector3(d.L*x,y,z)).project(camera),clientX=r.left+(p.x+1)*r.width/2,clientY=r.top+(1-p.y)*r.height/2;
   if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)continue;
   const hit=pick({clientX,clientY});if(debug)probes.push({clientX,clientY,hit:hit?.door?.sourceId||hit?.fid||hit?.room||null});if(hit?.door?.sourceId===id)return{clientX,clientY};
  }
  return debug?{sourceId:d.sourceId,open:d.open,angle:d.cur,camera:[camera.position.x*1000+OX,camera.position.y*1000,camera.position.z*1000+OY],probes}:null;
 },
 camera:(position,target)=>{
  fly=null;opt.cut=1.2;syncCutBtns();sync();showLabels(false);opt.labels=false;
  orbit.enableDamping=false;orbit.minDistance=.1;orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));
  camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);
 }
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const probe=document.createElement('canvas');probe.width=probe.height=64;const g=probe.getContext('2d');g.drawImage(c,0,0,64,64);const pixels=g.getImageData(0,0,64,64).data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);return colors.size>25;};
const keys=['cx','cy','w','d','rot','heightMm','elevationMm','name','color'];
const closeRect=(mesh,rect,label)=>{eq(mesh.min[0],rect[0],label+' min x');eq(mesh.min[2],rect[1],label+' min y');eq(mesh.max[0],rect[2],label+' max x');eq(mesh.max[2],rect[3],label+' max y');};

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 const errors=[],networkFailures=[],screenshots=[],report={revision:revisionId,migration:null,unchangedOtherSchemes:[],doorClicks:[],geometry:{}};page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>networkFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('dialog',d=>d.accept());
 await context.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
 await context.route(base+'/**',async route=>{if(route.request().resourceType()!=='document')return route.fallback();try{const response=await route.fetch({timeout:90000}),html=await response.text();assert.ok(html.includes('window.View3D ='),'3D hook anchor missing');return await route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});}catch(error){networkFailures.push({url:route.request().url(),error:'QA document interception: '+error.message});await route.abort('failed').catch(()=>{});}});
 const open=async(id,three=false)=>{await page.goto(`${base}/?scheme=${id}${three?'&view=3d':''}`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture));assert.equal(await page.locator('#schemeSelect').inputValue(),id);};
 const reload=async()=>{await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D);};
 const reset=async()=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await page.locator('details.menu > summary').click();await page.locator('#reset').click();await page.locator('details.menu').evaluate(e=>e.open=false);};
 const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});screenshots.push(file);};
 try{
  const family=plans.schemes.family,u=family.metadata.familyStudyLaundryUpdate;assert.equal(u?.id,revisionId,'bundle lacks confirmed study/laundry layer');
  assert.deepEqual(u.newFurnitureIds,['study_window_return']);assert.deepEqual(u.removedFurnitureIds.slice().sort(),['fit-laundry_basin','fit-laundry_wall']);
  const baseline=beforeFamilyStudyLaundry(family);assert.equal(baseline.metadata.familyStudyLaundryUpdate,undefined,'baseline helper failed to remove new layer');
  for(const id of ['wood','laundry','screen']){
   await open(id);const current=await page.evaluate(()=>({plan:structuredClone(HOUSE_PLAN),key:STORE}));
   assert.deepEqual(current.plan,plans.schemes[id],id+': runtime model differs from bundle');assert.equal(current.plan.metadata.familyStudyLaundryUpdate,undefined,id+': unauthorized study/laundry layer');report.unchangedOtherSchemes.push(id);
  }
  await open('family');const expectedKey=`floorplan:house-design:family:${plans.version}:${baseline.metadata.source.sha256.slice(0,12)}`;assert.equal(await page.evaluate(()=>STORE),expectedKey,'upgrade changed draft storage key');
  if(!process.argv.includes('--published-smoke')){
   const oldDraft=async(mode='default')=>page.evaluate(({old,revisionId,mode,removed})=>{
    const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>id!==revisionId);
    if(mode==='custom'){
     for(const id of ['study_full_desk','fit-study_bookwall','vanity_guest','laundry_washer','laundry_dryer']){
      const f=s.furniture.find(f=>f.id===id);f.cx+=37;f.cy+=49;f.w+=20;f.d+=30;f.rot=(f.rot+90)%360;f.color='#668899';f.name='QA '+id;f.heightMm+=11;
     }
     for(const id of removed){const f=s.furniture.find(f=>f.id===id);f.cx+=23;f.name='QA archived '+id;f.color='#336688';}
     s.furniture=s.furniture.filter(f=>f.id!=='study_north_sofa');s.measures=[{a:{x:1,y:2},b:{x:1001,y:2}}];s.rooms.room_c.mat='terrazzo';s.demolished=['w1','w40','w41'];
    }
    if(mode==='deleted')s.furniture=s.furniture.filter(f=>!['study_full_desk','vanity_guest','laundry_washer'].includes(f.id));
    if(mode==='empty')s.furniture=[];
    localStorage.setItem(STORE,JSON.stringify(s));return{key:STORE,old:structuredClone(s)};
   },{old:baseline,revisionId,mode,removed:u.removedFurnitureIds});
   console.log('Migration: old default');const prior=await oldDraft();await reload();const migrated=await page.evaluate(()=>({key:STORE,state:structuredClone(state),saved:JSON.parse(localStorage.getItem(STORE))}));
   assert.equal(migrated.key,prior.key);assert.ok(migrated.saved.appliedLayoutRevisions.includes(revisionId));assert.equal(migrated.state.furniture.length,family.defaultFurniture.length);
   for(const f of family.defaultFurniture){const current=migrated.state.furniture.find(q=>q.id===f.id);assert.ok(current,`${f.id}: missing migration object`);for(const key of [...keys,'type','face','parts','mattressMm'])assert.deepEqual(current[key],f[key],`${f.id}: default migration ${key}`);}
   assert.deepEqual(migrated.state.layoutMigrationKeptIds||[],[]);assert.equal(migrated.state.layoutMigrationArchive.filter(a=>a.revisionId===revisionId).length,2,'removed defaults must archive exactly once');
   console.log('Migration: repeated reload');await reload();assert.equal(await page.evaluate(()=>state.furniture.length),family.defaultFurniture.length,'repeated reload duplicates new return');assert.equal(await page.evaluate(id=>state.layoutMigrationArchive.filter(a=>a.revisionId===id).length,revisionId),2,'repeated reload duplicates archive');
   console.log('Migration: customized draft');const custom=await oldDraft('custom');await reload();const customized=await page.evaluate(()=>structuredClone(state));
   for(const fid of ['study_full_desk','fit-study_bookwall','vanity_guest','laundry_washer','laundry_dryer'])for(const key of keys)assert.deepEqual(customized.furniture.find(f=>f.id===fid)[key],custom.old.furniture.find(f=>f.id===fid)[key],`${fid}: user ${key} overwritten`);
   for(const fid of u.removedFurnitureIds){assert.equal(customized.furniture.some(f=>f.id===fid),false,`${fid}: removed fixture remains in active scene`);assert.deepEqual(customized.layoutMigrationArchive.find(a=>a.revisionId===revisionId&&a.furniture.id===fid)?.furniture,custom.old.furniture.find(f=>f.id===fid),`${fid}: customized removed object not archived exactly`);}
   assert.equal(customized.furniture.some(f=>f.id==='study_north_sofa'),false,'deleted unchanged sofa revived');assert.ok(customized.furniture.some(f=>f.id==='study_window_return'),'new return not inserted into nonempty old draft');assert.deepEqual(customized.measures,custom.old.measures);assert.equal(customized.rooms.room_c.mat,'terrazzo');assert.deepEqual(customized.demolished,['w1','w40'],'removed return-wall index and shifted later wall index not remapped');assert.ok(customized.layoutMigrationKeptIds.includes('vanity_guest'));await page.locator('[data-layout-migration-warning]').waitFor({state:'visible'});
   await page.evaluate(()=>save());await reload();assert.deepEqual(await page.evaluate(()=>state.measures),custom.old.measures,'save/reload lost measure');
   console.log('Migration: deleted objects');await oldDraft('deleted');await reload();for(const fid of ['study_full_desk','vanity_guest','laundry_washer'])assert.equal(await page.evaluate(fid=>Boolean(getF(fid)),fid),false,`${fid}: deleted revised fixture revived`);
   await page.evaluate(()=>{state.furniture=state.furniture.filter(f=>f.id!=='study_window_return');save();});await reload();assert.equal(await page.evaluate(()=>Boolean(getF('study_window_return'))),false,'deleted new return revived after applied revision');
   console.log('Migration: empty draft');await oldDraft('empty');await reload();assert.equal(await page.evaluate(()=>state.furniture.length),0,'empty draft auto-filled');
   await reset();const restored=await page.evaluate(()=>({furniture:structuredClone(state.furniture),applied:state.appliedLayoutRevisions}));assert.deepEqual(restored.furniture,family.defaultFurniture,'reset does not load current defaults');assert.ok(restored.applied.includes(revisionId));
   report.migration={storageKeyStable:true,defaultUpgrade:true,customPositionsRotationsSizesHeightsColorsNamesPreserved:true,removedDefaultsAndCustomObjectsArchivedExactlyOnce:true,demolitionWallIndicesRemapped:true,deletedRevisedFixturesPreserved:true,deletedUnchangedSofaPreserved:true,deletedAddedReturnPreserved:true,emptyDraftPreserved:true,resetLoadsNew:true};
  }
  console.log('Actual WebGL: current default');await open('family',true);await page.waitForFunction(()=>window.__familyStudyLaundryQA.ready());await page.waitForFunction(painted);await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);});
  let actual=await page.evaluate(()=>window.__familyStudyLaundryQA.inspect());assert.ok(actual.triangles>1000,'WebGL rendered too few triangles');
  for(const [fid,x,y]of [['study_full_desk',960,5925],['study_window_return',370,5345],['fit-study_bookwall',960,6058.75],['laundry_washer',4479,5305],['vanity_guest',4690,5290],['laundry_dryer',7650,10750]]){
   const g=actual.furniture[fid];assert.ok(g?.meshes.length,fid+': no actual 3D meshes');eq(g.center[0],x,fid+' actual x');eq(g.center[1],y,fid+' actual y');eq(g.rotation,fid==='laundry_dryer'?-Math.PI:0,fid+' actual rotation');
  }
  assert.ok(actual.furniture.study_north_sofa,'current north sofa missing');assert.equal(family.defaultFurniture.some(f=>f.roomId==='room_c'&&f.type==='bed'),false,'future double-bed was installed without approval');assert.deepEqual(family.defaultFurniture.filter(f=>f.type==='bed').map(f=>f.id),baseline.defaultFurniture.filter(f=>f.type==='bed').map(f=>f.id),'future preview added an active bed');
  for(const id of u.removedFurnitureIds)assert.equal(actual.furniture[id],undefined,id+': removed double-machine cabinet still rendered');
  const balconyMachines=family.defaultFurniture.filter(f=>['washer','dryer'].includes(f.type)&&f.roomId==='balcony');assert.deepEqual(balconyMachines.map(f=>f.id),['laundry_dryer'],'balcony does not contain only the dryer');
  for(const [id,rect]of [['study_full_desk',[120,5650,1800,6200]],['study_window_return',[120,5040,620,5650]]]){
   const g=actual.furniture[id],table=g.meshes.find(m=>Math.abs(m.max[0]-m.min[0]-(rect[2]-rect[0]))<tol&&Math.abs(m.max[2]-m.min[2]-(rect[3]-rect[1]))<tol&&m.max[1]<800&&m.min[1]>650);
   assert.ok(table,id+': exact full-size desktop mesh missing');closeRect(table,rect,id+' actual desktop');eq(table.max[1],740,id+' actual tabletop height');report.geometry[id]={tabletopBoundsMm:table};
  }
  if(family.defaultFurniture.find(f=>f.id==='study_full_desk').modelVariant==='north-facing-workstation'){
   const screen=actual.furniture.study_full_desk.meshes.find(m=>Math.abs(m.max[0]-m.min[0]-600)<tol&&Math.abs(m.max[2]-m.min[2]-2)<tol&&m.max[1]-m.min[1]>300&&m.max[1]-m.min[1]<350);
   assert.ok(screen,'north-facing workstation actual screen face missing');eq(screen.normal[2],-1,'actual computer screen faces north toward study chair');report.geometry.study_full_desk.screenFacesNorth=true;
  }
  const bookshelf=actual.furniture['fit-study_bookwall'];assert.ok(bookshelf.min[0]>=119&&bookshelf.max[0]<=1801,'shortened actual bookshelf exceeds the 1680-mm desk span');
  const washer=actual.furniture.laundry_washer,dryer=actual.furniture.laundry_dryer;
  eq(washer.max[1],840,'actual washer highest solid point');eq(dryer.max[1],840,'actual dryer highest solid point');
  closeRect(washer,[4179,5040,4779,5570],'actual washer footprint');closeRect(dryer,[7350,10450,7950,11050],'actual dryer footprint');
  const vanity=actual.furniture.vanity_guest,counterParts=vanity.meshes.filter(m=>m.role==='countertop');assert.equal(counterParts.length,4,'actual split worktop must leave basin opening');
  const counter={min:[0,1,2].map(i=>Math.min(...counterParts.map(m=>m.min[i]))),max:[0,1,2].map(i=>Math.max(...counterParts.map(m=>m.max[i])))};
  closeRect(counter,[4140,4990,5240,5590],'actual guest counter');for(const top of counterParts){eq(top.min[1],890,'actual counter underside');eq(top.max[1],920,'actual counter top');const holeCovered=Math.min(top.max[0],5200)-Math.max(top.min[0],4840)>tol&&Math.min(top.max[2],5390)-Math.max(top.min[2],5040)>tol;assert.equal(holeCovered,false,'solid actual worktop covers the small basin opening');}eq(counter.min[1]-washer.max[1],50,'washer top to counter underside');
  const sinkMeshes=vanity.meshes.filter(m=>m.role==='basin-wall');assert.equal(sinkMeshes.length,4,'actual basin requires four open surrounding walls');
  for(const basin of sinkMeshes){assert.ok(basin.min[0]>=4840-tol&&basin.max[0]<=5200+tol,'actual basin wall outside right small-sink bay');eq(basin.max[1],920,'actual basin rim meets countertop');}
  assert.ok(sinkMeshes.length,'right-only independent basin did not render');assert.ok(sinkMeshes.every(m=>m.min[0]>washer.max[0]),'basin is above washer body rather than separate right bay');
  const mirrorFace=vanity.meshes.find(m=>m.role==='mirror-face');assert.ok(mirrorFace,'actual right-basin mirror face missing');assert.ok(mirrorFace.materials.some(m=>m.metalness===.55&&m.roughness===.06),'new guest mirror accidentally uses rough cabinet material');assert.ok(mirrorFace.min[0]>washer.max[0],'new mirror overlaps washer bay rather than right basin');
  report.geometry.washer={boundsMm:{min:washer.min,max:washer.max},topGapMm:50};report.geometry.dryer={boundsMm:{min:dryer.min,max:dryer.max}};report.geometry.guestCounter={boundsMm:counter,rightOnlyBasinMeshes:sinkMeshes.length};
  assert.deepEqual(family.SLIDES.find(s=>s.id==='balcony_door').rect,[6750,9600,6870,11100]);
  const slideLeaves=actual.sliding.filter(s=>s.role==='sliding-leaf');assert.equal(slideLeaves.length,3,'retreated actual balcony must have three glass leaves');
  eq(slideLeaves.reduce((sum,s)=>sum+(s.min[0]+s.max[0])/2,0)/3,6810,'retreated actual sliding leaf axis');for(const leaf of slideLeaves){eq(leaf.min[2],10580,'south-stacked leaf north edge');eq(leaf.max[2],11100,'south-stacked leaf south edge');}
  assert.ok(actual.sills.length,'retreated actual balcony sill missing');closeRect(actual.sills[0],[6750,9600,6870,11100],'retreated actual balcony door sill');report.geometry.balconyFrame={sillBoundsMm:actual.sills[0],threeLeafBoundsMm:slideLeaves};
  const source=family.DOORS.find(d=>d.id==='door_c');assert.deepEqual(source.h,[2400,5040]);assert.equal(source.openingWidthMm,900);eq(actual.doors.door_c.lengthMm,780,'study actual door leaf');
  for(let i=0;i<2;i++){eq(actual.doors.door_c.start[i],source.h[i],'study actual hinge');eq(actual.doors.door_c.end[i],source.h[i]+source.o[i]*source.len,'study initially parked endpoint');}
  const aim=async(position,target)=>{await page.evaluate(({position,target})=>window.__familyStudyLaundryQA.camera(position,target),{position,target});await page.waitForFunction(painted);};
  const point=async(id,open)=>{
   const views=id==='door_c'?[[[1150,1700,5420],[2000,700,open?5040:5300]],[[1700,2400,5910],[2200,700,5300]],[[3300,2200,5740],[2400,700,5300]]]:[[[4100,2000,6020],[3650,700,5300]],[[3900,2000,5550],[3650,700,5270]],[[3850,2400,5880],[3700,700,5300]]];
   for(const [position,target]of views){await aim(position,target);const hit=await page.evaluate(id=>window.__familyStudyLaundryQA.doorClickPoint(id),id);if(hit)return hit;}
   await shot(id+'-pointer-failure');const details=await page.evaluate(id=>window.__familyStudyLaundryQA.doorClickPoint(id,true),id);fs.writeFileSync(path.join(out,id+'-pointer-failure.json'),JSON.stringify(details,null,2)+'\n');throw Error(id+': no visible actual door surface, currently '+(open?'open':'closed'));
  };
  for(const id of ['door_c','door_bath_2'])for(const openDoor of [false,true]){
   const d=family.DOORS.find(d=>d.id===id),hit=await point(id,!openDoor);console.log('Pointer operation:',id,openDoor?'open':'close');await page.mouse.click(hit.clientX,hit.clientY);
   await page.waitForFunction(({id,open})=>window.__familyStudyLaundryQA.doorSettled(id,open),{id,open:openDoor},{polling:100});actual=await page.evaluate(()=>window.__familyStudyLaundryQA.inspect());const actualDoor=actual.doors[id],vector=openDoor?d.o:d.c;
   for(let i=0;i<2;i++){eq(actualDoor.start[i],d.h[i],id+' operated hinge');eq(actualDoor.end[i],d.h[i]+vector[i]*d.len,id+' operated endpoint');}report.doorClicks.push({id,open:openDoor,actualEndpointMm:actualDoor.end});
  }
  await aim([3150,4400,3200],[1250,750,5100]);await shot('family-study-7desk-sofa-3d');
  await aim([3850,3500,6700],[4950,750,5350]);await shot('family-guest-washer-under-counter-3d');
  await aim([5200,3800,8400],[7600,700,10450]);await shot('family-balcony-single-dryer-retreated-3d');
  await open('family');await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);fitView();});await shot('family-study-laundry-confirmed-plan');
  assert.deepEqual(errors,[],'browser runtime errors');const result={status:'PASS',...report,browserErrors:errors,screenshots};fs.writeFileSync(path.join(out,process.argv.includes('--published-smoke')?'browser-report-smoke.json':'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(error){await shot('failure');fs.writeFileSync(path.join(out,'failure.html'),await page.content());console.error(JSON.stringify({status:'FAIL',progress:report,browserErrors:errors,networkFailures,url:page.url()},null,2));throw error;}
 finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
