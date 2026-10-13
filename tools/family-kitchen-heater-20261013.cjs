'use strict';

// Owner-supplied Macro reference photos/dimension diagram. Only the visible
// BODY dimensions are adopted. No pipe routing, appliance installation,
// product purchase, rated outlet or gas/flue connection is approved here.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const REVISION='family-kitchen-heater-20261013',HEATER_ID='kitchen_heater',clone=structuredClone;
const META_KEYS=['conditions','designCorrections','converter'];
const changed=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&!isDeepStrictEqual(a[k],b[k])).sort();
const REFERENCE_MODEL='JSLQ27-16U10ULTRA(F)';
const RAW_DIAGRAM_DIMENSIONS=Object.freeze({overallHeight:598.5,frontHeight:542.2,bracketHeight:571.5});
const CONDITIONS=[
  '本版仅方案2厨房热水器按业主提供参考图改为万家乐 JSLQ27-16U10ULTRA(F) 外观及机身340×190×525mm；购买/现场已安装均未确认，参考不是施工批准。',
  '340×190×525mm仅机身外壳尺寸；参考图598.5、542.2、571.5mm原始标注各保留，不将其当作已验证安装总高、接管净空或替代机身高度。烟管、阀件、软硬管、插头、挂架和检修另需核验。',
  '机身背面仍贴厨房东墙x8290，朝西，中心y11535、底高1320保持；深度190对应中心x8195。机身北边11365至厨房/阳台共墙室内边11270仅95mm模型间隔，不能据此判定满足厂家边距、散热或安装要求。',
  '参考图排烟接口直径60mm只作为可见短接口环参考；短环高度、底部三接口位置/尺寸为视觉示意，不画实际烟管、进排水/燃气管、外墙孔或连接到原设施。',
  '资料底部接口间距存在223.9与233.9mm冲突，保留待核，不用任何一值落地配管。挂架、机身与接口尺寸应由厂家正式安装图/实物核对，实际接管必须由具备相应资质的安装人员完成。',
  '厨房P27电源用途点及其他120物件不改；参考热水器不自动确认插座额定电流、防护等级、接地、漏电保护、线径或独立回路。厂家安装条件、排烟/通风、燃气、电气及涉水安全审查均未完成。'
];
function rect(f){
  const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),
    d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));
  return{x:f.cx-w/2,y:f.cy-d/2,w,d,z:f.elevationMm||0,h:f.heightMm};
}
function partRect(f,q){
  const a=(f.rot||0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),x=q.x+q.w/2,y=q.y+q.d/2,
    w=Math.abs(q.w*ca)+Math.abs(q.d*sa),d=Math.abs(q.w*sa)+Math.abs(q.d*ca);
  return{x:f.cx+x*ca-y*sa-w/2,y:f.cy+x*sa+y*ca-d/2,w,d,z:(f.elevationMm||0)+(q.elevationMm||0),h:q.heightMm};
}
function overlaps(a,b){return ['x','y','z'].every((k,i)=>
  Math.min(a[k]+a[['w','d','h'][i]],b[k]+b[['w','d','h'][i]])-Math.max(a[k],b[k])>.001);}
