'use strict';

// Freeze the complete previously published plan independently of this layer.
// This is a local cabinet conversion, not a new room or a restored old store.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyCornerStorage,beforeFamilyCornerStorage,REVISION}=require('../tools/family-corner-storage-20261012.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// git show 429165188229596fe7814848cf7df6e9b1fd73d4:data/house-plans.js
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'fa5552edde11add6a446494bdcede7ce5edad6e8ab4af96ea1a35c18eca239f6',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const cabinetId='fit-dining_sideboard_wall';
const archKeys=['ROOMS','WALLS','WINS','WIN_META','DOORS','SLIDES','BAYS'];
const preservedPartPrefixes=['reference-west-round-','reference-west-display-','reference-west-narrow-tall-','reference-west-central-'];
const worldPart=(f,p)=>({id:p.id,role:p.role,x:f.cx+p.x,y:f.cy+p.y,z:(f.elevationMm||0)+p.elevationMm,w:p.w,d:p.d,h:p.heightMm});
const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.6&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>.6&&Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z)>.6;
const positiveArea=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.6&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>.6;
const intersect=(a,b)=>({x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),w:Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),d:Math.max(0,Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y))});
const inL=(b)=>{const west={x:2125,y:12730,w:400,d:1160},south={x:2525,y:13490,w:800,d:400};const a=intersect(b,west),c=intersect(b,south);return Math.abs(a.w*a.d+c.w*c.d-b.w*b.d)<.6;};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
function polygonOverlap(a,b){for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],v=[-(q[1]-p[1]),q[0]-p[0]],length=Math.hypot(...v),n=v.map(x=>x/length),ap=a.map(p=>dot(p,n)),bp=b.map(p=>dot(p,n));if(Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp))<=.6)return false;}return true;}
function doorPolygon(f,p,t){const v=p.cabinetDoor,c=v.closedDirection,o=v.openDirection,start=Math.atan2(c[1],c[0]),end=Math.atan2(o[1],o[0]);let delta=end-start;while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;const a=start+delta*t,d=[Math.cos(a),Math.sin(a)],n=[-d[1],d[0]],h=[f.cx+v.hingeMm[0],f.cy+v.hingeMm[1]],th=(v.thicknessMm||18)/2,offset=v.normalOffsetMm||0;return[[0,offset-th],[v.lengthMm,offset-th],[v.lengthMm,offset+th],[0,offset+th]].map(([s,r])=>[h[0]+d[0]*s+n[0]*r,h[1]+d[1]*s+n[1]*r]);}
function handlePolygon(f,p,t){const v=p.cabinetDoor,c=v.closedDirection,o=v.openDirection,start=Math.atan2(c[1],c[0]),end=Math.atan2(o[1],o[0]);let delta=end-start;while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;const a=start+delta*t,d=[Math.cos(a),Math.sin(a)],n=[-d[1],d[0]],h=[f.cx+v.hingeMm[0],f.cy+v.hingeMm[1]],s=v.lengthMm-(v.handleInsetMm||42),recessed=v.handleStyle==='recessed',halfAlong=recessed?3.5:12,halfNormal=recessed?.15:11,r=(v.normalOffsetMm||0)+(v.frontSign||1)*((v.thicknessMm||18)/2+(recessed?.15:12));return[[s-halfAlong,r-halfNormal],[s+halfAlong,r-halfNormal],[s+halfAlong,r+halfNormal],[s-halfAlong,r+halfNormal]].map(([s,r])=>[h[0]+d[0]*s+n[0]*r,h[1]+d[1]*s+n[1]*r]);}
const rectPolygon=b=>[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.d],[b.x,b.y+b.d]];
const furniturePolygon=f=>{const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,y])=>[f.cx+x*c-y*s,f.cy+x*s+y*c]);};
function auditCornerDoorSweeps(plan,cabinet){
 const panels=cabinet.parts.filter(p=>p.cabinetDoor),west=panels.find(p=>p.cabinetDoor.group==='west'&&p.elevationMm<100),south=panels.find(p=>p.cabinetDoor.group==='south'&&p.elevationMm<100),fixed=cabinet.parts.filter(p=>!p.cabinetDoor).map(p=>worldPart(cabinet,p));
 let wrongConcurrentCollisions=0;
 for(let step=0;step<=360;step++){
  const progress=step/360,wf=Math.min(progress*2,1),sf=Math.max(progress*2-1,0);
  assert.equal(polygonOverlap(doorPolygon(cabinet,west,wf),doorPolygon(cabinet,south,sf)),false,'sequential cabinet door collision at '+step);
  assert.equal(polygonOverlap(handlePolygon(cabinet,west,wf),doorPolygon(cabinet,south,sf)),false,'west handle hits south panel at '+step);
  assert.equal(polygonOverlap(doorPolygon(cabinet,west,wf),handlePolygon(cabinet,south,sf)),false,'south handle hits west panel at '+step);
  assert.equal(polygonOverlap(handlePolygon(cabinet,west,wf),handlePolygon(cabinet,south,sf)),false,'paired handles collide at '+step);
  for(const panel of panels){const fraction=panel.cabinetDoor.group==='west'?wf:sf,polygon=doorPolygon(cabinet,panel,fraction),bottom=panel.elevationMm,top=bottom+panel.heightMm;
   for(const part of fixed)if(Math.min(top,part.z+part.h)-Math.max(bottom,part.z)>.6)assert.equal(polygonOverlap(polygon,rectPolygon(part)),false,panel.id+' collides with fixed '+part.id+' at '+step);
   for(const item of plan.defaultFurniture.filter(f=>f.id!==cabinetId)){const z=item.elevationMm||0;if(Math.min(top,z+item.heightMm)-Math.max(bottom,z)>.6)assert.equal(polygonOverlap(polygon,furniturePolygon(item)),false,panel.id+' collides with '+item.id+' at '+step);}
   const handle=handlePolygon(cabinet,panel,fraction),hy=panel.elevationMm+Math.min(panel.heightMm-45,Math.max(45,panel.cabinetDoor.handleElevationMm||Math.min(1050,panel.heightMm/2))),halfH=panel.cabinetDoor.handleStyle==='recessed'?60:12;
   for(const part of fixed)if(Math.min(hy+halfH,part.z+part.h)-Math.max(hy-halfH,part.z)>.6)assert.equal(polygonOverlap(handle,rectPolygon(part)),false,panel.id+' handle collides with fixed '+part.id+' at '+step);
   for(const item of plan.defaultFurniture.filter(f=>f.id!==cabinetId)){const z=item.elevationMm||0;if(Math.min(hy+halfH,z+item.heightMm)-Math.max(hy-halfH,z)>.6)assert.equal(polygonOverlap(handle,furniturePolygon(item)),false,panel.id+' handle collides with '+item.id+' at '+step);}
  }
  if(polygonOverlap(doorPolygon(cabinet,west,progress),doorPolygon(cabinet,south,progress)))wrongConcurrentCollisions++;
 }
 assert.ok(wrongConcurrentCollisions>5,'negative control must catch wrong simultaneous door opening');
 return{samples:361,wrongConcurrentCollisions};
}

