'use strict';

// Frozen pre-change history and independently measured solid-volume checks.
// The new lower opening is a design concept, not permission to demolish a wall
// or evidence that the unclosed measured kitchen width can accommodate it.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyBalconyRecess,beforeFamilyBalconyRecess,REVISION}=require('../tools/family-balcony-recess-20261012.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Independently frozen from git show 9d454b212792aed544d47a8c5dd11299237468d3:data/house-plans.js.
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'a779fa28fa6e1be3af683089dd0ec301744e6ec64a2de9b0894bb33449f59e6e',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const changedIds=['laundry_dryer','balcony_robot','fit-kitchen-20261005'],removedIds=['balcony_service_counter'],newIds=['balcony_recess_housing','balcony_bucket_tap'];
const overlap=(a,b)=>['x','y','z'].every(k=>Math.min(a[k]+a[k+'Size'],b[k]+b[k+'Size'])-Math.max(a[k],b[k])>.01);
const box=(x,y,z,xSize,ySize,zSize)=>({x,y,z,xSize,ySize,zSize});
const itemBox=f=>{const angle=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(angle))+Math.abs(f.d*Math.sin(angle)),d=Math.abs(f.w*Math.sin(angle))+Math.abs(f.d*Math.cos(angle));return box(f.cx-w/2,f.cy-d/2,f.elevationMm||0,w,d,f.heightMm);};
const partBox=(f,p)=>box(f.cx+p.x,f.cy+p.y,(f.elevationMm||0)+p.elevationMm,p.w,p.d,p.heightMm);
const rectArea=poly=>Math.abs(poly.reduce((sum,p,i)=>sum+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0))/2;
const worldParts=f=>(f.parts||[]).map(p=>({id:f.id+'/'+p.id,role:p.role,b:partBox(f,p)}));

