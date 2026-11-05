'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const plans=require('../data/house-plans.js'),{applyFamilyBathFit,beforeFamilyBathFit,validateFamilyBathFit,KEY,REVISION,rect,overlap,insideRect}=require('../tools/family-bath-fit-20261105.cjs');
const p=plans.schemes.family,old=beforeFamilyBathFit(plans),m=p.metadata[KEY],get=id=>p.defaultFurniture.find(f=>f.id===id);
assert.ok(validateFamilyBathFit(p).ok);
assert.deepEqual(applyFamilyBathFit(structuredClone(old)),plans,'Exact rollback/replay');
assert.deepEqual(applyFamilyBathFit(structuredClone(plans)),plans,'Idempotent');
// SHA-256 frozen from the complete published b699366 model, before this leaf.
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(hash(old),'2a53840ae452226dc06e2af95c368616e549b740c6f6cdd1295624c40206aab1','Undo correction recovers prior published model');
for(const id of['wood','laundry','screen'])assert.deepEqual(plans.schemes[id],old.schemes[id]);
for(const key of Object.keys(p))if(!['metadata','WALLS','WALL_META','ROOMS','defaultFurniture'].includes(key))assert.deepEqual(p[key],old.schemes.family[key],key+' unchanged');
for(const f of old.schemes.family.defaultFurniture)if(!m.changedFurnitureIds.includes(f.id))assert.deepEqual(get(f.id),f,'Unrelated object '+f.id);
for(let i=0;i<p.WALLS.length;i++)if(![20,21].includes(i)){assert.deepEqual(p.WALLS[i],old.schemes.family.WALLS[i]);assert.deepEqual(p.WALL_META[i],old.schemes.family.WALL_META[i]);}
for(const r of p.ROOMS.filter(r=>!/^bath_/.test(r.id)))assert.deepEqual(r,old.schemes.family.ROOMS.find(q=>q.id===r.id));
// Independent continuous quarter-sector test, inflated for a 40 mm door leaf.
function sweptHits(door,r){const sx=Math.sign(door.c[0]||door.o[0]),sy=Math.sign(door.c[1]||door.o[1]),xs=[sx*(r[0]-20-door.h[0]),sx*(r[2]+20-door.h[0])],ys=[sy*(r[1]-20-door.h[1]),sy*(r[3]+20-door.h[1])];return Math.max(...xs)>=0&&Math.max(...ys)>=0&&Math.hypot(Math.max(0,Math.min(...xs)),Math.max(0,Math.min(...ys)))<=door.len;}
for(const [room,id]of[['bath_1','door_bath_1'],['bath_2','door_bath_2']])for(const f of p.defaultFurniture.filter(f=>f.roomId===room&&['vanity','toilet','shower','washer'].includes(f.type)||f.id==='vanity_guest'))if(f.roomId===room)assert.ok(!sweptHits(p.DOORS.find(d=>d.id===id),rect(f)),'Room door sweep hits '+f.id);
// The partition covers the full width at several heights in plan, with no
// invented passage and no floor polygon continuing through the wall.
for(const y of[4720,4779,4839.9])for(let x=5151;x<6800;x+=37)assert.ok([20,21].some(i=>{const w=p.WALLS[i];return x>=w[0]&&x<=w[2]&&y>=w[1]&&y<=w[3];}),'Partition gap');
for(const room of p.ROOMS.filter(r=>/^bath_/.test(r.id)))for(const w of[ p.WALLS[20],p.WALLS[21]]){const xs=room.poly.map(q=>q[0]),ys=room.poly.map(q=>q[1]);assert.ok(!overlap([Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],w)||room.id==='bath_2','Main bath floor crosses wall');}
// Washer must fit actual joinery boards, not just its parent bounding box.
const v=get('vanity_guest'),washer=get('laundry_washer'),wr=rect(washer);
for(const q of v.parts){const r=[v.cx+q.x,v.cy+q.y,v.cx+q.x+q.w,v.cy+q.y+q.d];if((q.elevationMm||0)<washer.heightMm&&q.elevationMm+q.heightMm>0)assert.ok(!overlap(wr,r),'Washer hits '+q.id);}
assert.equal(washer.heightMm,840);assert.equal(v.parts.find(q=>q.role==='countertop').elevationMm-washer.heightMm,50);
// Reuse production migration code in isolation: unchanged defaults migrate;
// personal placement, dimensions, deletions and empty drafts survive intact.
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),ctx={HOUSE_PLAN:p,structuredClone};vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf('function layoutRevisions(){'),html.indexOf('function defaultState(){'))+html.slice(html.indexOf('function upgradeConfirmedLayouts(s){'),html.indexOf('function fixState(s){')),ctx);
const migration=mode=>{const s={furniture:structuredClone(old.schemes.family.defaultFurniture),appliedLayoutRevisions:ctx.layoutRevisions().filter(r=>r.id!==REVISION).map(r=>r.id),demolished:['w20','w21','w10']};if(mode==='custom'){const f=s.furniture.find(f=>f.id==='family-f12');f.cy-=100;f.w=1000;f.ownerNote='preserve';}if(mode==='deleted')s.furniture=s.furniture.filter(f=>f.id!=='family-f12');if(mode==='empty')s.furniture=[];ctx.upgradeConfirmedLayouts(s);return s;};
const migrated=migration('default');for(const id of m.changedFurnitureIds)assert.deepEqual(JSON.parse(JSON.stringify(migrated.furniture.find(f=>f.id===id))),get(id),'Default migration '+id);assert.deepEqual(Array.from(migrated.demolished),['w10']);assert.equal(migrated.layoutMigrationWallArchive.length,2);
const custom=migration('custom').furniture.find(f=>f.id==='family-f12');assert.equal(custom.w,1000);assert.equal(custom.cy,4290);assert.equal(custom.ownerNote,'preserve');assert.equal(custom.showerDesign,undefined,'No new geometry silently grafted onto a custom shower');assert.equal(custom.layoutCustomPlacementRevision,REVISION);
assert.ok(!migration('deleted').furniture.some(f=>f.id==='family-f12'));assert.equal(migration('empty').furniture.length,0);const repeated=structuredClone(migrated);ctx.upgradeConfirmedLayouts(repeated);assert.equal(hash(repeated),hash(migrated));
// The same renderer branch used in WebGL is executed with real Three.js.
(async()=>{const path=require('node:path'),{pathToFileURL}=require('node:url'),THREE=await import(pathToFileURL(path.resolve(__dirname,'../vendor/three/build/three.module.js')).href);
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),box=(w,h,d,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y+h/2,z);return o;},rod=(a,b,r,m)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,A.distanceTo(B),12),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());return o;};
const start=html.indexOf('      if(f.showerDesign){',html.indexOf("    case 'shower': {")),end=html.indexOf('      const cm = chrome(), x = -w/4;',start),branch=html.slice(start,end).replace('        break;','        return g;');
const scope={THREE,M:n=>n/1000,box,rbox:box,rod,mat:()=>material,chrome:()=>material,frameMat:material,glassMat:material,tube:()=>new THREE.Group()};vm.createContext(scope);vm.runInContext('function build(f){const g=new THREE.Group(),w=M(f.w),d=M(f.d);'+branch+'}',scope);
for(const id of['family-f12','family-f15']){const f=get(id),g=scope.build(f);g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g);assert.ok(b.min.x>=-f.w/2000-.005&&b.max.x<=f.w/2000+.005&&b.min.z>=-f.d/2000-.005&&b.max.z<=f.d/2000+.005,id+' rendered shell outside envelope');assert.equal(g.children.filter(q=>q.userData.role==='shower-inward-door').length,1);assert.equal(g.userData.showerEntry.opens,'inward');
const a=f.showerDesign.chamferMm,hinge=[-f.w/2+a+8,-f.d/2+8],L=Math.SQRT2*a;for(let angle=135-f.showerDesign.maximumAngleDegrees;angle<=135;angle+=.25){const t=angle*Math.PI/180,end=[hinge[0]+L*Math.cos(t),hinge[1]+L*Math.sin(t)];assert.ok(end[0]>=-f.w/2-1e-6&&end[0]<=f.w/2+1e-6&&end[1]>=-f.d/2-1e-6&&end[1]<=f.d/2+1e-6,'Inward door sweep contained in shower');}}
console.log('PASS bath fit: continuous wall, room containment, full entrance-door sweeps, joinery/washer clearances, real 3D shower geometry, migration/custom/deleted/empty drafts, frozen published history');
})().catch(e=>{console.error(e);process.exitCode=1;});
