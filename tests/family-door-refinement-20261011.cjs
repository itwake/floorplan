'use strict';

// Verify only the owner-requested two-leaf/two-track sliding-door revision.
// The unconfirmed study swing and shorter desk/bookwall are not part of it.
// These assertions cover model geometry and provenance, not site construction.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const {applyFamilyDoorRefinement,beforeFamilyDoorRefinement,REVISION}=require('../tools/family-door-refinement-20261011.cjs');
const {beforeFamilyStudyDoor}=require('../tools/family-study-door-20261012.cjs');
const root=path.resolve(__dirname,'..');
const clone=structuredClone;
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
// Frozen from `git show 1554ce6:data/house-plans.js` before generating this layer.
// Never derive these historical values by hashing the revised output.
const baseline=Object.freeze({
  wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
  family:'35a2d328741483275519583b20c42150ae03c740b9e899ffda25f94e20235984',
  laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
  screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const targetIds=['balcony_door','door_kitchen'];
const changedMetadataKeys=['designCorrections','conditions','converter','familyDoorRefinement'];
const getSlide=(plan,id)=>{
  const slide=plan.SLIDES.find(value=>value.id===id);
  assert.ok(slide,`${plan.id}/${id}: missing sliding door`);
  return slide;
};

function verifyFamilyDoorRefinement(bundle){
  bundle=beforeFamilyStudyDoor(bundle);
  assert.equal(REVISION,'family-door-refinement-20261011');
  assert.equal(bundle.defaultScheme,'family');
  assert.deepEqual(Object.keys(bundle.schemes).sort(),['family','laundry','screen','wood']);
  const plan=bundle.schemes.family,revision=plan.metadata.familyDoorRefinement;
  assert.ok(revision,'family: sliding-door refinement layer is not applied');
  assert.equal(revision.id,REVISION);
  assert.equal(revision.date,'2026-10-11');
  assert.equal(revision.status,'applied-owner-confirmed');
  assert.deepEqual(revision.changedSlidingDoorIds,targetIds);
  for(const key of ['sourceSnapshotsUnchanged','openingWidthsUnchanged','glassUnchanged','stackingDirectionsUnchanged','furnitureUnchanged','wallIndicesUnchanged'])
    assert.equal(revision[key],true,`${key}: explicit scope guarantee required`);
  for(const key of ['changedFurnitureIds','newFurnitureIds','removedFurnitureIds'])
    assert.deepEqual(revision[key],[],`${key}: study/furniture changes are not authorized in this layer`);
  assert.deepEqual(revision.migrationFields,{});
  assert.deepEqual(revision.approximationsMm,{kitchenHalfOpeningBeforeFrame:850,balconyHalfOpeningBeforeFrame:750});
  assert.match(revision.sourceReference,/书房.*待确认/,'study swing must remain pending, not silently approved');
  assert.ok(Array.isArray(revision.conditions)&&revision.conditions.length>=3,'retain aperture and hardware qualifications');
  const conditions=revision.conditions.join('\n');
  assert.match(conditions,/1700\/1500/,'existing aperture values are reference dimensions');
  assert.match(conditions,/不是新复尺|非.*复尺/,'do not present retained dimensions as new measurements');
  assert.match(conditions,/双扇双轨/,'two leaves require two separate tracks');
  assert.match(conditions,/850\/750/,'half-opening nominal estimates must be recorded');
  assert.match(conditions,/门框.*搭接/,'usable opening is reduced by frames and overlap');
  assert.match(conditions,/900mm北铰门.*1680/,'existing study layout must be explicitly retained');
  assert.match(conditions,/业主确认后|另待确认/,'pending study change must require its separate confirmation');

  const old=beforeFamilyDoorRefinement(plan);
  assert.equal(hash(old),baseline.family,'exact reversal must reproduce the complete 1554ce6 family scheme');
  assert.equal(hash(beforeFamilyDoorRefinement(old)),baseline.family,'reversal must be inert on the baseline');
  assert.notEqual(hash(plan),baseline.family,'family must actually contain the requested revision');
  assert.deepEqual(Object.keys(revision.previousPlanFields),['SLIDES'],'only original sliding doors are saved as geometry');
  assert.deepEqual(revision.previousPlanFields.SLIDES,old.SLIDES,'saved sliding-door snapshot must be exact');
  for(const key of ['designCorrections','conditions','converter'])
    assert.deepEqual(revision.previousMetadataFields[key],old.metadata[key],`${key}: exact metadata snapshot`);
  assert.ok(!Object.keys(revision.previousMetadataFields).some(key=>!['designCorrections','conditions','converter'].includes(key)),
    'no unrelated metadata may be hidden in the reversal snapshot');

  const beforeBundle=beforeFamilyDoorRefinement(bundle);
  assert.equal(hash(beforeBundle.schemes.family),baseline.family,'bundle reversal must also reproduce the historical family scheme');
  for(const id of ['wood','laundry','screen']){
    assert.equal(hash(bundle.schemes[id]),baseline[id],`${id}: other scheme must be byte-value equivalent to the historical scheme`);
    assert.deepEqual(beforeBundle.schemes[id],bundle.schemes[id],`${id}: reversal must not alter other schemes`);
    assert.equal(bundle.schemes[id].metadata.familyDoorRefinement,undefined,`${id}: unauthorized refinement metadata`);
  }
  for(const key of Object.keys(bundle))if(key!=='schemes')
    assert.deepEqual(beforeBundle[key],bundle[key],`${key}: bundle-level field changed by reversal`);

  // A full field comparison prevents a new study door, wall, furniture, room,
  // window or historical overlay from slipping through a narrow door assertion.
  assert.deepEqual(Object.keys(plan).sort(),Object.keys(old).sort(),'no new plan fields');
  for(const key of Object.keys(old))if(!['SLIDES','metadata'].includes(key))
    assert.deepEqual(plan[key],old[key],`${key}: unauthorized family geometry/state change`);
  for(const key of Object.keys(old.metadata))if(!changedMetadataKeys.includes(key))
    assert.deepEqual(plan.metadata[key],old.metadata[key],`${key}: previous confirmed history changed`);
  assert.deepEqual(Object.keys(plan.metadata).filter(key=>!changedMetadataKeys.includes(key)).sort(),
    Object.keys(old.metadata).filter(key=>!changedMetadataKeys.includes(key)).sort(),'no unrelated new metadata');
  assert.equal(plan.reviewOnly,undefined,'unpublished review flag must not enter this layer');
  assert.equal(plan.studyReview,undefined,'study approval must not be implied by production review metadata');

  assert.deepEqual(plan.SLIDES.map(value=>value.id),old.SLIDES.map(value=>value.id),'sliding-door order/count must remain unchanged');
  const preservedKeys=['rect','sourceAxisMm','openingWidthMm','heightMm','headMm','sillMm','stackTo','glass','v','surface','defaultOpen','dimensionStatus','placementStatus'];
  for(const before of old.SLIDES){
    const after=getSlide(plan,before.id);
    if(!targetIds.includes(before.id)){
      assert.deepEqual(after,before,`${before.id}: unrelated sliding door changed`);
      continue;
    }
    assert.equal(before.panelCount,3,`${before.id}: frozen baseline has three leaves`);
    assert.equal(before.trackCount,3,`${before.id}: frozen baseline has three tracks`);
    assert.equal(after.panelCount,2,`${before.id}: requested two leaves`);
    assert.equal(after.trackCount,2,`${before.id}: requested two independent tracks`);
    assert.equal(after.layoutRevision,REVISION);
    for(const key of preservedKeys)assert.deepEqual(after[key],before[key],`${before.id}/${key}: retained aperture/operation changed`);
    assert.equal(after.glass,true,`${before.id}: retain glass leaves`);
    assert.match(after.name,/双扇双轨/);
    assert.doesNotMatch(after.name,/三扇|三轨/,'name must agree with two-leaf/two-track state');
    assert.match(after.notes,/洞宽一半/,'half-opening limitation must be visible in door notes');
    assert.match(after.notes,/门框\/搭接/,'frame and overlap deduction must remain visible');
    const restored=clone(after);
    for(const key of ['name','notes','panelCount','trackCount','layoutRevision']){
      if(Object.hasOwn(before,key))restored[key]=clone(before[key]);
      else delete restored[key];
    }
    assert.deepEqual(restored,before,`${before.id}: only counts, name, notes and revision may change`);
  }
  const kitchen=getSlide(plan,'door_kitchen'),balcony=getSlide(plan,'balcony_door');
  assert.equal(kitchen.openingWidthMm,1700);assert.equal(kitchen.heightMm,2200);assert.equal(kitchen.stackTo,'north');
  assert.equal(balcony.openingWidthMm,1500);assert.equal(balcony.heightMm,2400);assert.equal(balcony.stackTo,'south');
  assert.match(kitchen.notes,/原900mm门洞/,'retain the old conditional kitchen-expansion history');
  assert.match(kitchen.notes,/承重\/管线/,'retain site verification of the kitchen expansion');
  assert.match(balcony.notes,/1420.*1240.*180/,'retain unresolved balcony measurement closure');

  const oldCorrections=old.metadata.designCorrections||[],corrections=plan.metadata.designCorrections;
  assert.equal(corrections.length,oldCorrections.length+1,'append exactly one scoped design correction');
  assert.deepEqual(corrections.slice(0,-1),oldCorrections,'previous correction history must be intact');
  const correction=corrections.at(-1);
  assert.equal(correction.id,REVISION);assert.equal(correction.date,'2026-10-11');
  assert.deepEqual(correction.sourceIds,targetIds);
  for(const key of ['sourceSnapshotsUnchanged','openingWidthsUnchanged','wallIndexesUnchanged','furnitureUnchanged'])assert.equal(correction[key],true);
  assert.match(correction.usageNote,/尚待确认.*书房/,'correction must not approve the pending study change');
  const oldConditions=old.metadata.conditions||[];
  assert.equal(plan.metadata.conditions.length,oldConditions.length+1,'append exactly one sliding-door usage condition');
  assert.deepEqual(plan.metadata.conditions.slice(0,-1),oldConditions,'previous conditions must be intact');
  assert.match(plan.metadata.conditions.at(-1),/洞宽一半/);
  assert.equal(plan.metadata.converter,(old.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-door-refinement-20261011.cjs');

  const originalHash=hash(bundle),oldHash=hash(beforeBundle);
  const reapplied=applyFamilyDoorRefinement(clone(beforeBundle));
  assert.equal(hash(reapplied),originalHash,'reversal and reapply must reproduce the complete revised bundle deterministically');
  assert.equal(hash(beforeBundle),oldHash,'reapply must not mutate the supplied historical snapshot');
  assert.equal(hash(bundle),originalHash,'verification/reversal must not mutate the revised bundle');
  assert.throws(()=>applyFamilyDoorRefinement(clone(bundle)),/already.*applied/i,'reject duplicate layer application');
  return {status:'PASS',revision:REVISION,scheme:'family',fullHistoricalHashRestored:true,roundTripDeterministic:true,
    otherSchemesUnchanged:true,onlyTwoSlidingDoorsChanged:true,aperturesAndStackingUnchanged:true,glassUnchanged:true,
    panelCount:2,trackCount:2,studyAndFurnitureUnchanged:true,duplicateApplicationRejected:true,
    nominalHalfOpeningsBeforeFrameMm:{kitchen:850,balcony:750},modelOnly:true};
}

module.exports={verifyFamilyDoorRefinement,beforeFamilyDoorRefinement,baseline,REVISION};
if(require.main===module)console.log(JSON.stringify(verifyFamilyDoorRefinement(require(path.join(root,'data/house-plans.js'))),null,2));
