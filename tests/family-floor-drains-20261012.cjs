'use strict';

// An independently frozen before-image, plus visible-solid and door-sweep
// checks. These checks certify only a concept display, not actual drainage.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyFloorDrains,beforeFamilyFloorDrains,REVISION,DRAIN_IDS}=require('../tools/family-floor-drains-20261012.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Frozen independently from ad5c4e96696b1f62fed5731c20aeb59e37ae3191.
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'100755180661227c3dae08b280c9cf9450d0fc8af86972f160d21f396e9a066d',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const expected=Object.freeze({
 'family-drain-balcony':{cx:6975,cy:10700,elevation:0,room:'balcony'},
 'family-drain-bath1-dry':{cx:5250,cy:4290,elevation:0,room:'bath_1'},
 'family-drain-bath1-shower':{cx:6420,cy:3600,elevation:50,room:'bath_1',shower:'family-f12'},
 'family-drain-bath2-dry':{cx:5070,cy:6000,elevation:0,room:'bath_2'},
 'family-drain-bath2-shower':{cx:6430,cy:5240,elevation:50,room:'bath_2',shower:'family-f15'}
});
const rad=degrees=>degrees*Math.PI/180;
const transform=(x,y,cx,cy,angle)=>[cx+x*Math.cos(angle)-y*Math.sin(angle),cy+x*Math.sin(angle)+y*Math.cos(angle)];
function rect(cx,cy,w,d,angle=0,z=0,h=2700){return{poly:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,y])=>transform(x,y,cx,cy,angle)),z,h};}
function partSolid(f,p){const a=rad(f.rot||0),[cx,cy]=transform(p.x+p.w/2,p.y+p.d/2,f.cx,f.cy,a);return rect(cx,cy,p.w,p.d,a,(f.elevationMm||0)+(p.elevationMm||0),p.heightMm);}
function furnitureSolid(f){return rect(f.cx,f.cy,f.w,f.d,rad(f.rot||0),f.elevationMm||0,f.heightMm||700);}
function polygonOverlap(a,b){
 for(const poly of [a,b])for(let i=0;i<poly.length;i++){
  const next=poly[(i+1)%poly.length],edge=[next[0]-poly[i][0],next[1]-poly[i][1]],axis=[-edge[1],edge[0]],norm=Math.hypot(...axis);
  axis[0]/=norm;axis[1]/=norm;
  const project=p=>p[0]*axis[0]+p[1]*axis[1],aa=a.map(project),bb=b.map(project);
  if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=.001)return false;
 }
 return true;
}
function solidOverlap(a,b){return Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z)>.001&&polygonOverlap(a.poly,b.poly);}
function pointInside([x,y],poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
function topCoverage(f){
 const z=f.heightMm-.05,parts=f.parts.filter(p=>p.elevationMm<=z&&p.elevationMm+p.heightMm>z);
 const xs=[-f.w/2,f.w/2,...parts.flatMap(p=>[p.x,p.x+p.w])].sort((a,b)=>a-b),ys=[-f.d/2,f.d/2,...parts.flatMap(p=>[p.y,p.y+p.d])].sort((a,b)=>a-b);
 let area=0;
 for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){
  const x=(xs[i-1]+xs[i])/2,y=(ys[j-1]+ys[j])/2;
  if(x< -f.w/2||x>f.w/2||y< -f.d/2||y>f.d/2)continue;
  if(parts.some(p=>x>p.x&&x<p.x+p.w&&y>p.y&&y<p.y+p.d))area+=(xs[i]-xs[i-1])*(ys[j]-ys[j-1]);
 }
 return area/(f.w*f.d);
}
function showerBoundarySolids(s){
 // Actual renderer has a south and an east glass plane, corner posts and
 // upper rails. The existing 50 mm tray is deliberately NOT an obstacle:
 // a concept drain rests on that old display surface without cutting it.
 const a=rad(s.rot||0),fromLocal=(x,y,w,d)=>{const [cx,cy]=transform(x,y,s.cx,s.cy,a);return rect(cx,cy,w,d,a,(s.elevationMm||0)+50,1950);};
 return[
  {id:s.id+'/south-glass',solid:fromLocal(0,s.d/2-5,s.w,10)},
  {id:s.id+'/east-glass',solid:fromLocal(s.w/2-5,0,10,s.d)},
  {id:s.id+'/southwest-post',solid:fromLocal(-s.w/2+10,s.d/2-5,20,30)},
  {id:s.id+'/southeast-post',solid:fromLocal(s.w/2-10,s.d/2-10,20,20)},
  {id:s.id+'/northeast-post',solid:fromLocal(s.w/2-5,-s.d/2+10,30,20)}
 ];
}

