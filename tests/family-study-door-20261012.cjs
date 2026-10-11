'use strict';

// Owner-approved scheme 2 study revision only. Check continuous 40 mm door
// sweep against actual shelf solids through the 2150 mm door height as well as
// furniture/walls. A model pass is not a hardware or construction approval.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const {applyFamilyStudyDoor,beforeFamilyStudyDoor,REVISION}=require('../tools/family-study-door-20261012.cjs');
const {sweptLeafHits}=require('./family-bath-review-20261011.cjs');
const root=path.resolve(__dirname,'..');
const clone=structuredClone;
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
// Frozen by reading `git show 7eb0e0e:data/house-plans.js` before this new layer
// was generated. These are historical hashes, not hashes of the revised output.
const baseline=Object.freeze({
  wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
  family:'0513077f848ba3c19515d9c79bd1e859799e1c6a8009f61127460135a6e90a35',
  laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
  screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const targetIds=['study_full_desk','fit-study_bookwall'];
const changedMetadataKeys=['designCorrections','conditions','converter','familyStudyDoorUpdate'];
const tol=.02;
const eq=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<=tol,`${label}: ${actual} != ${expected}`);
const eqFields=(actual,expected,label)=>{
  for(const [key,value] of Object.entries(expected))assert.deepEqual(actual[key],value,`${label}/${key}`);
};
const get=(plan,field,id)=>{
  const item=plan[field].find(value=>value.id===id);
  assert.ok(item,`${plan.id}/${field}/${id}: missing`);
  return item;
};
const furniture=(plan,id)=>get(plan,'defaultFurniture',id);
const door=(plan,id)=>get(plan,'DOORS',id);
const worldRect=item=>{
  const a=(item.rot||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
  const w=item.w*c+item.d*s,d=item.w*s+item.d*c;
  return {x:item.cx-w/2,y:item.cy-d/2,w,d};
};
const wallRect=(wall,id)=>({id,x:wall[0],y:wall[1],w:wall[2]-wall[0],d:wall[3]-wall[1]});
const partRect=(fixture,part)=>{
  assert.equal(fixture.rot,0,'actual shelf-solid projection needs unrotated native fixture');
  return {id:part.id,x:fixture.cx+part.x,y:fixture.cy+part.y,w:part.w,d:part.d};
};
const eqRect=(actual,expected,label)=>{
  for(const key of ['x','y','w','d'])eq(actual[key],expected[key],`${label}/${key}`);
};
const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>tol&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>tol;
const inside=(part,outer,label)=>assert.ok(part.x>=outer.x-tol&&part.y>=outer.y-tol&&part.x+part.w<=outer.x+outer.w+tol&&part.y+part.d<=outer.y+outer.d+tol,`${label}: outside native envelope`);
const changedFields=(before,after)=>[...new Set([...Object.keys(before),...Object.keys(after)])]
  .filter(key=>key!=='id'&&JSON.stringify(before[key])!==JSON.stringify(after[key])).sort();

function verifyFamilyStudyDoor(bundle){
  assert.equal(typeof applyFamilyStudyDoor,'function');
  assert.equal(typeof beforeFamilyStudyDoor,'function');
  assert.equal(REVISION,'family-study-door-20261012');
  assert.equal(bundle.defaultScheme,'family');
  assert.deepEqual(Object.keys(bundle.schemes).sort(),['family','laundry','screen','wood']);
  const plan=bundle.schemes.family,update=plan.metadata.familyStudyDoorUpdate;
  assert.ok(update,'family: approved study-door layer is not applied');
  assert.equal(update.id,REVISION);
  assert.equal(update.date,'2026-10-12');
  assert.equal(update.status,'applied-owner-confirmed');
  assert.equal(update.sourceSnapshotsUnchanged,true);
  eqFields(update,{changedDoorIds:['door_c'],notesOnlyDoorIds:['door_a'],wallIndicesUnchanged:true},'approved architecture scope');
  assert.deepEqual(update.changedFurnitureIds.slice().sort(),targetIds.slice().sort());
  for(const key of ['newFurnitureIds','removedFurnitureIds','replacedFurnitureIds'])assert.deepEqual(update[key],[],`${key}: no new bed, return or replacement furniture`);
  eqFields(update.study,{openingWidthMm:900,openingY:[5280,6180],southShiftFromPreviousMm:300,cumulativeSouthShiftMm:800,
    hingeMm:[2400,6120],hingeSide:'south',closedDirection:[0,-1],openDirection:[-1,0],leafMm:[780,40],doorHeightMm:2150,
    deskMm:[1450,550,740],shelfMm:[1450,282.5,2500],shelfBays:4,shelfClearSpanMm:335,
    returnDeskUnchanged:true,chairUnchanged:true,chairCenterMm:[960,5350],sofaRetained:true},'current study metadata agrees with approved model');
  for(const [key,value] of Object.entries({mainStudyDoorLongitudinalGap:530,southOpeningJambInside:20,fullyOpenLeafToSouthWall:60,
    chairToWestReturnStaticSideGap:100,doorContinuousSweepToDesktop:2400-Math.hypot(780,20)-1570,
    doorContinuousSweepEastOfBookcaseOuterEdge:2400-Math.hypot(780,20)-1570,futureBedSouthToDeskFront:710,
    futureBedFootEast:120,futureBedToReturn:100,futureBedToDoorSweepByY:6120-Math.hypot(780,20)-4940}))
    eq(update.clearancesMm[key],value,`${key}: geometry-derived metadata clearance`);

  const old=beforeFamilyStudyDoor(plan);
  assert.equal(hash(old),baseline.family,'exact reversal must restore the complete 7eb0e0e family scheme');
  assert.equal(hash(beforeFamilyStudyDoor(old)),baseline.family,'reversal must be inert on historical scheme');
  assert.notEqual(hash(plan),baseline.family,'approved family revision must actually change its scheme');
  const oldBundle=beforeFamilyStudyDoor(bundle);
  assert.equal(hash(oldBundle.schemes.family),baseline.family,'bundle reversal must restore historical scheme');
  for(const id of ['wood','laundry','screen']){
    assert.equal(hash(bundle.schemes[id]),baseline[id],`${id}: unauthorized other-scheme change`);
    assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id],`${id}: reversal altered unrelated scheme`);
    assert.equal(bundle.schemes[id].metadata.familyStudyDoorUpdate,undefined,`${id}: unauthorized study metadata`);
  }
  for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(oldBundle[key],bundle[key],`${key}: bundle field changed by reversal`);
  assert.deepEqual(Object.keys(update.previousPlanFields).sort(),['DOORS','WALLS','WALL_META']);
  for(const key of ['DOORS','WALLS','WALL_META'])assert.deepEqual(update.previousPlanFields[key],old[key],`${key}: saved geometry must be exact`);
  assert.deepEqual(update.previousFurniture.map(value=>value.id).sort(),targetIds.slice().sort());
  for(const item of update.previousFurniture)assert.deepEqual(item,furniture(old,item.id),`${item.id}: exact previous furniture snapshot`);
  assert.deepEqual(update.previousFurnitureOrder,old.defaultFurniture.map(value=>value.id),'exact historical furniture order');
  for(const key of ['designCorrections','conditions','converter'])assert.deepEqual(update.previousMetadataFields[key],old.metadata[key],`${key}: exact previous metadata`);

  // Older confirmed revisions remain history. In particular the previous
  // double-leaf SLIDES layer and study/laundry source snapshots are unchanged.
  assert.deepEqual(Object.keys(plan).sort(),Object.keys(old).sort(),'no new top-level plan fields');
  for(const key of Object.keys(old))if(!['DOORS','WALLS','WALL_META','defaultFurniture','metadata'].includes(key))
    assert.deepEqual(plan[key],old[key],`${key}: unauthorized architecture/model change`);
  assert.deepEqual(Object.keys(plan.metadata).filter(key=>!changedMetadataKeys.includes(key)).sort(),
    Object.keys(old.metadata).filter(key=>!changedMetadataKeys.includes(key)).sort(),'no unrelated new metadata');
  for(const key of Object.keys(old.metadata))if(!changedMetadataKeys.includes(key))assert.deepEqual(plan.metadata[key],old.metadata[key],`${key}: historical metadata changed`);
  assert.deepEqual(plan.SLIDES,old.SLIDES,'approved two-leaf/two-track sliding doors must remain exact');
  for(const id of ['door_kitchen','balcony_door']){
    const slide=get(plan,'SLIDES',id);
    assert.equal(slide.panelCount,2,`${id}: retain two leaves`);
    assert.equal(slide.trackCount,2,`${id}: retain two tracks`);
  }
  assert.equal(plan.reviewOnly,undefined,'unpublished review flag');
  assert.equal(plan.studyReview,undefined,'unpublished study review object');

  const study=door(plan,'door_c');
  eqFields(study,{rect:[2340,5280,2460,6180],sourceAxisMm:[2400,5280,2400,6180],h:[2400,6120],
    c:[0,-1],o:[-1,0],len:780,openingWidthMm:900,sillMm:0,heightMm:2150,headMm:2150,
    defaultOpen:true,directionStatus:'user-design-correction',dimensionStatus:'design-pending',placementStatus:'unresolved'},'approved study door');
  eq(study.rect[1]-door(old,'door_c').rect[1],300,'further south shift');
  eq(study.rect[3]-study.rect[1],900,'ordinary hinged-door aperture');
  assert.equal(study.swingRevision,REVISION);
  eqFields(study.operation,{type:'hinged',hingeCm:[240,612],swing:{dx:0,dy:-1,ox:-1,oy:0,sweep:-1},openLeafCm:{x:162,y:610,w:78,d:4}},'study door native operation');
  const openLeaf={x:1620,y:6100,w:780,d:40};
  const native=Object.fromEntries(Object.entries(study.operation.openLeafCm).map(([key,value])=>[key,value*10]));
  eqRect(native,openLeaf,'native centimetres and mm leaf agree');
  const closedLeaf={x:2380,y:5340,w:40,d:780};
  inside(closedLeaf,wallRect(study.rect,'opening'),'40 mm closed leaf fits ordinary aperture');
  eq(6200-(openLeaf.y+openLeaf.d),60,'open slab to south wall model gap');
  eq(6200-study.rect[3],20,'opening to inner south corner remains a conditional small return');

  assert.deepEqual(plan.DOORS.map(value=>value.id),old.DOORS.map(value=>value.id),'door order/count unchanged');
  for(const before of old.DOORS)if(before.id!=='door_c'){
    const after=clone(door(plan,before.id));
    if(before.id==='door_a'){
      assert.match(after.notes,/530/,'main/study opening longitudinal gap must be updated');
      assert.doesNotMatch(after.notes,/错开230|间隔230|重叠270/,'obsolete door gap cannot remain current');
      after.notes=before.notes;
    }
    assert.deepEqual(after,before,`${before.id}: unrelated door geometry/operation changed`);
  }
  eq(study.rect[1]-door(plan,'door_a').rect[3],530,'current main/study longitudinal gap');
  assert.equal(plan.WALLS.length,old.WALLS.length,'no wall removal/addition');
  assert.equal(plan.WALL_META.length,plan.WALLS.length,'wall metadata remains aligned');
  assert.deepEqual(plan.WALLS[29],[2340,3280,2460,5280,'u']);
  assert.deepEqual(plan.WALLS[30],[2340,6180,2460,6260,'u']);
  for(let index=0;index<old.WALLS.length;index++){
    if([29,30].includes(index)){
      assert.deepEqual(plan.WALL_META[index].sourceAxisMm,[2400,3280,2400,6260],`wall ${index}: original axis retained`);
      const restored=clone(plan.WALL_META[index]);restored.notes=old.WALL_META[index].notes;
      assert.deepEqual(restored,old.WALL_META[index],`wall ${index}: only current placement note changes`);
      continue;
    }
    assert.deepEqual(plan.WALLS[index],old.WALLS[index],`wall ${index}: unrelated wall changed`);
    assert.deepEqual(plan.WALL_META[index],old.WALL_META[index],`wall ${index}: unrelated metadata changed`);
  }
  const aperture=wallRect(study.rect,'aperture');
  for(const [index,wall] of plan.WALLS.entries())assert.ok(!overlaps(aperture,wallRect(wall,`wall-${index}`)),`new aperture obstructed by wall ${index}`);

  const expected={
    study_full_desk:{cx:845,cy:5925,w:1450,d:550,rot:0,heightMm:740,roomId:'room_c',sourceFootprintMm:{x:120,y:5650,w:1450,d:550},modelVariant:'north-facing-workstation'},
    'fit-study_bookwall':{cx:845,cy:6058.75,w:1450,d:282.5,rot:0,heightMm:2500,baseWidthMm:1450,baseDepthMm:282.5,baseHeightMm:2500,roomId:'room_c',sourceFootprintMm:{x:120,y:5917.5,w:1450,d:282.5}}
  };
  const allowedFurnitureChanges={
    study_full_desk:['name','cx','w','sourceFootprintMm','notes','layoutRevision'],
    'fit-study_bookwall':['name','cx','w','baseWidthMm','parts','sourceFootprintMm','notes','conditions','cabinetDesign','layoutRevision']
  };
  assert.deepEqual(plan.defaultFurniture.map(value=>value.id),old.defaultFurniture.map(value=>value.id),'no furniture addition/removal/order change');
  assert.deepEqual(Object.keys(update.migrationFields).sort(),targetIds.slice().sort(),'only approved desk and bookwall migrate');
  for(const before of old.defaultFurniture){
    const after=furniture(plan,before.id);
    if(!targetIds.includes(before.id)){
      assert.deepEqual(after,before,`${before.id}: unrelated furniture changed`);
      continue;
    }
    eqFields(after,expected[before.id],`${before.id}: approved geometry`);
    eqRect(worldRect(after),expected[before.id].sourceFootprintMm,`${before.id}: footprint agrees with native geometry`);
    assert.equal(after.layoutRevision,REVISION,`${before.id}: current migration revision`);
    const fields=changedFields(before,after);
    assert.deepEqual(update.migrationFields[before.id].slice().sort(),fields,`${before.id}: migration must enumerate every actual changed field`);
    for(const field of fields)assert.ok(allowedFurnitureChanges[before.id].includes(field),`${before.id}/${field}: unauthorized fixture-field change`);
    const restored=clone(after);
    for(const key of allowedFurnitureChanges[before.id]){
      if(Object.hasOwn(before,key))restored[key]=clone(before[key]);else delete restored[key];
    }
    assert.deepEqual(restored,before,`${before.id}: preserved furniture fields changed`);
  }
  for(const [id,keys] of Object.entries({study_full_desk:['cx','w','sourceFootprintMm'],
    'fit-study_bookwall':['cx','w','baseWidthMm','parts','conditions','cabinetDesign','sourceFootprintMm']}))
    for(const key of keys)assert.ok(update.migrationFields[id].includes(key),`${id}/${key}: browser drafts may not retain obsolete geometry`);

  const desk=furniture(plan,'study_full_desk'),shelf=furniture(plan,'fit-study_bookwall'),returnDesk=furniture(plan,'study_window_return');
  const deskRect=worldRect(desk),returnRect=worldRect(returnDesk),shelfRect=worldRect(shelf);
  eq(deskRect.x,120,'desktop west end');eq(shelfRect.x,120,'bookwall west end');
  eq(deskRect.x+deskRect.w,1570,'desktop approved east end');eq(shelfRect.x+shelfRect.w,1570,'bookwall approved east end');
  eq(openLeaf.x-(deskRect.x+deskRect.w),50,'desktop to fully open leaf-tip nominal gap');
  eq(returnRect.y+returnRect.d,deskRect.y,'original west return and south desk still join');
  assert.ok(!overlaps(deskRect,returnRect),'desktop pieces abut without duplicate overlap');
  assert.deepEqual(returnDesk,furniture(old,'study_window_return'),'original window return untouched');
  const chair=furniture(plan,'family-f5');
  assert.deepEqual(chair,furniture(old,'family-f5'),'chair stays at its original position and does not migrate');
  eqFields(chair,{cx:960,cy:5350,w:480,d:500,rot:0,sourceFootprintMm:{x:720,y:5100,w:480,d:500}},'original chair retained');
  eq(worldRect(chair).x-(returnRect.x+returnRect.w),100,'chair to west return original side gap');
  assert.ok(!overlaps(worldRect(chair),returnRect),'retained chair does not intersect west return desktop');
  assert.deepEqual(furniture(plan,'study_north_sofa'),furniture(old,'study_north_sofa'),'current northern sofa untouched');
  assert.ok(!plan.defaultFurniture.some(value=>/study.*bed|bed.*study|review-study-full-bed/i.test(value.id)),'future bed must not be installed beside the sofa');

  // Rebuilding to 1450 mm must preserve each physical board thickness; reducing
  // a fixture transform would silently thin its boards and is not sufficient.
  assert.ok(shelf.parts.length>40,'complete four-bay native shelf assembly required');
  const nativeEnvelope={x:-725,y:-141.25,w:1450,d:282.5};
  for(const part of shelf.parts){
    assert.ok(part.w>0&&part.d>0&&part.heightMm>0,`${part.id}: positive real solid dimensions`);
    inside({x:part.x,y:part.y,w:part.w,d:part.d},nativeEnvelope,part.id);
    assert.ok(part.elevationMm>=740-tol&&part.elevationMm+part.heightMm<=2500+tol,`${part.id}: intended shelf elevation`);
  }
  const uprights=shelf.parts.filter(part=>part.role==='upright');
  const shelves=shelf.parts.filter(part=>part.role==='shelf');
  const backs=shelf.parts.filter(part=>part.role==='back');
  const cabinetDoors=shelf.parts.filter(part=>part.role==='door');
  const pulls=shelf.parts.filter(part=>part.role==='pull');
  assert.equal(uprights.length,5,'four bays need five uprights');
  assert.equal(shelves.length,16,'four full four-level bays');
  assert.equal(backs.length,1);assert.equal(cabinetDoors.length,4);assert.equal(pulls.length,4);
  for(const part of uprights){eq(part.w,22,`${part.id}: unscaled 22 mm upright`);eq(part.elevationMm,1460,`${part.id}: lower shelf datum`);eq(part.elevationMm+part.heightMm,2500,`${part.id}: top datum`);}
  for(const part of shelves){eq(part.heightMm,22,`${part.id}: unscaled 22 mm shelf`);eq(part.w,335,`${part.id}: rebuilt four-bay clear span`);}
  for(const part of backs){eq(part.d,12,`${part.id}: original 12 mm back`);eq(part.w,1450,`${part.id}: rebuilt back width`);}
  for(const part of cabinetDoors){eq(part.d,18,`${part.id}: original 18 mm cabinet door`);eq(part.w,332,`${part.id}: clear span less original door gaps`);}
  for(const part of pulls)eq(part.d,2.5,`${part.id}: original 2.5 mm pull`);
  eq(shelf.cabinetDesign.boardThicknessMm,22,'cabinet structural board declaration');
  eq(shelf.cabinetDesign.backThicknessMm,12,'cabinet back declaration');
  eq(shelf.cabinetDesign.faces[0].lengthMm,1450,'cabinet face rebuilt width');
  assert.equal(shelf.cabinetDesign.layoutRevision,REVISION);
  const leds=shelf.parts.filter(part=>part.role==='led-strip'),diffusers=shelf.parts.filter(part=>part.role==='light-diffuser');
  assert.equal(leds.length,1,'original working LED remains');assert.equal(diffusers.length,1,'original diffuser remains');
  for(const part of leds){eq(part.elevationMm,1448,`${part.id}: original LED elevation`);eq(part.heightMm,4,`${part.id}: original LED height`);eq(part.w,1402,`${part.id}: length rebuilt without scaling thickness`);}
  for(const part of diffusers){eq(part.elevationMm,1452,`${part.id}: original diffuser elevation`);eq(part.heightMm,8,`${part.id}: original diffuser height`);eq(part.w,1330,`${part.id}: shortened diffuser`);}
  assert.doesNotMatch(JSON.stringify([shelf.conditions,shelf.cabinetDesign]),/1680mm|1680×|392\.5mm/,'current shelf specification must not use old span');

  // Continuous sweeps, not a few sampled swing angles. Actual mounted shelf
  // parts between z=0 and z=2150 are checked individually with their elevation.
  let shelfSolidsThroughDoorHeight=0;
  for(const fixture of plan.defaultFurniture){
    if(fixture.id===shelf.id)continue;
    const bottom=fixture.elevationMm||0,top=bottom+(fixture.heightMm||0);
    if(top>0&&bottom<study.heightMm)assert.ok(!sweptLeafHits(study,worldRect(fixture)),`${fixture.id}: continuous 40 mm leaf collides with furniture`);
  }
  for(const part of shelf.parts)if(part.elevationMm<study.heightMm&&part.elevationMm+part.heightMm>0){
    shelfSolidsThroughDoorHeight++;
    assert.ok(!sweptLeafHits(study,partRect(shelf,part)),`${part.id}: actual mounted solid within door height intersects continuous leaf sweep`);
  }
  assert.ok(shelfSolidsThroughDoorHeight>20,'test must include the shelf/lighting solids overlapping door height');
  for(const [index,wall] of plan.WALLS.entries())assert.ok(!sweptLeafHits(study,wallRect(wall,`wall-${index}`)),`wall ${index}: continuous leaf sweep intersects wall`);
  assert.ok(sweptLeafHits(study,worldRect(furniture(old,'study_full_desk'))),'negative control: proposed swing hits the old 1680 desktop');
  const oldShelf=furniture(old,'fit-study_bookwall');
  const previousShelfHits=oldShelf.parts.filter(part=>part.elevationMm<study.heightMm&&part.elevationMm+part.heightMm>0)
    .filter(part=>sweptLeafHits(study,partRect(oldShelf,part)));
  assert.ok(previousShelfHits.some(part=>part.role==='upright')&&previousShelfHits.some(part=>part.role==='shelf'),
    'negative control: old mounted 1680 shelf clashes, so a generic suspended-shelf exemption is invalid');

  const future=old.metadata.familyStudyLaundryUpdate.futureBed;
  eqFields(future,{mattressMm:[1500,2000],assumedFrameMm:[1600,2100],sourceFootprintMm:{x:120,y:3340,w:2100,d:1600},
    replacesFurnitureId:'study_north_sofa',notSameTime:true,addedToCurrentScene:false},'future replacement-bed historical assumption');
  const futureRect={id:'future-reservation-only',...future.sourceFootprintMm};
  assert.ok(!sweptLeafHits(study,futureRect),'continuous 40 mm leaf sweep must clear future replacement-bed envelope');
  assert.ok(!overlaps(futureRect,deskRect)&&!overlaps(futureRect,returnRect),'future bed must clear both desktop portions');
  eq(deskRect.y-(futureRect.y+futureRect.d),710,'shared chair/bed-side band remains');
  eq(2340-(futureRect.x+futureRect.w),120,'bed-foot sliver remains, not a passage');
  eq(returnRect.y-(futureRect.y+futureRect.d),100,'bed to west return remains');
  if(update.futureBed)eqFields(update.futureBed,{mattressMm:[1500,2000],assumedFrameMm:[1600,2100],sourceFootprintMm:future.sourceFootprintMm,
    replacesFurnitureId:'study_north_sofa',notSameTime:true,addedToCurrentScene:false},'current future-bed reservation');

  const oldCorrections=old.metadata.designCorrections||[];
  assert.equal(plan.metadata.designCorrections.length,oldCorrections.length+1,'append exactly one approved correction');
  assert.deepEqual(plan.metadata.designCorrections.slice(0,-1),oldCorrections,'all older correction history unchanged');
  const correction=plan.metadata.designCorrections.at(-1);
  assert.equal(correction.id,REVISION);assert.equal(correction.date,'2026-10-12');
  assert.equal(correction.sourceSnapshotsUnchanged,true);
  const oldConditions=old.metadata.conditions||[];
  assert.equal(plan.metadata.conditions.length,oldConditions.length+1,'append one current study condition');
  let currentStudyConditionReplacements=0;
  for(const [index,before] of oldConditions.entries()){
    const after=plan.metadata.conditions[index];
    if(before.startsWith('方案2书房900门洞南移500，7字桌与1680浅书墙；')){
      currentStudyConditionReplacements++;
      assert.equal(after,before.replace('方案2书房900门洞南移500，7字桌与1680浅书墙；与主卧门洞纵向间隔230mm，历史270mm投影重叠说明已由本轮替代。',
        '方案2书房900门洞累计南移800，本轮再南移300并改南铰内开；7字南桌与浅书墙1450，与主卧门洞纵向间隔530mm。'),
        'only the old active study sentence may be refreshed; its bathroom/balcony qualifications stay');
    }else assert.equal(after,before,`condition ${index}: unrelated prior condition changed`);
  }
  assert.equal(currentStudyConditionReplacements,1,'refresh exactly the previous active study condition');
  assert.equal(plan.metadata.converter,(old.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-study-door-20261012.cjs');
  const currentNotes=JSON.stringify([update.conditions,update.assumptions,plan.metadata.conditions.slice((old.metadata.conditions||[]).length),study.notes]);
  assert.match(currentNotes,/1450/,'record approved desk/bookwall width');
  assert.match(currentNotes,/南铰|南侧.*(?:铰|合页)/,'record south hinge');
  assert.match(currentNotes,/710/,'record shared future bed/chair band');
  assert.match(currentNotes,/120/,'retain bed-foot qualification');
  assert.match(currentNotes,/不是通道|不.*通路|not.*(?:passage|path)/i,'do not treat bed-foot sliver as usable passage');
  assert.match(currentNotes,/收椅|移开|(?:stow|remove).*chair/i,'future bed/chair qualification');
  assert.match(currentNotes,/20.*(?:待核|复核|复尺|深化|核对|核实)|(?:待核|复核|复尺|深化|核对|核实).*20/,'small inner corner needs a current qualification');

  const originalHash=hash(bundle),historicalHash=hash(oldBundle);
  assert.equal(hash(applyFamilyStudyDoor(clone(oldBundle))),originalHash,'exact reversal and reapply must deterministically reproduce complete bundle');
  assert.equal(hash(oldBundle),historicalHash,'reapply must not mutate saved historical bundle');
  assert.equal(hash(bundle),originalHash,'verification/reversal must not mutate current bundle');
  assert.throws(()=>applyFamilyStudyDoor(clone(bundle)),/already|applied|duplicate/i,'reject duplicate application');
  return {status:'PASS',revision:REVISION,scheme:'family',fullHistoricalHashRestored:true,roundTripDeterministic:true,
    otherSchemesUnchanged:true,twoLeafSlidesUnchanged:true,onlyApprovedStudyFurnitureChanged:true,
    continuous40mmDoorSweepsClear:true,mountedShelfSolidsAudited:shelfSolidsThroughDoorHeight,
    originalDeskAndShelfCollisionControls:true,structuralBoardsRebuiltWithoutScaling:true,ledRetained:true,
    futureBedMetadataOnly:true,exactMigrationFields:true,modelOnly:true,
    clearancesMm:{furtherDoorSouthShift:300,mainStudyDoorLongitudinalGap:530,openLeafToSouthWall:60,
      openingToInnerSouthCornerPending:20,openLeafTipToDeskNominal:50,bedSideSharedChairBand:710,bedFootNotPassage:120}};
}

module.exports={verifyFamilyStudyDoor,beforeFamilyStudyDoor,baseline,REVISION};
if(require.main===module)console.log(JSON.stringify(verifyFamilyStudyDoor(require(path.join(root,'data/house-plans.js'))),null,2));
