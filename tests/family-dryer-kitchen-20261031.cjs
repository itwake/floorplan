'use strict';

// Independent Node regression for the conditional single-dryer revision. These
// tests calculate occupied boxes from stored dimensions (including fixture
// normalization) rather than relying only on the layer's own validation result.
const assert=require('node:assert/strict');
const generated=require('../data/house-plans.js');
const {applyFamilyDryerKitchen,beforeFamilyDryerKitchen,validateFamilyDryerKitchen,KEY,REVISION}=require('../tools/family-dryer-kitchen-20261031.cjs');
const {applyFamilyDrawing,beforeFamilyDrawing}=require('../tools/family-drawing-20261027.cjs');
const clone=structuredClone,round=n=>Math.round(n*1e6)/1e6;
const find=(p,id)=>{const f=p.defaultFurniture.find(q=>q.id===id);assert.ok(f,'Missing '+id);return f;};
function occupied(f){
  const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a)),z=f.elevationMm||0;
  return[f.cx-w/2,f.cy-d/2,z,f.cx+w/2,f.cy+d/2,z+f.heightMm].map(round);
}
function partBox(f,p){
  const sx=f.w/(f.baseWidthMm||f.w),sd=f.d/(f.baseDepthMm||f.d),sh=f.heightMm/(f.baseHeightMm||f.heightMm),a=(f.rot||0)*Math.PI/180;
  const x=(p.x+p.w/2)*sx,y=(p.y+p.d/2)*sd,cx=f.cx+x*Math.cos(a)-y*Math.sin(a),cy=f.cy+x*Math.sin(a)+y*Math.cos(a);
  const w=Math.abs(p.w*sx*Math.cos(a))+Math.abs(p.d*sd*Math.sin(a)),d=Math.abs(p.w*sx*Math.sin(a))+Math.abs(p.d*sd*Math.cos(a)),z=(f.elevationMm||0)+(p.elevationMm||0)*sh;
  return[cx-w/2,cy-d/2,z,cx+w/2,cy+d/2,z+p.heightMm*sh].map(round);
}
function crosses(a,b){return[0,1,2].every(i=>Math.min(a[i+3],b[i+3])-Math.max(a[i],b[i])>1e-6);}
function inside(a,b){return[0,1,2].every(i=>b[i]>=a[i]-1e-6&&b[i+3]<=a[i+3]+1e-6);}
function polygonArea(poly){return Math.abs(poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p[0]*q[1]-q[0]*p[1];},0))/2;}

const baseline=beforeFamilyDryerKitchen(generated),bundle=clone(baseline);
assert.equal(applyFamilyDryerKitchen(bundle),bundle,'Apply mutates and returns the supplied bundle');
const p=bundle.schemes.family,old=baseline.schemes.family,m=p.metadata[KEY],dryer=find(p,'laundry_dryer'),housing=find(p,'family-dryer-kitchen-housing'),cabinet=find(p,'fit-kitchen-20261005');
assert.equal(m.id,REVISION);assert.ok(validateFamilyDryerKitchen(p).ok);

// Exact reverse/replay in both supported input forms and in the older drawing
// history chain. A repeated apply must not duplicate furniture, notes or history.
assert.deepEqual(beforeFamilyDryerKitchen(bundle),baseline,'Bundle rollback restores every previous field and object');
assert.deepEqual(beforeFamilyDryerKitchen(p),old,'Plan-only rollback restores every previous field and object');
const once=clone(bundle);applyFamilyDryerKitchen(bundle);assert.deepEqual(bundle,once,'Apply is idempotent');
const replay=clone(beforeFamilyDryerKitchen(bundle));applyFamilyDryerKitchen(replay);assert.deepEqual(replay,bundle,'Rollback and replay are deterministic');
const throughDrawing=beforeFamilyDrawing(bundle);applyFamilyDrawing(throughDrawing);applyFamilyDryerKitchen(throughDrawing);
assert.deepEqual(throughDrawing,bundle,'Earlier drawing rollback peels this leaf before restoring its own snapshots');
if(generated.schemes.family.metadata[KEY])assert.deepEqual(bundle,generated,'Generated data must include the current leaf, including the revised P36 pillar location');

