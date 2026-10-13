'use strict';

// Independently frozen published electrical plan. This test validates only
// the reference appliance's appearance/body and preserved design boundaries,
// never gas, flue, plumbing, electrical or structural installation approval.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {applyFamilyKitchenHeater,beforeFamilyKitchenHeater,REVISION}=require('../tools/family-kitchen-heater-20261013.cjs');
const root=path.resolve(__dirname,'..'),clone=structuredClone;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Frozen independently from 7f96521b32f2d31ba399819a5b9b07972c303638.
const baseline=Object.freeze({
 wood:'49de0aa382c1a9be11f79edf8eacda3e77f4e4dd1e0c12b26f782991077c41ad',
 family:'3f1397a09bfa3b348900d6415b11c90f0293ccf70db2f2d2def34307cd5393f0',
 laundry:'b23446e8581aae1364bba7f9901ad23d3de4874ad33c7a906b3e02ae3597e2eb',
 screen:'fae5b5e241c3cdb3d6f48079442d6fcc9aef09998088106f48ce3aac2c4b63f0'
});
const sourceSnapshotHashes=Object.freeze({
 wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',
 family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',
 laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce',
 'screen-confirmed-20261010':'7708f6184494daf0188a1d5e74e4ed62806a85876a7c24432a29538b24588bbb'
});
const rad=d=>d*Math.PI/180;
const transform=(x,y,cx,cy,a)=>[cx+x*Math.cos(a)-y*Math.sin(a),cy+x*Math.sin(a)+y*Math.cos(a)];
function rect(cx,cy,w,d,a=0,z=0,h=2700){return{poly:[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,y])=>transform(x,y,cx,cy,a)),z,h};}
function furnitureSolid(f){return rect(f.cx,f.cy,f.w,f.d,rad(f.rot||0),f.elevationMm||0,f.heightMm||700);}
function partSolid(f,p){const a=rad(f.rot||0),[x,y]=transform(p.x+p.w/2,p.y+p.d/2,f.cx,f.cy,a);return rect(x,y,p.w,p.d,a,(f.elevationMm||0)+(p.elevationMm||0),p.heightMm);}
function polygonOverlap(a,b){
 for(const poly of[a,b])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],v=[p[1]-q[1],q[0]-p[0]],n=Math.hypot(...v),axis=v.map(x=>x/n),project=p=>p[0]*axis[0]+p[1]*axis[1],aa=a.map(project),bb=b.map(project);
  if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=.001)return false;
 }
 return true;
}
function solidOverlap(a,b){return Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z)>.001&&polygonOverlap(a.poly,b.poly);}
const approx=(a,b,label)=>assert.ok(Math.abs(a-b)<.001,label+': '+a+' vs '+b);

