'use strict';

// Geometry only: these assertions describe the model, not installation or
// usable-clearance approval. Retained cm snapshot content must not be rewritten.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const plans = require(path.join(root, 'data/house-plans.js'));
const {previousPlan}=require('./wood-public-area-helpers.cjs');
// Only the original three cm source imports use these retained baselines.
// The standalone mm screen scheme has independent screen-plan.cjs coverage.
const legacySchemes = ['wood','family','laundry'].map(id => {assert.ok(plans.schemes[id], `${id}: original imported scheme missing`);return [id, plans.schemes[id]];});
const revision = 'bath-south-hinge-20261008';
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const hashObject = value => hash(JSON.stringify(stable(value)));
const mm = value => value * 10;
const rect = value => ({x:mm(value.x), y:mm(value.y), w:mm(value.w), d:mm(value.d)});
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y;
const eq = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < .01, `${label}: ${actual} != ${expected}`);

// Hashes were taken from the version before the door correction. Comparing
// the entire normalized scheme catches changes outside the approved fields,
// including all non-target furniture, walls, openings, materials and dimensions.
// The October 8 sideboard reference is separately validated: its internals are
// removed here, but its immutable plan envelope remains in this hash.
const baseline = {
  // Normalized sideboard envelope baselines were recorded from 82ccebf,
  // before reference-v2. No new geometry was used to bless these constants.
  wood:{source:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8', scheme:'7c1e20f6a5911c986bade14ee5d78714c9beb2d2ba73e643a9cf5dac985af157'},
  family:{source:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895', scheme:'8f39358ca0708dbd0a1014fd2cc44c7610999cf0333596540a167d89d7be8c9e'},
  laundry:{source:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce', scheme:'a2b0a0ae2094d6e79b8af77b6cb7f127d393375abecdc2e28e7dc8168bf63cf9'}
};

function beforeCorrection(scheme, source) {
  const previous = previousPlan(scheme);
  const sideboard=previous.defaultFurniture.find(value=>value.id==='fit-dining_sideboard_wall');
  const sideboardIndex=previous.defaultFurniture.indexOf(sideboard);
  previous.defaultFurniture[sideboardIndex]=Object.fromEntries(['id','cx','cy','w','d','rot','heightMm','elevationMm','sourceFootprintMm'].filter(key=>sideboard[key]!==undefined).map(key=>[key,key==='heightMm'&&sideboard.cabinetRevision==='sideboard-reference-v2'?2500:sideboard[key]]));
  delete previous.metadata.sideboardReference;
  if (scheme.id === 'wood') return previous;
  const door = previous.DOORS.find(value => value.sourceId === 'door_bath_1');
  const original = source.doors.find(value => value.id === door.sourceId);
  door.name = original.name;
  door.notes = original.notes;
  door.h = original.operation.hingeCm.map(mm);
  door.c = [original.operation.swing.dx, original.operation.swing.dy];
  door.o = [original.operation.swing.ox, original.operation.swing.oy];
  door.operation = structuredClone(original.operation);
  door.directionStatus = 'source-design';
  delete door.swingRevision;
  // The adjacent bedroom door keeps its geometry; its obsolete 550mm note
  // was corrected as a consequence of this approved bath swing revision.
  if (scheme.id === 'family') previous.DOORS.find(value => value.sourceId === 'door_a').notes = source.doors.find(value => value.id === 'door_a').notes;
  previous.defaultFurniture.find(value => value.sourceId === 'vanity_main').notes = source.furniture.find(value => value.id === 'vanity_main').notes;
  delete previous.metadata.designCorrections;
  return previous;
}

// A conservative continuous quarter-sector check, rather than sampled angles.
// Inflate the fixture by half the 40mm door thickness, intersect it with the
// north/east quadrant, then find its closest point to the pivot. If it is
// outside the radius, neither the leaf nor its full 0–90 degree sweep can hit.
function sweptLeafHits(door, fixture, thicknessMm) {
  const half = thicknessMm / 2, [hx, hy] = door.h;
  const x0 = Math.max(hx, fixture.x - half), x1 = fixture.x + fixture.w + half;
  const y0 = fixture.y - half, y1 = Math.min(hy, fixture.y + fixture.d + half);
  return x0 <= x1 && y0 <= y1 && Math.hypot(x0 - hx, y1 - hy) <= door.len;
}

const report = [];
if(process.argv.includes('--record-baseline')){
  console.log(JSON.stringify(Object.fromEntries(legacySchemes.map(([id,scheme])=>[id,hashObject(beforeCorrection(scheme,JSON.parse(fs.readFileSync(path.join(root,'data/source',`${id}.json`),'utf8'))))])),null,2));
  process.exit(0);
}
for (const [id, scheme] of legacySchemes) {
  const sourceBytes = fs.readFileSync(path.join(root, 'data/source', `${id}.json`));
  // Git may check out CRLF on Windows; line endings do not change the source
  // content. Normalize only CRLF so substantive edits remain detectable.
  assert.equal(hash(sourceBytes.toString('utf8').replace(/\r\n/g, '\n')), baseline[id].source, `${id}: retained source snapshot content changed`);
  const source = JSON.parse(sourceBytes);
  assert.equal(hashObject(beforeCorrection(scheme, source)), baseline[id].scheme, `${id}: change beyond the approved bath door correction`);
  if (id === 'wood') {
    report.push({id, allNonSideboardSchemeDataUnchanged:true});
    continue;
  }

  const door = scheme.DOORS.find(value => value.sourceId === 'door_bath_1');
  const original = source.doors.find(value => value.id === door.sourceId);
  const pivotX = {family:4450, laundry:4650}[id];
  assert.equal(door.name, '主卫 · 南铰向卫内开');
  assert.equal(door.directionStatus, 'user-design-correction');
  assert.equal(door.swingRevision, revision);
  assert.equal(door.defaultOpen, true);
  assert.deepEqual(door.h, [pivotX, 4430]);
  assert.deepEqual(door.c, [0, -1]);
  assert.deepEqual(door.o, [1, 0]);
  eq(Math.hypot(...door.c), 1, `${id}: unit closed vector`);
  eq(Math.hypot(...door.o), 1, `${id}: unit open vector`);
  eq(door.c[0] * door.o[0] + door.c[1] * door.o[1], 0, `${id}: 90 degree swing`);
  assert.deepEqual(door.sourceAxisMm, [original.x1, original.y1, original.x2, original.y2].map(mm));
  assert.deepEqual(door.rect, [pivotX - 60, 3740, pivotX + 60, 4490]);
  assert.equal(door.openingWidthMm, original.widthMm);
  assert.equal(door.heightMm, mm(original.heightCm));
  assert.equal(door.sillMm, mm(original.sillCm));
  assert.equal(door.headMm, mm(original.heightCm + original.sillCm));
  assert.equal(door.len, 630);
  assert.equal(door.len, mm(Math.max(original.operation.openLeafCm.w, original.operation.openLeafCm.d)));
  assert.deepEqual(door.operation, {
    ...original.operation,
    hingeCm:[pivotX / 10, 443],
    swing:{dx:0, dy:-1, ox:1, oy:0, sweep:1},
    openLeafCm:{...original.operation.openLeafCm, y:441}
  });
  const correction = scheme.metadata.designCorrections.find(value => value.id === revision);
  assert.ok(correction, `${id}: missing explicit design correction metadata`);
  assert.equal(correction.sourceId, original.id);
  assert.equal(correction.openingUnchanged, true);
  assert.deepEqual(correction.hingeMm, door.h);
  assert.deepEqual(correction.closedDirection, door.c);
  assert.deepEqual(correction.openDirection, door.o);
  assert.match(correction.usageNote, /不是通行净宽/);
  if (id === 'family') {
    const adjacent = scheme.DOORS.find(value => value.sourceId === 'door_a');
    assert.match(adjacent.notes, /550mm.*不再适用/);
    assert.match(adjacent.notes, /不是通行净宽/);
  }

  const openLeaf = rect(door.operation.openLeafCm);
  const thicknessMm = openLeaf.d;
  assert.equal(thicknessMm, 40);
  eq(openLeaf.x, door.h[0], `${id}: open leaf starts at pivot x`);
  eq(openLeaf.y + thicknessMm / 2, door.h[1], `${id}: open leaf centered on pivot y`);
  eq(openLeaf.w, door.len, `${id}: open leaf length`);
  const closedLeaf = {x:door.h[0] - thicknessMm / 2, y:door.h[1] - door.len, w:thicknessMm, d:door.len};
  assert.ok(closedLeaf.x >= door.rect[0] && closedLeaf.y >= door.rect[1] && closedLeaf.x + closedLeaf.w <= door.rect[2] && closedLeaf.y + closedLeaf.d <= door.rect[3], `${id}: closed leaf leaves the unchanged opening`);

  const fixtures = source.furniture.filter(value => /主卫/.test(value.name));
  assert.equal(fixtures.length, 3, `${id}: must check basin, WC and shower`);
  for (const fixture of fixtures) {
    const expected = rect(fixture);
    const current = scheme.defaultFurniture.find(value => value.name === fixture.name);
    assert.ok(current, `${id}: missing ${fixture.name}`);
    assert.deepEqual(current.sourceFootprintMm, expected, `${id}/${fixture.name}: fixture moved`);
    assert.ok(!overlaps(openLeaf, expected), `${id}/${fixture.name}: open door hits fixture`);
    assert.ok(!sweptLeafHits(door, expected, thicknessMm), `${id}/${fixture.name}: continuous door sweep hits fixture`);
  }
  const vanity = scheme.defaultFurniture.find(value => value.sourceId === 'vanity_main');
  assert.ok(!/洗手须先关门|门开着时在盆前/.test(vanity.notes), `${id}: obsolete basin obstruction note`);
  const gapMm = openLeaf.y - (vanity.sourceFootprintMm.y + vanity.sourceFootprintMm.d);
  eq(gapMm, 680, `${id}: open door north edge to basin south edge`);
  report.push({id, openingUnchanged:true, allOtherSchemeDataUnchanged:true, sweepAvoidsBasinWcShower:true, modeledDoorToBasinGapMm:gapMm});
}
console.log(JSON.stringify({status:'PASS', revision, geometryOnly:true, schemes:report}, null, 2));