// Scope: only the dryer, north cabinet and its power point change. The previous
// standalone balcony cabinet is replaced; all other furnishings and services
// must remain byte-for-byte identical, including the robot under the shoe unit.
assert.deepEqual([...m.changedFurnitureIds].sort(),['fit-kitchen-20261005','laundry_dryer','family-elec-p36'].sort());
assert.deepEqual(m.newFurnitureIds,['family-dryer-kitchen-housing']);assert.deepEqual(m.removedFurnitureIds,['drawing-balcony-dryer-cabinet']);
const allowed=new Set([...m.changedFurnitureIds,...m.removedFurnitureIds]);
for(const f of old.defaultFurniture)if(!allowed.has(f.id))assert.deepEqual(find(p,f.id),f,'Unrelated object changed: '+f.id);
for(const id of ['wood','laundry','screen'])assert.deepEqual(bundle.schemes[id],baseline.schemes[id],'Other scheme changed: '+id);
for(const f of old.defaultFurniture.filter(f=>f.electricalDesign&&f.id!=='family-elec-p36'))assert.deepEqual(find(p,f.id),f,'Other electrical point changed: '+f.id);
for(const id of ['balcony_robot','fit-entry_shoe_station','family-elec-p35','laundry_washer','kitchen_heater','kitchen_double_sink','kitchen_dishwasher','kitchen_fridge','balcony_bucket_tap','family-drain-balcony'])assert.deepEqual(find(p,id),find(old,id),id+' must remain unchanged');
assert.equal(find(p,'balcony_robot').roomId,'living');
assert.ok(!p.defaultFurniture.some(f=>f.id==='drawing-balcony-dryer-cabinet'));
assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,p.defaultFurniture.length,'No duplicate ids');

// The actual known body is retained and faces north. Its front ends precisely
// at the old balcony-side shared-wall face: no equipment or new floor extends
// into the recovered balcony area or onto the conditional exterior sheet.
assert.deepEqual([dryer.w,dryer.d,dryer.heightMm,dryer.rot,dryer.elevationMm],[600,600,840,180,0]);
assert.deepEqual(occupied(dryer),[7185,11160,0,7785,11760,840]);assert.equal(dryer.face,'north');
assert.equal(dryer.roomId,'kitchen');assert.equal(dryer.operationRoomId,'balcony');
assert.equal(dryer.applianceDesign.frontAccessRoomId,'balcony');
const cavity=[7165,11160,0,7805,11870,870],body=occupied(dryer);
assert.ok(inside(cavity,body));assert.deepEqual([body[0]-cavity[0],cavity[3]-body[3],cavity[4]-body[4],cavity[5]-body[5]],[20,20,110,30]);
assert.deepEqual(m.clearancesMm,{west:20,east:20,rear:110,top:30});

// Only the low part of the shared window gains a conditional void. The upper
// glazing, sill and full plan rectangle remain unchanged. The 105+680+105 wall
// segmentation and the retained 130-high band are not structural certification.
for(const key of ['WINS','WALLS','WALL_META','DOORS','SLIDES','BAYS','BIFOLDS','PLAN_BOUNDS','BOUNDS','CENTER'])assert.deepEqual(p[key],old[key],key+' changed');
const window=p.WIN_META.find(q=>q.id==='window_kitchen_balcony'),oldWindow=old.WIN_META.find(q=>q.id===window.id);
assert.deepEqual([window.rect,window.openingWidthMm,window.sillMm,window.heightMm,window.headMm],[oldWindow.rect,890,1000,1350,2350]);
assert.deepEqual(window.lowerServiceOpeningMm,{x1:7145,x2:7825,bottom:0,top:870});
for(const q of old.WIN_META)if(q.id!==window.id)assert.deepEqual(p.WIN_META.find(r=>r.id===q.id),q,'Unrelated window changed');
for(const room of old.ROOMS){const current=p.ROOMS.find(q=>q.id===room.id);assert.deepEqual(current.poly,room.poly);assert.equal(polygonArea(current.poly),polygonArea(room.poly),'No new usable floor '+room.id);}
const remaining=[[7040,11160,0,7145,11290,1000],[7825,11160,0,7930,11290,1000],[7145,11160,870,7825,11290,1000]];
assert.deepEqual(window.lowerServiceOpeningDesign.remainingSolidWorldMm,remaining);
assert.equal(window.lowerServiceOpeningDesign.demolitionApproved,false);assert.equal(window.lowerServiceOpeningDesign.floorSlabContinuityConfirmed,false);
assert.equal(m.structure.remainingBandsDoNotProveLoadCapacity,true);assert.equal(m.structure.continuousFloorConfirmed,false);

