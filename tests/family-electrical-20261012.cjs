'use strict';

// Independent before-image, functional-target checks and real solid support
// checks. They validate the visible concept, never actual electrical safety.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyElectrical,beforeFamilyElectrical,REVISION,POINT_IDS}=require('../tools/family-electrical-20261012.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Captured independently from committed 663a5c1, before the electrical layer.
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'3af923e9887954b415c0394bb260c76364dacd3d1859746445f180474bb2bfcb',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
// [code, mounting room, center x, center y, center height, operator-facing side].
// These are the independently audited provisional design coordinates, not
// surveyed installation positions or mandatory heights from a code book.
const EXPECTED_ROWS=Object.freeze([
 ['S01','room_a',3499,3730,1200,'east'],['S02','room_a',6746,3070,820,'west'],
 ['S03','room_b',2350,3216,1200,'north'],['S04','room_b',124,3020,820,'east'],
 ['S05','room_c',2336,5160,1200,'west'],['S06','room_c',450,3344,1200,'south'],
 ['S07','living',5268,13380,1200,'west'],['S08','living',3371,3630,1200,'west'],
 ['S09','living',5268,13620,1200,'west'],['S10','room_a',4386,4300,1200,'west'],
 ['S11','living',3371,5890,1200,'west'],['S12','living',5296,11320,1200,'west'],
 ['S13','living',6520,11146,1200,'north'],['S14','living',5268,13500,1200,'west'],
 ['P01','room_a',6746,3070,650,'west'],['P02','room_a',6746,450,1100,'west'],
 ['P03','room_a',5570,124,2300,'south'],['P04','room_a',3499,2750,300,'east'],
 ['P05','room_b',124,3020,650,'east'],['P06','room_b',124,450,1100,'east'],
 ['P07','room_b',2440,124,2300,'south'],['P08','room_b',3371,2450,300,'west'],
 ['P09','room_c',450,6196,1100,'north'],['P10','room_c',1040,6196,1100,'north'],
 ['P11','room_c',600,3344,1200,'south'],['P12','room_c',124,5330,2300,'east'],
 ['P13','living',4160,6324,650,'south'],['P14','living',6746,6970,1000,'west'],
 ['P15','living',6746,9300,650,'west'],['P16','living',5269.5,13775,1215,'west'],
 ['P17','living',6746,7100,300,'west'],['P18','living',3650,6324,300,'south'],
 ['P19','living',2147,9450,1390,'east'],['P20','living',2147,9790,1390,'east'],
 ['P21','living',2147,10230,1390,'east'],['P22','living',2147,10620,1390,'east'],
 ['P23','living',2147,11050,1390,'east'],['P24','kitchen',6240,11274,1200,'south'],
 ['P25','kitchen',6520,11274,1200,'south'],['P26','kitchen',7140,13886,2100,'north'],
 ['P27','kitchen',8286,11870,1550,'west'],['P28','kitchen',7590,13874,1200,'north'],
 ['P29','kitchen',7870,13874,1200,'north'],['P30','bath_1',4514,4250,1200,'east'],
 ['P31','bath_1',4514,4440,650,'east'],['P32','bath_2',3980,4994,1100,'south'],
 ['P33','bath_2',4550,4994,1250,'south'],['P34','bath_2',3499,5990,650,'east'],
 ['P35','kitchen',7210,11924,850,'south'],['P36','kitchen',7510,11924,850,'south'],
 ['N01','room_a',6746,650,1100,'west'],['N02','room_b',124,650,1100,'east'],
 ['N03','room_c',1220,6196,1100,'north'],['N04','living',4020,6324,650,'south']
]);
const EXPECTED=Object.freeze(Object.fromEntries(EXPECTED_ROWS.map(([code,roomId,cx,cy,centerHeightMm,face])=>
 [code,{code,roomId,cx,cy,centerHeightMm,face,kind:code[0]==='S'?'switch':code[0]==='P'?'socket':'data'}])));
