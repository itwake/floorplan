'use strict';

// Exercise the production picking functions with deterministic ray hits.
// WebGL ray generation is browser-covered separately; these regressions prove
// that invisible helpers never steal a visible target or stop a ground ray.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = app.indexOf('function visibleRaycastMesh(o){');
const end = app.indexOf('function updateSel(){', start);
assert.ok(start >= 0 && end > start, 'production visibility/pick/ground functions must exist');
const source = app.slice(start, end);
assert.match(source, /function pick\(e\)/);
assert.match(source, /function groundAt\(x, y\)/);

class Vector2 {
  constructor(x = 0, y = 0) {this.x = x; this.y = y;}
  set(x, y) {this.x = x; this.y = y; return this;}
  distanceTo(other) {return Math.hypot(this.x - other.x, this.y - other.y);}
}
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {this.x = x; this.y = y; this.z = z;}
  set(x, y, z) {this.x = x; this.y = y; this.z = z; return this;}
  clone() {return new Vector3(this.x, this.y, this.z);}
  add(other) {return this.set(this.x + other.x, this.y + other.y, this.z + other.z);}
  project() {return this;}
  distanceTo(other) {return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z);}
}
class Plane {constructor(normal, constant) {this.normal = normal; this.constant = constant;}}
const node = (properties = {}) => ({visible:true, isMesh:false, userData:{}, parent:null, ...properties});
const scene = node(), furnG = node({parent:scene}), archUp = node({parent:scene}), archFloor = node({parent:scene});
const glassMat = {}, solidMat = {}, camera = {position:new Vector3(0, 0, 10)}, ptr = new Vector2();
let hits = [], roots = [], planeExists = true, cameraRays = 0;
const ray = {
  setFromCamera(pointer, currentCamera) {assert.equal(pointer, ptr); assert.equal(currentCamera, camera); cameraRays++;},
  intersectObjects(objects, recursive) {roots = [...objects]; assert.equal(recursive, true); return hits;},
  ray:{intersectPlane(plane, target) {assert.ok(plane instanceof Plane); return planeExists ? target.set(0, 0, 0) : null;}}
};
const renderer = {domElement:{getBoundingClientRect:() => ({left:10, top:20, width:400, height:200})}};
const context = vm.createContext({THREE:{Vector2, Vector3, Plane}, scene, furnG, archUp, archFloor, glassMat, camera, ptr, ray, renderer, opt:{furn:true}, active:true, anim:false, OX:1000, OY:2000});
vm.runInContext(source + '\nthis.testApi = {visibleRaycastMesh, pick, groundAt};', context);
const {visibleRaycastMesh, pick, groundAt} = context.testApi;
const plain = value => value == null ? value : JSON.parse(JSON.stringify(value));
const mesh = properties => node({isMesh:true, material:solidMat, parent:archUp, ...properties});
const hit = (object, distance = 1, point = new Vector3(3, 0, 4)) => ({object, distance, point});
const hiddenMesh = mesh({visible:false}), hiddenParent = node({visible:false, parent:archUp});
const underHiddenAncestor = mesh({parent:node({parent:hiddenParent})});
const helper = node({isLineSegments:true, parent:archUp});
const glass = mesh({material:glassMat});
const door = mesh({userData:{door:'door_bath_1'}});
const wall = mesh();

assert.equal(visibleRaycastMesh(hiddenMesh), false, 'hidden mesh must be skipped');
assert.equal(visibleRaycastMesh(underHiddenAncestor), false, 'every ancestor must be visible');
assert.equal(visibleRaycastMesh(helper), false, 'visible LineSegments helper is not a rendered mesh surface');
assert.equal(visibleRaycastMesh(door), true, 'visible door surface must remain selectable');
scene.visible = false;
assert.equal(visibleRaycastMesh(door), false, 'a hidden scene ancestor hides its otherwise-visible child');
scene.visible = true;

const ignored = [hiddenMesh, underHiddenAncestor, helper, glass];
for (const ignoredObject of ignored) {
  hits = [hit(ignoredObject), hit(door, 7)];
  assert.deepEqual(plain(pick(null)), {door:'door_bath_1', dist:7}, 'ignored foreground hit must not swallow the visible door');
}
hits = [...ignored.map(value => hit(value)), hit(door, 9)];
assert.deepEqual(plain(pick({clientX:110, clientY:70})), {door:'door_bath_1', dist:9});
assert.equal(ptr.x, -.5); assert.equal(ptr.y, .5);
assert.deepEqual(roots, [furnG, archUp, archFloor], 'furniture ray roots must follow enabled setting');

hits = [hit(helper), hit(wall, 2), hit(door, 3)];
assert.equal(pick(null), null, 'visible solid wall must still block a door behind it');
const furnitureGroup = node({userData:{fid:'vanity_main'}, parent:furnG});
hits = [hit(mesh({parent:node({parent:furnitureGroup})}))];
assert.deepEqual(plain(pick(null)), {fid:'vanity_main'}, 'nested visible furniture mesh must resolve its owning ancestor');
const room = mesh({userData:{room:'bath_1'}});
hits = [hit(room)];
assert.deepEqual(plain(pick(null)), {room:'bath_1'}, 'visible room surface must remain selectable');
hits = []; assert.equal(pick(null), null, 'empty ray has no selection');
context.opt.furn = false;
pick(null); assert.deepEqual(roots, [archUp, archFloor], 'hidden furniture group must not enter ray roots');
context.opt.furn = true;

// Execute actual production groundAt as well. The simple projection stub keeps
// this deterministic while allowing its obstruction-filter logic to run intact.
hits = ignored.map(value => hit(value, 1));
assert.deepEqual(plain(groundAt(110, 70)), {x:1000, y:2000, s:.2}, 'hidden/glass/helper hits must not replace visible ground position');
assert.deepEqual(roots, [archUp, archFloor], 'ground obstruction ray must only target architecture');
hits = [...ignored.map(value => hit(value, 1)), hit(wall, 5, new Vector3(3, 0, 4))];
assert.deepEqual(plain(groundAt(110, 70)), {x:4000, y:6000, s:.2}, 'visible closer solid wall must constrain the ground position');
hits = [hit(wall, 11)];
assert.deepEqual(plain(groundAt(110, 70)), {x:1000, y:2000, s:.2}, 'wall behind ground intersection must not constrain it');
context.active = false; assert.equal(groundAt(110, 70), null); context.active = true;
context.anim = true; assert.equal(groundAt(110, 70), null); context.anim = false;
planeExists = false; assert.equal(groundAt(110, 70), null); planeExists = true;
assert.ok(cameraRays > 0, 'production functions must use the camera ray');
console.log(JSON.stringify({status:'PASS', productionFunctionsExecuted:['visibleRaycastMesh','pick','groundAt'], invisibleAndNonMeshHitsIgnored:true, glassIgnored:true, visibleOcclusionRetained:true, doorFurnitureRoomPickingRetained:true}, null, 2));