function verifyBody(p,f){
  const b=rect(f),r=p.ROOMS.find(q=>q.id==='kitchen');assert.ok(r);
  const xs=r.poly.map(q=>q[0]),ys=r.poly.map(q=>q[1]);
  assert.ok(b.x>=Math.min(...xs)&&b.x+b.w<=Math.max(...xs)&&b.y>=Math.min(...ys)&&b.y+b.d<=Math.max(...ys));
  assert.ok(b.z>=0&&b.z+b.h<=r.heightMm);
  [b.x,b.y,b.w,b.d,b.z,b.h].forEach((n,i)=>assert.ok(Math.abs(n-[8100,11365,190,340,1320,525][i])<1e-7,'Body dimensions retained exactly within trig roundoff'));
  assert.equal(b.x+b.w,8290,'Rear face remains on original east interior wall');
  const wall=p.WALLS.find(w=>w[0]===8290&&w[1]===11150&&w[2]===8410&&w[3]===13950);
  assert.ok(wall,'The original east wall supports the retained position');
  for(const w of p.WALLS)assert.equal(overlaps(b,{x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1],z:0,h:2790}),false,'Body enters an unchanged wall');
  for(const old of p.defaultFurniture){
    if(old.id===HEATER_ID)continue;
    const solids=old.parts?.length?old.parts.map(q=>partRect(old,q)):[rect(old)];
    for(const solid of solids)assert.equal(overlaps(b,solid),false,'Heater body intersects unchanged solid '+old.id);
  }
  const p27=p.defaultFurniture.find(q=>q.id==='family-elec-p27');assert.ok(p27);
  assert.equal(overlaps(b,rect(p27)),false,'P27 remains outside reference body');
}
function applyFamilyKitchenHeater(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyElectricalUpdate,'Apply after electrical concept');
  assert.ok(!p.metadata.familyKitchenHeaterUpdate,'Reference heater layer already applied');
  assert.equal(p.defaultFurniture.length,121);
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const f=p.defaultFurniture.find(q=>q.id===HEATER_ID);assert.ok(f);
  assert.deepEqual([f.w,f.d,f.heightMm,f.cx,f.cy,f.rot,f.elevationMm],[330,205,530,8187.5,11535,90,1320]);
  const previousFurniture=[clone(f)],previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  Object.assign(f,{
    name:'万家乐参考燃气热水器 · '+REFERENCE_MODEL+'（购买待确认）',
    w:340,d:190,heightMm:525,cx:8195,cy:11535,rot:90,elevationMm:1320,
    baseWidthMm:340,baseDepthMm:190,baseHeightMm:525,face:'west',roomId:'kitchen',
    color:'#F7F4EC',modelVariant:'macro-gas-waterheater',layoutRevision:REVISION,
    dimensionStatus:'reference-image-body-size-installation-unverified',
    sourceFootprintMm:{x:8100,y:11365,w:190,d:340},
    installationApproved:false,notConstructionApproval:true,
    notes:CONDITIONS.join(' '),conditions:[...CONDITIONS],
    heaterDesign:{revision:REVISION,brand:'Macro / 万家乐',referenceModel:REFERENCE_MODEL,
      referenceImages:['IMG_0315','IMG_0316'],purchaseConfirmed:false,installedConfirmed:false,
      bodyDimensionsMm:{width:340,depth:190,height:525},dimensionsApplyTo:'body-only',
      bodyDimensionSource:'owner-provided-reference-image',referenceNotMeasurement:true,
      rawReferenceDiagramDimensionsMm:clone(RAW_DIAGRAM_DIMENSIONS),rawDiagramDimensionsUninterpreted:true,
      installedOverallHeightMm:null,installedEnvelopeConfirmed:false,
      appearance:{bodyColor:'#F7F4EC',frontDisplayColor:'#252B2B',displayVisualOnly:true,brandVisualOnly:true},
      flueCollar:{diameterMm:60,diameterStatus:'reference-diagram',stubHeightMm:null,
        visualStubOnly:true,connectionConfirmed:false,fullFlueModeled:false,wallHoleModeled:false},
      bottomPorts:{count:3,visualOnly:true,spacingConflictMm:[223.9,233.9],spacingStatus:'unresolved-reference-conflict',
        spacingUsedForPlumbing:false,connectionSizesConfirmed:false,connectionPositionsConfirmed:false},
      visualAttachmentsOutsideBody:true,attachmentProjectionException:'visual-collar-and-port-stubs-only-not-installed-envelope',
      actualPipesModeled:false,connectionsConfirmed:false,installationApproved:false,manufacturerClearancesConfirmed:false,
      gasConnectionsConfirmed:false,waterConnectionsConfirmed:false,
      flueConnectionsConfirmed:false,wiringModeled:false,wiringInstalled:false,
      mounting:{wall:'east',face:'west',rearPlaneMm:8290,bodyBottomMm:1320,bodyTopMm:1845,
        bodyPlanRectMm:[8100,11365,8290,11705],northSideNominalGapMm:95,
        originalPositionHeightRetained:true,manufacturerClearancesConfirmed:false,
        mountingBracketConfirmed:false,installationApproved:false},
      electricity:{existingPointId:'family-elec-p27',pointUnchanged:true,ratingAmps:null,ipRating:null,
        groundingConfirmed:false,protectiveMeasuresConfirmed:false,circuitConfirmed:false},
      safety:{requiresManufacturerAndQualifiedInstallerReview:true,installationApproved:false,
        combustionAirConfirmed:false,flueRouteConfirmed:false,gasSuitabilityConfirmed:false}
    }
  });
  verifyBody(p,f);
  p.metadata.conditions=[...(p.metadata.conditions||[]),...CONDITIONS];
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{
    id:REVISION,date:'2026-10-13',sourceIds:[HEATER_ID],sourceSnapshotsUnchanged:true,
    description:'仅方案2厨房热水器按业主参考更新机身340×190×525mm和万家乐外观，保持东墙西向及原底高；接口间距冲突、烟管/接管与安装条件待核，其他120物件及P27不改。'
  }];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-kitchen-heater-20261013.cjs';
  p.metadata.familyKitchenHeaterUpdate={id:REVISION,date:'2026-10-13',title:'方案2 · 万家乐参考热水器机身及外观',
    status:'reference-images-body-only-installation-pending',sourceSnapshotsUnchanged:true,architectureUnchanged:true,
    other120FurnitureUnchanged:true,referenceModel:REFERENCE_MODEL,purchaseConfirmed:false,installedConfirmed:false,
    bodyDimensionsMm:[340,190,525],dimensionsApplyTo:'body-only',
    rawReferenceDiagramDimensionsMm:clone(RAW_DIAGRAM_DIMENSIONS),rawDiagramDimensionsUninterpreted:true,
    portSpacingConflictMm:[223.9,233.9],portSpacingStatus:'unresolved-reference-conflict',
    flueNeckDiameterMm:60,flueStubHeightMm:null,visualAttachmentsOnly:true,
    visualAttachmentProjectionException:'body-only-selection-excludes-concept-collar-and-port-stubs',
    actualPipesModeled:false,fullFlueModeled:false,wallHolesModeled:false,wiringModeled:false,wiringInstalled:false,
    installationApproved:false,connectionsConfirmed:false,manufacturerClearancesConfirmed:false,
    northSideNominalGapMm:95,existingElectricalPointId:'family-elec-p27',existingElectricalPointUnchanged:true,
    previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(q=>q.id),previousMetadataFields,
    previousPlanFields:{},changedFurnitureIds:[HEATER_ID],newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],
    migrationFields:{[HEATER_ID]:changed(previousFurniture[0],f)}
  };
  assert.equal(p.defaultFurniture.length,121);
  for(const old of previous.defaultFurniture)if(old.id!==HEATER_ID)
    assert.deepEqual(p.defaultFurniture.find(q=>q.id===old.id),old,'Unrelated object changed '+old.id);
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  for(const key of Object.keys(previous.metadata))if(!META_KEYS.includes(key))assert.deepEqual(p.metadata[key],previous.metadata[key],'Historical metadata changed '+key);
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized scheme edit');
  assert.deepEqual(beforeFamilyKitchenHeater(p),previous,'Reference heater layer exact undo');
  return bundle;
}
function beforeFamilyKitchenHeater(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyKitchenHeaterUpdate;
  if(!m)return out;
  const old=new Map(m.previousFurniture.map(q=>[q.id,q])),current=new Map(p.defaultFurniture.map(q=>[q.id,q]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyKitchenHeaterUpdate;return out;
}
module.exports={applyFamilyKitchenHeater,beforeFamilyKitchenHeater,REVISION};
