'use strict';

// Independent checks against the retained source snapshots. Run before the
// browser suite so coordinate regressions cannot hide behind plausible renders.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const plans = require(path.join(root, 'data/house-plans.js'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const eq = (actual, expected, label, tolerance = .02) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
const m = n => Number(n) * 10;
const rectWidth = r => Math.max(r[2] - r[0], r[3] - r[1]);
const inside = (r, x, y) => x > r[0] + .02 && x < r[2] - .02 && y > r[1] + .02 && y < r[3] - .02;
const area = poly => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

let scripts = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=|\btype\s*=\s*["']importmap/i.test(match[1]) || !match[2].trim()) continue;
  const checked = spawnSync(process.execPath, ['--input-type=module', '--check'], {input: match[2], encoding:'utf8'});
  assert.equal(checked.status, 0, `Inline script ${scripts + 1}: ${checked.stderr}`);
  scripts++;
}
assert.ok(scripts >= 2, 'Main editor and 3D scripts must both be syntax checked');
assert.equal(plans.defaultScheme, 'family');
assert.equal(plans.unit, 'mm');
assert.deepEqual(Object.keys(plans.schemes).sort(), ['family', 'laundry', 'wood']);
const report = [];

for (const [id, p] of Object.entries(plans.schemes)) {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'data/source', id + '.json'), 'utf8'));
  assert.equal(source.unit, 'cm');
  assert.equal(p.WALLS.length, p.WALL_META.length);
  assert.equal(p.WINS.length, p.WIN_META.length);
  assert.equal(new Set(p.defaultFurniture.map(f => f.id)).size, p.defaultFurniture.length, `${id}: duplicated furniture IDs`);
  for (const r of source.rooms) {
    const q = p.ROOMS.find(v => v.id === r.id);
    assert.ok(q, `${id}: missing ${r.id}`);
    assert.deepEqual(q.poly, r.points.map(v => v.map(m)), `${id}/${r.id}: room coordinates must remain cm to mm exactly`);
    eq(area(q.poly), area(r.points) * 100, `${id}/${r.id}: area`);
    if (r.heightCm) eq(q.heightMm, m(r.heightCm), `${id}/${r.id}: ceiling`);
  }

  for (const opening of [...source.doors, ...source.windows]) {
    const q = [...p.DOORS, ...p.SLIDES, ...p.WIN_META].find(v => v.sourceId === opening.id && v.type !== 'bay-front');
    assert.ok(q, `${id}: missing opening ${opening.id}`);
    eq(q.openingWidthMm, opening.widthMm, `${id}/${opening.id}: recorded opening width`);
    eq(q.sillMm, m(opening.sillCm || 0), `${id}/${opening.id}: sill`);
    eq(q.heightMm, m(opening.heightCm), `${id}/${opening.id}: window/door height`);
    const x = m((opening.x1 + opening.x2) / 2), y = m((opening.y1 + opening.y2) / 2);
    assert.ok(!p.WALLS.some(w => inside(w, x, y)), `${id}/${opening.id}: a full wall blocks the opening midpoint`);
  }
  for (const q of p.DOORS) {
    const original = source.doors.find(d => d.id === q.sourceId);
    eq(rectWidth(q.rect), original.widthMm, `${id}/${q.sourceId}: hole, not leaf width`);
    assert.ok(q.len <= q.openingWidthMm, `${id}/${q.sourceId}: leaf exceeds hole`);
    if (original.operation?.type === 'hinged') {
      assert.deepEqual(q.h, original.operation.hingeCm.map(m), `${id}/${q.sourceId}: hinge`);
      assert.deepEqual(q.c, [original.operation.swing.dx, original.operation.swing.dy]);
      assert.deepEqual(q.o, [original.operation.swing.ox, original.operation.swing.oy]);
      const leaf = original.operation.openLeafCm;
      eq(q.len, m(Math.max(leaf.w, leaf.d)), `${id}/${q.sourceId}: physical leaf`);
    }
  }

  for (const f of p.defaultFurniture) {
    assert.ok([f.cx, f.cy, f.w, f.d, f.rot, f.heightMm].every(Number.isFinite), `${id}/${f.id}: non-finite dimensions`);
    assert.ok(f.w > 0 && f.d > 0 && f.heightMm > 0);
    if (f.sourceFootprintMm) {
      const a = f.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), q = f.sourceFootprintMm;
      const w = f.w * c + f.d * s, d = f.w * s + f.d * c;
      eq(w, q.w, `${id}/${f.id}: rotated occupied width`);
      eq(d, q.d, `${id}/${f.id}: rotated occupied depth`);
      eq(f.cx - w / 2, q.x, `${id}/${f.id}: occupied x`);
      eq(f.cy - d / 2, q.y, `${id}/${f.id}: occupied y`);
    }
    if (f.purchasedProductId) {
      const product = source.purchasedFurnitureRevision.products.find(v => v.id === f.purchasedProductId);
      assert.ok(product, `${id}/${f.id}: missing IKEA product dimensions`);
      eq(f.w, product.dimensionsMm.width, `${id}/${f.id}: purchased width`);
      eq(f.d, product.dimensionsMm.depth, `${id}/${f.id}: purchased depth`);
      eq(f.heightMm, product.dimensionsMm.height, `${id}/${f.id}: purchased height`);
    }
    for (const part of f.parts || []) assert.ok([part.x, part.y, part.w, part.d, part.elevationMm, part.heightMm].every(Number.isFinite) && part.w > 0 && part.d > 0 && part.heightMm > 0, `${id}/${f.id}: invalid custom fixture part`);
  }

  assert.equal(p.BAYS.length, 3, `${id}: all three projecting bays must survive`);
  for (const bay of p.BAYS) {
    const o = source.windows.find(v => v.id === bay.sourceId), half = m(source.wallSpecs.find(w => w.coords.some(v => v === o.x1 || v === o.y1))?.thicknessCm || 12) / 2;
    const cx = (bay.frontRect[0] + bay.frontRect[2]) / 2, cy = (bay.frontRect[1] + bay.frontRect[3]) / 2;
    const distance = (cx - m((o.x1 + o.x2) / 2)) * o.bay.outward[0] + (cy - m((o.y1 + o.y2) / 2)) * o.bay.outward[1];
    eq(distance, half + m(o.bay.projectionCm), `${id}/${bay.sourceId}: outward bay depth`);
    const aperture = p.WIN_META.find(v => v.sourceId === bay.sourceId && v.type === 'bay-aperture');
    assert.ok(aperture.noGlass && aperture.noFrame, `${id}/${bay.sourceId}: bay mouth must remain hollow`);
  }
  const guards = p.WIN_META.filter(w => w.type === 'guarded-open-air');
  assert.equal(guards.length, 2, `${id}: north and east balcony openings`);
  assert.ok(guards.every(w => w.noGlass && w.guard), `${id}: balcony must remain unglazed and guarded`);
  assert.ok(p.WALL_META.every(w => ['unverified','service-shaft'].includes(w.bearingStatus)), `${id}: no invented structural bearing classification`);
  assert.ok(p.BOUNDS.w > 0 && p.BOUNDS.h > 0 && p.PLAN_BOUNDS.w > 0 && p.PLAN_BOUNDS.h > 0);
  report.push({id, rooms:source.rooms.length, walls:p.WALLS.length, furniture:p.defaultFurniture.length, bays:p.BAYS.length});
}

const family = plans.schemes.family;
assert.equal(family.BIFOLDS.length, 1);
assert.equal(family.BIFOLDS[0].panels, 4);
assert.equal(family.BIFOLDS[0].closed, true);
assert.equal(family.BIFOLDS[0].axis, 'x', '800 library faces north');
assert.ok(family.defaultFurniture.some(f => f.type === 'child-bike'));
assert.ok(family.defaultFurniture.some(f => f.type === 'folded-stroller'));
console.log(JSON.stringify({status:'PASS', inlineScripts:scripts, defaultScheme:plans.defaultScheme, schemes:report}, null, 2));