const EXPECTED_GROUPS=Object.freeze({
 'G-A':{codes:['S01','S02'],targets:[{kind:'room-lamp',roomId:'room_a'}]},
 'G-B':{codes:['S03','S04'],targets:[{kind:'room-lamp',roomId:'room_b'}]},
 'G-C':{codes:['S05','S06'],targets:[{kind:'room-lamp',roomId:'room_c'}]},
 'G-L':{codes:['S07','S08'],targets:[{kind:'furniture',id:'family-living-ceilinglight'}]}
});
const SINGLE_TARGETS=Object.freeze({
 S09:[{kind:'furniture',id:'family-dining-ceilinglight'}],
 S10:[{kind:'room-lamp',roomId:'bath_1'},{kind:'furniture',id:'family-bathheater-bath_1'}],
 S11:[{kind:'room-lamp',roomId:'bath_2'},{kind:'furniture',id:'family-bathheater-bath_2'}],
 S12:[{kind:'room-lamp',roomId:'kitchen'},{kind:'furniture',id:'family-kitchen-ceilingfan'}],
 S13:[{kind:'room-lamp',roomId:'balcony'}],
 S14:[{kind:'furniture',id:'fit-dining_sideboard_wall'},{kind:'furniture',id:'fit-entry_shoe_station'}]
});
const SERVED=Object.freeze({
 P02:['draft-desk-a'],N01:['draft-desk-a'],P03:['family-acwall-room_a'],
 P06:['draft-desk-b'],N02:['draft-desk-b'],P07:['family-acwall-room_b'],
 P12:['family-acwall-room_c'],P14:['family-living-aircon'],
 P19:['family-sideboard-blender'],P20:['family-sideboard-temperaturekettle'],
 P21:['family-sideboard-sterilizer'],P22:['family-sideboard-healthkettle'],P23:['family-sideboard-waterdispenser'],
 P24:['kitchen_fridge'],P25:['kitchen_dishwasher'],P26:['kitchen_hood'],P27:['kitchen_heater'],
 P32:['laundry_washer'],P35:['balcony_robot'],P36:['laundry_dryer']
});
const faceRotation={north:180,south:0,east:270,west:90},faceNormal={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]};
const rad=d=>d*Math.PI/180;
const transform=(x,y,cx,cy,a)=>[cx+x*Math.cos(a)-y*Math.sin(a),cy+x*Math.sin(a)+y*Math.cos(a)];
function rect(cx,cy,w,d,a=0,z=0,h=2700){return{poly:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,y])=>transform(x,y,cx,cy,a)),z,h};}
function furnitureSolid(f){return rect(f.cx,f.cy,f.w,f.d,rad(f.rot||0),f.elevationMm||0,f.heightMm||700);}
function partSolid(f,p){const a=rad(f.rot||0),[x,y]=transform(p.x+p.w/2,p.y+p.d/2,f.cx,f.cy,a);return rect(x,y,p.w,p.d,a,(f.elevationMm||0)+(p.elevationMm||0),p.heightMm);}
function aabb(s){const xs=s.poly.map(q=>q[0]),ys=s.poly.map(q=>q[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),d:Math.max(...ys)-Math.min(...ys),z:s.z,h:s.h};}
function polygonOverlap(a,b){
 for(const poly of[a,b])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],v=[p[1]-q[1],q[0]-p[0]],n=Math.hypot(...v),axis=v.map(x=>x/n),project=p=>p[0]*axis[0]+p[1]*axis[1],aa=a.map(project),bb=b.map(project);
  if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=.001)return false;
 }
 return true;
}
function solidOverlap(a,b){return Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z)>.001&&polygonOverlap(a.poly,b.poly);}
function pointInside([x,y],poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}return hit;}
function insideOrOnBoundary(point,poly){
 if(pointInside(point,poly))return true;
 return poly.some((a,i)=>{const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/l2));return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy)<=.001;});
}
const approx=(a,b,label)=>assert.ok(Math.abs(a-b)<.001,label+': '+a+' vs '+b);
const targetIdentity=t=>t.kind==='room-lamp'?{kind:t.kind,roomId:t.roomId}:{kind:t.kind,id:t.id};
const targetSet=arr=>arr.map(targetIdentity).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));

