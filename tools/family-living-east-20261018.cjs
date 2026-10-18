'use strict';

// Current Scheme 2 layout only. The original import and all historical layer
// snapshots remain untouched. This leaf can be stripped without loading any
// earlier layer, so the historic before-chain can safely undo it first.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const {applySideboardReference}=require('./sideboard-reference.cjs');
const REVISION='family-living-east-20261018',DATE='2026-10-18';
const CABINET_ID='fit-dining_sideboard_wall',SOFA_ID='family-f6',BACK_ID='fit-sofa_back_storage';
const META_KEYS=['conditions','designCorrections','converter'],clone=structuredClone;
const APPLIANCE_TYPES=['blender','temperaturekettle','sterilizer','healthkettle','waterdispenser'];
const round=n=>Math.round(n*1000)/1000;
const changed=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&!isDeepStrictEqual(a[k],b[k])).sort();
const CONDITIONS=[
  '2026-10-18仅方案2沙发参考方案4转为背靠东墙、面朝西；电视仍在原北墙，形成斜向观看，未把电视或玻璃改成墙，也不称为沙发正对电视。',
  '已购VIMLE沙发机身2410×980×830mm不缩放；新中心(6260,8025)、旋转90°，背面落在原东墙室内面x6750。相比方案4参考位向南微调25mm，避免与原柜机占地重叠；原中部2000×250背柜移除。',
  '餐边柜从靠客厅飘台的北端缩短1000mm：北端y8600改9600，南端y13890及入户转角保持。西侧直臂4890改3890mm，总包1625×4290mm只是L柜外接框，不是实心储物间。',
  '不是把整柜或南转角压缩：18mm板件、3mm门缝、R60圆弧收口、240mm竖展示、200mm窄高柜、灯带及浅型转角库保留，中央台面/中空按2530mm重新分模块；柜高2700mm仍仅按模型屋顶。',
  '五台原暂估小家电及其P19–P23用途点随缩短后中空段重排，均仍落在850mm真实台面。尺寸、开盖、蒸汽/散热、负荷、独立回路、插头和检修仍待真实型号及合格安装人员核验；不构成运行或电气安装批准。',
  '南转角180°两面库门的世界轴线、层板、灯带及425mm返柜均保持；仍须先临时向东移南餐椅，先西门后南门，关闭反序。五金、门重、防夹、承重与现场净空尚未批准。',
  '400mm三层抽屉重排到中央台面最南段y12330–12730，北段改滑门，避免抽屉扫到固定餐桌；南餐椅在原用餐位仍有极小投影交叠，开抽前必须先临时收/移南椅，不能把250mm概念行程当作免移椅取物或通行认证。',
  '原东墙低位备用电源P17在新沙发背后被遮，随布局移至同一墙面中心y9420，暂估中心高300mm及用途保持；这只是可见面板几何避让，线缆、暗盒、回路、负荷与电气保护仍待合格电工核验。'
];
function footprint(f){
  const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));
  return {x:round(f.cx-w/2),y:round(f.cy-d/2),w:round(w),d:round(d)};
}
function worldPart(f,q){
  assert.equal(f.rot||0,0);return {...clone(q),x:round(q.x+f.cx),y:round(q.y+f.cy),
    ...(q.cabinetDoor?{cabinetDoor:{...clone(q.cabinetDoor),hingeMm:q.cabinetDoor.hingeMm.map((n,i)=>round(n+[f.cx,f.cy][i]))}}:{})};
}
function relativePart(q,cx,cy){
  return {...clone(q),x:round(q.x-cx),y:round(q.y-cy),
    ...(q.cabinetDoor?{cabinetDoor:{...clone(q.cabinetDoor),hingeMm:q.cabinetDoor.hingeMm.map((n,i)=>round(n-[cx,cy][i]))}}:{})};
}
function shortenedStraight(f){
  // Reuse the real reference's modular board generator on a temporary source.
  // No historical source snapshot is edited and no old board is scaled.
  const tmp={defaultFurniture:[{...clone(f),parts:[]}],metadata:{}};
  const source={storageFitouts:[{id:'dining_sideboard_wall',parts:[{
    id:'reference-short-west-base',role:'sideboard_base',face:'east',
    x:212.5,y:960,w:40,d:389,hCm:85,zCm:0
  }]}]};
  applySideboardReference(tmp,source);
  const result=tmp.defaultFurniture[0];
  // The last 760mm belongs to the original connected corner, not to the
  // reference generator's stand-alone south tall cabinet and slatted filler.
  const parts=result.parts.filter(q=>!q.id.startsWith('reference-west-left-tall')&&!q.id.startsWith('reference-west-left-grille'));
  // Move the complete 400mm drawer stack to the south end. Reflection is only
  // along the counter length: east-facing fronts, panel thickness, track depths
  // and the three drawer heights do NOT change. Upper cabinets/lights stay put.
  const lo=10200-f.cy,hi=12730-f.cy;
  for(const q of parts){
    const base=q.id.startsWith('reference-west-central-')&&q.elevationMm<832&&
      ['drawer-front','drawer-box','door-sliding','cabinet-divider','cabinet-shelf'].includes(q.role);
    if(!base)continue;
    q.y=round(lo+hi-q.y-q.d);
    if(q.role==='drawer-front'){
      q.placement='south-conditional-chair-clearance';
      q.label='奶白三层餐具抽屉 · 最大拉出250mm，先临时移南椅';
    }
  }
  result.cabinetDesign.layoutAdaptations.drawerColumn={yStartMm:12330,yEndMm:12730,widthMm:400,maxExtensionMm:250};
  return {parts,design:clone(result.cabinetDesign)};
}
function shiftRelativeChair(chair,oldF,newF){
  const out=clone(chair);out.relativeMm=[round(out.cx-newF.cx),round(out.cy-newF.cy)];return out;
}
function moveAppliancesAndPoints(p,cabinet){
  const moved=[];
  for(const [i,type]of APPLIANCE_TYPES.entries()){
    const f=p.defaultFurniture.find(q=>q.id==='family-sideboard-'+type),point=p.defaultFurniture.find(q=>q.id==='family-elec-p'+(19+i));
    assert.ok(f?.applianceDesign&&point?.electricalDesign);
    f.cy+=1000;f.sourceFootprintMm=footprint(f);f.layoutRevision=REVISION;
    f.applianceDesign={...clone(f.applianceDesign),layoutRevision:REVISION,placementReason:'shorter-north-sideboard-run',
      supportTopMm:850,cabinetNicheTopMm:1500,supportPartId:'reference-west-central-countertop'};
    f.notes+=' 2026-10-18：为配合餐边柜北端缩短1000mm，沿真实850mm台面向南重排1000mm；机身尺寸与使用安全待核状态保持。';
    point.cy=f.cy;point.sourceFootprintMm=footprint(point);point.layoutRevision=REVISION;
    point.electricalDesign={...clone(point.electricalDesign),layoutRevision:REVISION,
      anchor:{...clone(point.electricalDesign.anchor),localCenterMm:[point.cx-cabinet.cx,point.cy-cabinet.cy,point.electricalDesign.centerHeightMm-(cabinet.elevationMm||0)],
        baseHostDimensionsMm:[cabinet.w,cabinet.d,cabinet.heightMm],hostRotationDegrees:cabinet.rot||0,
        surfaceVerifiedAgainstCurrentModel:true,cabinetBoxAndPenetrationPending:true}};
    point.notes+=' 2026-10-18：用途点随对应小家电向南重排1000mm，仍锚定餐边柜中空背板；原额定值、回路与保护未批准状态不变。';
    moved.push(f.id,point.id);
  }
  return moved;
}
function moveCoveredSparePoint(p){
  const f=p.defaultFurniture.find(q=>q.id==='family-elec-p17');assert.ok(f?.electricalDesign);
  assert.deepEqual([f.cx,f.cy,f.electricalDesign.centerHeightMm],[6746,7100,300]);
  f.cy=9420;f.sourceFootprintMm=footprint(f);f.layoutRevision=REVISION;
  f.electricalDesign={...clone(f.electricalDesign),layoutRevision:REVISION,
    anchor:{...clone(f.electricalDesign.anchor),surfaceVerifiedAgainstCurrentModel:true},
    relocationReason:'avoid-new-east-wall-sofa-back'};
  f.notes+=' 2026-10-18：沙发靠东墙后将原低位备用点沿同一东墙移至y9420，避免藏在沙发后；高度、用途和未批准的电气状态保持。';
  return f.id;
}
function verify(p,f,original){
  assert.deepEqual([f.cx,f.cy,f.w,f.d,f.heightMm],[2937.5,11745,1625,4290,2700]);
  assert.equal(new Set(f.parts.map(q=>q.id)).size,f.parts.length);
  const counter=f.parts.find(q=>q.id==='reference-west-central-countertop');
  assert.deepEqual([f.cx+counter.x,f.cy+counter.y,counter.w,counter.d,counter.elevationMm+counter.heightMm],[2125,10200,400,2530,850]);
  for(const q of f.parts){
    assert.ok(q.x>=-f.w/2-.001&&q.y>=-f.d/2-.001&&q.x+q.w<=f.w/2+.001&&q.y+q.d<=f.d/2+.001,'Part within shorter envelope '+q.id);
    assert.ok(q.elevationMm>=0&&q.elevationMm+q.heightMm<=2700,'Part within original roof '+q.id);
    if(q.role==='led-strip'){
      const a=f.parts.find(a=>a.id===q.anchorPartId);assert.ok(a&&Math.abs(q.elevationMm+q.heightMm-a.elevationMm)<.001,'LED stays under real board '+q.id);
    }
  }
  for(const q of original.parts.filter(q=>q.id.startsWith('corner800-')||q.id.startsWith('corner-return-')))
    assert.deepEqual(worldPart(f,f.parts.find(n=>n.id===q.id)),worldPart(original,q),'South corner and return remain physically unchanged '+q.id);
  for(const type of APPLIANCE_TYPES){
    const a=p.defaultFurniture.find(q=>q.id==='family-sideboard-'+type),r=footprint(a);
    assert.ok(r.x>=2125&&r.x+r.w<=2525&&r.y>=10200&&r.y+r.d<=12730,'Supported appliance footprint '+a.id);
    assert.equal(a.elevationMm,850);assert.equal(a.supportPartId,counter.id);
  }
  for(let i=19;i<=23;i++){
    const a=p.defaultFurniture.find(q=>q.id==='family-elec-p'+i),r=footprint(a);
    assert.equal(r.x,2143);assert.ok(r.y>=10200&&r.y+r.d<=12730);assert.equal(a.electricalDesign.ratingAmps,null);
  }
  const drawer=f.parts.find(q=>q.role==='drawer-front'),drawY=f.cy+drawer.y;
  assert.deepEqual([drawY,drawer.d],[12331.5,397]);
  assert.ok(drawY>11700,'Drawers do not face the fixed dining table');
  const south=p.defaultFurniture.find(q=>q.id==='family-f27'),park=f.cornerDoorDesign.operatingChair;
  assert.deepEqual([south.cx,south.cy,park.cx,park.cy],[2955,12080,3420,12080]);
  assert.ok(park.cx-south.w/2>2525+250,'Previously approved temporary chair pose clears full drawer extension');
  const sofa=p.defaultFurniture.find(q=>q.id===SOFA_ID),sr=footprint(sofa),ac=p.defaultFurniture.find(q=>q.id==='family-living-aircon'),ar=footprint(ac);
  assert.equal(sr.y,6820);assert.ok(sr.y>=ar.y+ar.d,'East-wall sofa no longer intersects unchanged floor AC');
  const spare=p.defaultFurniture.find(q=>q.id==='family-elec-p17'),sp=footprint(spare);
  assert.ok(sp.y>=sr.y+sr.d&&sp.y+sp.d<=9600,'P17 is on exposed original east wall beyond sofa');
}
function applyFamilyLivingEast(bundle){
  const p=bundle.schemes.family;assert.ok(p?.metadata.familyKitchenHeaterUpdate,'Apply after latest reference heater');
  assert.ok(!p.metadata.familyLivingEastUpdate,'East sofa/shorter cabinet layer already applied');
  const previous=clone(p),other=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const sofa=p.defaultFurniture.find(q=>q.id===SOFA_ID),f=p.defaultFurniture.find(q=>q.id===CABINET_ID),back=p.defaultFurniture.find(q=>q.id===BACK_ID);
  assert.ok(sofa&&f&&back);assert.deepEqual([f.cx,f.cy,f.w,f.d,f.rot],[2937.5,11245,1625,5290,0]);
  const original=clone(f),previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  Object.assign(sofa,{cx:6260,cy:8025,rot:90,face:'west',layoutRevision:REVISION,designReferenceSchemeId:'screen'});
  sofa.sourceFootprintMm=footprint(sofa);sofa.notes=(sofa.notes?sofa.notes+' ':'')+CONDITIONS[0]+' '+CONDITIONS[1];
  p.defaultFurniture=p.defaultFurniture.filter(q=>q.id!==BACK_ID);
  f.cy=11745;f.d=4290;f.baseDepthMm=4290;f.layoutRevision=REVISION;f.sourceFootprintMm=footprint(f);
  const generated=shortenedStraight(f),corner=original.parts.filter(q=>q.id.startsWith('corner800-')||q.id.startsWith('corner-return-')).map(q=>relativePart(worldPart(original,q),f.cx,f.cy));
  assert.ok(corner.length>30);f.parts=[...generated.parts,...corner];
  f.name='通顶餐边柜 · 北端缩短1米 / 保留转角180°库门';
  f.notes=CONDITIONS.slice(2).join(' ');f.sourceNotes='2026-10-18业主：餐边柜从飘台端缩短1米，南侧入户和转角800库不动；不是整体缩放。';
  f.cornerDoorDesign=clone(original.cornerDoorDesign);
  f.cornerDoorDesign.focusBoundsMm=original.cornerDoorDesign.focusBoundsMm.map((n,i)=>round(n+([original.cx,original.cy,original.cx,original.cy][i]-[f.cx,f.cy,f.cx,f.cy][i])));
  f.cornerDoorDesign.operatingChair=shiftRelativeChair(original.cornerDoorDesign.operatingChair,original,f);
  f.cabinetDesign={...clone(original.cabinetDesign),layoutRevision:REVISION,title:'北端缩短1米 · 通顶餐边柜与原180°转角库',
    faces:original.cabinetDesign.faces.map(q=>q.face==='east'?{...clone(q),lengthMm:3890}:clone(q)),
    features:[
      '北端从y8600退至9600；160mm奶白圆弧端、240mm竖向原木展示格、200mm窄高柜依次重排，通顶高度和灯带样式保留。',
      '中央850mm完成面原木细台面及650mm高中空长2530mm，上柜原木门、两层开放格和连续贴板底灯带重新分模块，不压缩板厚或门缝。',
      '400mm三层餐具抽屉重排至中央台面南端y12330–12730，北段2130mm为奶白滑门；开抽前先临时收/移南餐椅，不作为无冲突通道认证。',
      ...original.cabinetDesign.features.slice(4)
    ],
    dimensions:[
      '柜高2700mm仅匹配当前模型屋顶，现场净高、吊顶、找平、门轨和下单净尺寸仍待核验。',
      '西直臂3890mm，400mm下柜深、280mm上柜深；L柜总包1625×4290mm，北端y9600、南端y13890。',
      '中央台面y10200–12730，长2530mm；五台电器占10340–12180，南端仍留550mm空台面，仅几何试排。',
      ...original.cabinetDesign.dimensions.slice(3)
    ],
    layoutAdaptations:{...clone(original.cabinetDesign.layoutAdaptations),
      drawerColumn:clone(generated.design.layoutAdaptations.drawerColumn),
      drawerReason:'短柜重新分模块；抽屉、餐椅与真实站位仍需操作核验，不以静态摆放推断可直接拉满。',
      actualLayoutConstraints:{drawerFullExtensionMm:250,drawerFullExtensionRequiresMovingChair:true,
        drawerOperatingChairId:'family-f27',drawerOperatingChairPoseMm:[3420,12080],drawerTableInterference:false,
        drawerDefaultChairProjectionOverlapMm:3.5,operationAndCirculationCertified:false},
      northEndRetreatMm:1000,originalNorthEndMm:8600,northEndMm:9600,southEndMm:13890,
      currentStraightLengthMm:3890,currentCentralCounterLengthMm:2530,
      cornerStorage:{...clone(original.cabinetDesign.layoutAdaptations.cornerStorage),operatingChair:shiftRelativeChair(original.cornerDoorDesign.operatingChair,original,f)}}};
  f.conditions=[...CONDITIONS.slice(2),...original.conditions.slice(4).filter(t=>!t.startsWith('模型开门范围不碰餐桌椅'))];
  const moved=moveAppliancesAndPoints(p,f),spareId=moveCoveredSparePoint(p),changedIds=[SOFA_ID,CABINET_ID,...moved,spareId];
  const oldById=new Map(previous.defaultFurniture.map(q=>[q.id,q])),newById=new Map(p.defaultFurniture.map(q=>[q.id,q]));
  const previousFurniture=[...changedIds,BACK_ID].map(id=>clone(oldById.get(id)));
  p.metadata.conditions=[...(p.metadata.conditions||[]),...CONDITIONS];
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:DATE,sourceIds:[SOFA_ID,CABINET_ID,BACK_ID,...moved],sourceSnapshotsUnchanged:true,
    description:'仅方案2沙发参考方案4背靠东墙，移除旧中部背柜；餐边柜北端缩短1000mm，保留南转角180°门和425mm返柜的世界位置，五台电器及用途点在短柜上重排。'}];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-living-east-20261018.cjs';
  p.metadata.familyLivingEastUpdate={id:REVISION,date:DATE,title:'方案2 · 东墙沙发与北端缩短1米餐边柜',status:'applied-owner-request-concept',
    sourceSnapshotsUnchanged:true,architectureUnchanged:true,otherSchemesUnchanged:true,purchasedSofaDimensionsUnchanged:true,
    sofa:{id:SOFA_ID,centerMm:[6260,8025],rotationDegrees:90,front:'west',rearPlaneMm:6750,referenceSchemeId:'screen',referenceSouthAdjustmentMm:25,
      televisionUnchanged:true,obliqueViewing:true,originalBackCabinetRemoved:true},
    cabinet:{id:CABINET_ID,northEndBeforeMm:8600,northEndMm:9600,southEndMm:13890,retreatMm:1000,
      westStraightLengthBeforeMm:4890,westStraightLengthMm:3890,outerEnvelopeMm:[1625,4290],centralCounterRectMm:[2125,10200,2525,12730],
      southCornerWorldGeometryUnchanged:true,returnLengthMm:425,hingeOpeningDegrees:180,hardwareInstallationApproved:false,
      boardThicknessMm:18,doorGapMm:3,noGlobalPartScaling:true},
    appliances:{ids:APPLIANCE_TYPES.map(type=>'family-sideboard-'+type),translationMm:[0,1000],bodySizesUnchanged:true,allOnRealCounter:true,
      unoccupiedSouthCounterLengthMm:550,openingSteamClearancesConfirmed:false},
    electrical:{movedPointIds:[...Array.from({length:5},(_,i)=>'family-elec-p'+(19+i)),spareId],wiringModeled:false,ratingsConfirmed:false,installationApproved:false},
    currentCounter:{counterRectMm:[2125,10200,2525,12730],finishedHeightMm:850,drawerYBandMm:[12330,12730],drawerWidthMm:400,
      drawersRequireTemporarySouthChairMove:true,drawerOperatingChairPoseMm:[3420,12080],fullExtensionMm:250,
      fixedDiningTableUnchanged:true,fullExtensionDoesNotSweepTable:true,operationAndCirculationCertified:false},
    currentElectricalAnchors:[...Array.from({length:5},(_,i)=>'family-elec-p'+(19+i)),spareId].map(id=>{
      const q=p.defaultFurniture.find(f=>f.id===id);return {id,cx:q.cx,cy:q.cy,anchor:clone(q.electricalDesign.anchor),centerHeightMm:q.electricalDesign.centerHeightMm};
    }),
    previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(q=>q.id),previousMetadataFields,previousPlanFields:{},
    changedFurnitureIds:changedIds,newFurnitureIds:[],removedFurnitureIds:[BACK_ID],replacedFurnitureIds:[],preserveCustomPartsIds:[CABINET_ID],
    preserveCustomSizeIds:[CABINET_ID],archiveRemovedDraftObjects:true,
    migrationFields:Object.fromEntries(changedIds.map(id=>[id,changed(oldById.get(id),newById.get(id))]))};
  verify(p,f,original);
  for(const old of previous.defaultFurniture)if(!changedIds.includes(old.id)&&old.id!==BACK_ID)
    assert.deepEqual(newById.get(old.id),old,'Unrelated furniture remains exact '+old.id);
  for(const k of Object.keys(previous))if(!['metadata','defaultFurniture'].includes(k))assert.deepEqual(p[k],previous[k],'Architecture remains exact '+k);
  for(const k of Object.keys(previous.metadata))if(!META_KEYS.includes(k))assert.deepEqual(p.metadata[k],previous.metadata[k],'Historical metadata remains exact '+k);
  for(const[id,old]of Object.entries(other))assert.deepEqual(bundle.schemes[id],old,'Other scheme remains exact '+id);
  assert.deepEqual(beforeFamilyLivingEast(p),previous,'Latest leaf has exact rollback');
  return bundle;
}
function beforeFamilyLivingEast(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyLivingEastUpdate;if(!m)return out;
  const old=new Map(m.previousFurniture.map(q=>[q.id,q])),current=new Map(p.defaultFurniture.map(q=>[q.id,q]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||current.get(id)));
  for(const[k,v]of Object.entries(m.previousPlanFields))p[k]=clone(v);
  for(const k of META_KEYS){if(m.previousMetadataFields[k]===undefined)delete p.metadata[k];else p.metadata[k]=clone(m.previousMetadataFields[k]);}
  delete p.metadata.familyLivingEastUpdate;return out;
}
module.exports={applyFamilyLivingEast,beforeFamilyLivingEast,REVISION};
