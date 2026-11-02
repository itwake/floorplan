'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=createRequire(path.join(runtime,'_performance-qa.cjs'))('playwright');
const baseline=process.argv.includes('--baseline'),base=(process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4194/').replace(/\/?$/,'/'),dir=path.resolve(__dirname,'../../output/performance-20261102');
const inspect=`
window.__performanceQA={
  frame:()=>{if(typeof drawScene==='function')drawScene();else renderer.render(scene,camera);renderer.getContext().finish();},
  settle:key=>{fly=null;grow=furnGrow=1;applyGrow();opt.labels=false;showLabels(false);setCameraFov(key==='study'?76:45);if(key==='study'){camera.position.set(wx(2160),1.540,wz(5010));orbit.target.set(wx(1250),1.330,wz(3380));}else{setPose(isoWhole());}camera.lookAt(orbit.target);scene.updateMatrixWorld(true);if(typeof updateLocalLights==='function')updateLocalLights();if(typeof shadowDirty!=='undefined')shadowDirty=true;cancelAnimationFrame(raf);raf=0;},
  stats:()=>{let rendered=0,sources=0,batches=0,lights=0;scene.traverse(o=>{if(o.isMesh){if(o.layers.test(camera.layers))rendered++;if(o.userData.performanceBatched)sources++;if(o.userData.renderBatch)batches++;}if(o.isLight&&o.visible&&o.intensity>0)lights++;});return{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,rendered,sources,batches,lights,shadowSize:sun.shadow.mapSize.x,pixelRatio:renderer.getPixelRatio(),camera:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov};},
  restart:()=>{if(typeof invalidate==='function')invalidate();else startLoop();},
  moveCamera:()=>{camera.position.x+=.08;orbit.update();},
  door:()=>toggleDoor(doors.find(d=>d.sourceId==='door_c')),
  doorSettled:()=>{const d=doors.find(d=>d.sourceId==='door_c');return Math.abs(d.cur-(d.open?d.a1:d.a0))<=.0001;},
  batchDoorCount:()=>{let bad=0;furnG.traverse(o=>{if(o.userData.door&&o.layers.mask!==1)bad++;});return bad;}
};
`;
(async()=>{fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.FLOORPLAN_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(base.startsWith('http://127.0.0.1'))await page.route(base+'?*',r=>{const html=baseline?execFileSync('git',['show',(process.env.FLOORPLAN_BASELINE_REF||'1e10d10')+':index.html'],{encoding:'utf8',maxBuffer:2000000}):fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');return r.fulfill({contentType:'text/html',body:html.replace('window.View3D = {',inspect+'window.View3D = {')});});
  await page.goto(base+'?scheme=family&view=3d&look=study&v=performance-20261102',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.View3D&&document.querySelector('#referenceViewSelect').value==='study',null,{timeout:180000});
  if(!baseline)await page.waitForFunction(()=>window.View3D.performanceStats().idle,null,{timeout:45000});
  const report={mode:baseline?'before':'after',renderer:'Chrome SwiftShader software renderer, not the owner computer FPS',views:{}};
  for(const view of['study','whole']){
    await page.evaluate(view=>__performanceQA.settle(view),view);
    const samples=await page.evaluate(()=>{__performanceQA.frame();__performanceQA.frame();const samples=[];for(let i=0;i<5;i++){const start=performance.now();__performanceQA.frame();samples.push(+(performance.now()-start).toFixed(2));}return samples;});
    report.views[view]={...await page.evaluate(()=>__performanceQA.stats()),samplesMs:samples};
    await page.screenshot({path:path.join(dir,report.mode+'-'+view+'.png'),timeout:120000});console.log(report.mode,view,JSON.stringify(report.views[view]));
  }
  fs.writeFileSync(path.join(dir,report.mode+'.json'),JSON.stringify(report,null,2));
  if(baseline){assert.deepEqual(errors,[]);return;}
  await page.evaluate(()=>__performanceQA.restart());await page.waitForFunction(()=>View3D.performanceStats().idle);
  const idle=await page.evaluate(()=>View3D.performanceStats());await page.waitForTimeout(700);assert.equal((await page.evaluate(()=>View3D.performanceStats())).frames,idle.frames,'Static view renders zero extra frames');
  await page.evaluate(()=>__performanceQA.moveCamera());await page.waitForFunction(()=>View3D.performanceStats().idle);const moved=await page.evaluate(()=>View3D.performanceStats());assert.ok(moved.frames>idle.frames);assert.equal(moved.shadowUpdates,idle.shadowUpdates,'Camera motion reuses static shadow');
  await page.evaluate(()=>__performanceQA.door());await page.waitForFunction(()=>__performanceQA.doorSettled()&&View3D.performanceStats().idle,null,{timeout:30000});assert.ok((await page.evaluate(()=>View3D.performanceStats())).shadowUpdates>moved.shadowUpdates,'Moving door refreshes shadows');
  assert.equal(await page.evaluate(()=>__performanceQA.batchDoorCount()),0,'Interactive leaves are not frozen in static batches');
  for(const q of['smooth','detail','balanced']){await page.selectOption('#quality3d',q);await page.waitForFunction(q=>View3D.performanceStats().quality===q&&View3D.performanceStats().idle,q,{timeout:60000});const s=await page.evaluate(()=>View3D.performanceStats());assert.ok(s.width*s.height<=(q==='smooth'?900000:q==='balanced'?1800000:4000000)+5000);assert.equal(s.shadowSize,q==='detail'?2048:1024);}
  await page.click('[data-t="night"]');await page.waitForFunction(()=>View3D.performanceStats().idle);assert.ok((await page.evaluate(()=>View3D.performanceStats())).activeLocalLights<=8);
  await page.click('[data-t="night"]');await page.waitForFunction(()=>View3D.performanceStats().idle);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>View3D.performanceStats().initialized&&View3D.performanceStats().idle,null,{timeout:120000});assert.equal(await page.inputValue('#quality3d'),'balanced','Quality saved per browser');
  assert.deepEqual(errors,[]);console.log('PASS on-demand idle, shadow reuse/door refresh, quality/night budgets and preference persistence');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
