'use strict';

// An isolated browser regression test. A read-only hook is injected into the
// test response to inspect the actual Three.js pivot and leaf transform.
// This test verifies initial rendered geometry, not pointer hit testing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '..');
const plans = require(path.join(root, 'data/house-plans.js'));
const runtime = process.env.FLOORPLAN_NODE_MODULES || 'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = createRequire(path.join(runtime, '_floorplan-qa.cjs'))('playwright')); }
const base = process.env.FLOORPLAN_BASE_URL || 'http://127.0.0.1:4190';
const out = path.resolve(process.env.FLOORPLAN_BATH_SHOTS || path.join(root, '..', 'qa-bath-door-20261008'));
const executablePath = process.env.FLOORPLAN_CHROME || [chromium.executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const timeout = 60000;
const hook = `window.__bathDoorQA = () => {
  const d = doors.find(value => value.sourceId === 'door_bath_1');
  if (!d) return null;
  d.pivot.updateMatrixWorld(true);
  const plan = point => [point.x * 1000 + OX, point.z * 1000 + OY];
  const end = d.pivot.localToWorld(new THREE.Vector3(d.L, 0, 0));
  return {open:d.open, angle:d.cur, target:d.open ? d.a1 : d.a0,
    pivot:plan(d.pivot.position), endpoint:plan(end)};
};
`;
const eq = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < .02, `${label}: ${actual} != ${expected}`);
const painted = () => {
  const canvas = document.querySelector('#view3d canvas');
  if (!canvas?.width) return false;
  const probe = document.createElement('canvas'); probe.width = probe.height = 64;
  const context = probe.getContext('2d'); context.drawImage(canvas, 0, 0, 64, 64);
  const pixels = context.getImageData(0, 0, 64, 64).data, colors = new Set();
  for (let i = 0; i < pixels.length; i += 4) colors.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]);
  return colors.size > 20;
};

(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({headless:true, executablePath, args:['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport:{width:1440, height:1000}});
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  const errors = [], report = [], screenshots = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route(`${base}/**`, async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch(), html = await response.text();
    assert.ok(html.includes('window.View3D ='), 'Read-only QA hook insertion point missing');
    return route.fulfill({response, body:html.replace('window.View3D =', hook + 'window.View3D =')});
  });
  const screenshot = async filename => {
    const target = path.join(out, filename);
    await page.screenshot({path:target}); screenshots.push(target);
  };
  const settledDoor = async open => {
    await page.waitForFunction(expected => {
      const door = window.__bathDoorQA?.();
      return door && door.open === expected && Math.abs(door.angle - door.target) < .00001;
    }, open);
    return page.evaluate(() => window.__bathDoorQA());
  };
  try {
    for (const id of ['family', 'laundry']) {
      await page.goto(`${base}/?scheme=${id}`, {waitUntil:'networkidle'});
      await page.waitForFunction(() => window.HOUSE_PLANS && state.furniture.length && typeof window.View3D?.enter === 'function');
      const door = plans.schemes[id].DOORS.find(value => value.sourceId === 'door_bath_1');
      // Center the existing 2D viewport around the bath. This changes only
      // the test camera and provides an equally framed 2D/3D comparison.
      await page.evaluate(() => {
        view.s = .26; view.x0 = 5450 - svg.clientWidth / (2 * view.s); view.y0 = 4100 - svg.clientHeight / (2 * view.s); applyView();
      });
      const svgLeaf = await page.locator('#gOpen polygon').nth(plans.schemes[id].DOORS.indexOf(door)).getAttribute('points');
      const polygon = svgLeaf.trim().split(/\s+/).map(pair => pair.split(',').map(Number));
      assert.deepEqual([...new Set(polygon.map(point => point[1]))].sort((a, b) => a - b), [4410, 4450], `${id}: 2D thickness must match 3D centered leaf`);
      assert.deepEqual([...new Set(polygon.map(point => point[0]))].sort((a, b) => a - b), [door.h[0], door.h[0] + 630]);
      await screenshot(`${id}-bath-2d.png`);
      await page.locator('[data-view="3d"]').click();
      await page.waitForFunction(() => document.querySelector('#stage').classList.contains('is3d') && !document.querySelector('#stage').classList.contains('animating'));
      await page.locator('[data-cut="1.2"]').click();
      await page.waitForFunction(painted);
      const initial = await settledDoor(true);
      eq(initial.pivot[0], door.h[0], `${id}: 3D pivot x`);
      eq(initial.pivot[1], 4430, `${id}: 3D south pivot y`);
      eq(initial.endpoint[0], door.h[0] + 630, `${id}: 3D open endpoint x`);
      eq(initial.endpoint[1], 4430, `${id}: 3D open endpoint y`);
      await screenshot(`${id}-bath-3d-open.png`);
      report.push({id, southPivotMm:initial.pivot, openEndpointMm:initial.endpoint, centered2DAnd3DLeaf:true});
    }
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    console.log(JSON.stringify({status:'PASS', initialRenderedGeometryOnly:true, schemes:report, browserErrors:errors, screenshots}, null, 2));
  } finally {
    await context.close(); await browser.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