function verifyFamilyCornerStorage(bundle){
 assert.equal(REVISION,'family-corner-storage-20261012');
 assert.equal(bundle.defaultScheme,'family');assert.equal(bundle.unit,'mm');
 const p=bundle.schemes.family,u=p.metadata.familyCornerStorageUpdate;
 assert.equal(u?.id,REVISION);assert.equal(u.date,'2026-10-12');
 assert.equal(u.sourceSnapshotsUnchanged,true);assert.equal(u.architectureUnchanged,true);
 assert.deepEqual(u.changedFurnitureIds,[cabinetId]);assert.deepEqual(u.removedFurnitureIds,[]);assert.deepEqual(u.newFurnitureIds,[]);assert.deepEqual(u.replacedFurnitureIds,[]);
 assert.deepEqual(u.preserveCustomSizeIds,[cabinetId],'assembled user-sized cabinet preserved intact');
 assert.deepEqual(u.cornerFootprintPolygonsMm,[[[2125,12730],[2525,12730],[2525,13890],[2125,13890]],[[2525,13490],[3325,13490],[3325,13890],[2525,13890]]],'only existing shallow cabinet arms reused');
 assert.equal(u.grossFootprintMm2,784000);assert.equal(u.depthMm,400);assert.equal(u.walkIn,false);assert.equal(u.notHardwareApproval,true);
 assert.deepEqual(u.remainingReturnRectMm,[3325,13490,3750,13890]);
 const old=beforeFamilyCornerStorage(p),oldBundle=beforeFamilyCornerStorage(bundle);
 assert.equal(hash(old),baseline.family,'exact complete published historical Scheme 2 restored');
 assert.equal(hash(oldBundle.schemes.family),baseline.family,'complete bundle rollback exact');
 assert.equal(hash(beforeFamilyCornerStorage(old)),baseline.family,'rollback absent layer inert');
 for(const key of archKeys)assert.deepEqual(p[key],old[key],key+': unauthorized room, wall, opening or door change');
 assert.equal(old.defaultFurniture.length,60);
 const cabinet=p.defaultFurniture.find(f=>f.id===cabinetId),oldCabinet=old.defaultFurniture.find(f=>f.id===cabinetId);
 assert.ok(cabinet&&oldCabinet,'stable cabinet identity remains available for saved drafts');
 assert.deepEqual(cabinet.cabinetDesign.palette,oldCabinet.cabinetDesign.palette,'existing cream/oak palette unchanged');
 for(const key of ['type','cx','cy','w','d','rot','heightMm','elevationMm','color','baseWidthMm','baseDepthMm','baseHeightMm'])assert.deepEqual(cabinet[key],oldCabinet[key],'overall cabinet envelope changed: '+key);
 assert.deepEqual(p.defaultFurniture.filter(f=>f.id!==cabinetId),old.defaultFurniture.filter(f=>f.id!==cabinetId),'all other 59 objects, positions and ordering unchanged');
 assert.equal(p.defaultFurniture.length,60,'no old independent 800 library or vehicles restored');
 const preserved=part=>preservedPartPrefixes.some(s=>part.id.startsWith(s));
 assert.deepEqual(cabinet.parts.filter(preserved),oldCabinet.parts.filter(preserved),'northern reference facade, niche, drawers, lights and display geometry preserved exactly');
 assert.ok(cabinet.parts.filter(preserved).length>70,'meaningful whole unchanged facade must be tested');
 assert.deepEqual(u.preservedPartIds,cabinet.parts.filter(preserved).map(p=>p.id),'complete unaffected modules listed, not just representative samples');
 assert.ok(!cabinet.parts.some(f=>['d_corner_base','d_corner_upper','reference-upper-blind-bridge'].some(s=>f.id.startsWith(s))),'old blind corner filler cannot remain in new accessible void');
 assert.deepEqual(u.previousFurniture,[oldCabinet],'complete old assembly recoverable');
 assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id));
 const doorParts=cabinet.parts.filter(p=>p.cabinetDoor);
 assert.equal(cabinet.cornerDoorOpen,false,'opaque doors close by default');
 assert.equal(doorParts.length,4,'upper and lower panel on both adjacent faces');
 assert.equal(cabinet.cornerDoorDesign.revision,REVISION);assert.deepEqual(cabinet.cornerDoorDesign.openingSequence,['west','south']);
 assert.deepEqual(cabinet.cornerDoorDesign.partIds.slice().sort(),doorParts.map(p=>p.id).sort());
 const grouped={west:doorParts.filter(p=>p.cabinetDoor.group==='west'),south:doorParts.filter(p=>p.cabinetDoor.group==='south')};
 assert.equal(grouped.west.length,2);assert.equal(grouped.south.length,2);
 for(const group of ['west','south']){
  const ordered=grouped[group].slice().sort((a,b)=>a.elevationMm-b.elevationMm);
  assert.deepEqual(ordered.map(p=>[p.elevationMm,p.heightMm]),[[81.5,2017],[2101.5,597]],group+': segmented reference doors extend to ceiling');
  for(const p of ordered){const b=worldPart(cabinet,p),v=p.cabinetDoor,west=group==='west';
   assert.deepEqual([b.x,b.y,b.w,b.d],west?[2507,12741.5,18,747]:[2526.5,13490,727,18],group+': closed real panel geometry');
   assert.deepEqual(v.hingeMm,west?[2525-cabinet.cx,12741.5-cabinet.cy]:[3253.5-cabinet.cx,13490-cabinet.cy]);
   assert.deepEqual(v.closedDirection,west?[0,1]:[-1,0]);assert.deepEqual(v.openDirection,west?[1,0]:[0,-1]);assert.equal(v.lengthMm,west?747:727);assert.equal(v.thicknessMm,18);assert.equal(v.sequenceOrder,west?0:1);assert.equal(v.normalOffsetMm,west?9:-9);assert.equal(v.handleStyle,'recessed','protruding near-joint knobs collide with other leaf');
  }
 }
 const parts=cabinet.parts.map(p=>worldPart(cabinet,p));
 const cornerParts=parts.filter(p=>positiveArea(p,{x:2125,y:12730,w:1200,d:1160}));
 // Full L-shaped volume is hollow: no square centre post, blind front or
 // lower shelf blocks large items. Real thin perimeter, bottom and top boards
 // are permitted; doors protect the two adjacent faces when closed.
 const largeItemVoid=[{x:2143,y:12748,z:98,w:364,d:723,h:830},{x:2143,y:13508,z:98,w:1164,d:364,h:830}];
 for(const b of largeItemVoid)for(const p of cornerParts)assert.ok(!overlaps(p,b),p.id+': lower large-item bay filled or blocked');
 const innerCorner={x:2489,y:13454,z:98,w:72,d:72,h:2550};
 for(const p of cornerParts)if(!/shelf|top|bottom|plinth|led|door/.test(p.role||''))assert.ok(!overlaps(p,innerCorner),p.id+': forbidden vertical inner-corner post');
 for(const elevation of [950,1350,1750,2100,2400]){
  const shelf=cornerParts.filter(p=>p.role==='corner-shelf'&&Math.abs(p.z-elevation)<.6);
  assert.ok(shelf.length>=2,'L-shaped usable shelf pieces missing at '+elevation);
  for(const p of shelf){assert.equal(p.h,18);assert.ok(inL(p),p.id+': shelf spills into entrance passage');}
  for(let i=0;i<shelf.length;i++)for(let j=i+1;j<shelf.length;j++)assert.equal(overlaps(shelf[i],shelf[j]),false,'shelf pieces must butt, not overlap');
 }
 const sweep=auditCornerDoorSweeps(p,cabinet);
 const protrudingKnobControl=clone(cabinet);for(const panel of protrudingKnobControl.parts.filter(p=>p.cabinetDoor))delete panel.cabinetDoor.handleStyle;
 assert.throws(()=>auditCornerDoorSweeps(p,protrudingKnobControl),/south handle hits west panel/,'negative protruding-knob control must catch early corner conflict');
 assert.ok(!p.defaultFurniture.some(f=>/800.*(车|store)|entry800|entry_storage|bike|stroller/i.test(f.id+' '+f.name)),'old independent storage and vehicle props not restored');
 const allowed=['familyCornerStorageUpdate','conditions','designCorrections','converter'];
 for(const key of Object.keys(old.metadata))if(!allowed.includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'immutable previous revision altered: '+key);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 assert.match(JSON.stringify({notes:cabinet.notes,update:u,design:cabinet.cornerDoorDesign}),/待核|待确认|概念/);
 for(const [id,expected]of Object.entries(sourceSnapshotHashes)){
  const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,id+': source changed');
 }
 for(const id of ['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+': unauthorized scheme changes');assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyCornerStorageUpdate,undefined);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 const currentHash=hash(bundle),historyHash=hash(oldBundle);
 assert.equal(hash(applyFamilyCornerStorage(clone(oldBundle))),currentHash,'deterministic exact reapplication');
 assert.equal(hash(applyFamilyCornerStorage(JSON.parse(JSON.stringify(oldBundle)))),currentHash,'serialized exact reapplication');
 assert.equal(hash(beforeFamilyCornerStorage(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized rollback exact');
 assert.equal(hash(oldBundle),historyHash);assert.equal(hash(bundle),currentHash,'verification must not mutate plans');
 assert.throws(()=>applyFamilyCornerStorage(clone(bundle)),/already|applied|duplicate/i);
 return{status:'PASS',revision:REVISION,scheme:'family',objectsBefore:60,objectsAfter:60,other59ObjectsExact:true,architectureAndOtherSchemesExact:true,sourceSnapshotsExact:true,exactFrozenHistoryRestored:true,preservedFacadeParts:oldCabinet.parts.filter(preserved).length,opaqueClosedDefault:true,fullHeightCornerDoorPanels:4,hollowLowerLVolume:true,noInnerCornerPost:true,shelvesAtMm:[950,1350,1750,2100,2400],sequentialSweepSamples:sweep.samples,fixedBoardsAndOtherFurnitureSweepClear:true,recessedPullsClear:true,negativeProtrudingKnobControlCaught:true,negativeConcurrentCollisionSamples:sweep.wrongConcurrentCollisions};
}

module.exports={verifyFamilyCornerStorage,beforeFamilyCornerStorage,baseline,REVISION,polygonOverlap,doorPolygon,handlePolygon,auditCornerDoorSweeps};
if(require.main===module)console.log(JSON.stringify(verifyFamilyCornerStorage(require(path.join(root,'data/house-plans.js'))),null,2));
