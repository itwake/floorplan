'use strict';

// Independent complete-model baseline: published c74fb2eb8cd20be507bff5fa45a6c8af2c3b854b.
// New numbers for the unmeasured study window remain explicitly provisional.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyLightingStudyRefinement,beforeFamilyLightingStudyRefinement,REVISION}=require('../tools/family-lighting-study-refinement-20261012.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'3da31474c7c499341bc4e73af87a026b17357e2bb6de19b9a9c5ab7e66eb44bb',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const ids=['family-living-ceilinglight','family-dining-ceilinglight','family-acwall-room_c'];
const architectureKeys=['ROOMS','WALLS','WALL_META','WINS','DOORS','SLIDES','BAYS'];
function verifyFamilyLightingStudyRefinement(bundle){
 assert.equal(REVISION,'family-lighting-study-refinement-20261012');
 const p=bundle.schemes.family,m=p.metadata.familyLightingStudyRefinement,old=beforeFamilyLightingStudyRefinement(p),oldBundle=beforeFamilyLightingStudyRefinement(bundle);
 assert.equal(m?.id,REVISION);assert.equal(m.date,'2026-10-12');assert.equal(m.sourceSnapshotsUnchanged,true);
 assert.equal(hash(old),baseline.family,'rollback must restore exact complete published Scheme 2');
 assert.equal(hash(oldBundle.schemes.family),baseline.family);assert.equal(hash(beforeFamilyLightingStudyRefinement(old)),baseline.family);
 assert.equal(p.defaultFurniture.length,62);assert.equal(old.defaultFurniture.length,62);assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,62);
 assert.deepEqual(p.defaultFurniture.filter(f=>!ids.includes(f.id)),old.defaultFurniture.filter(f=>!ids.includes(f.id)),'all other 59 objects and order are exact');
 assert.deepEqual([...m.changedFurnitureIds].sort(),[...ids].sort());for(const k of ['newFurnitureIds','removedFurnitureIds','replacedFurnitureIds'])assert.deepEqual(m[k],[]);
 for(const k of architectureKeys)assert.deepEqual(p[k],old[k],k+': unrelated architecture change');
 assert.deepEqual(p.WIN_META.filter(w=>w.id!=='window_c'),old.WIN_META.filter(w=>w.id!=='window_c'),'only study window metadata may change');
 const win=p.WIN_META.find(w=>w.id==='window_c'),oldWin=old.WIN_META.find(w=>w.id==='window_c');
 assert.deepEqual([oldWin.sillMm,oldWin.heightMm,oldWin.headMm],[900,1400,2300]);
 assert.deepEqual([win.sillMm,win.heightMm,win.headMm],[900,1200,2100],'new window is a declared temporary model number');
 assert.deepEqual(win.sourceAxisMm,oldWin.sourceAxisMm);assert.equal(win.openingWidthMm,1100);assert.equal(win.dimensionStatus,'owner-request-lower-window-provisional');assert.equal(win.placementStatus,'unresolved');assert.equal(m.studyWindow.status,'provisional-not-surveyed');assert.equal(m.studyWindow.unmeasuredSillAndHeight,true);assert.equal(m.studyWindow.estimateOwnerConfirmed,true,'owner approved temporary 1200-high window, not an actual measurement');
 assert.match(JSON.stringify({win,m}),/暂|待|未测|provisional|pending/i,'lower window must not be mislabeled measured');
 const living=p.defaultFurniture.find(f=>f.id===ids[0]),dining=p.defaultFurniture.find(f=>f.id===ids[1]),ac=p.defaultFurniture.find(f=>f.id===ids[2]);
 const oldLiving=old.defaultFurniture.find(f=>f.id===ids[0]),oldDining=old.defaultFurniture.find(f=>f.id===ids[1]),oldAc=old.defaultFurniture.find(f=>f.id===ids[2]);
 for(const k of ['cx','cy','w','d','rot','heightMm','elevationMm','roomId','type','sourceFootprintMm','modelVariant','dimensionStatus'])assert.deepEqual(living[k],oldLiving[k],'living lamp envelope/position unchanged: '+k);
 assert.equal(living.lightingDesign.backplateColor,'#F8F7F2','visible top must be white, not a dark fill');
 assert.deepEqual([living.w,living.d,living.heightMm,living.elevationMm],[907,577,110,2590]);
 assert.equal(dining.type,'ceilinglight');assert.equal(dining.modelVariant,'round-flush-light');
 assert.deepEqual([dining.cx,dining.cy],[oldDining.cx,oldDining.cy]);assert.deepEqual([dining.w,dining.d,dining.heightMm,dining.elevationMm,dining.rot],[440,440,20,2680,0]);
 assert.equal(dining.elevationMm+dining.heightMm,2700);assert.notEqual(dining.dimensionStatus,'owner-provided','old generic round symbol is not a purchased product measurement');
 assert.match(JSON.stringify(dining),/原|旧|round|圆/);assert.deepEqual(dining.sourceFootprintMm,{x:2735,y:10780,w:440,d:440});
 assert.equal(ac.type,'acwall');for(const k of ['w','d','heightMm','elevationMm','color','roomId','modelVariant'])assert.deepEqual(ac[k],oldAc[k],k+': AC concept envelope unchanged');
 assert.deepEqual([ac.cx,ac.cy,ac.rot],[245,4700,270]);assert.deepEqual(ac.sourceFootprintMm,{x:120,y:4250,w:250,d:900});
 assert.equal(ac.elevationMm,2250);assert.equal(ac.heightMm,300);assert.equal(ac.elevationMm-win.headMm,150);assert.equal(2700-ac.elevationMm-ac.heightMm,150);
 const placement=ac.applianceDesign.windowPlacement;assert.equal(placement.windowId,'window_c');assert.equal(placement.mountingWall,'west');assert.equal(placement.windowHeadMm,2100);assert.equal(placement.actualOutdoorUnitAdded,false);assert.equal(placement.actualPipeOrHoleAdded,false);
 assert.equal(p.metadata.familyCeilingLightingUpdate.disabledImplicitRoomLampIds[0],'living','old implicit living light must not be resurrected');
 const allowed=['familyLightingStudyRefinement','conditions','designCorrections','converter'];
 for(const k of Object.keys(old.metadata))if(!allowed.includes(k))assert.deepEqual(p.metadata[k],old.metadata[k],'historical metadata changed: '+k);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 for(const [id,expected]of Object.entries(sourceSnapshotHashes)){const text=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(text).digest('hex'),expected,id+': source snapshot edited');}
 for(const id of ['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+': unauthorized change');assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyLightingStudyRefinement,undefined);}
 for(const k of Object.keys(bundle))if(k!=='schemes')assert.deepEqual(bundle[k],oldBundle[k]);
 const currentHash=hash(bundle);assert.equal(hash(applyFamilyLightingStudyRefinement(clone(oldBundle))),currentHash,'exact deterministic reapplication');assert.equal(hash(applyFamilyLightingStudyRefinement(JSON.parse(JSON.stringify(oldBundle)))),currentHash,'exact serialized reapplication');assert.equal(hash(beforeFamilyLightingStudyRefinement(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized rollback');assert.equal(hash(bundle),currentHash,'test mutates data');assert.throws(()=>applyFamilyLightingStudyRefinement(clone(bundle)),/already|applied|duplicate/i);
 return{status:'PASS',revision:REVISION,scheme:'family',activeObjects:62,other59ObjectsExact:true,otherSchemesAndSourcesExact:true,fullPublishedModelUndoExact:true,livingLampExact907x577x110AndWhiteTop:true,diningOriginalRoundPlaceholder440x440x20:true,studyAcActualWestWallFacesEast:true,studyWindowProvisionalHead2100:true,studyAcWindowHeadGap150AndCeilingGap150:true};
}
module.exports={verifyFamilyLightingStudyRefinement,beforeFamilyLightingStudyRefinement,baseline,REVISION,ids};
if(require.main===module)console.log(JSON.stringify(verifyFamilyLightingStudyRefinement(require(path.join(root,'data/house-plans.js'))),null,2));
