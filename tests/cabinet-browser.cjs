'use strict';
// New browser context only: no user draft, account, or production data writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.FLOORPLAN_NODE_MODULES||'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(runtime,'_floorplan-qa.cjs'))('playwright'));}
const revision='cream-oak-functional-v1',base=process.env.FLOORPLAN_BASE_URL||'http://127.0.0.1:4190';
const out=path.resolve(process.env.FLOORPLAN_CABINET_SHOTS||path.join(__dirname,'..','..','qa-cabinets-20261008'));
const executablePath=process.env.FLOORPLAN_CHROME||[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const timeout=60000;
const painted=()=>{
  const cv=document.querySelector('#view3d canvas');if(!cv?.width)return false;
  const probe=document.createElement('canvas');probe.width=64;probe.height=64;
  const g=probe.getContext('2d');g.drawImage(cv,0,0,64,64);
  const d=g.getImageData(0,0,64,64).data,colors=new Set();for(let i=0;i<d.length;i+=4)colors.add((d[i]<<16)|(d[i+1]<<8)|d[i+2]);
  return colors.size>20;
};
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
  page.setDefaultTimeout(timeout);page.on('dialog',d=>d.accept());const errors=[],report=[],screenshots=[];
  page.on('pageerror',e=>errors.push(e.message));
  const menu=async selector=>{if(!await page.locator('details.menu').evaluate(e=>e.open))await page.locator('details.menu > summary').click();await page.locator(selector).click();};
  const open=async id=>{await page.goto(`${base}/?scheme=${id}`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HOUSE_PLANS&&state.furniture.length);};
  try{
    for(const scheme of (process.argv.includes('--shots-only')?[]:['family','wood','laundry'])){
      await open(scheme);
      const expected=await page.evaluate(()=>{
        const old=structuredClone(defaultState()),f=old.furniture.find(f=>f.id==='fit-dining_sideboard_wall');
        if(!f.cabinetDesign)throw Error('New cabinet bundle not loaded');
        f.cx+=123;f.cy+=77;f.w+=30;f.d-=80;f.rot=15;f.heightMm-=100;f.name='QA 自定义餐边柜';f.color='#668899';
        delete f.cabinetRevision;delete f.cabinetDesign;
        f.parts=[{id:'qa-legacy-solid',role:'sideboard_base',x:-f.baseWidthMm/2,y:-f.baseDepthMm/2,w:f.baseWidthMm,d:f.baseDepthMm,elevationMm:0,heightMm:f.heightMm,color:'#c8a77e'}];
        const clone=structuredClone(f);clone.id='qa-custom-cabinet-copy';clone.cx+=400;clone.name='QA 不匹配 ID 的复制柜';old.furniture.push(clone);
        const native=old.furniture.find(p=>p.cabinetRevision&&/衣柜/.test(p.name));
        if(native){native.type='wardrobe';native.cx+=42;native.color='#557766';delete native.parts;delete native.baseWidthMm;delete native.baseDepthMm;delete native.baseHeightMm;delete native.cabinetRevision;delete native.cabinetDesign;}
        old.furniture=old.furniture.filter(p=>p.id!=='fit-entry_shoe_station');
        old.measures=[{id:'qa-measure',a:{x:10,y:20},b:{x:1010,y:20}}];
        old.rooms.living.mat='terrazzo';
        localStorage.setItem(STORE,JSON.stringify(old));
        return {f:structuredClone(f),clone:structuredClone(clone),native:native&&structuredClone(native),measure:old.measures[0]};
      });
      await page.reload({waitUntil:'networkidle'});
      const migrated=await page.evaluate(()=>({f:structuredClone(getF('fit-dining_sideboard_wall')),copy:structuredClone(getF('qa-custom-cabinet-copy')),deleted:Boolean(getF('fit-entry_shoe_station')),measures:structuredClone(state.measures),room:state.rooms.living.mat}));
      for(const k of ['cx','cy','w','d','rot','color','heightMm','name'])assert.deepEqual(migrated.f[k],expected.f[k],scheme+': migration changed user '+k);
      assert.equal(migrated.f.cabinetRevision,revision);assert.equal(migrated.f.cabinetDesign.revision,revision);
      assert.ok(!migrated.f.parts.some(p=>p.id==='qa-legacy-solid'),scheme+': legacy solid not replaced');
      assert.equal(migrated.deleted,false,scheme+': removed shoe cabinet resurrected');
      assert.deepEqual(migrated.copy,expected.clone,scheme+': unmatched copy unexpectedly redesigned');
      if(expected.native){
        const native=await page.evaluate(id=>structuredClone(getF(id)),expected.native.id);
        assert.equal(native.type,'fixture',scheme+': old generic wardrobe not upgraded');
        for(const k of ['cx','cy','w','d','rot','color','heightMm','name'])assert.deepEqual(native[k],expected.native[k],scheme+': native migration lost '+k);
        assert.equal(native.cabinetRevision,revision);assert.ok(native.parts.length);
      }
      assert.deepEqual(migrated.measures,[expected.measure]);assert.equal(migrated.room,'terrazzo');
      await page.evaluate(()=>save());await page.reload({waitUntil:'networkidle'});
      assert.equal(await page.evaluate(()=>getF('fit-dining_sideboard_wall').name),'QA 自定义餐边柜');
      const [download]=await Promise.all([page.waitForEvent('download'),menu('#exportJson')]);
      const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
      assert.equal(exported.furniture.find(f=>f.id==='fit-dining_sideboard_wall').cabinetRevision,revision);
      await menu('#reset');
      assert.equal(await page.evaluate(()=>getF('fit-dining_sideboard_wall').cabinetRevision),revision);
      assert.ok(await page.evaluate(()=>getF('fit-entry_shoe_station')));
      assert.equal(await page.evaluate(()=>getF('qa-custom-cabinet-copy')),undefined);
      report.push({scheme,migrationPreservesUserEdits:true,deletedNotRestored:true,copyUnchanged:true,exportAndReset:true});
    }
    await open('family');
    await page.locator('[data-cabinet="fit-entry_shoe_station"]').click();
    const original=await page.evaluate(()=>structuredClone(getF(ui.sel.id)));
    await page.locator('#aDup').click();
    const copiedId=await page.evaluate(()=>ui.sel.id);assert.notEqual(copiedId,original.id);
    await page.locator('#fW').fill(String(original.w+30));await page.locator('#fW').press('Tab');
    await page.locator('#fH').fill(String(original.heightMm-100));await page.locator('#fH').press('Tab');
    const resizedCopy=await page.evaluate(()=>structuredClone(getF(ui.sel.id)));
    assert.equal(resizedCopy.w,original.w+30);assert.equal(resizedCopy.heightMm,original.heightMm-100);
    assert.equal(resizedCopy.cabinetRevision,revision);assert.equal(resizedCopy.baseHeightMm,original.baseHeightMm);
    assert.deepEqual(resizedCopy.parts.map(p=>p.color),original.parts.map(p=>p.color),'copy lost milk-white/wood material palette');
    const copySVG=await page.evaluate(()=>cabinetElevationSVG(getF(ui.sel.id),getF(ui.sel.id).cabinetDesign.faces[0]));
    assert.ok(copySVG.toLowerCase().includes('#cdb594'),'new cabinet copy lost wood color in elevation');
    await menu('#reset');
    await page.evaluate(()=>select(null));
    const two=path.join(out,'family-cabinet-2d.png');await page.screenshot({path:two});screenshots.push(two);
    await page.locator('[data-cabinet="fit-entry_shoe_station"]').click();
    const elevation=page.locator('details.cabinet-elevation').first();
    if(!await elevation.evaluate(e=>e.open))await elevation.locator('summary').click();
    await elevation.locator('svg').waitFor({state:'visible'});
    assert.ok(await elevation.locator('svg').evaluate(e=>e.getAttribute('viewBox')&&e.querySelectorAll('rect').length>3),'SVG elevation must contain actual cabinet panels');
    const svgShot=path.join(out,'shoe-station-svg-elevation.png');await elevation.locator('svg').screenshot({path:svgShot});screenshots.push(svgShot);
    const [elevationDownload]=await Promise.all([page.waitForEvent('download'),page.locator('[data-cabinet-face]').first().click()]);
    const elevationXML=fs.readFileSync(await elevationDownload.path(),'utf8');
    assert.equal(await page.evaluate(xml=>new DOMParser().parseFromString(xml,'image/svg+xml').getElementsByTagName('parsererror').length,elevationXML),0,'downloaded elevation is invalid SVG');
    assert.ok(elevationXML.includes('viewBox')&&elevationXML.includes('xmlns'),'SVG download lacks dimensions/namespace');
    await page.waitForFunction(()=>typeof window.View3D?.enter==='function');await page.locator('#viewCabinet3d').click();
    await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is3d')&&!document.querySelector('#stage').classList.contains('animating'));
    await page.waitForTimeout(3000);await page.waitForFunction(painted);
    const shoeUI=path.join(out,'shoe-station-ui-3d-elevation.png');await page.screenshot({path:shoeUI});screenshots.push(shoeUI);
    await page.locator('#vIso').click();await page.waitForTimeout(1500);await page.waitForFunction(painted);
    const full=path.join(out,'family-cabinet-3d.png');await page.screenshot({path:full});screenshots.push(full);
    if(await page.evaluate(()=>typeof window.View3D.flyToFurniture==='function')){
      for(const id of ['fit-entry_shoe_station','fit-dining_sideboard_wall']){
        await page.evaluate(id=>window.View3D.flyToFurniture(id),id);await page.waitForTimeout(3000);await page.waitForFunction(painted);
        const file=path.join(out,`${id}-elevation.png`);await page.screenshot({path:file});screenshots.push(file);
      }
      const tv=await page.evaluate(()=>state.furniture.find(f=>f.cabinetRevision&&/电视|TV/.test(f.name))?.id);
      if(tv){await page.evaluate(id=>window.View3D.flyToFurniture(id),tv);await page.waitForTimeout(1500);await page.waitForFunction(painted);const file=path.join(out,'tv-storage-elevation.png');await page.screenshot({path:file});screenshots.push(file);}
    }
    assert.equal(errors.length,0,errors.join('\n'));
    console.log(JSON.stringify({status:'PASS',revision,schemes:report,actual3DVisible:true,cabinetViewUI:true,elevationSVGAndDownload:true,browserErrors:errors,screenshots},null,2));
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
