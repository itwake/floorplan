'use strict';

// Independent Scheme 2 indoor-unit relocation audit. Physical support in the
// concept model is not structural, condensate, penetration or installation
// approval. Historical hashes are frozen BEFORE the relocation layer exists.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {isDeepStrictEqual}=require('node:util');
const {applyFamilyAcWindow,beforeFamilyAcWindow,REVISION}=require('../tools/family-ac-window-20261012.cjs');
const {sweptLeafHits}=require('./family-bath-review-20261011.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone,tol=.02;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'
  ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Actual `git show 0b2a358:data/house-plans.js`, not freshly generated output.
const baseline=Object.freeze({
  wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
  family:'294dbdde63e7ad6ee9072e844e7d59e5ce4cb6266f87dc8f5739893e7408ff74',
  laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
  screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
  wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
  family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
  laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
  'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const targets=Object.freeze({
  'family-acwall-room_a':{roomId:'room_a',windowId:'window_a',cx:4990,cy:245,foot:{x:4540,y:120,w:900,d:250},ceilingGap:240},
  'family-acwall-room_b':{roomId:'room_b',windowId:'window_b',cx:1870,cy:245,foot:{x:1420,y:120,w:900,d:250},ceilingGap:150},
  'family-acwall-room_c':{roomId:'room_c',windowId:'window_c',cx:620,cy:3465,foot:{x:170,y:3340,w:900,d:250},ceilingGap:150}
});
const ids=Object.keys(targets);
const eq=(a,b,label)=>assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} != ${b}`);
const overlaps2=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>tol&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>tol;
const overlaps3=(a,b)=>overlaps2(a,b)&&Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z)>tol;
const worldRect=f=>{
  const a=(f.rot||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),w=f.w*c+f.d*s,d=f.w*s+f.d*c;
  return{id:f.id,x:f.cx-w/2,y:f.cy-d/2,w,d,z:f.elevationMm||0,h:f.heightMm};
};
const sourceRect=(r,z,h,id)=>({id,x:r[0],y:r[1],w:r[2]-r[0],d:r[3]-r[1],z,h});
const partSolid=(f,p)=>{
  const sx=f.w/(f.baseWidthMm||f.w),sy=f.d/(f.baseDepthMm||f.d),sz=f.heightMm/(f.baseHeightMm||f.heightMm);
  const a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),corners=[];
  for(const x of [p.x*sx,(p.x+p.w)*sx])for(const y of [p.y*sy,(p.y+p.d)*sy])corners.push([f.cx+x*c-y*s,f.cy+x*s+y*c]);
  const xs=corners.map(v=>v[0]),ys=corners.map(v=>v[1]);
  return{id:f.id+'/'+p.id,x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),d:Math.max(...ys)-Math.min(...ys),
    z:(f.elevationMm||0)+p.elevationMm*sz,h:p.heightMm*sz};
};
const solids=f=>f.parts?.length?f.parts.map(p=>partSolid(f,p)):[worldRect(f)];
const within2=(a,b)=>a.x>=b.x-tol&&a.y>=b.y-tol&&a.x+a.w<=b.x+b.w+tol&&a.y+a.d<=b.y+b.d+tol;
const polyBounds=poly=>({x:Math.min(...poly.map(p=>p[0])),y:Math.min(...poly.map(p=>p[1])),
  w:Math.max(...poly.map(p=>p[0]))-Math.min(...poly.map(p=>p[0])),d:Math.max(...poly.map(p=>p[1]))-Math.min(...poly.map(p=>p[1]))});
const changedFields=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>!isDeepStrictEqual(a[k],b[k])).sort();

// Match buildArch's per-opening top wall height, but independently calculate
// the solids and their back-face support. A glazing footprint is not a wall.
function wallTop(plan,r){
  const distance=w=>Math.hypot(Math.max(w[0]-r[2],r[0]-w[2],0),Math.max(w[1]-r[3],r[1]-w[3],0));
  return Math.max(plan.HEIGHT_MM,...plan.WALLS.map((w,i)=>distance(w)<=150?plan.WALL_META[i]?.heightMm||0:0));
}
function archSolids(plan){
  const out=plan.WALLS.map((r,i)=>sourceRect(r,0,plan.WALL_META[i]?.heightMm||plan.HEIGHT_MM,'wall-'+i));
  for(const [i,r]of plan.WINS.entries()){
    const m=plan.WIN_META[i],sill=m.sillMm||0,head=m.headMm;
    if(sill>0)out.push(sourceRect(r,0,sill,m.id+'/sill-wall'));
    if(m.type!=='bay-front'&&head<wallTop(plan,r))out.push(sourceRect(r,head,wallTop(plan,r)-head,m.id+'/head-wall'));
  }
  for(const d of [...plan.DOORS,...plan.SLIDES.filter(d=>!d.surface)]){
    const top=wallTop(plan,d.rect),head=d.heightMm||2100;
    if(top>head)out.push(sourceRect(d.rect,head,top-head,d.id+'/head-wall'));
  }
  for(const b of plan.BAYS){
    for(const [i,r]of b.sideRects.entries())out.push(sourceRect(r,b.returnBottomMm,b.returnHeightMm,b.id+'/return-'+i));
    out.push({...polyBounds(b.poly),z:b.headMm,h:b.slabThicknessMm,id:b.id+'/projecting-top-slab'});
  }
  return out;
}
function supportedOnNorthFace(body,arch){
  return arch.some(q=>Math.abs(q.y+q.d-body.y)<=tol&&body.x>=q.x-tol&&body.x+body.w<=q.x+q.w+tol&&body.z>=q.z-tol&&body.z+body.h<=q.z+q.h+tol);
}
function validateGeometry(plan){
  const arch=archSolids(plan);let fixtureSolids=0,windowChecks=0,doorSweeps=0;
  for(const [id,t]of Object.entries(targets)){
    const f=plan.defaultFurniture.find(q=>q.id===id),body=worldRect(f),room=plan.ROOMS.find(q=>q.id===t.roomId);
    assert.ok(within2(body,polyBounds(room.poly)),`${id}: body outside actual room envelope`);
    assert.ok(body.z>=0&&body.z+body.h<=room.heightMm+tol,`${id}: above room ceiling`);
    assert.ok(supportedOnNorthFace(body,arch),`${id}: complete mounting back has no solid north-wall support`);
    for(const q of arch)assert.ok(!overlaps3(body,q),`${id}: intersects actual ${q.id}`);
    for(const q of plan.defaultFurniture)if(q.id!==id)for(const p of solids(q)){
      fixtureSolids++;assert.ok(!overlaps3(body,p),`${id}: intersects ${p.id}`);
    }
    for(const [i,r]of plan.WINS.entries()){
      const m=plan.WIN_META[i];windowChecks++;
      assert.ok(!overlaps3(body,sourceRect(r,m.sillMm||0,m.heightMm,m.id)),`${id}: blocks ${m.id} opening vertically`);
    }
    for(const d of plan.DOORS){
      doorSweeps++;
      if(body.z<(d.heightMm||2100)&&body.z+body.h>0)assert.ok(!sweptLeafHits(d,body),`${id}: continuous 40 mm ${d.id} swept slab`);
      else assert.ok(body.z>=(d.heightMm||2100),`${id}: failed door-height separation`);
    }
    for(const b of plan.ROOMS.filter(q=>q.bay))if(overlaps2(body,polyBounds(b.poly)))
      assert.ok(body.z+body.h<=(b.sillMm||0)+b.heightMm+tol,`${id}: wrong low projecting bay ceiling`);
  }
  return{fixtureSolids,windowChecks,doorSweeps};
}

function verifyFamilyAcWindow(bundle){
  assert.equal(REVISION,'family-ac-window-20261012');
  assert.equal(bundle.defaultScheme,'family');assert.equal(bundle.unit,'mm');
  const plan=bundle.schemes.family,u=plan.metadata.familyAcWindowUpdate;
  assert.ok(u,'current Scheme 2 window-side AC layer is required');
  assert.equal(u.id,REVISION);assert.equal(u.date,'2026-10-12');assert.equal(u.status,'applied-owner-request-concept');
  for(const k of ['sourceSnapshotsUnchanged','notInstallationApproval','architectureUnchanged','existingCabinetPartsUnchanged',
    'dimensionsAndElevationUnchanged','otherNineAppliancesUnchanged','applianceHistoryUnchanged'])assert.equal(u[k],true,k);
  const old=beforeFamilyAcWindow(plan),oldBundle=beforeFamilyAcWindow(bundle);
  assert.equal(hash(old),baseline.family,'restore complete actual historical HEAD Scheme 2');
  assert.equal(hash(oldBundle.schemes.family),baseline.family,'bundle rollback exact');
  assert.equal(hash(beforeFamilyAcWindow(old)),baseline.family,'rollback inert on historical scheme');
  for(const id of ['wood','laundry','screen']){
    assert.equal(hash(bundle.schemes[id]),baseline[id],`${id}: unrelated scheme changes`);
    assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id],`${id}: reversal changed scheme`);
    assert.equal(bundle.schemes[id].metadata.familyAcWindowUpdate,undefined,`${id}: unauthorized revision`);
  }
  for(const k of Object.keys(bundle))if(k!=='schemes')assert.deepEqual(bundle[k],oldBundle[k],`${k}: bundle field changed`);
  for(const [id,expected]of Object.entries(sourceSnapshotHashes)){
    const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,`${id}: source snapshot changed`);
  }
  assert.equal(plan.defaultFurniture.length,59);assert.equal(old.defaultFurniture.length,59);
  assert.deepEqual(plan.defaultFurniture.map(q=>q.id),old.defaultFurniture.map(q=>q.id),'all IDs and order unchanged');
  assert.deepEqual(u.changedFurnitureIds.slice().sort(),ids.slice().sort());
  for(const k of ['newFurnitureIds','removedFurnitureIds','replacedFurnitureIds'])assert.deepEqual(u[k],[],k);
  assert.deepEqual(u.previousPlanFields,{});assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(q=>q.id));
  assert.deepEqual(u.previousFurniture.map(q=>q.id).sort(),ids.slice().sort());
  for(const q of u.previousFurniture)assert.deepEqual(q,old.defaultFurniture.find(f=>f.id===q.id),'complete prior indoor unit');
  for(const k of Object.keys(plan))if(!['defaultFurniture','metadata'].includes(k))assert.deepEqual(plan[k],old[k],`${k}: architecture changed`);
  assert.deepEqual(Object.keys(plan).sort(),Object.keys(old).sort());
  const allowedMeta=['familyAcWindowUpdate','designCorrections','conditions','converter'];
  assert.deepEqual(Object.keys(plan.metadata).filter(k=>!allowedMeta.includes(k)).sort(),Object.keys(old.metadata).filter(k=>!allowedMeta.includes(k)).sort());
  for(const k of Object.keys(old.metadata))if(!allowedMeta.includes(k))assert.deepEqual(plan.metadata[k],old.metadata[k],`${k}: existing history altered`);
  assert.deepEqual(Object.keys(u.previousMetadataFields).sort(),['conditions','converter','designCorrections']);
  for(const [k,v]of Object.entries(u.previousMetadataFields))assert.deepEqual(v,old.metadata[k]);
  assert.deepEqual(plan.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);
  assert.equal(plan.metadata.designCorrections.length,old.metadata.designCorrections.length+1);
  assert.equal(plan.metadata.designCorrections.at(-1).id,REVISION);
  assert.deepEqual(plan.metadata.designCorrections.at(-1).sourceIds.slice().sort(),ids.slice().sort());
  assert.deepEqual(plan.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);
  assert.equal(plan.metadata.conditions.length,old.metadata.conditions.length+3);
  assert.equal(plan.metadata.converter,old.metadata.converter+' + tools/family-ac-window-20261012.cjs');
  assert.deepEqual(Object.keys(u.migrationFields).sort(),ids.slice().sort());
  const allowedFields=['cx','cy','rot','sourceFootprintMm','notes','conditions','applianceDesign','layoutRevision'];
  for(const before of old.defaultFurniture){
    const f=plan.defaultFurniture.find(q=>q.id===before.id),t=targets[f.id];
    if(!t){assert.deepEqual(f,before,`${f.id}: one of other 56 objects changed`);continue;}
    assert.equal(f.type,'acwall');assert.equal(f.roomId,t.roomId);
    assert.deepEqual([f.cx,f.cy,f.rot,f.w,f.d,f.heightMm,f.elevationMm],[t.cx,t.cy,0,900,250,300,2250],f.id);
    assert.deepEqual(f.sourceFootprintMm,t.foot);assert.equal(f.layoutRevision,REVISION);
    const fields=changedFields(before,f);assert.deepEqual(u.migrationFields[f.id].slice().sort(),fields,`${f.id}: exact migration fields`);
    assert.ok(fields.every(k=>allowedFields.includes(k)),`${f.id}: unauthorized field changed`);
    const restored=clone(f);for(const k of allowedFields){if(Object.hasOwn(before,k))restored[k]=clone(before[k]);else delete restored[k];}
    assert.deepEqual(restored,before,`${f.id}: geometry dimensions and original concepts preserved`);
    for(const k of ['dimensionsMm','bottomMm','topMm','installation','status','notPurchasedModel','notInstallationApproval'])assert.deepEqual(f.applianceDesign[k],before.applianceDesign[k]);
    assert.deepEqual(f.conditions.slice(0,before.conditions.length),before.conditions,'append pending window installation conditions');
    const wp=f.applianceDesign.windowPlacement,body=worldRect(f),room=plan.ROOMS.find(q=>q.id===f.roomId);
    assert.equal(wp.revision,REVISION);assert.equal(wp.windowId,t.windowId);assert.equal(wp.mountingWall,'north');
    assert.equal(wp.status,'concept-location-installation-pending');assert.equal(wp.actualOutdoorUnitAdded,false);assert.equal(wp.actualPipeOrHoleAdded,false);
    assert.deepEqual(wp.bodyRectMm,[body.x,body.y,body.x+body.w,body.y+body.d]);
    eq(room.heightMm-(body.z+body.h),t.ceilingGap,f.id+' indoor roof clearance');eq(wp.topToRoomCeilingMm,t.ceilingGap,'metadata roof');
    assert.match(f.notes,/外机.*穿墙.*排水.*未核/);
    assert.match(f.conditions.join('\n'),/外机.*制冷剂管.*冷凝水.*排水.*电源.*承载/);
    if(f.roomId!=='room_c'){
      const i=plan.WIN_META.findIndex(m=>m.id===t.windowId),meta=plan.WIN_META[i],window=plan.WINS[i],bay=plan.BAYS.find(b=>b.id===t.windowId);
      eq(meta.headMm,2070,'existing bedroom opening head');eq(body.z-meta.headMm,180,'body bottom above opening');
      eq(wp.bodyAboveWindowHeadMm,180,'metadata window gap');eq(body.y,120,'rear against room-side header');eq(body.y+body.d,370,'front stays inside room');
      assert.ok(body.x>=window[0]&&body.x+body.w<=window[2],'body horizontally over intended north opening');
      assert.ok(body.y>Math.max(...bay.poly.map(p=>p[1])),'not crammed into low projecting bay roof');
    }else{
      const westWindow=plan.WIN_META.find(m=>m.id==='window_c');eq(westWindow.headMm,2300,'study west window retained');
      eq(body.x-120,50,'study western wall side clearance');eq(body.y,3340,'study north solid wall');assert.equal(wp.bodyAboveWindowHeadMm,null,'not described as over west glazing');
      eq(before.cx-f.cx,550,'study toward west window corner');
      const candidate=u.rejectedStudyWestWindowCandidate;assert.equal(candidate.applied,false);
      assert.deepEqual([candidate.windowHeadMm,candidate.proposedBottomMm,candidate.proposedTopMm,candidate.bodyAboveWindowHeadMm,candidate.topToRoomCeilingMm,candidate.northWestWallSegmentMm,candidate.unitWidthMm],[2300,2330,2630,30,70,810,900]);
      assert.match(f.conditions.join('\n'),/不是挂在西窗.*已安装/);assert.match(f.conditions.join('\n'),/70mm.*(?:未验证|不采用)/);
    }
  }
  const checks=validateGeometry(plan);
  // Negative controls prohibit interpreting a glass aperture or the lower
  // projecting bay ceiling as a permissible indoor-unit mounting location.
  const noNorthHeader=clone(plan);noNorthHeader.WIN_META.find(m=>m.id==='window_a').type='bay-front';
  assert.throws(()=>validateGeometry(noNorthHeader),/solid north-wall support/,'glazing is not a load-bearing mounting back');
  const intoBay=clone(plan),wrong=intoBay.defaultFurniture.find(f=>f.id==='family-acwall-room_b');wrong.cy=-200;
  assert.throws(()=>validateGeometry(intoBay),/outside actual room|projecting bay ceiling|solid north-wall support/,'low bay ceiling cannot receive indoor unit');
  assert.match(u.conditions.join('\n'),/未新增外机.*孔洞.*管线/);
  assert.match(u.conditions.join('\n'),/不得.*无相交.*安装可行/,'static geometry is not installation approval');
  const originalHash=hash(bundle),historicalHash=hash(oldBundle);
  assert.equal(hash(applyFamilyAcWindow(clone(oldBundle))),originalHash,'exact deterministic reapplication');
  assert.equal(hash(applyFamilyAcWindow(JSON.parse(JSON.stringify(oldBundle)))),originalHash,'serialized draft round-trip');
  assert.equal(hash(beforeFamilyAcWindow(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized rollback');
  assert.equal(hash(oldBundle),historicalHash,'saved historical bundle never mutated');assert.equal(hash(bundle),originalHash,'audit never mutates model');
  assert.throws(()=>applyFamilyAcWindow(clone(bundle)),/already|applied|duplicate/i,'duplicate relocation rejected');
  return{status:'PASS',revision:REVISION,scheme:'family',exactHistoricalHashRestored:true,otherSchemesAndSourceSnapshotsUnchanged:true,
    relocatedExistingUnits:3,other56ObjectsUnchanged:true,dimensionsAnd2250BottomUnchanged:true,actualSolidNorthMountingSupport:true,
    windowAperturesAndProjectingBayRoofsClear:true,exactMigrationFields:true,continuousDoorHeightSeparation:true,...checks,
    deterministicSerializedRoundTrip:true,modelOnly:true,clearancesMm:{bedroomWindowHeadToBody:180,masterToRoof:240,secondaryAndStudyToRoof:150,studyWestSide:50}};
}

module.exports={verifyFamilyAcWindow,beforeFamilyAcWindow,baseline,REVISION};
if(require.main===module)console.log(JSON.stringify(verifyFamilyAcWindow(require(path.join(root,'data/house-plans.js'))),null,2));
