'use strict';

// Before-image independently frozen from 17aff3b. Reference photographs are
// appearance evidence, never manufacturer dimensions or construction approval.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {isDeepStrictEqual}=require('node:util');
const {applyFamilyReferenceFinish,beforeFamilyReferenceFinish,REVISION}=require('../tools/family-reference-finish-20261025.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'95f9f2cd78e2c23df6a9760cf99d6d5ab7ed6f9fe3298346b13b616d7e3250ff',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const CABINET='fit-dining_sideboard_wall',TV='family-f7',STUDY='fit-study_bookwall',WARDROBES=['family-f1','family-f3'];
const EXPECTED_CHANGED=['bed_b','family-f1','bed_a','family-f3','study_full_desk','family-f5','family-living-rug',TV,'study_north_sofa',CABINET,STUDY,
 'draft-desk-b','draft-chair-b','draft-night-b','draft-desk-a','draft-chair-a','draft-night-a','study_window_return','family-dining-ceilinglight',...Array.from({length:5},(_,i)=>'family-elec-p'+(19+i))];
const PURCHASED=['family-f6','family-f23','family-f24','family-f25','family-f26','family-f27'];
const APPLIANCES=['blender','temperaturekettle','sterilizer','healthkettle','waterdispenser'].map(t=>'family-sideboard-'+t);
const CABINETS=[CABINET,TV,...WARDROBES,STUDY],TOL=.001,rad=d=>d*Math.PI/180,round=n=>Math.round(n*1000)/1000;
const approx=(a,b,message)=>assert.ok(Math.abs(a-b)<TOL,message+': '+a+' vs '+b);
const rotate=(x,y,cx,cy,a)=>[cx+x*Math.cos(a)-y*Math.sin(a),cy+x*Math.sin(a)+y*Math.cos(a)];
function rect(cx,cy,w,d,a=0,z=0,h=2700){return{poly:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,y])=>rotate(x,y,cx,cy,a)),z,h};}
const furnitureSolid=f=>rect(f.cx,f.cy,f.w,f.d,rad(f.rot||0),f.elevationMm||0,f.heightMm||700);
function partSolid(f,q){const a=rad(f.rot||0),[x,y]=rotate(q.x+q.w/2,q.y+q.d/2,f.cx,f.cy,a);return rect(x,y,q.w,q.d,a,(f.elevationMm||0)+(q.elevationMm||0),q.heightMm);}
function bounds(s){const xs=s.poly.map(q=>q[0]),ys=s.poly.map(q=>q[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),d:Math.max(...ys)-Math.min(...ys),z:s.z,h:s.h};}
function polygonOverlap(a,b){
 for(const poly of[a,b])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],v=[p[1]-q[1],q[0]-p[0]],n=Math.hypot(...v),axis=v.map(x=>x/n),dot=p=>p[0]*axis[0]+p[1]*axis[1],aa=a.map(dot),bb=b.map(dot);
  if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=TOL)return false;
 }
 return true;
}
const solidOverlap=(a,b)=>Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z)>TOL&&polygonOverlap(a.poly,b.poly);
function worldPart(f,q){assert.equal(f.rot||0,0);return{...clone(q),x:round(q.x+f.cx),y:round(q.y+f.cy),...(q.cabinetDoor?{cabinetDoor:{...clone(q.cabinetDoor),hingeMm:q.cabinetDoor.hingeMm.map((n,i)=>round(n+[f.cx,f.cy][i]))}}:{})};}
function withoutColor(q){const c=clone(q);delete c.color;return c;}
function projection(f){if(!f.sourceFootprintMm)return;const b=bounds(furnitureSolid(f));for(const k of['x','y','w','d'])approx(f.sourceFootprintMm[k],b[k],'current projection '+f.id+'/'+k);}
function checkLed(f,q){
 const a=f.parts.find(n=>n.id===q.anchorPartId);assert.ok(a,'LED has actual anchor '+q.id);assert.equal(q.anchor,'panel-underside');
 approx(q.elevationMm+q.heightMm,a.elevationMm,'LED touches true underside '+q.id);assert.equal(q.heightMm,4);
 const l=bounds(partSolid(f,q)),b=bounds(partSolid(f,a));assert.ok(l.x>=b.x-TOL&&l.y>=b.y-TOL&&l.x+l.w<=b.x+b.w+TOL&&l.y+l.d<=b.y+b.d+TOL,'LED horizontally supported by its named board '+q.id);
}
function checkPointSupport(p,f){
 const d=f.electricalDesign,a=d.anchor,host=p.defaultFurniture.find(q=>q.id===a.furnitureId),part=host?.parts.find(q=>q.id===a.partId);assert.ok(part,'point anchors real new niche back '+f.id);
 assert.equal(a.kind,'cabinet-part');assert.equal(a.surfaceVerifiedAgainstCurrentModel,true);assert.equal(a.cabinetBoxAndPenetrationPending,true);assert.deepEqual(a.baseHostDimensionsMm,[host.w,host.d,host.heightMm]);assert.equal(a.hostRotationDegrees,host.rot||0);
 assert.deepEqual(a.localCenterMm,[f.cx-host.cx,f.cy-host.cy,d.centerHeightMm-(host.elevationMm||0)]);
 const b=bounds(furnitureSolid(f)),s=bounds(partSolid(host,part));assert.equal(f.face,'east');approx(b.x,s.x+s.w,'point rear on visible wood back '+f.id);
 assert.ok(b.y>=s.y-TOL&&b.y+b.d<=s.y+s.d+TOL&&b.z>=s.z-TOL&&b.z+b.h<=s.z+s.h+TOL,'complete plate on real support '+f.id);assert.equal(solidOverlap(furnitureSolid(f),partSolid(host,part)),false);
 for(const k of['installationApproved','wiringModeled','circuitConfirmed','protectiveMeasuresConfirmed','productSelected'])assert.equal(d[k],false,'reference cannot certify '+f.id+'/'+k);assert.equal(d.ratingAmps,null);assert.equal(d.ipRating,null);projection(f);
}
// Test the shape contract analytically as well as its thin depth. The actual
// extruded renderer is independently checked in the browser, not replaced by
// a full rectangular AABB pretending that an arched opening is a solid door.
function panelContains(q,x,y,z){
 if(x<q.x-TOL||x>q.x+q.w+TOL||y<q.y-TOL||y>q.y+q.d+TOL||z<q.elevationMm-TOL||z>q.elevationMm+q.heightMm+TOL)return false;
 if(q.shape==='arched-back'){
  const half=q.w/2,dx=x-q.x-half,rise=q.archRiseMm,spring=q.elevationMm+q.heightMm-rise;
  return z<=spring+rise*Math.sqrt(Math.max(0,1-dx*dx/(half*half)))+TOL;
 }
 if(q.shape==='arch-spandrel'){
  const half=q.openingWidthMm/2,dx=x-q.x-q.w/2;if(Math.abs(dx)>half)return true;
  return z>=q.elevationMm+q.archRiseMm*Math.sqrt(Math.max(0,1-dx*dx/(half*half)))-TOL;
 }
 return true;
}
function verifyFamilyReferenceFinish(bundle){
 bundle=require('../tools/family-drawing-20261027.cjs').beforeFamilyDrawing(bundle);
 const inputHash=hash(bundle),p=bundle.schemes.family,u=p.metadata.familyReferenceFinishUpdate,oldBundle=beforeFamilyReferenceFinish(bundle),old=oldBundle.schemes.family;
 assert.equal(REVISION,'family-reference-finish-20261025');assert.equal(u?.id,REVISION);assert.equal(u.date,'2026-10-25');assert.equal(hash(old),baseline.family,'independent 17aff3b full 120-object before-image');
 assert.equal(hash(beforeFamilyReferenceFinish(p)),baseline.family,'plan-only exact rollback');assert.equal(hash(beforeFamilyReferenceFinish(old)),baseline.family,'absent layer inert');
 assert.equal(p.defaultFurniture.length,120);assert.equal(old.defaultFurniture.length,120);assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,120);assert.deepEqual(p.defaultFurniture.map(f=>f.id),old.defaultFurniture.map(f=>f.id));
 const oldById=new Map(old.defaultFurniture.map(f=>[f.id,f])),byId=new Map(p.defaultFurniture.map(f=>[f.id,f])),actual=p.defaultFurniture.filter(f=>!isDeepStrictEqual(f,oldById.get(f.id))).map(f=>f.id);
 assert.deepEqual(actual,EXPECTED_CHANGED,'exactly 24 explicitly scoped object changes, including new reference dining pendant');assert.deepEqual(u.changedFurnitureIds,EXPECTED_CHANGED);for(const k of['newFurnitureIds','removedFurnitureIds','replacedFurnitureIds'])assert.deepEqual(u[k],[]);
 assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id));assert.deepEqual(u.previousFurniture,EXPECTED_CHANGED.map(id=>oldById.get(id)));
 assert.deepEqual(u.previousPlanFields,{ROOMS:old.ROOMS});assert.deepEqual(u.previousROOMS,old.ROOMS);
 for(const key of Object.keys(old))if(!['defaultFurniture','metadata','ROOMS'].includes(key))assert.deepEqual(p[key],old[key],'architecture/source exact '+key);
 const expectedRooms=clone(old.ROOMS);for(const r of expectedRooms)if(['room_a','room_b','room_c'].includes(r.id))r.mat='wood';assert.deepEqual(p.ROOMS,expectedRooms,'only the three user-confirmed real wood material fields change');
 assert.deepEqual(u.roomMaterialChanges.map(q=>[q.roomId,q.previousMat,q.mat,q.materialIntent]),[['room_a','tile800','wood','real-wood-not-wood-look-tile'],['room_b','tile800','wood','real-wood-not-wood-look-tile'],['room_c','tile800','wood','real-wood-not-wood-look-tile']]);
 for(const key of Object.keys(old.metadata))if(!['conditions','designCorrections','converter'].includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'historical metadata retained verbatim '+key);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 for(const f of p.defaultFurniture)if(!EXPECTED_CHANGED.includes(f.id))assert.deepEqual(f,oldById.get(f.id),'unrelated object exact '+f.id);
 assert.deepEqual(Object.keys(u.migrationFields),EXPECTED_CHANGED);
 for(const id of EXPECTED_CHANGED){const a=oldById.get(id),b=byId.get(id),fields=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&!isDeepStrictEqual(a[k],b[k])).sort();assert.deepEqual(u.migrationFields[id],fields,'field-aware migration '+id);}
 assert.equal(u.referenceAppearanceOnly,true);assert.equal(u.sourceSnapshotsUnchanged,true);assert.equal(u.wallDoorWindowGeometryUnchanged,true);assert.equal(u.otherSchemesUnchanged,true);assert.equal(u.noCoffeeTable,true);
 assert.equal(u.purchasedLivingAndDiningFurnitureUnchanged,true);assert.deepEqual(u.preserveCustomPartsIds,CABINETS);assert.deepEqual(u.preserveCustomSizeIds,CABINETS);
 assert.equal(u.sourceImages.length,6);assert.ok(u.sourceImages.every(s=>!/[:/\\]/.test(s)),'reference provenance contains no private host paths');
 for(const id of PURCHASED)assert.deepEqual(byId.get(id),oldById.get(id),'all purchased IKEA object fields exact '+id);
 assert.deepEqual([byId.get('family-f6').cx,byId.get('family-f6').cy,byId.get('family-f6').rot,byId.get('family-f6').face],[6260,8025,90,'west']);
 assert.equal(p.defaultFurniture.some(f=>f.id==='fit-sofa_back_storage'),false);assert.equal(p.defaultFurniture.some(f=>f.type==='floorlamp'),false);assert.equal(p.defaultFurniture.some(f=>['coffeetable','coffee-table'].includes(f.type)||/茶几/.test(f.name||'')),false);
 for(const f of p.defaultFurniture.filter(f=>EXPECTED_CHANGED.includes(f.id))){
  const a=oldById.get(f.id);if(f.id!==CABINET)for(const key of['cx','cy','rot',...(f.id==='family-dining-ceilinglight'?[]:['w','d','elevationMm'])])assert.deepEqual(f[key],a[key],'appearance cannot alter position/plan envelope '+f.id+'/'+key);
  if(![...WARDROBES,'family-dining-ceilinglight'].includes(f.id))assert.equal(f.heightMm,a.heightMm,'unapproved height change '+f.id);projection(f);
 }
 for(const id of['bed_a','bed_b']){const f=byId.get(id),a=oldById.get(id);assert.deepEqual(f.mattressMm,a.mattressMm);assert.deepEqual([f.w,f.d,f.heightMm],[a.w,a.d,a.heightMm]);assert.equal(f.referenceStyle.preserveExistingEnvelope,true);assert.equal(f.referenceStyle.installationApproved,false);}
 const cabinet=byId.get(CABINET),oldCabinet=oldById.get(CABINET);assert.deepEqual([cabinet.cx,cabinet.cy,cabinet.w,cabinet.d,cabinet.heightMm,cabinet.baseDepthMm],[2937.5,11645,1625,4490,2700,4490]);
 assert.deepEqual(cabinet.sourceFootprintMm,{x:2125,y:9400,w:1625,d:4490});assert.equal(cabinet.cabinetDesign.faces.find(f=>f.face==='east').lengthMm,4090);assert.equal(cabinet.cabinetDesign.layoutAdaptations.northEndRetreatMm,800);
 const counterPart=cabinet.parts.find(q=>q.id==='reference-west-central-countertop'),counter=bounds(partSolid(cabinet,counterPart));assert.deepEqual([counter.x,counter.y,counter.w,counter.d,counter.z,counter.h],[2125,10000,400,2730,832,18]);
 const niche=cabinet.parts.find(q=>q.id==='reference-west-central-niche-back');assert.deepEqual([niche.x+cabinet.cx,niche.y+cabinet.cy,niche.w,niche.d,niche.elevationMm,niche.heightMm,niche.material],[2125,10000,18,2730,850,1400,'OakLight']);
 const openShelves=cabinet.parts.filter(q=>q.id.startsWith('reference-west-central-open-shelf-')&&q.role==='display-shelf');assert.deepEqual(openShelves.map(q=>[q.elevationMm,q.heightMm,q.d,q.material]),[[1500,18,2730,'OakLight'],[1900,18,2730,'OakLight']]);
 const diningLeds=cabinet.parts.filter(q=>q.role==='led-strip'&&q.id.startsWith('reference-west-central'));assert.deepEqual(diningLeds.map(q=>q.elevationMm).sort((a,b)=>a-b),[1496,1896,2246]);
 assert.equal(cabinet.parts.some(q=>/^reference-west-(round|display|narrow-tall)/.test(q.id)),false,'old end round/display/narrow stack is replaced, not superimposed');
 const sliding=cabinet.parts.filter(q=>q.id.startsWith('reference-west-central-wood-slide-'));assert.equal(sliding.length,8);for(const q of sliding){assert.equal(q.role,'door-sliding');assert.equal(q.notPullOutDrawer,true);assert.equal(q.elevationMm>=240,true);}
 const drawers=cabinet.parts.filter(q=>q.id.startsWith('reference-west-central-south-drawer-front-'));assert.equal(drawers.length,2);for(const q of drawers){assert.equal(q.role,'drawer-front');assert.deepEqual([q.y+cabinet.cy,q.d,q.w],[12331.5,397,18]);assert.equal(q.maxExtensionMm,250);assert.equal(q.requiresTemporaryChairMove,true);}
 const supports=cabinet.parts.filter(q=>q.role==='hidden-cabinet-support');assert.equal(supports.length,4);for(const q of supports){assert.equal(q.elevationMm,0);assert.equal(q.heightMm,240);assert.equal(q.hiddenSupport,true);assert.equal(q.structuralCapacityConfirmed,false);}
 for(const q of oldCabinet.parts.filter(q=>/^corner800-|^corner-return-/.test(q.id)))assert.deepEqual(withoutColor(worldPart(cabinet,cabinet.parts.find(n=>n.id===q.id))),withoutColor(worldPart(oldCabinet,q)),'south corner true geometry/hinge remains exact except allowed palette '+q.id);
 assert.equal(cabinet.cornerDoorDesign.hingeOpeningDegrees,180);assert.deepEqual(cabinet.cornerDoorDesign.openingSweepDegrees,{west:-180,south:180});
 const park=cabinet.cornerDoorDesign.operatingChair;assert.deepEqual([park.id,park.cx,park.cy,park.relativeMm],['family-f27',3420,12080,[482.5,435]]);assert.equal(park.temporary,true);assert.equal(park.ownerConfirmed,true);assert.deepEqual(cabinet.cabinetDesign.layoutAdaptations.cornerStorage.operatingChair,park);
 const focus=cabinet.cornerDoorDesign.focusBoundsMm.map((n,i)=>n+[cabinet.cx,cabinet.cy,cabinet.cx,cabinet.cy][i]),oldFocus=oldCabinet.cornerDoorDesign.focusBoundsMm.map((n,i)=>n+[oldCabinet.cx,oldCabinet.cy,oldCabinet.cx,oldCabinet.cy][i]);assert.deepEqual(focus,oldFocus);
 const chair=byId.get(park.id),parked={...clone(chair),cx:park.cx,cy:park.cy},extended=drawers.map(q=>partSolid(cabinet,{...q,x:q.x+q.maxExtensionMm}));assert.ok(extended.some(s=>solidOverlap(s,furnitureSolid(chair))),'default south chair still prevents full drawer extension');assert.ok(extended.every(s=>!solidOverlap(s,furnitureSolid(parked))),'temporary chair park clears actual south drawer fronts');assert.ok(extended.every(s=>!solidOverlap(s,furnitureSolid(byId.get('family-f23')))),'southern drawers do not falsely pull through fixed table');
 for(const[id,i]of APPLIANCES.map((id,i)=>[id,i])){
  const f=byId.get(id);assert.deepEqual(f,oldById.get(id),'five appliance objects entirely unchanged '+id);const b=bounds(furnitureSolid(f));assert.ok(b.x>=counter.x&&b.x+b.w<=counter.x+counter.w&&b.y>=counter.y&&b.y+b.d<=counter.y+counter.d,'actual unchanged appliance still on new counter '+id);assert.equal(b.z,850);assert.equal(f.supportPartId,counterPart.id);
  for(const q of cabinet.parts)assert.equal(solidOverlap(furnitureSolid(f),partSolid(cabinet,q)),false,'appliance cannot penetrate actual new wood board '+id+'/'+q.id);
  const point=byId.get('family-elec-p'+(19+i)),a=oldById.get(point.id);for(const key of Object.keys(a))if(!['electricalDesign','layoutRevision'].includes(key))assert.deepEqual(point[key],a[key],'only local anchor and revision may change '+point.id+'/'+key);
  for(const key of Object.keys(a.electricalDesign))if(!['anchor','layoutRevision'].includes(key))assert.deepEqual(point.electricalDesign[key],a.electricalDesign[key],'electrical purpose/safety unchanged '+point.id+'/'+key);
  checkPointSupport(p,point);approx(1496-(point.elevationMm+point.heightMm),63,'first shelf light remains above plate '+point.id);
 }
 const tv=byId.get(TV);assert.equal(tv.parts.length,54,'left/right open shelves meet vertical dividers without duplicated volume');assert.equal(tv.referenceStyle.variant,'walnut-open-drawer-tvstand');assert.deepEqual([tv.w,tv.d,tv.heightMm],[2200,340,430]);assert.equal(tv.parts.filter(q=>q.role==='drawer-front').length,6);assert.equal(tv.parts.filter(q=>q.role==='cabinet-leg').length,4);assert.equal(tv.parts.some(q=>q.role==='door-sliding'),false);assert.ok(tv.parts.filter(q=>q.material==='OakDark').length>40);
 for(const id of WARDROBES){
  const f=byId.get(id),room=p.ROOMS.find(r=>r.id===f.roomId),bed=byId.get(id==='family-f1'?'bed_b':'bed_a'),cab=bounds(furnitureSolid(f)),b=bounds(furnitureSolid(bed));assert.deepEqual([f.w,f.d,f.heightMm,f.baseHeightMm],[2240,600,id==='family-f1'?2700:2790,room.heightMm]);assert.equal(f.cabinetDesign.bedFootGapMm,555);
  approx(id==='family-f1'?cab.x-(b.x+b.w):b.x-(cab.x+cab.w),555,'real unaltered bed foot strip '+id);assert.equal(f.parts.filter(q=>q.role==='door-sliding').length,3);assert.ok(f.parts.filter(q=>q.role==='door-sliding').every(q=>q.d===18&&q.doorStyle==='sliding'));
 }
 const master=byId.get('family-f3');assert.equal(master.parts.filter(q=>q.role==='drawer-front').length,2);assert.equal(master.parts.filter(q=>q.role==='led-strip').length,1);assert.equal(master.referenceStyle.nicheLocation,'south-entry-end');
 const child=byId.get('family-f1'),back=child.parts.find(q=>q.shape==='arched-back'),spandrel=child.parts.find(q=>q.shape==='arch-spandrel'),whiteShelves=child.parts.filter(q=>q.id.includes('arch-white-shelf-'));
 assert.ok(back&&spandrel,'both back curve and open spandrel are explicit geometry contracts');assert.deepEqual([back.w,back.d,back.heightMm,back.elevationMm,back.material],[424,18,2030,180,'PaintPink']);assert.equal(back.openNiche,true);assert.equal(back.backThicknessMm,18);
 assert.deepEqual([spandrel.w,spandrel.d,spandrel.openingWidthMm,spandrel.openingInsetMm,spandrel.archRadiusMm],[460,18,424,18,212]);assert.equal(spandrel.openNiche,true);assert.equal(spandrel.solidFiller,false);assert.equal(spandrel.openingBelowPart,true);assert.equal(child.referenceStyle.nicheLocation,'north-window-end');
 assert.equal(whiteShelves.length,4);assert.deepEqual(whiteShelves.map(q=>[q.elevationMm,q.heightMm,q.w,q.d]),[[500,18,424,564],[900,18,424,564],[1300,18,424,564],[1700,18,424,564]]);assert.equal(child.parts.filter(q=>q.role==='led-strip').length,0,'photo does not silently invent a lit pink niche');
 const center=-890;assert.equal(panelContains(spandrel,center,291,2100),false,'arch top opening is not an opaque block');assert.equal(panelContains(spandrel,center,291,2230),true,'solid white spandrel remains above the 2210 apex');assert.equal(panelContains(spandrel,-1110,291,2100),true,'18mm actual side jamb remains');assert.equal(panelContains(back,center,-291,2200),true,'pink back reaches center apex');assert.equal(panelContains(back,-1090,-291,2200),false,'pink rear sheet follows arch, not rectangular fill');
 for(const[x,z]of[[-1050,350],[-890,700],[-750,1100],[-890,1500],[-890,1850],[-890,2100],[-890,2190]])for(const depth of[-240,0,240])assert.equal(child.parts.some(q=>panelContains(q,x,depth,z)),false,'real open niche cavity remains empty '+[x,depth,z]);
 const study=byId.get(STUDY);assert.equal(study.parts.length,10);assert.equal(study.parts.filter(q=>q.role==='display-shelf').length,2);assert.equal(study.parts.filter(q=>q.role==='led-strip').length,2);assert.equal(study.parts.filter(q=>q.role==='hidden-shelf-support').length,6);assert.deepEqual(study.parts.filter(q=>q.role==='display-shelf').map(q=>[q.w,q.d,q.elevationMm,q.heightMm]),[[1450,282.5,1500,18],[1450,282.5,1950,18]]);assert.equal(study.parts.some(q=>['door','upright','back','book'].includes(q.role)),false,'old 56-part grid is replaced, not layered behind shelves');
 const pendant=byId.get('family-dining-ceilinglight');assert.deepEqual([pendant.cx,pendant.cy,pendant.w,pendant.d,pendant.heightMm,pendant.elevationMm],[2955,11000,1000,380,760,1940]);assert.equal(pendant.referenceStyle.variant,'articulated-dining-pendant');assert.equal(pendant.modelVariant,'reference-articulated-pendant');assert.equal(pendant.heightMm+pendant.elevationMm,2700);assert.deepEqual(byId.get('family-living-ceilinglight'),oldById.get('family-living-ceilinglight'),'owner-provided 907 living lamp entirely unchanged');
 for(const q of study.parts.filter(q=>q.role==='hidden-shelf-support')){assert.equal(q.hiddenSupport,true);assert.equal(q.structuralCapacityConfirmed,false);}
 let ledCount=0,newPartPairChecks=0;for(const id of CABINETS){const f=byId.get(id);assert.equal(new Set(f.parts.map(q=>q.id)).size,f.parts.length);for(const q of f.parts){assert.ok(q.w>0&&q.d>0&&q.heightMm>0);assert.ok(q.x>=-f.w/2-TOL&&q.y>=-f.d/2-TOL&&q.x+q.w<=f.w/2+TOL&&q.y+q.d<=f.d/2+TOL,'unscaled board inside existing or approved envelope '+q.id);assert.ok(q.elevationMm>=0&&q.elevationMm+q.heightMm<=f.heightMm+TOL,'board below room-specific roof '+q.id);if(q.role==='led-strip'){checkLed(f,q);ledCount++;}}
  const fresh=f.parts.filter(q=>!/^corner800-|^corner-return-/.test(q.id));for(let i=0;i<fresh.length;i++)for(let j=i+1;j<fresh.length;j++){newPartPairChecks++;assert.equal(solidOverlap(partSolid(f,fresh[i]),partSolid(f,fresh[j])),false,'new cabinet panels meet without duplicated volume '+fresh[i].id+'/'+fresh[j].id);}
 }
 const door=p.DOORS.find(q=>q.id==='door_c'),h=door.heightMm,allStudy=study.parts.map(q=>partSolid(study,q));
 for(let degree=0;degree<=90;degree+=.25){const a=-Math.PI/2-rad(degree),end=[door.h[0]+Math.cos(a)*door.len,door.h[1]+Math.sin(a)*door.len],leaf=rect((door.h[0]+end[0])/2,(door.h[1]+end[1])/2,door.len,40,a,0,h);for(const s of allStudy)assert.equal(solidOverlap(s,leaf),false,'real new shelf/LED/support does not collide with full study door swing '+degree);}
 const {auditCorner180Sweeps}=require('./family-corner-door-180-20261012.cjs');assert.throws(()=>auditCorner180Sweeps(p,cabinet),/other-furniture family-f27/,'pantry default eating chair obstruction retained');const operation=clone(p);Object.assign(operation.defaultFurniture.find(q=>q.id===park.id),{cx:park.cx,cy:park.cy});const cornerSweep=auditCorner180Sweeps(operation,operation.defaultFurniture.find(q=>q.id===CABINET));
 for(const[id,expected]of Object.entries(sourceSnapshotHashes)){const raw=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),expected,id+' immutable source');}
 for(const id of['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+' independently frozen entire other scheme');assert.deepEqual(bundle.schemes[id],oldBundle.schemes[id]);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);assert.equal(u.styleSpec.installationApproved,false);assert.equal(u.styleSpec.dining.structuralCapacityConfirmed,false);assert.equal(u.styleSpec.wardrobes.constructionApproval,false);
 const disclosure=JSON.stringify({u,notes:p.metadata.conditions.slice(old.metadata.conditions.length)});assert.match(disclosure,/real-wood/);assert.match(disclosure,/滑门|sliding/);assert.match(disclosure,/待核|待.*核|pending|未批准/i);assert.match(disclosure,/无茶几|不恢复茶几|noCoffeeTable/);
 assert.equal(hash(applyFamilyReferenceFinish(clone(oldBundle))),inputHash,'exact deterministic reapplication');assert.equal(hash(applyFamilyReferenceFinish(JSON.parse(JSON.stringify(oldBundle)))),inputHash,'serialized deterministic reapplication');assert.equal(hash(beforeFamilyReferenceFinish(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized exact rollback');assert.throws(()=>applyFamilyReferenceFinish(clone(bundle)),/already|applied|duplicate/i,'reject double apply');assert.equal(hash(bundle),inputHash,'verification is read-only');
 return{status:'PASS',revision:REVISION,objectsBefore:120,objectsAfter:120,changedObjects:24,noObjectsAddedOrRemoved:true,purchasedIKEAExactlyPreserved:true,noCoffeeTableOrFloorLamp:true,onlyThreeRoomMaterialsBecomeRealWood:true,cabinetNorthEndMm:9400,cabinetEnvelopeMm:[1625,4490],counterMm:[2730,400,850],fiveAppliancesAndPointWorldPositionsPreserved:true,wardrobeHeightsMm:[2790,2700],bedFootGapMm:555,thinOpenChildArchVerified:true,tvCabinetParts:tv.parts.length,studyShelfParts:study.parts.length,referenceDiningPendantMm:[1000,380,760,1940],living907LampUnchanged:true,ledCount,newPartPairChecks,studyDoorSweepSamples:361,southCornerGeometryAndParkingPreserved:true,cornerSweep,architectureOtherSchemesSourcesAndHistoricalMetadataExact:true,installationApproval:false};
}
module.exports={verifyFamilyReferenceFinish,beforeFamilyReferenceFinish,baseline,REVISION,solidOverlap,furnitureSolid,partSolid};
if(require.main===module)console.log(JSON.stringify(verifyFamilyReferenceFinish(require(path.join(root,'data/house-plans.js'))),null,2));
