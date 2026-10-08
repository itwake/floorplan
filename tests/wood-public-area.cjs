'use strict';
// Model layout only, not fabrication, load or vehicle-extraction approval.
const assert=require('node:assert/strict'),path=require('node:path');
const plans=require(path.join(__dirname,'..','data/house-plans.js'));
const {previousPlan,hash,baseline}=require('./wood-public-area-helpers.cjs');
const {worldRect,REVISION}=require('../tools/wood-public-area.cjs');
const p=plans.schemes.wood,q=plans.schemes.family,prior=previousPlan(p),r=p.metadata.layoutUpdate;
const get=id=>p.defaultFurniture.find(f=>f.id===id),ref=id=>q.defaultFurniture.find(f=>f.id===id);
const eq=(a,b,label)=>assert.ok(Math.abs(a-b)<.01,`${label}: ${a} != ${b}`);
const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.01&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>.01;
assert.equal(hash(prior),baseline.wood);
for(const id of ['family','laundry'])assert.equal(hash(plans.schemes[id]),baseline[id],id+': must remain wholly unchanged');
assert.equal(r.id,REVISION);assert.equal(r.referenceScheme,'family');assert.equal(r.sourceSnapshotsUnchanged,true);
assert.deepEqual(r.newFurnitureIds,['fit-sofa_back_storage','fit-wood_garage','garage-folded_stroller','garage-child_bike']);
assert.deepEqual(r.previousFurniture.map(f=>f.id).sort(),['wood-f5','wood-f6','wood-living-rug','wood-f7','wood-f8','wood-f9','wood-f10','wood-f11','wood-f12','fit-dining_sideboard_wall'].sort());
for(const key of ['ROOMS','WALLS','WALL_META','WINS','WIN_META','DOORS','SLIDES','BAYS','BOUNDS','PLAN_BOUNDS','CENTER'])assert.deepEqual(p[key],prior[key],key+': geometry changed');
const wall=p.WALLS[p.WALL_META.findIndex(w=>w.sourceId==='w_bath_south')],cx=(wall[0]+wall[2])/2;
assert.equal(cx,5485);assert.deepEqual(r.alignment.modelWallX,[4160,6810]);
const sofa=get('wood-f5'),tv=get('wood-f6'),rug=get('wood-living-rug'),coffee=get('wood-f7');
for(const f of [sofa,tv,rug,coffee]){
  assert.equal(f.cx,cx,f.id+': share wall centre');
  const old=prior.defaultFurniture.find(q=>q.id===f.id);
  for(const k of ['w','d','rot','heightMm','purchasedProductId'])assert.deepEqual(f[k],old[k],f.id+': body altered');
  assert.ok(f.cx>old.cx,f.id+': did not move east');
  assert.deepEqual(f.originalSourceFootprintMm,old.sourceFootprintMm);assert.deepEqual(f.sourceFootprintMm,worldRect(f));
}
assert.equal(sofa.rot,180);assert.equal(tv.rot,0);
eq(rug.cy,((tv.cy+tv.d/2)+(sofa.cy-sofa.d/2))/2,'rug midway between TV stand and sofa');eq(coffee.cy,rug.cy,'coffee/rug centre');
const side=get('fit-dining_sideboard_wall'),back=get('fit-sofa_back_storage');
for(const k of ['cx','cy','w','d','rot','heightMm','parts','cabinetDesign'])assert.deepEqual(side[k],ref(side.id)[k],'straight sideboard '+k);
assert.equal(side.cabinetRevision,'sideboard-reference-v2');assert.ok(!side.parts.some(t=>t.id.startsWith('d_return_')));
assert.equal(back.cx,cx);assert.equal(back.w,1900);assert.equal(back.d,250);assert.equal(back.heightMm,650);
assert.equal(back.baseWidthMm,1900);assert.deepEqual(back.parts.map(t=>t.role),ref(back.id).parts.map(t=>t.role));
for(const t of back.parts.filter(t=>t.role==='cabinet-side'||t.role.startsWith('door-')))assert.equal(Math.min(t.w,t.d),18,'back cabinet keeps real thin boards');
assert.ok(!JSON.stringify({notes:back.notes,conditions:back.conditions,design:back.cabinetDesign}).includes('2000×250×650'));
eq(worldRect(back).y-(worldRect(sofa).y+worldRect(sofa).d),20,'sofa/back gap');
eq(6462.5-(back.cx+back.w/2),27.5,'boundary gap, NOT passage');
assert.ok(back.parts.some(t=>t.role==='door-sliding'));assert.ok(!back.parts.some(t=>t.role==='drawer-front'));
const pairs=[['wood-f8','family-f23'],['wood-f9','family-f24'],['wood-f10','family-f25'],['wood-f11','family-f26'],['wood-f12','family-f27']];
for(const [id,reference]of pairs)for(const k of ['cx','cy','w','d','rot','heightMm'])assert.equal(get(id)[k],ref(reference)[k],id+' matches family '+k);
const table=get('wood-f8'),tableRect=worldRect(table),cabRect=worldRect(side);
assert.equal(table.rot,90);eq(tableRect.x,cabRect.x+cabRect.w,'table touches sideboard');
eq(worldRect(sofa).x-(cabRect.x+cabRect.w),1715,'west living route model width');
const eastChair=worldRect(get('wood-f11'));eq(5300-(eastChair.x+eastChair.w),1320,'dining route model width');eq(5300-(eastChair.x+eastChair.w+300),1020,'after nominal 300mm chair retreat');
const garage=get('fit-wood_garage'),bifold=p.BIFOLDS[0];assert.equal(garage.w,1500);assert.equal(garage.d,1000);
assert.equal(p.BIFOLDS.length,1);assert.equal(bifold.closed,true);assert.equal(bifold.panels,4);assert.equal(bifold.axis,'x');assert.equal(bifold.foldDirection,'inward');
for(const k of ['rect','insideRect','panelWidthMm','clearWidthMm','conditions'])assert.deepEqual(bifold[k],q.BIFOLDS[0][k]);
eq(cabRect.y+cabRect.d,worldRect(garage).y,'cabinet joins library north end');
const freeEnd=bifold.rect[1]+bifold.panelWidthMm;
for(const id of ['garage-folded_stroller','garage-child_bike']){
  const f=get(id),b=worldRect(f);assert.ok(b.y>freeEnd,id+': blocks fold sector');
  assert.ok(b.x>=bifold.insideRect[0]&&b.x+b.w<=bifold.insideRect[2]&&b.y+b.d<=bifold.insideRect[3],id+': stored body outside library');
  for(const k of ['cx','cy','w','d','rot','heightMm','elevationMm'])assert.equal(f[k],ref(id)[k]);
}
for(const part of garage.parts.filter(t=>t.role==='shelf'))assert.ok(garage.cy+part.y>=freeEnd,'shelf blocks fold sector');
assert.match(bifold.conditions.join(' '),/不能直接横抽.*不证明取放可行/);assert.match(r.conditions.join(' '),/不是通路/);
// Exclude decorative rug and deliberately nested vehicles, not solid bodies.
const solid=['wood-f5','wood-f6','wood-f7',...pairs.map(([id])=>id),'fit-dining_sideboard_wall','fit-sofa_back_storage','fit-wood_garage','living-floorlamp'].map(get);
for(let i=0;i<solid.length;i++){
  const f=solid[i],b=worldRect(f);
  for(let j=i+1;j<solid.length;j++)assert.ok(!overlaps(b,worldRect(solid[j])),f.id+' overlaps '+solid[j].id);
  for(const [x,y,x1,y1]of p.WALLS)assert.ok(!overlaps(b,{x,y,w:x1-x,d:y1-y}),f.id+' overlaps wall');
}
const door=p.DOORS.find(d=>d.entry),stored=worldRect(garage);assert.ok(door.h[0]-(stored.x+stored.w)>door.len,'entry sweep hits library');
assert.deepEqual(get('fit-entry_shoe_station'),prior.defaultFurniture.find(f=>f.id==='fit-entry_shoe_station'));
console.log(JSON.stringify({status:'PASS',revision:REVISION,schemes2And3Unchanged:true,wallsOpeningsAndBedroomsUnchanged:true,alignedWallCenterMm:cx,westRouteModelMm:1715,diningRouteModelMm:1320,closedNorthBifold:true,vehicleExtractionNotApproved:true,modelOnly:true},null,2));
