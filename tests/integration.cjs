'use strict';

// Real UI smoke/regression checks. These edits run in an isolated browser
// context; they never touch the user's saved drafts or repository data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '..');
const plans = require(path.join(root, 'data/house-plans.js'));
const runtime = process.env.FLOORPLAN_NODE_MODULES || 'C:/Users/dvnuo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const runtimeRequire = createRequire(path.join(runtime, '_floorplan-qa.cjs'));
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = runtimeRequire('playwright')); }
const base = process.env.FLOORPLAN_BASE_URL || 'http://127.0.0.1:4190';
const chrome = process.env.FLOORPLAN_CHROME || [chromium.executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const timeout = 60000;

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport:{width:1440,height:1000}, acceptDownloads:true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', d => d.accept());
  const report = [];
  const open = async id => {
    await page.goto(`${base}/?scheme=${id}`, {waitUntil:'networkidle', timeout});
    await page.waitForFunction(() => window.HOUSE_PLANS && document.querySelectorAll('#gFurn > .furn').length > 0);
    assert.equal(await page.locator('#schemeSelect').inputValue(), id);
    assert.equal(await page.evaluate(() => state.schemeId), id);
  };
  const selected = async id => page.evaluate(id => select({kind:'furn',id}), id);
  const menuAction = async selector => {
    if (!await page.locator('details.menu').evaluate(el => el.open)) await page.locator('details.menu > summary').click();
    await page.locator(selector).click();
  };
  try {
    // No scheme query must immediately open the user's current family design.
    await page.goto(base, {waitUntil:'networkidle', timeout});
    assert.equal(await page.locator('#schemeSelect').inputValue(), 'family');
    for (const id of ['family','wood','laundry']) {
      await open(id);
      assert.equal(await page.locator('#gFurn > .furn').count(), plans.schemes[id].defaultFurniture.length);
      assert.equal(await page.evaluate(() => ROOMS.filter(r => r.counted !== false).length), 8);
      await page.waitForFunction(() => typeof window.View3D?.enter === 'function', null, {timeout});
      await page.locator('[data-view="3d"]').click();
      await page.waitForFunction(() => document.querySelector('#stage').classList.contains('is3d') && document.querySelector('#view3d canvas'), null, {timeout});
      await page.waitForFunction(() => !document.querySelector('#stage').classList.contains('animating'), null, {timeout});
      const canvas = await page.locator('#view3d canvas').boundingBox();
      assert.ok(canvas.width > 200 && canvas.height > 200, `${id}: visible 3D canvas`);
      await page.locator('[data-view="2d"]').click();
      await page.waitForFunction(() => !document.querySelector('#stage').classList.contains('is3d') && !document.querySelector('#stage').classList.contains('animating'), null, {timeout});
      report.push({id, furniture:plans.schemes[id].defaultFurniture.length, twoD:true, threeD:true});
    }
    // Change one chair's dimensions/color/position through visible property UI.
    await open('family');
    const chair = plans.schemes.family.defaultFurniture.find(f => f.type === 'chair');
    await selected(chair.id);
    await page.locator('#fW').fill(String(chair.w + 20));
    await page.locator('#fW').press('Tab');
    await page.locator('#fX').fill(String(chair.cx + 100));
    await page.locator('#fX').press('Tab');
    await page.locator('#fC').evaluate(el => {el.value = '#668899'; el.dispatchEvent(new Event('change', {bubbles:true}));});
    const changed = await page.evaluate(id => structuredClone(getF(id)), chair.id);
    assert.equal(changed.w, chair.w + 20);
    assert.equal(changed.cx, chair.cx + 100);
    assert.equal(changed.color.toLowerCase(), '#668899');
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.evaluate(id => getF(id).color, chair.id), '#668899', 'reload keeps local draft');

    // The editor exports enough context to reload only the matching scheme.
    const [artifact] = await Promise.all([page.waitForEvent('download'), menuAction('#exportJson')]);
    const exported = JSON.parse(fs.readFileSync(await artifact.path(), 'utf8'));
    assert.equal(exported.projectId, 'house-design');
    assert.equal(exported.schemeId, 'family');
    assert.equal(exported.furniture.find(f => f.id === chair.id).color, '#668899');
    await menuAction('#reset');
    assert.equal(await page.evaluate(id => getF(id).color, chair.id), chair.color, 'reset restores selected scheme default');
    await page.locator('#fileIn').setInputFiles({name:'qa-family.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(exported))});
    await page.waitForFunction(id => getF(id).color === '#668899', chair.id);
    assert.equal(await page.evaluate(id => getF(id).w, chair.id), chair.w + 20, 'same-scheme import restores edited dimensions');

    // Changing another scheme cannot pick up the family draft.
    await page.locator('#schemeSelect').selectOption('wood');
    await page.waitForFunction(() => state.schemeId === 'wood');
    assert.deepEqual(await page.evaluate(() => state.furniture.map(f => [f.id,f.w,f.d,f.color])), plans.schemes.wood.defaultFurniture.map(f => [f.id,f.w,f.d,f.color]));
    const before = await page.evaluate(() => JSON.stringify(state));
    await page.locator('#fileIn').setInputFiles({name:'wrong-scheme.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(exported))});
    await page.waitForFunction(() => document.querySelector('#toast').classList.contains('show'));
    assert.equal(await page.evaluate(() => JSON.stringify(state)), before, 'cross-scheme import cannot replace current design');
    await page.locator('#schemeSelect').selectOption('family');
    await page.waitForFunction(() => state.schemeId === 'family');
    assert.equal(await page.evaluate(id => getF(id).color, chair.id), '#668899', 'scheme switch keeps independent family draft');
    await menuAction('#reset');
    assert.equal(await page.evaluate(id => getF(id).w, chair.id), chair.w);
    assert.equal(errors.length, 0, 'Browser script errors: ' + errors.join('\n'));
    console.log(JSON.stringify({status:'PASS', defaultScheme:'family', schemes:report, draftReload:true, schemeIsolation:true, reset:true, exportImport:true, browserErrors:errors}, null, 2));
  } finally {await context.close(); await browser.close();}
})().catch(err => {console.error(err.stack || err); process.exitCode = 1;});
