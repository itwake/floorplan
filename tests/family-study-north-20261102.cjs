'use strict';
const assert=require('node:assert/strict'),plans=require('../tools/family-bath-fit-20261105.cjs').beforeFamilyBathFit(require('../data/house-plans.js'));
const {beforeFamilyStudyNorth,applyFamilyStudyNorth,validateFamilyStudyNorth,KEY,REVISION}=require('../tools/family-study-north-20261102.cjs');
const old=beforeFamilyStudyNorth(plans),p=plans.schemes.family,m=p.metadata[KEY],get=id=>p.defaultFurniture.find(f=>f.id===id);
assert.ok(validateFamilyStudyNorth(p).ok);
assert.deepEqual(applyFamilyStudyNorth(structuredClone(old)),plans,'Undo/replay restores every field, including unaffected schemes');
const once=structuredClone(plans);applyFamilyStudyNorth(once);assert.deepEqual(once,plans,'Idempotent');
for(const id of['wood','laundry','screen'])assert.deepEqual(plans.schemes[id],old.schemes[id]);
for(const k of Object.keys(old.schemes.family))if(!['metadata','defaultFurniture','ROOMS'].includes(k))assert.deepEqual(p[k],old.schemes.family[k],k+' untouched');
for(const f of old.schemes.family.defaultFurniture)if(!m.changedFurnitureIds.includes(f.id)&&!m.removedFurnitureIds.includes(f.id))assert.deepEqual(get(f.id),f,'Unrelated furniture '+f.id);
assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,p.defaultFurniture.length);
assert.deepEqual(m.removedFurnitureIds,['study_window_return','study_north_sofa','fit-study_bookwall']);
const bed=get('study_south_bed'),desk=get('study_full_desk'),chair=get('family-f5'),door=p.DOORS.find(d=>d.id==='door_c');
assert.deepEqual([bed.w,bed.d,bed.rot,bed.mattressMm],[1300,2100,180,[1200,2000]]);
assert.deepEqual(bed.referenceStyle.mattressMm,[1200,2000],'Reference 3D must not fall back to a1800 mattress');
// Independent cardinal bounds: the west-pointing full-open 810mm leaf reaches
// x1610; the complete quarter-turn cannot reach further west or further north.
const leafWest=door.h[0]-door.len,leafNorth=door.h[1]-door.len;
assert.equal(leafWest,1610);assert.ok(bed.cx+bed.w/2<leafWest);
assert.equal(120+1600-leafWest,110,'1500 mattress + normal frame collides by110mm');
assert.equal(120+1500-leafWest,10,'Even a frame as narrow as the mattress is not clear');
assert.ok(chair.cy+chair.d/2<leafNorth-20);assert.ok(desk.cy+desk.d/2<leafNorth-20);
assert.equal(bed.cy-bed.d/2-(desk.cy+desk.d/2),80,'Foot gap must not be called a passage');
assert.equal(2420-bed.cx-bed.w/2,1000);assert.ok(chair.cx-chair.w/2>bed.cx+bed.w/2);
assert.deepEqual([desk.cx-desk.w/2,desk.cx+desk.w/2],[120,2420]);
assert.equal(desk.parts.find(q=>q.role==='desktop').heightMm,30);
const org=get('study_north_organizer'),board=org.parts.find(q=>q.shape==='perforated-pegboard');
assert.deepEqual([board.w,board.heightMm,board.d,board.holePitchMm,board.holeDiameterMm],[2250,620,12,30,6]);
assert.equal(org.parts.filter(q=>q.role==='display-shelf').length,2);assert.equal(org.parts.filter(q=>q.role==='led-strip').length,2);
assert.ok(!org.parts.some(q=>q.cabinetDoor||/door|cabinet-back/.test(q.role)),'Open storage only, no enclosed upper cupboard');
assert.equal(p.ROOMS.find(r=>r.id==='room_c').studyNorthDesk,true);
for(const id of['family-elec-p09','family-elec-p10','family-elec-n03']){const f=get(id);assert.equal(f.cy,3324);assert.ok(f.elevationMm+f.heightMm<1100);assert.equal(f.electricalDesign.face,'south');}
for(const id of['family-elec-s06','family-elec-p11']){const f=get(id);assert.equal(f.cy,6046);assert.ok(f.cx-f.w/2>1420&&f.cx+f.w/2<leafWest);assert.equal(f.electricalDesign.face,'north');}
assert.deepEqual(get('family-elec-s06').electricalDesign.groupIds,get('family-elec-s05').electricalDesign.groupIds,'Door and bedside control remain paired');
assert.equal(m.validation.bedFootPassage,false);assert.equal(m.id,REVISION);
console.log('PASS study north: full-wall desk, real1200 mattress,1500 door conflict, open pegboard shelves, linked electrical, exact history/scope');

// Exercise production hole geometry with real Three.js raycasts. Both faces
// must be open at a hole centre and solid halfway between adjacent holes.
(async()=>{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
  const THREE=await import(pathToFileURL(path.resolve(__dirname,'../vendor/three/build/three.module.js')).href);
  const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),a=html.indexOf('const pegboardGeometryCache=new Map();'),b=html.indexOf('function buildCabinetParts(g,f){',a),ctx={THREE};
  vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx);
  const geometry=ctx.perforatedPegboardGeometry(2.25,.620,.012,.030,.006);assert.equal(geometry.userData.pegboardHoleCount,1500);
  assert.equal(ctx.perforatedPegboardGeometry(2.25,.620,.012,.030,.006),geometry,'Reuse cached geometry');
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,[material,material]);mesh.updateMatrixWorld(true);
  for(const side of[-1,1]){
    const ray=x=>new THREE.Raycaster(new THREE.Vector3(x,.015,side*.1),new THREE.Vector3(0,0,-side)).intersectObject(mesh);
    assert.equal(ray(0).length,0,'Actual open hole through both board faces');assert.ok(ray(.015).length>0,'Board stays solid between holes');
  }
  console.log('PASS real3D pegboard:1500 through-holes, both-face raycasts, solid material between holes');
})().catch(e=>{console.error(e);process.exitCode=1;});
