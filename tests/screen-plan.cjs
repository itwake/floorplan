'use strict';

// Isolated regression test for the owner's R4 plan. Geometry checks are model
// checks only, not structural, electrical, access or fabrication approval.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),plans=require(path.join(root,'data/house-plans.js'));
const confirmed=path.join(root,'data/source/screen-confirmed-20261010.json');
const localReference=path.resolve(root,'..','方案4平面修订_20261010_R4/方案4_派生设计数据.json');
const referenceFile=fs.existsSync(confirmed)?confirmed:localReference;
const reference=JSON.parse(fs.readFileSync(referenceFile,'utf8'));
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Recorded before adding screen: these hashes cover every field of the three
// published schemes, including cabinet details and previously corrected doors.
const baseline={
  wood:'22be3487cbf971be1d57e305c7b5967034d094b1f04e6188413f134327fedca5',
  family:'5421b99746df2c307c52d543579a0a5789f3f38edaea51c589adfeaaf56b139a',
  laundry:'d2a3c1cec12edc27af4e4d2e2dd153455fed2e20e6a040b042cc641f86541aae',
  reference:'d3f2941bedc0b05c9f67843ef091f3b2a3ab25cf47ca980ce14f44e56bd53015'
};
if(process.argv.includes('--record-baseline')){
  console.log(JSON.stringify({...Object.fromEntries(['wood','family','laundry'].map(id=>[id,hash(plans.schemes[id])])),reference:hash(reference)},null,2));
  process.exit(0);
}
for(const id of ['wood','family','laundry'])assert.equal(hash(plans.schemes[id]),baseline[id],id+': adding scheme 4 changed the published scheme');
assert.equal(hash(reference),baseline.reference,'retained R4 reference differs from the owner-confirmed draft');
assert.equal(plans.unit,'mm');assert.equal(plans.defaultScheme,'family','new optional scheme must not reset the established default');
const screen=plans.schemes.screen;assert.ok(screen,'screen scheme missing');
assert.equal(screen.id,'screen');
const tol=.02,eq=(a,b,label)=>assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} != ${b}`);
const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>v[k]!==undefined).map(k=>[k,v[k]]));
// Human-readable notes can be revised when publishing; structural/numeric
// records, object identifiers and all operation data must remain source exact.
const withoutNotes=v=>Array.isArray(v)?v.map(withoutNotes):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['notes','name','label','description','title','usageNote','frameDetail'].includes(k)).map(([k,value])=>[k,withoutNotes(value)])):v;
for(const key of ['ROOMS','WALLS','WALL_META','WINS','WIN_META','DOORS','SLIDES','BAYS','BIFOLDS'])assert.deepEqual(withoutNotes(screen[key]),withoutNotes(reference[key]),key+': screen no longer matches confirmed R4');
assert.equal(screen.WALLS.length,screen.WALL_META.length);assert.equal(screen.WINS.length,screen.WIN_META.length);
assert.deepEqual(screen.ROOMS.map(r=>[r.id,r.poly]),reference.ROOMS.map(r=>[r.id,r.poly]),'room topology changed');
const expectedIds=reference.defaultFurniture.map(f=>f.id).sort(),actualIds=screen.defaultFurniture.map(f=>f.id).sort();
assert.deepEqual(actualIds,expectedIds,'R4 furniture removed or unexpectedly added');
assert.equal(new Set(actualIds).size,actualIds.length,'duplicate furniture IDs');
const kitchenId='fit-kitchen-20261005',screenId='scheme4-entry-screen';
for(const original of reference.defaultFurniture){
  const f=screen.defaultFurniture.find(q=>q.id===original.id);
  assert.deepEqual(pick(f,['cx','cy','w','d','rot','elevationMm']),pick(original,['cx','cy','w','d','rot','elevationMm']),f.id+': published furniture plan envelope differs from R4');
  if(f.id!==kitchenId)assert.equal(f.heightMm,original.heightMm,f.id+': unauthorized furniture height change');
  else assert.ok(f.heightMm>=890&&f.heightMm<=2700,'kitchen thin-panel detail may add upper cabinetry, not leave model envelope vertically');
  if(![kitchenId,screenId].includes(f.id))assert.deepEqual(f.parts,original.parts,f.id+': unchanged R4 component detail altered');
  if(f.purchasedProductId){
    const product=reference.metadata.products.find(q=>q.id===f.purchasedProductId);assert.ok(product,f.id+': purchased product record missing');
    assert.deepEqual([f.w,f.d,f.heightMm],[product.dimensionsMm.width,product.dimensionsMm.depth,product.dimensionsMm.height],f.id+': purchased dimensions changed');
  }
}
function finite(v,at='screen'){
  if(typeof v==='number')assert.ok(Number.isFinite(v),at+': non-finite number');
  else if(Array.isArray(v))v.forEach((q,i)=>finite(q,at+'['+i+']'));
  else if(v&&typeof v==='object')for(const [key,q]of Object.entries(v))finite(q,at+'.'+key);
}
finite(screen);
for(const f of screen.defaultFurniture){
  assert.ok([f.cx,f.cy,f.w,f.d,f.rot,f.heightMm].every(Number.isFinite)&&f.w>0&&f.d>0&&f.heightMm>0,f.id+': invalid occupied dimension');
  for(const p of f.parts||[])assert.ok([p.x,p.y,p.w,p.d,p.elevationMm,p.heightMm].every(Number.isFinite)&&p.w>0&&p.d>0&&p.heightMm>0,f.id+'/'+p.id+': invalid real panel');
}
const get=id=>{const f=screen.defaultFurniture.find(q=>q.id===id);assert.ok(f,id+' missing');return f;};
const box=f=>{const a=f.rot*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),w=f.w*c+f.d*s,d=f.w*s+f.d*c;return{x:f.cx-w/2,y:f.cy-d/2,w,d};};
const intersects=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>tol&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>tol;
const inside=(p,b)=>p[0]>=b.x-tol&&p[0]<=b.x+b.w+tol&&p[1]>=b.y-tol&&p[1]<=b.y+b.d+tol;
const rect=r=>({x:r[0],y:r[1],w:r[2]-r[0],d:r[3]-r[1]});
// OBB/SAT avoids inventing a collision from a rotated object's broad AABB.
function corners(f){const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[f.cx+x*f.w/2*c-y*f.d/2*s,f.cy+x*f.w/2*s+y*f.d/2*c]);}
function collides(a,b){
  const A=corners(a),B=corners(b),axes=[];
  for(const points of [A,B])for(let i=0;i<2;i++){const dx=points[i+1][0]-points[i][0],dy=points[i+1][1]-points[i][1],n=Math.hypot(dx,dy);axes.push([-dy/n,dx/n]);}
  for(const axis of axes){const av=A.map(p=>p[0]*axis[0]+p[1]*axis[1]),bv=B.map(p=>p[0]*axis[0]+p[1]*axis[1]);if(Math.min(Math.max(...av),Math.max(...bv))-Math.max(Math.min(...av),Math.min(...bv))<=tol)return false;}
  return true;
}
const livingIds=['family-f6','family-f7','family-f8','family-f23','family-f24','family-f25','family-f26','family-f27','living-floorlamp','scheme4-living-armchair','scheme4-entry-screen','fit-bay_living_family'];
const living=livingIds.map(get);
for(let i=0;i<living.length;i++)for(let j=i+1;j<living.length;j++)assert.ok(!collides(living[i],living[j]),living[i].id+' collides with '+living[j].id);
// All furniture occupied geometry equals R4, so no new pairwise envelope
// collisions are allowed even for composite fixtures whose bbox includes air.
function collisionPairs(scheme){const items=scheme.defaultFurniture.filter(f=>!['rug','faucet'].includes(f.type)),pairs=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(collides(items[i],items[j]))pairs.push([items[i].id,items[j].id].sort().join('|'));return pairs.sort();}
assert.deepEqual(collisionPairs(screen),collisionPairs(reference),'new furniture collision introduced beyond confirmed R4');
const rug=get('family-living-rug'),sofa=get('family-f6'),chair=get('scheme4-living-armchair');
assert.deepEqual([rug.cx,rug.cy,rug.w,rug.d,rug.rot],[5050,8000,3200,2600,0]);
assert.deepEqual([chair.cx,chair.cy,chair.w,chair.d,chair.rot],[3985,8830,850,850,270]);
assert.deepEqual([sofa.w,sofa.d,sofa.rot],[2410,980,90]);
// The existing sofa builder uses 70mm inset legs. The forward (+local y)
// legs must sit on the rug; this does not claim real feet exactly match it.
const a=sofa.rot*Math.PI/180,frontFeet=[-1,1].map(sign=>{const lx=sign*(sofa.w/2-70),ly=sofa.d/2-70;return[sofa.cx+lx*Math.cos(a)-ly*Math.sin(a),sofa.cy+lx*Math.sin(a)+ly*Math.cos(a)];});
for(const foot of frontFeet)assert.ok(inside(foot,box(rug)),'rug does not cover modeled main-sofa front foot '+foot.join(','));
const balcony=screen.SLIDES.find(d=>d.id==='balcony_door');assert.ok(balcony);
assert.deepEqual(balcony.sourceAxisMm,[6420,9600,6420,11100]);assert.deepEqual(balcony.rect,[6360,9600,6480,11100]);
assert.equal(balcony.openingWidthMm,1500);assert.equal(balcony.panelCount,3);assert.equal(balcony.trackCount,3);assert.equal(balcony.stackTo,'south');
assert.equal(balcony.frameDetail,true,'screen 3D needs real frame/track presentation, not only moved glass panes');
assert.ok(screen.WALLS.some(w=>w[0]===6360&&w[2]===6480&&w[1]>=11100),'balcony frame must remain aligned with kitchen west wall');
const nominalOpeningEndCaps=[];
for(const opening of [...screen.DOORS,...screen.SLIDES]){
  assert.ok(opening.rect?.length===4,opening.id+': door opening rect missing');
  if(opening.surface)continue;
  const aperture=rect(opening.rect);assert.ok(aperture.w>0&&aperture.d>0,opening.id+': degenerate hole');
  const vertical=aperture.d>aperture.w,axis=vertical?'y':'x',span=vertical?'d':'w',start=aperture[axis],end=start+aperture[span];
  const maxCap=Math.min(60,(vertical?aperture.w:aperture.d)/2);
  for(const wall of screen.WALLS){
    const wallBox=rect(wall);if(!intersects(aperture,wallBox))continue;
    const overlapStart=Math.max(start,wallBox[axis]),overlapEnd=Math.min(end,wallBox[axis]+wallBox[span]),overlapLength=overlapEnd-overlapStart;
    // Confirmed wall axes include half-thickness corner/jamb end caps. Do not
    // erase these to make a nominal 1500mm label appear like a certified net
    // opening. Only <=60mm overlaps at the two ends are permitted; the entire
    // central span must remain free of any full-height solid wall.
    const endCap=overlapLength<=maxCap+tol&&(overlapStart<=start+tol||overlapEnd>=end-tol);
    assert.ok(endCap,opening.id+': full solid wall obstructs the middle of the door hole');
    nominalOpeningEndCaps.push({opening:opening.id,wall:wall.slice(0,4),axisOverlapMm:overlapLength});
  }
  eq(Math.max(aperture.w,aperture.d),opening.openingWidthMm,opening.id+' opening width (not leaf)');
}
for(const win of screen.WIN_META){
  const w=win.rect;if(!w||win.surface)continue;
  const p=[(w[0]+w[2])/2,(w[1]+w[3])/2];
  assert.ok(!screen.WALLS.some(q=>p[0]>q[0]+tol&&p[0]<q[2]-tol&&p[1]>q[1]+tol&&p[1]<q[3]-tol),win.sourceId+': full-height wall blocks window center');
}
const separator=get(screenId);assert.deepEqual([separator.cx,separator.cy,separator.w,separator.d,separator.heightMm],[4550,12400,1500,80,2000]);
assert.ok(Array.isArray(separator.parts)&&separator.parts.length>=12,'screen needs actual thin posts/slats and beams, not its old opaque projection');
const slats=separator.parts.filter(p=>/slat|grille|格栅/.test([p.id,p.role,p.label].join(' '))&&p.heightMm>1500);
assert.ok(slats.length>=10,'screen is missing real tall grille slats');
const beams=separator.parts.filter(p=>p.w>1000&&p.heightMm<=80);assert.ok(beams.length>=2,'screen requires thin upper and lower beams');
for(const p of separator.parts){
  assert.ok(p.x>=-750-tol&&p.x+p.w<=750+tol&&p.y>=-40-tol&&p.y+p.d<=40+tol,screenId+'/'+p.id+': part leaves confirmed footprint');
  assert.ok(p.elevationMm>=0&&p.elevationMm+p.heightMm<=2000+tol,screenId+'/'+p.id+': part exceeds confirmed screen height');
  assert.ok(p.heightMm<=80||Math.min(p.w,p.d)<=30,screenId+'/'+p.id+': opaque tall solid screen block');
}
assert.ok(slats.reduce((sum,p)=>sum+p.w,0)<separator.w*.6,'screen must have real gaps, not a dense solid row');
const kitchen=get(kitchenId);assert.deepEqual([kitchen.cx-kitchen.w/2,kitchen.cy-kitchen.d/2,kitchen.cx+kitchen.w/2,kitchen.cy+kitchen.d/2],[6020,11270,8290,13890]);
assert.ok(kitchen.parts?.length>=15,'kitchen detail missing real panels/upper cabinets');
assert.ok(kitchen.parts.some(p=>p.elevationMm>=1400),'R4 kitchen needs upper cabinets, not floor-only source placeholders');
for(const p of kitchen.parts){
  assert.ok(p.x>=-kitchen.w/2-tol&&p.x+p.w<=kitchen.w/2+tol&&p.y>=-kitchen.d/2-tol&&p.y+p.d<=kitchen.d/2+tol,p.id+': cabinet component leaves R4 kitchen fixture plan envelope');
  assert.ok(p.elevationMm>=0&&p.elevationMm+p.heightMm<=kitchen.heightMm+tol,p.id+': cabinet component exceeds kitchen fixture native height');
  if(/base|cabinet|door|shelf|panel|top|bottom|counter/i.test(p.role||''))assert.ok(p.heightMm<=80||Math.min(p.w,p.d)<=30,p.id+': opaque kitchen cabinet block replaces thin-panel carcass');
}
const mainRouteToChair=box(chair).x-2525,southChairs=screen.defaultFurniture.filter(f=>['family-f26','family-f27'].includes(f.id)),screenNorth=box(separator).y;
const screenGap=Math.min(...southChairs.map(f=>screenNorth-(box(f).y+box(f).d)));
eq(mainRouteToChair,1035,'west route between cabinet and single chair');eq(screenGap,685,'south dining chairs to screen');
console.log(JSON.stringify({status:'PASS',scheme:'screen',sourceExactR4:true,otherSchemesUnchanged:true,modelOnly:true,nominalOpeningsNotCertifiedNetWidth:true,nominalOpeningEndCaps,frontFeetMm:frontFeet,grilleSlats:slats.length,westCabinetToArmchairGapMm:mainRouteToChair,southChairToScreenGapMm:screenGap,balconyFrameAligned:true},null,2));
