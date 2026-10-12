'use strict';

// Only the owner's two Scheme 2 removals are authorized. Freeze the complete
// historical scheme, rather than accepting a freshly generated baseline.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {applyFamilyLivingClear,beforeFamilyLivingClear,REVISION}=require('../tools/family-living-clear-20261012.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'
  ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Read independently from `git show c615686:data/house-plans.js` before the
// living-clear module was added. The appliance and window-side AC layers are
// both already included in this 59-object historical baseline.
const baseline=Object.freeze({
  wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
  family:'43fc953c67814c88d95b7448e166ca9c0c5fb3b575563413ba4ab52322db3547',
  laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
  screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
  wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
  family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
  laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
  'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const ids=['family-f8','living-floorlamp'];
const metadataKeys=['familyLivingClearUpdate','designCorrections','conditions','converter'];
function assertOnlyRequestedRemovals(plan,old){
  const expected=old.defaultFurniture.filter(f=>!ids.includes(f.id));
  assert.equal(plan.defaultFurniture.length,expected.length,'only requested object count');
  assert.deepEqual(plan.defaultFurniture,expected,
    'all retained objects, ordering, appliances, cabinets, colors and positions must remain exact');
}

function verifyFamilyLivingClear(bundle){
  assert.equal(REVISION,'family-living-clear-20261012');
  assert.equal(typeof applyFamilyLivingClear,'function');
  assert.equal(typeof beforeFamilyLivingClear,'function');
  assert.equal(bundle.defaultScheme,'family');assert.equal(bundle.unit,'mm');
  assert.deepEqual(Object.keys(bundle.schemes).sort(),['family','laundry','screen','wood']);
  const plan=bundle.schemes.family,u=plan.metadata.familyLivingClearUpdate;
  assert.ok(u,'current Scheme 2 living-clear layer must exist');
  assert.equal(u.id,REVISION);assert.equal(u.date,'2026-10-12');
  assert.equal(u.status,'applied-owner-request');
  assert.equal(u.sourceSnapshotsUnchanged,true);assert.equal(u.architectureUnchanged,true);
  assert.equal(u.otherFurnitureUnchanged,true);assert.equal(u.archiveRemovedDraftObjects,true);
  assert.deepEqual(u.removedFurnitureIds.slice().sort(),ids.slice().sort(),'only tea table and floor lamp removed');
  for(const k of ['changedFurnitureIds','newFurnitureIds','replacedFurnitureIds'])assert.deepEqual(u[k],[],k);
  assert.deepEqual(u.migrationFields,{},'removal-only layer cannot have furniture property migrations');
  assert.deepEqual(u.previousPlanFields,{},'no architectural fields need rollback');

  const old=beforeFamilyLivingClear(plan),oldBundle=beforeFamilyLivingClear(bundle);
  assert.equal(hash(old),baseline.family,'exactly restore complete actual historical HEAD Scheme 2');
  assert.equal(hash(oldBundle.schemes.family),baseline.family,'bundle reversal matches frozen history');
  assert.equal(hash(beforeFamilyLivingClear(old)),baseline.family,'rollback inert when layer absent');
  assert.equal(plan.defaultFurniture.length,57);assert.equal(old.defaultFurniture.length,59);
  assertOnlyRequestedRemovals(plan,old);
  assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id),'complete prior order recorded');
  assert.deepEqual(u.previousFurniture.map(f=>f.id).sort(),ids.slice().sort(),'complete two prior objects recorded');
  for(const f of u.previousFurniture)assert.deepEqual(f,old.defaultFurniture.find(q=>q.id===f.id),'removed object fully recoverable');
  const table=old.defaultFurniture.find(f=>f.id==='family-f8'),lamp=old.defaultFurniture.find(f=>f.id==='living-floorlamp');
  assert.equal(table.type,'coffeetable');assert.equal(table.name,'茶几');
  assert.deepEqual([table.cx,table.cy,table.w,table.d,table.heightMm],[5075,7630,1200,620,400]);
  assert.equal(lamp.type,'floorlamp');assert.equal(lamp.name,'客厅落地灯');
  assert.deepEqual([lamp.cx,lamp.cy,lamp.w,lamp.d,lamp.heightMm],[2480,8250,400,400,1600]);
  assert.ok(!plan.defaultFurniture.some(f=>ids.includes(f.id)),'removed IDs cannot remain in active scene');
  assert.ok(!plan.defaultFurniture.some(f=>f.type==='floorlamp'),'no renamed stand-in floor lamp added');
  assert.deepEqual(Object.keys(plan).sort(),Object.keys(old).sort(),'top-level fields unchanged');
  for(const k of Object.keys(old))if(!['defaultFurniture','metadata'].includes(k))assert.deepEqual(plan[k],old[k],k+': architecture/layout changed');
  assert.deepEqual(Object.keys(plan.metadata).filter(k=>!metadataKeys.includes(k)).sort(),
    Object.keys(old.metadata).filter(k=>!metadataKeys.includes(k)).sort(),'no unrelated metadata keys');
  for(const k of Object.keys(old.metadata))if(!metadataKeys.includes(k))assert.deepEqual(plan.metadata[k],old.metadata[k],k+': revision history changed');
  assert.deepEqual(Object.keys(u.previousMetadataFields).sort(),['conditions','converter','designCorrections']);
  for(const [k,v]of Object.entries(u.previousMetadataFields))assert.deepEqual(v,old.metadata[k],k+': original metadata not saved');
  assert.deepEqual(plan.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections,'old design history intact');
  assert.equal(plan.metadata.designCorrections.length,old.metadata.designCorrections.length+1);
  assert.equal(plan.metadata.designCorrections.at(-1).id,REVISION);
  assert.deepEqual(plan.metadata.designCorrections.at(-1).sourceIds.slice().sort(),ids.slice().sort());
  assert.deepEqual(plan.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions,'existing conditions remain intact');
  assert.ok(plan.metadata.conditions.length>old.metadata.conditions.length,'current removal explanation appended');
  assert.equal(plan.metadata.converter,old.metadata.converter+' + tools/family-living-clear-20261012.cjs');
  for(const id of ['wood','laundry','screen']){
    assert.equal(hash(bundle.schemes[id]),baseline[id],id+': unauthorized other-scheme changes');
    assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id],id+': rollback changed other scheme');
    assert.equal(bundle.schemes[id].metadata.familyLivingClearUpdate,undefined,id+': unauthorized layer');
  }
  for(const k of Object.keys(bundle))if(k!=='schemes')assert.deepEqual(bundle[k],oldBundle[k],k+': top-level bundle changed');
  for(const[id,expected]of Object.entries(sourceSnapshotHashes)){
    const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,id+': source snapshot changed');
  }

  const originalHash=hash(bundle),oldHash=hash(oldBundle);
  assert.equal(hash(applyFamilyLivingClear(clone(oldBundle))),originalHash,'deterministic reapplication');
  assert.equal(hash(applyFamilyLivingClear(JSON.parse(JSON.stringify(oldBundle)))),originalHash,'serialized draft reapplication');
  assert.equal(hash(beforeFamilyLivingClear(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized rollback exact');
  assert.equal(hash(oldBundle),oldHash,'reapplication cannot mutate saved historical bundle');
  assert.equal(hash(bundle),originalHash,'audit does not mutate current bundle');
  assert.throws(()=>applyFamilyLivingClear(clone(bundle)),/already|applied|duplicate/i,'duplicate revision rejected');

  // Explicit retained-object controls: neither aliases nor arbitrary new
  // meshes can be substituted for the user's two requested removals.
  const reinserted=clone(plan);reinserted.defaultFurniture.push(clone(table));
  assert.throws(()=>assertOnlyRequestedRemovals(reinserted,old),/only requested object count/);
  const editedRetained=clone(plan);editedRetained.defaultFurniture[0].cx+=1;
  assert.throws(()=>assertOnlyRequestedRemovals(editedRetained,old),/all retained objects/);
  return{status:'PASS',revision:REVISION,scheme:'family',removedFurnitureIds:ids,
    activeFurnitureBefore:59,activeFurnitureAfter:57,other57ObjectsAndOrderUnchanged:true,
    architectureAndAllPriorRevisionHistoryUnchanged:true,otherSchemesAndSourceSnapshotsUnchanged:true,
    removalOnlyMigration:true,exactFrozenHistoricalHashRestored:true,deterministicSerializedRoundTrip:true};
}

module.exports={verifyFamilyLivingClear,beforeFamilyLivingClear,baseline,REVISION};
if(require.main===module)console.log(JSON.stringify(verifyFamilyLivingClear(require(path.join(root,'data/house-plans.js'))),null,2));
