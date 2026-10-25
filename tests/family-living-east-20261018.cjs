'use strict';

// Independently frozen from the published 74619f8 model. These are model
// envelope/board/faceplate checks, not construction, access or safety approval.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyLivingEast,beforeFamilyLivingEast,REVISION}=require('../tools/family-living-east-20261018.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'a0bfbb2306608245afdaa56b1d6664c1ebe24b642c231b761a87bfa2189ff97d',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const CABINET='fit-dining_sideboard_wall',BACK='fit-sofa_back_storage';
const APPLIANCES=['blender','temperaturekettle','sterilizer','healthkettle','waterdispenser'];
const CHANGED=['family-f6',CABINET,...APPLIANCES.map(t=>'family-sideboard-'+t),...Array.from({length:5},(_,i)=>'family-elec-p'+(19+i)),'family-elec-p17'];
const rad=d=>d*Math.PI/180,tol=.001;
const approx=(a,b,message)=>assert.ok(Math.abs(a-b)<tol,message+': '+a+' vs '+b);
const move=(x,y,cx,cy,a)=>[cx+x*Math.cos(a)-y*Math.sin(a),cy+x*Math.sin(a)+y*Math.cos(a)];
function rect(cx,cy,w,d,a=0,z=0,h=2700){return{poly:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,y])=>move(x,y,cx,cy,a)),z,h};}
function furnitureSolid(f){return rect(f.cx,f.cy,f.w,f.d,rad(f.rot||0),f.elevationMm||0,f.heightMm||700);}
function partSolid(f,q){const a=rad(f.rot||0),[x,y]=move(q.x+q.w/2,q.y+q.d/2,f.cx,f.cy,a);return rect(x,y,q.w,q.d,a,(f.elevationMm||0)+(q.elevationMm||0),q.heightMm);}
function bounds(s){const x=s.poly.map(p=>p[0]),y=s.poly.map(p=>p[1]);return{x:Math.min(...x),y:Math.min(...y),w:Math.max(...x)-Math.min(...x),d:Math.max(...y)-Math.min(...y),z:s.z,h:s.h};}
function polygonOverlap(a,b){
 for(const poly of[a,b])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],v=[p[1]-q[1],q[0]-p[0]],length=Math.hypot(...v),axis=v.map(n=>n/length),project=p=>p[0]*axis[0]+p[1]*axis[1],aa=a.map(project),bb=b.map(project);
  if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=tol)return false;
 }
 return true;
}
const solidOverlap=(a,b)=>Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z)>tol&&polygonOverlap(a.poly,b.poly);
function absolutePart(f,q){
 assert.equal(f.rot||0,0);
 return {...clone(q),x:q.x+f.cx,y:q.y+f.cy,...(q.cabinetDoor?{cabinetDoor:{...clone(q.cabinetDoor),hingeMm:q.cabinetDoor.hingeMm.map((n,i)=>n+[f.cx,f.cy][i])}}:{})};
}
function checkFootprint(f){
 const b=bounds(furnitureSolid(f));assert.ok(f.sourceFootprintMm,'explicit current rotated projection '+f.id);
 for(const k of['x','y','w','d'])approx(f.sourceFootprintMm[k],b[k],'current rotated projection '+f.id+'/'+k);
}
function checkMount(p,f){
 const design=f.electricalDesign,a=design.anchor,b=bounds(furnitureSolid(f));let s;
 assert.equal(design.installationApproved,false);assert.equal(design.wiringModeled,false);assert.equal(design.ratingAmps,null);assert.equal(design.ipRating,null);
 assert.equal(a.surfaceVerifiedAgainstCurrentModel,true);
 if(a.kind==='wall'){
  const w=p.WALLS[a.wallIndex];assert.ok(w);s={x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1],z:0,h:2700};
 }else{
  assert.equal(a.kind,'cabinet-part');const host=p.defaultFurniture.find(q=>q.id===a.furnitureId),part=host?.parts.find(q=>q.id===a.partId);
  assert.ok(part,'electrical point anchored to a real board '+f.id);s=bounds(partSolid(host,part));
  assert.equal(a.cabinetBoxAndPenetrationPending,true);assert.deepEqual(a.baseHostDimensionsMm,[host.w,host.d,host.heightMm]);assert.equal(a.hostRotationDegrees,host.rot||0);
  const [x,y]=move(f.cx-host.cx,f.cy-host.cy,0,0,-rad(host.rot||0));
  assert.deepEqual(a.localCenterMm,[x,y,design.centerHeightMm-(host.elevationMm||0)]);
 }
 assert.ok(b.y>=s.y-tol&&b.y+b.d<=s.y+s.d+tol,'complete panel width supported '+f.id);
 assert.ok(b.z>=s.z-tol&&b.z+b.h<=s.z+s.h+tol,'complete panel height supported '+f.id);
 approx(f.face==='east'?b.x:b.x+b.w,f.face==='east'?s.x+s.w:s.x,'panel rear touches named support '+f.id);
 assert.equal(solidOverlap(furnitureSolid(f),rect(s.x+s.w/2,s.y+s.d/2,s.w,s.d,0,s.z,s.h)),false,'panel is not buried '+f.id);
}
function verifyFamilyLivingEast(bundle){
 bundle=require('../tools/family-reference-finish-20261025.cjs').beforeFamilyReferenceFinish(bundle);
 const inputHash=hash(bundle),p=bundle.schemes.family,u=p.metadata.familyLivingEastUpdate,oldBundle=beforeFamilyLivingEast(bundle),old=oldBundle.schemes.family;
 assert.equal(REVISION,'family-living-east-20261018');assert.equal(u?.id,REVISION);
 assert.equal(hash(old),baseline.family,'independent frozen 121-object published before-image');assert.equal(hash(beforeFamilyLivingEast(p)),baseline.family,'plan-only rollback');assert.equal(hash(beforeFamilyLivingEast(old)),baseline.family,'absent layer inert');
 assert.equal(old.defaultFurniture.length,121);assert.equal(p.defaultFurniture.length,120);assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,120);
 assert.deepEqual(p.defaultFurniture.map(f=>f.id),old.defaultFurniture.filter(f=>f.id!==BACK).map(f=>f.id),'remove only old middle back cabinet; retain order');
 const changed=old.defaultFurniture.filter(f=>f.id!==BACK&&hash(f)!==hash(p.defaultFurniture.find(q=>q.id===f.id))).map(f=>f.id);
 assert.deepEqual(changed.slice().sort(),CHANGED.slice().sort(),'precisely 13 necessary object changes');assert.deepEqual(u.changedFurnitureIds.slice().sort(),CHANGED.slice().sort());
 assert.deepEqual(u.removedFurnitureIds,[BACK]);assert.deepEqual(u.newFurnitureIds,[]);assert.deepEqual(u.replacedFurnitureIds,[]);assert.deepEqual(u.previousPlanFields,{});
 assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id));assert.deepEqual(u.previousFurniture.map(f=>f.id).sort(),[...CHANGED,BACK].sort());
 const byId=new Map(p.defaultFurniture.map(f=>[f.id,f])),oldById=new Map(old.defaultFurniture.map(f=>[f.id,f]));
 for(const f of u.previousFurniture)assert.deepEqual(f,oldById.get(f.id),'previous object saved verbatim '+f.id);
 for(const f of old.defaultFurniture)if(!CHANGED.includes(f.id)&&f.id!==BACK)assert.deepEqual(byId.get(f.id),f,'unrelated furniture exact '+f.id);
 for(const key of Object.keys(old))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],old[key],'architecture/source/display exact '+key);
 for(const key of Object.keys(old.metadata))if(!['conditions','designCorrections','converter'].includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'historical metadata exact '+key);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 assert.equal(u.sourceSnapshotsUnchanged,true);assert.equal(u.architectureUnchanged,true);assert.equal(u.otherSchemesUnchanged,true);assert.equal(u.purchasedSofaDimensionsUnchanged,true);
 for(const id of CHANGED){const a=oldById.get(id),b=byId.get(id),keys=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&JSON.stringify(stable(a[k]))!==JSON.stringify(stable(b[k])));assert.deepEqual(u.migrationFields[id].slice().sort(),keys.slice().sort(),'complete field-aware migration '+id);}
 assert.deepEqual(Object.keys(u.migrationFields).sort(),CHANGED.slice().sort());
 const sofa=byId.get('family-f6'),aircon=byId.get('family-living-aircon');
 assert.deepEqual([sofa.cx,sofa.cy,sofa.w,sofa.d,sofa.heightMm,sofa.rot,sofa.face],[6260,8025,2410,980,830,90,'west']);checkFootprint(sofa);
 assert.equal(sofa.purchasedProductId,oldById.get(sofa.id).purchasedProductId);assert.equal(sofa.dimensionStatus,'purchased-product-body');
 const sb=bounds(furnitureSolid(sofa)),ac=bounds(furnitureSolid(aircon));approx(sb.x,5770,'sofa front');approx(sb.x+sb.w,6750,'sofa rear at east wall');approx(sb.y,6820,'sofa north');approx(sb.y+sb.d,9230,'sofa south');approx(sb.y-ac.y-ac.d,20,'retain cabinet aircon with 20mm non-certified model gap');
 assert.equal(solidOverlap(furnitureSolid(sofa),furnitureSolid(aircon)),false);assert.equal(solidOverlap(furnitureSolid({...sofa,cy:8000}),furnitureSolid(aircon)),true,'exact unadjusted scheme4 placement is a 5mm collision negative control');
 const p15=byId.get('family-elec-p15'),p17=byId.get('family-elec-p17');assert.deepEqual([p17.cx,p17.cy,p17.electricalDesign.centerHeightMm],[6746,9420,300]);
 for(const point of[p15,p17]){checkMount(p,point);assert.equal(solidOverlap(furnitureSolid(sofa),furnitureSolid(point)),false,'usable visible east-wall plate not behind sofa '+point.id);}
 assert.equal(solidOverlap(furnitureSolid(sofa),furnitureSolid(oldById.get(p17.id))),true,'old low P17 is behind new sofa negative control');
 approx(bounds(furnitureSolid(p15)).y-sb.y-sb.d,27,'P15 outside sofa south end');
 const balcony=p.SLIDES.find(d=>d.id==='balcony_door');assert.ok(sb.y+sb.d<balcony.rect[1]);approx(balcony.rect[1]-sb.y-sb.d,370,'sofa stays north of balcony opening');
 const cabinet=byId.get(CABINET),oldCabinet=oldById.get(CABINET);assert.deepEqual([cabinet.cx,cabinet.cy,cabinet.w,cabinet.d,cabinet.rot,cabinet.heightMm,cabinet.baseDepthMm],[2937.5,11745,1625,4290,0,2700,4290]);checkFootprint(cabinet);
 assert.equal(cabinet.cabinetDesign.faces.find(f=>f.face==='east').lengthMm,3890);assert.equal(cabinet.cabinetDesign.boardThicknessMm,18);assert.equal(cabinet.cabinetDesign.doorGapMm,3);
 assert.equal(new Set(cabinet.parts.map(q=>q.id)).size,cabinet.parts.length);assert.ok(cabinet.parts.length>100,'real detailed boards, not a solid shortened block');
 for(const q of cabinet.parts){const b=bounds(partSolid(cabinet,q));assert.ok(b.x>=2125-tol&&b.x+b.w<=3750+tol&&b.y>=9600-tol&&b.y+b.d<=13890+tol,'real shorter envelope '+q.id);assert.ok(b.z>=-tol&&b.z+b.h<=2700+tol,'unchanged model roof '+q.id);
  if(q.role==='led-strip'){const anchor=cabinet.parts.find(a=>a.id===q.anchorPartId);assert.ok(anchor,'LED names real board '+q.id);approx(q.elevationMm+q.heightMm,anchor.elevationMm,'LED underside attachment '+q.id);assert.ok(polygonOverlap(partSolid(cabinet,q).poly,partSolid(cabinet,anchor).poly),'LED spatially under named board '+q.id);assert.equal(q.heightMm,4);}
 }
 for(const q of oldCabinet.parts.filter(q=>/^reference-west-(round|display|narrow-tall)/.test(q.id))){const expected=absolutePart(oldCabinet,q);expected.y+=1000;assert.deepEqual(absolutePart(cabinet,cabinet.parts.find(n=>n.id===q.id)),expected,'north end modules translated without changing material/skin/board size '+q.id);}
 for(const q of oldCabinet.parts.filter(q=>/^corner800-|^corner-return-/.test(q.id)))assert.deepEqual(absolutePart(cabinet,cabinet.parts.find(n=>n.id===q.id)),absolutePart(oldCabinet,q),'all south corner geometry and true hinge world positions exact '+q.id);
 const focus=cabinet.cornerDoorDesign.focusBoundsMm.map((n,i)=>n+[cabinet.cx,cabinet.cy,cabinet.cx,cabinet.cy][i]),oldFocus=oldCabinet.cornerDoorDesign.focusBoundsMm.map((n,i)=>n+[oldCabinet.cx,oldCabinet.cy,oldCabinet.cx,oldCabinet.cy][i]);assert.deepEqual(focus,oldFocus);
 assert.equal(cabinet.cornerDoorDesign.hingeOpeningDegrees,180);assert.deepEqual(cabinet.cornerDoorDesign.openingSweepDegrees,{west:-180,south:180});
 const park=cabinet.cornerDoorDesign.operatingChair;assert.deepEqual([park.id,park.cx,park.cy,park.relativeMm],['family-f27',3420,12080,[482.5,335]]);assert.deepEqual([cabinet.cx+park.relativeMm[0],cabinet.cy+park.relativeMm[1]],[3420,12080]);assert.equal(park.temporary,true);assert.equal(park.ownerConfirmed,true);
 assert.deepEqual(cabinet.cabinetDesign.layoutAdaptations.cornerStorage.operatingChair,park);
 const countertop=cabinet.parts.find(q=>q.id==='reference-west-central-countertop'),counter=bounds(partSolid(cabinet,countertop));assert.deepEqual([counter.x,counter.y,counter.w,counter.d,counter.z+counter.h],[2125,10200,400,2530,850]);
 const niche=cabinet.parts.find(q=>q.id==='reference-west-central-niche-back');assert.deepEqual([cabinet.cx+niche.x,cabinet.cy+niche.y,niche.w,niche.d,niche.elevationMm,niche.heightMm],[2125,10200,18,2530,850,650]);
 const drawers=cabinet.parts.filter(q=>q.role==='drawer-front');assert.equal(drawers.length,3);for(const q of drawers){const b=bounds(partSolid(cabinet,q));approx(b.y,12331.5,'south 400mm drawer location');approx(b.d,397,'3mm drawer gap');assert.equal(q.maxExtensionMm,250);}
 const drawerMeta=cabinet.cabinetDesign.layoutAdaptations.drawerColumn;assert.deepEqual([drawerMeta.yStartMm,drawerMeta.yEndMm,drawerMeta.widthMm],[12330,12730,400]);
 for(const q of cabinet.parts.filter(q=>q.role==='door-sliding'&&q.id.startsWith('reference-west-central'))){const b=bounds(partSolid(cabinet,q));assert.ok(b.y>=10200&&b.y+b.d<=12330+tol,'closed sliding fronts occupy north of drawers');}
 const chair=byId.get('family-f27'),parked={...clone(chair),cx:park.cx,cy:park.cy},extended=drawers.map(q=>partSolid(cabinet,{...q,x:q.x+q.maxExtensionMm}));
 assert.ok(extended.some(s=>solidOverlap(s,furnitureSolid(chair))),'south eating chair explicitly blocks full drawer extension');assert.ok(extended.every(s=>!solidOverlap(s,furnitureSolid(parked))),'existing temporary eastward chair parking clears south drawers');
 const {auditCorner180Sweeps}=require('./family-corner-door-180-20261012.cjs');
 assert.throws(()=>auditCorner180Sweeps(p,cabinet),/other-furniture family-f27/,'retain eating chair as explicit 180-degree pantry obstruction');
 const operation=clone(p);Object.assign(operation.defaultFurniture.find(q=>q.id===chair.id),{cx:park.cx,cy:park.cy});
 const cornerSweep=auditCorner180Sweeps(operation,operation.defaultFurniture.find(q=>q.id===CABINET));
 const machineBands=[];
 for(const[i,type]of APPLIANCES.entries()){
  const f=byId.get('family-sideboard-'+type),previous=oldById.get(f.id),point=byId.get('family-elec-p'+(19+i)),previousPoint=oldById.get(point.id),b=bounds(furnitureSolid(f));
  assert.deepEqual([f.cx,f.cy,f.rot,f.w,f.d,f.heightMm,f.elevationMm],[previous.cx,previous.cy+1000,previous.rot,previous.w,previous.d,previous.heightMm,850]);checkFootprint(f);
  assert.equal(f.supportFurnitureId,CABINET);assert.equal(f.supportPartId,countertop.id);assert.ok(b.x>=counter.x&&b.x+b.w<=counter.x+counter.w&&b.y>=counter.y&&b.y+b.d<=counter.y+counter.d,'machine sits fully on the actual shorter counter '+f.id);assert.equal(b.z,850);machineBands.push([b.y,b.y+b.d]);
  assert.deepEqual([point.cx,point.cy,point.elevationMm,point.rot],[previousPoint.cx,previousPoint.cy+1000,previousPoint.elevationMm,previousPoint.rot]);checkFootprint(point);checkMount(p,point);
  assert.equal(point.electricalDesign.anchor.partId,niche.id);assert.deepEqual(point.electricalDesign.servedFurnitureIds,[f.id]);assert.equal(f.applianceDesign.notPurchasedModel,true);assert.equal(f.applianceDesign.notInstallationApproval,true);
  for(const q of cabinet.parts)assert.equal(solidOverlap(furnitureSolid(f),partSolid(cabinet,q)),false,'machine does not penetrate real board '+f.id+'/'+q.id);
 }
 assert.deepEqual([Math.min(...machineBands.map(q=>q[0])),Math.max(...machineBands.map(q=>q[1]))],[10340,12180]);assert.equal(counter.y+counter.d-Math.max(...machineBands.map(q=>q[1])),550);
 const obstacles=p.defaultFurniture.filter(f=>f.id!=='family-f6'&&f.type!=='rug').flatMap(f=>f.parts?.length?f.parts.map(q=>({id:f.id+'/'+q.id,solid:partSolid(f,q)})):[{id:f.id,solid:furnitureSolid(f)}]);
 obstacles.push(...p.WALLS.map((w,i)=>({id:'wall-'+i,solid:rect((w[0]+w[2])/2,(w[1]+w[3])/2,w[2]-w[0],w[3]-w[1])})));
 for(const o of obstacles)assert.equal(solidOverlap(furnitureSolid(sofa),o.solid),false,'new sofa intersects fixed solid '+o.id);
 for(const[id,expected]of Object.entries(sourceSnapshotHashes)){const raw=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),expected,id+' immutable imported source');}
 for(const id of['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+' frozen other scheme');assert.deepEqual(bundle.schemes[id],oldBundle.schemes[id]);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 const disclosure=JSON.stringify({u,conditions:p.metadata.conditions.slice(old.metadata.conditions.length),cabinet:  cabinet.conditions,sofa:sofa.notes});assert.match(disclosure,/斜|oblique/i);assert.match(disclosure,/待核|核验|概念|pending/i);
 assert.equal(hash(applyFamilyLivingEast(clone(oldBundle))),inputHash,'exact deterministic reapplication');assert.equal(hash(applyFamilyLivingEast(JSON.parse(JSON.stringify(oldBundle)))),inputHash,'serialized deterministic reapplication');assert.equal(hash(beforeFamilyLivingEast(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized exact rollback');assert.throws(()=>applyFamilyLivingEast(clone(bundle)),/already|applied|duplicate/i,'double apply rejected');assert.equal(hash(bundle),inputHash,'test is read-only');
 return{status:'PASS',revision:REVISION,scheme:'family',objectsBefore:121,objectsAfter:120,changedObjects:CHANGED.length,removedObjects:[BACK],sourceArchitectureOtherSchemesAndHistoricalMetadataExact:true,sofaWorldBoundsMm:[5770,6820,6750,9230],sofaCabinetAirconGapMm:20,P15NominalGapMm:27,balconyDoorNominalGapMm:370,cabinetNorthRetreatMm:1000,cabinetOuterEnvelopeMm:[1625,4290],centralCounterLengthMm:2530,southDrawerMm:[12330,12730],southCornerWorldGeometryUnchanged:true,cornerSweep,allFiveAppliancesAndPointsSupported:true,solidObstacles:obstacles.length,constructionAndElectricalApproval:false};
}
module.exports={verifyFamilyLivingEast,beforeFamilyLivingEast,baseline,REVISION,solidOverlap,furnitureSolid,partSolid};
if(require.main===module)console.log(JSON.stringify(verifyFamilyLivingEast(require(path.join(root,'data/house-plans.js'))),null,2));
