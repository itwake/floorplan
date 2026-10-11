'use strict';

// Isolated Playwright/WebGL QA. The inspection hook lives only in a disposable
// intercepted document; no hook is shipped and no personal browser is touched.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js');
const {beforeFamilyDoorRefinement}=require('../tools/family-door-refinement-20261011.cjs');
const {beforeFamilyStudyDoor}=require('../tools/family-study-door-20261012.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
const base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,''),out=path.resolve(process.env.FLOORPLAN_DOOR_REFINEMENT_SHOTS||path.join(root,'..','output','family-door-refinement-publish-20261011-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const revisionId='family-door-refinement-20261011',slideIds=['door_kitchen','balcony_door'],tol=.4;
const eq=(a,b,label)=>assert.ok(Math.abs(a-b)<tol,`${label}: ${a} != ${b}`);
const placementKeys=['cx','cy','w','d','rot','heightMm','elevationMm','name','color'];
const hook=`window.__familyDoorRefinementQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow>.999&&furnGrow>.999),
 doorSettled:(id,open)=>{const d=doors.find(d=>d.sourceId===id);return Boolean(d&&d.open===open&&Math.abs(d.cur-(open?d.a1:d.a0))<.0001);},
 inspect:()=>{
  scene.updateMatrixWorld(true);
  const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};
  const sliding=Object.fromEntries(${JSON.stringify(slideIds)}.map(id=>{
   const s=SLIDES.find(s=>(s.sourceId||s.id)===id),leaves=[],sills=[];
   if(s){const [x0,y0,x1,y1]=s.rect;
    archUp.traverse(o=>{if(!o.isMesh||o.material!==glassMat)return;const b=bounds(o),inside=b.min[0]>=x0-.4&&b.max[0]<=x1+.4&&b.min[2]>=y0-.4&&b.max[2]<=y1+.4;
     if(inside&&Math.abs((s.v?b.max[0]-b.min[0]:b.max[2]-b.min[2])-20)<.4)leaves.push(b);
    });
    archFloor.traverse(o=>{if(!o.isMesh)return;const b=bounds(o);if(Math.abs(b.min[0]-x0)<.4&&Math.abs(b.max[0]-x1)<.4&&Math.abs(b.min[2]-y0)<.4&&Math.abs(b.max[2]-y1)<.4)sills.push(b);});
   }
   return[id,{leaves,sills}];
  }));
  const furniture=Object.fromEntries(furnG.children.map(g=>[g.userData.fid,{...bounds(g),center:[g.position.x*1000+OX,g.position.z*1000+OY],rotation:g.rotation.y}]));
  const doorGeometry=Object.fromEntries(doors.filter(d=>d.sourceId).map(d=>{
   const start=d.pivot.localToWorld(new THREE.Vector3()),end=d.pivot.localToWorld(new THREE.Vector3(d.L,0,0));
   return[d.sourceId,{open:d.open,start:[start.x*1000+OX,start.z*1000+OY],end:[end.x*1000+OX,end.z*1000+OY],lengthMm:d.L*1000}];
  }));
  return{sliding,furniture,doors:doorGeometry,triangles:renderer.info.render.triangles};
 },
 doorClickPoint:(id,debug=false)=>{
  const d=doors.find(d=>d.sourceId===id);if(!d)return null;scene.updateMatrixWorld(true);
  const r=renderer.domElement.getBoundingClientRect(),probes=[];
  for(const x of [.2,.4,.6,.8])for(const y of [.4,.7,1])for(const z of [-.021,.021]){
   const p=d.pivot.localToWorld(new THREE.Vector3(d.L*x,y,z)).project(camera),clientX=r.left+(p.x+1)*r.width/2,clientY=r.top+(1-p.y)*r.height/2;
   if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)continue;
   const hit=pick({clientX,clientY}),surface=document.elementFromPoint(clientX,clientY)===renderer.domElement;if(debug)probes.push({clientX,clientY,surface,hit:hit?.door?.sourceId||hit?.fid||hit?.room||null});if(surface&&hit?.door?.sourceId===id)return{clientX,clientY};
  }
  return debug?{sourceId:d.sourceId,open:d.open,camera:[camera.position.x*1000+OX,camera.position.y*1000,camera.position.z*1000+OY],probes}:null;
 },
 camera:(position,target)=>{
  fly=null;opt.cut=1.2;syncCutBtns();sync();showLabels(false);opt.labels=false;orbit.enableDamping=false;orbit.minDistance=.1;
  orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);
 }
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const probe=document.createElement('canvas');probe.width=probe.height=64;const g=probe.getContext('2d');g.drawImage(c,0,0,64,64);const pixels=g.getImageData(0,0,64,64).data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);return colors.size>25;};
const sameDefaultFurniture=(current,fresh)=>{assert.equal(current.length,fresh.length,'default furniture count');for(const f of fresh){const found=current.find(q=>q.id===f.id);assert.ok(found,`${f.id}: missing default`);for(const key of [...placementKeys,'type','face','parts','modelVariant','mattressMm'])assert.deepEqual(found[key],f[key],`${f.id}: default upgrade ${key}`);}};

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 const errors=[],networkFailures=[],screenshots=[],report={revision:revisionId,migration:null,unchangedOtherSchemes:[],twoDimensionalLeaves:{},actualSlidingDoors:{},studyDoorClicks:[]};
 page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>networkFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('dialog',d=>d.accept());
 await context.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
 await context.route(base+'/**',async route=>{if(route.request().resourceType()!=='document')return route.fallback();try{const response=await route.fetch({timeout:90000}),html=await response.text();assert.ok(html.includes('window.View3D ='),'3D hook anchor missing');return await route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});}catch(error){networkFailures.push({url:route.request().url(),error:'QA document interception: '+error.message});await route.abort('failed').catch(()=>{});}});
 const open=async(id,three=false)=>{await page.goto(`${base}/?scheme=${id}${three?'&view=3d':''}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(three=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture)&&(three||document.querySelector('#gOpen')),three);assert.equal(await page.locator('#schemeSelect').inputValue(),id);};
 const reload=async()=>{await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture)&&document.querySelector('#gOpen'));};
 const reset=async()=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await page.locator('details.menu > summary').click();await page.locator('#reset').click();await page.locator('details.menu').evaluate(e=>e.open=false);};
 const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});screenshots.push(file);};
 const inspect2D=async()=>page.evaluate(specs=>Object.fromEntries(specs.map(s=>{
  const group=[...document.querySelector('#gOpen').children].find(g=>g.tagName.toLowerCase()==='g'&&g.querySelector(':scope > title')?.textContent.startsWith(s.name+' ·'));
  const leaves=group?[...group.querySelectorAll(':scope > rect')].map(r=>Object.fromEntries(['x','y','width','height'].map(k=>[k,Number(r.getAttribute(k))]))):[];
  return[s.id,{title:group?.querySelector(':scope > title')?.textContent||null,leaves}];
 })),slideIds.map(id=>plans.schemes.family.SLIDES.find(s=>s.id===id)));
 try{
  const family=plans.schemes.family,u=family.metadata.familyDoorRefinement;assert.equal(u?.id,revisionId,'bundle lacks door refinement');
  const baseline=beforeFamilyDoorRefinement(beforeFamilyStudyDoor(family));assert.equal(baseline.metadata.familyDoorRefinement,undefined,'baseline reconstruction failed');
  assert.equal(family.metadata.source.sha256,baseline.metadata.source.sha256,'source SHA changed');
  for(const id of ['wood','laundry','screen']){await open(id);const actual=await page.evaluate(()=>structuredClone(HOUSE_PLAN));assert.deepEqual(actual,plans.schemes[id],id+': runtime/bundle mismatch');assert.equal(actual.metadata.familyDoorRefinement,undefined,id+': unauthorized refinement');report.unchangedOtherSchemes.push(id);}
  await open('family');assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),family,'family runtime/bundle mismatch');
  const expectedKey=`floorplan:house-design:family:${plans.version}:${baseline.metadata.source.sha256.slice(0,12)}`;assert.equal(await page.evaluate(()=>STORE),expectedKey,'refinement changed stable draft storage key');
  if(!process.argv.includes('--published-smoke')){
   const changed=(u.changedFurnitureIds||[]).filter(id=>baseline.defaultFurniture.some(f=>f.id===id));
   const customIds=[...new Set([...changed,'study_full_desk','fit-study_bookwall','study_window_return'])].filter(id=>baseline.defaultFurniture.some(f=>f.id===id));
   const oldDraft=async(mode='default')=>page.evaluate(({old,revisionId,mode,customIds,changed})=>{
    const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>![revisionId,'family-study-door-20261012'].includes(id));
    if(mode==='custom'){
     for(const id of customIds){const f=s.furniture.find(f=>f.id===id);f.cx+=37;f.cy+=49;f.w+=20;f.d+=30;f.rot=(f.rot+90)%360;f.color='#668899';f.name='QA '+id;f.heightMm+=11;}
     s.furniture=s.furniture.filter(f=>f.id!=='study_north_sofa');s.measures=[{a:{x:1,y:2},b:{x:1001,y:2}}];s.rooms.room_c.mat='terrazzo';s.demolished=['w1'];
    }
    if(mode==='deleted')s.furniture=s.furniture.filter(f=>!changed.includes(f.id)&&f.id!=='study_full_desk');
    if(mode==='empty')s.furniture=[];
    localStorage.setItem(STORE,JSON.stringify(s));return{key:STORE,old:structuredClone(s)};
   },{old:baseline,revisionId,mode,customIds,changed});
   console.log('Migration: old default');const prior=await oldDraft();await reload();const migrated=await page.evaluate(()=>({key:STORE,state:structuredClone(state),saved:JSON.parse(localStorage.getItem(STORE))}));
   assert.equal(migrated.key,prior.key);assert.ok(migrated.saved.appliedLayoutRevisions.includes(revisionId));sameDefaultFurniture(migrated.state.furniture,family.defaultFurniture);
   console.log('Migration: repeat');await reload();sameDefaultFurniture(await page.evaluate(()=>structuredClone(state.furniture)),family.defaultFurniture);
   console.log('Migration: custom');const custom=await oldDraft('custom');await reload();const preserved=await page.evaluate(()=>structuredClone(state));
   for(const id of customIds)for(const key of placementKeys)assert.deepEqual(preserved.furniture.find(f=>f.id===id)?.[key],custom.old.furniture.find(f=>f.id===id)?.[key],`${id}: custom ${key} overwritten`);
   assert.equal(preserved.furniture.some(f=>f.id==='study_north_sofa'),false,'deleted unchanged sofa revived');assert.deepEqual(preserved.measures,custom.old.measures);assert.equal(preserved.rooms.room_c.mat,'terrazzo');assert.deepEqual(preserved.demolished,custom.old.demolished,'unrelated demolition selection changed');
   await page.evaluate(()=>save());await reload();assert.deepEqual(await page.evaluate(()=>state.measures),custom.old.measures,'saved ruler lost');
   console.log('Migration: deleted');await oldDraft('deleted');await reload();for(const id of [...changed,'study_full_desk'])assert.equal(await page.evaluate(id=>Boolean(getF(id)),id),false,`${id}: deleted fixture revived`);
   console.log('Migration: empty');await oldDraft('empty');await reload();assert.equal(await page.evaluate(()=>state.furniture.length),0,'empty draft auto-filled');
   await reset();sameDefaultFurniture(await page.evaluate(()=>structuredClone(state.furniture)),family.defaultFurniture);assert.ok(await page.evaluate(id=>state.appliedLayoutRevisions.includes(id),revisionId));
   report.migration={storageAndSourceStable:true,defaultUpgrade:true,customPositionsSizesHeightsRotationsColorsNamesPreserved:true,deletedFixturesAndEmptyDraftPreserved:true,measuresRoomMaterialAndDemolitionPreserved:true,repeatIdempotent:true,resetLoadsCurrent:true,changedFurnitureIds:changed};
  }
  const flat=await inspect2D();
  for(const id of slideIds){const s=family.SLIDES.find(s=>s.id===id),q=flat[id];assert.equal(s.panelCount,2,id+': model leaf count');assert.equal(s.trackCount,2,id+': model track count');assert.equal(q.leaves.length,2,id+': actual SVG has not exactly two leaves');assert.ok(q.title.includes(String(s.openingWidthMm))&&q.title.includes(String(s.heightMm)),id+': actual SVG title lacks preserved dimensions');
   const [x0,y0,x1,y1]=s.rect,L=s.v?y1-y0:x1-x0,m=s.v?(x0+x1)/2:(y0+y1)/2;
   q.leaves.forEach((leaf,i)=>{eq(s.v?leaf.height:leaf.width,L/2,id+' 2D leaf nominal length');eq(s.v?leaf.width:leaf.height,30,id+' 2D leaf band');eq(s.v?leaf.y:leaf.x,(s.v?y0:x0)+i*L/2,id+' 2D closed divided leaf position');eq(s.v?leaf.x:leaf.y,m-45+i*30,id+' 2D separate diagram tracks');});report.twoDimensionalLeaves[id]=q;
  }
  console.log('Actual WebGL: two leaves and two tracks');await open('family',true);await page.waitForFunction(()=>window.__familyDoorRefinementQA.ready());await page.waitForFunction(painted);await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);});
  let actual=await page.evaluate(()=>window.__familyDoorRefinementQA.inspect());assert.ok(actual.triangles>1000,'WebGL insufficient rendered geometry');
  for(const id of slideIds){const s=family.SLIDES.find(s=>s.id===id),q=actual.sliding[id],[x0,y0,x1,y1]=s.rect,L=s.v?y1-y0:x1-x0,pl=L/2+20;
   assert.equal(q.leaves.length,2,id+': actual WebGL has not exactly two glass leaves');assert.ok(q.sills.length,id+': preserved full aperture sill missing');const sill=q.sills[0];eq(sill.min[0],x0,id+' aperture x0');eq(sill.min[2],y0,id+' aperture y0');eq(sill.max[0],x1,id+' aperture x1');eq(sill.max[2],y1,id+' aperture y1');
   const trackCenters=q.leaves.map(leaf=>s.v?(leaf.min[0]+leaf.max[0])/2:(leaf.min[2]+leaf.max[2])/2).sort((a,b)=>a-b),axis=s.v?(x0+x1)/2:(y0+y1)/2;
   eq(trackCenters[0],axis-17.5,id+' first actual rail');eq(trackCenters[1],axis+17.5,id+' second actual rail');eq(trackCenters[1]-trackCenters[0],35,id+' actual separate-rail offset');
   const beginning=s.v?y0:x0,end=s.v?y1:x1,stackStart=['north','west'].includes(s.stackTo),defaultStacked=s.defaultOpen!==false&&!s.surface;
   q.leaves.forEach((leaf,i)=>{eq(leaf.min[1],0,id+' floor alignment');eq(leaf.max[1],s.heightMm,id+' preserved actual leaf height');eq(s.v?leaf.max[2]-leaf.min[2]:leaf.max[0]-leaf.min[0],pl,id+' actual half aperture plus20 overlap');
    const min=s.v?leaf.min[2]:leaf.min[0],max=s.v?leaf.max[2]:leaf.max[0];
    if(defaultStacked){eq(stackStart?min:max,stackStart?beginning:end,id+' intended stack edge');eq(stackStart?max:min,stackStart?beginning+pl:end-pl,id+' intended stacked half span');}
    else eq((min+max)/2,beginning+pl/2+i*L/2,id+' closed leaf center');
   });report.actualSlidingDoors[id]={openingWidthMm:s.openingWidthMm,heightMm:s.heightMm,panelCount:2,trackCount:2,stackTo:s.stackTo,actualRailCentersMm:trackCenters,actualLeavesMm:q.leaves,actualSillMm:sill};
  }
  for(const id of u.changedFurnitureIds||[]){const f=family.defaultFurniture.find(f=>f.id===id),mesh=actual.furniture[id];assert.ok(mesh,id+': revised furniture missing');eq(mesh.center[0],f.cx,id+' actual revised center x');eq(mesh.center[1],f.cy,id+' actual revised center y');eq(mesh.rotation,-f.rot*Math.PI/180,id+' actual revised rotation');}
  const study=family.DOORS.find(d=>d.id==='door_c');assert.ok(study,'study ordinary door missing');assert.equal(study.openingWidthMm,900,'ordinary study opening must remain900');
  const aim=async(position,target)=>{await page.evaluate(({position,target})=>window.__familyDoorRefinementQA.camera(position,target),{position,target});await page.waitForFunction(painted);};
  const point=async(openDoor)=>{const [hx,hy]=study.h,sign=study.c[1],views=[[[hx-1250,1700,hy+380*sign],[hx-400,700,openDoor?hy:hy+260*sign]],[[hx-700,2400,hy+870*sign],[hx-200,700,hy+260*sign]],[[hx+900,2200,hy+700*sign],[hx,700,hy+260*sign]]];
   for(const [position,target]of views){await aim(position,target);const hit=await page.evaluate(()=>window.__familyDoorRefinementQA.doorClickPoint('door_c'));if(hit)return hit;}
   await shot('study-pointer-failure');fs.writeFileSync(path.join(out,'study-pointer-failure.json'),JSON.stringify(await page.evaluate(()=>window.__familyDoorRefinementQA.doorClickPoint('door_c',true)),null,2));throw Error('No visible actual study door surface for pointer operation');
  };
  for(const openDoor of [false,true]){const hit=await point(!openDoor);console.log('Study actual pointer:',openDoor?'open':'close');await page.mouse.click(hit.clientX,hit.clientY);await page.waitForFunction(({id,open})=>window.__familyDoorRefinementQA.doorSettled(id,open),{id:'door_c',open:openDoor},{polling:100});actual=await page.evaluate(()=>window.__familyDoorRefinementQA.inspect());const d=actual.doors.door_c,vector=openDoor?study.o:study.c;eq(d.lengthMm,study.len,'actual study leaf length');for(let i=0;i<2;i++){eq(d.start[i],study.h[i],'actual study hinge');eq(d.end[i],study.h[i]+vector[i]*study.len,'actual operated study endpoint');}report.studyDoorClicks.push({open:openDoor,actualHingeMm:d.start,actualEndpointMm:d.end});}
  for(const id of slideIds){const s=family.SLIDES.find(s=>s.id===id),[x0,y0,x1,y1]=s.rect,cx=(x0+x1)/2,cy=(y0+y1)/2;await aim([cx-2650,3700,cy-1900],[cx+400,650,cy+100]);await shot('family-'+id+'-two-leaf-two-track-3d');}
  const desk=family.defaultFurniture.find(f=>f.id==='study_full_desk');await aim([desk.cx+2190,4400,desk.cy-2700],[desk.cx+200,750,desk.cy-800]);await shot('family-study-current-door-and-desk-3d');
  await open('family');await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);fitView();});await shot('family-door-refinement-plan');
  assert.deepEqual(errors,[],'browser runtime errors');const result={status:'PASS',...report,browserErrors:errors,screenshots};fs.writeFileSync(path.join(out,process.argv.includes('--published-smoke')?'browser-report-smoke.json':'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(error){await shot('failure');fs.writeFileSync(path.join(out,'failure.html'),await page.content());console.error(JSON.stringify({status:'FAIL',progress:report,browserErrors:errors,networkFailures,url:page.url()},null,2));throw error;}
 finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
