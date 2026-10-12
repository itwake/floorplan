'use strict';

// Freeze the actual previously published model independently of the new
// generator. An outside guard concept must not silently enlarge the floor.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyBalconyService,beforeFamilyBalconyService,REVISION}=require('../tools/family-balcony-service-20261012.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// git show 310c863580dfa300ab9e5c756aa943336d742e4f:data/house-plans.js
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'b0db329c4db5d1cecbfc62f855adf829a99473cace86168834fd97dfa2e01309',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const ids=['balcony_robot','balcony_service_counter','balcony_outer_projection'];
const overlap=(a,b)=>['x','y','z'].every(k=>Math.min(a[k]+a[k+'Size'],b[k]+b[k+'Size'])-Math.max(a[k],b[k])>.5);
const itemBox=f=>({x:f.cx-f.w/2,y:f.cy-f.d/2,z:f.elevationMm||0,xSize:f.w,ySize:f.d,zSize:f.heightMm});
const partBox=(f,p)=>({x:f.cx+p.x,y:f.cy+p.y,z:(f.elevationMm||0)+p.elevationMm,xSize:p.w,ySize:p.d,zSize:p.heightMm});
const area=poly=>Math.abs(poly.reduce((s,p,i)=>s+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0))/2;

function verifyFamilyBalconyService(bundle){
 assert.equal(REVISION,'family-balcony-service-20261012');
 assert.equal(bundle.defaultScheme,'family');assert.equal(bundle.unit,'mm');
 const p=bundle.schemes.family,u=p.metadata.familyBalconyServiceUpdate;
 assert.equal(u?.id,REVISION);assert.equal(u.date,'2026-10-12');
 assert.equal(u.sourceSnapshotsUnchanged,true);
 assert.deepEqual(u.newFurnitureIds.slice().sort(),ids.slice().sort());
 assert.deepEqual(u.removedFurnitureIds,[]);assert.deepEqual(u.changedFurnitureIds,['laundry_dryer']);assert.deepEqual(u.replacedFurnitureIds,[]);assert.ok(Array.isArray(u.migrationFields.laundry_dryer));assert.ok(u.migrationFields.laundry_dryer.includes('cx'));
 const old=beforeFamilyBalconyService(p),oldBundle=beforeFamilyBalconyService(bundle);
 assert.equal(hash(old),baseline.family,'complete frozen previously published Scheme 2 restored');
 assert.equal(hash(oldBundle.schemes.family),baseline.family,'bundle rollback restores exact historical model');
 assert.equal(hash(beforeFamilyBalconyService(old)),baseline.family,'rollback without layer is inert');
 assert.equal(old.defaultFurniture.length,57);assert.equal(p.defaultFurniture.length,60);
 assert.deepEqual(p.defaultFurniture.filter(f=>!ids.includes(f.id)&&f.id!=='laundry_dryer'),old.defaultFurniture.filter(f=>f.id!=='laundry_dryer'),'all other 56 existing objects and their order remain exact');
 assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id));
 assert.deepEqual(u.previousFurniture,[old.defaultFurniture.find(f=>f.id==='laundry_dryer')],'original complete dryer saved');
 for(const key of ['WALLS','WINS','DOORS','SLIDES','BAYS'])assert.deepEqual(p[key],old[key],key+': structural geometry or door moved');
 const balcony=p.ROOMS.find(r=>r.id==='balcony'),oldBalcony=old.ROOMS.find(r=>r.id==='balcony');
 assert.deepEqual(balcony.poly,oldBalcony.poly,'external projection cannot enlarge walkable floor');
 assert.equal(area(balcony.poly),2115800,'native 1420 × 1490 footprint remains');
 assert.deepEqual(balcony.at,oldBalcony.at);assert.equal(balcony.heightMm,oldBalcony.heightMm);
 for(const r of p.ROOMS.filter(r=>r.id!=='balcony'))assert.deepEqual(r,old.ROOMS.find(q=>q.id===r.id),'other room changed: '+r.id);
 for(const oldMeta of old.WIN_META){const now=p.WIN_META.find(m=>m.id===oldMeta.id);assert.ok(now);if(['balcony_north_opening','balcony_east_opening'].includes(oldMeta.id)){for(const k of ['sourceAxisMm','openingWidthMm','sillMm','headMm','heightMm','noGlass','type'])assert.deepEqual(now[k],oldMeta[k],'original opening envelope changed: '+oldMeta.id+' '+k);assert.equal(now.noFrame,true,'old guard must move, not remain duplicated at original edge');assert.equal(now.noGlass,true);}else assert.deepEqual(now,oldMeta,'unrelated window changed: '+oldMeta.id);}
 const dryer=p.defaultFurniture.find(f=>f.id==='laundry_dryer'),robot=p.defaultFurniture.find(f=>f.id==='balcony_robot'),counter=p.defaultFurniture.find(f=>f.id==='balcony_service_counter'),outer=p.defaultFurniture.find(f=>f.id==='balcony_outer_projection');
 const oldDryer=old.defaultFurniture.find(f=>f.id==='laundry_dryer');
 assert.equal(dryer.cx,oldDryer.cx+50);for(const key of ['cy','w','d','heightMm','elevationMm','rot','color','sourceId','roomId','face'])assert.deepEqual(dryer[key],oldDryer[key],'dryer only moves 50 mm east: '+key);
 assert.deepEqual([dryer.w,dryer.d,dryer.heightMm],[600,600,840]);
 assert.equal(robot.roomId,'balcony');assert.equal(robot.dimensionStatus,'owner-approved-placeholder');assert.equal(robot.applianceDesign.actualProductSelected,false);assert.deepEqual([robot.cx,robot.cy,robot.w,robot.d,robot.heightMm,robot.rot],[7120,10855,380,450,500,180]);
 assert.equal(robot.elevationMm,0);assert.ok(robot.cx-robot.w/2>=6870);assert.ok(robot.cx+robot.w/2<=dryer.cx-dryer.w/2,'robot is between western door and dryer');
 assert.ok(robot.cy-robot.d/2>=9660&&robot.cy+robot.d/2<=11150);assert.equal(overlap(itemBox(robot),itemBox(dryer)),false,'robot does not occupy dryer footprint');
 assert.equal(counter.type,'fixture');assert.equal(counter.roomId,'balcony');assert.equal(counter.heightMm,980);assert.equal(counter.elevationMm,0);assert.deepEqual([counter.cx,counter.cy,counter.w,counter.d],[7490,10800,1200,700]);
 assert.ok(counter.parts.length>8,'real support and sink geometry required');
 const parts=counter.parts.map(q=>({q,b:partBox(counter,q)})),sink=parts.filter(({q})=>/basin|sink/.test(q.role));
 assert.ok(sink.length>=4,'open sink bowl requires individual real boards');
 for(const {q,b}of parts){assert.ok(!overlap(b,itemBox(dryer)),q.id+': countertop/support/basin intersects dryer');assert.ok(!overlap(b,itemBox(robot)),q.id+': countertop/support/basin intersects robot dock');}
 const robotExit={x:robot.cx-175,y:9660,z:0,xSize:350,ySize:robot.cy-robot.d/2-9660,zSize:110};
 for(const {q,b}of parts)assert.ok(!overlap(b,robotExit),q.id+': low board closes the robot forward route');
 for(const {q,b}of sink)assert.ok(b.x+b.xSize<=dryer.cx-dryer.w/2,q.id+': sink must not be over dryer body');
 const top=parts.filter(({q})=>/countertop/.test(q.role));assert.ok(top.length>=4,'split surface preserves real sink cutout');assert.ok(top.every(({b})=>b.z+b.zSize<=980.5));assert.ok(top.some(({b})=>b.z>=dryer.heightMm+20),'independent counter leaves top machine clearance');
 assert.equal(outer.type,'fixture');assert.equal(outer.roomId,'balcony');assert.ok(outer.parts.length>20,'guard bars/canopy require actual detailed geometry');
 assert.deepEqual([outer.cx-outer.w/2,outer.cy-outer.d/2,outer.w,outer.d],[6870,8940,2140,2210],'600 mm projection measured from exterior faces');
 assert.ok(outer.parts.every(q=>q.elevationMm>=1080),'outside bay may not become a ground-level floor');
 assert.ok(!outer.parts.some(q=>/walkable|floor-slab|load-bearing-slab/.test(q.role||'')),'concept sheet-metal enclosure is not a new walking slab');
 assert.ok(outer.parts.some(q=>/guard/.test(q.role||'')));assert.ok(outer.parts.some(q=>/canopy|sheet-metal/.test(q.role||'')));assert.equal(u.exteriorProjectionMm,600);assert.equal(u.notConstructionApproval,true);assert.equal(u.addsWalkableFloor,false);
 const allMetaText=JSON.stringify({revision:u,notes:balcony.notes,outer:outer.notes,counter:counter.notes,robot:robot.notes});
 assert.match(allMetaText,/600/);assert.match(allMetaText,/非.*(承重|踩踏)|不可踩踏|non.?walkable|walkable":false/i);assert.match(allMetaText,/待核|待确认/);
 assert.ok(!p.defaultFurniture.some(f=>['family-f8','living-floorlamp'].includes(f.id)),'previous requested removals remain');
 const allowedMetadata=['familyBalconyServiceUpdate','conditions','designCorrections','converter'];
 for(const key of Object.keys(old.metadata))if(!allowedMetadata.includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'prior immutable revision changed: '+key);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);
 for(const id of ['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+': unauthorized changes');assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyBalconyServiceUpdate,undefined);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 for(const [id,expected]of Object.entries(sourceSnapshotHashes)){const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,id+': snapshot changed');}
 const currentHash=hash(bundle),historicHash=hash(oldBundle);
 assert.equal(hash(applyFamilyBalconyService(clone(oldBundle))),currentHash,'exact deterministic reapplication');
 assert.equal(hash(applyFamilyBalconyService(JSON.parse(JSON.stringify(oldBundle)))),currentHash,'serialized reapplication');
 assert.equal(hash(beforeFamilyBalconyService(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized rollback exact');
 assert.equal(hash(oldBundle),historicHash);assert.equal(hash(bundle),currentHash,'verification mutates current model');
 assert.throws(()=>applyFamilyBalconyService(clone(bundle)),/already|applied|duplicate/i);
 return{status:'PASS',revision:REVISION,scheme:'family',newFurnitureIds:ids,activeFurnitureBefore:57,activeFurnitureAfter:60,old56OtherObjectsExact:true,dryerOnly50MmEast:true,walkableAreaUnchangedMm2:area(balcony.poly),sourceSnapshotsAndOtherSchemesUnchanged:true,exactFrozenHistoricalHashRestored:true,independentlySupportedCounterAndOpenSink:true,robotBetweenDryerAndDoor:true,nonwalkableExternalGuardConcept:true};
}
module.exports={verifyFamilyBalconyService,beforeFamilyBalconyService,baseline,REVISION};
if(require.main===module)console.log(JSON.stringify(verifyFamilyBalconyService(require(path.join(root,'data/house-plans.js'))),null,2));
