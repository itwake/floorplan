'use strict';

// Independent frozen-history and solid-volume verification. An antiparallel
// endpoint alone does not identify the direction of a 180-degree sweep.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyCornerDoor180,beforeFamilyCornerDoor180,REVISION}=require('../tools/family-corner-door-180-20261012.cjs');
const root=path.resolve(__dirname,'..'),cabinetId='fit-dining_sideboard_wall',clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// git show ca439d11f350b77666a331dcfac5b91107ee4d4b:data/house-plans.js
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'cd2b35c540476f309b26a7126245bcd0ec02aaef3d5ce206997d889a35714b6a',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1],tol=.05;
function polygonOverlap(a,b){
 for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],v=[-(q[1]-p[1]),q[0]-p[0]],length=Math.hypot(...v),n=v.map(x=>x/length),ap=a.map(p=>dot(p,n)),bp=b.map(p=>dot(p,n));
  if(Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp))<=tol)return false;
 }
 return true;
}
const verticalOverlap=(a,b)=>Math.min(a.top,b.top)-Math.max(a.bottom,b.bottom)>tol;
const rectPolygon=b=>[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.d],[b.x,b.y+b.d]];
const furniturePolygon=f=>{const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,y])=>[f.cx+x*c-y*s,f.cy+x*s+y*c]);};
function transformDoorPoints(f,p,t,points){
 const v=p.cabinetDoor,a=Math.atan2(v.closedDirection[1],v.closedDirection[0])+v.openingSweepDegrees*Math.PI/180*t,d=[Math.cos(a),Math.sin(a)],n=[-d[1],d[0]],h=[f.cx+v.hingeMm[0],f.cy+v.hingeMm[1]],fa=(f.rot||0)*Math.PI/180,c=Math.cos(fa),s=Math.sin(fa);
 return points.map(([along,normal])=>{const x=h[0]+d[0]*along+n[0]*normal,y=h[1]+d[1]*along+n[1]*normal,dx=x-f.cx,dy=y-f.cy;return[f.cx+dx*c-dy*s,f.cy+dx*s+dy*c];});
}
function doorPolygon(f,p,t){const v=p.cabinetDoor,half=v.thicknessMm/2,offset=v.normalOffsetMm||0;return transformDoorPoints(f,p,t,[[0,offset-half],[v.lengthMm,offset-half],[v.lengthMm,offset+half],[0,offset+half]]);}
function handlePolygon(f,p,t){
 const v=p.cabinetDoor,along=v.lengthMm-(v.handleInsetMm||42),recessed=v.handleStyle==='recessed',halfAlong=recessed?3.5:12,halfNormal=recessed?.15:11,normal=(v.normalOffsetMm||0)+(v.frontSign||1)*(v.thicknessMm/2+(recessed?.15:12));
 return transformDoorPoints(f,p,t,[[along-halfAlong,normal-halfNormal],[along+halfAlong,normal-halfNormal],[along+halfAlong,normal+halfNormal],[along-halfAlong,normal+halfNormal]]);
}
function sweptShapes(f,p,t){
 const bottom=(f.elevationMm||0)+p.elevationMm,top=bottom+p.heightMm,v=p.cabinetDoor,hy=bottom+Math.min(p.heightMm-45,Math.max(45,v.handleElevationMm||Math.min(1050,p.heightMm/2))),halfH=v.handleStyle==='recessed'?60:12;
 const shapes=[{id:p.id,owner:p.id,kind:'panel',polygon:doorPolygon(f,p,t),bottom,top},{id:p.id+'-pull',owner:p.id,kind:'pull',polygon:handlePolygon(f,p,t),bottom:hy-halfH,top:hy+halfH}];
 // The new explicit virtual offset axes keep actual 10-mm barrels tangent to,
 // not penetrating, the adjacent fixed facade. Use conservative square bounds
 // around the cylinder so a sampled circular polygon cannot hide a collision.
 assert.equal(v.hingeBarrelAtPivot,true);
 const center=transformDoorPoints(f,p,t,[[0,0]])[0],levels=p.heightMm>900?[120,p.heightMm/2,p.heightMm-120]:[90,p.heightMm-90];
 levels.forEach((height,index)=>shapes.push({id:p.id+'-hinge-'+index,owner:p.id,kind:'hinge',polygon:rectPolygon({x:center[0]-5,y:center[1]-5,w:10,d:10}),bottom:bottom+height-27.5,top:bottom+height+27.5}));
 return shapes;
}
function fixedObstacles(plan,f){
 const own=f.parts.filter(p=>!p.cabinetDoor).map(p=>({id:p.id,kind:'fixed-cabinet-part',polygon:rectPolygon({x:f.cx+p.x,y:f.cy+p.y,w:p.w,d:p.d}),bottom:(f.elevationMm||0)+p.elevationMm,top:(f.elevationMm||0)+p.elevationMm+p.heightMm}));
 const other=plan.defaultFurniture.filter(p=>p.id!==cabinetId).map(p=>({id:p.id,kind:'other-furniture',polygon:furniturePolygon(p),bottom:p.elevationMm||0,top:(p.elevationMm||0)+p.heightMm}));
 // Conservatively include the whole wall rectangles even where windows/doors
 // cut them. No obstacle mask or furniture/part exclusion is allowed here.
 const walls=plan.WALLS.map((w,i)=>({id:'wall-'+i,kind:'wall',polygon:rectPolygon({x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1]}),bottom:0,top:2700}));
 return[...own,...other,...walls];
}
function auditCorner180Sweeps(plan,cabinet){
 const panels=cabinet.parts.filter(p=>p.cabinetDoor),obstacles=fixedObstacles(plan,cabinet),west=panels.filter(p=>p.cabinetDoor.group==='west'),south=panels.filter(p=>p.cabinetDoor.group==='south');
 assert.equal(panels.length,4);assert.equal(west.length,2);assert.equal(south.length,2);
 const evaluate=(fractions,label)=>{
  const shapes=panels.flatMap(p=>sweptShapes(cabinet,p,fractions[p.cabinetDoor.group]));
  for(let i=0;i<shapes.length;i++)for(let j=i+1;j<shapes.length;j++){
   const a=shapes[i],b=shapes[j];if(a.owner===b.owner)continue;
   if(verticalOverlap(a,b))assert.equal(polygonOverlap(a.polygon,b.polygon),false,a.id+' hits '+b.id+' during '+label);
  }
  for(const moving of shapes)for(const fixed of obstacles)if(verticalOverlap(moving,fixed))assert.equal(polygonOverlap(moving.polygon,fixed.polygon),false,moving.id+' hits '+fixed.kind+' '+fixed.id+' during '+label);
 };
 for(let degree=0;degree<=180;degree+=.25){
  evaluate({west:degree/180,south:0},'opening west '+degree+'°');
  evaluate({west:1,south:degree/180},'opening south '+degree+'°');
  evaluate({west:1,south:1-degree/180},'closing south '+degree+'°');
  evaluate({west:1-degree/180,south:0},'closing west '+degree+'°');
 }
 let concurrentCollisionSamples=0;
 for(let degree=0;degree<=180;degree++)if(west.some(w=>south.some(s=>verticalOverlap({bottom:w.elevationMm,top:w.elevationMm+w.heightMm},{bottom:s.elevationMm,top:s.elevationMm+s.heightMm})&&polygonOverlap(doorPolygon(cabinet,w,degree/180),doorPolygon(cabinet,s,degree/180)))))concurrentCollisionSamples++;
 assert.ok(concurrentCollisionSamples>0,'wrong simultaneous opening negative control must collide');
 return{sequentialSamples:2884,degreeStep:.25,fixedObstacleCount:obstacles.length,concurrentCollisionSamples};
}