function verifyFamilyBalconyRecess(bundle){
 assert.equal(REVISION,'family-balcony-recess-20261012');
 const originalHash=hash(bundle),p=bundle.schemes.family,u=p.metadata.familyBalconyRecessUpdate,oldBundle=beforeFamilyBalconyRecess(bundle),old=oldBundle.schemes.family;
 assert.equal(u?.id,REVISION);assert.equal(u.date,'2026-10-12');assert.equal(u.sourceSnapshotsUnchanged,true);
 assert.equal(hash(old),baseline.family,'exact frozen pre-change Scheme 2 rollback');
 assert.equal(hash(beforeFamilyBalconyRecess(p)),baseline.family,'plan-only frozen rollback');
 assert.equal(hash(beforeFamilyBalconyRecess(old)),baseline.family,'absent layer is inert');
 assert.deepEqual(u.changedFurnitureIds.slice().sort(),changedIds.slice().sort());
 assert.deepEqual(u.removedFurnitureIds,removedIds);assert.deepEqual(u.newFurnitureIds.slice().sort(),newIds.slice().sort());assert.deepEqual(u.replacedFurnitureIds,[]);
 assert.equal(old.defaultFurniture.length,62);assert.equal(p.defaultFurniture.length,63);
 const touched=new Set([...changedIds,...removedIds,...newIds]);
 assert.deepEqual(p.defaultFurniture.filter(f=>!touched.has(f.id)),old.defaultFurniture.filter(f=>!touched.has(f.id)),'all other 58 complete furniture objects remain unchanged in exact order');
 assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id));
 for(const id of [...changedIds,...removedIds])assert.deepEqual(u.previousFurniture.find(f=>f.id===id),old.defaultFurniture.find(f=>f.id===id),'previous whole object saved '+id);
 for(const key of ['WALLS','WINS','DOORS','SLIDES','BAYS'])assert.deepEqual(p[key],old[key],key+' coordinate/source axes must not shift');
 const balcony=p.ROOMS.find(r=>r.id==='balcony'),oldBalcony=old.ROOMS.find(r=>r.id==='balcony');
 for(const r of p.ROOMS){const b=old.ROOMS.find(q=>q.id===r.id);if(r.id==='balcony'){for(const key of Object.keys(b))if(key!=='notes')assert.deepEqual(r[key],b[key],'native balcony geometry/material/status '+key);}else assert.deepEqual(r,b,'unrelated room '+r.id);}
 assert.equal(rectArea(balcony.poly),2115800,'walkable balcony remains the original 1420 × 1490 floor');
 assert.deepEqual(balcony.poly,oldBalcony.poly);
 const win=p.WIN_META.find(m=>m.id==='window_kitchen_balcony'),oldWin=old.WIN_META.find(m=>m.id==='window_kitchen_balcony'),lower=win.lowerServiceOpeningMm;
 assert.ok(lower,'new concept opening beneath, not a relocated upper window');
 for(const key of ['id','sourceId','sourceAxisMm','openingWidthMm','sillMm','headMm','heightMm','placementStatus','dimensionStatus','type','noGlass','guard'])assert.deepEqual(win[key],oldWin[key],'upper window unchanged '+key);
 assert.deepEqual([win.openingWidthMm,win.sillMm,win.heightMm],[1200,1000,1300]);
 assert.deepEqual([lower.x1,lower.x2,lower.bottom,lower.top],[7023,8137,0,980],'lower opening accommodates counter thickness, not merely machine height');
 for(const m of p.WIN_META.filter(m=>m.id!==win.id))assert.deepEqual(m,old.WIN_META.find(q=>q.id===m.id),'unrelated opening '+m.id);
 const dryer=p.defaultFurniture.find(f=>f.id==='laundry_dryer'),robot=p.defaultFurniture.find(f=>f.id==='balcony_robot'),housing=p.defaultFurniture.find(f=>f.id==='balcony_recess_housing'),tap=p.defaultFurniture.find(f=>f.id==='balcony_bucket_tap'),kitchen=p.defaultFurniture.find(f=>f.id==='fit-kitchen-20261005');
 assert.ok(!p.defaultFurniture.some(f=>f.id==='balcony_service_counter'),'previous open basin, drains and tap removed as one complete assembly');
 assert.deepEqual([dryer.cx,dryer.cy,dryer.w,dryer.d,dryer.heightMm,dryer.elevationMm,dryer.rot],[7799,11450,600,600,840,0,180]);
 assert.deepEqual([robot.cx,robot.cy,robot.w,robot.d,robot.heightMm,robot.elevationMm,robot.rot],[7251,11375,380,450,500,0,180]);
 for(const machine of [dryer,robot]){
  const previous=old.defaultFurniture.find(f=>f.id===machine.id);
  for(const key of ['id','sourceId','type','w','d','heightMm','elevationMm','rot','color','face','roomId','dimensionStatus'])assert.deepEqual(machine[key],previous[key],'same appliance / concept identity '+machine.id+' '+key);
  assert.equal(machine.face,'north');assert.equal(machine.cy-machine.d/2,11150,'front edge flush with old balcony south wall');
  assert.ok(machine.cx-machine.w/2>=7023&&machine.cx+machine.w/2<=8137);
  assert.ok(machine.cy+machine.d/2<=11902,'machine remains in reconstructed kitchen cabinet, not outside projection');
  assert.deepEqual(machine.sourceFootprintMm,{x:machine.cx-machine.w/2,y:machine.cy-machine.d/2,w:machine.w,d:machine.d});
 }
 assert.equal(dryer.cy-old.defaultFurniture.find(f=>f.id===dryer.id).cy,700);assert.equal(robot.cy-old.defaultFurniture.find(f=>f.id===robot.id).cy,520);
 assert.equal(950-dryer.heightMm,110,'model-only top gap');assert.equal(11902-(dryer.cy+dryer.d/2),152,'model rear space before product pipe/vent requirements');assert.equal(11902-(robot.cy+robot.d/2),302,'compact placeholder rear gap');
 assert.deepEqual([housing.cx-housing.w/2,housing.cy-housing.d/2,housing.w,housing.d,housing.heightMm],[7023,11150,1114,770,980]);
 assert.equal(housing.type,'fixture');assert.equal(housing.face,'north');assert.equal(housing.elevationMm,0);
 const housingParts=worldParts(housing),tops=housingParts.filter(q=>/countertop/.test(q.role||''));
 assert.ok(tops.length>=1);assert.ok(tops.every(q=>q.b.z===950&&q.b.zSize===30));
 assert.ok(!housing.parts.some(q=>/basin|sink|faucet|drain|plinth|base-floor|base-front|low-back|cabinet-door/.test(q.role||'')),'no former basin, front closure, plinth, machine bottom board or low backboard');
 assert.ok(housingParts.some(q=>q.b.x===7023&&q.b.xSize===18&&q.b.y===11150&&q.b.ySize===770&&q.b.z===0&&q.b.zSize===950),'18 mm west support');
 assert.ok(housingParts.some(q=>q.b.x===7461&&q.b.xSize===18&&q.b.y===11150&&q.b.ySize===770&&q.b.z===0&&q.b.zSize===950),'18 mm independent middle support');
 assert.ok(housingParts.some(q=>q.b.x===8119&&q.b.xSize===18&&q.b.y===11150&&q.b.ySize===770&&q.b.z===0&&q.b.zSize===950),'18 mm east support');
 assert.ok(housingParts.some(q=>q.b.x===7041&&q.b.xSize===1078&&q.b.y===11902&&q.b.ySize===18&&q.b.z===0&&q.b.zSize===950),'18 mm kitchen-side封板, not a cabinet back behind balcony machines');
 assert.equal(7461-7041,420);assert.equal(8119-7479,640);assert.equal(18+420+18+640+18,1114);
 assert.equal((robot.cx-robot.w/2)-7041,20);assert.equal(7461-(robot.cx+robot.w/2),20);assert.equal((dryer.cx-dryer.w/2)-7479,20);assert.equal(8119-(dryer.cx+dryer.w/2),20);
 // Reconstructed adjacent solid walls around the implicit inner-window sill.
 // Keep the original upper window and the residual 980..1000 lintel band.
 const wallSolids=p.WALLS.map((w,i)=>({id:'wall-'+i,b:box(w[0],w[1],0,w[2]-w[0],w[3]-w[1],2700)}));
 wallSolids.push({id:'sill-west-retained',b:box(6980,11150,0,43,120,1000)},{id:'sill-east-retained',b:box(8137,11150,0,43,120,1000)},{id:'sill-retained-upper-20',b:box(7023,11150,980,1114,120,20)});
 const otherFurniture=p.defaultFurniture.filter(f=>![dryer.id,robot.id,housing.id,tap.id].includes(f.id)).flatMap(f=>f.parts?.length?worldParts(f):[{id:f.id,b:itemBox(f)}]);
 const obstacles=[...otherFurniture,...housingParts,...worldParts(tap),...wallSolids];
 for(const machine of [dryer,robot])for(const fixed of obstacles)assert.equal(overlap(itemBox(machine),fixed.b),false,machine.id+' intersects '+fixed.id);
 assert.equal(overlap(itemBox(dryer),itemBox(robot)),false);
 for(const fixed of housingParts)for(const obstacle of [...worldParts(kitchen),...wallSolids])assert.equal(overlap(fixed.b,obstacle.b),false,fixed.id+' intersects retained cabinet/wall '+obstacle.id);
 const previousKitchen=old.defaultFurniture.find(f=>f.id===kitchen.id),reserved=box(7023,11150,0,1114,770,980),oldObstacles=worldParts(previousKitchen);
 for(const key of ['id','sourceId','type','cx','cy','w','d','rot','heightMm','elevationMm','baseWidthMm','baseDepthMm','baseHeightMm','sourceFootprintMm'])assert.deepEqual(kitchen[key],previousKitchen[key],'kitchen exterior / coordinate identity remains '+key);
 for(const part of previousKitchen.parts)if(!overlap(partBox(previousKitchen,part),reserved))assert.deepEqual(kitchen.parts.find(q=>q.id===part.id),part,'unrelated original kitchen board/light exact '+part.id);
 // For each genuinely affected original cuboid, independently retain its two
 // sides outside the recess. It is not enough merely to delete obstacles.
 for(const original of previousKitchen.parts.filter(q=>overlap(partBox(previousKitchen,q),reserved))){
  const b=partBox(previousKitchen,original),expected=[];
  if(b.x<reserved.x)expected.push({...b,xSize:reserved.x-b.x});
  if(b.x+b.xSize>reserved.x+reserved.xSize)expected.push({...b,x:reserved.x+reserved.xSize,xSize:b.x+b.xSize-reserved.x-reserved.xSize});
  const remnants=kitchen.parts.filter(q=>q.id===original.id||q.id.startsWith(original.id+'-recess-'));
  assert.deepEqual(remnants.map(q=>partBox(kitchen,q)).sort((a,b)=>a.x-b.x),expected.sort((a,b)=>a.x-b.x),'retained real outside pieces '+original.id);
  for(const q of remnants)for(const key of ['elevationMm','heightMm','role','color','material','face'])assert.deepEqual(q[key],original[key],'retained old part material/height '+original.id+' '+key);
 }
 assert.ok(oldObstacles.some(q=>overlap(itemBox(dryer),q.b)),'negative control: old full cabinet cannot simply accept dryer');
 assert.ok(oldObstacles.some(q=>overlap(itemBox(robot),q.b)),'negative control: old full cabinet cannot simply accept robot dock');
 assert.ok(overlap(itemBox(dryer),box(6980,11150,0,1200,120,1000)),'negative control: old solid window sill cannot be ignored');
 // Retreat clearances are independently calculated, not read from a label.
 assert.equal(11150-9660,1490);assert.equal((11150-9660)-(10450-9660),700);
 const robotExit=box(robot.cx-175,9660,0,350,11150-9660,110);
 for(const fixed of [...housingParts,...worldParts(tap),...wallSolids])assert.equal(overlap(robotExit,fixed.b),false,'open low robot path blocked '+fixed.id);
 assert.ok(tap.parts.some(q=>/faucet/.test(q.role||'')),'retained usable bucket faucet is real geometry');
 assert.ok(!tap.parts.some(q=>/basin|sink/.test(q.role||'')),'retained water supply is not another washbasin');
 for(const fixed of worldParts(tap))for(const machine of [dryer,robot])assert.equal(overlap(fixed.b,itemBox(machine)),false,'bucket tap intersects '+machine.id);
 assert.equal(tap.outletHeightMm,750,'provisional bucket outlet height');
 const bucket=tap.temporaryBucketZoneMm;
 assert.deepEqual([bucket.x1,bucket.x2,bucket.y1,bucket.y2,bucket.widthMm,bucket.depthMm],[6870,7170,10750,11050,300,300]);
 assert.equal(bucket.temporary,true);assert.equal(bucket.blocksRobotWhenOccupied,true);assert.equal(bucket.notDedicatedDrain,true);assert.deepEqual(u.temporaryBucketZoneMm,bucket);
 assert.equal(u.bucketZoneNotMeasured,true);assert.equal(u.floorDrainLocationConfirmed,false);assert.equal(u.floorSlopeConfirmed,false);
 assert.ok(overlap(robotExit,box(bucket.x1,bucket.y1,0,bucket.widthMm,bucket.depthMm,110)),'temporary bucket occupancy is honestly identified as a robot route conflict');
 assert.equal(u.notConstructionApproval,true);assert.equal(u.structuralUnverified,true);assert.equal(u.applianceInstallationApproved,false);assert.equal(u.robotProductConfirmed,false);assert.equal(u.addsWalkableFloor,false);
 const text=JSON.stringify({u,housing,tap,balcony,window:win,dryerNotes:dryer.notes,robotNotes:robot.notes});
 assert.match(text,/450/,'kitchen closure discrepancy disclosed');assert.match(text,/180/,'balcony measurement discrepancy disclosed');assert.match(text,/待核|待确认|未核/);assert.match(text,/结构|承重|拆改/);assert.match(text,/防水/);assert.match(text,/水桶|拖地|洗地/);assert.match(text,/待.*(型号|选型)|型号.*待|actualProductSelected":false/);
 assert.equal(p.defaultFurniture.find(f=>f.id==='balcony_outer_projection').parts.every(q=>q.elevationMm>=1080),true,'north/east enclosure remains nonwalking, above floor');
 const allowed=['familyBalconyRecessUpdate','conditions','designCorrections','converter'];
 for(const key of Object.keys(old.metadata))if(!allowed.includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'historical metadata remains exact '+key);
 const obsoleteCounterConditions=new Set(old.defaultFurniture.find(f=>f.id==='balcony_service_counter').conditions),retainedConditions=old.metadata.conditions.filter(s=>!obsoleteCounterConditions.has(s));
 assert.deepEqual(p.metadata.conditions.slice(0,retainedConditions.length),retainedConditions,'only obsolete removed basin conditions are removed');assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 for(const [id,expected]of Object.entries(sourceSnapshotHashes)){const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,id+' immutable source snapshot');}
 for(const id of ['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id]);assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyBalconyRecessUpdate,undefined);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 assert.equal(hash(applyFamilyBalconyRecess(clone(oldBundle))),originalHash,'deterministic reapplication');assert.equal(hash(applyFamilyBalconyRecess(JSON.parse(JSON.stringify(oldBundle)))),originalHash,'serialized deterministic reapplication');assert.equal(hash(beforeFamilyBalconyRecess(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized rollback');assert.throws(()=>applyFamilyBalconyRecess(clone(bundle)),/already|applied|duplicate/i);assert.equal(hash(bundle),originalHash,'verification cannot mutate plan');
 return{status:'PASS',revision:REVISION,scheme:'family',objectsBefore:62,objectsAfter:63,other58ObjectsExact:true,sourceAndOtherSchemesExact:true,oldWashbasinAssemblyRemoved:true,guestWasherUnchanged:true,northFacingAppliancesRecessed:true,machineFrontMm:11150,housingMm:[1114,770,980],bayClearWidthsMm:[420,640],machineTopGapMm:110,rearGapsMm:{dryer:152,robot:302},balconyFrontModelMm:1490,unchangedWalkableAreaMm2:rectArea(balcony.poly),upperWindowUnchanged:true,newLowerOpeningMm:[1114,980],retainedWallBandMm:20,retainedBucketFaucet:true,allSolidIntersectionsChecked:true,oldCabinetAndSillNegativeControlsCaught:true,structuralAndInstallationApprovalPending:true};
}
module.exports={verifyFamilyBalconyRecess,beforeFamilyBalconyRecess,baseline,REVISION,overlap,itemBox,partBox};
if(require.main===module)console.log(JSON.stringify(verifyFamilyBalconyRecess(require(path.join(root,'data/house-plans.js'))),null,2));
