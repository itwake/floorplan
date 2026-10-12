'use strict';

// Owner-requested Scheme 2 balcony concept. Exterior sheet-metal/guard
// projections are NOT new floor slabs and do not increase the room area.
const assert=require('node:assert/strict');
const REVISION='family-balcony-service-20261012';
const META_KEYS=['designCorrections','conditions','converter'];
const ARCH_KEYS=['ROOMS','WIN_META'];
const ADDED_IDS=['balcony_service_counter','balcony_outer_projection','balcony_robot'];
const clone=structuredClone;
const C={cream:'#F4F1E9',counter:'#F5F4EF',basin:'#F5F7F5',metal:'#9DABA8',tray:'#B8C1BD',drain:'#8C9692'};
function part(f,id,x,y,w,d,z,h,role,label,color=C.cream,material='Cream',extra={}){
  return {id:f.id+'-'+id,x:x-f.cx,y:y-f.cy,w,d,elevationMm:z,heightMm:h,role,label,color,material,face:'north',...extra};
}
function counterParts(f){
  const P=(...args)=>part(f,...args);
  return [
    P('west-support',6890,10450,20,700,0,950,'cabinet-side','20mm独立左支撑'),
    P('middle-support',7350,10450,20,700,0,950,'cabinet-divider','盆机独立分隔支撑'),
    P('east-support',8070,10450,20,700,0,950,'cabinet-side','独立右支撑'),
    // Genuine countertop cutout: no solid countertop crosses the bowl.
    P('top-west',6890,10450,50,700,950,30,'countertop','浅盆左收边',C.counter),
    P('top-east',7300,10450,790,700,950,30,'countertop','烘干机上方连续台面',C.counter),
    P('top-north',6940,10450,360,60,950,30,'countertop','浅盆前沿',C.counter),
    P('top-south',6940,10860,360,290,950,30,'countertop','盆后龙头与管线带',C.counter),
    P('basin-west',6940,10510,12,350,792,188,'basin-wall','360×350浅盆左壁',C.basin,'Basin'),
    P('basin-east',7288,10510,12,350,792,188,'basin-wall','浅盆右壁',C.basin,'Basin'),
    P('basin-north',6952,10510,336,12,792,188,'basin-wall','浅盆前壁',C.basin,'Basin'),
    P('basin-south',6952,10848,336,12,792,188,'basin-wall','浅盆后壁',C.basin,'Basin'),
    P('basin-bottom',6952,10522,336,326,780,12,'basin-bottom','空盆底 · 不叠在烘干机上',C.basin,'Basin'),
    P('basin-drain',7100,10666,40,40,792,2,'basin-drain','排水口概念示意',C.drain,'Metal'),
    P('drain-outlet',7108,10674,24,24,730,50,'drain','浅盆出水管占位',C.drain,'Metal'),
    P('drain-across',7108,10674,236,24,706,24,'drain','高位排水转向 · 存水弯待选型',C.drain,'Metal'),
    P('drain-rear',7320,10674,24,448,706,24,'drain','分隔板西侧排水路线占位',C.drain,'Metal'),
    P('drain-down',7320,11098,24,24,80,626,'drain','机后管线带 · 接地漏未核',C.drain,'Metal'),
    P('faucet-stem',7109,10895,22,22,980,150,'faucet-stem','浅盆独立龙头',C.metal,'Metal'),
    P('faucet-arm',7111,10810,18,100,1112,18,'faucet-arm','朝北出水臂',C.metal,'Metal')
  ];
}
function projectionParts(f){
  const out=[],P=(...args)=>part(f,...args),W=2140,D=2210;
  // Bottom sheet at the OLD parapet top, never at room floor height. This is
  // not a ledge certified for people, equipment, storage, or any other load.
  out.push(P('north-sheet',6870,8940,W,600,1080,20,'sheet-metal-tray','北侧非踩踏铁皮示意',C.tray,'Metal',{nonWalkable:true}),
    P('east-sheet',8410,9540,600,1610,1080,20,'sheet-metal-tray','东侧非踩踏铁皮示意',C.tray,'Metal',{nonWalkable:true}),
    P('north-canopy',6870,8940,W,600,2450,25,'sheet-metal-canopy','北侧铁皮上盖 · 支撑防水待核',C.tray,'Metal',{nonWalkable:true}),
    P('east-canopy',8410,9540,600,1610,2450,25,'sheet-metal-canopy','东侧铁皮上盖',C.tray,'Metal',{nonWalkable:true}));
  function guard(id,x,y,w,d,horizontal){
    const L=horizontal?w:d,n=Math.ceil((L-20)/110),step=(L-20)/n;
    for(let i=0;i<=n;i++)out.push(P(id+'-bar-'+i,x+(horizontal?i*step:0),y+(horizontal?0:i*step),20,20,1100,1350,'guard-bar','外移防盗网竖杆 · 锚固未核',C.metal,'Steel'));
    for(const z of [1100,1775,2430])out.push(P(id+'-rail-'+z,x,y,w,d,z,20,'guard-rail','外移防盗网横框',C.metal,'Steel'));
  }
  guard('north',6870,8940,W,20,true);
  guard('east',8990,8940,20,D,false);
  guard('west-return',6870,8940,20,600,false);
  guard('south-return',8410,11130,600,20,true);
  return out;
}
function applyFamilyBalconyService(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyLivingClearUpdate,'Apply after living-room clearance layer');
  assert.ok(!p.metadata.familyBalconyServiceUpdate,'Balcony service layer already applied');
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const dryer=p.defaultFurniture.find(f=>f.id==='laundry_dryer');
  assert.deepEqual([dryer.cx,dryer.cy,dryer.w,dryer.d,dryer.heightMm,dryer.rot],[7650,10750,600,600,840,180]);
  assert.equal(p.defaultFurniture.length,57);
  for(const id of ADDED_IDS)assert.ok(!p.defaultFurniture.some(f=>f.id===id),'Duplicate '+id);
  const previousFurniture=[clone(dryer)];
  const previousPlanFields=Object.fromEntries(ARCH_KEYS.map(key=>[key,clone(p[key])]));
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(key=>[key,clone(p.metadata[key])]));
  Object.assign(dryer,{cx:7700,layoutRevision:REVISION,sourceFootprintMm:{x:7400,y:10450,w:600,d:600},
    notes:'600×600×840业主尺寸保持，向东微移50mm，仍面北。独立台底950、机顶840，暂留110；台面不压机器。后部100、侧距及散热/机门/软管需按实物说明书核对。'});
  const counter={id:'balcony_service_counter',sourceId:'balcony_service_counter',type:'fixture',nativeType:'vanity',
    name:'阳台1200连续台 · 西盆机器人/东烘干',cx:7490,cy:10800,w:1200,d:700,heightMm:980,elevationMm:0,rot:0,
    baseWidthMm:1200,baseDepthMm:700,baseHeightMm:980,assemblyHeightMm:1130,color:C.cream,face:'north',roomId:'balcony',
    modelVariant:'balcony-service-counter',dimensionStatus:'design-pending',layoutRevision:REVISION,cabinetRevision:REVISION,
    sourceFootprintMm:{x:6890,y:10450,w:1200,d:700},counterHeightMm:980,counterThicknessMm:30,
    underCounterIds:['balcony_robot','laundry_dryer'],
    notes:'完成台高980，台底950；西侧440净宽开放基站位，上方360×350浅盆，东侧烘干机。无柜门、底板或低背板，不挡机器人向北驶出；台面独立支撑，未确认厂家安装净空。',
    conditions:['1200×700台面只占原室内地面，台前模型790mm；台西侧距推拉门内缘20mm，原双扇门洞与轨道不动。',
      '基站先按380×450×500占位，不代表任何实际型号；西侧净宽440，两侧20/40、后部70mm仅几何量，机器人先向北出柜，再经北半门口进厅。',
      '盆在基站上方，不在烘干机上方；盆底780、基站顶500之间280mm仅静态高度差。排水管线示意不代表存水弯、取水箱、开盖及维修已兼容。',
      '台面支架、盆开孔、排水、供水、湿区用电和烘干机散热必须按实际设备及现场深化。阳台模型1420与复尺1240仍差180，禁止按本图直接下单。'],
    cabinetDesign:{revision:REVISION,title:'生活阳台独立承台 · 西盆东烘干',status:'concept-pending-detail',boardThicknessMm:20,counterThicknessMm:30,
      faces:[{face:'north',label:'阳台服务台 · 向北操作',lengthMm:1200,depthMm:700}],
      dimensions:['外包1200×700mm，完成台高980/台底950；龙头顶1130mm。','左基站净宽440mm，浅盆开孔360×350mm；型号及安装余量未核。'],
      features:['两组台下机位真实开放，无底板、柜门和低背板。','盆和排水只在基站侧，不侵占烘干机上方。','独立20mm侧板/分隔支撑示意，不把台面荷载传给机器。']}};
  counter.parts=counterParts(counter);
  const projection={id:'balcony_outer_projection',sourceId:'balcony_outer_projection',type:'fixture',
    name:'北/东外挑600 · 铁皮与防盗网概念',cx:7940,cy:10045,w:2140,d:2210,heightMm:2475,elevationMm:0,rot:0,
    baseWidthMm:2140,baseDepthMm:2210,baseHeightMm:2475,color:C.metal,roomId:'balcony',modelVariant:'balcony-exterior-projection',
    dimensionStatus:'owner-requested-concept',layoutRevision:REVISION,sourceFootprintMm:{x:6870,y:8940,w:2140,d:2210},
    nonWalkable:true,notConstructionApproval:true,exteriorProjectionMm:600,
    notes:'以原外墙外表面为基准：北y9540→8940、东x8410→9010，各600mm。防盗网整体外移并加回框，上下铁皮外挑仅在原矮墙标高，室内地面及面积不扩大。',
    conditions:['原矮墙、边柱、顶梁完整保留；只把原窗面的网框示意移至外挑边缘。北、东面无玻璃或新高柜。',
      '非踩踏、非承载的新外挑概念：不得放机器、储物或站人。本模型未增地面楼板，未确认锚固、抗风、防坠、接缝排水或防水构造。',
      '高层外立面外挑涉及物业/审批、结构与防护条件，必须由专业方现场核验；600仅为业主希望的设计值，不是施工许可。']};
  projection.parts=projectionParts(projection);
  const robot={id:'balcony_robot',sourceId:'balcony_robot',type:'robotvacuum',name:'扫地机+紧凑基站 · 型号待定',
    cx:7120,cy:10855,w:380,d:450,heightMm:500,elevationMm:0,rot:180,color:'#F1F3F0',face:'north',roomId:'balcony',
    modelVariant:'compact-robot-dock',dimensionStatus:'owner-approved-placeholder',layoutRevision:REVISION,
    sourceFootprintMm:{x:6930,y:10630,w:380,d:450},
    applianceDesign:{revision:REVISION,status:'concept-model-pending',dimensionsMm:[380,450,500],actualProductSelected:false},
    notes:'经业主确认，先按380×450×500mm紧凑基站占位；正面向北，机器人向北驶出再经门口进入厅内。实物型号、自动上下水、电源和水箱抽取未核。',
    conditions:['与烘干机之间有独立分隔支撑，机位无底板或柜门，基站不摆在外挑铁皮上。','排水、插座与湿区保护、机器人过门高差、回充路径及维修需按实际型号现场核对。']};
  p.defaultFurniture.push(counter,projection,robot);
  const balcony=p.ROOMS.find(r=>r.id==='balcony');
  balcony.notes='原室内地面与门轴保持：仅烘干机+紧凑扫地机基站，西侧浅盆/连续台。北东600外挑为非踩踏铁皮、防盗网概念，不计入室内面积。复尺1240×1490与模型1420×1490差180及50×150凸处仍待核。';
  const openingIds=['balcony_north_opening','balcony_east_opening'];
  for(const id of openingIds){
    const opening=p.WIN_META.find(w=>w.id===id);assert.ok(opening?.noGlass&&opening.guard,'Expected original guarded open-air opening '+id);
    Object.assign(opening,{noFrame:true,frameRelocatedTo:'balcony_outer_projection',exteriorProjectionMm:600,layoutRevision:REVISION,
      notes:'原矮墙、顶梁及洞口几何保留；窗面旧网框隐藏，防盗网示意随铁皮向外挑600mm。无玻璃，承载、防坠、锚固、防水与外立面审批未核。'});
  }
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-12',sourceIds:['laundry_dryer',...ADDED_IDS,...openingIds],
    description:'仅方案2：北东铁皮/网框向外挑600概念，不扩地面；紧凑基站放门与烘干机之间，西盆东机连续独立台。',sourceSnapshotsUnchanged:true}];
  p.metadata.conditions=[...(p.metadata.conditions||[]),...counter.conditions,...projection.conditions];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-balcony-service-20261012.cjs';
  const migrationFields=Object.fromEntries(previousFurniture.map(old=>[old.id,[...new Set([...Object.keys(old),...Object.keys(dryer)])].filter(k=>k!=='id'&&JSON.stringify(old[k])!==JSON.stringify(dryer[k])).sort()]));
  p.metadata.familyBalconyServiceUpdate={id:REVISION,date:'2026-10-12',title:'方案2 · 阳台外挑概念与机器人服务台',status:'applied-owner-request-concept',
    sourceSnapshotsUnchanged:true,notConstructionApproval:true,addsWalkableFloor:false,exteriorProjectionMm:600,
    originalFloorAreaUnchanged:true,originalWallsAndApertureRectsUnchanged:true,projectionReference:'existing-outer-wall-face',
    oldOuterFacesMm:{northY:9540,eastX:8410},newOuterFacesMm:{northY:8940,eastX:9010},
    basinHoleMm:[6940,10510,7300,10860],counterTopMm:980,counterUndersideMm:950,clearRobotBayWidthMm:440,frontOperatingStripMm:790,
    robotPlaceholderMm:[380,450,500],robotProductConfirmed:false,balconyModelWidthMm:1420,balconyMeasuredWidthMm:1240,unresolvedWidthDifferenceMm:180,
    previousPlanFields,previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:['laundry_dryer'],newFurnitureIds:[...ADDED_IDS],removedFurnitureIds:[],replacedFurnitureIds:[],migrationFields};
  assert.equal(p.defaultFurniture.length,60);
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata',...ARCH_KEYS].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  for(const f of previous.defaultFurniture)if(f.id!==dryer.id)assert.deepEqual(p.defaultFurniture.find(q=>q.id===f.id),f,'Unexpected furniture edit '+f.id);
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized edit');
  assert.deepEqual(beforeFamilyBalconyService(p),previous,'Balcony layer must restore complete previous Scheme 2');
  return bundle;
}
function beforeFamilyBalconyService(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyBalconyServiceUpdate;
  if(!m)return out;
  const original=new Map(m.previousFurniture.map(f=>[f.id,f])),current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(original.get(id)||current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyBalconyServiceUpdate;
  return out;
}
module.exports={applyFamilyBalconyService,beforeFamilyBalconyService,REVISION};
