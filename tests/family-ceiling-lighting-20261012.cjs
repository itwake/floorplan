'use strict';

// Freeze the complete published corner-storage model, independently of the
// lighting generator. Only Scheme 2 gains the owner's two editable lights.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyCeilingLighting,beforeFamilyCeilingLighting,REVISION}=require('../tools/family-ceiling-lighting-20261012.cjs');
const {beforeFamilyLightingStudyRefinement}=require('../tools/family-lighting-study-refinement-20261012.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// git show 5377f4ed2280f613fb703ee9d01e992811bd4df5:data/house-plans.js
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'7ef1bcbfaaa541bd38d89671c3587ee63cc0982d9156ce9d99c4d71f8782029e',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const ids=['family-living-ceilinglight','family-dining-ceilinglight'];
const architectureKeys=['ROOMS','WALLS','WALL_META','WINS','WIN_META','DOORS','SLIDES','BAYS'];
function verifyFamilyCeilingLighting(bundle){
 bundle=beforeFamilyLightingStudyRefinement(bundle);
 assert.equal(REVISION,'family-ceiling-lighting-20261012');
 assert.equal(bundle.defaultScheme,'family');assert.equal(bundle.unit,'mm');
 const p=bundle.schemes.family,u=p.metadata.familyCeilingLightingUpdate;
 assert.equal(u?.id,REVISION);assert.equal(u.date,'2026-10-12');
 assert.equal(u.sourceSnapshotsUnchanged,true);assert.equal(u.architectureUnchanged,true);
 assert.deepEqual(u.newFurnitureIds,ids);assert.deepEqual(u.removedFurnitureIds,[]);assert.deepEqual(u.changedFurnitureIds,[]);assert.deepEqual(u.replacedFurnitureIds,[]);
 assert.deepEqual(u.disabledImplicitRoomLampIds,['living'],'replaces the old living room placeholder, including after custom deletion');
 const old=beforeFamilyCeilingLighting(p),oldBundle=beforeFamilyCeilingLighting(bundle);
 assert.equal(hash(old),baseline.family,'exact complete previously published Scheme 2 restored');
 assert.equal(hash(oldBundle.schemes.family),baseline.family,'exact complete bundle rollback');
 assert.equal(hash(beforeFamilyCeilingLighting(old)),baseline.family,'absent-layer rollback inert');
 assert.equal(old.defaultFurniture.length,60);assert.equal(p.defaultFurniture.length,62);
 assert.deepEqual(p.defaultFurniture.filter(f=>!ids.includes(f.id)),old.defaultFurniture,'all previous 60 objects and their order are exact');
 assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,62,'no duplicate furniture IDs');
 for(const key of architectureKeys)assert.deepEqual(p[key],old[key],key+': unrelated structural or room change');
 const room=p.ROOMS.find(r=>r.id==='living');assert.equal(room.heightMm,2700);
 const living=p.defaultFurniture.find(f=>f.id===ids[0]),dining=p.defaultFurniture.find(f=>f.id===ids[1]);
 const rug=p.defaultFurniture.find(f=>f.id==='family-living-rug'),table=p.defaultFurniture.find(f=>f.id==='family-f23');
 assert.deepEqual([living.cx,living.cy],[rug.cx,rug.cy],'living light centered over rug/seating zone, not old room label/aisle');
 assert.deepEqual([dining.cx,dining.cy,dining.rot],[table.cx,table.cy,table.rot],'dining light centered/aligned with actual purchased table');
 assert.deepEqual([living.w,living.d,living.heightMm],[907,577,110],'owner-provided living product envelope');
 assert.deepEqual([dining.w,dining.d,dining.heightMm],[907,577,110],'dining uses the same style/size as an explicit placeholder');
 assert.equal(living.dimensionStatus,'owner-provided');
 for(const light of [living,dining]){
  assert.equal(light.type,'ceilinglight');assert.equal(light.elevationMm+light.heightMm,room.heightMm,'flush ceiling mount');
  assert.equal(light.heightMm,110);assert.equal(light.roomId,'living');assert.equal(light.rot,light===living?0:90);
  assert.equal(light.layoutRevision,REVISION);assert.equal(light.modelVariant,'rounded-rectangle-flush-light');
  assert.ok(light.w>0&&light.d>0&&light.heightMm>0);assert.match(light.color,/^#[0-9a-f]{6}$/i);
  assert.ok(light.sourceFootprintMm,'source footprint provided for migration');
 }
 assert.notEqual(dining.dimensionStatus,'owner-provided','unselected dining product must be explicitly provisional');
 assert.match(JSON.stringify({name:dining.name,notes:dining.notes,revision:u}),/暂|待|占位|provisional|placeholder/i);
 assert.ok(!p.defaultFurniture.some(f=>['family-f8','living-floorlamp'].includes(f.id)),'requested coffee-table/floor-lamp removals remain');
 const allowed=['familyCeilingLightingUpdate','conditions','designCorrections','converter'];
 for(const key of Object.keys(old.metadata))if(!allowed.includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'immutable previous revision changed: '+key);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 for(const [id,expected]of Object.entries(sourceSnapshotHashes)){const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,id+': frozen source snapshot changed');}
 for(const id of ['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+': unauthorized changes');assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyCeilingLightingUpdate,undefined);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 const currentHash=hash(bundle),historyHash=hash(oldBundle);
 assert.equal(hash(applyFamilyCeilingLighting(clone(oldBundle))),currentHash,'deterministic exact reapplication');
 assert.equal(hash(applyFamilyCeilingLighting(JSON.parse(JSON.stringify(oldBundle)))),currentHash,'serialized exact reapplication');
 assert.equal(hash(beforeFamilyCeilingLighting(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized rollback exact');
 assert.equal(hash(oldBundle),historyHash);assert.equal(hash(bundle),currentHash,'verification mutates current data');
 assert.throws(()=>applyFamilyCeilingLighting(clone(bundle)),/already|applied|duplicate/i);
 return{status:'PASS',revision:REVISION,scheme:'family',activeObjectsBefore:60,activeObjectsAfter:62,allOld60ObjectsExact:true,architectureAndOtherSchemesExact:true,sourceSnapshotsExact:true,frozenFullHistoryRestored:true,livingOwnerEnvelopeMm:[907,577,110],centersAlignedToRugAndTable:true,bothCeilingFlush:true,diningProductExplicitlyProvisional:true,priorCoffeeTableAndFloorLampRemovalsPreserved:true};
}
module.exports={verifyFamilyCeilingLighting,beforeFamilyCeilingLighting,baseline,REVISION,ids};
if(require.main===module)console.log(JSON.stringify(verifyFamilyCeilingLighting(require(path.join(root,'data/house-plans.js'))),null,2));