function verifyFamilyFloorDrains(bundle){
  bundle=require('../tools/family-electrical-20261012.cjs').beforeFamilyElectrical(bundle);
 assert.equal(REVISION,'family-floor-drains-20261012');
 const originalHash=hash(bundle),p=bundle.schemes.family,u=p.metadata.familyFloorDrainsUpdate,oldBundle=beforeFamilyFloorDrains(bundle),old=oldBundle.schemes.family,ids=Object.keys(expected),idSet=new Set(ids);
 assert.equal(u?.id,REVISION);assert.equal(u.date,'2026-10-12');assert.equal(u.sourceSnapshotsUnchanged,true);
 assert.equal(hash(old),baseline.family,'exact independently frozen pre-drains Scheme 2 rollback');
 assert.equal(hash(beforeFamilyFloorDrains(p)),baseline.family,'plan-only rollback');
 assert.equal(hash(beforeFamilyFloorDrains(old)),baseline.family,'absent layer is inert');
 assert.deepEqual(DRAIN_IDS.slice().sort(),ids.slice().sort());assert.deepEqual(u.newFurnitureIds.slice().sort(),ids.slice().sort());
 for(const key of ['changedFurnitureIds','removedFurnitureIds','replacedFurnitureIds'])assert.deepEqual(u[key],[],key+' must not hide edits to old objects');
 assert.equal(old.defaultFurniture.length,63);assert.equal(p.defaultFurniture.length,68);
 assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,68,'unique editable objects');
 assert.deepEqual(p.defaultFurniture.filter(f=>!idSet.has(f.id)),old.defaultFurniture,'all original 63 objects exact and in original order');
 for(const key of Object.keys(old))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],old[key],'all architecture/source/display fields exact '+key);
 assert.deepEqual(p.defaultFurniture.find(f=>f.id==='laundry_washer'),old.defaultFurniture.find(f=>f.id==='laundry_washer'),'guest washer including original drainage notes unchanged');
 const allowedMetadata=new Set(['familyFloorDrainsUpdate','conditions','designCorrections','converter']);
 for(const key of Object.keys(old.metadata))if(!allowedMetadata.has(key))assert.deepEqual(p.metadata[key],old.metadata[key],'historical metadata remains exact '+key);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions,'retained historical conditions in order');
 assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 assert.equal(u.visualOnly,true);assert.equal(u.placementUnverified,true);
 for(const key of ['floorDrainLocationConfirmed','floorSlopeConfirmed','drainConnectionsConfirmed'])assert.equal(u[key],false,key+' cannot be implied by visible covers');
 assert.deepEqual(u.disabledImplicitShowerDrainIds,['family-f12','family-f15'],'old implicit display drains suppressed independently of new-item presence');
 const disclosure=JSON.stringify({u,drains:p.defaultFurniture.filter(f=>idSet.has(f.id)),conditionTail:p.metadata.conditions.slice(old.metadata.conditions.length)});
 assert.match(disclosure,/未测|非实测|待.*(核|确认)|not-measured/);assert.match(disclosure,/坡|slope/i);assert.match(disclosure,/防水/);assert.match(disclosure,/管|pipe/i);
 assert.match(disclosure,/洗衣机|Washer/i,'washer drainage must not be silently equated with a floor grate');
 assert.match(disclosure,/不.*施工|非.*施工|notConstructionApproval|not-construction/i);
 const drains=p.defaultFurniture.filter(f=>idSet.has(f.id)),topFractions={};
 for(const f of drains){
  const e=expected[f.id],design=f.drainDesign;
  assert.equal(f.type,'fixture');assert.equal(f.modelVariant,'square-floor-drain');assert.equal(f.sourceId,f.id);
  assert.deepEqual([f.cx,f.cy,f.w,f.d,f.heightMm,f.elevationMm,f.rot],[e.cx,e.cy,150,150,4,e.elevation,0],f.id+' provisional footprint/display datum');
  assert.equal(f.roomId,e.room);assert.equal(f.layoutRevision,REVISION);
  assert.deepEqual(f.sourceFootprintMm,{x:e.cx-75,y:e.cy-75,w:150,d:150});
  assert.equal(f.assignedShowerId,e.shower);assert.equal(design.visualOnly,true);assert.equal(design.modelDatumElevationMm,e.elevation);
  assert.deepEqual([design.coverWidthMm,design.coverDepthMm,design.visibleThicknessMm],[150,150,4]);
  assert.equal(design.placementStatus,'provisional-not-measured');assert.equal(design.productSelected,false);
  assert.equal(design.pipeDiameterMm,null);assert.equal(design.waterSealDepthMm,null);
  assert.equal(design.drainConnectionsConfirmed,false);assert.equal(design.floorSlopeConfirmed,false);assert.equal(design.separateWasherDrainUnchanged,true);
  assert.equal(design.surfaceMount,e.shower?'existing-shower-tray-surface':'floor-surface-concept');
  assert.equal(f.parts.length,15,'four frame pieces, one recessed dark bed and ten real grate bars '+f.id);
  assert.equal(f.parts.filter(q=>q.role==='floor-drain-frame').length,4);
  assert.equal(f.parts.filter(q=>q.role==='floor-drain-slot-bed').length,1);
  const grate=f.parts.filter(q=>q.role==='floor-drain-grate').sort((a,b)=>a.x-b.x);
  assert.equal(grate.length,10,'ten separate bars, not a full solid cap '+f.id);
  for(let i=0;i<10;i++)assert.deepEqual([grate[i].x,grate[i].y,grate[i].w,grate[i].d,grate[i].elevationMm,grate[i].heightMm],[-62+i*13,-63,8,126,1,3],'ten-bar visible placeholder geometry '+f.id+' / '+i);
  for(let i=1;i<grate.length;i++)assert.equal(grate[i].x-grate[i-1].x-grate[i-1].w,5,'real five-millimetre gaps between bars');
  assert.equal(new Set(f.parts.map(q=>q.id)).size,f.parts.length,'unique part IDs');
  for(const q of f.parts){
   for(const key of ['x','y','w','d','elevationMm','heightMm'])assert.ok(Number.isFinite(q[key]),f.id+'/'+q.id+' finite '+key);
   assert.ok(q.w>0&&q.d>0&&q.heightMm>0);assert.ok(q.x>=-75&&q.y>=-75&&q.x+q.w<=75&&q.y+q.d<=75);
   assert.ok(q.elevationMm>=0&&q.elevationMm+q.heightMm<=4,'no buried pipe/trap falsely represented '+q.id);
  }
  topFractions[f.id]=topCoverage(f);
  assert.equal(topFractions[f.id],((150*150-134*134)+10*8*126)/(150*150),'independently calculated ten-bar visible metal fraction');
  assert.ok(topFractions[f.id]>.2&&topFractions[f.id]<.9,'visible surface has actual slots, not a full-area solid cap '+f.id);
  assert.ok(f.parts.some(q=>/slat|grille|grate/i.test(q.role||'')),'real separate metal bars '+f.id);
  const room=p.ROOMS.find(q=>q.id===e.room),envelope=furnitureSolid(f);
  assert.ok(envelope.poly.every(q=>pointInside(q,room.poly)),f.id+' entirely on its original indoor floor');
  if(e.shower){const shower=p.defaultFurniture.find(q=>q.id===e.shower);assert.ok(envelope.poly.every(q=>pointInside(q,furnitureSolid(shower).poly)),f.id+' within assigned old tray');}
 }
 // Full old solid components, rather than misleading parent cabinet boxes.
 const obstacles=old.defaultFurniture.flatMap(f=>f.type==='shower'?showerBoundarySolids(f):f.parts?.length?f.parts.map(q=>({id:f.id+'/'+q.id,solid:partSolid(f,q)})):[{id:f.id,solid:furnitureSolid(f)}]);
 obstacles.push(...p.WALLS.map((w,i)=>({id:'wall-'+i,solid:rect((w[0]+w[2])/2,(w[1]+w[3])/2,w[2]-w[0],w[3]-w[1])})));
 for(const f of drains)for(const o of obstacles)assert.equal(solidOverlap(furnitureSolid(f),o.solid),false,f.id+' intersects real fixed solid '+o.id);
 for(let i=0;i<drains.length;i++)for(let j=i+1;j<drains.length;j++)assert.equal(solidOverlap(furnitureSolid(drains[i]),furnitureSolid(drains[j])),false,'new drains overlap');
 // A complete 0..90° sweep, including a 40 mm illustrative leaf thickness.
 // Add a half-step radial reserve, so interpolation gaps cannot hide a hit.
 let sweepStates=0;
 for(const door of p.DOORS){
  const a0=Math.atan2(door.c[1],door.c[0]),cross=door.c[0]*door.o[1]-door.c[1]*door.o[0],direction=Math.sign(cross),reserve=door.len*rad(.25)/2;
  assert.notEqual(direction,0,door.id+' nonzero signed swing');
  for(let deg=0;deg<=90;deg+=.25){
   const a=a0+direction*rad(deg),cx=door.h[0]+Math.cos(a)*door.len/2,cy=door.h[1]+Math.sin(a)*door.len/2,leaf=rect(cx,cy,door.len+2*reserve,40+2*reserve,a,0,door.heightMm);
   for(const f of drains)assert.equal(solidOverlap(furnitureSolid(f),leaf),false,f.id+' intersects '+door.id+' at '+deg+' degrees');
   sweepStates++;
  }
 }
 const robot=p.defaultFurniture.find(f=>f.id==='balcony_robot'),route=rect(robot.cx,(9660+11150)/2,350,11150-9660,0,0,110),balconyDrain=drains.find(f=>f.id==='family-drain-balcony');
 assert.equal(solidOverlap(furnitureSolid(balconyDrain),route),false,'provisional drain must remain out of the straight 350 mm robot exit path');
 assert.ok(solidOverlap(furnitureSolid({...balconyDrain,cx:robot.cx}),route),'negative control catches a drain on robot route');
 const westProjection=rect(7580,9360,1420,600,0,0,4);
 assert.equal(solidOverlap(furnitureSolid(balconyDrain),westProjection),false,'no grate on nonwalkable north projection');
 // Both implicit renderers must consult persistent metadata, not item count:
 // deleting the editable shower drain must never resurrect the old implicit.
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok((index.match(/disabledImplicitShowerDrainIds/g)||[]).length>=2,'2D and 3D both consult persistent drain suppression metadata');
 for(const [id,expectedHash]of Object.entries(sourceSnapshotHashes)){const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expectedHash,id+' immutable snapshot');}
 for(const id of ['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+' frozen full scheme');assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyFloorDrainsUpdate,undefined);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 assert.equal(hash(applyFamilyFloorDrains(clone(oldBundle))),originalHash,'deterministic exact reapplication');
 assert.equal(hash(applyFamilyFloorDrains(JSON.parse(JSON.stringify(oldBundle)))),originalHash,'serialized deterministic reapplication');
 assert.equal(hash(beforeFamilyFloorDrains(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized exact undo');
 assert.throws(()=>applyFamilyFloorDrains(clone(bundle)),/already|applied|duplicate/i,'double applying layer rejected');
 assert.equal(hash(bundle),originalHash,'verification is read-only');
 return{status:'PASS',revision:REVISION,scheme:'family',objectsBefore:63,objectsAfter:68,old63ObjectsExact:true,allArchitectureExact:true,sourceAndOtherSchemesExact:true,editableDrainIds:ids,provisionalCoverMm:[150,150,4],showerDisplayDatumMm:50,topMetalFractions:topFractions,solidObstacles:obstacles.length,doorSweepStates:sweepStates,robotPathClear:true,actualPipeTrapSlopeUnverified:true,washerDrainNotRerouted:true,oldImplicitSuppressionPersistent:true};
}
module.exports={verifyFamilyFloorDrains,beforeFamilyFloorDrains,baseline,REVISION,expected,solidOverlap,furnitureSolid,partSolid};
if(require.main===module)console.log(JSON.stringify(verifyFamilyFloorDrains(require(path.join(root,'data/house-plans.js'))),null,2));
