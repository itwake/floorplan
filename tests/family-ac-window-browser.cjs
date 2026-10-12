'use strict';

// Only the fetched HTML receives the inspection hook. The app, user browser,
// source snapshots and stored project identity are not modified by this QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js');
const {beforeFamilyAcWindow,REVISION}=require('../tools/family-ac-window-20261012.cjs');
const {beforeFamilyAppliances}=require('../tools/family-appliances-20261012.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
let base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,'');
const out=path.resolve(process.env.FLOORPLAN_AC_WINDOW_SHOTS||path.join(root,'..','output','family-ac-window-20261012-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const family=plans.schemes.family,baseline=beforeFamilyAcWindow(family),withoutAppliances=beforeFamilyAppliances(family),update=family.metadata.familyAcWindowUpdate;
const ids=['family-acwall-room_a','family-acwall-room_b','family-acwall-room_c'];
const fresh=ids.map(id=>family.defaultFurniture.find(f=>f.id===id));
const tolerance=.5,eq=(a,b,what)=>assert.ok(Math.abs(a-b)<tolerance,what+': '+a+' != '+b);
const rectangle=f=>{const a=f.rot*Math.PI/180,W=Math.abs(Math.cos(a))*f.w+Math.abs(Math.sin(a))*f.d,D=Math.abs(Math.sin(a))*f.w+Math.abs(Math.cos(a))*f.d;return{min:[f.cx-W/2,f.elevationMm||0,f.cy-D/2],max:[f.cx+W/2,(f.elevationMm||0)+f.heightMm,f.cy+D/2]};};
const overlap=(a,b)=>[0,1,2].every(i=>Math.min(a.max[i],b.max[i])-Math.max(a.min[i],b.min[i])>tolerance);
const hook=`window.__familyAcWindowQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow>.999&&furnGrow>.999),
 inspect:()=>{
  scene.updateMatrixWorld(true);
  const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};
  const description=o=>{const materials=Array.isArray(o.material)?o.material:[o.material],normal=new THREE.Vector3(0,0,1).transformDirection(o.matrixWorld);return{...bounds(o),geometry:o.geometry.type,role:o.userData.role||null,partId:o.userData.cabinetPartId||null,visible:o.visible,normal:[normal.x,normal.y,normal.z],emissive:materials.some(m=>m.emissiveIntensity>0)};};
  const furniture=Object.fromEntries(furnG.children.map(g=>{const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(description(o));});return[g.userData.fid,{...bounds(g),rotation:g.rotation.y,meshes}];}));
  const architecture=[];archUp.traverse(o=>{if(o.isMesh)architecture.push(description(o));});
  return{furniture,architecture,triangles:renderer.info.render.triangles,cut:opt.cut,wallFullHeight:H};
 },
 camera:(position,target)=>{fly=null;opt.cut=H;syncCutBtns();sync();showLabels(false);opt.labels=false;orbit.enableDamping=false;orbit.minDistance=.1;orbit.maxPolarAngle=Math.PI;orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);}
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const p=document.createElement('canvas');p.width=p.height=64;const g=p.getContext('2d');g.drawImage(c,0,0,64,64);const a=g.getImageData(0,0,64,64).data,s=new Set();for(let i=0;i<a.length;i+=4)s.add((a[i]<<16)|(a[i+1]<<8)|a[i+2]);return s.size>25;};
const sameDefaults=current=>{assert.equal(current.length,family.defaultFurniture.length);for(const f of family.defaultFurniture)assert.deepEqual(current.find(q=>q.id===f.id),f,'default object '+f.id);};
const editable=['cx','cy','w','d','heightMm','elevationMm','rot','color','name'];

(async()=>{
 assert.equal(update?.id,REVISION);assert.equal(baseline.defaultFurniture.length,59);assert.equal(withoutAppliances.defaultFurniture.length,47);assert.equal(family.defaultFurniture.length,baseline.defaultFurniture.length-(family.metadata.familyLivingClearUpdate?.removedFurnitureIds.length||0));
 assert.deepEqual(fresh.map(f=>[f.cx,f.cy,f.rot]),[[4990,245,0],[1870,245,0],[620,3465,0]]);
 let localServer;
 if(process.argv.includes('--self-host')){
  assert.ok(!process.argv.includes('--published-smoke'),'self-host is only for local QA');
  localServer=http.createServer((req,res)=>{try{
   const url=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,name),relative=path.relative(root,file);
   if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
   const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end();}});
  await new Promise((resolve,reject)=>{localServer.once('error',reject);localServer.listen(0,'127.0.0.1',resolve);});base='http://127.0.0.1:'+localServer.address().port;console.log('Self-hosted read-only QA preview:',base);
 }
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 const errors=[],networkFailures=[],screenshots=[],report={revision:REVISION,migration:null,otherSchemes:[],svg:null,geometry:null};page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>networkFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('dialog',d=>d.accept());
 await context.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
 await context.route(base+'/**',async route=>{if(route.request().resourceType()!=='document')return route.fallback();try{const response=await route.fetch({timeout:90000}),html=await response.text();assert.ok(html.includes('window.View3D ='));await route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});}catch(e){networkFailures.push({url:route.request().url(),error:'QA document interception: '+e.message});await route.abort('failed').catch(()=>{});}});
 const open=async id=>{await page.goto(base+'/?scheme='+id,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture)&&document.querySelector('#gOpen'));assert.equal(await page.locator('#schemeSelect').inputValue(),id);};
 const reload=async()=>{await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture));};
 const reset=async()=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await page.locator('details.menu > summary').click();await page.locator('#reset').click();await page.locator('details.menu').evaluate(e=>e.open=false);};
 const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});screenshots.push(file);};
 try{
  for(const id of ['wood','laundry','screen']){await open(id);assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),plans.schemes[id]);assert.equal(await page.evaluate(()=>HOUSE_PLAN.metadata.familyAcWindowUpdate),undefined);report.otherSchemes.push(id);}
  await open('family');assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),family);assert.equal(await page.evaluate(()=>STORE),`floorplan:house-design:family:${plans.version}:${baseline.metadata.source.sha256.slice(0,12)}`);assert.equal(family.metadata.source.sha256,baseline.metadata.source.sha256);
  if(!process.argv.includes('--published-smoke')){
   const oldDraft=async(old,mode)=>page.evaluate(({old,mode,revisionIds})=>{const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>!revisionIds.includes(id));
    if(mode==='custom'){const f=s.furniture.find(f=>f.id==='family-acwall-room_a');Object.assign(f,{cx:f.cx+65,cy:f.cy-25,w:f.w+80,d:f.d+30,heightMm:f.heightMm+25,elevationMm:f.elevationMm-50,rot:90,color:'#bbaadd',name:'用户自定义主卧空调'});s.furniture=s.furniture.filter(f=>f.id!=='family-acwall-room_b');s.rooms.room_a.mat='terrazzo';s.measures=[{a:{x:500,y:600},b:{x:900,y:600}}];s.demolished=['w29'];}
    if(mode==='empty')s.furniture=[];localStorage.setItem(STORE,JSON.stringify(s));return structuredClone(s);},{old,mode,revisionIds:old.defaultFurniture.length===47?[REVISION,'family-appliances-20261012','family-living-clear-20261012']:[REVISION,'family-living-clear-20261012']});
   console.log('AC migration: previous 59 inner-wall defaults');await oldDraft(baseline,'default');await reload();sameDefaults(await page.evaluate(()=>structuredClone(state.furniture)));await reload();sameDefaults(await page.evaluate(()=>structuredClone(state.furniture)));
   console.log('AC migration: custom position/size/rotation/color/name and deletion');const old=await oldDraft(baseline,'custom');await reload();const updated=await page.evaluate(()=>structuredClone(state));for(const key of editable)assert.deepEqual(updated.furniture.find(f=>f.id===ids[0])[key],old.furniture.find(f=>f.id===ids[0])[key],key+' custom AC lost');assert.equal(updated.furniture.some(f=>f.id===ids[1]),false,'deleted AC resurrected');assert.deepEqual(updated.furniture.find(f=>f.id===ids[2]),fresh[2]);assert.equal(updated.rooms.room_a.mat,'terrazzo');assert.deepEqual(updated.measures,old.measures);assert.deepEqual(updated.demolished,old.demolished);assert.equal(updated.furniture.length,family.defaultFurniture.length-1);assert.ok(updated.layoutMigrationKeptIds.includes(ids[0]));
   const footprint=rectangle(updated.furniture.find(f=>f.id===ids[0])),source=updated.furniture.find(f=>f.id===ids[0]).sourceFootprintMm;for(const[key,value]of Object.entries({x:footprint.min[0],y:footprint.min[2],w:footprint.max[0]-footprint.min[0],d:footprint.max[2]-footprint.min[2]}))eq(source[key],value,'custom footprint '+key);
   await page.evaluate(()=>save());const customSaved=await page.evaluate(()=>structuredClone(state.furniture.find(f=>f.id==='family-acwall-room_a')));await reload();assert.deepEqual(await page.evaluate(()=>structuredClone(state.furniture.find(f=>f.id==='family-acwall-room_a'))),customSaved);assert.equal(await page.evaluate(()=>Boolean(getF('family-acwall-room_b'))),false);await reload();assert.equal(await page.evaluate(()=>Boolean(getF('family-acwall-room_b'))),false);
   console.log('AC migration: previous 47 no-appliance defaults');await oldDraft(withoutAppliances,'default');await reload();sameDefaults(await page.evaluate(()=>structuredClone(state.furniture)));await reload();sameDefaults(await page.evaluate(()=>structuredClone(state.furniture)));
   console.log('AC migration: intentionally empty draft and reset');await oldDraft(baseline,'empty');await reload();assert.equal(await page.evaluate(()=>state.furniture.length),0);await reload();assert.equal(await page.evaluate(()=>state.furniture.length),0);await reset();sameDefaults(await page.evaluate(()=>structuredClone(state.furniture)));assert.ok(await page.evaluate(id=>state.appliedLayoutRevisions.includes(id),REVISION));
   report.migration={innerWall59ToCurrent:true,old47ToCurrent:true,currentDefaultCount:family.defaultFurniture.length,idempotent:true,customPositionSizeHeightElevationRotationColorNamePreserved:true,deletionAndSavePreserved:true,materialMeasureDemolitionPreserved:true,emptyPreserved:true,resetCurrentDefaults:true,storeAndSourceStable:true};
  }
  const svg=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>{const f=getF(id),g=document.querySelector('[data-fid="'+id+'"]');return[id,{transform:g?.getAttribute('transform'),title:g?.querySelector('title')?.textContent,children:g?.children.length}];})),ids);
  for(const f of fresh){assert.equal(svg[f.id].transform,`translate(${f.cx} ${f.cy}) rotate(${f.rot})`);assert.ok(svg[f.id].title.includes(f.name));assert.ok(svg[f.id].title.includes('300 mm'));assert.ok(svg[f.id].children>2);}
  // Real SVG hit-testing and mouse selection, not the select() helper.
  await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);fitView();});
  for(const f of fresh){const point=await page.evaluate(id=>{const f=getF(id),g=document.querySelector('[data-fid="'+id+'"]');for(const x of [0,-.25,.25])for(const y of [0,-.25,.25]){const p=new DOMPoint(x*f.w,y*f.d).matrixTransform(g.getScreenCTM());if(document.elementFromPoint(p.x,p.y)?.closest('[data-fid]')?.dataset.fid===id)return{x:p.x,y:p.y};}return null;},f.id);assert.ok(point,f.id+' has no unobstructed actual SVG point');await page.mouse.click(point.x,point.y);await page.waitForFunction(id=>ui.sel?.kind==='furn'&&ui.sel.id===id,f.id,{timeout:10000});for(const [selector,key]of [['#fW','w'],['#fD','d'],['#fH','heightMm'],['#fZ','elevationMm']])assert.equal(await page.locator(selector).inputValue(),String(f[key]));}
  report.svg={allThreeRealPointerSelected:true,dimensionsAndHeightEditable:true,items:svg};
  await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);view.x0=-300;view.y0=-900;view.s=Math.min(svg.clientWidth/7600,svg.clientHeight/7500);applyView();});await shot('family-three-ac-window-plan');
  console.log('Actual WebGL full-height AC/window/furniture geometry');await page.evaluate(()=>setView('3d'));await page.waitForFunction(()=>window.__familyAcWindowQA.ready());await page.waitForFunction(painted);
  await page.evaluate(()=>window.__familyAcWindowQA.camera([6100,1800,3000],[4990,1400,30]));await page.waitForFunction(painted);const actual=await page.evaluate(()=>window.__familyAcWindowQA.inspect());assert.ok(actual.triangles>1000);assert.equal(actual.cut,actual.wallFullHeight);
  const collisions=[],geometry={};for(const f of fresh){const q=actual.furniture[f.id],r=rectangle(f);assert.ok(q?.meshes.length>8,f.id+' missing AC chassis/louvre/display geometry');for(let i=0;i<3;i++){eq(q.min[i],r.min[i],f.id+' actual min '+i);eq(q.max[i],r.max[i],f.id+' actual max '+i);}eq(q.rotation,0,f.id+' actual rotation');
   const display=q.meshes.find(m=>m.emissive&&m.geometry==='BoxGeometry');assert.ok(display,f.id+' missing visible display');eq(display.normal[2],1,f.id+' actual front faces south');eq(display.normal[0],0,f.id+' actual front must not face east/west');
   for(const [id,other]of Object.entries(actual.furniture))if(!ids.includes(id))for(const mesh of other.meshes)if(overlap(q,mesh))collisions.push({appliance:f.id,furniture:id,partId:mesh.partId,role:mesh.role});
   for(const [i,mesh]of actual.architecture.entries())if(overlap(q,mesh))collisions.push({appliance:f.id,architectureMesh:i,geometry:mesh.geometry});
   geometry[f.id]={min:q.min,max:q.max,meshCount:q.meshes.length,frontNormal:display.normal};
  }
  assert.deepEqual(collisions,[],'actual AC bodies intersect furniture/boards/architecture/windows/bay roofs');
  for(const [id,windowId]of [[ids[0],'window_a'],[ids[1],'window_b']]){const f=fresh.find(f=>f.id===id),win=family.WIN_META.find(w=>w.id===windowId),bay=family.BAYS.find(b=>b.id===windowId),q=actual.furniture[id];eq(q.min[1]-win.headMm,180,id+' body above measured window head');assert.ok(q.min[0]>=bay.rect[0]&&q.max[0]<=bay.rect[2]);assert.ok(q.min[2]>=120&&q.min[2]>Math.max(...bay.poly.map(p=>p[1])),'AC in room, not in bay projection');const roof=actual.architecture.filter(m=>m.geometry==='ExtrudeGeometry'&&Math.abs(m.min[1]-bay.headMm)<.5&&Math.abs(m.max[1]-(bay.headMm+bay.slabThicknessMm))<.5&&m.min[0]>=bay.rect[0]-.5&&m.max[0]<=bay.rect[2]+.5);assert.ok(roof.length>0,id+' no actual bay roof mesh audited');assert.ok(roof.every(mesh=>!overlap(q,mesh)),id+' actual AC intersects bay roof');geometry[id].windowHeadMm=win.headMm;geometry[id].aboveHeadMm=q.min[1]-win.headMm;geometry[id].bayRoofMeshesAudited=roof.length;}
  const study=actual.furniture[ids[2]],room=family.ROOMS.find(r=>r.id==='room_c');eq(study.min[0]-Math.min(...room.poly.map(p=>p[0])),50,'study actual left side to west inner wall');eq(study.min[2],3340,'study actual back mounts to north wall');assert.ok(study.min[0]>120&&study.max[2]<4150,'study AC is beside west window, not on west glass or fabricated west exterior wall');
  report.geometry={items:geometry,actualWallWindowBayRoofAndFurnitureCollisions:collisions,northBedroomWindowHead2070Gap180:true,bedroomBodiesOutsideBayProjection:true,studyNorthWallWestGap50:true,studyNearWestWindowNotOnGlassOrExteriorWall:true,allThreeFacesSouth:true,fullHeightArchitectureInspected:true,noInstallationCertification:true};
  const aim=async(position,target)=>{await page.evaluate(({position,target})=>window.__familyAcWindowQA.camera(position,target),{position,target});await page.waitForFunction(painted);};
  await aim([6100,1800,3000],[4990,1400,30]);await shot('family-main-bedroom-ac-and-north-window');
  await aim([1200,1800,3000],[1870,1400,30]);await shot('family-second-bedroom-ac-and-north-window');
  await aim([2100,1800,6090],[600,1650,3950]);await shot('family-study-northwest-ac-and-west-window');
  await page.evaluate(()=>setView('2d'));await page.waitForFunction(()=>!document.body.classList.contains('m3d')&&document.querySelector('#gOpen'));assert.deepEqual(errors,[]);assert.deepEqual(networkFailures,[]);
  const result={status:'PASS',...report,browserErrors:errors,networkFailures,screenshots};fs.writeFileSync(path.join(out,process.argv.includes('--published-smoke')?'browser-report-smoke.json':'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(e){const result={status:'FAIL',progress:report,browserErrors:errors,networkFailures,url:page.url(),error:e.stack||String(e)};try{fs.writeFileSync(path.join(out,'failure-report.json'),JSON.stringify(result,null,2)+'\n');}catch{}console.error(JSON.stringify(result,null,2));try{await page.screenshot({path:path.join(out,'failure.png'),timeout:10000});fs.writeFileSync(path.join(out,'failure.html'),await page.content());}catch{}throw e;}
 finally{await context.close();await browser.close();if(localServer)await new Promise(resolve=>localServer.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
