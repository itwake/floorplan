'use strict';

// Root is the only process that launches this harness. This test observes the
// real SVG rectangles and WebGL solids, not the enlarged plan callout. Published
// mode fetches hosted HTML/assets; the injected hook only exposes read-only QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require('../data/house-plans.js');
const {beforeFamilyFloorDrains,REVISION,DRAIN_IDS}=require('../tools/family-floor-drains-20261012.cjs');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
let base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194').replace(/\/$/,'');
const out=path.resolve(process.env.FLOORPLAN_FLOOR_DRAINS_SHOTS||path.join(root,'..','output','family-floor-drains-20261012-qa'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const family=plans.schemes.family,baseline=beforeFamilyFloorDrains(family),u=family.metadata.familyFloorDrainsUpdate;
const ids=['family-drain-balcony','family-drain-bath1-dry','family-drain-bath1-shower','family-drain-bath2-dry','family-drain-bath2-shower'];
const showers=['family-f12','family-f15'],sorted=items=>structuredClone(items).sort((a,b)=>a.id.localeCompare(b.id));
const equalDefaults=items=>assert.deepEqual(sorted(items),sorted(family.defaultFurniture),'every current default object exactly matches generated model');
const eq=(a,b,s)=>assert.ok(Math.abs(a-b)<.6,s+': '+a+' != '+b);
const overlap=(a,b)=>[0,1,2].every(i=>Math.min(a.max[i],b.max[i])-Math.max(a.min[i],b.min[i])>.6);
const hook=`window.__familyFloorDrainsQA={
 ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow>.999&&furnGrow>.999),
 inspect:()=>{scene.updateMatrixWorld(true);const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY]};};const desc=o=>{const ms=Array.isArray(o.material)?o.material:[o.material];return{...bounds(o),role:o.userData.role||null,partId:o.userData.cabinetPartId||null,roomId:o.userData.room||null,geometry:o.geometry.type,visible:o.visible,clipConstants:ms.flatMap(m=>(m.clippingPlanes||[]).map(p=>p.constant)),colors:ms.map(m=>m.color?.getHexString()||null),transparent:ms.some(m=>m.transparent&&m.opacity<1)};};const furniture=Object.fromEntries(furnG.children.map(g=>{const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(desc(o));});return[g.userData.fid,{...bounds(g),center:[g.position.x*1000+OX,g.position.z*1000+OY],rotation:g.rotation.y,surfaceDatum:g.userData.surfaceDatum?structuredClone(g.userData.surfaceDatum):null,meshes}];}));const architecture=[];for(const group of [archUp,archFloor])group.traverse(o=>{if(o.isMesh)architecture.push(desc(o));});return{furniture,architecture,target:[orbit.target.x*1000+OX,orbit.target.y*1000,orbit.target.z*1000+OY],cut:opt.cut,triangles:renderer.info.render.triangles};},
 grateRays:id=>{scene.updateMatrixWorld(true);const g=furnG.children.find(g=>g.userData.fid===id),bars=[];g?.traverse(o=>{if(o.isMesh&&o.userData.role==='floor-drain-grate')bars.push(o);});const meshes=[];for(const root of [archFloor,archUp,furnG])root.traverse(o=>{if(o.isMesh){let visible=true;for(let q=o;q;q=q.parent)if(!q.visible)visible=false;const ms=Array.isArray(o.material)?o.material:[o.material];if(visible&&!ms.every(m=>m.transparent&&m.opacity<.95))meshes.push(o);}});return bars.map(bar=>{const b=new THREE.Box3().setFromObject(bar),c=b.getCenter(new THREE.Vector3()),ray=new THREE.Raycaster(new THREE.Vector3(c.x,b.max.y+.025,c.z),new THREE.Vector3(0,-1,0),0,.09),hits=ray.intersectObjects(meshes,false);const first=hits[0];let fid=null;for(let n=first?.object;n;n=n.parent)if(n.userData.fid){fid=n.userData.fid;break;}return{fid,role:first?.object.userData.role||null,hitY:first?.point.y*1000,barTopMm:b.max.y*1000};});},
 camera:(position,target,cut)=>{fly=null;opt.cut=cut??H;syncCutBtns();sync();showLabels(false);opt.labels=false;orbit.enableDamping=false;orbit.minDistance=.1;orbit.maxPolarAngle=Math.PI;orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);}
};\n`;
const painted=()=>{const c=document.querySelector('#view3d canvas');if(!c?.width)return false;const p=document.createElement('canvas');p.width=p.height=64;const g=p.getContext('2d');g.drawImage(c,0,0,64,64);const a=g.getImageData(0,0,64,64).data,s=new Set();for(let i=0;i<a.length;i+=4)s.add((a[i]<<16)|(a[i+1]<<8)|a[i+2]);return s.size>25;};

(async()=>{
 assert.equal(u?.id,REVISION);assert.deepEqual(DRAIN_IDS,ids);assert.equal(baseline.defaultFurniture.length,63);assert.equal(family.defaultFurniture.length,68);
 assert.deepEqual(u.disabledImplicitShowerDrainIds,showers);
 assert.deepEqual(family.defaultFurniture.filter(f=>!ids.includes(f.id)),baseline.defaultFurniture,'all existing 63 objects unchanged by drain-only layer');
 let server,browser,context,page;const report={revision:REVISION,migration:null,otherSchemes:[],svg:null,editing:null,geometry:null},errors=[],networkFailures=[],screenshots=[];
 try{
  if(process.argv.includes('--self-host')){
   assert.ok(!process.argv.includes('--published-smoke'),'local hosting cannot be published verification');
   server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,name),relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});base='http://127.0.0.1:'+server.address().port;console.log('Self-hosted read-only floor drains QA:',base);
  }
  fs.mkdirSync(out,{recursive:true});const proxy=process.argv.includes('--published-smoke')&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
  browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(proxy?{proxy:{server:proxy}}:{})});context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>networkFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('dialog',d=>d.accept());
  await context.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
  await context.route(base+'/**',async route=>{if(route.request().resourceType()!=='document')return route.fallback();try{const response=await route.fetch({timeout:90000}),html=await response.text();assert.ok(html.includes('window.View3D ='));await route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});}catch(e){networkFailures.push({url:route.request().url(),error:'QA document interception: '+e.message});await route.abort('failed').catch(()=>{});}});
  const ready=()=>page.waitForFunction(()=>window.HOUSE_PLANS&&window.View3D&&Array.isArray(state.furniture));
  const open=async id=>{await page.goto(base+'/?scheme='+id,{waitUntil:'domcontentloaded'});await ready();assert.equal(await page.locator('#schemeSelect').inputValue(),id);};
  const reload=async()=>{await page.reload({waitUntil:'domcontentloaded'});await ready();};
  const snapshot=()=>page.evaluate(()=>({state:structuredClone(state),saved:JSON.parse(localStorage.getItem(STORE)),key:STORE}));
  const clickObserved=async selector=>{
   await page.locator(selector).evaluate(button=>button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'}));
   await page.waitForFunction(selector=>{const button=document.querySelector(selector);if(!button||button.disabled)return false;const r=button.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return r.width>0&&r.height>0&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&document.elementFromPoint(x,y)?.closest(selector)===button;},selector);
   const r=await page.locator(selector).boundingBox();assert.ok(r,'observed control bounds: '+selector);await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
  };
  const reset=async()=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await clickObserved('details.menu > summary');await clickObserved('#reset');await page.locator('details.menu').evaluate(e=>e.open=false);};
  const shot=async name=>{const file=path.join(out,name+'.png');await page.screenshot({path:file});screenshots.push(file);};
  const go3d=async()=>{if(await page.evaluate(()=>viewMode)!=='3d')await clickObserved('#viewSeg [data-view="3d"]');await page.waitForFunction(()=>window.__familyFloorDrainsQA.ready());await page.waitForFunction(painted);};
  const go2d=async()=>{if(await page.evaluate(()=>viewMode)!=='2d')await clickObserved('#viewSeg [data-view="2d"]');};
  const inspect=()=>page.evaluate(()=>window.__familyFloorDrainsQA.inspect());
  const noOldSvg=()=>page.evaluate(ids=>ids.every(id=>!document.querySelector('#gFurn [data-fid="'+id+'"] [data-implicit-shower-drain]')),showers);
  const noOldMesh=actual=>{for(const id of showers)assert.ok(!actual.furniture[id]?.meshes.some(m=>m.role==='implicit-shower-drain'),id+' legacy strip must be suppressed by metadata, not new-drain presence');};
  const warningText=async()=>{const text=await page.locator('[data-family-floor-drains-warning]').first().innerText();assert.match(text,/5|五/);assert.match(text,/暂估|待核|概念/);assert.match(text,/管线|管路|排水管/);assert.match(text,/未绘制|未建模/);assert.match(text,/坡/);assert.match(text,/现场核验|现场复核|待核/);assert.match(text,/洗衣/);assert.match(text,/不默认接入|不自动接入|不代表已接入/);return text;};

  console.log('Floor drains: other three imported schemes preserve prior implicit decorations');
  for(const id of ['wood','laundry','screen']){
   await open(id);assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),plans.schemes[id]);assert.deepEqual(await page.evaluate(()=>structuredClone(state.furniture)),plans.schemes[id].defaultFurniture);assert.equal(await page.evaluate(()=>HOUSE_PLAN.metadata.familyFloorDrainsUpdate),undefined);assert.equal(await page.locator('[data-floor-drain]').count(),0);
   const showerIds=plans.schemes[id].defaultFurniture.filter(f=>f.type==='shower').map(f=>f.id);assert.ok(showerIds.length>0);for(const sid of showerIds)assert.equal(await page.locator('#gFurn [data-fid="'+sid+'"] [data-implicit-shower-drain]').count(),1,id+' SVG legacy decoration retained');
   if(!process.argv.includes('--published-smoke')){await go3d();const actual=await inspect();for(const sid of showerIds)assert.equal(actual.furniture[sid].meshes.filter(m=>m.role==='implicit-shower-drain').length,1,id+' real legacy strip retained');await go2d();}
   report.otherSchemes.push({id,defaultsUnchanged:true,legacySvgRetained:true,legacyWebglRetained:!process.argv.includes('--published-smoke')});
  }
  await open('family');assert.deepEqual(await page.evaluate(()=>structuredClone(HOUSE_PLAN)),family);assert.equal(await page.evaluate(()=>STORE),`floorplan:house-design:family:${plans.version}:${baseline.metadata.source.sha256.slice(0,12)}`);equalDefaults((await snapshot()).state.furniture);
  if(!process.argv.includes('--published-smoke')){
   const oldDraft=mode=>page.evaluate(({old,mode,revision})=>{const s=defaultState();s.furniture=structuredClone(old.defaultFurniture);s.appliedLayoutRevisions=s.appliedLayoutRevisions.filter(id=>id!==revision);if(mode==='custom'){for(const id of ['family-f12','laundry_dryer','balcony_bucket_tap']){const f=s.furniture.find(f=>f.id===id);Object.assign(f,{cx:f.cx+19,cy:f.cy-21,w:f.w+10,d:f.d+20,rot:165,color:'#cbdade',name:'用户自定义 '+id});f.userExtension={keep:['original',3]};}s.furniture=s.furniture.filter(f=>f.id!=='study_north_sofa');s.rooms.balcony.mat='terrazzo';s.measures=[{a:{x:500,y:600},b:{x:900,y:600}}];s.demolished=['w29'];}if(mode==='deleted')s.furniture=s.furniture.filter(f=>!['family-f12','laundry_dryer','balcony_bucket_tap'].includes(f.id));if(mode==='empty')s.furniture=[];localStorage.setItem(STORE,JSON.stringify(s));return structuredClone(s);},{old:baseline,mode,revision:REVISION});
   console.log('Floor drain migration: additive only, exact old defaults, once and idempotent');await oldDraft('default');await reload();let q=await snapshot();equalDefaults(q.state.furniture);assert.ok(q.state.appliedLayoutRevisions.includes(REVISION));assert.equal(q.state.appliedLayoutRevisions.filter(id=>id===REVISION).length,1);await reload();assert.deepEqual((await snapshot()).state,q.state,'reload duplicates or changes drain layer');
   console.log('Floor drain migration: old custom geometry/style/deletions remain exact');const custom=await oldDraft('custom');await reload();q=await snapshot();assert.deepEqual(sorted(q.state.furniture.filter(f=>!ids.includes(f.id))),sorted(custom.furniture),'drain addition must not alter any existing custom object');assert.deepEqual(q.state.measures,custom.measures);assert.deepEqual(q.state.demolished,custom.demolished);assert.deepEqual(q.state.rooms,custom.rooms);for(const id of ids)assert.equal(q.state.furniture.filter(f=>f.id===id).length,1);await reload();assert.deepEqual((await snapshot()).state,q.state);
   await oldDraft('deleted');await reload();q=await snapshot();for(const id of ['family-f12','laundry_dryer','balcony_bucket_tap'])assert.equal(q.state.furniture.some(f=>f.id===id),false,'deleted old object revived');for(const id of ids)assert.equal(q.state.furniture.filter(f=>f.id===id).length,1);
   await oldDraft('empty');await reload();q=await snapshot();assert.equal(q.state.furniture.length,0,'intentionally empty draft revived');assert.ok(q.state.appliedLayoutRevisions.includes(REVISION));await reload();assert.equal((await snapshot()).state.furniture.length,0);await reset();equalDefaults((await snapshot()).state.furniture);
   report.migration={old63Exact:true,addedFiveExactlyOnce:true,idempotent:true,customOldPoseSizeNameColorComponentsExact:true,oldDeletionsPreserved:true,intentionalEmptyPreserved:true,measureMaterialDemolitionPreserved:true,storeSourceStable:true,resetCurrentDefaults:true};
  }

  console.log('Floor drains: actual 150 mm SVG grate footprints, decorative markers and persistent warnings');
  await page.evaluate(()=>{drawer('lib',false);select(null);drawer('panel',true);fitView();});const overviewWarning=await warningText();assert.equal(await page.locator('[data-family-floor-drains-warning]').first().isVisible(),true);assert.equal(await noOldSvg(),true);
  const plan=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>{const g=document.querySelector('#gFurn [data-fid="'+id+'"]'),marker=g?.querySelector('[data-floor-drain]'),rects=[...(g?.querySelectorAll('rect')||[])].filter(r=>!r.closest('[data-marker-only]')),bounds=rects.map(r=>({x:+r.getAttribute('x'),y:+r.getAttribute('y'),w:+r.getAttribute('width'),d:+r.getAttribute('height'),title:r.querySelector('title')?.textContent||''}));return[id,{transform:g?.getAttribute('transform'),title:g?.querySelector('title')?.textContent||'',rects:bounds,marker:marker?{id:marker.getAttribute('data-floor-drain'),only:marker.getAttribute('data-marker-only'),pointerEvents:marker.getAttribute('pointer-events'),text:marker.textContent}:null}];})),ids);
  for(const [id,item]of Object.entries(plan)){
   const f=family.defaultFurniture.find(f=>f.id===id);assert.equal(item.transform,`translate(${f.cx} ${f.cy}) rotate(${f.rot})`);assert.ok(item.title.includes(f.name));assert.match(item.title,/150×150×4/);assert.equal(item.marker?.id,id);assert.equal(item.marker.only,'true');assert.equal(item.marker.pointerEvents,'none');assert.match(item.marker.text,/150\s*×\s*150/);assert.ok(item.rects.length>=15,id+' actual frame/recess/grate rectangles missing');const frames=item.rects.filter(r=>r.title.includes('drain-frame'));assert.ok(frames.length>=4);eq(Math.max(...frames.map(r=>r.x+r.w))-Math.min(...frames.map(r=>r.x)),150,id+' actual frame width');eq(Math.max(...frames.map(r=>r.y+r.d))-Math.min(...frames.map(r=>r.y)),150,id+' actual frame depth');assert.ok(item.rects.filter(r=>r.title.includes('drain-grate')).length>=10);
   await page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},id);assert.equal(await page.locator('#fW').inputValue(),'150');assert.equal(await page.locator('#fD').inputValue(),'150');assert.equal(await page.locator('#fH').inputValue(),'4');assert.equal(await page.locator('#fZ').inputValue(),String(f.elevationMm||0));await warningText();assert.equal(await page.locator('#viewFloorDrain3d').count(),1);
  }
  for(const id of ['balcony','bath_1','bath_2']){await page.evaluate(id=>{select({kind:'room',id});drawer('panel',true);},id);await warningText();}
  await page.evaluate(()=>{select(null);drawer('panel',true);fitView();});await shot('family-floor-drains-full-plan');assert.deepEqual((await snapshot()).state.measures,[],'plan markers must not create fake measuring-tool objects');
  report.svg={real150By150Parts:true,grateBarsAtLeast10:true,markerVisualOnlyAndNonInteractive:true,noLegacyCenterCircles:true,overviewSelectedAndWetRoomWarnings:true,actualDimensionInputs:true,noFabricatedMeasures:true,items:plan,warning:overviewWarning};

  if(!process.argv.includes('--published-smoke')){
   console.log('New drain property edits, undo/redo, reload, and deletion without implicit replacement');const id=ids[0];await page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},id);const old=structuredClone(family.defaultFurniture.find(f=>f.id===id));await page.locator('#fName').fill('用户阳台地漏');await page.locator('#fName').press('Tab');assert.equal(await page.evaluate(id=>getF(id).name,id),'用户阳台地漏');await clickObserved('#undo');assert.deepEqual(await page.evaluate(id=>structuredClone(getF(id)),id),old);await clickObserved('#redo');assert.equal(await page.evaluate(id=>getF(id).name,id),'用户阳台地漏');
   for(const [selector,value]of [['#fW','170'],['#fD','160'],['#fR','30']]){await page.locator(selector).fill(value);await page.locator(selector).press('Tab');}
   // The color picker is native; dispatch its real onchange binding rather
   // than automating an OS-only picker. Other property inputs and commands
   // above use normal keyboard and hit-tested pointer events.
   await page.locator('#fC').evaluate(e=>{e.value='#88aabb';e.dispatchEvent(new Event('change',{bubbles:true}));});const edited=await snapshot();const e=edited.state.furniture.find(f=>f.id===id);assert.equal(e.w,170);assert.equal(e.d,160);assert.equal(e.rot,30);assert.equal(e.color,'#88aabb');await reload();assert.deepEqual((await snapshot()).state.furniture,edited.state.furniture,'new drain editing lost on save');await page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},id);assert.equal(await page.locator('#fW').inputValue(),'170');assert.equal(await page.locator('#fD').inputValue(),'160');await clickObserved('#aDel');assert.equal(await page.evaluate(id=>Boolean(getF(id)),id),false);await clickObserved('#undo');assert.deepEqual(await page.evaluate(id=>structuredClone(getF(id)),id),e);await clickObserved('#redo');assert.equal(await page.evaluate(id=>Boolean(getF(id)),id),false);await reload();assert.equal(await page.evaluate(id=>Boolean(getF(id)),id),false,'deleted new balcony drain resurrected');
   for(const sid of ids.filter(id=>id.endsWith('-shower'))){await page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},sid);await clickObserved('#aDel');}await reload();assert.equal(await noOldSvg(),true,'deleting explicit shower drains resurrected legacy SVG decoration');await go3d();const deleted=await inspect();noOldMesh(deleted);for(const sid of [ids[0],...ids.filter(id=>id.endsWith('-shower'))])assert.equal(deleted.furniture[sid],undefined);await go2d();await reset();equalDefaults((await snapshot()).state.furniture);
   report.editing={realNameAndSizeRotationInputs:true,colorOnchangeBinding:true,undoRedoExact:true,persistsOnReload:true,deletionPersists:true,deletedExplicitDrainsDoNotReviveLegacySvgOrWebgl:true};
  }

  console.log('Floor drains: actual local 3D focus, exposed grate top surface and no duplicate strips');
  const focused=[];for(const id of ids){await page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},id);const before=await snapshot();await clickObserved('#viewFloorDrain3d');await page.waitForFunction(()=>window.__familyFloorDrainsQA.ready());await page.waitForFunction(painted);assert.deepEqual((await snapshot()).state,before.state,'floor-drain focus must be camera-only');focused.push(id);}
  const actual=await inspect();assert.ok(actual.triangles>1000);assert.deepEqual(Object.keys(actual.furniture).sort(),family.defaultFurniture.map(f=>f.id).sort());noOldMesh(actual);
  for(const f of family.defaultFurniture){const g=actual.furniture[f.id];assert.ok(g.meshes.length>0,f.id+' absent');eq(g.center[0],f.cx,f.id+' actual center x');eq(g.center[1],f.cy,f.id+' actual center y');eq(g.rotation,-f.rot*Math.PI/180,f.id+' actual rotation');}
  const drains={};for(const id of ids){
   const f=family.defaultFurniture.find(f=>f.id===id),g=actual.furniture[id];assert.equal(f.modelVariant,'square-floor-drain');
   eq(g.max[0]-g.min[0],150,id+' actual width');eq(g.max[2]-g.min[2],150,id+' actual depth');
   let surface=f.elevationMm||0;
   if(f.assignedShowerId){
    const trays=actual.furniture[f.assignedShowerId]?.meshes.filter(m=>m.role==='shower-tray-surface')||[];
    assert.equal(trays.length,1,id+' must have an identifiable unchanged supporting shower tray');surface=trays[0].max[1];
    assert.ok(surface>=50&&surface<55,id+' actual old-tray display datum is nominal 50 mm scaled to its imported envelope');
    assert.equal(g.surfaceDatum?.nominalMm,50);assert.equal(g.surfaceDatum.assignedShowerId,f.assignedShowerId);assert.equal(g.surfaceDatum.displayOnly,true);
    eq(g.surfaceDatum.actualTrayMm,surface,id+' recorded derived datum equals actual tray bounds');
   }else assert.equal(g.surfaceDatum,null,id+' dry-zone fixture must not use a shower-derived offset');
   eq(g.min[1],surface,id+' finished-surface start');eq(g.max[1],surface+4,id+' finished-surface top');
   assert.ok(g.meshes.filter(m=>m.role==='floor-drain-frame').length>=4);assert.ok(g.meshes.some(m=>m.role==='floor-drain-slot-bed'));
   assert.ok(g.meshes.filter(m=>m.role==='floor-drain-grate').length>=10);assert.ok(g.meshes.every(m=>m.clipConstants.length===0),'wall cut must not crop low fixture');
   const rays=await page.evaluate(id=>window.__familyFloorDrainsQA.grateRays(id),id);assert.ok(rays.length>=10);
   for(const ray of rays){assert.equal(ray.fid,id,id+' actual grate is obscured by another object');assert.equal(ray.role,'floor-drain-grate',id+' downward ray should hit visible bar, not shower tray/floor/marker');eq(ray.hitY,ray.barTopMm,id+' exposed grate hit');}
   // Always report the actual opposing solid's bounds. A supporting floor or
   // tray is allowed to touch the cover, never to engulf its dark slot bed.
   const collisions=[];
   for(const [oid,other]of Object.entries(actual.furniture)){
    if(oid===id)continue;
    for(const m of other.meshes)if(m.visible&&overlap(g,m))collisions.push({fid:oid,role:m.role,partId:m.partId,geometry:m.geometry,min:m.min,max:m.max,transparent:m.transparent});
   }
   for(const m of actual.architecture)if(m.visible&&overlap(g,m))collisions.push({fid:'architecture',role:m.role,room:m.roomId,geometry:m.geometry,min:m.min,max:m.max,transparent:m.transparent});
   if(collisions.length)report.geometry={validatedDrains:drains,failedDrain:{id,min:g.min,max:g.max,meshes:g.meshes,collisions}};
   assert.deepEqual(collisions,[],id+' floor drain intersects equipment, glass rails or walls (support floor/tray contact is allowed)');
   drains[id]={min:g.min,max:g.max,nominalDatumMm:f.elevationMm||0,actualFinishedSurfaceMm:surface,surfaceDatum:g.surfaceDatum,roles:[...new Set(g.meshes.map(m=>m.role))],exposedGrateRayCount:rays.length};
  }
  await page.evaluate(()=>window.__familyFloorDrainsQA.camera([7240,2050,10350],[7200,0,10900],1.2));await page.waitForFunction(painted);await shot('family-floor-drains-balcony-tap-and-drain-3d');
  await page.evaluate(()=>window.__familyFloorDrainsQA.camera([5030,2600,3600],[5570,25,4140],1.2));await page.waitForFunction(painted);await shot('family-floor-drains-main-bath-dry-and-shower-3d');
  await page.evaluate(()=>window.__familyFloorDrainsQA.camera([4070,2400,5150],[5410,25,5680],1.2));await page.waitForFunction(painted);await shot('family-floor-drains-guest-bath-dry-and-shower-3d');
  console.log('An explicitly edited shower-cover elevation is not snapped back to its old tray');
  const editedShowerDrain=ids[2],beforeElevation=await snapshot();await page.evaluate(id=>{select({kind:'furn',id});drawer('panel',true);},editedShowerDrain);
  await page.locator('#fZ').fill('100');await page.locator('#fZ').press('Tab');
  await page.waitForFunction(id=>{const g=window.__familyFloorDrainsQA.inspect().furniture[id];return g&&Math.abs(g.min[1]-100)<.6;},editedShowerDrain);
  const elevated=(await inspect()).furniture[editedShowerDrain];eq(elevated.min[1],100,'explicitly edited shower cover bottom remains 100');eq(elevated.max[1],104,'edited cover thickness remains 4');assert.equal(elevated.surfaceDatum,null,'explicitly edited elevation must not retain an automatic tray tag');assert.equal(await page.evaluate(id=>getF(id).elevationMm,editedShowerDrain),100);
  await clickObserved('#undo');await page.waitForFunction(id=>{const g=window.__familyFloorDrainsQA.inspect().furniture[id];return g?.surfaceDatum?.nominalMm===50;},editedShowerDrain);assert.deepEqual((await snapshot()).state,beforeElevation.state,'undo elevation restores exact nominal source state');await page.evaluate(()=>closeDrawers());
  report.geometry={actual68Objects:true,old63CentersAndRotationsExact:true,realFocusControlsCameraOnly:focused,actual150By150By4Fixtures:true,dryFinishSurface0AndShowerActualTrayDatum:true,sourceNominal50Unchanged:true,explicitEditedElevation100NotOverridden:true,frameRecessAndAtLeast10GrateBars:true,allGratesExposedByDownwardRaycast:true,noWallEquipmentOrGlassIntersections:true,legacyNorthernStripsSuppressed:true,drains,triangles:actual.triangles};
  assert.deepEqual(errors,[]);assert.deepEqual(networkFailures,[]);const result={status:'PASS',...report,browserErrors:errors,networkFailures,screenshots};fs.writeFileSync(path.join(out,process.argv.includes('--published-smoke')?'browser-report-smoke.json':'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(e){const result={status:'FAIL',progress:report,error:e.stack||String(e),url:page?.url(),browserErrors:errors,networkFailures};fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure-report.json'),JSON.stringify(result,null,2)+'\n');try{await page?.screenshot({path:path.join(out,'failure.png'),timeout:10000});}catch{}console.error(JSON.stringify(result,null,2));throw e;}finally{await context?.close();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
