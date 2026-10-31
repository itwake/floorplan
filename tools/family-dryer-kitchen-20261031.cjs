'use strict';

// A new reversible leaf, applied AFTER family-drawing-20261027. The low wall
// passage is an explicitly unapproved design scenario, not a measured opening
// or an instruction to demolish a structural/window-supporting wall. This file
// intentionally imports no other history layer, avoiding reverse-chain cycles.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const clone=structuredClone,REVISION='family-dryer-kitchen-20261031',KEY='familyDryerKitchenUpdate';
const WINDOW_ID='window_kitchen_balcony',KITCHEN_ID='fit-kitchen-20261005',DRYER_ID='laundry_dryer';
const OLD_HOUSING_ID='drawing-balcony-dryer-cabinet',HOUSING_ID='family-dryer-kitchen-housing';
const META_KEYS=['conditions','designCorrections','converter'];
const UNCHANGED_ARCH_KEYS=['WINS','WALLS','WALL_META','DOORS','SLIDES','BAYS','BIFOLDS','PLAN_BOUNDS','BOUNDS','CENTER'];
const GEOMETRY={
  window:{rectMm:[7040,11160,7930,11290],widthMm:890,sillMm:1000,heightMm:1350,headMm:2350},
  conditionalLowerOpeningMm:{x1:7145,x2:7825,bottom:0,top:870},
  housingOuterRectMm:[7145,11160,7825,11890],housingHeightMm:890,
  clearMachineBayMm:[7165,11160,0,7805,11870,870],machineBodyMm:[7185,11160,0,7785,11760,840],
  kitchenOnlyTopMm:[7145,11290,870,7825,11890,890],
  sillRemaindersMm:[[7040,11160,0,7145,11290,1000],[7825,11160,0,7930,11290,1000],[7145,11160,870,7825,11290,1000]],
  conditionalSupportFloorMm:[7145,11160,0,7825,11290,0],
  doorUseZoneMm:[7145,10560,0,7825,11160,1000],
  doorUseZoneStatus:'600mm-depth-sensitivity-placeholder-not-known-hinge-sweep',
  p36WorldMm:[7922,11060,507,7930,11146,593],p36CenterMm:[7926,11103,550],
  p36HostWallRectMm:[7930,11050,8270,11290],p36Face:'west',
  p36HypotheticalDoorZoneSideGapMm:97,p36HostAlongMarginsMm:[10,144],
  northMachineWithdrawalSweepMm:[7185,10510,0,7785,11760,840],
  northWithdrawnBodyMm:[7185,10510,0,7785,11110,840],northWithdrawalDistanceMm:650,
  southWithdrawalBackPanelGapMm:110,southWithdrawalSinkSideGapMm:130,
  northWithdrawalToDrainSideGapMm:10,
  removedBalconyCabinetRectMm:[7155,10490,7815,11160],
  kitchenNorthCounterRectMm:[7010,11290,8030,11890],countertopTopMm:890,countertopUndersideMm:870,boardThicknessMm:20
};
const CONDITIONS=[
  '方案2烘干机保留600×600×840mm机身，朝北从生活阳台取衣；前脸在共墙阳台面y11160，机身全部后移至厨房侧，不再凸入原阳台地面。扫地机器人仍在厨房侧入户鞋柜下。',
  '仅提出原890mm窗下中央680宽×870高的单机条件通口，两侧各105mm原低墙及通口上130mm高原墙带保留，上窗台1000、窗高1350、上口2350不变。墙体/窗支承是否可改未鉴定，不是已存在洞口或拆改许可。',
  '原厨房台面完成高890、台底870保持；中部680mm台板只位于厨房侧y11290..11890，不穿进870..1000的保留墙带。20mm侧板独立承台，台板不压烘干机。',
  '机位净宽640、净深710、净高870；600×600×840机身左右各20、机后110、顶部仅30mm。以上仅模型几何，不能据此认定满足散热、进气、接头、维修或厂家安装要求。',
  '机位不加橱柜底板、踢脚或门槛；暂按厨房/共墙下地坪与阳台同标高0展示。共墙下是否有连续可承载楼板、墙下梁、管线、高差及防水未知；可见地面桥只是条件示意，未新增已确认楼板。',
  '机门铰链、门径、最大开角与实际前突尺寸未给出；暂在阳台标680宽×600深操作敏感性区，不能当作真实门扇扫掠或确定检修尺寸。按600前突时北侧余1000mm深，开机门时不宜把前区当通道。',
  'P36由西侧105mm余墙移至原东南实心柱西面，中心(7926,11103)、离地550mm、朝西；86mm板在柱面纵向边距10/144mm，板到680mm门前敏感性区横向97mm。避开了原余墙仅2mm边距，但暗盒、柱内钢筋/管线、插头、湿区保护和机后到电位的线长/穿板均未核，不据几何认定可施工。',
  '厨房水槽、洗碗机、冰箱、炉灶、热水器、扫地机器人、洗地龙头及地漏不移动。烘干机是水盒冷凝还是直排未知，不把阳台地漏或热水器管线自动当作烘干机接管。',
  '整机安装及拆机方向按从阳台向南推入、向北退回阳台示意，不能从厨房侧向南直接抽出：往南超过110mm即遇机位后背板，超过130mm又遇U形水槽柜。北退650mm至原机位的600mm宽扫掠仅检查机箱，与固定模型无交叉；地漏左缘距此路径右缘仅10mm，须保护且不得放桶等临时物。门框净宽、机门/把手外突、搬运姿态、地坪高差、线管和人员站位未知，不据模型认定实物搬运或安装可行。'
];
const round=n=>Math.round(n*1000)/1000;
const planOf=value=>value.schemes?.family||value;
const changedFields=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&!isDeepStrictEqual(a[k],b[k])).sort();
function footprint(f){const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));return{x:round(f.cx-w/2),y:round(f.cy-d/2),w:round(w),d:round(d)};}
function bodyRect(f){const r=footprint(f),z=f.elevationMm||0;return[r.x,r.y,z,r.x+r.w,r.y+r.d,z+f.heightMm];}
function partRect(f,q){
  const a=(f.rot||0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),cx=q.x+q.w/2,cy=q.y+q.d/2,w=Math.abs(q.w*ca)+Math.abs(q.d*sa),d=Math.abs(q.w*sa)+Math.abs(q.d*ca);
  const x=f.cx+cx*ca-cy*sa,y=f.cy+cx*sa+cy*ca,z=(f.elevationMm||0)+(q.elevationMm||0);return[round(x-w/2),round(y-d/2),z,round(x+w/2),round(y+d/2),z+q.heightMm];
}
function overlaps(a,b,tol=1e-6){return [0,1,2].every(i=>Math.min(a[i+3],b[i+3])-Math.max(a[i],b[i])>tol);}
function contains(a,b){return [0,1,2].every(i=>b[i]>=a[i]-1e-6&&b[i+3]<=a[i+3]+1e-6);}
function pointInPolygonOrEdge(point,poly){
  const [x,y]=point;let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [ax,ay]=poly[j],[bx,by]=poly[i],cross=(x-ax)*(by-ay)-(y-ay)*(bx-ax);
    if(Math.abs(cross)<.001&&x>=Math.min(ax,bx)-.001&&x<=Math.max(ax,bx)+.001&&y>=Math.min(ay,by)-.001&&y<=Math.max(ay,by)+.001)return true;
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
function worldPart(f,id,x,y,w,d,z,h,role,label,material='Cream',extra={}){
  assert.ok(w>0&&d>0&&h>0,'Invalid part '+id);
  return{id,x:x-f.cx,y:y-f.cy,w,d,elevationMm:z,heightMm:h,role,label,material,color:material==='Stone'?'#ECE8DF':'#F3EFE6',face:'north',...extra};
}
function splitNorthCabinet(f){
  assert.deepEqual([f.cx,f.cy,f.w,f.d,f.rot],[6820,12590,2420,2600,0],'Apply to the current native-DWG kitchen datum');
  const top=f.parts.find(q=>q.id==='drawing-kitchen-north-counter');assert.ok(top,'Original north countertop missing');
  assert.deepEqual(partRect(f,top),[7010,11290,870,8030,11890,890],'Keep the existing countertop elevation and coverage');
  const removed=f.parts.filter(q=>q.id.startsWith('drawing-kitchen-north-low-')||q.id==='drawing-kitchen-north-counter');
  f.parts=f.parts.filter(q=>!removed.includes(q));
  const P=(...a)=>f.parts.push(worldPart(f,...a)),T=20;
  for(const [side,x,w]of[['west',7010,135],['east',7825,205]]){
    const id='dryer-kitchen-north-fill-'+side;
    P(id+'-floor',x+T,11310,w-2*T,560,100,T,'cabinet-bottom','单机位外窄填柜20mm底板');
    P(id+'-back',x+T,11290,w-2*T,T,100,770,'cabinet-back','单机位外窄填柜20mm背板');
    P(id+'-west',x,11290,T,600,100,770,'cabinet-side','窄填柜独立20mm侧板');
    P(id+'-east',x+w-T,11290,T,600,100,770,'cabinet-side','窄填柜独立20mm侧板');
    P(id+'-plinth',x,11370,w,500,0,100,'plinth','仅窄填柜有内退踢脚，不经过机器');
    P(id+'-access-front',x+1.5,11870,w-3,T,121.5,747,'door-hinged','窄填柜/检修封板，非完整电器位');
    P(id+'-top',x,11290,w,600,870,T,'countertop','保留890完成面的分段20mm台板','Stone');
  }
  f.layoutRevision=f.cabinetRevision=REVISION;
  f.name='厨房定制柜 · 890台面保留 / 单烘干机朝阳台条件凹位';
  f.dryerKitchenDesign={revision:REVISION,housingId:HOUSING_ID,windowId:WINDOW_ID,conditionalOpening:clone(GEOMETRY.conditionalLowerOpeningMm),
    originalNorthLowCabinetWidthMm:1020,machineHousingWidthMm:680,remainingNorthFillerWidthsMm:[135,205],countertopTopMm:890,
    countertopUndersideMm:870,countertopRaised:false,boardThicknessMm:20,oldNorthPartsReplacedIds:removed.map(q=>q.id),
    constructionApproved:false,structuralAssessmentCompleted:false,manufacturerClearancesConfirmed:false};
  f.drawingKitchenDesign={...clone(f.drawingKitchenDesign),dryerKitchenRevision:REVISION,oldLowerSharedServiceOpeningRemoved:true,
    newSingleDryerOpeningIsConditional:true,currentConditionalOpening:clone(GEOMETRY.conditionalLowerOpeningMm)};
  f.conditions=(f.conditions||[]).filter(s=>!/旧1114|烘干机留阳台/.test(s));
  f.conditions.push(CONDITIONS[1],CONDITIONS[2],CONDITIONS[3],CONDITIONS[8]);f.notes=f.conditions.join(' ');
  return removed;
}
function makeHousing(){
  const f={id:HOUSING_ID,sourceId:HOUSING_ID,type:'fixture',roomId:'kitchen',name:'厨房侧单烘干机条件凹位 · 朝阳台 / 台面890不抬高',
    cx:7485,cy:11525,w:680,d:730,heightMm:890,elevationMm:0,rot:0,baseWidthMm:680,baseDepthMm:730,baseHeightMm:890,
    color:'#F3EFE6',face:'north',modelVariant:'single-dryer-kitchen-recess',layoutRevision:REVISION,cabinetRevision:REVISION,
    dimensionStatus:'conditional-structure-and-manufacturer-review-pending',installationApproved:false,notConstructionApproval:true,openApplianceBay:true};
  const P=(...a)=>f.parts.push(worldPart(f,...a));f.parts=[];
  P('dryer-kitchen-recess-west',7145,11160,20,730,0,870,'cabinet-side','20mm独立承台侧板，机位左净20');
  P('dryer-kitchen-recess-east',7805,11160,20,730,0,870,'cabinet-side','20mm独立承台侧板，机位右净20');
  P('dryer-kitchen-recess-back',7165,11870,640,20,0,870,'cabinet-back','20mm背板，机器后110余量，检修/通风待核');
  P('dryer-kitchen-recess-top',7145,11290,680,600,870,20,'countertop','独立20mm台板仅在厨房，完成面890','Stone');
  f.sourceFootprintMm=footprint(f);f.referenceStyle={revision:REVISION,variant:'cream-kitchen-dryer-recess',installationApproved:false};
  f.cabinetDesign={layoutRevision:REVISION,title:'单烘干机跨窗下墙的条件凹位',palette:{door:'#F3EFE6',wood:'#C6AA83'},faces:[{face:'north',lengthMm:680}],
    features:['机位外包680×730×890，只有厨房侧600深有20mm顶板；墙中130段上方保留870..1000原墙带。','无橱柜底板、门、踢脚或门槛；机器暂按连续原地坪0承载，实物/结构未知。','净640宽×710深×870高；600×600×840机器两侧20、后110、顶部30，不能等同厂家安装要求。'],
    dimensions:['低位条件墙洞680×870；原890窗洞两侧各105原墙保留，竖向余墙130。','原1020×600厨房台面拆成135+680+205三段，完成高890不变。']};
  f.applianceBayDesign={revision:REVISION,machineId:DRYER_ID,openingWorldMm:[7145,11160,0,7825,11290,870],netCavityMm:[640,710,870],
    machineWorldMm:clone(GEOMETRY.machineBodyMm),cavityWorldMm:clone(GEOMETRY.clearMachineBayMm),
    sideNominalClearancesMm:[20,20],rearNominalClearanceMm:110,topNominalClearanceMm:30,
    hasBottomBoard:false,hasPlinth:false,hasFrontDoor:false,topSupportedBySidePanels:true,topLoadsMachine:false,
    supportFloor:{datumMm:0,bottomBoardThicknessMm:0,existingSlabContinuityConfirmed:false,loadCapacityConfirmed:false,
      thresholdHeightConfirmed:false,conditionalBridgeWorldMm:clone(GEOMETRY.conditionalSupportFloorMm),notNewFloorArea:true,structuralApproval:false},
    doorOperation:{accessFrom:'balcony',machineFrontPlaneY:11160,hingeSide:null,hingeLocationMm:null,openingAngleDegrees:null,doorRadiusMm:null,
      actualDoorProjectionMm:null,maximumOpenEnvelopeConfirmed:false,hypotheticalProjectionDepthMm:600,zoneWorldMm:clone(GEOMETRY.doorUseZoneMm),
      zoneIsSensitivityOnly:true,remainingNorthDepthAt600ProjectionMm:1000,requiresClearBeforeOpening:true},
    wholeMachineHandling:{installationFrom:'balcony-north-to-south',withdrawalTo:'balcony-north',southKitchenWithdrawalAllowed:false,
      northWithdrawalSweepMm:clone(GEOMETRY.northMachineWithdrawalSweepMm),northWithdrawnBodyMm:clone(GEOMETRY.northWithdrawnBodyMm),
      northWithdrawalDistanceMm:650,nominalDrainSideGapMm:10,bodyEnvelopeOnly:true,actualHandlingConfirmed:false,
      installedBalconyDoorClearWidthConfirmed:false,manufacturerMaximumEnvelopeConfirmed:false,floorLevelContinuityConfirmed:false},
    manufacturerClearancesConfirmed:false,ventilationConfirmed:false,condensateDrainMode:null,drainConnectionConfirmed:false,installationApproved:false};
  f.conditions=[CONDITIONS[1],CONDITIONS[2],CONDITIONS[3],CONDITIONS[4],CONDITIONS[5],CONDITIONS[8]];f.notes=f.conditions.join(' ');return f;
}
function adaptWindow(p){
  const q=p.WIN_META.find(q=>q.id===WINDOW_ID);assert.ok(q,'Shared window missing');
  const i=p.WIN_META.indexOf(q);assert.deepEqual(p.WINS[i],GEOMETRY.window.rectMm);
  assert.deepEqual([q.sillMm,q.heightMm,q.headMm],[1000,1350,2350]);
  q.lowerServiceOpeningMm=clone(GEOMETRY.conditionalLowerOpeningMm);q.layoutRevision=REVISION;q.structuralUnverified=true;q.notConstructionApproval=true;
  q.lowerServiceOpeningDesign={revision:REVISION,status:'conditional-design-void-not-measured-existing-opening',machineId:DRYER_ID,housingId:HOUSING_ID,
    widthMm:680,heightMm:870,originalWindowWidthMm:890,remainingLowWallWidthsMm:[105,105],remainingBandHeightMm:130,
    originalUpperWindowRetained:true,originalSillDatumMm:1000,originalWindowHeightMm:1350,originalWindowHeadMm:2350,
    remainingSolidWorldMm:clone(GEOMETRY.sillRemaindersMm),conditionalSupportFloorMm:clone(GEOMETRY.conditionalSupportFloorMm),
    demolitionApproved:false,structuralAssessmentCompleted:false,sillSupportConfirmed:false,existingServicesSurveyed:false,
    floorSlabContinuityConfirmed:false,waterproofingApproved:false,isPedestrianDoorway:false,isInstalledOpening:false};
  q.notes='原共窗890宽、台1000、窗高1350、上口2350保留；2026-10-31仅在窗下中央提出680×870单烘干机条件通口。两侧各105低墙和上方130墙带仍真实建模；窗框支承、钢筋/墙梁/管线、墙下楼板、防水及拆改审批均未确定，不是施工许可。';
}
function adaptDryer(f){
  assert.deepEqual([f.w,f.d,f.heightMm],[600,600,840],'Do not shrink the known actual dryer body');
  Object.assign(f,{cx:7485,cy:11460,rot:180,elevationMm:0,roomId:'kitchen',face:'north',operationRoomId:'balcony',
    name:'烘干机600×600×840 · 厨房条件凹位 / 朝阳台取衣',layoutRevision:REVISION});f.sourceFootprintMm=footprint(f);
  f.applianceDesign={...clone(f.applianceDesign),revision:REVISION,cabinetId:HOUSING_ID,netCavityMm:[640,710,870],
    rearNominalClearanceMm:110,sideNominalClearanceMm:20,topNominalClearanceMm:30,frontAccessRoomId:'balcony',
    isConditionalStructuralOpening:true,actualDoorProjectionMm:null,doorHingeSide:null,condensateDrainMode:null,
    connectionsConfirmed:false,manufacturerClearancesConfirmed:false,installationApproved:false};
  f.conditions=[CONDITIONS[0],CONDITIONS[3],CONDITIONS[4],CONDITIONS[5],CONDITIONS[7],CONDITIONS[8]];f.notes=f.conditions.join(' ');
}
function adaptPower(p){
  const f=p.defaultFurniture.find(q=>q.id==='family-elec-p36');if(!f)return;
  assert.deepEqual([f.cx,f.cy,f.w,f.d,f.heightMm,f.elevationMm,f.rot],[7100,11156,86,8,86,507,180],'Apply to the current default P36; custom draft placement is preserved by migration');
  const index=p.WALLS.findIndex(w=>w.slice(0,4).every((n,i)=>Math.abs(n-GEOMETRY.p36HostWallRectMm[i])<.001));
  assert.ok(index>=0,'The original southeast pier is required as the proposed visible P36 host');
  Object.assign(f,{cx:7926,cy:11103,rot:90,face:'west',roomId:'balcony',layoutRevision:REVISION,
    name:'P36 · 烘干机 · 原东南柱侧服务电源',dimensionStatus:'service-relocation-on-model-pier-not-site-survey'});
  f.sourceFootprintMm=footprint(f);
  f.electricalDesign={...clone(f.electricalDesign),layoutRevision:REVISION,servedRoomId:'kitchen',mountingRoomId:'balcony',face:'west',
    purpose:'烘干机 · 原东南实心柱西面服务电源',servedFurnitureIds:[DRYER_ID],anchor:{kind:'wall',wallIndex:index,
      wallRectMm:clone(p.WALLS[index]),hostDescription:'original-southeast-pier-west-face',relatedWindowId:WINDOW_ID,
      previousNarrowJambPositionMm:[7100,11156,550],modelHostAlongMarginsMm:clone(GEOMETRY.p36HostAlongMarginsMm),
      hypotheticalDoorZoneSideGapMm:97,surfaceVerifiedAgainstCurrentModel:true,siteVerified:false,boxInstallationApproved:false},
    drawingEvidence:{...clone(f.electricalDesign.drawingEvidence),positionStatus:'owner-dryer-recess-service-adaptation-not-source-drawing-location',
      heightStatus:'retained-550-service-height-not-measured',currentPositionMm:clone(GEOMETRY.p36CenterMm)},
    reviewNotes:CONDITIONS[6],installationApproved:false,wiringModeled:false,manufacturerCordRouteConfirmed:false,
    hiddenServicesSurveyed:false,wetAreaReviewPending:true};
  f.notes=CONDITIONS[6];f.conditions=[...(f.conditions||[]),CONDITIONS[6]];
}
function validateFamilyDryerKitchen(value){
  const p=planOf(value),get=id=>p.defaultFurniture.find(q=>q.id===id),dryer=get(DRYER_ID),housing=get(HOUSING_ID),kitchen=get(KITCHEN_ID);
  assert.ok(dryer&&housing&&kitchen);assert.ok(!get(OLD_HOUSING_ID),'Old balcony cabinet must not remain over the recovered floor');
  assert.deepEqual(bodyRect(dryer),GEOMETRY.machineBodyMm);assert.ok(contains(GEOMETRY.clearMachineBayMm,bodyRect(dryer)));
  const top=housing.parts.find(q=>q.id==='dryer-kitchen-recess-top');assert.deepEqual(partRect(housing,top),GEOMETRY.kitchenOnlyTopMm);
  assert.ok(housing.parts.every(q=>!['cabinet-bottom','plinth','door-hinged','door-sliding'].includes(q.role)),'No board, plinth or door through the machine path');
  const obstacles=[];
  for(const f of p.defaultFurniture){
    if(f.id===DRYER_ID)continue;
    if(f.parts?.length)for(const q of f.parts)obstacles.push({id:f.id+'/'+q.id,rect:partRect(f,q)});
    else obstacles.push({id:f.id,rect:bodyRect(f)});
  }
  for(const a of obstacles)assert.ok(!overlaps(bodyRect(dryer),a.rect),'Dryer body intersects '+a.id);
  for(const [i,r]of GEOMETRY.sillRemaindersMm.entries()){
    assert.ok(!overlaps(r,bodyRect(dryer)),'Machine enters remaining wall '+i);
    for(const q of housing.parts)assert.ok(!overlaps(r,partRect(housing,q)),'Housing enters remaining wall '+q.id);
  }
  for(const w of p.WALLS)assert.ok(!overlaps(bodyRect(dryer),[w[0],w[1],0,w[2],w[3],3000]),'Dryer enters a retained full wall');
  const wm=p.WIN_META.find(q=>q.id===WINDOW_ID);assert.deepEqual(wm.lowerServiceOpeningMm,GEOMETRY.conditionalLowerOpeningMm);
  assert.deepEqual([wm.sillMm,wm.heightMm,wm.headMm],[1000,1350,2350]);assert.equal(wm.lowerServiceOpeningDesign.demolitionApproved,false);
  const p36=get('family-elec-p36');if(p36){
    const r=bodyRect(p36),a=p36.electricalDesign.anchor,host=p.WALLS[a.wallIndex],balcony=p.ROOMS.find(q=>q.id==='balcony');
    assert.deepEqual(r,GEOMETRY.p36WorldMm);assert.equal(p36.rot,90);assert.equal(p36.face,'west');assert.equal(a.kind,'wall');
    assert.deepEqual(host.slice(0,4),GEOMETRY.p36HostWallRectMm);assert.equal(r[3],host[0]);
    assert.ok(r[1]>=host[1]&&r[4]<=host[3]);assert.deepEqual([round(r[1]-host[1]),round(host[3]-r[4])],GEOMETRY.p36HostAlongMarginsMm);
    assert.equal(round(r[0]-GEOMETRY.doorUseZoneMm[3]),97,'Visible faceplate is outside hypothetical machine-door zone');
    assert.ok(!overlaps(r,GEOMETRY.doorUseZoneMm));
    for(const x of [r[0],r[3]])for(const y of [r[1],r[4]])assert.ok(pointInPolygonOrEdge([x,y],balcony.poly),'P36 visible plate must stay inside the original balcony contour');
    for(const other of obstacles.filter(q=>!q.id.startsWith(p36.id+'/')))assert.ok(!overlaps(r,other.rect),'P36 visible plate intersects '+other.id);
    for(const w of p.WALLS)assert.ok(!overlaps(r,[w[0],w[1],0,w[2],w[3],3000]),'P36 must touch rather than enter the modeled pier');
    for(const s of p.SLIDES){const q=s.rect;assert.ok(!overlaps(r,[q[0],q[1],s.sillMm||0,q[2],q[3],s.headMm||s.heightMm]),'P36 enters a sliding-door opening');}
    for(let i=0;i<p.WINS.length;i++){const q=p.WINS[i],m=p.WIN_META[i];assert.ok(!overlaps(r,[q[0],q[1],m.sillMm,q[2],q[3],m.headMm]),'P36 enters a window opening');}
  }
  // The entire original 1020 x 600 top is still present at exactly 870..890.
  const tops=[...kitchen.parts.filter(q=>q.id.startsWith('dryer-kitchen-north-fill-')&&q.role==='countertop').map(q=>partRect(kitchen,q)),partRect(housing,top)].sort((a,b)=>a[0]-b[0]);
  assert.deepEqual(tops,[[7010,11290,870,7145,11890,890],[7145,11290,870,7825,11890,890],[7825,11290,870,8030,11890,890]]);
  assert.ok(!kitchen.parts.some(q=>q.id.startsWith('drawing-kitchen-north-low-')||q.id==='drawing-kitchen-north-counter'),'Old solid north cabinet must not be hidden through new bay');
  const frontZone=GEOMETRY.doorUseZoneMm;
  const physicalFrontObstacles=obstacles.filter(q=>!q.id.startsWith(HOUSING_ID+'/')&&q.rect[5]>10&&overlaps(frontZone,q.rect)).map(q=>q.id);
  assert.deepEqual(physicalFrontObstacles,[],'Hypothetical machine-front use zone has a tall fixed obstruction');
  // This checks only a straight translation of the known box. It does not
  // invent an appliance-door hinge, handling orientation or installed door net.
  const withdrawal=GEOMETRY.northMachineWithdrawalSweepMm;
  assert.ok(contains(withdrawal,bodyRect(dryer)));assert.ok(contains(withdrawal,GEOMETRY.northWithdrawnBodyMm));
  for(const q of obstacles)assert.ok(!overlaps(withdrawal,q.rect),'North whole-machine box withdrawal intersects '+q.id);
  for(const w of p.WALLS)assert.ok(!overlaps(withdrawal,[w[0],w[1],0,w[2],w[3],3000]),'North withdrawal intersects retained full wall');
  for(const r of GEOMETRY.sillRemaindersMm)assert.ok(!overlaps(withdrawal,r),'North withdrawal intersects remaining sill wall');
  for(const s of p.SLIDES){const r=s.rect;assert.ok(!overlaps(withdrawal,[r[0],r[1],s.sillMm||0,r[2],r[3],s.headMm||s.heightMm]),'Straight north withdrawal must stay clear of original slider band');}
  const drain=get('family-drain-balcony');assert.ok(drain,'Retain balcony drain next to machine handling zone');
  const drainSideGap=round(bodyRect(drain)[0]-withdrawal[3]);assert.equal(drainSideGap,10,'Record the tight body-to-drain side gap explicitly');
  const rear=housing.parts.find(q=>q.id==='dryer-kitchen-recess-back'),sinkSide=kitchen.parts.find(q=>q.id==='drawing-kitchen-sink-side-north');
  assert.ok(rear&&sinkSide);const backRect=partRect(housing,rear),sinkRect=partRect(kitchen,sinkSide);
  assert.equal(round(backRect[1]-bodyRect(dryer)[4]),110);assert.equal(round(sinkRect[1]-bodyRect(dryer)[4]),130);
  const movedSouth=distance=>{const b=bodyRect(dryer);b[1]+=distance;b[4]+=distance;return b;};
  assert.ok(overlaps(movedSouth(111),backRect),'South withdrawal must be marked blocked beyond110mm by rear panel');
  assert.ok(overlaps(movedSouth(140),sinkRect),'Removing a rear panel alone does not clear the U-shaped sink cabinet');
  return{ok:true,machineBodyMm:clone(GEOMETRY.machineBodyMm),clearMachineBayMm:clone(GEOMETRY.clearMachineBayMm),
    nominalClearancesMm:{west:20,east:20,rear:110,top:30},lowerOpeningMm:clone(GEOMETRY.conditionalLowerOpeningMm),
    lowWallRemainingWidthsMm:[105,105],wallBandAboveOpeningMm:130,upperWindowUnchanged:true,countertopRaised:false,
    countertopTopMm:890,countertopUndersideMm:870,bottomBoardThicknessMm:0,conditionalFloorContinuityConfirmed:false,
    freedBalconyCabinetFootprintM2:.4422,balconyFloorAreaChanged:false,hypotheticalDoorZoneMm:clone(frontZone),
    hypothetical600ProjectionNorthRemainingMm:1000,actualDoorSweepConfirmed:false,p36PointMoved:true,
    p36WorldMm:clone(GEOMETRY.p36WorldMm),p36HostAlongMarginsMm:clone(GEOMETRY.p36HostAlongMarginsMm),
    p36HypotheticalDoorZoneSideGapMm:97,p36InstallationApproved:false,
    wholeMachineInstallationDirection:'from-balcony-towards-south',wholeMachineWithdrawalDirection:'towards-north-balcony',
    northWithdrawalSweepMm:clone(withdrawal),northWithdrawalDistanceMm:650,northFixedBodyObstacles:[],northBodyToDrainSideGapMm:10,
    southWithdrawalBlockedBeyondMm:110,southSinkCabinetObstructionBeyondMm:130,actualHandlingConfirmed:false,
    mainWaterAndGasAppliancesUnmoved:true,robotRemainsUnderEntryShoeCabinet:true};
}
function beforeFamilyDryerKitchen(value){
  const out=clone(value),p=planOf(out),m=p?.metadata?.[KEY];if(!m)return out;
  const old=new Map(m.previousFurniture.map(q=>[q.id,q])),now=new Map(p.defaultFurniture.map(q=>[q.id,q]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||now.get(id)));
  for(const[k,v]of Object.entries(m.previousPlanFields))p[k]=clone(v);
  for(const[k,v]of Object.entries(m.previousMetadataFields)){if(v.present)p.metadata[k]=clone(v.value);else delete p.metadata[k];}
  delete p.metadata[KEY];return out;
}
function applyFamilyDryerKitchen(value){
  const p=planOf(value);assert.ok(p?.metadata?.familyDrawingUpdate,'Apply after the latest construction-drawing leaf');
  if(p.metadata[KEY]){assert.equal(p.metadata[KEY].id,REVISION);return value;}
  assert.equal(p.id,'family','Only scheme 2 is authorized');
  const previous=clone(p),others=value.schemes?Object.fromEntries(Object.entries(value.schemes).filter(([id])=>id!=='family').map(([id,q])=>[id,clone(q)])):null;
  const get=id=>p.defaultFurniture.find(q=>q.id===id),kitchen=get(KITCHEN_ID),dryer=get(DRYER_ID);assert.ok(kitchen&&dryer&&get(OLD_HOUSING_ID));
  splitNorthCabinet(kitchen);adaptWindow(p);adaptDryer(dryer);adaptPower(p);
  p.defaultFurniture=p.defaultFurniture.filter(q=>q.id!==OLD_HOUSING_ID);p.defaultFurniture.push(makeHousing());
  for(const room of p.ROOMS){
    if(room.id==='balcony')room.notes='原1050×1600主体轮廓、约1.662m²不扩大；烘干机拟经中央680×870窗下条件通口移至厨房，从阳台取衣，原阳台机柜取消。门前600mm操作区仅敏感性占位，结构/连续楼板/厂家净空待核。机器人仍在入户鞋柜下；龙头、地漏及600非踩踏外挑不动。';
    if(room.id==='kitchen')room.notes=(room.notes?room.notes+' ':'')+'2026-10-31保留890台面，窗下680宽单烘干机条件机位朝阳台；原上窗保留、余墙不作已批准可拆。';
  }
  const validation=validateFamilyDryerKitchen(p),old=new Map(previous.defaultFurniture.map(q=>[q.id,q])),now=new Map(p.defaultFurniture.map(q=>[q.id,q]));
  const changed=p.defaultFurniture.filter(q=>old.has(q.id)&&!isDeepStrictEqual(q,old.get(q.id))).map(q=>q.id),added=p.defaultFurniture.filter(q=>!old.has(q.id)).map(q=>q.id),removed=previous.defaultFurniture.filter(q=>!now.has(q.id)).map(q=>q.id);
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,{present:Object.hasOwn(previous.metadata,k),...(Object.hasOwn(previous.metadata,k)?{value:clone(previous.metadata[k])}:{})}]));
  p.metadata.conditions=[...(p.metadata.conditions||[]),...CONDITIONS];
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-31',sourceIds:[DRYER_ID,KITCHEN_ID,WINDOW_ID],sourceSnapshotsUnchanged:true,
    description:'仅方案2烘干机拟移厨房侧，680×870单机低位条件通口；890台面和1000窗台不抬高，上窗不变；结构、楼板与机器顶部30净空待核，机器人仍在鞋柜下。'}];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-dryer-kitchen-20261031.cjs';
  p.metadata[KEY]={id:REVISION,date:'2026-10-31',title:'方案2 · 单烘干机移厨房侧，朝阳台的条件机位',
    status:'conditional-opening-not-existing-or-approved-demolition',installationApproved:false,notConstructionApproval:true,
    geometry:clone(GEOMETRY),clearancesMm:clone(validation.nominalClearancesMm),validation,
    previousPlanFields:{WIN_META:clone(previous.WIN_META),ROOMS:clone(previous.ROOMS)},previousMetadataFields,
    previousFurnitureOrder:previous.defaultFurniture.map(q=>q.id),previousFurniture:[...changed,...removed].map(id=>clone(old.get(id))),
    changedFurnitureIds:changed,newFurnitureIds:added,removedFurnitureIds:removed,replacedFurnitureIds:[],
    migrationFields:Object.fromEntries(changed.map(id=>[id,changedFields(old.get(id),now.get(id))])),
    preserveCustomPartsIds:[KITCHEN_ID],preserveCustomSizeIds:[KITCHEN_ID,DRYER_ID],
    preserveCustomPlacementIds:['family-elec-p36'],
    operationAccessRoomId:'balcony',machineRoomId:'kitchen',robotLocationUnchanged:true,sourceSnapshotsUnchanged:true,
    notes:[CONDITIONS[0],CONDITIONS[1],CONDITIONS[2]],pending:CONDITIONS.slice(3),
    structure:{requiresSiteAssessment:true,demolitionApproved:false,reinforcementOrLintelDesigned:false,remainingBandsDoNotProveLoadCapacity:true,
      continuousFloorConfirmed:false,noNewFloorArea:true,waterproofingApproved:false},
    plumbing:{bucketTapUnchanged:true,floorDrainUnchanged:true,condensateDrainMode:null,connectionConfirmed:false},
    electricity:{pointId:'family-elec-p36',pointPositionUnchanged:false,previousCenterMm:[7100,11156,550],
      currentCenterMm:clone(GEOMETRY.p36CenterMm),hostWallRectMm:clone(GEOMETRY.p36HostWallRectMm),
      p36HostAlongMarginsMm:clone(GEOMETRY.p36HostAlongMarginsMm),hypotheticalDoorZoneSideGapMm:97,
      pointInstallationApproved:false,cableRouteConfirmed:false,hiddenServicesSurveyed:false},
    handling:{installationDirection:'from-north-balcony',withdrawalDirection:'towards-north-balcony',southKitchenWithdrawalAllowed:false,
      bodyOnlyNorthSweepMm:clone(GEOMETRY.northMachineWithdrawalSweepMm),northWithdrawalDistanceMm:650,drainSideGapMm:10,
      southRearPanelGapMm:110,southSinkCabinetGapMm:130,actualDoorClearWidthConfirmed:false,actualHandlingConfirmed:false,
      notes:CONDITIONS[8]},
    untouchedFurnitureIds:previous.defaultFurniture.filter(q=>!changed.includes(q.id)&&!removed.includes(q.id)).map(q=>q.id)};
  for(const key of UNCHANGED_ARCH_KEYS)assert.deepEqual(p[key],previous[key],key+' must stay unchanged');
  for(const id of ['balcony_robot','fit-entry_shoe_station','family-elec-p35','family-drain-balcony','balcony_bucket_tap','kitchen_heater','kitchen_double_sink','kitchen_dishwasher','kitchen_fridge','laundry_washer']){
    if(old.has(id))assert.deepEqual(get(id),old.get(id),'Unrelated equipment must stay exact '+id);
  }
  for(const q of previous.defaultFurniture)if(!changed.includes(q.id)&&!removed.includes(q.id))assert.deepEqual(get(q.id),q,'Unrelated furniture '+q.id);
  for(const[k,q]of Object.entries(previous.metadata))if(!META_KEYS.includes(k))assert.deepEqual(p.metadata[k],q,'Historical metadata '+k);
  if(others)for(const[id,q]of Object.entries(others))assert.deepEqual(value.schemes[id],q,'Other scheme '+id);
  assert.deepEqual(beforeFamilyDryerKitchen(p),previous,'Dryer kitchen leaf must undo exactly');return value;
}
module.exports={applyFamilyDryerKitchen,beforeFamilyDryerKitchen,validateFamilyDryerKitchen,REVISION,KEY,GEOMETRY,CONDITIONS,footprint,bodyRect,partRect};
