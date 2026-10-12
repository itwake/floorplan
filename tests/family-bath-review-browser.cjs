'use strict';

// QA hooks exist only in a disposable intercepted document. Nothing is added
// to the application, persisted user draft or shipped model. Door operation
// is exercised through actual pointer clicks, not a synthetic mesh rotation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js');
const {beforeFamilyBathReview}=require('./family-bath-review-20261011.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
const base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,''),out=path.resolve(process.env.FLOORPLAN_BATH_SHOTS||path.join(root,'..','output','family-bath-publish-20261011-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const revisionId='family-master-bath-confirmed-20261011',tol=.3,eq=(a,b,label)=>assert.ok(Math.abs(a-b)<tol,`${label}: ${a} != ${b}`);
const ids=['door_a','door_bath_1'];
const hook=`window.__familyBathQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow>.999&&furnGrow>.999),
 doorSettled:(id,open)=>{const d=doors.find(d=>d.sourceId===id);return Boolean(d&&d.open===open&&Math.abs(d.cur-(open?d.a1:d.a0))<.0001);},
 inspect:()=>{
  scene.updateMatrixWorld(true);
  const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};
  const furniture=Object.fromEntries(furnG.children.map(g=>{
   const meshes=[];
   if(['vanity_main','family-f11','family-f12'].includes(g.userData.fid))g.traverse(o=>{
    if(!o.isMesh)return;const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>({metalness:m.metalness,roughness:m.roughness,color:m.color?.getHexString()}));
    const center=o.localToWorld(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).transformDirection(o.matrixWorld);
    meshes.push({...bounds(o),role:o.userData.role||null,materials,center:[center.x*1000+OX,center.y*1000,center.z*1000+OY],normal:[normal.x,normal.y,normal.z]});
   });
   return[g.userData.fid,{...bounds(g),center:[g.position.x*1000+OX,g.position.z*1000+OY],rotation:g.rotation.y,meshes}];
  }));
  const doorGeometry=Object.fromEntries(doors.filter(d=>d.sourceId).map(d=>{
   const start=d.pivot.localToWorld(new THREE.Vector3()),end=d.pivot.localToWorld(new THREE.Vector3(d.L,0,0));
   return[d.sourceId,{open:d.open,start:[start.x*1000+OX,start.z*1000+OY],end:[end.x*1000+OX,end.z*1000+OY],angle:d.cur,closedAngle:d.a0,openAngle:d.a1,lengthMm:d.L*1000}];
  }));
  return{furniture,doors:doorGeometry,triangles:renderer.info.render.triangles};
 },
 doorClickPoint:(id,debug=false)=>{
  const d=doors.find(d=>d.sourceId===id);if(!d)return null;scene.updateMatrixWorld(true);
  const r=renderer.domElement.getBoundingClientRect(),probes=[];
  for(const x of [.2,.4,.6,.8])for(const y of [.4,.7,1])for(const z of [-.021,.021]){
   const p=d.pivot.localToWorld(new THREE.Vector3(d.L*x,y,z)).project(camera),clientX=r.left+(p.x+1)*r.width/2,clientY=r.top+(1-p.y)*r.height/2;
   if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)continue;
   const hit=pick({clientX,clientY});if(debug)probes.push({clientX,clientY,hit:hit?.door?.sourceId||hit?.fid||hit?.room||null,first:ray.intersectObjects([...(opt.furn?[furnG]:[]),archUp,archFloor],true).slice(0,4).map(h=>({type:h.object.type,visible:h.object.visible,parentVisible:h.object.parent?.visible,role:h.object.userData.role,walkOnly:h.object.userData.walkOnly,door:h.object.userData.door?.sourceId,dist:h.distance}))});if(hit?.door?.sourceId===id)return{clientX,clientY,...(debug?{rawFirstHits:probes[probes.length-1].first}:{})};
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

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 const errors=[],screenshots=[],report={revision:revisionId,migration:null,unchangedOtherSchemes:[],doorClicks:[],actualMirror:null};page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await context.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
 await context.route(base+'/**',async route=>{if(route.request().resourceType()!=='document')return route.fallback();const response=await route.fetch(),html=await response.text();assert.ok(html.includes('window.View3D ='),'3D hook anchor missing');return route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});});
 const open=async(id,three=false)=>{await page.goto(`${base}/?scheme=${id}${three?'&view=3d':''}`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture));assert.equal(await page.locator('#schemeSelect').inputValue(),id);};
 const reload=async()=>{await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D);};
 const reset=async()=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await page.locator('details.menu > summary').click();await page.locator('#reset').click();await page.locator('details.menu').evaluate(e=>e.open=false);};
 const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});screenshots.push(file);};
 try{
  const family=plans.schemes.family,u=family.metadata.familyBathUpdate;assert.equal(u?.id,revisionId,'current bundle lacks owner-confirmed bath layer');
  assert.deepEqual(u.previousFurniture.map(f=>f.id).sort(),['family-f11','family-f3','vanity_main']);
  // A pure bathroom update must neither migrate nor amend unrelated schemes.
  for(const id of ['wood','laundry','screen']){
   await open(id);const current=await page.evaluate(()=>({plan:structuredClone(HOUSE_PLAN),key:STORE}));
   assert.deepEqual(current.plan,plans.schemes[id],id+': browser model differs from bundled source');assert.equal(current.plan.metadata.familyBathUpdate,undefined,id+': unauthorized bathroom revision');
   report.unchangedOtherSchemes.push(id);
  }
  await open('family');
  const baseline=beforeFamilyBathReview(family),expectedKey=`floorplan:house-design:family:${plans.version}:${baseline.metadata.source.sha256.slice(0,12)}`;
  assert.equal(await page.evaluate(()=>STORE),expectedKey,'bath upgrade changed draft storage key');
  if(!process.argv.includes('--published-smoke')){
   const oldDraft=async(mode='default')=>page.evaluate(({old,revisionId,mode})=>{
    const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>![revisionId,'family-study-laundry-confirmed-20261011','family-door-refinement-20261011','family-study-door-20261012','family-appliances-20261012','family-ac-window-20261012','family-living-clear-20261012'].includes(id));
    if(mode==='custom'){
     for(const id of ['vanity_main','family-f11']){
      const f=s.furniture.find(f=>f.id===id);f.cx+=37;f.cy+=49;f.w+=20;f.d+=30;f.rot=90;f.color='#668899';f.name='QA '+id;f.heightMm+=11;
     }
     const wardrobe=s.furniture.find(f=>f.id==='family-f3');wardrobe.cx+=31;wardrobe.rot=180;wardrobe.color='#336688';
     s.furniture=s.furniture.filter(f=>f.id!=='family-f12');s.measures=[{a:{x:1,y:2},b:{x:1001,y:2}}];s.rooms.bath_1.mat='terrazzo';
    }
    if(mode==='deleted')s.furniture=s.furniture.filter(f=>f.id!=='vanity_main'&&f.id!=='family-f11');
    if(mode==='empty')s.furniture=[];
    localStorage.setItem(STORE,JSON.stringify(s));return{key:STORE,old:structuredClone(s)};
   },{old:baseline,revisionId,mode});
   const prior=await oldDraft();await reload();
   const migrated=await page.evaluate(()=>({key:STORE,state:structuredClone(state),saved:JSON.parse(localStorage.getItem(STORE))}));
   assert.equal(migrated.key,prior.key);assert.ok(migrated.saved.appliedLayoutRevisions.includes(revisionId));assert.equal(migrated.state.furniture.length,family.defaultFurniture.length);
   for(const f of family.defaultFurniture){const current=migrated.state.furniture.find(q=>q.id===f.id);assert.ok(current,`${f.id}: missing during migration`);for(const key of ['cx','cy','w','d','rot','heightMm','name','color','face','parts','mattressMm'])assert.deepEqual(current[key],f[key],`${f.id}: default migration ${key}`);}
   assert.deepEqual(migrated.state.layoutMigrationKeptIds||[],[]);await reload();assert.equal(await page.evaluate(()=>state.furniture.length),family.defaultFurniture.length,'repeated reload duplicated furniture');
   const custom=await oldDraft('custom');await reload();const customized=await page.evaluate(()=>structuredClone(state));
   for(const fid of ['vanity_main','family-f11','family-f3'])for(const key of ['cx','cy','w','d','rot','heightMm','name','color'])assert.deepEqual(customized.furniture.find(f=>f.id===fid)[key],custom.old.furniture.find(f=>f.id===fid)[key],`${fid}: user ${key} overwritten`);
   assert.equal(customized.furniture.some(f=>f.id==='family-f12'),false,'deleted unchanged shower revived');assert.deepEqual(customized.measures,custom.old.measures);assert.equal(customized.rooms.bath_1.mat,'terrazzo');assert.ok(customized.layoutMigrationKeptIds.includes('vanity_main'));assert.ok(customized.layoutMigrationKeptIds.includes('family-f11'));await page.locator('[data-layout-migration-warning]').waitFor({state:'visible'});
   await page.evaluate(()=>save());await reload();assert.deepEqual(await page.evaluate(()=>state.measures),custom.old.measures,'save/reload lost measure');
   await oldDraft('deleted');await reload();for(const fid of ['vanity_main','family-f11'])assert.equal(await page.evaluate(fid=>Boolean(getF(fid)),fid),false,`${fid}: deleted revised fixture revived`);
   await oldDraft('empty');await reload();assert.equal(await page.evaluate(()=>state.furniture.length),0,'empty draft auto-filled');
   await reset();const restored=await page.evaluate(()=>({furniture:structuredClone(state.furniture),applied:state.appliedLayoutRevisions}));assert.deepEqual(restored.furniture,family.defaultFurniture,'reset did not load current defaults');assert.ok(restored.applied.includes(revisionId));
   report.migration={storageKeyStable:true,defaultUpgrade:true,customPositionsRotationsSizesHeightsColorsNamesPreserved:true,deletedRevisedFixturesPreserved:true,deletedUnchangedShowerPreserved:true,emptyDraftPreserved:true,resetLoadsNew:true};
  }
  // One actual WebGL scene is enough here. Hash/geometry tests cover the exact
  // other-three historical models; the browser also loaded them unchanged.
  await open('family',true);await page.waitForFunction(()=>window.__familyBathQA.ready());await page.waitForFunction(painted);
  await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);});
  let actual=await page.evaluate(()=>window.__familyBathQA.inspect());assert.ok(actual.triangles>1000,'WebGL rendered too few triangles');
  for(const id of ids){const d=family.DOORS.find(q=>q.id===id),mesh=actual.doors[id];assert.ok(mesh);assert.equal(mesh.open,true);eq(mesh.lengthMm,d.len,id+' actual leaf length');for(let i=0;i<2;i++){eq(mesh.start[i],d.h[i],id+' actual hinge');eq(mesh.end[i],d.h[i]+d.o[i]*d.len,id+' actual open endpoint');}}
  assert.deepEqual(family.DOORS.find(d=>d.id==='door_a').h,[3435,4690]);assert.deepEqual(family.DOORS.find(d=>d.id==='door_bath_1').h,[4450,3500]);
  for(const [fid,x,y]of [['vanity_main',4830,4690],['family-f11',5570,4580]]){const g=actual.furniture[fid];assert.ok(g?.meshes.length,fid+': 3D mesh missing');eq(g.center[0],x,fid+' actual x');eq(g.center[1],y,fid+' actual y');eq(g.rotation,-Math.PI,fid+' actual 180 rotation');}
  const mirror=actual.furniture.vanity_main.meshes.find(m=>m.materials.some(q=>q.metalness===.55&&q.roughness===.06));assert.ok(mirror,'actual mirror material/mesh missing');eq(mirror.center[0],4830,'mirror center x');assert.ok(mirror.center[2]>4790&&mirror.max[2]<=4870+tol,'mirror is not attached to the south-side back of the actual vanity envelope');eq(mirror.normal[0],0,'mirror normal x');eq(mirror.normal[2],-1,'mirror must face north');assert.ok(mirror.max[1]>1100,'mirror was mistaken for basin');report.actualMirror={centerMm:mirror.center,normal:mirror.normal};
  const shower=actual.furniture['family-f12'],sourceShower=baseline.defaultFurniture.find(f=>f.id==='family-f12');assert.deepEqual(family.defaultFurniture.find(f=>f.id==='family-f12'),sourceShower,'source shower changed');eq(shower.center[0],6260,'shower x');eq(shower.center[1],4105,'shower y');eq(shower.rotation,0,'shower rotation');
  const wc=actual.furniture['family-f11'],tank=wc.meshes.filter(m=>m.min[1]>=350&&m.max[1]>750).sort((a,b)=>b.max[2]-a.max[2])[0];assert.ok(tank&&tank.center[2]>4580,'toilet tank is not south of its bowl/front');
  const aim=async(position,target)=>{await page.evaluate(({position,target})=>window.__familyBathQA.camera(position,target),{position,target});await page.waitForFunction(painted);};
  const point=async(id,open)=>{
   const views=id==='door_a'?[[[3920,1600,4230],[3850,850,open?4690:4300]],[[4100,2000,5000],[3800,700,4400]],[[4000,1900,4000],[3700,700,4400]]]:[[[4950,1700,4050],[4750,850,open?3500:3800]],[[4900,1800,3800],[4590,700,3800]],[[5250,2100,4150],[4650,700,3750]]];
   for(const [position,target]of views){await aim(position,target);const hit=await page.evaluate(id=>window.__familyBathQA.doorClickPoint(id),id);if(hit)return hit;}
   await shot(id+'-pointer-failure');const details=await page.evaluate(id=>window.__familyBathQA.doorClickPoint(id,true),id);fs.writeFileSync(path.join(out,id+'-pointer-failure.json'),JSON.stringify(details,null,2)+'\n');
   throw Error(id+': no visible real door surface found for pointer operation, currently '+(open?'open':'closed'));
  };
  for(const id of ids){
   const source=family.DOORS.find(d=>d.id===id);
   for(const open of [false,true]){
    console.log('Pointer operation:',id,open?'open':'close');
    const hit=await point(id,!open);
    if(id==='door_a'&&!open){const diagnosis=await page.evaluate(id=>window.__familyBathQA.doorClickPoint(id,true),id);assert.ok(diagnosis?.rawFirstHits?.some(h=>h.type==='LineSegments'&&!h.visible&&h.walkOnly),'hidden helper regression ray no longer exercises the originally occluding outline');report.hiddenHelperIgnoredByActualPicker=true;}
    await page.mouse.click(hit.clientX,hit.clientY);
    await page.waitForFunction(({id,open})=>window.__familyBathQA.doorSettled(id,open),{id,open},{polling:100});
    actual=await page.evaluate(()=>window.__familyBathQA.inspect());const d=actual.doors[id],vector=open?source.o:source.c;
    for(let i=0;i<2;i++){eq(d.start[i],source.h[i],id+' operated hinge');eq(d.end[i],source.h[i]+vector[i]*source.len,id+' operated '+(open?'open':'closed')+' endpoint');}
    report.doorClicks.push({id,open,actualEndpointMm:d.end});
   }
  }
  await aim([8300,6200,6400],[4750,550,3910]);await shot('family-master-entry-bath-3d-open');
  await aim([4800,2700,3200],[5250,900,4650]);await shot('family-south-wall-vanity-toilet-3d');
  await open('family');await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);fitView();});await shot('family-confirmed-plan');
  assert.deepEqual(errors,[],'browser errors');const result={status:'PASS',...report,browserErrors:errors,screenshots};fs.writeFileSync(path.join(out,process.argv.includes('--published-smoke')?'browser-report-smoke.json':'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(error){console.error(JSON.stringify({status:'FAIL',progress:report,browserErrors:errors,url:page.url()},null,2));throw error;}
 finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