function checkMount(p,f){
 const anchor=f.electricalDesign.anchor,n=faceNormal[f.face],b=aabb(furnitureSolid(f));
 let solid;
 if(anchor.kind==='wall'){
  const w=p.WALLS[anchor.wallIndex];assert.ok(w,f.id+' names an unchanged wall');
  solid=rect((w[0]+w[2])/2,(w[1]+w[3])/2,w[2]-w[0],w[3]-w[1],0,0,p.ROOMS.find(r=>r.id===f.roomId)?.heightMm||2700);
 }else if(anchor.kind==='window-lintel'){
  const i=p.WIN_META.findIndex(w=>w.id===anchor.windowId),m=p.WIN_META[i],w=p.WINS[i];assert.ok(m&&w,f.id+' names an unchanged window lintel');
  solid=rect((w[0]+w[2])/2,(w[1]+w[3])/2,w[2]-w[0],w[3]-w[1],0,m.headMm,(p.ROOMS.find(r=>r.id===f.roomId)?.heightMm||2700)-m.headMm);
  assert.ok(b.z>=m.headMm,'point entirely above the real window head, not floating on glass '+f.id);
 }else{
  assert.equal(anchor.kind,'cabinet-part');const host=p.defaultFurniture.find(o=>o.id===anchor.furnitureId),part=host?.parts?.find(o=>o.id===anchor.partId);
  assert.ok(host&&part,f.id+' names an unchanged physical cabinet board');solid=partSolid(host,part);
  assert.equal(anchor.cabinetBoxAndPenetrationPending,true,'cabinet mount is not an installed/approved box '+f.id);
  assert.deepEqual(anchor.baseHostDimensionsMm,[host.w,host.d,host.heightMm]);assert.equal(anchor.hostRotationDegrees,host.rot||0);
  const [lx,ly]=transform(f.cx-host.cx,f.cy-host.cy,0,0,-rad(host.rot||0));
  assert.deepEqual(anchor.localCenterMm,[lx,ly,f.electricalDesign.centerHeightMm-(host.elevationMm||0)]);
 }
 assert.equal(anchor.surfaceVerifiedAgainstCurrentModel,true);
 const s=aabb(solid);
 if(n[0]){
  approx(n[0]>0?b.x:b.x+b.w,n[0]>0?s.x+s.w:s.x,f.id+' back touches correct X supporting face');
  assert.ok(b.y>=s.y-.001&&b.y+b.d<=s.y+s.d+.001,f.id+' complete panel width supported');
 }else{
  approx(n[1]>0?b.y:b.y+b.d,n[1]>0?s.y+s.d:s.y,f.id+' back touches correct Y supporting face');
  assert.ok(b.x>=s.x-.001&&b.x+b.w<=s.x+s.w+.001,f.id+' complete panel width supported');
 }
 assert.ok(b.z>=s.z-.001&&b.z+b.h<=s.z+s.h+.001,f.id+' complete panel height supported');
 assert.equal(solidOverlap(furnitureSolid(f),solid),false,'visible panel cannot be buried inside its named support '+f.id);
 return anchor.kind;
}

