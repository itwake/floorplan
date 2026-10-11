'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const plans=require(path.join(__dirname,'..','data','house-plans.js'));
const {previousPlan}=require('./wood-public-area-helpers.cjs');
// These historical baselines belong to the three original cm imports only.
// The independently measured mm screen scheme is checked by screen-plan.cjs.
const legacySchemes=['wood','family','laundry'].map(id=>{assert.ok(plans.schemes[id],id+': original imported scheme missing');return [id,plans.schemes[id]];});
const revision='cream-oak-functional-v1',sideboardRevision='sideboard-reference-v2';
// Recorded before the functional cabinet-detail pass. Deliberately includes
// windows, doors and the 800-library bifold so styling cannot change layout.
// Only family/laundry layout hashes were revised after the user authorized
// the 2026-10-08 master-bath south hinge. All furniture-envelope baselines and
// the wood layout remain the original values. The later reference sideboard
// changes only its authorized height from 2500 to the model ceiling at 2700.
// Normalize that one height below; every planar envelope remains checked.
const baseline={
  wood:{layout:'f755c958669d42b65b0c821047efcb021d712287d9a2df54ee7a469be44fd0db',envelopes:'00e55ae56ab1eed679f501c96cb1db7b16decd7a2d4bf80a714e5edf902e87c0'},
  family:{layout:'2a00897b927680f9e8ce166644e1804a184ceb6b5cb8cd486f663bc1bd8df83f',envelopes:'1f24749ad3fb87950effab23875ef5846cc342896126b34d5fddcb1176f410f0'},
  laundry:{layout:'63d62156c5a568fd2675cb7e241e57a4f6037f329edc6c347c1062ee0b826a84',envelopes:'830d9d0109dd655ee38caee1dc1bf52394d3db12ce24504637afd0cb0f45e529'}
};
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const intersects=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.01&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>.01&&Math.min(a.elevationMm+a.heightMm,b.elevationMm+b.heightMm)-Math.max(a.elevationMm,b.elevationMm)>.01;
function layout(s){return {rooms:s.ROOMS.map(r=>({id:r.id,poly:r.poly,at:r.at,heightMm:r.heightMm,counted:r.counted,mat:r.mat})),walls:s.WALLS,wallMeta:s.WALL_META,wins:s.WINS,winMeta:s.WIN_META,doors:s.DOORS,slides:s.SLIDES,bays:s.BAYS,bifolds:s.BIFOLDS};}
function envelopes(s){return s.defaultFurniture.map(f=>Object.fromEntries(['id','cx','cy','w','d','rot','heightMm','elevationMm','sourceFootprintMm'].filter(k=>f[k]!==undefined).map(k=>[k,k==='heightMm'&&f.id==='fit-dining_sideboard_wall'&&f.cabinetRevision===sideboardRevision?2500:f[k]]))).sort((a,b)=>a.id.localeCompare(b.id));}
if(process.argv.includes('--record-baseline')){
  console.log(JSON.stringify(Object.fromEntries(legacySchemes.map(([id,s])=>[id,{layout:hash(layout(s)),envelopes:hash(envelopes(s))}])),null,2));
  process.exit(0);
}
const report=[];
for(const [id,s] of legacySchemes){
  assert.ok(baseline[id],id+': missing immutable pre-design baseline');
  const prior=previousPlan(s);
  assert.equal(hash(layout(prior)),baseline[id].layout,id+': historical walls/openings/rooms/bays/800 door changed');
  assert.equal(hash(envelopes(prior)),baseline[id].envelopes,id+': historical furniture footprint, location or dimensions changed');
  const designed=s.defaultFurniture.filter(f=>[revision,sideboardRevision].includes(f.cabinetRevision));
  assert.ok(designed.length>=2,id+': missing cabinet design');
  for(const f of designed){
    assert.ok(['fixture','tvstand'].includes(f.type),f.id+': unsupported detailed cabinet type');
    const reference=f.id==='fit-dining_sideboard_wall'&&f.cabinetRevision===sideboardRevision;
    assert.equal(f.cabinetDesign.revision,reference?sideboardRevision:revision);
    assert.equal(f.cabinetDesign.status,'concept-pending-detail');
    assert.equal(f.cabinetDesign.boardThicknessMm,18);
    assert.equal(f.cabinetDesign.doorGapMm,3);
    assert.equal(f.cabinetDesign.palette.door,'#F4F1E9');
    assert.equal(f.cabinetDesign.palette.wood,'#CDB594');
    assert.ok(Array.isArray(f.cabinetDesign.features)&&f.cabinetDesign.features.length);
    assert.ok(Array.isArray(f.cabinetDesign.faces)&&f.cabinetDesign.faces.length);
    assert.ok(Number.isFinite(f.baseWidthMm)&&f.baseWidthMm>0);
    assert.ok(Number.isFinite(f.baseDepthMm)&&f.baseDepthMm>0);
    const ids=new Set();
    for(const p of f.parts){
      assert.ok(!ids.has(p.id),f.id+': duplicate part '+p.id);ids.add(p.id);
      assert.ok(['x','y','w','d','heightMm','elevationMm'].every(k=>Number.isFinite(p[k])),p.id+': invalid coordinates');
      assert.ok(p.w>0&&p.d>0&&p.heightMm>0,p.id+': nonpositive component');
      assert.ok(p.x>=-f.baseWidthMm/2-.1&&p.x+p.w<=f.baseWidthMm/2+.1,p.id+': protrudes outside original width');
      assert.ok(p.y>=-f.baseDepthMm/2-.1&&p.y+p.d<=f.baseDepthMm/2+.1,p.id+': protrudes outside original depth');
      assert.ok(/^#[0-9a-f]{6}$/i.test(p.color),p.id+': invalid color');
      if(['cabinet-side','cabinet-back','niche-back','door-sliding','door-hinged','drawer-front'].includes(p.role))assert.ok(Math.min(p.w,p.d)<=20,p.id+': opaque full-depth block masquerading as a panel');
      if(['cabinet-bottom','cabinet-top','cabinet-shelf','niche-bottom','common-shoe-shelf'].includes(p.role))assert.ok(p.heightMm<=20,p.id+': shelf must remain a thin board');
      const oakFront=reference&&p.role==='door-hinged'&&p.elevationMm>=1500&&p.color==='#CDB594';
      if(['door-sliding','door-hinged','drawer-front'].includes(p.role))assert.equal(p.color,oakFront?'#CDB594':'#F4F1E9',p.id+': incorrect reference front palette');
      if(['niche-back','niche-bottom','wood-countertop'].includes(p.role))assert.equal(p.color,reference&&p.role==='niche-back'?'#F4F1E9':'#CDB594',p.id+': reference component palette missing');
      if(['door-sliding','door-hinged','drawer-front'].includes(p.role))assert.equal(p.material,oakFront?'OakLight':'Cream',p.id+': incorrect door material');
      if(['niche-back','niche-bottom','wood-countertop'].includes(p.role))assert.equal(p.material,reference&&p.role==='niche-back'?'Cream':'OakLight',p.id+': reference material missing');
      if(p.role==='led-strip')assert.equal(p.material,'Light',p.id+': light strip is not emissive material');
    }
    const roles=new Set(f.parts.map(p=>p.role));
    for(const drawer of f.parts.filter(p=>p.role==='drawer-box'))for(const back of f.parts.filter(p=>p.role==='cabinet-back'))assert.ok(!intersects(drawer,back),drawer.id+': drawer box overlaps fixed cabinet back');
    if(['fit-entry_shoe_station','fit-dining_sideboard_wall','fit-sofa_back_storage'].includes(f.id)||f.type==='tvstand'||/衣柜/.test(f.name)){
      assert.ok([...roles].some(r=>r.startsWith('cabinet-')),f.id+': missing thin cabinet carcass');
      assert.ok([...roles].some(r=>r.startsWith('door-')||r==='drawer-front'),f.id+': missing visible closed fronts');
    }
    assert.ok(!roles.has('sideboard_base')&&!roles.has('shoe_lower')&&!roles.has('upper_cabinet'),f.id+': obsolete opaque cabinet block still present');
  }
  const entry=s.defaultFurniture.find(f=>f.id==='fit-entry_shoe_station');
  assert.equal(entry?.cabinetRevision,revision,id+': shoe station not upgraded');
  const keyTop=entry.parts.find(p=>p.id.endsWith('key-drawer-top'));
  assert.ok(keyTop,id+': shoe key drawer must be closed by a real top board');
  assert.equal(keyTop.heightMm,18,id+': key-drawer top is not an 18mm board');
  assert.equal(keyTop.elevationMm+keyTop.heightMm,1090,id+': shoe key-drawer finished top moved');
  for(const front of entry.parts.filter(p=>p.role==='drawer-front'&&p.id.includes('-key-')))assert.ok(front.elevationMm+front.heightMm<=keyTop.elevationMm,id+': key drawer front overlaps top cover');
  const sideboard=s.defaultFurniture.find(f=>f.id==='fit-dining_sideboard_wall');
  assert.equal(sideboard?.cabinetRevision,sideboardRevision,id+': sideboard not upgraded');
  assert.equal(sideboard.heightMm,2700,id+': reference sideboard must reach the model ceiling');
  assert.equal(sideboard.baseHeightMm,2700,id+': sideboard native height mismatch');
  assert.ok(sideboard.parts.some(p=>p.role==='drawer-front'),id+': north small-item drawers missing');
  for(const p of sideboard.parts.filter(p=>p.role==='drawer-front'))assert.ok(Math.max(p.w,p.d)<=600,id+': narrow small-item drawers turned into full-module drawers');
  assert.ok(sideboard.parts.some(p=>p.role==='wood-countertop'),id+': wood counter missing');
  assert.ok(sideboard.parts.some(p=>p.role==='led-strip'),id+': niche lighting missing');
  assert.ok(/椅|250|抽屉/.test(JSON.stringify(sideboard.cabinetDesign)+JSON.stringify(sideboard.conditions)),id+': access limitation must remain explicit');
  if(id==='family'||s.metadata.layoutUpdate){
    const back=s.defaultFurniture.find(f=>f.id==='fit-sofa_back_storage');
    assert.ok(back.parts.some(p=>p.role==='door-sliding'),'family: sofa rear must keep sliding doors');
    assert.ok(!back.parts.some(p=>p.role==='drawer-front'),'family: no protruding sofa-rear drawers');
    assert.equal(s.BIFOLDS.length,1);assert.equal(s.BIFOLDS[0].closed,true);assert.equal(s.BIFOLDS[0].panels,4);
  }
  report.push({id,designed:designed.length,historicalLayoutUnchanged:true,historicalEnvelopesUnchanged:true,authorizedPublicAreaLayer:!!s.metadata.layoutUpdate});
}
console.log(JSON.stringify({status:'PASS',revision,sideboardRevision,schemes:report},null,2));
