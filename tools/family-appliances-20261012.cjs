'use strict';

// Owner-requested Scheme 2 appliance concept layer. All geometry is in mm;
// these conservative editable envelopes are not purchased product models or
// an electrical, refrigerant, ventilation, waterproofing or installation plan.
const assert=require('node:assert/strict');
const {beforeFamilyAcWindow}=require('./family-ac-window-20261012.cjs');
const REVISION='family-appliances-20261012';
const DATE='2026-10-12';
const clone=structuredClone;
const META_KEYS=['designCorrections','conditions','converter'];
const C={cream:'#F4F1E9',metal:'#CBD0CD',glass:'#CCD9D6'};
const REFERENCES=[
  {kind:'blender',url:'https://www.mi.com/hk/product/xiaomi-smart-blender/specs/',sampleDimensionsMm:[188,222,436],note:'官方破壁机样例，仅核对尺寸量级；当前220×240×460外包不是该产品模型或购买推荐。'},
  {kind:'temperaturekettle',url:'https://www.midea.cn/187/10000000004007021228727.html',sampleDimensionsMm:[220,202,274],note:'官方恒温调奶壶样例，仅尺寸量级；当前220×220×300外包不是已购型号。'},
  {kind:'sterilizer',url:'https://www.philips.com.hk/c-p/SCF293_01/sterilizer',sampleDimensionsMm:[304,191,378],note:'官方蒸汽消毒烘干器样例，不是业主所述柜式外观；本场景仍使用300×300×420柜式概念外包，型号、开门、蒸汽与散热待核。'},
  {kind:'healthkettle',url:'https://sale.midea.cn/detail/index?itemid=1000000000401094355918',sampleDimensionsMm:[222,170,251],note:'官方养生壶样例，仅尺寸量级；当前220×220×280外包不代表实物匹配。'},
  {kind:'waterdispenser',url:'https://www.mi.com/hk/product/xiaomi-instant-hot-water-dispenser/specs/',sampleDimensionsMm:[312,106,280],note:'官方台式饮水机样例，仅尺寸量级，机身宽深方向须结合实物；当前260×350×430是可编辑概念外包。'},
  {kind:'bathheater',url:'https://m.midea.cn/detail/index?itemid=1000000000400751841673',samplePanelMm:[300,600],sampleBodyDepthMm:95,note:'官方风暖浴霸面板量级参考；模型只画300×600×80可见概念壳体，不能把80mm当实际吊顶安装深度。'}
];
const INSTALL_CONDITIONS={
  acwall:['900×250×300mm为暂估机身；底高2250mm、上沿2550mm，挂机支架及实际安装高度、顶部进风检修空间须结合型号和现场确认。','外机位置、制冷剂管、穿墙套管、冷凝水坡度与排水点、独立电源、墙体承载及送风方向均未核；不据概念模型施工或下单。'],
  aircon:['500×380×1800mm立柜机为暂估外包，位于电视旁东侧角落，不占西侧走廊；模型与电视柜及东墙均只有50mm，非厂家要求的散热或检修余量。','外机、管线、冷凝排水、电源及回风/检修间距待核；实际机型不合适时应调整位置，不移动墙体来假定可安装。'],
  ceilingfan:['300×300×80mm为可见凉霸面板概念壳体，底2620mm、顶2700mm；吊顶腔、整机安装深度、风路与灯具/龙骨位置待核。','不以80mm壳体推断整机可塞入现吊顶；厨房油烟环境适用性、清洁检修和电源须按实际产品及现场深化。'],
  bathheater:['300×600×80mm为淋浴上方可见风暖浴霸概念壳体，底2620mm、顶2700mm；实际机深通常大于可见厚度，本模型未画吊顶腔内机体或风管。','淋浴区适用性、防护等级、安装禁区/高度、排风路径与吊顶龙骨、漏电保护及电源等必须由安装人员结合真实型号和现场确认；不构成安装批准。'],
  countertop:['暂估外包放在真实850mm餐边柜台面上，使用面朝东；当前仅是摆放状态，不是已购电器或接通运行状态。','400mm台深与650mm中空有限：后部插头/电线、开盖加水、前开门、散热、蒸汽和防潮间距均待实际型号核对；不能从无实体相交推断可安全运行。','五台电器不默认同时运行，也不默认共用插排；插座数量、回路负荷、接地与涉水保护需专业核验，本层不提供电气施工方案。']
};
function appliance(id,type,name,roomId,cx,cy,w,d,h,z,rot,installation,extra={}){
  const a=rot*Math.PI/180,worldW=Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d,worldD=Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d;
  return {id,type,name,roomId,cx,cy,w,d,rot,color:C.cream,heightMm:h,elevationMm:z,sourceId:id,
    modelVariant:'appliance-concept',layoutRevision:REVISION,dimensionStatus:'concept-pending-user-model',
    sourceFootprintMm:{x:Math.round((cx-worldW/2)*1000)/1000,y:Math.round((cy-worldD/2)*1000)/1000,w:Math.round(worldW*1000)/1000,d:Math.round(worldD*1000)/1000},
    applianceDesign:{revision:REVISION,status:'concept-pending-user-model',installation,notPurchasedModel:true,notInstallationApproval:true,dimensionsMm:[w,d,h],bottomMm:z,topMm:z+h},
    notes:'2026-10-12业主新增电器摆放示意；尺寸与安装定位暂估，需按实物和现场复核。',
    conditions:clone(INSTALL_CONDITIONS[installation==='countertop'?'countertop':type]),...extra};
}
function additions(){
  const out=[
    appliance('family-acwall-room_a','acwall','主卧 · 壁挂空调（暂估）','room_a',5650,3095,900,250,300,2250,180,'wall-high'),
    appliance('family-acwall-room_b','acwall','次卧 · 壁挂空调（暂估）','room_b',1570,3095,900,250,300,2250,180,'wall-high'),
    appliance('family-acwall-room_c','acwall','书房 · 壁挂空调（暂估）','room_c',1170,3465,900,250,300,2250,0,'wall-high'),
    appliance('family-living-aircon','aircon','客厅电视旁 · 立柜空调（暂估）','living',6450,6610,500,380,1800,0,0,'floor-corner'),
    appliance('family-kitchen-ceilingfan','ceilingfan','厨房顶部 · 凉霸面板（暂估）','kitchen',7110,12500,300,300,80,2620,0,'ceiling-panel'),
    appliance('family-bathheater-bath_1','bathheater','主卫淋浴上方 · 风暖浴霸面板（暂估）','bath_1',6260,4105,300,600,80,2620,0,'ceiling-panel'),
    appliance('family-bathheater-bath_2','bathheater','客卫淋浴上方 · 风暖浴霸面板（暂估）','bath_2',6260,5595,300,600,80,2620,0,'ceiling-panel')
  ];
  // West straight counter: x2125..2525, y9200..12730, finished top850.
  // All machine backs start at x2175 (32mm after the real niche back), so
  // the existing socket rail ending x2153 remains untouched and unoccluded
  // by the solid bodies. Plugs/hoses, actual service gaps and open lids are
  // deliberately not declared resolved by those static body gaps.
  const counter=[
    ['blender','破壁机',9450,220,240,460],
    ['temperaturekettle','恒温壶',9790,220,220,300],
    ['sterilizer','蒸汽奶瓶消毒柜',10230,300,300,420],
    ['healthkettle','养生壶',10620,220,220,280],
    ['waterdispenser','台式饮水机',11050,260,350,430]
  ];
  for(const[type,label,cy,w,d,h]of counter){
    const f=appliance('family-sideboard-'+type,type,'餐边柜 · '+label+'（暂估）','living',2175+d/2,cy,w,d,h,850,270,'countertop',
      {supportFurnitureId:'fit-dining_sideboard_wall',supportPartId:'reference-west-central-countertop',frontDirection:'east'});
    Object.assign(f.applianceDesign,{supportTopMm:850,cabinetNicheTopMm:1500,aboveBodyToLowestLedMm:1496-850-h,
      behindBodyToNicheBackMm:32,behindBodyToSocketRailMm:22,frontMarginToCounterEdgeMm:350-d,
      openingAndSteamClearanceStatus:'pending-actual-product',reference:clone(REFERENCES.find(r=>r.kind===type))});
    if(type==='sterilizer')f.conditions.push('消毒柜上方至灯带仅226mm模型净空；未模拟柜门/盖开启、蒸汽排放及运行散热。柜下蒸汽运行是否允许以及是否须移至开放备餐区，均需选定真实型号后核对，当前不作可运行结论。');
    out.push(f);
  }
  return out;
}
function rect(f){
  const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),w=Math.abs(c)*f.w+Math.abs(s)*f.d,d=Math.abs(s)*f.w+Math.abs(c)*f.d;
  return [f.cx-w/2,f.cy-d/2,f.cx+w/2,f.cy+d/2,f.elevationMm||0,(f.elevationMm||0)+(f.heightMm||0)];
}
function solidPart(f,q){
  const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=q.x+q.w/2,y=q.y+q.d/2,w=Math.abs(c)*q.w+Math.abs(s)*q.d,d=Math.abs(s)*q.w+Math.abs(c)*q.d,cx=f.cx+c*x-s*y,cy=f.cy+s*x+c*y,z=(f.elevationMm||0)+q.elevationMm;
  return [cx-w/2,cy-d/2,cx+w/2,cy+d/2,z,z+q.heightMm];
}
const overlap=(a,b)=>[0,1,4].every((k,i)=>Math.min(a[k===4?5:k+2],b[k===4?5:k+2])-Math.max(a[k],b[k])>0.001);
function assertPlacement(p,newItems){
  const sideboard=p.defaultFurniture.find(f=>f.id==='fit-dining_sideboard_wall');
  assert.ok(sideboard?.parts?.length,'Expected real current sideboard boards');
  const countertop=sideboard.parts.find(q=>q.role==='wood-countertop'&&q.face==='east'&&q.d===3530);
  assert.ok(countertop,'Expected unchanged continuous west countertop');
  assert.deepEqual([sideboard.cx+countertop.x,sideboard.cy+countertop.y,countertop.w,countertop.d,countertop.elevationMm+countertop.heightMm],[2125,9200,400,3530,850]);
  for(const f of newItems){
    const r=rect(f),room=p.ROOMS.find(q=>q.id===f.roomId);
    assert.ok(room,f.id+': missing room');assert.ok(r[4]>=0&&r[5]<=room.heightMm,f.id+': crosses ceiling');
    for(const old of p.defaultFurniture){
      const solids=old.parts?.length?old.parts.map(q=>[q.id,solidPart(old,q)]):[[old.id,rect(old)]];
      for(const[id,solid]of solids)assert.ok(!overlap(r,solid),f.id+': intersects '+old.id+'/'+id);
    }
    if(f.supportFurnitureId){
      const counter=solidPart(sideboard,countertop);
      assert.ok(r[0]>=counter[0]-.001&&r[1]>=counter[1]-.001&&r[2]<=counter[2]+.001&&r[3]<=counter[3]+.001,f.id+': exceeds true countertop');
      assert.equal(r[4],counter[5],f.id+': not on true countertop');
    }
  }
  for(let i=0;i<newItems.length;i++)for(let j=i+1;j<newItems.length;j++)assert.ok(!overlap(rect(newItems[i]),rect(newItems[j])),newItems[i].id+': new bodies intersect');
}
function applyFamilyAppliances(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyStudyDoorUpdate,'Apply after Scheme 2 confirmed south-hinge study door');
  assert.ok(!p.metadata.familyAppliancesUpdate,'Scheme 2 appliance layer already applied');
  const previous=clone(p),untouched=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const newItems=additions();assert.equal(newItems.length,12);assert.equal(p.defaultFurniture.length,47);
  for(const f of newItems)assert.ok(!p.defaultFurniture.some(q=>q.id===f.id),'Duplicate appliance ID '+f.id);
  assertPlacement(p,newItems);
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  p.defaultFurniture.push(...newItems);
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:DATE,sourceIds:newItems.map(f=>f.id),
    description:'仅方案2增加主次卧及书房挂机、客厅电视东角柜机、厨房凉霸、两卫淋浴上方浴霸与餐边柜五台小家电；均暂估外包，原墙门窗、家具和定制柜板件不动。',
    sourceSnapshotsUnchanged:true,usageNote:'12件可编辑概念电器，不是已购型号、产品推荐或机电安装批准。'}];
  p.metadata.conditions=[...(p.metadata.conditions||[]),
    '2026-10-12方案2新增12件暂估电器；原有47件家具、墙/门/窗、1450书房桌架与南铰门、厨房及阳台双扇门、其他3方案保持。',
    '三房挂机底2250/顶2550mm；柜机放TV东侧、静态距墙和电视柜50mm只是模型几何空隙。冷凝排水、外机/管路、进回风、供电与检修未核。',
    '厨房凉霸和两卫浴霸可见面板底2620/顶2700mm，80mm仅显示壳体；吊顶腔内机身深度、风管、安装禁区、防护等级、排风、电气保护与检修定位待核。',
    '五台餐边电器底850mm落在真实400mm深西柜台面；不改原插座和灯带，不遮高柜展示格，南段保留1550mm连续空白备餐台面。所有实物尺寸、插头、开盖、蒸汽、散热及实际运行位置待核；不默认柜下蒸汽运行或五台同时接同一插排。'];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-appliances-20261012.cjs';
  p.metadata.familyAppliancesUpdate={id:REVISION,date:DATE,title:'方案2 · 空调与厨房浴室及餐边电器',status:'applied-owner-request-concept',
    dimensionStatus:'concept-pending-user-model',sourceSnapshotsUnchanged:true,notPurchasedModels:true,notInstallationApproval:true,
    previousPlanFields:{},previousFurniture:[],previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:[],newFurnitureIds:newItems.map(f=>f.id),removedFurnitureIds:[],replacedFurnitureIds:[],migrationFields:{},
    architectureUnchanged:true,existingFurnitureUnchanged:true,existingCabinetPartsUnchanged:true,sourceReference:'2026-10-12用户方案2新增家电请求',
    applianceIdsByRoom:Object.fromEntries(['room_a','room_b','room_c','living','kitchen','bath_1','bath_2'].map(id=>[id,newItems.filter(f=>f.roomId===id).map(f=>f.id)])),
    references:clone(REFERENCES),
    counter:{furnitureId:'fit-dining_sideboard_wall',finishedHeightMm:850,straightCounterRectMm:[2125,9200,2525,12730],
      allFronts:'east',applianceBackMm:2175,machineBandY:[9340,11180],unoccupiedSouthLengthMm:1550,
      upperBottomMm:1500,lowestLedMm:1496,bodyToNicheBackMm:32,bodyToSocketRailMm:22,minimumFrontMarginMm:0,
      physicalEnvelopeOnly:true,openingAndSteamClearancesPending:true,existingPartsRemoved:[]},
    conditions:[...clone(INSTALL_CONDITIONS.acwall),...clone(INSTALL_CONDITIONS.aircon),...clone(INSTALL_CONDITIONS.ceilingfan),...clone(INSTALL_CONDITIONS.bathheater),...clone(INSTALL_CONDITIONS.countertop),
      '台式饮水机350mm暂估深度已用尽后沿32mm之后的台面，前沿齐柜边；这不是确定可安装的选型，需实测机脚、插头和倾倒稳定性，实物过深时不得默认可悬挑。',
      '破壁/恒温/消毒/养生/饮水机顶部至下灯带依次186/346/226/366/216mm，仅现有闭合机身几何空隙；开盖、补水、取奶瓶及蒸汽运行都未验证。']};
  for(const k of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(k))assert.deepEqual(p[k],previous[k],k+': unexpected architecture edit');
  assert.deepEqual(p.defaultFurniture.slice(0,previous.defaultFurniture.length),previous.defaultFurniture,'No existing furniture or cabinet parts may change');
  for(const[id,before]of Object.entries(untouched))assert.deepEqual(bundle.schemes[id],before,id+': unexpected other scheme edit');
  assert.deepEqual(beforeFamilyAppliances(p),previous,'Appliance layer must exactly restore previous Scheme 2');
  return bundle;
}
function beforeFamilyAppliances(value){
  const out=beforeFamilyAcWindow(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyAppliancesUpdate;
  if(!m)return out;
  const newIds=new Set(m.newFurnitureIds);p.defaultFurniture=p.defaultFurniture.filter(f=>!newIds.has(f.id));
  const current=new Map(p.defaultFurniture.map(f=>[f.id,f]));p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(current.get(id)));
  for(const[k,v]of Object.entries(m.previousPlanFields))p[k]=clone(v);
  for(const k of META_KEYS){if(m.previousMetadataFields[k]===undefined)delete p.metadata[k];else p.metadata[k]=clone(m.previousMetadataFields[k]);}
  delete p.metadata.familyAppliancesUpdate;
  return out;
}
module.exports={applyFamilyAppliances,beforeFamilyAppliances,REVISION};
