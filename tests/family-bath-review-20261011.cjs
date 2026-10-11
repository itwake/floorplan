'use strict';

// The owner-confirmed planar review is the authority for this generated layer.
// These checks prove model geometry only: no access, comfort, drainage, bearing
// wall, door hardware or construction certification is implied by a pass.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {beforeFamilyStudyLaundry} = require('../tools/family-study-laundry-20261011.cjs');
const root = path.resolve(__dirname, '..');
const REVISION = 'family-master-bath-confirmed-20261011';
const clone = value => structuredClone(value);
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
// Frozen from a6f2ac8, the deployed bundle before this confirmation was applied.
const baseline = {
  wood: '49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
  family: '44f5d5c252322aff0d7f6678af01bd283bd313b1c37bd875b57d023db11e437e',
  laundry: 'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
  screen: 'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
};
const tol = .02;
const eq = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual} != ${expected}`);
const getDoor = (plan, id) => {const value = plan.DOORS.find(item => item.id === id); assert.ok(value, `${plan.id}/${id}: door missing`); return value;};
const getFurniture = (plan, id) => {const value = plan.defaultFurniture.find(item => item.id === id); assert.ok(value, `${plan.id}/${id}: furniture missing`); return value;};
const worldRect = value => {
  const angle = value.rot * Math.PI / 180, c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  const w = value.w * c + value.d * s, d = value.w * s + value.d * c;
  return {x:value.cx - w / 2, y:value.cy - d / 2, w, d};
};
const eqRect = (actual, expected, label) => {for (const key of ['x','y','w','d']) eq(actual[key], expected[key], `${label}/${key}`);};
const overlaps = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > tol && Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y) > tol;

function beforeFamilyBathReview(plan) {
  const previous = beforeFamilyStudyLaundry(plan), revision = previous.metadata.familyBathUpdate;
  if (!revision) return previous;
  assert.equal(previous.id, 'family', 'bath confirmation layer must only occur in family');
  assert.equal(revision.id, REVISION);
  for (const door of revision.previousDoors) {
    const index = previous.DOORS.findIndex(value => value.id === door.id);
    assert.ok(index >= 0, `cannot reverse missing ${door.id}`);
    previous.DOORS[index] = clone(door);
  }
  for (const entry of revision.previousWalls) previous.WALLS[entry.index] = clone(entry.wall);
  for (const furniture of revision.previousFurniture) {
    const index = previous.defaultFurniture.findIndex(value => value.id === furniture.id);
    assert.ok(index >= 0, `cannot reverse missing ${furniture.id}`);
    previous.defaultFurniture[index] = clone(furniture);
  }
  for (const [current, saved] of [['designCorrections','previousDesignCorrections'],['conditions','previousConditions'],['converter','previousConverter']]) {
    if (revision[saved] === undefined) delete previous.metadata[current];
    else previous.metadata[current] = clone(revision[saved]);
  }
  delete previous.metadata.familyBathUpdate;
  return previous;
}

// Continuous cardinal quarter-sector test, not sampled door angles. Inflating
// obstacles by half the 40 mm leaf thickness conservatively contains every
// possible leaf rectangle through its entire 0–90 degree rotation.
function sweptLeafHits(door, obstacle, thicknessMm = 40) {
  const [hx,hy] = door.h, half = thicknessMm / 2;
  const sx = Math.sign(door.c[0] || door.o[0]), sy = Math.sign(door.c[1] || door.o[1]);
  assert.ok(sx && sy, `${door.id}: the continuous audit requires cardinal directions`);
  const xs = [sx * (obstacle.x - half - hx), sx * (obstacle.x + obstacle.w + half - hx)];
  const ys = [sy * (obstacle.y - half - hy), sy * (obstacle.y + obstacle.d + half - hy)];
  return Math.max(...xs) >= -tol && Math.max(...ys) >= -tol && Math.hypot(Math.max(0,Math.min(...xs)), Math.max(0,Math.min(...ys))) <= door.len + tol;
}

function leafBounds(door, direction, thicknessMm = 40) {
  const [x,y] = door.h, [dx,dy] = direction, half = thicknessMm / 2;
  return dx ? {x:Math.min(x,x + dx * door.len), y:y - half, w:door.len, d:thicknessMm}
    : {x:x - half, y:Math.min(y,y + dy * door.len), w:thicknessMm, d:door.len};
}

function checkOperation(door, expected) {
  for (const key of ['rect','sourceAxisMm','h','c','o','len','openingWidthMm','heightMm','headMm','sillMm']) assert.deepEqual(door[key], expected[key], `${door.id}/${key}: confirmation differs`);
  assert.equal(door.defaultOpen, true, `${door.id}: show intended parked leaf`);
  assert.equal(door.directionStatus, 'user-design-correction');
  assert.equal(door.dimensionStatus, 'design-pending');
  assert.equal(door.placementStatus, 'unresolved');
  eq(Math.hypot(...door.c), 1, `${door.id} closed direction unit`);
  eq(Math.hypot(...door.o), 1, `${door.id} open direction unit`);
  eq(door.c[0] * door.o[0] + door.c[1] * door.o[1], 0, `${door.id} perpendicular swing`);
  assert.equal(door.operation.type, 'hinged');
  assert.deepEqual(door.operation.hingeCm, door.h.map(value => value / 10));
  assert.deepEqual(door.operation.swing, expected.swing);
  assert.deepEqual(door.operation.openLeafCm, expected.openLeafCm);
  const operationRect = Object.fromEntries(Object.entries(door.operation.openLeafCm).map(([key,value]) => [key,value * 10]));
  const open = leafBounds(door, door.o), closed = leafBounds(door, door.c);
  eqRect(operationRect, open, `${door.id} open native/mm agreement`);
  assert.equal(open.d, 40, `${door.id}: 40 mm leaf thickness`);
  assert.ok(closed.x >= door.rect[0] && closed.y >= door.rect[1] && closed.x + closed.w <= door.rect[2] && closed.y + closed.d <= door.rect[3], `${door.id}: closed leaf must fit relocated opening`);
  return open;
}

function verifyFamilyBathReview(plans) {
  plans = beforeFamilyStudyLaundry(plans);
  assert.equal(plans.defaultScheme, 'family');
  assert.deepEqual(Object.keys(plans.schemes).sort(), ['family','laundry','screen','wood']);
  const plan = plans.schemes.family, revision = plan.metadata.familyBathUpdate;
  assert.ok(revision, 'family: confirmed master entry/bath revision is not applied');
  assert.equal(revision.id, REVISION);
  assert.deepEqual(revision.previousDoors.map(value => value.id).sort(), ['door_a','door_bath_1']);
  assert.deepEqual(revision.previousWalls.map(value => value.index).sort((a,b) => a-b), [25,26,32,33]);
  assert.deepEqual(revision.previousFurniture.map(value => value.id).sort(), ['family-f11','family-f3','vanity_main']);
  assert.deepEqual(revision.changedFurnitureIds, ['vanity_main','family-f11','family-f3']);
  assert.deepEqual(revision.notesOnlyFurnitureIds, ['family-f3']);
  assert.deepEqual(revision.newFurnitureIds, []);
  assert.deepEqual(revision.removedFurnitureIds, []);
  assert.ok(revision.migrationFields && !Array.isArray(revision.migrationFields));
  for (const id of ['vanity_main','family-f11']) {
    for (const key of ['cy','rot','face','sourceFootprintMm']) assert.ok(revision.migrationFields[id].includes(key), `${id}: migration cannot leave old ${key}`);
  }
  assert.deepEqual(revision.migrationFields['family-f3'], ['conditions']);
  const old = beforeFamilyBathReview(plan);
  assert.equal(hash(old), baseline.family, 'family: changes beyond exactly reversible confirmed targets, or historical layer changed');
  for (const id of ['wood','laundry','screen']) {
    assert.equal(plans.schemes[id].metadata.familyBathUpdate, undefined, `${id}: unauthorized bath update`);
    assert.equal(hash(plans.schemes[id]), baseline[id], `${id}: must remain byte-equivalent as normalized model data`);
  }
  assert.equal(plan.reviewOnly, undefined, 'unpublished review-only flags must not leak into production');
  for (const key of ['ROOMS','WALL_META','WINS','WIN_META','SLIDES','BAYS','BIFOLDS','HEIGHT_MM','PLAN_BOUNDS','BOUNDS','CENTER']) assert.deepEqual(plan[key], old[key], `${key}: unauthorized architecture/window change`);
  assert.deepEqual(plan.defaultFurniture.map(value => value.id), old.defaultFurniture.map(value => value.id), 'furniture ID order must remain unchanged');
  const main = getDoor(plan, 'door_a'), bath = getDoor(plan, 'door_bath_1');
  const mainOpen = checkOperation(main, {
    rect:[3375,3850,3495,4750],sourceAxisMm:[3435,3850,3435,4750],h:[3435,4690],c:[0,-1],o:[1,0],len:780,
    openingWidthMm:900,heightMm:2150,headMm:2150,sillMm:0,
    swing:{dx:0,dy:-1,ox:1,oy:0,sweep:1},openLeafCm:{x:343.5,y:467,w:78,d:4}
  });
  const bathOpen = checkOperation(bath, {
    rect:[4390,3440,4510,4190],sourceAxisMm:[4450,3440,4450,4190],h:[4450,3500],c:[0,1],o:[1,0],len:630,
    openingWidthMm:750,heightMm:2100,headMm:2100,sillMm:0,
    swing:{dx:0,dy:1,ox:1,oy:0,sweep:0},openLeafCm:{x:445,y:348,w:63,d:4}
  });
  eq(main.rect[1] - getDoor(old,'door_a').rect[1], 300, 'main opening south shift');
  eq(getDoor(old,'door_bath_1').rect[1] - bath.rect[1], 300, 'bath opening north shift');
  const expectedWalls = {25:[3375,60,3495,3850,'u'],26:[3375,4750,3495,4930,'u'],32:[4390,3280,4510,3440,'u'],33:[4390,4190,4510,4930,'u']};
  for (const [index,wall] of Object.entries(expectedWalls)) assert.deepEqual(plan.WALLS[index], wall, `wall ${index}: old hole was not sealed and new hole cut correctly`);
  for (const door of [main,bath]) for (let i=0;i<plan.WALLS.length;i++) {
    const w=plan.WALLS[i], aperture={x:door.rect[0],y:door.rect[1],w:door.rect[2]-door.rect[0],d:door.rect[3]-door.rect[1]};
    assert.ok(!overlaps(aperture,{x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1]}), `${door.id}: full-height wall ${i} obstructs opening`);
  }
  for (const door of old.DOORS) if (!['door_a','door_bath_1'].includes(door.id)) assert.deepEqual(getDoor(plan,door.id), door, `${door.id}: other doors moved`);
  for (const furniture of old.defaultFurniture) if (!revision.changedFurnitureIds.includes(furniture.id)) assert.deepEqual(getFurniture(plan,furniture.id), furniture, `${furniture.id}: other furniture changed`);
  const cabinet = clone(getFurniture(plan,'family-f3'));
  cabinet.conditions = clone(getFurniture(old,'family-f3').conditions);
  assert.deepEqual(cabinet, getFurniture(old,'family-f3'), 'main wardrobe change must be conditions only');
  assert.match(JSON.stringify(getFurniture(plan,'family-f3').conditions), /300|南移/);
  const vanity = getFurniture(plan,'vanity_main'), wc = getFurniture(plan,'family-f11'), shower = getFurniture(plan,'family-f12');
  for (const [f,expected] of [[vanity,{x:4530,y:4510,w:600,d:360}],[wc,{x:5390,y:4290,w:360,d:580}]]) {
    assert.equal(f.rot, 180, `${f.id}: back must be south`);
    assert.equal(f.face, 'north', `${f.id}: face north toward entry`);
    eqRect(worldRect(f), expected, `${f.id} actual occupied rectangle`);
    eqRect(f.sourceFootprintMm, expected, `${f.id} footprint provenance`);
    eq(expected.y+expected.d, 4870, `${f.id}: south wall flush`);
    for (const other of plan.defaultFurniture.filter(value => value.id!==f.id && value.type!=='rug')) assert.ok(!overlaps(worldRect(f),worldRect(other)), `${f.id}: footprint overlaps ${other.id}`);
  }
  assert.deepEqual(shower, getFurniture(old,'family-f12'), 'shower must retain original east-side position');
  assert.match(vanity.notes, /镜.*南|南.*镜/);
  assert.match(wc.notes, /排水|管/);
  const app = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const vanity3d = app.slice(app.indexOf("    case 'vanity': {"),app.indexOf("    case 'shower': {",app.indexOf("    case 'vanity': {")));
  assert.match(vanity3d, /mirror\(\), 0, 1\.15, bz \+ \.025/, 'native vanity mirror must stay on local back side');
  assert.match(app, /g\.rotation\.y = -f\.rot \* Math\.PI\/180/, 'native vanity mirror must rotate with its furniture group');
  eq(vanity.cy+vanity.d/2-25, 4845, 'south-facing native mirror world Y at 25 mm inset');
  const obstacles = [
    ...plan.WALLS.map((value,index)=>({id:`wall-${index}`,x:value[0],y:value[1],w:value[2]-value[0],d:value[3]-value[1]})),
    ...plan.defaultFurniture.filter(value=>value.type!=='rug').map(value=>({id:value.id,...worldRect(value)}))
  ];
  for (const door of [main,bath]) for (const obstacle of obstacles) assert.ok(!sweptLeafHits(door,obstacle), `${door.id}: continuous 40 mm sweep hits ${obstacle.id}`);
  assert.ok(!overlaps(mainOpen,bathOpen), 'fully open main/bath leaves hit each other');
  // Both doors sweep east; their continuously swept x envelopes are disjoint.
  const mutualSweepGap = (bath.h[0]-20)-(main.h[0]+main.len+20);
  eq(mutualSweepGap,195,'minimum X separation of conservative main/bath swept envelopes');
  assert.ok(mutualSweepGap>0,'main and bath doors may collide during simultaneous swing');
  const clearances = {
    mainSouthJamb:4870-main.rect[3],bathNorthJamb:bath.rect[1]-3340,
    studyMainDoorProjectedOverlap:main.rect[3]-getDoor(plan,'door_c').rect[1],
    vanityFrontToNorthWall:vanity.sourceFootprintMm.y-3340,
    vanityFrontToFullyOpenLeaf:vanity.sourceFootprintMm.y-(bathOpen.y+bathOpen.d),
    toiletFrontToNorthWall:wc.sourceFootprintMm.y-3340,
    toiletEastEdgeToShower:shower.sourceFootprintMm.x-(wc.sourceFootprintMm.x+wc.sourceFootprintMm.w)
  };
  assert.deepEqual(clearances,{mainSouthJamb:120,bathNorthJamb:100,studyMainDoorProjectedOverlap:270,vanityFrontToNorthWall:1170,vanityFrontToFullyOpenLeaf:990,toiletFrontToNorthWall:950,toiletEastEdgeToShower:60});
  // Local review artifact is optional for repository portability, but when it
  // is present every approved geometric field must agree with that file too.
  const draftPath=path.resolve(root,'../output/family-master-entry-bath-review-20261011/方案2_主卧入口主卫_草案数据.json');
  if(fs.existsSync(draftPath)){
    const draft=JSON.parse(fs.readFileSync(draftPath,'utf8'));
    for(const door of [main,bath])for(const key of ['rect','sourceAxisMm','h','c','o','len','openingWidthMm','heightMm'])assert.deepEqual(door[key],getDoor(draft,door.id)[key],`${door.id}: differs from owner-confirmed draft/${key}`);
    for(const id of ['vanity_main','family-f11'])for(const key of ['cx','cy','w','d','rot','heightMm','face','sourceFootprintMm'])assert.deepEqual(getFurniture(plan,id)[key],getFurniture(draft,id)[key],`${id}: differs from owner-confirmed draft/${key}`);
    assert.deepEqual(plan.WALLS,draft.WALLS,'wall geometry differs from confirmation draft');
    assert.deepEqual(clearances,draft.reviewOnly.clearancesMm);
  }
  return {status:'PASS',revision:REVISION,scheme:'family',continuous40mmDoorSweepsClear:true,mutualSweptEnvelopeSeparationMm:mutualSweepGap,allNonTargetFieldsHistoricalHashExact:true,otherSchemesUnchanged:true,modelOnly:true,clearancesMm:clearances,
    warnings:['60 mm toilet/shower gap is tight and not comfort certified.','270 mm opening projection overlap is not a physical leaf collision or passage clearance.','Drainage, water tank, trim, hardware and wall status require on-site verification.']};
}

module.exports={verifyFamilyBathReview,beforeFamilyBathReview,sweptLeafHits,baseline,REVISION};
if(require.main===module)console.log(JSON.stringify(verifyFamilyBathReview(require(path.join(root,'data/house-plans.js'))),null,2));
