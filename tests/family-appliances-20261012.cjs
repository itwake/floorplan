'use strict';

// Scheme 2 appliance layout only. Bounds prove illustrative model geometry,
// not load capacity, refrigeration sizing, plumbing, electrical or wet-zone
// installation approval. Retained source snapshots are never measurements of
// these new concept appliances.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {applyFamilyAppliances,beforeFamilyAppliances,REVISION}=require('../tools/family-appliances-20261012.cjs');
const {sweptLeafHits}=require('./family-bath-review-20261011.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
// Frozen from `git show fe1a1ca:data/house-plans.js` BEFORE creating the layer.
// Never refresh these values by hashing a new appliance output.
const baseline=Object.freeze({
  wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
  family:'9dd08893f36115f76725d04a797f9e2f6e631dfb0e62e14914331eb180d55a95',
  laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
  screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
  wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
  family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
  laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
  'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const expectedAppliances=Object.freeze({
  'family-acwall-room_a':['acwall','room_a',5650,3095,900,250,300,2250,180],
  'family-acwall-room_b':['acwall','room_b',1570,3095,900,250,300,2250,180],
  'family-acwall-room_c':['acwall','room_c',1170,3465,900,250,300,2250,0],
  'family-living-aircon':['aircon','living',6450,6610,500,380,1800,0,0],
  'family-kitchen-ceilingfan':['ceilingfan','kitchen',7110,12500,300,300,80,2620,0],
  'family-bathheater-bath_1':['bathheater','bath_1',6260,4105,300,600,80,2620,0],
  'family-bathheater-bath_2':['bathheater','bath_2',6260,5595,300,600,80,2620,0],
  'family-sideboard-blender':['blender','living',2295,9450,220,240,460,850,270],
  'family-sideboard-temperaturekettle':['temperaturekettle','living',2285,9790,220,220,300,850,270],
  'family-sideboard-sterilizer':['sterilizer','living',2325,10230,300,300,420,850,270],
  'family-sideboard-healthkettle':['healthkettle','living',2285,10620,220,220,280,850,270],
  'family-sideboard-waterdispenser':['waterdispenser','living',2350,11050,260,350,430,850,270]
});
const tol=.02;
const eq=(a,b,label)=>assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} != ${b}`);
const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>tol&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>tol;
const overlaps3=(a,b)=>overlaps(a,b)&&Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z)>tol;
const worldRect=f=>{
  const a=(f.rot||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),w=f.w*c+f.d*s,d=f.w*s+f.d*c;
  return{x:f.cx-w/2,y:f.cy-d/2,w,d,z:f.elevationMm||0,h:f.heightMm,id:f.id};
};
function partSolid(f,p){
  const sx=f.w/(f.baseWidthMm||f.w),sy=f.d/(f.baseDepthMm||f.d),sz=f.heightMm/(f.baseHeightMm||f.heightMm);
  const a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),corners=[];
  for(const x of [p.x*sx,(p.x+p.w)*sx])for(const y of [p.y*sy,(p.y+p.d)*sy])corners.push([f.cx+x*c-y*s,f.cy+x*s+y*c]);
  const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
  return{id:f.id+'/'+p.id,x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),d:Math.max(...ys)-Math.min(...ys),
    z:(f.elevationMm||0)+p.elevationMm*sz,h:p.heightMm*sz,role:p.role};
}
const solids=f=>f.parts?.length?f.parts.map(p=>partSolid(f,p)):[worldRect(f)];
const pointInPoly=(x,y,poly)=>{
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [xi,yi]=poly[i],[xj,yj]=poly[j];
    if(Math.abs((x-xi)*(yj-yi)-(y-yi)*(xj-xi))<tol&&x>=Math.min(xi,xj)-tol&&x<=Math.max(xi,xj)+tol&&y>=Math.min(yi,yj)-tol&&y<=Math.max(yi,yj)+tol)return true;
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
  }
  return hit;
};
function rectInPoly(q,poly,label){
  const xs=[q.x,q.x+q.w,...poly.map(p=>p[0]).filter(x=>x>q.x&&x<q.x+q.w)].sort((a,b)=>a-b);
  const ys=[q.y,q.y+q.d,...poly.map(p=>p[1]).filter(y=>y>q.y&&y<q.y+q.d)].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++)assert.ok(pointInPoly((xs[i]+xs[i-1])/2,(ys[j]+ys[j-1])/2,poly),`${label}: outside assigned room`);
}
const within=(a,b)=>a.x>=b.x-tol&&a.y>=b.y-tol&&a.x+a.w<=b.x+b.w+tol&&a.y+a.d<=b.y+b.d+tol;
function verifyFamilyAppliances(bundle){
  assert.equal(REVISION,'family-appliances-20261012');
  assert.equal(bundle.defaultScheme,'family');assert.equal(bundle.unit,'mm');
  assert.deepEqual(Object.keys(bundle.schemes).sort(),['family','laundry','screen','wood']);
  for(const [id,expected]of Object.entries(sourceSnapshotHashes)){
    const source=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'),expected,`${id}: retained source file differs from frozen fe1a1ca bytes`);
  }
  const plan=bundle.schemes.family,u=plan.metadata.familyAppliancesUpdate;
  assert.ok(u,'scheme 2 appliance layer must be applied');assert.equal(u.id,REVISION);assert.equal(u.date,'2026-10-12');
  assert.equal(u.status,'applied-owner-request-concept');assert.equal(u.dimensionStatus,'concept-pending-user-model');
  for(const key of ['sourceSnapshotsUnchanged','notPurchasedModels','notInstallationApproval','architectureUnchanged','existingFurnitureUnchanged','existingCabinetPartsUnchanged'])assert.equal(u[key],true,`${key}: explicit concept-only scope`);
  const old=beforeFamilyAppliances(plan),oldBundle=beforeFamilyAppliances(bundle);
  assert.equal(hash(old),baseline.family,'reversal must restore the full fe1a1ca scheme including order and metadata');
  assert.equal(hash(beforeFamilyAppliances(old)),baseline.family,'reversal must be inert on old snapshot');
  assert.equal(hash(oldBundle.schemes.family),baseline.family,'full bundle reversal must restore old family');
  for(const id of ['wood','laundry','screen']){
    assert.equal(hash(bundle.schemes[id]),baseline[id],`${id}: unrelated scheme changed`);
    assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id],`${id}: reversal changed unrelated scheme`);
    assert.equal(bundle.schemes[id].metadata.familyAppliancesUpdate,undefined,`${id}: unauthorized appliance layer`);
  }
  for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key],`${key}: bundle field must remain exact`);
  const oldIds=old.defaultFurniture.map(f=>f.id),newObjects=plan.defaultFurniture.filter(f=>!oldIds.includes(f.id));
  assert.equal(oldIds.length,47,'frozen historical family count');assert.equal(plan.defaultFurniture.length,59,'add exactly twelve appliances');
  assert.equal(newObjects.length,12);assert.equal(new Set(plan.defaultFurniture.map(f=>f.id)).size,59,'unique editable objects');
  assert.deepEqual(newObjects.map(f=>f.id).sort(),u.newFurnitureIds.slice().sort(),'metadata must enumerate exact twelve additions');
  assert.deepEqual(newObjects.map(f=>f.id).sort(),Object.keys(expectedAppliances).sort(),'exact standalone appliance IDs');
  assert.deepEqual(plan.defaultFurniture.filter(f=>oldIds.includes(f.id)).map(f=>f.id),oldIds,'old objects retain their exact order');
  assert.deepEqual(plan.defaultFurniture.slice(0,47),old.defaultFurniture,'all old appliances, cabinet panels, sockets, decor and lighting remain byte-value exact');
  for(const key of ['changedFurnitureIds','removedFurnitureIds','replacedFurnitureIds','previousFurniture'])assert.deepEqual(u[key],[],`${key}: additions only`);
  assert.deepEqual(u.migrationFields,{});assert.deepEqual(u.previousPlanFields,{});
  assert.deepEqual(u.previousFurnitureOrder,oldIds,'exact order saved for rollback');
  for(const key of Object.keys(old))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(plan[key],old[key],`${key}: walls, doors, rooms, windows and source architecture must remain exact`);
  assert.deepEqual(Object.keys(plan).sort(),Object.keys(old).sort(),'no top-level model expansion');
  assert.deepEqual(plan.metadata.source,old.metadata.source,'source SHA and origin facts must not change');
  const changedMetadataKeys=['designCorrections','conditions','converter','familyAppliancesUpdate'];
  assert.deepEqual(Object.keys(plan.metadata).filter(k=>!changedMetadataKeys.includes(k)).sort(),Object.keys(old.metadata).filter(k=>!changedMetadataKeys.includes(k)).sort(),'no new unrelated metadata');
  for(const key of Object.keys(old.metadata))if(!changedMetadataKeys.includes(key))assert.deepEqual(plan.metadata[key],old.metadata[key],`${key}: previous confirmed history must remain exact`);
  assert.deepEqual(Object.keys(u.previousMetadataFields).sort(),['conditions','converter','designCorrections']);
  for(const key of Object.keys(u.previousMetadataFields))assert.deepEqual(u.previousMetadataFields[key],old.metadata[key],`${key}: exact rollback snapshot`);
  assert.deepEqual(plan.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections,'append correction without rewriting earlier approvals');
  assert.equal(plan.metadata.designCorrections.length,old.metadata.designCorrections.length+1);
  assert.equal(plan.metadata.designCorrections.at(-1).id,REVISION);
  assert.deepEqual(plan.metadata.designCorrections.at(-1).sourceIds,u.newFurnitureIds);
  assert.deepEqual(plan.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions,'only append appliance conditions');
  assert.equal(plan.metadata.conditions.length,old.metadata.conditions.length+4);
  assert.equal(plan.metadata.converter,old.metadata.converter+' + tools/family-appliances-20261012.cjs');

  for(const f of newObjects){
    assert.deepEqual(['type','roomId','cx','cy','w','d','heightMm','elevationMm','rot'].map(k=>f[k]),expectedAppliances[f.id],`${f.id}: intended editable concept geometry`);
    assert.equal(f.modelVariant,'appliance-concept');assert.equal(f.layoutRevision,REVISION);
    assert.equal(f.dimensionStatus,'concept-pending-user-model');assert.equal(f.applianceDesign.revision,REVISION);
    assert.equal(f.applianceDesign.status,'concept-pending-user-model');assert.equal(f.applianceDesign.notPurchasedModel,true);assert.equal(f.applianceDesign.notInstallationApproval,true);
    assert.deepEqual(f.applianceDesign.dimensionsMm,[f.w,f.d,f.heightMm]);eq(f.applianceDesign.bottomMm,f.elevationMm,f.id+' metadata bottom');eq(f.applianceDesign.topMm,f.elevationMm+f.heightMm,f.id+' metadata top');
    const r=worldRect(f);for(const key of ['x','y','w','d'])eq(r[key],f.sourceFootprintMm[key],`${f.id}: source footprint ${key}`);
    assert.match(f.name,/暂估/);assert.match(f.notes,/实物.*现场.*复核/);
    const conditions=f.conditions.join('\n');assert.match(conditions,/未核|待核|待.*确认|待.*核对|必须.*现场确认/);
    assert.ok(!f.purchasedProductId&&!f.measuredProduct,'no concept appliance may be represented as an already purchased/measured product');
  }

  const typeCounts=Object.fromEntries([...new Set(newObjects.map(f=>f.type))].sort().map(t=>[t,newObjects.filter(f=>f.type===t).length]));
  assert.deepEqual(typeCounts,{acwall:3,aircon:1,bathheater:2,blender:1,ceilingfan:1,healthkettle:1,sterilizer:1,temperaturekettle:1,waterdispenser:1});
  const roomForType={aircon:['living'],ceilingfan:['kitchen'],bathheater:['bath_1','bath_2'],acwall:['room_a','room_b','room_c']};
  for(const [type,expected] of Object.entries(roomForType))assert.deepEqual(newObjects.filter(f=>f.type===type).map(f=>f.roomId).sort(),expected.slice().sort(),`${type}: exact intended rooms`);
  const countertopObjects=newObjects.filter(f=>['blender','temperaturekettle','sterilizer','healthkettle','waterdispenser'].includes(f.type));
  const sideboard=plan.defaultFurniture.find(f=>f.id==='fit-dining_sideboard_wall');
  const counters=sideboard.parts.filter(p=>p.role==='wood-countertop').map(p=>partSolid(sideboard,p));
  assert.ok(counters.length>=3,'retained real L-counter panels required');
  assert.deepEqual(u.counter.existingPartsRemoved,[],'no structural or decor part removed');
  const socket=sideboard.parts.find(p=>p.role==='socket-rail');assert.ok(socket,'existing real socket rail retained');
  assert.equal(socket.socketCount,3,'three existing sockets are not silently upgraded to serve five appliances');
  for(const f of countertopObjects){
    assert.equal(f.roomId,'living');eq(f.elevationMm,850,`${f.id}: sits on actual 850 mm surface`);
    const body=worldRect(f);assert.ok(counters.some(p=>within(body,p)&&Math.abs(p.z+p.h-body.z)<=tol),`${f.id}: complete body unsupported by an actual counter panel`);
    assert.equal(f.rot,270,`${f.id}: local front rotates east to the hall, not into the western wall`);
    assert.equal(f.frontDirection,'east');
    assert.equal(f.supportFurnitureId,sideboard.id);assert.equal(f.supportPartId,'reference-west-central-countertop');
    assert.equal(f.applianceDesign.openingAndSteamClearanceStatus,'pending-actual-product');
    eq(f.applianceDesign.aboveBodyToLowestLedMm,1496-850-f.heightMm,f.id+' actual modeled light clearance');
    eq(f.applianceDesign.behindBodyToNicheBackMm,32,f.id+' illustrative back space');eq(f.applianceDesign.behindBodyToSocketRailMm,22,f.id+' socket-body gap only');
    const conditions=f.conditions.join('\n');assert.match(conditions,/开盖.*蒸汽.*防潮.*待/);assert.match(conditions,/不默认同时.*不默认共用插排/);assert.match(conditions,/插座数量.*回路负荷.*接地/);
  }
  const sterile=countertopObjects.find(f=>f.type==='sterilizer');assert.match(sterile.conditions.join('\n'),/未模拟.*开启.*蒸汽/);assert.match(sterile.conditions.join('\n'),/不作可运行结论/);
  const railSolid=partSolid(sideboard,socket),niche=sideboard.parts.find(p=>p.role==='niche-back'&&p.id==='reference-west-central-niche-back'),nicheSolid=partSolid(sideboard,niche);
  for(const f of countertopObjects){eq(worldRect(f).x-(nicheSolid.x+nicheSolid.w),32,f.id+' geometry back-body');eq(worldRect(f).x-(railSolid.x+railSolid.w),22,f.id+' geometry rail-body');}
  const farSouth=Math.max(...countertopObjects.map(f=>worldRect(f).y+worldRect(f).d));eq(12730-farSouth,1550,'remaining continuous south prep counter');
  const dispenser=worldRect(countertopObjects.find(f=>f.type==='waterdispenser'));eq(2525-(dispenser.x+dispenser.w),0,'deepest appliance finishes flush, no unsupported cantilever');
  assert.match(u.conditions.join('\n'),/不得默认可悬挑/);

  const tower=worldRect(newObjects.find(f=>f.type==='aircon')),tv=worldRect(plan.defaultFurniture.find(f=>f.id==='family-f7'));
  eq(tower.x-(tv.x+tv.w),50,'TV east end to tower static body');eq(6750-(tower.x+tower.w),50,'tower to east wall static body');
  assert.match(newObjects.find(f=>f.type==='aircon').conditions.join('\n'),/50mm.*非厂家要求/,'50 mm geometric gap is not an installation specification');
  for(const f of newObjects.filter(f=>f.type==='acwall')){
    eq(f.elevationMm,2250,f.id+' wall installation bottom');eq(f.elevationMm+f.heightMm,2550,f.id+' wall installation top');
    assert.match(f.conditions.join('\n'),/外机.*制冷剂管.*冷凝水.*排水.*独立电源.*承载/);
  }
  for(const f of newObjects.filter(f=>['bathheater','ceilingfan'].includes(f.type))){
    const room=plan.ROOMS.find(r=>r.id===f.roomId);eq(f.elevationMm+f.heightMm,room.heightMm,f.id+' visible ceiling datum');
    assert.equal(f.applianceDesign.installation,'ceiling-panel');assert.match(f.conditions.join('\n'),/吊顶.*(?:深度|机体)/);
    if(f.type==='bathheater'){
      const shower=plan.defaultFurniture.find(q=>q.id===(f.roomId==='bath_1'?'family-f12':'family-f15'));assert.ok(within(worldRect(f),worldRect(shower)),`${f.id}: heater panel must lie above actual shower footprint`);
      assert.match(f.conditions.join('\n'),/防护等级.*安装禁区.*排风.*漏电保护.*电源/);assert.match(f.conditions.join('\n'),/不构成安装批准/);
    }
  }

  // Every new concept body must occupy its intended room and stay within the
  // modeled floor/ceiling. Ceiling fixtures touch the ceiling, not above it.
  let checkedParts=0,checkedDoorSweeps=0,checkedWindows=0;
  for(const f of newObjects){
    const body=worldRect(f),room=plan.ROOMS.find(r=>r.id===f.roomId);assert.ok(room,`${f.id}: known assigned room required`);
    assert.ok([f.cx,f.cy,f.w,f.d,f.rot,f.heightMm,f.elevationMm].every(Number.isFinite),`${f.id}: native editable dimensions`);
    assert.ok(f.w>0&&f.d>0&&f.heightMm>0);assert.ok(body.z>=0&&body.z+body.h<=(room.heightMm||plan.HEIGHT_MM)+tol,`${f.id}: outside modeled vertical room envelope`);
    rectInPoly(body,room.poly,f.id);
    for(const p of solids(f)){
      assert.ok(within(p,body)&&p.z>=body.z-tol&&p.z+p.h<=body.z+body.h+tol,`${p.id}: real mesh part outside concept body`);checkedParts++;
      for(const fixture of plan.defaultFurniture)if(fixture.id!==f.id)for(const q of solids(fixture))assert.ok(!overlaps3(p,q),`${p.id}: intersects ${q.id}`);
      for(const [i,w]of plan.WALLS.entries()){
        const wall={x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1],z:0,h:plan.WALL_META[i]?.heightMm||plan.HEIGHT_MM};
        assert.ok(!overlaps3(p,wall),`${p.id}: wall ${i} collision`);
      }
      for(const door of plan.DOORS)if(p.z<door.heightMm&&p.z+p.h>0){checkedDoorSweeps++;assert.ok(!sweptLeafHits(door,p),`${p.id}: continuous full-thickness ${door.id} sweep collision`);}
      for(const [i,w]of plan.WINS.entries()){
        const meta=plan.WIN_META[i];assert.ok(meta,'window metadata alignment');
        const opening={x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1],z:meta.sillMm||0,h:meta.heightMm};
        checkedWindows++;assert.ok(!overlaps3(p,opening),`${p.id}: obstructs original window ${meta.id}`);
      }
    }
  }
  const originalHash=hash(bundle),historicalHash=hash(oldBundle);
  assert.equal(hash(applyFamilyAppliances(clone(oldBundle))),originalHash,'full rollback/reapply must be deterministic');
  assert.equal(hash(oldBundle),historicalHash,'reapply must not mutate old bundle');assert.equal(hash(bundle),originalHash,'audit must not mutate current model');
  assert.throws(()=>applyFamilyAppliances(clone(bundle)),/already|applied|duplicate/i,'duplicate layer rejected');
  return{status:'PASS',revision:REVISION,scheme:'family',historicalHashRestored:true,otherSchemesUnchanged:true,
    newEditableAppliances:12,typeCounts,actual850mmCounterSupport:true,newBodiesWithinRooms:true,
    realSolidCollisionsChecked:true,checkedParts,checkedDoorSweeps,checkedWindows,deterministicRoundTrip:true,modelOnly:true};
}

module.exports={verifyFamilyAppliances,beforeFamilyAppliances,baseline,REVISION};
if(require.main===module)console.log(JSON.stringify(verifyFamilyAppliances(require(path.join(root,'data/house-plans.js'))),null,2));