// New support panels must be their real thickness, not a stretched old body.
// There is no bottom board, door, plinth or sill across the appliance route.
assert.deepEqual([housing.w,housing.d,housing.heightMm,housing.baseWidthMm,housing.baseDepthMm,housing.baseHeightMm],[680,730,890,680,730,890]);
assert.equal(housing.parts.length,4);assert.equal(housing.parts.filter(q=>q.role==='cabinet-side').length,2);
for(const q of housing.parts){assert.ok(inside(occupied(housing),partBox(housing,q)));assert.ok(!crosses(body,partBox(housing,q)),'Panel through dryer '+q.id);}
for(const q of housing.parts.filter(q=>q.role==='cabinet-side'))assert.equal(q.w,20);
assert.equal(housing.parts.find(q=>q.role==='cabinet-back').d,20);
assert.equal(housing.parts.find(q=>q.role==='countertop').heightMm,20);
assert.ok(!housing.parts.some(q=>['cabinet-bottom','plinth','door-hinged','door-sliding'].includes(q.role)));
assert.equal(housing.applianceBayDesign.supportFloor.bottomBoardThicknessMm,0);
assert.equal(housing.applianceBayDesign.supportFloor.existingSlabContinuityConfirmed,false);
for(const f of p.defaultFurniture){if(f.id===dryer.id)continue;for(const box of f.parts?.length?f.parts.map(q=>partBox(f,q)):[occupied(f)])assert.ok(!crosses(body,box),'Dryer intersects '+f.id);}
for(const box of remaining){assert.ok(!crosses(body,box));for(const q of housing.parts)assert.ok(!crosses(partBox(housing,q),box),'Support enters retained low wall '+q.id);}

// Preserve all untouched old cabinet panels exactly. The original 1020-by-600
// worktop is split, not raised or doubled; its union remains at 870..890.
for(const q of find(old,cabinet.id).parts)if(!q.id.startsWith('drawing-kitchen-north-low-')&&q.id!=='drawing-kitchen-north-counter')assert.deepEqual(cabinet.parts.find(r=>r.id===q.id),q,'Unrelated cabinet panel changed '+q.id);
const tops=[...cabinet.parts.filter(q=>q.role==='countertop').map(q=>partBox(cabinet,q)),...housing.parts.filter(q=>q.role==='countertop').map(q=>partBox(housing,q))]
  .filter(q=>q[1]===11290&&q[4]===11890&&q[0]>=7010&&q[3]<=8030).sort((a,b)=>a[0]-b[0]);
assert.equal(tops.length,3);assert.equal(tops[0][0],7010);assert.equal(tops[2][3],8030);
assert.equal(tops[0][3],tops[1][0]);assert.equal(tops[1][3],tops[2][0]);
for(const top of tops)assert.deepEqual([top[2],top[5]],[870,890]);
assert.equal(tops.reduce((a,t)=>a+(t[3]-t[0])*(t[4]-t[1]),0),1020*600);

