'use strict';

// Geometry and provenance only. A pass is not a plumbing, appliance installation,
// bearing-wall, comfort, accessibility, hardware or construction certification.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {beforeFamilyStudyLaundry, applyFamilyStudyLaundry, REVISION} = require('../tools/family-study-laundry-20261011.cjs');
const {beforeFamilyDoorRefinement} = require('../tools/family-door-refinement-20261011.cjs');
const {beforeFamilyStudyDoor} = require('../tools/family-study-door-20261012.cjs');
const {sweptLeafHits} = require('./family-bath-review-20261011.cjs');
const clone = value => structuredClone(value);
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
// Frozen by reading git show 67dc96b:data/house-plans.js BEFORE this layer was
// generated, not by hashing the new output and declaring it a historical baseline.
const baseline = Object.freeze({
  wood: '49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
  family: '24b536726b2a5c4bd8be2eed6967fd20967c634d792eb8f85962961cb6601da9',
  laundry: 'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
  screen: 'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const changedIds = ['study_full_desk','family-f5','fit-study_bookwall','vanity_guest','laundry_washer','laundry_dryer'];
const newIds = ['study_window_return'];
const removedIds = ['fit-laundry_wall','fit-laundry_basin'];
const tolerance = .02;
const eq = (a, b, label) => assert.ok(Math.abs(a - b) <= tolerance, `${label}: ${a} != ${b}`);
const eqFields = (actual, expected, keys, label) => keys.forEach(key => assert.deepEqual(actual[key], expected[key], `${label}/${key}`));
const get = (plan, field, id) => {const item = plan[field].find(value => value.id === id); assert.ok(item, `${field}/${id}: missing`); return item;};
const furniture = (plan, id) => get(plan, 'defaultFurniture', id);
const door = (plan, id) => get(plan, 'DOORS', id);
const rectFromWall = value => ({x:value[0], y:value[1], w:value[2]-value[0], d:value[3]-value[1]});
const worldRect = item => {
  const a = (item.rot || 0)*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w=item.w*c+item.d*s, d=item.w*s+item.d*c;
  return {x:item.cx-w/2, y:item.cy-d/2, w, d};
};
const eqRect = (actual, expected, label) => ['x','y','w','d'].forEach(key => eq(actual[key], expected[key], `${label}/${key}`));
const overlaps = (a,b) => Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>tolerance && Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>tolerance;
const rectInside = (inner, outer, label) => {
  assert.ok(inner.x>=outer.x-tolerance && inner.y>=outer.y-tolerance && inner.x+inner.w<=outer.x+outer.w+tolerance && inner.y+inner.d<=outer.y+outer.d+tolerance, `${label}: outside room/envelope`);
};
const partRect = (f,p) => {
  assert.equal(f.rot,0,'part-volume test needs unrotated native fixture');
  return {x:f.cx+p.x,y:f.cy+p.y,w:p.w,d:p.d};
};
const openLeaf = d => {
  const [hx,hy]=d.h,[dx,dy]=d.o;
  return dx ? {x:Math.min(hx,hx+dx*d.len),y:hy-20,w:d.len,d:40}
    : {x:hx-20,y:Math.min(hy,hy+dy*d.len),w:40,d:d.len};
};

function verifyFamilyStudyLaundry(bundle) {
  bundle=beforeFamilyDoorRefinement(beforeFamilyStudyDoor(bundle));
  assert.equal(REVISION,'family-study-laundry-confirmed-20261011');
  assert.equal(bundle.defaultScheme,'family');
  assert.deepEqual(Object.keys(bundle.schemes).sort(),['family','laundry','screen','wood']);
  const plan=bundle.schemes.family, update=plan.metadata.familyStudyLaundryUpdate;
  assert.ok(update,'family: confirmed study/laundry layer was not applied');
  assert.equal(update.id,REVISION);
  assert.equal(update.status,'applied-owner-confirmed');
  assert.equal(update.sourceSnapshotsUnchanged,true,'imported source snapshots must remain reference facts');
  assert.deepEqual(update.changedFurnitureIds.slice().sort(),changedIds.slice().sort());
  assert.deepEqual(update.newFurnitureIds,newIds);
  assert.deepEqual(update.removedFurnitureIds.slice().sort(),removedIds.slice().sort());
  for(const [id,keys] of Object.entries({
    study_full_desk:['cx','w','sourceFootprintMm'],
    'family-f5':['cx','sourceFootprintMm'],
    'fit-study_bookwall':['cx','w','baseWidthMm','parts','conditions','cabinetDesign','sourceFootprintMm'],
    vanity_guest:['type','nativeType','cx','cy','w','d','heightMm','parts','sourceFootprintMm'],
    laundry_washer:['cx','cy','d','heightMm','sourceFootprintMm'],
    laundry_dryer:['cy','d','heightMm','sourceFootprintMm']
  })) for(const key of keys) assert.ok(update.migrationFields[id]?.includes(key),`${id}: old browser drafts may not retain obsolete ${key}`);
  assert.equal(plan.reviewOnly,undefined,'unpublished confirmation flags must not enter production');
  assert.equal(plan.studyReview,undefined,'unpublished study-review status must not enter production');
  const old=beforeFamilyStudyLaundry(plan);
  assert.equal(hash(old),baseline.family,'family: before helper must reproduce full pre-layer baseline, including order and metadata');
  assert.equal(hash(beforeFamilyStudyLaundry(old)),baseline.family,'reversal must be safely inert on a pre-layer model');
  for(const id of ['wood','laundry','screen']) {
    assert.equal(bundle.schemes[id].metadata.familyStudyLaundryUpdate,undefined,`${id}: unauthorized new metadata`);
    assert.equal(hash(bundle.schemes[id]),baseline[id],`${id}: unauthorized model change`);
  }
  const reapply={...clone(bundle),schemes:{...clone(bundle.schemes),family:clone(old)}};
  const reapplied=applyFamilyStudyLaundry(reapply);
  assert.equal(hash(reapplied.schemes.family),hash(plan),'confirmed layer round-trip must be deterministic');
  assert.equal(hash(old),baseline.family,'reapply must not mutate reverse snapshot');
  assert.throws(()=>applyFamilyStudyLaundry(clone(bundle)),/already|applied/i,'refuse duplicate layer application');
  // Old source and historical overlays are reference facts, not rewritten inputs.
  for(const key of ['measurementUpdate','cabinetUpdate','bedroomUpdate','familyBathUpdate'])
    assert.deepEqual(plan.metadata[key],old.metadata[key],`${key}: earlier confirmed history changed`);
  for(const key of ['WINS','WIN_META','BAYS','BIFOLDS','HEIGHT_MM','PLAN_BOUNDS','BOUNDS','CENTER'])
    assert.deepEqual(plan[key],old[key],`${key}: unauthorized window/envelope change`);

  const studyDoor=door(plan,'door_c');
  eqFields(studyDoor,{rect:[2340,4980,2460,5880],sourceAxisMm:[2400,4980,2400,5880],h:[2400,5040],c:[0,1],o:[-1,0],len:780,openingWidthMm:900,heightMm:2150,headMm:2150,sillMm:0},
    ['rect','sourceAxisMm','h','c','o','len','openingWidthMm','heightMm','headMm','sillMm'],'study ordinary door');
  assert.equal(studyDoor.defaultOpen,true);
  assert.equal(studyDoor.directionStatus,'user-design-correction');
  assert.equal(studyDoor.dimensionStatus,'design-pending');
  eq(studyDoor.rect[1]-door(old,'door_c').rect[1],500,'study door south shift');
  assert.equal(studyDoor.operation.type,'hinged');
  assert.deepEqual(studyDoor.operation.hingeCm,[240,504]);
  assert.deepEqual(studyDoor.operation.swing,{dx:0,dy:1,ox:-1,oy:0,sweep:1});
  assert.deepEqual(studyDoor.operation.openLeafCm,{x:162,y:502,w:78,d:4});
  eqRect(openLeaf(studyDoor),{x:1620,y:5020,w:780,d:40},'40 mm study open leaf');
  const expectedWalls={19:[6750,11100,6870,11210,'u'],29:[2340,3280,2460,4980,'u'],30:[2340,5880,2460,6260,'u']};
  for(const [index,value] of Object.entries(expectedWalls)) assert.deepEqual(plan.WALLS[index],value,`wall ${index}: sealed old hole/cut new hole`);
  assert.equal(plan.WALLS.length,old.WALLS.length-1,'remove only obsolete balcony north return wall');
  assert.equal(plan.WALL_META.length,plan.WALLS.length);
  for(let index=0;index<old.WALLS.length;index++) {
    if([19,29,30,40].includes(index)) continue;
    const currentIndex=index>40?index-1:index;
    assert.deepEqual(plan.WALLS[currentIndex],old.WALLS[index],`historical wall ${index}: unauthorized change`);
    assert.deepEqual(plan.WALL_META[currentIndex],old.WALL_META[index],`historical wall metadata ${index}: unauthorized change`);
  }
  assert.deepEqual(plan.WALL_META[19].sourceAxisMm,[6810,9600,6810,11210]);
  for(const index of [29,30]) assert.deepEqual(plan.WALL_META[index].sourceAxisMm,[2400,3280,2400,6260]);
  for(const d of old.DOORS) if(d.id!=='door_c') {
    const current=clone(door(plan,d.id));
    if(d.id==='door_a') {
      assert.match(current.notes,/230/,'main/study opening projection note must be refreshed after study south move');
      assert.doesNotMatch(current.notes,/重叠270|overlap.*270/i,'old projected opening overlap is no longer current');
      current.notes=d.notes;
    }
    assert.deepEqual(current,d,`${d.id}: other hinged door changed beyond main-door clearance notes`);
  }
  const studyAperture=rectFromWall(studyDoor.rect);
  for(const [index,w] of plan.WALLS.entries()) assert.ok(!overlaps(studyAperture,rectFromWall(w)),`study doorway obstructed by full-height wall ${index}`);

  const balconySlide=get(plan,'SLIDES','balcony_door');
  eqFields(balconySlide,{rect:[6750,9600,6870,11100],sourceAxisMm:[6810,9600,6810,11100],openingWidthMm:1500,heightMm:2400},['rect','sourceAxisMm','openingWidthMm','heightMm'],'restored balcony door');
  eq(balconySlide.sourceAxisMm[0]-get(old,'SLIDES','balcony_door').sourceAxisMm[0],287.5,'door east return from living');
  for(const key of ['v','panelCount','trackCount','stackTo','surface','defaultOpen','glass','sillMm','headMm']) assert.deepEqual(balconySlide[key],get(old,'SLIDES','balcony_door')[key],`balcony operation/${key}`);
  for(const slide of old.SLIDES) if(slide.id!=='balcony_door') assert.deepEqual(get(plan,'SLIDES',slide.id),slide,`${slide.id}: unauthorized sliding-door change`);
  assert.deepEqual(get(plan,'ROOMS','balcony').poly,[[6870,9660],[8290,9660],[8290,11150],[6870,11150]]);
  assert.deepEqual(get(plan,'ROOMS','living').poly,[[2460,3340],[3375,3340],[3375,6320],[6750,6320],[6750,11150],[5300,11150],[5300,13890],[2120,13890],[2120,6320],[2960,6320],[2460,6320]]);
  for(const room of old.ROOMS) if(!['living','balcony'].includes(room.id)) assert.deepEqual(get(plan,'ROOMS',room.id),room,`${room.id}: room footprint changed`);
  assert.ok(plan.WINS.some(w=>JSON.stringify(w)==='[6870,9540,8290,9660]'),'keep north open view/window');
  assert.ok(plan.WINS.some(w=>JSON.stringify(w)==='[8290,9660,8410,11150]'),'keep east open view/window');

  const expectedFurniture={
    study_full_desk:{cx:960,cy:5925,w:1680,d:550,rot:0,heightMm:740,roomId:'room_c',sourceFootprintMm:{x:120,y:5650,w:1680,d:550}},
    study_window_return:{cx:370,cy:5345,w:500,d:610,rot:0,heightMm:740,roomId:'room_c',sourceFootprintMm:{x:120,y:5040,w:500,d:610}},
    'family-f5':{cx:960,cy:5350,w:480,d:500,rot:0,heightMm:900,roomId:'room_c',sourceFootprintMm:{x:720,y:5100,w:480,d:500}},
    'fit-study_bookwall':{cx:960,cy:6058.75,w:1680,d:282.5,rot:0,heightMm:2500,roomId:'room_c',sourceFootprintMm:{x:120,y:5917.5,w:1680,d:282.5}},
    vanity_guest:{cx:4690,cy:5290,w:1100,d:600,rot:0,heightMm:920,roomId:'bath_2',sourceFootprintMm:{x:4140,y:4990,w:1100,d:600}},
    laundry_washer:{cx:4479,cy:5305,w:600,d:530,rot:0,heightMm:840,roomId:'bath_2',sourceFootprintMm:{x:4179,y:5040,w:600,d:530}},
    laundry_dryer:{cx:7650,cy:10750,w:600,d:600,rot:180,heightMm:840,roomId:'balcony',sourceFootprintMm:{x:7350,y:10450,w:600,d:600}}
  };
  for(const [id,expected] of Object.entries(expectedFurniture)) {
    const f=furniture(plan,id);
    eqFields(f,expected,Object.keys(expected),`${id} confirmed footprint`);
    eqRect(worldRect(f),expected.sourceFootprintMm,`${id} rotated native agreement`);
  }
  assert.equal(furniture(plan,'study_full_desk').modelVariant,'north-facing-workstation','monitor faces the north-side seat without changing the desk footprint');
  assert.equal(furniture(plan,'study_window_return').modelVariant,'bare-worktop','window return must not gain a second oversize monitor');
  const targetIds=new Set([...changedIds,...newIds,...removedIds]);
  for(const f of old.defaultFurniture) if(!targetIds.has(f.id)) assert.deepEqual(furniture(plan,f.id),f,`${f.id}: unrelated furniture changed`);
  const expectedOrder=old.defaultFurniture.filter(f=>!removedIds.includes(f.id)).map(f=>f.id).concat(newIds);
  assert.deepEqual(plan.defaultFurniture.map(f=>f.id),expectedOrder,'only remove two obsolete fixtures and append return desk');
  assert.equal(new Set(plan.defaultFurniture.map(f=>f.id)).size,plan.defaultFurniture.length,'duplicate furniture ID');
  for(const id of removedIds) assert.ok(!plan.defaultFurniture.some(f=>f.id===id),`${id}: obsolete double-machine assembly still present`);
  assert.deepEqual(furniture(plan,'study_north_sofa'),furniture(old,'study_north_sofa'),'current sofa retained unchanged');
  assert.ok(!plan.defaultFurniture.some(f=>/review-study-full-bed|study.*bed|bed.*study/.test(f.id)),'future complete bed is reservation metadata, not another production furniture object');

  const washer=furniture(plan,'laundry_washer'),dryer=furniture(plan,'laundry_dryer'),vanity=furniture(plan,'vanity_guest');
  assert.equal(washer.type,'washer'); assert.equal(dryer.type,'dryer');
  assert.equal(washer.face,'south'); assert.equal(dryer.face,'north');
  assert.equal(washer.dimensionStatus,'owner-provided'); assert.equal(dryer.dimensionStatus,'owner-provided');
  assert.equal(vanity.type,'fixture'); assert.equal(vanity.nativeType,'vanity'); assert.ok(vanity.parts.length>6,'integrated vanity must contain real independent panels/top/basin, not a solid placeholder');
  eq(vanity.baseWidthMm,1100,'vanity base width'); eq(vanity.baseDepthMm,600,'vanity base depth');
  eq(vanity.baseHeightMm,920,'vanity body base height');
  assert.ok(vanity.assemblyHeightMm>=1850,'mirror/tap native assembly height must not be confused with countertop height');
  const sides=vanity.parts.filter(p=>['side-panel','partition','upright','cabinet-side','cabinet-divider'].includes(p.role));
  assert.ok(sides.length>=3,'independent washer bay requires left/partition/right 18 mm panels');
  for(const panel of sides) {eq(panel.w,18,`${panel.id} true 18 mm board, not rescaled from old cabinet`); eq(panel.elevationMm,0,`${panel.id} floor support`);}
  const washerRect=worldRect(washer),cabRect=worldRect(vanity);
  eq(washerRect.x-(cabRect.x+18),21,'washer left side gap after 18 mm panel');
  eq(4800-(washerRect.x+washerRect.w),21,'washer right side gap to divider');
  eq(washerRect.y-cabRect.y,50,'washer rear conditional gap');
  eq(890-washer.heightMm,50,'washer top conditional gap below top, no loading');
  const bottomOfCounter=vanity.parts.filter(p=>p.role==='countertop');
  assert.ok(bottomOfCounter.length>=3,'countertop must be split into solids around separate basin opening');
  for(const p of bottomOfCounter) {eq(p.elevationMm,890,`${p.id} counter underside`);eq(p.heightMm,30,`${p.id} counter thickness`);}
  const sinkCutout={x:4840,y:5040,w:360,d:350};
  for(const p of bottomOfCounter) assert.ok(!overlaps(partRect(vanity,p),sinkCutout),`${p.id}: countertop solid crosses sink cutout`);
  const basinParts=vanity.parts.filter(p=>/basin/.test(p.role));
  assert.ok(basinParts.length>=5,'basin must be hollow walls and bottom, not an obstructing solid');
  for(const p of basinParts) assert.ok(partRect(vanity,p).x>=4840-tolerance,`${p.id}: basin/plumbing must be right of washer bay`);
  // Full 3D intersection audit of independent cabinet solids and machine body.
  for(const p of vanity.parts) {
    assert.ok(p.w>0 && p.d>0 && p.heightMm>0,`${p.id}: positive solid dimensions`);
    rectInside(partRect(vanity,p),cabRect,`${p.id}: native integrated cabinet footprint`);
    if(p.elevationMm<washer.heightMm-tolerance && p.elevationMm+p.heightMm>tolerance)
      assert.ok(!overlaps(partRect(vanity,p),washerRect),`${p.id}: real cabinet solid intersects washer body`);
  }
  eq(6200-(cabRect.y+cabRect.d),610,'guest counter front to south wall remains tight');
  eq(worldRect(furniture(plan,'family-f14')).x-(cabRect.x+cabRect.w),40,'guest counter to WC remains tight');
  rectInside(worldRect(dryer),{x:6870,y:9660,w:1240,d:1490},'single dryer fits conservative measured balcony band');
  eq(11150-(worldRect(dryer).y+worldRect(dryer).d),100,'dryer rear conditional band');
  eq(worldRect(dryer).y-9660,790,'single dryer front operating band');
  assert.equal(plan.defaultFurniture.filter(f=>f.roomId==='balcony'&&['washer','dryer'].includes(f.type)).length,1,'balcony has one dryer only');

  const shelf=furniture(plan,'fit-study_bookwall');
  assert.equal(shelf.type,'fixture');
  eq(shelf.baseWidthMm,shelf.w,'rebuilt shelf width cannot use scale shrink');
  eq(shelf.baseDepthMm,shelf.d,'rebuilt shelf depth cannot use scale shrink');
  eq(shelf.baseHeightMm,2500,'shelf top height');
  assert.ok(shelf.parts.length>20,'rebuild native shelf parts instead of hiding shelf or keeping empty planar projection');
  const uprights=shelf.parts.filter(p=>p.role==='upright');
  assert.equal(uprights.length,5,'four rebuilt bays have five full-thickness uprights');
  for(const p of uprights) {eq(p.w,22,`${p.id}: structural upright remains 22 mm`);eq(p.elevationMm,1460,`${p.id}: wall-hung floor clearance`);eq(p.elevationMm+p.heightMm,2500,`${p.id}: reaches 2500`);}
  for(const p of shelf.parts.filter(p=>p.role==='shelf')) eq(p.heightMm,22,`${p.id}: structural shelf remains 22 mm`);
  for(const p of shelf.parts.filter(p=>p.role==='back')) eq(p.d,12,`${p.id}: back remains 12 mm`);
  const LEDs=shelf.parts.filter(p=>p.role==='led-strip');
  assert.ok(LEDs.length>0,'working shelf underside LED retained');
  for(const p of LEDs) assert.ok(p.elevationMm+p.heightMm<=1460+tolerance,`${p.id}: strip on underside, not through shelves`);
  const nativeOuter={x:-840,y:-141.25,w:1680,d:282.5};
  for(const p of shelf.parts) {
    rectInside({x:p.x,y:p.y,w:p.w,d:p.d},nativeOuter,`${p.id} shelf horizontal native envelope`);
    assert.ok(p.elevationMm>=740 && p.elevationMm+p.heightMm<=2500+tolerance,`${p.id}: above desk and below approved shelf top`);
  }
  assert.ok(!/六格|2220mm|344mm/.test(JSON.stringify(shelf.conditions)),'new shelf notes must not claim the old width/six-bay layout');

  // Door sweeps are continuous quarter sectors expanded for a 40 mm slab.
  // Audit future bed, desks and chair but not the suspended shelf projection;
  // every shelf solid is above the desk and tested separately for elevation.
  const futureBed={id:'future-reservation-only',type:'bed',cx:1170,cy:4140,w:1600,d:2100,rot:-90,heightMm:480};
  const futureRect=worldRect(futureBed);
  assert.deepEqual(update.futureBed.mattressMm,[1500,2000]);
  assert.deepEqual(update.futureBed.assumedFrameMm,[1600,2100]);
  assert.deepEqual(update.futureBed.sourceFootprintMm,{x:120,y:3340,w:2100,d:1600});
  assert.equal(update.futureBed.replacesFurnitureId,'study_north_sofa');
  assert.equal(update.futureBed.notSameTime,true);
  assert.equal(update.futureBed.addedToCurrentScene,false);
  eqRect(futureRect,{x:120,y:3340,w:2100,d:1600},'future frame assumption, not selected product');
  const southDesk=worldRect(furniture(plan,'study_full_desk')),westDesk=worldRect(furniture(plan,'study_window_return'));
  assert.ok(!overlaps(southDesk,westDesk),'7-shaped desk portions abut without duplicate overlap');
  eq(westDesk.y+westDesk.d,southDesk.y,'return and south desktop join');
  eq(southDesk.x,120,'south desk reaches west wall');
  eq(westDesk.x,120,'window return aligned west wall');
  eq(6200-westDesk.y,1160,'full west leg including corner depth');
  for(const f of [futureBed,furniture(plan,'study_full_desk'),furniture(plan,'study_window_return'),furniture(plan,'family-f5')]) {
    assert.ok(!sweptLeafHits(studyDoor,worldRect(f)),`${f.id}: continuous study door sweep clash`);
  }
  assert.ok(!overlaps(futureRect,southDesk)&&!overlaps(futureRect,westDesk),'future full frame overlaps 7-shaped desktop');
  eq(southDesk.y-(futureRect.y+futureRect.d),710,'shared chair/bed side band');
  eq(2340-(futureRect.x+futureRect.w),120,'bed foot sliver is not a passage');
  eq(openLeaf(studyDoor).y-(futureRect.y+futureRect.d),80,'bed to full-open study leaf');
  eq(westDesk.y-(futureRect.y+futureRect.d),100,'bed to west desk segment');
  const studyWallObstacles=plan.WALLS.map((w,i)=>({id:`wall-${i}`,...rectFromWall(w)}));
  for(const w of studyWallObstacles) assert.ok(!sweptLeafHits(studyDoor,w),`study continuous leaf hits ${w.id}`);
  const guestDoor=door(plan,'door_bath_2');
  assert.equal(guestDoor.openingWidthMm,750);
  for(const f of [washer,vanity,furniture(plan,'family-f14'),furniture(plan,'family-f15')]) assert.ok(!sweptLeafHits(guestDoor,worldRect(f)),`${f.id}: guest door sweep clash`);
  for(const w of studyWallObstacles) assert.ok(!sweptLeafHits(guestDoor,w),`guest continuous leaf hits ${w.id}`);
  const notes=JSON.stringify(update);
  assert.match(notes,/收椅|移开|(?:stow|remove).*chair/i,'future bed cannot quietly promise simultaneous normal desk seating');
  assert.match(notes,/710|71/,'record shared tight bed/desk band');
  assert.match(notes,/120/,'record bed-foot gap separately');
  assert.match(notes,/不是通道|不.*通路|not.*(?:passage|path)/i,'do not present 120 mm as a pathway');
  assert.match(notes,/180|18厘米|18cm/,'unresolved balcony measured-width closure must remain explicit');
  assert.match(notes,/610|61/,'unresolved guest bathroom front band must remain explicit');

  // Authority file is optional in a portable repo, but if present, match every
  // geometric field to the actual owner-confirmed current-sofa planar drawing.
  const draftPath=path.resolve(root,'../output/family-study-bed-review-20261011/方案2_书房调整_当前沙发草案.json');
  if(fs.existsSync(draftPath)) {
    const draft=JSON.parse(fs.readFileSync(draftPath,'utf8'));
    for(const id of Object.keys(expectedFurniture)) eqFields(furniture(plan,id),furniture(draft,id),Object.keys(expectedFurniture[id]),`${id}: owner-confirmed draft`);
    eqFields(studyDoor,door(draft,'door_c'),['rect','sourceAxisMm','h','c','o','len','openingWidthMm','heightMm'],'draft study door');
    assert.deepEqual(plan.WALLS,draft.WALLS,'draft wall rectangles');
    assert.deepEqual(plan.WINS,draft.WINS,'draft windows');
    for(const id of ['balcony','living']) assert.deepEqual(get(plan,'ROOMS',id).poly,get(draft,'ROOMS',id).poly,`${id}: draft room boundary`);
  }
  return {status:'PASS',revision:REVISION,scheme:'family',fullHistoricalHashRestored:true,roundTripDeterministic:true,otherSchemesUnchanged:true,
    continuous40mmDoorSweepsClear:true,realWasherBaySolidsClear:true,hollowRightBasinAndCutout:true,rebuiltShelfNoStructuralScaleShrink:true,
    futureBedMetadataOnly:true,modelOnly:true,clearancesMm:{studyDoorSouthShift:500,bedSideSharedChairBand:710,bedFootNotPath:120,bedToOpenDoor:80,
      guestCounterFrontTight:610,guestCounterToWCTight:40,washerSidesConditional:21,washerTopConditional:50,washerRearConditional:50,dryerFrontConditional:790,dryerRearConditional:100},
    warnings:['1500×2000 mattress, frame envelope 2100×1600 is an assumption; future bed replaces sofa.','710 mm is shared with chair, 120 mm bed foot is not a path.',
      'Guest front 610 mm and WC side 40 mm are tight; appliance open-door/hoses/installation need site verification.','Balcony model width 1420 vs measured 1240 is unresolved 180 mm; outside walls were not shifted.']};
}

module.exports={verifyFamilyStudyLaundry,beforeFamilyStudyLaundry,baseline,REVISION};
if(require.main===module) console.log(JSON.stringify(verifyFamilyStudyLaundry(require(path.join(root,'data/house-plans.js'))),null,2));
