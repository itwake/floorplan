'use strict';

// A new isolated browser context only. This test injects a read-only Three.js
// inspector into the local HTTP response; no production file or user draft is
// changed. Test-only camera positioning affects this context's view, not data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),plans=require(path.join(root,'data/house-plans.js'));
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
const base=process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4191';
const out=path.resolve(process.env.FLOORPLAN_SCREEN_SHOTS||path.join(root,'..','方案4_3D预览_20261010'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const eq=(actual,expected,label,tolerance=.15)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} != ${expected}`);
const hook=`window.__screenPlanQA={
  ready:()=>Boolean(inited&&active&&!anim&&!fly&&grow>.999&&furnGrow>.999),
  inspect:()=>{
    if(!inited||!scene)return null;
    scene.updateMatrixWorld(true);
    const record=object=>{
      const b=new THREE.Box3().setFromObject(object),size=b.getSize(new THREE.Vector3());
      return{min:[b.min.x*1000+OX,b.min.y*1000,b.min.z*1000+OY],max:[b.max.x*1000+OX,b.max.y*1000,b.max.z*1000+OY],size:[size.x*1000,size.y*1000,size.z*1000]};
    };
    const meshRecords=group=>{const rows=[];group.traverse(o=>{if(o.isMesh)rows.push({...record(o),geometry:o.geometry.type,role:o.userData.role||null,color:o.material?.color?.getHexString()||null});});return rows;};
    const ids=['scheme4-entry-screen','fit-kitchen-20261005','kitchen_double_sink','kitchen_hob','family-f6','scheme4-living-armchair','family-living-rug'];
    const furniture=Object.fromEntries(ids.map(id=>{
      const g=furnG.children.find(q=>q.userData.fid===id);
      if(!g)return[id,null];
      const forward=new THREE.Vector3(0,0,1).transformDirection(g.matrixWorld);
      return[id,{...record(g),variant:g.userData.modelVariant||null,forward:[forward.x,forward.z],meshes:meshRecords(g)}];
    }));
    const sink=furnG.children.find(g=>g.userData.fid==='kitchen_double_sink'),kitchen=furnG.children.find(g=>g.userData.fid==='fit-kitchen-20261005');
    const bowls=[-1,1].map(sign=>{
      const w=M(getF('kitchen_double_sink').w),d=M(getF('kitchen_double_sink').d),inner=(w-.04-.03)/2;
      const top=sink.localToWorld(new THREE.Vector3(sign*(inner+.03)/2,.45,.04));
      const cast=new THREE.Raycaster(top,new THREE.Vector3(0,-1,0),0,1);
      const own=cast.intersectObject(sink,true)[0],combined=cast.intersectObjects([sink,kitchen],true)[0];
      return{ownHitHeightMm:own?.point.y*1000,combinedHitHeightMm:combined?.point.y*1000,combinedHitsSink:Boolean(combined&&(()=>{let p=combined.object;while(p&&p!==sink)p=p.parent;return p===sink;})())};
    });
    const frame=archUp.children.find(g=>g.userData.modelVariant==='slide-frame-detail'&&g.userData.doorSourceId==='balcony_door');
    const leaves=archUp.children.filter(g=>g.userData.modelVariant==='sliding-leaf'&&g.userData.doorSourceId==='balcony_door');
    return{scheme:SCHEME_ID,active,cut:opt.cut,grow,furnGrow,furniture,bowls,frame:frame?{...record(frame),meshes:meshRecords(frame),nominalOpeningMm:frame.userData.nominalOpeningMm}:null,leaves:leaves.map(record),renderer:{width:renderer.domElement.width,height:renderer.domElement.height,triangles:renderer.info.render.triangles}};
  },
  camera:(position,target,cut=1.2)=>{
    if(!inited)throw Error('3D is not initialized');
    fly=null;opt.cut=cut;syncCutBtns();sync();showLabels(false);opt.labels=false;
    orbit.enableDamping=false;orbit.minDistance=.1;orbit.target.set(wx(target[0]),M(target[1]),wz(target[2]));
    camera.position.set(wx(position[0]),M(position[1]),wz(position[2]));camera.lookAt(orbit.target);orbit.update();renderer.render(scene,camera);
  }
};
`;
const painted=()=>{
  const canvas=document.querySelector('#view3d canvas');if(!canvas?.width)return false;
  const probe=document.createElement('canvas');probe.width=probe.height=64;const g=probe.getContext('2d');g.drawImage(canvas,0,0,64,64);
  const pixels=g.getImageData(0,0,64,64).data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);return colors.size>20;
};

(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const page=await context.newPage();page.setDefaultTimeout(90000);
  const errors=[],warnings=[],screenshots=[];
  page.on('pageerror',error=>errors.push('pageerror: '+error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());else if(message.type()==='warning')warnings.push(message.text());});
  await context.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
  await context.route(`${base}/**`,async route=>{
    if(route.request().resourceType()!=='document')return route.fallback();
    const response=await route.fetch(),html=await response.text();assert.ok(html.includes('window.View3D ='),'Three inspector injection point missing');
    return route.fulfill({response,body:html.replace('window.View3D =',hook+'window.View3D =')});
  });
  const screenshot=async name=>{const file=path.join(out,'screen-browser-'+name+'.png');await page.screenshot({path:file});screenshots.push(file);};
  const canvasScreenshot=async name=>{
    // Expand only this disposable QA page's stage, not the production layout.
    // Render at full viewport size so the deliverable has no editor UI chrome.
    const style=await page.addStyleTag({content:'#stage{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:100!important}#hint3d,#fab,#cross,#walkOverlay,#joy,#walkExit{display:none!important}'});
    await page.waitForFunction(()=>{const c=document.querySelector('#view3d canvas');return c?.width===innerWidth&&c?.height===innerHeight;});
    await page.waitForTimeout(300);await page.waitForFunction(painted);
    const file=path.join(out,'screen-browser-'+name+'-canvas.png');await page.locator('#view3d canvas').screenshot({path:file});screenshots.push(file);
    await style.evaluate(e=>e.remove());
    await page.waitForFunction(()=>{const c=document.querySelector('#view3d canvas'),stage=document.querySelector('#stage');return c?.width===stage?.clientWidth&&c?.height===stage?.clientHeight;});
  };
  const ready=async()=>{await page.waitForFunction(()=>window.__screenPlanQA?.ready());await page.waitForFunction(painted);};
  try{
    await page.goto(`${base}/?scheme=screen`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.HOUSE_PLANS&&state.furniture.length&&window.View3D);
    assert.equal(await page.locator('#schemeSelect').inputValue(),'screen');
    const option=await page.locator('#schemeSelect option[value="screen"]').textContent();assert.match(option,/方案4/);assert.match(option,/屏风/);
    assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('is3d')),false,'ordinary scheme URL should retain default 2D');
    assert.equal(await page.evaluate(()=>document.body.classList.contains('m3d')),false);
    await screenshot('default-2d');
    await page.locator('[data-view="3d"]').click();await ready();
    const actual=await page.evaluate(()=>window.__screenPlanQA.inspect());
    assert.equal(actual.scheme,'screen');assert.equal(actual.active,true);assert.ok(actual.renderer.triangles>1000);assert.ok(actual.renderer.width>100&&actual.renderer.height>100);
    for(const [id,info]of Object.entries(actual.furniture)){
      assert.ok(info,id+': real 3D model missing');assert.ok(info.meshes.length,id+': empty model');
      assert.ok([...info.min,...info.max,...info.size,...info.forward].every(Number.isFinite),id+': non-finite actual transform');
    }
    const separator=actual.furniture['scheme4-entry-screen'],sourceScreen=plans.schemes.screen.defaultFurniture.find(f=>f.id==='scheme4-entry-screen');
    assert.deepEqual(separator.size.map(Math.round),[1500,2000,80]);
    const tall=separator.meshes.filter(m=>m.size[1]>1500),beam=separator.meshes.filter(m=>m.size[0]>1400&&m.size[1]<=41);
    assert.equal(tall.length,sourceScreen.parts.filter(p=>p.role==='screen-vertical-slat').length);assert.ok(tall.length>=10);assert.equal(beam.length,2);
    for(const m of tall){eq(m.size[0],18,'real screen slat thickness');eq(m.size[1],1920,'real screen slat height');assert.ok(m.size[2]<=80.1);}
    assert.ok(!separator.meshes.some(m=>m.size[0]>1000&&m.size[1]>1000),'screen is rendered as an opaque whole block');
    const kitchen=actual.furniture['fit-kitchen-20261005'];
    eq(kitchen.max[1],2350,'upper cabinet actual top');assert.ok(kitchen.meshes.some(m=>m.min[1]>=1499&&m.size[1]>500),'real upper cabinet panels missing');
    assert.ok(!kitchen.meshes.some(m=>m.size[0]>300&&m.size[1]>300&&m.size[2]>300),'old full-depth solid kitchen base still occludes devices');
    const sink=actual.furniture.kitchen_double_sink,hob=actual.furniture.kitchen_hob;
    assert.equal(sink.variant,'recessed-double-bowl');eq(sink.min[1],690,'recessed sink physical bottom');eq(sink.max[1],890,'sink rim/worktop elevation');
    assert.equal(hob.variant,'hob-only');eq(hob.min[1],890,'hob physical base');eq(hob.max[1],940,'hob physical top');
    assert.deepEqual(hob.size.map(Math.round),[750,50,450]);
    for(const [i,bowl]of actual.bowls.entries()){
      assert.ok(bowl.ownHitHeightMm>=689&&bowl.ownHitHeightMm<695,'bowl '+i+' ray is blocked by an opaque rim/top');
      assert.ok(bowl.combinedHitHeightMm>=689&&bowl.combinedHitHeightMm<695&&bowl.combinedHitsSink,'bowl '+i+' countertop or cabinet blocks its hollow interior');
    }
    assert.ok(actual.frame,'balcony frame group missing');eq(actual.frame.min[0],6360,'frame west face');eq(actual.frame.max[0],6480,'frame east face');assert.equal(actual.frame.nominalOpeningMm,1500);
    for(const role of ['head-frame','sill-frame','outside-jamb','upper-track','lower-track'])assert.ok(actual.frame.meshes.some(m=>m.role===role),'real '+role+' missing');
    assert.equal(actual.frame.meshes.filter(m=>m.role==='outside-jamb').length,2);assert.equal(actual.frame.meshes.filter(m=>m.role==='upper-track').length,3);assert.equal(actual.frame.meshes.filter(m=>m.role==='lower-track').length,3);
    assert.equal(actual.leaves.length,3);for(const leaf of actual.leaves){eq(leaf.min[2],10580,'south-stacked leaf north edge');eq(leaf.max[2],11100,'south-stacked leaf south edge');}
    const chair=actual.furniture['scheme4-living-armchair'],sofa=actual.furniture['family-f6'];
    eq(chair.forward[0],1,'armchair faces main sofa to east');eq(chair.forward[1],0,'armchair east orientation');eq(sofa.forward[0],-1,'main sofa faces west');
    const rug=actual.furniture['family-living-rug'];for(const [x,y]of [[5840,6865],[5840,9135]])assert.ok(x>=rug.min[0]&&x<=rug.max[0]&&y>=rug.min[2]&&y<=rug.max[2],'actual rug does not contain modeled sofa front leg');
    await page.locator('[data-cut="1.2"]').click();await page.locator('#vIso').click();await ready();await screenshot('overview-3d');
    await page.evaluate(()=>window.__screenPlanQA.camera([4800,5200,12600],[4750,400,8600],1.2));await page.waitForTimeout(500);await page.waitForFunction(painted);await screenshot('living-3d');await canvasScreenshot('living-3d');
    await page.evaluate(()=>window.__screenPlanQA.camera([10000,10000,17000],[4850,500,10300],1.2));await page.waitForTimeout(500);await page.waitForFunction(painted);await canvasScreenshot('public-area-3d');
    await page.evaluate(()=>window.__screenPlanQA.camera([6000,5200,14400],[7300,850,12550],1.2));await page.waitForTimeout(500);await page.waitForFunction(painted);await screenshot('kitchen-3d');await canvasScreenshot('kitchen-3d');
    // Reload into the public direct-3D URL; it must not depend on the test
    // helper, a saved view mode, or the earlier 3D toggle action.
    await page.goto(`${base}/?scheme=screen&view=3d`,{waitUntil:'networkidle'});await ready();
    assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('is3d')),true,'view=3d did not enter the real 3D canvas');
    assert.equal(await page.locator('#schemeSelect').inputValue(),'screen');
    await screenshot('direct-3d');
    assert.deepEqual(errors,[],'browser JS/console errors');
    console.log(JSON.stringify({status:'PASS',scheme:'screen',default2D:true,direct3D:true,actualWebGLPainted:true,grilleSlats:tall.length,kitchenThinPanels:true,recessedDoubleBowlRayPass:true,hobOnlyBoundsMm:hob.size,balconyFrameBoundsMm:actual.frame,chairFacesEast:true,rugCoversSofaFrontFeet:true,browserErrors:errors,browserWarnings:warnings,screenshots},null,2));
  }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
