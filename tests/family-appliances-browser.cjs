'use strict';

// Isolated Playwright QA: inspection hooks are inserted into a fetched response,
// never shipped to the application. Dimensions describe concept envelopes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js');
const {beforeFamilyAppliances,REVISION}=require('../tools/family-appliances-20261012.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
let base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,'');
const out=path.resolve(process.env.FLOORPLAN_APPLIANCE_SHOTS||path.join(root,'..','output','family-appliances-20261012-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const family=plans.schemes.family,u=family.metadata.familyAppliancesUpdate,baseline=beforeFamilyAppliances(family),newIds=u?.newFurnitureIds||[],freshItems=family.defaultFurniture.filter(f=>newIds.includes(f.id));
const tolerance=.5,eq=(a,b,what)=>assert.ok(Math.abs(a-b)<tolerance,what+': '+a+' != '+b);
const keys=['cx','cy','w','d','rot','heightMm','elevationMm','name','color'];
const rectangle=f=>{const a=f.rot*Math.PI/180,W=Math.abs(Math.cos(a))*f.w+Math.abs(Math.sin(a))*f.d,D=Math.abs(Math.sin(a))*f.w+Math.abs(Math.cos(a))*f.d;return{min:[f.cx-W/2,f.elevationMm||0,f.cy-D/2],max:[f.cx+W/2,(f.elevationMm||0)+f.heightMm,f.cy+D/2]};};
const overlap=(a,b)=>[0,1,2].every(i=>Math.min(a.max[i],b.max[i])-Math.max(a.min[i],b.min[i])>tolerance);
const expectedRoles={
 ceilingfan:['ceiling-cassette','downward-air-inlet','protected-air-grille','fan-grille-hub'],
 bathheater:['ceiling-cassette','downward-air-inlet','protected-air-grille','sealed-led-diffuser'],
 blender:['motor-base','transparent-blending-cup','cup-lid','cup-handle','blending-blade'],
 temperaturekettle:['glass-kettle','kettle-handle','pouring-spout','temperature-display'],
 healthkettle:['glass-kettle','kettle-handle','pouring-spout','herbal-tea-content'],
 sterilizer:['sterilizer-back','bottle-rack','feeding-bottle','transparent-sterilizer-door','sterilizer-door-pull'],
 waterdispenser:['dispenser-body','water-reservoir','water-spout','dispensing-recess','drip-tray','dispenser-display']
};
const hook=`window.__familyAppliancesQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow>.999&&furnGrow>.999),
 inspect:()=>{
  scene.updateMatrixWorld(true);
  const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};
  const description=o=>{const materials=Array.isArray(o.material)?o.material:[o.material],normal=new THREE.Vector3(0,0,1).transformDirection(o.matrixWorld);return{...bounds(o),geometry:o.geometry.type,role:o.userData.role||null,partId:o.userData.cabinetPartId||null,visible:o.visible,normal:[normal.x,normal.y,normal.z],transparent:materials.some(m=>m.transparent&&m.opacity<1),emissive:materials.some(m=>m.emissiveIntensity>0)};};
  const furniture=Object.fromEntries(furnG.children.map(g=>{const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(description(o));});return[g.userData.fid,{...bounds(g),rotation:g.rotation.y,applianceType:g.userData.applianceType||null,meshes}];}));
  const architecture=[];archUp.traverse(o=>{if(o.isMesh)architecture.push(description(o));});
  return{furniture,architecture,triangles:renderer.info.render.triangles};
 },
 camera:(position,target,cut)=>{fly=null;opt.cut=cut??H;syncCutBtns();sync();showLabels(false);opt.labels=false;orbit.enableDamping=false;orbit.minDistance=.1;orbit.maxPolarAngle=Math.PI;orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);}
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const p=document.createElement('canvas');p.width=p.height=64;const g=p.getContext('2d');g.drawImage(c,0,0,64,64);const a=g.getImageData(0,0,64,64).data,s=new Set();for(let i=0;i<a.length;i+=4)s.add((a[i]<<16)|(a[i+1]<<8)|a[i+2]);return s.size>25;};
const sameDefaults=current=>{assert.equal(current.length,family.defaultFurniture.length);for(const f of family.defaultFurniture)assert.deepEqual(current.find(q=>q.id===f.id),f,'default object '+f.id);};

(async()=>{
 assert.equal(u?.id,REVISION);assert.equal(baseline.defaultFurniture.length,47);assert.equal(family.defaultFurniture.length,59);assert.equal(newIds.length,12);
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
  for(const id of ['wood','laundry','screen']){await open(id);assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),plans.schemes[id]);assert.equal(await page.evaluate(()=>HOUSE_PLAN.metadata.familyAppliancesUpdate),undefined);report.otherSchemes.push(id);}
  await open('family');assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),family);assert.equal(await page.evaluate(()=>STORE),`floorplan:house-design:family:${plans.version}:${baseline.metadata.source.sha256.slice(0,12)}`);assert.equal(family.metadata.source.sha256,baseline.metadata.source.sha256);
  if(!process.argv.includes('--published-smoke')){
   const oldDraft=async mode=>page.evaluate(({old,mode,revisionId})=>{const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>![revisionId,'family-ac-window-20261012'].includes(id));if(mode==='custom'){const f=s.furniture.find(f=>f.id==='study_full_desk');Object.assign(f,{cx:f.cx+40,cy:f.cy-30,w:f.w+80,d:f.d+20,heightMm:760,elevationMm:10,rot:15,color:'#aabbee',name:'用户自定义书桌'});s.furniture=s.furniture.filter(f=>f.id!=='study_north_sofa');s.rooms.room_c.mat='terrazzo';s.demolished=['w29'];s.measures=[{a:{x:500,y:600},b:{x:900,y:600}}];}if(mode==='empty')s.furniture=[];localStorage.setItem(STORE,JSON.stringify(s));return structuredClone(s);},{old:baseline,mode,revisionId:REVISION});
   console.log('Appliance migration: previous 47 defaults');await oldDraft('default');await reload();sameDefaults(await page.evaluate(()=>structuredClone(state.furniture)));assert.equal(new Set(await page.evaluate(()=>state.furniture.map(f=>f.id))).size,59);await reload();assert.equal(await page.evaluate(()=>state.furniture.length),59,'repeat migration duplicates appliances');
   console.log('Appliance migration: custom draft preservation');const old=await oldDraft('custom');await reload();const updated=await page.evaluate(()=>structuredClone(state));const customId='study_full_desk';for(const key of [...keys,'parts','baseWidthMm','baseDepthMm','baseHeightMm'])assert.deepEqual(updated.furniture.find(f=>f.id===customId)[key],old.furniture.find(f=>f.id===customId)[key],key+' custom desk lost');assert.equal(updated.furniture.some(f=>f.id==='study_north_sofa'),false);assert.deepEqual(updated.measures,old.measures);assert.deepEqual(updated.demolished,old.demolished);assert.equal(updated.rooms.room_c.mat,'terrazzo');assert.equal(updated.furniture.length,58);for(const id of newIds)assert.ok(updated.furniture.some(f=>f.id===id));
   console.log('Appliance migration: appliance edits and deletions');await page.evaluate(()=>{const f=getF('family-sideboard-blender');Object.assign(f,{cx:f.cx+25,w:f.w+20,color:'#ddeedd',name:'自定义破壁机'});state.furniture=state.furniture.filter(f=>f.id!=='family-sideboard-healthkettle');save();});const appliance=await page.evaluate(()=>structuredClone(getF('family-sideboard-blender')));await reload();assert.deepEqual(await page.evaluate(()=>structuredClone(getF('family-sideboard-blender'))),appliance);assert.equal(await page.evaluate(()=>Boolean(getF('family-sideboard-healthkettle'))),false,'deleted new appliance resurrected');await reload();assert.equal(await page.evaluate(()=>Boolean(getF('family-sideboard-healthkettle'))),false);
   console.log('Appliance migration: empty and reset');await oldDraft('empty');await reload();assert.equal(await page.evaluate(()=>state.furniture.length),0);await reset();sameDefaults(await page.evaluate(()=>structuredClone(state.furniture)));assert.ok(await page.evaluate(id=>state.appliedLayoutRevisions.includes(id),REVISION));
   report.migration={defaults47To59:true,idempotent:true,customExistingPlacementSizeHeightRotationNameColorAndConstructionPreserved:true,existingDeletionPreserved:true,measuresMaterialsDemolitionPreserved:true,newEditsAndDeletionPreserved:true,emptyPreserved:true,reset59:true,storageSourceStable:true};
  }
  const svg=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>{const f=getF(id),g=document.querySelector('[data-fid="'+id+'"]');return[id,{transform:g?.getAttribute('transform'),title:g?.querySelector('title')?.textContent,symbol:furnSVG(f.type,f.w,f.d,f.color,f.modelVariant),childCount:g?.children.length}];})),newIds);
  for(const f of freshItems){assert.equal(svg[f.id].transform,`translate(${f.cx} ${f.cy}) rotate(${f.rot})`);assert.ok(svg[f.id].title.includes(f.name));assert.ok(svg[f.id].title.includes(f.heightMm+' mm'));assert.ok(svg[f.id].childCount>2,'generic rectangle-only SVG '+f.type);}
  const symbols=Object.keys(expectedRoles).map(type=>svg[freshItems.find(f=>f.type===type).id].symbol);assert.equal(new Set(symbols).size,7,'new appliance symbols not distinguishable');
  // Exercise actual SVG hit-testing and selection, not a scripted select().
  await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);fitView();});
  const clickSVG=async id=>{const point=await page.evaluate(id=>{const f=getF(id),g=document.querySelector('[data-fid="'+id+'"]');for(const x of [0,-.25,.25])for(const y of [0,-.25,.25]){const p=new DOMPoint(x*f.w,y*f.d).matrixTransform(g.getScreenCTM());if(document.elementFromPoint(p.x,p.y)?.closest('[data-fid]')?.dataset.fid===id)return{x:p.x,y:p.y};}return null;},id);assert.ok(point,id+' has no unobstructed SVG body point');await page.mouse.click(point.x,point.y);await page.waitForFunction(id=>ui.sel?.kind==='furn'&&ui.sel.id===id,id,{timeout:10000});};
  for(const f of freshItems){console.log('SVG pointer:',f.id);await clickSVG(f.id);assert.equal(await page.locator('#fW').inputValue(),String(f.w));assert.equal(await page.locator('#fH').inputValue(),String(f.heightMm));assert.equal(await page.locator('#fZ').inputValue(),String(f.elevationMm));}
  await clickSVG('family-sideboard-blender');assert.ok((await page.locator('#panel').textContent()).includes('待'));assert.equal(await page.locator('#fZ').inputValue(),'850');
  report.svg={distinctNewTypes:7,selectableAppliances:12,allDimensionPanelsEditable:true,sideboardRealPointerAndPendingDetails:true,items:svg};
  await page.evaluate(()=>{drawer('lib',false);drawer('panel',false);select(null);fitView();});await shot('family-appliance-plan');
  console.log('Actual WebGL appliance geometry');await page.evaluate(()=>setView('3d'));await page.waitForFunction(()=>window.__familyAppliancesQA.ready());await page.waitForFunction(painted);
  await page.evaluate(()=>window.__familyAppliancesQA.camera([4900,1700,10150],[2350,1150,10150]));await page.waitForFunction(painted);const actual=await page.evaluate(()=>window.__familyAppliancesQA.inspect());assert.ok(actual.triangles>1000);
  const geometry={},collisions=[];for(const f of freshItems){const q=actual.furniture[f.id],r=rectangle(f);assert.ok(q?.meshes.length,'missing mesh '+f.id);for(let i=0;i<3;i++){eq(q.min[i],r.min[i],f.id+' min '+i);eq(q.max[i],r.max[i],f.id+' max '+i);}eq(q.rotation,-f.rot*Math.PI/180,f.id+' rotation');
   if(expectedRoles[f.type]){assert.equal(q.applianceType,f.type);for(const role of expectedRoles[f.type])assert.ok(q.meshes.some(m=>m.role===role),f.type+' missing role '+role);}else assert.ok(q.meshes.length>8,'old AC template became generic box');
   if(['blender','temperaturekettle','healthkettle','sterilizer','waterdispenser'].includes(f.type)){assert.ok(q.meshes.some(m=>m.transparent),f.type+' missing transparent glass');assert.equal(f.rot,270);eq(Math.sin(q.rotation),1,f.type+' native front should face east');const display=q.meshes.find(m=>/display/.test(m.role||''));if(f.type==='healthkettle')assert.ok(q.meshes.some(m=>m.role==='tea-control-button'));else{assert.ok(display);eq(display.normal[0],1,f.type+' control face should face east');}eq(f.elevationMm,850,'countertop mounting');}
   if(f.type==='sterilizer'){const racks=q.meshes.filter(m=>m.role==='bottle-rack'),bottles=q.meshes.filter(m=>m.role==='feeding-bottle');assert.equal(racks.length,2);assert.equal(bottles.length,6);assert.ok(Math.abs(racks[0].min[1]-racks[1].min[1])>100);}
   if(['ceilingfan','bathheater'].includes(f.type)){assert.equal(f.elevationMm,2620);assert.equal(f.heightMm,80);assert.ok(q.meshes.filter(m=>m.role==='protected-air-grille').length>=7);const base=q.meshes.find(m=>m.role==='ceiling-cassette');assert.ok(q.meshes.filter(m=>m.role==='protected-air-grille').every(m=>m.min[1]<base.min[1]));if(f.type==='bathheater')assert.ok(q.meshes.some(m=>m.role==='sealed-led-diffuser'&&m.emissive));}
   for(const [id,other]of Object.entries(actual.furniture))if(!newIds.includes(id))for(const mesh of other.meshes)if(overlap(q,mesh))collisions.push({appliance:f.id,furniture:id,partId:mesh.partId,role:mesh.role});
   for(const [i,mesh]of actual.architecture.entries())if(overlap(q,mesh))collisions.push({appliance:f.id,architectureMesh:i,geometry:mesh.geometry});
   geometry[f.id]={min:q.min,max:q.max,meshCount:q.meshes.length,roles:[...new Set(q.meshes.map(m=>m.role).filter(Boolean))]};
  }
  assert.deepEqual(collisions,[],'actual appliance envelopes intersect existing real furniture/boards/windows/walls/doors');
  const air=actual.furniture['family-living-aircon'];assert.ok(!overlap(air,actual.furniture['fit-tv_console']||{min:[0,0,0],max:[0,0,0]}));report.geometry={items:geometry,actualBoardWindowDoorWallIntersections:collisions,allPhysicalBoundsMatch:true,allFiveUseEastFacing850Counter:true,sterilizerTwoRacksSixBottles:true,protectedCeilingGrillesAndSealedLED:true};
  const aim=async(position,target,cut)=>{await page.evaluate(({position,target,cut})=>window.__familyAppliancesQA.camera(position,target,cut),{position,target,cut});await page.waitForFunction(painted);};
  await aim([4900,1650,10130],[2310,1150,10130]);await shot('family-sideboard-five-appliances');
  await aim([5050,1500,8800],[6120,950,6540]);await shot('family-tv-east-corner-aircon');
  await aim([7000,1500,12650],[7110,2650,12500]);await shot('family-kitchen-ceilingfan');
  await aim([5750,1600,4340],[6260,2650,4105]);await shot('family-main-shower-bathheater');
  await aim([5680,1600,5790],[6260,2650,5595]);await shot('family-guest-shower-bathheater');
  for(const [room,label]of [['room_a','main-bedroom'],['room_b','second-bedroom'],['room_c','study']]){
   const f=freshItems.find(f=>f.id==='family-acwall-'+room),south=f.rot===0;
   await aim([f.cx,1550,f.cy+(south?2200:-1900)],[f.cx,2380,f.cy]);await shot('family-'+label+'-acwall');
  }
  await page.evaluate(()=>setView('2d'));await page.waitForFunction(()=>!document.body.classList.contains('m3d')&&document.querySelector('#gOpen'));assert.deepEqual(errors,[]);assert.deepEqual(networkFailures,[]);
  const result={status:'PASS',...report,browserErrors:errors,networkFailures,screenshots};fs.writeFileSync(path.join(out,process.argv.includes('--published-smoke')?'browser-report-smoke.json':'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(e){const result={status:'FAIL',progress:report,browserErrors:errors,networkFailures,url:page.url(),error:e.stack||String(e)};try{fs.writeFileSync(path.join(out,'failure-report.json'),JSON.stringify(result,null,2)+'\n');}catch{}console.error(JSON.stringify(result,null,2));try{await page.screenshot({path:path.join(out,'failure.png'),timeout:10000});fs.writeFileSync(path.join(out,'failure.html'),await page.content());}catch{}throw e;}
 finally{await context.close();await browser.close();if(localServer)await new Promise(resolve=>localServer.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