function verifyFamilyElectrical(bundle){
 bundle=require('../tools/family-kitchen-heater-20261013.cjs').beforeFamilyKitchenHeater(bundle);
 const originalHash=hash(bundle),p=bundle.schemes.family,u=p.metadata.familyElectricalUpdate,oldBundle=beforeFamilyElectrical(bundle),old=oldBundle.schemes.family;
 assert.equal(REVISION,'family-electrical-20261012');assert.equal(u?.id,REVISION);
 assert.equal(hash(old),baseline.family,'frozen, independent 68-object before-image');
 assert.equal(hash(beforeFamilyElectrical(p)),baseline.family,'plan-only exact rollback');assert.equal(hash(beforeFamilyElectrical(old)),baseline.family,'absent layer is inert');
 const rows=EXPECTED_ROWS.filter(r=>r[0]!=='P16'),ids=rows.map(r=>'family-elec-'+r[0].toLowerCase()),idSet=new Set(ids);
 assert.deepEqual(POINT_IDS,ids,'stable explicit 53-object order');assert.deepEqual(u.newFurnitureIds,ids);
 assert.equal(old.defaultFurniture.length,68);assert.equal(p.defaultFurniture.length,121);assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,121);
 assert.deepEqual(p.defaultFurniture.filter(f=>!idSet.has(f.id)),old.defaultFurniture,'all original 68 objects exact and in original order');
 assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id));assert.deepEqual(u.previousFurniture,[]);assert.deepEqual(u.previousPlanFields,{});
 for(const key of['changedFurnitureIds','removedFurnitureIds','replacedFurnitureIds'])assert.deepEqual(u[key],[],key+' must not conceal old-object edits');
 for(const key of Object.keys(old))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],old[key],'all architecture/source/display fields exact '+key);
 for(const key of Object.keys(old.metadata))if(!['conditions','designCorrections','converter'].includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'historical metadata remains exact '+key);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 assert.equal(u.sourceSnapshotsUnchanged,true);assert.equal(u.architectureUnchanged,true);assert.equal(u.other68FurnitureUnchanged,true);
 assert.equal(u.logicalPointCount,54);assert.equal(u.newVisiblePointCount,53);assert.deepEqual(u.counts,{switch:14,socket:36,data:4});assert.deepEqual(u.defaultPanelDimensionsMm,[86,8,86]);
 assert.equal(u.functionalRelationshipsOnly,true);assert.equal(u.wiringModeled,false);assert.equal(u.realPowerOrAutomationSimulated,false);assert.equal(u.installationApproved,false);assert.equal(u.electricalSafetyReviewRequired,true);
 for(const k of['ratingsConfirmed','circuitConfirmed','protectiveMeasuresConfirmed'])assert.equal(u[k],false,k+' cannot be certified by displayed panels');
 assert.match(u.centerHeightDatum,/finished-floor.*center.*provisional/);
 const additions=p.defaultFurniture.filter(f=>idSet.has(f.id)),supports={},pointByCode=new Map(additions.map(f=>[f.code,f]));
 assert.equal(u.points.length,53);assert.equal(u.existingPoints.length,1);
 for(const f of additions){
  const d=f.electricalDesign,e=EXPECTED[f.code];assert.ok(e&&f.code!=='P16');
  assert.deepEqual([f.roomId,f.cx,f.cy,d.centerHeightMm,f.face],[e.roomId,e.cx,e.cy,e.centerHeightMm,e.face],f.code+' exact audited provisional placement');
  assert.equal(f.type,'fixture');assert.equal(f.nativeType,e.kind);assert.equal(f.kind,e.kind);assert.equal(d.kind,e.kind);assert.equal(d.code,f.code);assert.equal(f.sourceId,f.id);
  assert.equal(f.modelVariant,'electrical-'+e.kind);assert.equal(f.layoutRevision,REVISION);assert.equal(f.rot,faceRotation[f.face]);
  assert.deepEqual([f.w,f.d,f.heightMm,f.elevationMm],[86,8,86,e.centerHeightMm-43]);assert.deepEqual([f.baseWidthMm,f.baseDepthMm,f.baseHeightMm],[86,8,86]);
  assert.equal(f.visualOnly,true);assert.equal(f.notConstructionApproval,true);assert.equal(f.installationApproved,false);assert.equal(f.wiringModeled,false);
  assert.equal(d.centerHeightMm,f.elevationMm+43);assert.equal(d.face,f.face);assert.equal(d.mountingRoomId,f.roomId);
  for(const key of['installationApproved','wiringModeled','productSelected','circuitConfirmed','protectiveMeasuresConfirmed'])assert.equal(d[key],false,f.code+' unverified '+key);
  assert.equal(d.ratingAmps,null);assert.equal(d.ipRating,null);assert.ok(d.purpose&&d.reviewNotes);
  assert.match(d.separateCircuitRecommendation,/pending|review/,'no assigned circuit or rating '+f.code);
  assert.ok(f.parts.length>=5&&f.parts.length<=8);assert.equal(new Set(f.parts.map(q=>q.id)).size,f.parts.length);
  assert.equal(f.parts.filter(q=>q.role==='electrical-plate-body').length,1);assert.equal(f.parts.filter(q=>q.role==='electrical-face').length,1);
  for(const q of f.parts){for(const k of['x','y','w','d','elevationMm','heightMm'])assert.ok(Number.isFinite(q[k]),f.code+'/'+q.id+' finite '+k);
   assert.ok(q.w>0&&q.d>0&&q.heightMm>0);assert.ok(q.x>=-43&&q.x+q.w<=43&&q.y>=-4&&q.y+q.d<=4&&q.elevationMm>=0&&q.elevationMm+q.heightMm<=86,'visible surface geometry only '+q.id);
  }
  if(e.kind==='switch')assert.ok(f.parts.some(q=>q.role==='electrical-rocker'));else if(e.kind==='socket')assert.equal(f.parts.filter(q=>q.role==='electrical-socket-symbol').length,5);else assert.equal(f.parts.filter(q=>q.role==='electrical-data-port').length,1);
  const b=aabb(furnitureSolid(f));for(const k of['x','y','w','d'])approx(f.sourceFootprintMm[k],b[k],f.code+' rotated physical footprint '+k);
  const room=p.ROOMS.find(r=>r.id===f.roomId);assert.ok(room);assert.ok(furnitureSolid(f).poly.every(q=>insideOrOnBoundary(q,room.poly)),f.code+' entirely in actual mounting room, including flush back boundary');
  const support=checkMount(old,f);supports[support]=(supports[support]||0)+1;
  for(const target of d.controlTargets){
   if(target.kind==='room-lamp'){assert.ok(old.ROOMS.some(r=>r.id===target.roomId));assert.ok(!target.id,'virtual original room lamp is not invented furniture');}
   else{assert.equal(target.kind,'furniture');assert.ok(old.defaultFurniture.some(o=>o.id===target.id),f.code+' control refers to retained real fixture');}
  }
  for(const id of d.servedFurnitureIds)assert.ok(old.defaultFurniture.some(o=>o.id===id),f.code+' serves retained real furniture '+id);
  if(SERVED[f.code])assert.deepEqual(d.servedFurnitureIds,SERVED[f.code],f.code+' mapped to intended existing device');
  assert.deepEqual(u.points.find(o=>o.id===f.id),{id:f.id,...clone(d),roomId:f.roomId,cx:f.cx,cy:f.cy,rot:f.rot,w:f.w,d:f.d,heightMm:f.heightMm,elevationMm:f.elevationMm},f.code+' metadata does not drift from editable entity');
 }
 const groups=u.groups;assert.equal(groups.length,4);assert.equal(new Set(groups.map(g=>g.id)).size,4);
 for(const [id,e]of Object.entries(EXPECTED_GROUPS)){
  const g=groups.find(g=>g.id===id);assert.ok(g,id+' two-way functional group');assert.deepEqual(g.controlCodes,e.codes);assert.deepEqual(g.controlPointIds,e.codes.map(c=>'family-elec-'+c.toLowerCase()));assert.deepEqual(targetSet(g.targets),targetSet(e.targets));
  for(const code of e.codes){const d=pointByCode.get(code).electricalDesign;assert.equal(d.controlType,'two-way');assert.deepEqual(d.groupIds,[id]);assert.deepEqual(targetSet(d.controlTargets),targetSet(e.targets),'both controls have identical lamp target '+code);}
 }
 for(const [code,targets]of Object.entries(SINGLE_TARGETS)){const d=pointByCode.get(code).electricalDesign;assert.deepEqual(d.groupIds,[]);assert.deepEqual(targetSet(d.controlTargets),targetSet(targets));assert.notEqual(d.controlType,'two-way');}
 for(const f of additions.filter(f=>f.kind!=='switch')){assert.deepEqual(f.electricalDesign.groupIds,[]);assert.deepEqual(f.electricalDesign.controlTargets,[]);}
 // The reused P16 is exactly the pre-existing shoe-cabinet component, not a
 // second editable panel, duplicated face or covert change to the old cabinet.
 const reused=u.existingPoints[0],e=EXPECTED.P16,host=old.defaultFurniture.find(f=>f.id==='fit-entry_shoe_station'),part=host.parts.find(q=>q.id==='e_key_niche-socket-plate'),b=aabb(partSolid(host,part));
 assert.equal(reused.code,'P16');assert.equal(reused.kind,'socket');assert.equal(reused.existingEntityReused,true);assert.equal(reused.hostFurnitureId,host.id);assert.equal(reused.hostPartId,part.id);
 assert.deepEqual([reused.roomId,reused.cx,reused.cy,reused.centerHeightMm,reused.face],[e.roomId,e.cx,e.cy,e.centerHeightMm,e.face]);assert.deepEqual([reused.widthMm,reused.depthMm,reused.heightMm],[70,5,70]);
 approx(reused.cx,b.x+b.w/2,'P16 true part center X');approx(reused.cy,b.y+b.d/2,'P16 true part center Y');approx(reused.centerHeightMm,b.z+b.h/2,'P16 true part center Z');
 assert.equal(reused.installationApproved,false);assert.equal(reused.ratingAmps,null);assert.equal(reused.ipRating,null);assert.equal(reused.wiringModeled,false);assert.equal(p.defaultFurniture.some(f=>f.id==='family-elec-p16'),false);
 const logical=[...u.points,reused];assert.equal(new Set(logical.map(d=>d.code)).size,54);assert.deepEqual(logical.map(d=>d.code).sort(),Object.keys(EXPECTED).sort());
 assert.deepEqual(Object.fromEntries(['switch','socket','data'].map(k=>[k,logical.filter(d=>d.kind===k).length])),u.counts);
 for(const code of['S07','S09','S14']){const a=pointByCode.get(code).electricalDesign.anchor;assert.equal(a.kind,'cabinet-part');assert.equal(a.furnitureId,'fit-entry_shoe_station');assert.equal(a.partId,'e_key_niche-niche-back');}
 for(const code of['P19','P20','P21','P22','P23']){const a=pointByCode.get(code).electricalDesign.anchor;assert.equal(a.kind,'cabinet-part');assert.equal(a.furnitureId,'fit-dining_sideboard_wall');assert.equal(a.partId,'reference-west-central-niche-back');}
 for(const code of['P35','P36']){const d=pointByCode.get(code).electricalDesign,a=d.anchor;assert.equal(a.kind,'cabinet-part');assert.equal(a.furnitureId,'balcony_recess_housing');assert.equal(a.partId,'balcony_recess_housing-kitchen-back');assert.equal(d.servedRoomId,'balcony');assert.equal(d.centerHeightMm,850);assert.equal(d.face,'south');}
 assert.equal(pointByCode.get('P03').electricalDesign.anchor.kind,'window-lintel');assert.equal(pointByCode.get('P07').electricalDesign.anchor.kind,'window-lintel');
 const disclosure=JSON.stringify({u,points:additions,conditions:p.metadata.conditions.slice(old.metadata.conditions.length)});
 for(const pattern of[/电工|electrician/i,/线径|conductor/i,/负荷|load/i,/回路|circuit/i,/漏电|protective/i,/等电位|equipotential/i,/涉水|湿区|wet/i,/不.*施工|非.*施工|notConstructionApproval/i,/不.*(同时|超负荷)|负荷.*(待|核|审)/])assert.match(disclosure,pattern,'explicit unresolved electrical issue '+pattern);
 // Panel rectangles are checked against each actual original cabinet board,
 // rather than falsely treating open niches as their parents' solid boxes.
 const obstacles=old.defaultFurniture.flatMap(f=>f.parts?.length?f.parts.map(q=>({id:f.id+'/'+q.id,solid:partSolid(f,q)})):[{id:f.id,solid:furnitureSolid(f)}]);
 obstacles.push(...old.WALLS.map((w,i)=>({id:'wall-'+i,solid:rect((w[0]+w[2])/2,(w[1]+w[3])/2,w[2]-w[0],w[3]-w[1])})));
 for(const f of additions)for(const o of obstacles)assert.equal(solidOverlap(furnitureSolid(f),o.solid),false,f.code+' overlaps unchanged solid '+o.id);
 for(let i=0;i<additions.length;i++)for(let j=i+1;j<additions.length;j++)assert.equal(solidOverlap(furnitureSolid(additions[i]),furnitureSolid(additions[j])),false,'two new panels physically overlap '+additions[i].code+'/'+additions[j].code);
 let sweepStates=0;
 for(const door of old.DOORS){
  const a0=Math.atan2(door.c[1],door.c[0]),cross=door.c[0]*door.o[1]-door.c[1]*door.o[0],direction=Math.sign(cross),reserve=door.len*rad(.25)/2;assert.notEqual(direction,0);
  for(let deg=0;deg<=90;deg+=.25){const a=a0+direction*rad(deg),leaf=rect(door.h[0]+Math.cos(a)*door.len/2,door.h[1]+Math.sin(a)*door.len/2,door.len+2*reserve,40+2*reserve,a,0,door.heightMm);for(const f of additions)assert.equal(solidOverlap(furnitureSolid(f),leaf),false,f.code+' is crossed by '+door.id+' at '+deg+' degrees');sweepStates++;}
 }
 // Sensitivity controls prove the checks would reject a buried support panel
 // and a doorway panel, rather than accepting all concept objects by fiat.
 const buried=clone(pointByCode.get('P01'));buried.cx+=8;assert.throws(()=>checkMount(old,buried),/back touches/);
 const door=old.DOORS.find(d=>d.id==='door_bath_2'),closedLeaf=rect(door.h[0],door.h[1]+door.len/2,40,door.len,0,0,door.heightMm);
 assert.ok(solidOverlap(furnitureSolid({...pointByCode.get('P32'),cx:door.h[0],cy:door.h[1]+door.len/2,rot:0}),closedLeaf),'negative control rejects a panel in a door leaf');
 for(const[id,expectedHash]of Object.entries(sourceSnapshotHashes)){const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expectedHash,id+' immutable snapshot');}
 for(const id of['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+' exact frozen scheme');assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyElectricalUpdate,undefined);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 assert.equal(hash(applyFamilyElectrical(clone(oldBundle))),originalHash,'deterministic exact reapplication');assert.equal(hash(applyFamilyElectrical(JSON.parse(JSON.stringify(oldBundle)))),originalHash,'serialized deterministic reapplication');
 assert.equal(hash(beforeFamilyElectrical(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized exact undo');assert.throws(()=>applyFamilyElectrical(clone(bundle)),/already|applied|duplicate/i,'double applying layer is rejected');assert.equal(hash(bundle),originalHash,'verification remains read-only');
 return{status:'PASS',revision:REVISION,scheme:'family',objectsBefore:68,objectsAfter:121,original68Exact:true,architectureAndOtherSchemesExact:true,logicalPointCount:54,newPhysicalPanels:53,reusedPhysicalPoints:1,counts:u.counts,twoWayGroups:Object.keys(EXPECTED_GROUPS),supportKinds:supports,solidObstacles:obstacles.length,doorSweepStates:sweepStates,ratingsWiringProtectionAndWetZonesUnverified:true};
}
module.exports={verifyFamilyElectrical,beforeFamilyElectrical,baseline,REVISION,EXPECTED,EXPECTED_GROUPS,solidOverlap,furnitureSolid,partSolid};
if(require.main===module)console.log(JSON.stringify(verifyFamilyElectrical(require(path.join(root,'data/house-plans.js'))),null,2));
