'use strict';

// Run by root only: one Chrome, real controls, actual scene geometry. Remote
// mode fetches every published asset; only the fetched document is instrumented.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js');
const {beforeFamilyReferenceFinish,REVISION}=require('../tools/family-reference-finish-20261025.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-reference-qa.cjs'))('playwright'));}
let base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,'');
const published=process.argv.includes('--published-smoke'),out=path.resolve(process.env.FLOORPLAN_REFERENCE_SHOTS||path.join(root,'..','output','family-reference-finish-20261025-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const family=plans.schemes.family,baseline=beforeFamilyReferenceFinish(family),meta=family.metadata.familyReferenceFinishUpdate;
const CABINET='fit-dining_sideboard_wall',TV='family-f7',STUDY='fit-study_bookwall',PURCHASED=['family-f6','family-f23','family-f24','family-f25','family-f26','family-f27'];
const current=id=>family.defaultFurniture.find(f=>f.id===id),old=id=>baseline.defaultFurniture.find(f=>f.id===id);
const sorted=v=>structuredClone(v).sort((a,b)=>a.id.localeCompare(b.id));
const exactDefaults=v=>assert.deepEqual(sorted(v),sorted(family.defaultFurniture),'all current 120 default objects exact');
const eq=(a,b,label,tol=.8)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol,label+': '+a+' vs '+b);
const shapeSize=m=>m.max.map((n,i)=>n-m.min[i]);
const hook=`window.__familyReferenceQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow===1&&furnGrow===1),
 inspect:()=>{scene.updateMatrixWorld(true);const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};const visible=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};const furniture=Object.fromEntries(furnG.children.map(g=>{const meshes=[];g.traverse(o=>{if(o.isMesh){const ms=Array.isArray(o.material)?o.material:[o.material];meshes.push({...bounds(o),partId:o.userData.cabinetPartId||null,role:o.userData.role||null,geometry:o.geometry.type,panelShape:o.userData.panelShape||null,openArch:o.userData.openArch||false,mattressDimensionsMm:o.userData.mattressDimensionsMm||null,referenceInterior:Boolean(o.userData.referenceInterior),visible:visible(o),colors:ms.map(m=>m.color?.getHexString()||null),materialUserData:ms.map(m=>({...m.userData}))});}});return[g.userData.fid,{...bounds(g),center:[g.position.x*1000+OX,g.position.z*1000+OY],rotation:g.rotation.y,scale:[g.scale.x,g.scale.y,g.scale.z],referenceFallback:g.userData.referenceFallback||null,referenceMattressMm:g.userData.referenceMattressMm||null,meshes}];}));const floors=archFloor.children.filter(o=>o.isMesh&&o.userData.room).map(o=>{const m=Array.isArray(o.material)?o.material[0]:o.material;return{roomId:o.userData.room,materialUserData:{...m.userData},hasTexture:Boolean(m.map),roughness:m.roughness};});return{furniture,floors,triangles:renderer.info.render.triangles,cut:opt.cut};},
 tvDetails:()=>{scene.updateMatrixWorld(true);const g=furnG.children.find(g=>g.userData.fid==='family-f7'),screens=[],props=[];g?.traverse(o=>{if(!o.isMesh)return;const b=new THREE.Box3().setFromObject(o),role=o.userData.role||null,info={role,geometry:o.geometry.type,min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};if(role==='reference-art-tv-screen')screens.push({...info,textureUserData:{...o.material.map?.userData}});else if(!o.userData.cabinetPartId&&!role?.startsWith('reference-art-tv'))props.push(info);});return{screens,props};},
 dressing:()=>{scene.updateMatrixWorld(true);const groups=[];for(const parent of[archFloor,archUp])parent.traverse(g=>{if(g.isGroup&&g.userData.referenceDressing){let meshes=0;g.traverse(o=>{if(o.isMesh)meshes++;});groups.push({...g.userData,meshes});}});return groups;},
 archRays:()=>{scene.updateMatrixWorld(true);const group=furnG.children.find(g=>g.userData.fid==='family-f1');let panel=null;group?.traverse(o=>{if(o.isMesh&&o.userData.panelShape==='arch-spandrel')panel=o;});if(!panel)return null;const cast=(name,x,y)=>{const a=panel.localToWorld(new THREE.Vector3(x,y,.06)),b=panel.localToWorld(new THREE.Vector3(x,y,-.06)),direction=b.clone().sub(a).normalize(),hits=new THREE.Raycaster(a,direction,0,.12).intersectObject(panel,false);return{name,hits:hits.length};};return{geometry:panel.geometry.type,panelShape:panel.userData.panelShape,rays:[cast('center-open',0,-.024),cast('lower-open',0,-.100),cast('solid-top',0,.112),cast('solid-left-jamb',-.220,-.024)]};},
 camera:(position,target,cut)=>{fly=null;opt.cut=cut??H;syncCutBtns();sync();showLabels(false);opt.labels=false;orbit.enableDamping=false;orbit.minDistance=.1;orbit.maxPolarAngle=Math.PI;orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);},
 quickCorner:id=>{const c=cabinetDoorControllers.get(id);return c?{open:c.open,progress:c.progress,angles:cabinetDoors.filter(d=>d.cabinetFid===id).map(d=>({cur:d.pivot.rotation.y,a0:d.a0,a1:d.a1}))}:null;}
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const p=document.createElement('canvas');p.width=p.height=40;const g=p.getContext('2d');g.drawImage(c,0,0,40,40);const a=g.getImageData(0,0,40,40).data,s=new Set();for(let i=0;i<a.length;i+=4)s.add((a[i]<<16)|(a[i+1]<<8)|a[i+2]);return s.size>25;};

(async()=>{
 assert.equal(meta?.id,REVISION);assert.equal(family.defaultFurniture.length,120);assert.equal(meta.changedFurnitureIds.length,24);
 for(const id of PURCHASED)assert.deepEqual(current(id),old(id));
 let server,browser,context,page;const errors=[],networkFailures=[],screenshots=[],report={revision:REVISION,otherSchemes:[],migration:null,geometry:null,views:[],corner:null};
 try{
  if(process.argv.includes('--self-host')){
   assert.ok(!published,'self-host cannot verify publication');
   server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(u.pathname)==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,''),file=path.resolve(root,name),relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});base='http://127.0.0.1:'+server.address().port;console.log('Self-hosted read-only reference QA:',base);
  }
  fs.mkdirSync(out,{recursive:true});const proxy=published&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
  browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(proxy?{proxy:{server:proxy}}:{})});
  context=await browser.newContext({viewport:{width:1100,height:800},deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>networkFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('dialog',d=>d.accept());await context.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
  await context.route(base+'/**',async route=>{
   if(route.request().resourceType()!=='document')return route.fallback();
   try{
    let response;for(let attempt=0;attempt<3;attempt++)try{response=await route.fetch({timeout:90000});break;}catch(error){if(attempt===2)throw error;}
    const html=await response.text();assert.ok(html.includes('window.View3D ='),'hook only observes the actual published renderer');
    await route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});
   }catch(e){networkFailures.push({url:route.request().url(),error:'QA document interception: '+e.message});await route.abort('failed').catch(()=>{});}
  });
  const ready=()=>page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture)&&!switching);
  const open=async id=>{await page.goto(base+'/?scheme='+id,{waitUntil:'domcontentloaded'});await ready();assert.equal(await page.locator('#schemeSelect').inputValue(),id);};
  const reload=async()=>{await page.reload({waitUntil:'domcontentloaded'});await ready();};
  const stateSnapshot=()=>page.evaluate(()=>structuredClone(state));
  const inspect=()=>page.evaluate(()=>window.__familyReferenceQA.inspect());
  const click=async selector=>{await page.locator(selector).evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'}));await page.waitForFunction(selector=>{const e=document.querySelector(selector);if(!e||e.disabled)return false;const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return r.width>0&&r.height>0&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&document.elementFromPoint(x,y)?.closest(selector)===e;},selector);const r=await page.locator(selector).boundingBox();assert.ok(r);await page.mouse.click(r.x+r.width/2,r.y+r.height/2);};
  const reset=async()=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await click('details.menu > summary');await click('#reset');await page.locator('details.menu').evaluate(e=>e.open=false);};
  const go3d=async()=>{await page.waitForFunction(()=>!switching);if(await page.evaluate(()=>viewMode)!=='3d')await click('#viewSeg [data-view="3d"]');await page.waitForFunction(()=>window.__familyReferenceQA.ready()&&!switching);await page.waitForFunction(painted);};
  const go2d=async()=>{await page.waitForFunction(()=>!switching);if(await page.evaluate(()=>viewMode)!=='2d')await click('#viewSeg [data-view="2d"]');await page.waitForFunction(()=>viewMode==='2d'&&!switching&&!document.body.classList.contains('m3d'));};
  const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});screenshots.push(file);};

  console.log('Reference finish: published defaults and other schemes');
  for(const id of['wood','laundry','screen']){await open(id);assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),plans.schemes[id]);assert.deepEqual((await stateSnapshot()).furniture,plans.schemes[id].defaultFurniture);assert.equal(await page.evaluate(()=>HOUSE_PLAN.metadata.familyReferenceFinishUpdate),undefined);report.otherSchemes.push(id);}
  await open('family');assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),family);exactDefaults((await stateSnapshot()).furniture);
  assert.equal(await page.evaluate(()=>STORE),`floorplan:house-design:family:${plans.version}:${baseline.metadata.source.sha256.slice(0,12)}`);
  if(!published){
   const seed=mode=>page.evaluate(({old,mode,revision,changed,cabinetId})=>{
    const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);s.rooms=Object.fromEntries(old.ROOMS.map(r=>[r.id,{name:r.name,mat:r.mat}]));s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>id!==revision);
    if(mode==='private-layout'||mode==='private-parts'||mode==='private-size'){
     for(const id of changed){const f=s.furniture.find(q=>q.id===id);if(f)Object.assign(f,{cx:f.cx+31,cy:f.cy-27,rot:f.rot+5,name:'私人 '+f.name,color:'#abcdee',ownerExtension:{keep:['private',25]}});}
     const bed=s.furniture.find(f=>f.id==='bed_a');Object.assign(bed,{w:bed.w+40,d:bed.d+60,heightMm:bed.heightMm+12});
     const cab=s.furniture.find(f=>f.id===cabinetId);if(mode==='private-size')Object.assign(cab,{w:cab.w+51,d:cab.d+77,heightMm:cab.heightMm+9});
     if(mode==='private-parts'){cab.parts[0].w+=7;cab.parts[0].ownerPanelNote='私人组件';cab.cornerDoorDesign.ownerHardware='keep-private';}
     s.rooms.room_a.mat='terrazzo';s.rooms.room_b.mat='tile600';s.rooms.room_c.mat='wood';s.rooms.living.mat='terrazzo';s.rooms.room_a.name='私人主卧';
     s.measures=[{a:{x:500,y:600},b:{x:900,y:600}}];s.demolished=['w29'];s.furniture=s.furniture.filter(f=>f.id!=='kitchen_heater');
    }
    if(mode==='deleted')s.furniture=s.furniture.filter(f=>!changed.includes(f.id));if(mode==='empty')s.furniture=[];
    localStorage.setItem(STORE,JSON.stringify(s));return structuredClone(s);
   },{old:baseline,mode,revision:REVISION,changed:meta.changedFurnitureIds,cabinetId:CABINET});
   console.log('Reference migration: former defaults, real wood change, private assemblies and deletions');
   await seed('default');await reload();let s=await stateSnapshot();exactDefaults(s.furniture);for(const id of['room_a','room_b','room_c'])assert.equal(s.rooms[id].mat,'wood');for(const r of baseline.ROOMS.filter(r=>!['room_a','room_b','room_c'].includes(r.id)))assert.equal(s.rooms[r.id].mat,r.mat);
   assert.equal(s.appliedLayoutRevisions.filter(id=>id===REVISION).length,1);await reload();assert.deepEqual(await stateSnapshot(),s,'default migration is idempotent');
   for(const mode of['private-layout','private-parts','private-size']){
    const before=await seed(mode);await reload();s=await stateSnapshot();
    for(const id of meta.changedFurnitureIds){const f=s.furniture.find(q=>q.id===id),a=before.furniture.find(q=>q.id===id);assert.ok(f&&a);for(const key of['cx','cy','rot','name','color','ownerExtension'])assert.deepEqual(f[key],a[key],mode+' private '+id+'/'+key);}
    for(const key of['w','d','heightMm','mattressMm'])assert.deepEqual(s.furniture.find(f=>f.id==='bed_a')[key],before.furniture.find(f=>f.id==='bed_a')[key],'private bed '+key);
    if(mode!=='private-layout'){
     const f=s.furniture.find(q=>q.id===CABINET),a=before.furniture.find(q=>q.id===CABINET);for(const key of['w','d','heightMm','parts','cabinetDesign','cabinetRevision','baseWidthMm','baseDepthMm','baseHeightMm','cornerDoorDesign'])assert.deepEqual(f[key],a[key],mode+' complete private cabinet '+key);
     assert.equal(mode==='private-parts'?f.layoutCustomPartsRevision:f.layoutCustomSizeRevision,REVISION);
    }
    for(const a of before.furniture)if(!meta.changedFurnitureIds.includes(a.id))assert.deepEqual(s.furniture.find(f=>f.id===a.id),a,'private unrelated object remains exact '+a.id);
    assert.deepEqual(s.rooms,before.rooms,'only previousMat defaults migrate; terrazzo/tile600 and private room name stay');assert.deepEqual(s.measures,before.measures);assert.deepEqual(s.demolished,before.demolished);assert.equal(s.furniture.some(f=>f.id==='kitchen_heater'),false);
    await reload();assert.deepEqual(await stateSnapshot(),s,mode+' private migration is idempotent');
   }
   await seed('deleted');await reload();assert.ok((await stateSnapshot()).furniture.every(f=>!meta.changedFurnitureIds.includes(f.id)));await reload();assert.ok((await stateSnapshot()).furniture.every(f=>!meta.changedFurnitureIds.includes(f.id)));
   await seed('empty');await reload();assert.equal((await stateSnapshot()).furniture.length,0);await reset();exactDefaults((await stateSnapshot()).furniture);
   report.migration={old17aff3bDefaultsUpgradeExact:true,onlyPreviousTile800BecomesRealWood:true,privateBedPoseSizeColorAndNamePreserved:true,privateCabinetSizeAndPartsAssembliesIntact:true,privateTerrazzoTile600NamesAndMeasuresPreserved:true,deletionsAndEmptyDraftNotRevived:true,idempotent:true,sourceStorageKeyStable:true};
  }

  console.log('Reference finish: actual meshes, bed mattresses, floating desks and open arch');
  await go3d();let actual=await inspect();assert.ok(actual.triangles>1000);assert.deepEqual(Object.keys(actual.furniture).sort(),family.defaultFurniture.map(f=>f.id).sort());
  for(const f of family.defaultFurniture){const g=actual.furniture[f.id];assert.ok(g.meshes.length,f.id+' real meshes');eq(g.center[0],f.cx,f.id+' center x');eq(g.center[1],f.cy,f.id+' center y');eq(g.rotation,-f.rot*Math.PI/180,f.id+' world rotation',1e-8);assert.equal(g.referenceFallback,null,f.id+' cannot silently use generic fallback');}
  for(const[id,mattress]of[['bed_a',[1800,2000]],['bed_b',[1500,2000]]]){
   const f=current(id),g=actual.furniture[id],m=g.meshes.filter(m=>m.role==='reference-mattress');assert.equal(m.length,1);assert.deepEqual(g.scale,[1,1,1],'no generic full-box normalization '+id);assert.deepEqual(g.referenceMattressMm,{width:mattress[0],depth:mattress[1]});assert.deepEqual(m[0].mattressDimensionsMm,{width:mattress[0],depth:mattress[1]});const size=shapeSize(m[0]);eq(size[0],mattress[1],id+' real rotated mattress length');eq(size[2],mattress[0],id+' real rotated mattress width');eq(g.max[1],f.heightMm,id+' real headboard maximum1080');assert.ok(g.meshes.some(m=>/reference-(master-headboard-channel|child-arched-headboard)/.test(m.role||'')));
  }
  const deskChecks=[];for(const id of['draft-desk-a','draft-desk-b','study_full_desk','study_window_return']){const f=current(id),g=actual.furniture[id];assert.deepEqual(g.scale,[1,1,1],'suspended desk is not normalized down to floor '+id);assert.ok(g.min[1]>500,id+' actual bottom remains floating');eq(g.max[1],f.elevationMm+f.heightMm,id+' actual finished tabletop');assert.ok(g.meshes.some(m=>m.role==='reference-floating-desk-box'));assert.ok(!g.meshes.some(m=>/leg/.test(m.role||'')),id+' no old metal legs');deskChecks.push({id,min:g.min[1],max:g.max[1]});}
  const sofa=actual.furniture.study_north_sofa;assert.deepEqual(sofa.scale,[1,1,1]);eq(sofa.max[1],current('study_north_sofa').heightMm,'actual low study sofa height');assert.ok(sofa.meshes.some(m=>m.role==='reference-low-sofa-seat-module'));assert.ok(sofa.meshes.every(m=>!/(armrest|sofa-arm|metal-leg)/.test(m.role||'')),'no generic thick arms/metal legs');
  const pendant=actual.furniture['family-dining-ceilinglight'];assert.deepEqual(pendant.scale,[1,1,1],'do not normalize articulated pendant as flat ceiling disk');eq(pendant.min[1],1940,'actual dining pendant diffuser bottom1940');eq(pendant.max[1],2700,'actual dining pendant canopy at ceiling2700');assert.ok(pendant.meshes.some(m=>m.role==='reference-dining-pendant-articulated-arm-upper'));assert.ok(pendant.meshes.some(m=>m.role==='reference-dining-pendant-cream-conical-shade'));assert.deepEqual(current('family-living-ceilinglight'),old('family-living-ceilinglight'),'907 living lamp not replaced by pendant');
  const rays=await page.evaluate(()=>window.__familyReferenceQA.archRays());assert.ok(rays);assert.equal(rays.geometry,'ExtrudeGeometry');assert.equal(rays.panelShape,'arch-spandrel');for(const r of rays.rays)assert.equal(r.hits>0,r.name.startsWith('solid-'),r.name+' actual ExtrudeGeometry hole/solid positive controls');
  const cab=actual.furniture[CABINET],tv=actual.furniture[TV];eq(cab.min[0],2125,'cabinet west');eq(cab.max[0],3750,'south return east edge');eq(cab.min[2],9400,'cabinet new north9400');eq(cab.max[2],13890,'cabinet fixed south');eq(cab.max[1],2700,'sideboard model roof');
  const countertop=cab.meshes.find(m=>m.partId==='reference-west-central-countertop');assert.ok(countertop);eq(countertop.min[2],10000,'actual central countertop starts10000');eq(countertop.max[2],12730,'actual central countertop ends12730');eq(countertop.max[1],850,'actual finished machine support');
  const ledChecks=[];for(const id of[CABINET,'family-f1','family-f3',STUDY]){const f=current(id),g=actual.furniture[id];for(const q of f.parts.filter(q=>q.role==='led-strip')){const m=g.meshes.find(m=>m.partId===q.id&&m.role==='led-strip'),a=g.meshes.find(m=>m.partId===q.anchorPartId&&!/led/.test(m.role||''));assert.ok(m&&a,'real LED and matching support meshes '+q.id);eq(m.max[1],a.min[1],q.id+' actual underside');assert.ok(m.min[0]>=a.min[0]-.8&&m.max[0]<=a.max[0]+.8&&m.min[2]>=a.min[2]-.8&&m.max[2]<=a.max[2]+.8,q.id+' actual XY board support');ledChecks.push(q.id);}}
  assert.equal(ledChecks.length,13);const tvTop=tv.meshes.find(m=>m.partId==='family-f7-reference-top');assert.ok(tvTop);eq(tvTop.max[1],430,'actual wood television cabinet top430');assert.equal(tv.meshes.filter(m=>m.role==='drawer-front').length,6);
  assert.equal(tv.meshes.filter(m=>m.role==='reference-art-tv-frame').length,1);assert.equal(tv.meshes.filter(m=>m.role==='reference-art-tv-screen').length,1);
  const tvDetails=await page.evaluate(()=>window.__familyReferenceQA.tvDetails());assert.equal(tvDetails.screens.length,1);assert.deepEqual(tvDetails.screens[0].textureUserData,{referenceApproximation:true,proceduralArtwork:true,notOriginalArtwork:true,kind:'cloud-landscape'});
  assert.ok(tvDetails.props.some(m=>m.geometry==='LatheGeometry'&&Math.abs(m.min[1]-430)<.8),'vase body stands on the actual430 top, not old500 template');
  const book1=tvDetails.props.find(m=>Math.abs(shapeSize(m)[0]-220)<.8&&Math.abs(shapeSize(m)[1]-25)<.8),book2=tvDetails.props.find(m=>Math.abs(shapeSize(m)[0]-190)<.8&&Math.abs(shapeSize(m)[1]-20)<.8);assert.ok(book1&&book2,'two actual small books retained');eq(book1.min[1],430,'first book rests on cabinet');eq(book2.min[1],455,'second book rests on first');
  const applianceChecks=[];for(const f of family.defaultFurniture.filter(f=>f.id.startsWith('family-sideboard-'))){const g=actual.furniture[f.id],a=f.rot*Math.PI/180,hx=(Math.abs(Math.cos(a))*f.w+Math.abs(Math.sin(a))*f.d)/2,hy=(Math.abs(Math.sin(a))*f.w+Math.abs(Math.cos(a))*f.d)/2;eq(g.min[1],850,f.id+' actual bottom on shelf',1.5);assert.ok(f.cx-hx>=countertop.min[0]-.8&&f.cx+hx<=countertop.max[0]+.8&&f.cy-hy>=countertop.min[2]-.8&&f.cy+hy<=countertop.max[2]+.8);applianceChecks.push(f.id);}
  assert.equal(applianceChecks.length,5);for(const n of[19,20,21,22,23])assert.deepEqual([current('family-elec-p'+n).cx,current('family-elec-p'+n).cy],[old('family-elec-p'+n).cx,old('family-elec-p'+n).cy]);
  for(const id of['room_a','room_b','room_c']){assert.equal((await stateSnapshot()).rooms[id].mat,'wood');const floor=actual.floors.find(f=>f.roomId===id);assert.ok(floor?.hasTexture,'actual wood floor texture '+id);assert.equal(floor.materialUserData.referenceFinish,'floor-wood','actual three-room reference wood material '+id);}assert.equal(actual.floors.find(f=>f.roomId==='living').materialUserData.referenceFinish,'floor-tile','public tile stays tiled');
  const dressing=await page.evaluate(()=>window.__familyReferenceQA.dressing());assert.ok(dressing.length>=12,'reference window/bedroom dressing is real scene-only geometry');for(const g of dressing){assert.equal(g.referenceApproximation,true);assert.equal(g.notInstallationApproval,true);assert.ok(g.meshes>0||g.visualDecalOnly,'nonempty dressing group '+g.role);}
  const windowGroups=dressing.filter(g=>g.windowSourceId);assert.deepEqual(windowGroups.map(g=>g.windowSourceId).sort(),['window_a-front','window_b-front','window_c','window_living_west-front'].sort());for(const g of windowGroups){assert.equal(g.noOpeningResize,true);const i=family.WIN_META.findIndex(m=>m.id===g.windowSourceId);assert.ok(i>=0);assert.deepEqual(g.sourceOpeningRectMm,family.WINS[i]);}
  assert.ok(dressing.some(g=>g.role==='reference-child-pink-oval-rug'));assert.ok(dressing.some(g=>g.role==='reference-master-slim-bedside-rug'));
  report.geometry={all120RenderedAtCurrentDataPoses:true,allReferenceFurnitureWithoutFallback:true,purchasedDataExactAndNoCoffeeTable:true,realMattressSizes18002000And15002000:true,headboardsMaximum1080:true,noGenericScalingOfBedsDesksAndStudySofa:true,floatingDeskBounds:deskChecks,lowStudySofaWithoutGenericArms:true,actualOpenArchRayControls:rays,sideboardActualNorth9400South13890:true,televisionCabinetRealTop430:true,artTelevisionTextureAndSupportedProps:tvDetails,realLedBoardSupport:ledChecks,fiveAppliancesAtActual850Countertop:applianceChecks,threeWoodFloorsTextured:true,sceneOnlyDressing:dressing};

  console.log('Reference finish: six actual room views');
  const viewDefs=[
   ['living',[3100,1650,10800],[5700,1050,7900]],['dining',[4650,1700,11050],[2270,1380,11200]],['tv',[5100,1600,9250],[5050,1050,6450]],
   ['master',[4400,1570,3050],[5600,1180,1600]],['child',[2450,1520,3060],[1400,1100,1450]],['study',[2190,1450,4090],[850,1180,5640]]
  ];
  for(const[key,position,target]of viewDefs){
   const before=await stateSnapshot();let used='inspection-camera';const select=page.locator('#referenceViewSelect');
   if(await select.count()&&await select.locator('option[value="'+key+'"]').count()){await select.selectOption(key);await page.waitForFunction(()=>window.__familyReferenceQA.ready()&&!switching);used='referenceViewSelect';}
   else{await page.evaluate(({p,t})=>window.__familyReferenceQA.camera(p,t),{p:position,t:target});}
   await page.waitForFunction(painted);assert.deepEqual(await stateSnapshot(),before,'view is not a data mutation '+key);await shot('family-reference-'+key+'-3d');report.views.push({key,control:used});
  }
  // Only a brief real UI guarded-open/close check here. The preserved signed
  // 180-degree sequencing is exhaustively checked statically, not repolled for
  // several minutes in a software-rendered browser.
  if(!published){
   await page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},CABINET);const chairBefore=await page.evaluate(()=>structuredClone(getF('family-f27')));
   if(await page.locator('#prepareCornerChair').count()){
    await click('#prepareCornerChair');await page.waitForFunction(id=>{const c=window.__familyReferenceQA.quickCorner(id);return c?.open&&c.progress>.03;},CABINET,{polling:250});
    const chairAfter=await page.evaluate(()=>structuredClone(getF('family-f27')));eq(chairAfter.cx,3420,'temporary chair parking x');eq(chairAfter.cy,12080,'temporary chair parking y');
    await click('#toggleCornerDoors');await page.waitForFunction(id=>window.View3D.cornerDoorsClosed(id),CABINET,{polling:250,timeout:180000});await click('#restoreCornerChair');assert.deepEqual(await page.evaluate(()=>structuredClone(getF('family-f27'))),chairBefore);report.corner={briefRealUiOpening:true,temporaryChairStill342012080:true,closedAndRestoredExact:true,fullAngleSampling:'static-test'};
   }
  }
  await go2d();await page.evaluate(()=>{closeDrawers();select(null);fitView();});exactDefaults((await stateSnapshot()).furniture);assert.deepEqual(errors,[]);assert.deepEqual(networkFailures,[]);
  const result={status:'PASS',...report,browserErrors:errors,networkFailures,screenshots};fs.writeFileSync(path.join(out,published?'browser-report-smoke.json':'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(e){let quickCorner=null;try{if(page)quickCorner=await page.evaluate(id=>window.__familyReferenceQA?.quickCorner(id),CABINET);}catch{}const result={status:'FAIL',progress:report,error:e.stack||String(e),url:page?.url(),quickCorner,browserErrors:errors,networkFailures};fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure-report.json'),JSON.stringify(result,null,2)+'\n');try{await page?.screenshot({path:path.join(out,'failure.png'),timeout:10000});}catch{}console.error(JSON.stringify(result,null,2));throw e;}
 finally{await context?.close();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