function verifyFamilyKitchenHeater(bundle){
 const originalHash=hash(bundle),p=bundle.schemes.family,u=p.metadata.familyKitchenHeaterUpdate,oldBundle=beforeFamilyKitchenHeater(bundle),old=oldBundle.schemes.family;
 assert.equal(REVISION,'family-kitchen-heater-20261013');assert.equal(u?.id,REVISION);
 assert.equal(hash(old),baseline.family,'exact independently frozen 121-object published electrical model');
 assert.equal(hash(beforeFamilyKitchenHeater(p)),baseline.family,'plan-only exact undo');assert.equal(hash(beforeFamilyKitchenHeater(old)),baseline.family,'absent layer is inert');
 assert.equal(old.defaultFurniture.length,121);assert.equal(p.defaultFurniture.length,121);assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,121);
 assert.deepEqual(p.defaultFurniture.map(f=>f.id),old.defaultFurniture.map(f=>f.id),'no new/removed/reordered objects');
 assert.deepEqual(u.changedFurnitureIds,['kitchen_heater']);for(const k of['newFurnitureIds','removedFurnitureIds','replacedFurnitureIds'])assert.deepEqual(u[k],[],k+' must not conceal additional work');
 const heater=p.defaultFurniture.find(f=>f.id==='kitchen_heater'),previous=old.defaultFurniture.find(f=>f.id==='kitchen_heater');
 assert.deepEqual(u.previousFurniture,[previous],'exact one-object archive');assert.deepEqual(u.previousFurnitureOrder,old.defaultFurniture.map(f=>f.id));assert.deepEqual(u.previousPlanFields,{});
 assert.deepEqual(p.defaultFurniture.filter(f=>f.id!==heater.id),old.defaultFurniture.filter(f=>f.id!==heater.id),'all other 120 objects exact');
 for(const key of Object.keys(old))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],old[key],'architecture/source/display field exact '+key);
 for(const key of Object.keys(old.metadata))if(!['conditions','designCorrections','converter'].includes(key))assert.deepEqual(p.metadata[key],old.metadata[key],'historical metadata exact '+key);
 assert.deepEqual(p.metadata.conditions.slice(0,old.metadata.conditions.length),old.metadata.conditions);assert.deepEqual(p.metadata.designCorrections.slice(0,-1),old.metadata.designCorrections);assert.equal(p.metadata.designCorrections.at(-1).id,REVISION);
 assert.equal(u.sourceSnapshotsUnchanged,true);assert.equal(u.architectureUnchanged,true);assert.equal(u.installationApproved,false);assert.equal(u.purchaseConfirmed,false);
 assert.equal(u.referenceModel,'JSLQ27-16U10ULTRA(F)');assert.deepEqual(u.bodyDimensionsMm,[340,190,525]);
 assert.deepEqual(u.rawReferenceDiagramDimensionsMm,{overallHeight:598.5,frontHeight:542.2,bracketHeight:571.5});
 assert.deepEqual(u.portSpacingConflictMm,[223.9,233.9]);assert.equal(u.flueNeckDiameterMm,60);
 assert.equal(heater.type,'waterheater');assert.equal(heater.sourceId,'kitchen_heater');assert.equal(heater.modelVariant,'macro-gas-waterheater');assert.equal(heater.face,'west');assert.equal(heater.layoutRevision,REVISION);
 assert.deepEqual([heater.cx,heater.cy,heater.w,heater.d,heater.heightMm,heater.elevationMm,heater.rot],[8195,11535,340,190,525,1320,90],'body dimensions and preserved wall-side placement');
 assert.notEqual(heater.heightMm,u.rawReferenceDiagramDimensionsMm.overallHeight,'525 is the body, not an incorrectly certified complete installation height');
 const s=furnitureSolid(heater),xs=s.poly.map(q=>q[0]),ys=s.poly.map(q=>q[1]);
 approx(Math.min(...xs),8100,'body front west plane');approx(Math.max(...xs),8290,'body back flush with existing east wall');approx(Math.min(...ys),11365,'body north edge');approx(Math.max(...ys),11705,'body south edge');
 assert.deepEqual(Object.keys(heater.sourceFootprintMm).sort(),['d','w','x','y']);
 for(const[k,v]of Object.entries({x:8100,y:11365,w:190,d:340}))approx(heater.sourceFootprintMm[k],v,'rotated body footprint '+k);
 const design=heater.heaterDesign;assert.ok(design,'reference appearance and connection provenance must be separate from body geometry');assert.equal(design.connectionsConfirmed,false);
 assert.deepEqual(design.bodyDimensionsMm,{width:340,depth:190,height:525});assert.equal(design.purchaseConfirmed,false);assert.equal(design.installationApproved,false);assert.equal(design.referenceModel,u.referenceModel);
 assert.equal(design.dimensionsApplyTo,'body-only');assert.equal(design.referenceNotMeasurement,true);assert.equal(design.bodyDimensionSource,'owner-provided-reference-image');
 assert.deepEqual(design.referenceImages,['IMG_0315','IMG_0316']);assert.deepEqual(design.rawReferenceDiagramDimensionsMm,u.rawReferenceDiagramDimensionsMm);assert.equal(design.rawDiagramDimensionsUninterpreted,true);
 assert.equal(design.installedOverallHeightMm,null);assert.equal(design.installedEnvelopeConfirmed,false);assert.equal(design.visualAttachmentsOutsideBody,true);assert.match(design.attachmentProjectionException,/visual.*not-installed/);
 assert.equal(design.flueCollar.diameterMm,60);assert.equal(design.flueCollar.stubHeightMm,null);assert.equal(design.flueCollar.visualStubOnly,true);assert.equal(design.flueCollar.connectionConfirmed,false);assert.equal(design.flueCollar.fullFlueModeled,false);assert.equal(design.flueCollar.wallHoleModeled,false);
 assert.equal(design.bottomPorts.count,3);assert.equal(design.bottomPorts.visualOnly,true);assert.deepEqual(design.bottomPorts.spacingConflictMm,[223.9,233.9]);assert.equal(design.bottomPorts.spacingStatus,'unresolved-reference-conflict');assert.equal(design.bottomPorts.spacingUsedForPlumbing,false);assert.equal(design.bottomPorts.connectionSizesConfirmed,false);assert.equal(design.bottomPorts.connectionPositionsConfirmed,false);
 for(const k of['actualPipesModeled','manufacturerClearancesConfirmed','gasConnectionsConfirmed','waterConnectionsConfirmed','flueConnectionsConfirmed','wiringModeled','wiringInstalled','installedConfirmed'])assert.equal(design[k],false,'reference cannot approve '+k);
 assert.deepEqual(design.mounting.bodyPlanRectMm,[8100,11365,8290,11705]);assert.equal(design.mounting.bodyBottomMm,1320);assert.equal(design.mounting.bodyTopMm,1845);assert.equal(design.mounting.rearPlaneMm,8290);
 assert.equal(design.mounting.northSideNominalGapMm,95);approx(11365-11270,design.mounting.northSideNominalGapMm,'nominal common-wall-body gap not manufacturer clearance');assert.equal(design.mounting.manufacturerClearancesConfirmed,false);assert.equal(design.mounting.mountingBracketConfirmed,false);assert.equal(design.mounting.installationApproved,false);
 assert.equal(design.electricity.existingPointId,'family-elec-p27');assert.equal(design.electricity.pointUnchanged,true);assert.equal(design.electricity.ratingAmps,null);assert.equal(design.electricity.ipRating,null);
 for(const k of['groundingConfirmed','protectiveMeasuresConfirmed','circuitConfirmed'])assert.equal(design.electricity[k],false);
 for(const k of['actualPipesModeled','fullFlueModeled','wallHolesModeled','wiringModeled','wiringInstalled','connectionsConfirmed','manufacturerClearancesConfirmed','installedConfirmed'])assert.equal(u[k],false,'layer leaves '+k+' unverified');
 const disclosure=JSON.stringify({u,heater,conditions:p.metadata.conditions.slice(old.metadata.conditions.length)});
 for(const pattern of[/223\.9/,/233\.9/,/冲突|conflict/i,/525/,/598\.5/,/542\.2/,/571\.5/,/95/,/待核|pending/i,/不是.*(施工|安装)|不.*施工|notConstructionApproval|installationApproved/i,/机身|body/i,/接口|port/i,/烟|flue/i,/示意|visual|display/i,/照片|photo|reference/i])assert.match(disclosure,pattern,'unresolved/body-only reference disclosure '+pattern);
 assert.ok(!/"purchaseConfirmed":true/.test(disclosure),'a photo is not evidence of purchase');assert.ok(!/"connectionsConfirmed":true/.test(disclosure),'visible attachment symbols are not actual connections');
 const electrical=p.defaultFurniture.find(f=>f.id==='family-elec-p27');assert.deepEqual(electrical,old.defaultFurniture.find(f=>f.id==='family-elec-p27'),'heater appearance change cannot silently recertify or move P27');
 assert.equal(electrical.electricalDesign.ratingAmps,null);assert.equal(electrical.electricalDesign.ipRating,null);assert.equal(electrical.electricalDesign.installationApproved,false);assert.equal(electrical.electricalDesign.wiringModeled,false);
 const changedKeys=[...new Set([...Object.keys(previous),...Object.keys(heater)])].filter(k=>k!=='id'&&JSON.stringify(previous[k])!==JSON.stringify(heater[k]));
 assert.deepEqual(Object.keys(u.migrationFields),['kitchen_heater']);assert.deepEqual(u.migrationFields.kitchen_heater.slice().sort(),changedKeys.slice().sort(),'migration lists every changed field but no unrelated object');
 // Check against real old cabinet components (not solid enclosing niche
 // boxes); the visible body may touch its wall but not penetrate it.
 const obstacles=old.defaultFurniture.filter(f=>f.id!==heater.id).flatMap(f=>f.parts?.length?f.parts.map(q=>({id:f.id+'/'+q.id,solid:partSolid(f,q)})):[{id:f.id,solid:furnitureSolid(f)}]);
 obstacles.push(...old.WALLS.map((w,i)=>({id:'wall-'+i,solid:rect((w[0]+w[2])/2,(w[1]+w[3])/2,w[2]-w[0],w[3]-w[1])})));
 for(const o of obstacles)assert.equal(solidOverlap(s,o.solid),false,'new heater body intersects unchanged fixed solid '+o.id);
 assert.ok(obstacles.some(o=>o.id.startsWith('wall-')&&solidOverlap(furnitureSolid({...heater,cx:heater.cx+5}),o.solid)),'negative control rejects a body buried 5 mm in the wall');
 for(const[id,expectedHash]of Object.entries(sourceSnapshotHashes)){const bytes=fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expectedHash,id+' immutable source snapshot');}
 for(const id of['wood','laundry','screen']){assert.equal(hash(bundle.schemes[id]),baseline[id],id+' full frozen plan exact');assert.deepEqual(oldBundle.schemes[id],bundle.schemes[id]);assert.equal(bundle.schemes[id].metadata.familyKitchenHeaterUpdate,undefined);}
 for(const key of Object.keys(bundle))if(key!=='schemes')assert.deepEqual(bundle[key],oldBundle[key]);
 assert.equal(hash(applyFamilyKitchenHeater(clone(oldBundle))),originalHash,'deterministic exact reapplication');assert.equal(hash(applyFamilyKitchenHeater(JSON.parse(JSON.stringify(oldBundle)))),originalHash,'serialized deterministic reapplication');
 assert.equal(hash(beforeFamilyKitchenHeater(JSON.parse(JSON.stringify(bundle))).schemes.family),baseline.family,'serialized exact undo');assert.throws(()=>applyFamilyKitchenHeater(clone(bundle)),/already|applied|duplicate/i,'double applying layer rejected');assert.equal(hash(bundle),originalHash,'verification is read-only');
 return{status:'PASS',revision:REVISION,scheme:'family',objectsBefore:121,objectsAfter:121,onlyChangedObject:'kitchen_heater',other120Exact:true,architectureSourceAndOtherSchemesExact:true,bodyDimensionsMm:[340,190,525],referenceModel:u.referenceModel,purchaseNotConfirmed:true,portSpacingConflictMm:u.portSpacingConflictMm,referenceDiagramNotInstalledEnvelope:true,P27UnchangedAndUnapproved:true,solidObstacles:obstacles.length,actualGasFluePlumbingAndElectricalConnectionsUnverified:true};
}
module.exports={verifyFamilyKitchenHeater,beforeFamilyKitchenHeater,baseline,REVISION,solidOverlap,furnitureSolid,partSolid};
if(require.main===module)console.log(JSON.stringify(verifyFamilyKitchenHeater(require(path.join(root,'data/house-plans.js'))),null,2));