function verifyFamilyCornerDoor180(bundle){
 assert.equal(REVISION,'family-corner-door-180-20261012');const originalHash=hash(bundle),p=bundle.schemes.family,u=p.metadata.familyCornerDoor180Update,oldBundle=beforeFamilyCornerDoor180(bundle),old=oldBundle.schemes.family;
 assert.equal(u?.id,REVISION);assert.equal(u.date,'2026-10-12');assert.equal(hash(old),baseline.family,'exact full frozen published plan rollback');
 assert.equal(hash(beforeFamilyCornerDoor180(p)),baseline.family,'plan-only rollback');assert.equal(hash(beforeFamilyCornerDoor180(old)),baseline.family,'absent layer inert');
 assert.deepEqual(u.changedFurnitureIds,[cabinetId]);for(const key of ['newFurnitureIds','removedFurnitureIds','replacedFurnitureIds'])assert.deepEqual(u[key],[]);
 assert.equal(u.sourceSnapshotsUnchanged,true);assert.equal(u.architectureUnchanged,true);assert.equal(u.preserveCustomSizeIds,undefined,'custom envelope sizes remain user values while unchanged original hinge parts receive the new sweep');assert.deepEqual(u.preserveCustomPartsIds,[cabinetId],'private geometry cannot be partially upgraded or relabelled');assert.ok(u.migrationFields[cabinetId].includes('parts'));assert.ok(u.migrationFields[cabinetId].includes('cornerDoorDesign'));
 assert.equal(p.defaultFurniture.length,62);assert.deepEqual(p.defaultFurniture.filter(f=>f.id!==cabinetId),old.defaultFurniture.filter(f=>f.id!==cabinetId),'other 61 complete objects unchanged');
 for(const key of ['ROOMS','WALLS','WINS','WIN_META','DOORS','SLIDES','BAYS'])assert.deepEqual(p[key],old[key],key+' changed without authorization');
 const f=p.defaultFurniture.find(f=>f.id===cabinetId),before=old.defaultFurniture.find(f=>f.id===cabinetId),panels=f.parts.filter(p=>p.cabinetDoor);
 assert.deepEqual(u.previousFurniture,[before]);assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id));
 for(const key of ['id','type','cx','cy','w','d','rot','heightMm','elevationMm','color','baseWidthMm','baseDepthMm','baseHeightMm'])assert.deepEqual(f[key],before[key],'cabinet envelope '+key+' changed');
 assert.deepEqual(f.parts.filter(p=>!p.cabinetDoor),before.parts.filter(p=>!p.cabinetDoor),'all fixed facade, inner shelves, lights, high bay and return preserved');
 assert.equal(f.cornerDoorOpen,false);assert.equal(f.cornerDoorDesign.hingeOpeningDegrees,180);assert.deepEqual(f.cornerDoorDesign.openingSequence,['west','south']);assert.deepEqual(f.cornerDoorDesign.closingSequence,['south','west']);assert.match(JSON.stringify({notes:f.notes,design:f.cornerDoorDesign,update:u}),/待核|待确认|概念|深化/);
 for(const part of panels){const v=part.cabinetDoor,west=v.group==='west',previous=before.parts.find(p=>p.id===part.id);assert.ok(previous);
  assert.equal(v.openingSweepDegrees,west?-180:180,'signed explicit 180 degree swing');assert.deepEqual(v.openDirection,west?[0,-1]:[1,0]);assert.equal(v.sequenceOrder,west?0:1);
  for(const key of ['x','y','w','d','elevationMm','heightMm','role','color','material','face'])assert.deepEqual(part[key],previous[key],'closed real panel body '+key+' changed');
  for(const key of ['closedDirection','lengthMm','thicknessMm','frontSign','handleStyle','handleElevationMm'])assert.deepEqual(v[key],previous.cabinetDoor[key],'leaf/flush pull geometry '+key+' changed');
  assert.deepEqual(v.hingeMm,west?[2530-f.cx,12741.5-f.cy]:[3253.5-f.cx,13485-f.cy],'5 mm outboard virtual axis');assert.equal(v.normalOffsetMm,west?14:-14);assert.equal(v.hingeBarrelAtPivot,true);
  const end=doorPolygon(f,part,1),xs=end.map(q=>q[0]),ys=end.map(q=>q[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  const expected=west?[2535,11994.5,2553,12741.5]:[3253.5,13462,3980.5,13480];bounds.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<.001,'actual half-turn endpoint bounds '+part.id));
 }
 const operatingChair={id:'family-f27',cx:3420,cy:12080,temporary:true};for(const [key,value]of Object.entries(operatingChair))assert.deepEqual(u.operatingChair[key],value);assert.deepEqual(f.cornerDoorDesign.operatingChair,u.operatingChair);assert.deepEqual(u.operatingChair.relativeMm,[482.5,835],'parking pose follows translated/rotated cabinet, not global-only coordinates');
 assert.throws(()=>auditCorner180Sweeps(p,f),/other-furniture family-f27/,'default eating chair must be a retained, explicit obstruction negative control');
 const operation=clone(p),moved=operation.defaultFurniture.find(item=>item.id===operatingChair.id),eating=old.defaultFurniture.find(item=>item.id===operatingChair.id);assert.deepEqual([eating.cx,eating.cy],[2955,12080]);Object.assign(moved,{cx:operatingChair.cx,cy:operatingChair.cy});
 assert.equal(moved.cx-eating.cx,465,'explicit temporary eastward shift');
 const sweep=auditCorner180Sweeps(operation,f);
 const wrongSweep=clone(f);for(const part of wrongSweep.parts.filter(p=>p.cabinetDoor&&p.cabinetDoor.group==='west'))part.cabinetDoor.openingSweepDegrees=180;
 assert.throws(()=>auditCorner180Sweeps(operation,wrongSweep),/hits/,'wrong sign negative control must detect solid collision');
 const allowed=['familyCornerDoor180Update','conditions','designCorrections','converter'];for(const key of Object.keys(old.metadata))if(!allowed.includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'previous metadata '+key+' changed');
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 for(const [id,expected]of Object.entries(sourceSnapshotHashes)){const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,id+' source snapshot changed');}
 for(const id of ['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id]);assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyCornerDoor180Update,undefined);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 assert.equal(hash(applyFamilyCornerDoor180(clone(oldBundle))),originalHash,'exact deterministic reapplication');assert.equal(hash(applyFamilyCornerDoor180(JSON.parse(JSON.stringify(oldBundle)))),originalHash,'serialized deterministic reapplication');assert.equal(hash(beforeFamilyCornerDoor180(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized exact rollback');assert.throws(()=>applyFamilyCornerDoor180(clone(bundle)),/already|applied|duplicate/i);assert.equal(hash(bundle),originalHash,'test mutates model');
 return{status:'PASS',revision:REVISION,scheme:'family',objectsBefore:62,objectsAfter:62,other61ObjectsExact:true,frozenHistoryExact:true,otherSchemesArchitectureSourceExact:true,allFixedCabinetPartsExact:true,closedDoorBodiesExact:true,explicitSigned180Degrees:true,fourUpperLowerDoorPanels:true,recessedPullsAndPivotBarrelsIncluded:true,wallSlabsAndAllOtherFurnitureIncluded:true,openingSequence:['west','south'],closingSequence:['south','west'],eatingDefaultChairObstructionDetected:true,operatingChair,temporaryChairShiftMm:465,sweep,wrongDirectionNegativeControlCaught:true,hardwareNotApproved:true};
}
module.exports={verifyFamilyCornerDoor180,baseline,REVISION,cabinetId,polygonOverlap,doorPolygon,handlePolygon,sweptShapes,fixedObstacles,auditCorner180Sweeps};
if(require.main===module)console.log(JSON.stringify(verifyFamilyCornerDoor180(require(path.join(root,'data/house-plans.js'))),null,2));