// P36 now touches the west face of the existing southeast pier. Its visible
// plate must fit the pillar rather than using the former 105-mm low-wall remnant.
const point=find(p,'family-elec-p36'),anchor=point.electricalDesign.anchor,pier=p.WALLS[anchor.wallIndex];
assert.deepEqual([point.cx,point.cy,point.rot,point.face,point.electricalDesign.centerHeightMm],[7926,11103,90,'west',550]);
assert.deepEqual(occupied(point),[7922,11060,507,7930,11146,593]);assert.deepEqual(pier.slice(0,4),[7930,11050,8270,11290]);
assert.equal(occupied(point)[3],pier[0]);assert.deepEqual([occupied(point)[1]-pier[1],pier[3]-occupied(point)[4]],[10,144]);
assert.equal(anchor.kind,'wall');assert.equal(anchor.siteVerified,false);assert.equal(point.electricalDesign.installationApproved,false);
assert.equal(point.electricalDesign.manufacturerCordRouteConfirmed,false);assert.equal(m.electricity.cableRouteConfirmed,false);
assert.ok(m.migrationFields['family-elec-p36'].includes('cx')&&m.migrationFields['family-elec-p36'].includes('rot'));
assert.ok(m.preserveCustomPlacementIds.includes('family-elec-p36'),'User-customized P36 placement remains protected during migration');
const zone=housing.applianceBayDesign.doorOperation;
assert.deepEqual(zone.zoneWorldMm,[7145,10560,0,7825,11160,1000]);assert.equal(occupied(point)[0]-zone.zoneWorldMm[3],97);
assert.equal(zone.zoneIsSensitivityOnly,true);assert.equal(zone.maximumOpenEnvelopeConfirmed,false);assert.equal(zone.actualDoorProjectionMm,null);
assert.equal(zone.remainingNorthDepthAt600ProjectionMm,1000);assert.ok(!crosses(occupied(point),zone.zoneWorldMm));
assert.equal(m.plumbing.connectionConfirmed,false);assert.equal(m.plumbing.condensateDrainMode,null);assert.equal(m.installationApproved,false);

// These independent corruptions represent the regressions this test protects:
// blocked machine path, narrowed conditional hole, raised/reaching-through top,
// point returned to the demolished low wall, and misleading structural approval.
const negativeCases=[];
function rejects(label,edit){const corrupt=clone(p);edit(corrupt);assert.throws(()=>validateFamilyDryerKitchen(corrupt),undefined,label);negativeCases.push(label);}
rejects('bottom board blocks the floor-loading appliance',q=>find(q,housing.id).parts.push({id:'bad-bottom',x:-320,y:-365,w:640,d:710,elevationMm:0,heightMm:20,role:'cabinet-bottom'}));
rejects('conditional passage width is reduced',q=>q.WIN_META.find(w=>w.id===window.id).lowerServiceOpeningMm.x2=7750);
rejects('top is raised above the existing worktop',q=>find(q,housing.id).parts.find(a=>a.role==='countertop').elevationMm=980);
rejects('top crosses the retained wall band',q=>{const a=find(q,housing.id).parts.find(a=>a.role==='countertop');a.y=-365;a.d=730;});
rejects('P36 returns to the narrow low-wall jamb',q=>{const a=find(q,point.id);a.cx=7100;a.cy=11156;a.rot=180;});
rejects('a geometry concept is marked demolition-approved',q=>q.WIN_META.find(w=>w.id===window.id).lowerServiceOpeningDesign.demolitionApproved=true);
const incorrectMachine=clone(baseline);find(incorrectMachine.schemes.family,'laundry_dryer').d=650;
assert.throws(()=>applyFamilyDryerKitchen(incorrectMachine),'Actual machine body cannot silently be resized');negativeCases.push('unconfirmed machine size cannot be silently shrunk');

console.log(JSON.stringify({status:'PASS',revision:REVISION,objects:p.defaultFurniture.length,roundTrip:true,historyReplay:true,idempotent:true,
  clearancesMm:m.clearancesMm,conditionalOpeningMm:window.lowerServiceOpeningMm,unchangedUpperWindowMm:[890,1000,1350],
  p36CenterMm:[point.cx,point.cy,550],otherSchemesExact:true,otherElectricalExact:true,robotUnchanged:true,negativeCases},null,2));
