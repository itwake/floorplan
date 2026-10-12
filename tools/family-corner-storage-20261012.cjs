'use strict';

// Reuse the current shallow L footprint. "800库" is the owner's reference
// style, not a new walk-in room or a claim that the former two vehicles fit.
const assert=require('node:assert/strict');
const {beforeFamilyCeilingLighting}=require('./family-ceiling-lighting-20261012.cjs');
const REVISION='family-corner-storage-20261012';
const CABINET_ID='fit-dining_sideboard_wall';
const META_KEYS=['designCorrections','conditions','converter'];
const REMOVED_PREFIXES=['reference-west-left-tall','reference-west-left-grille','d_return_','d_corner_','reference-upper-blind-bridge'];
const clone=structuredClone;
const C={cream:'#F4F1E9',wood:'#CDB594',metal:'#9D9386',light:'#FFF1CF'};
const r=n=>Math.round(n*1000)/1000;
function part(f,id,x,y,w,d,z,h,role,label,color=C.cream,material='Cream',face='east',extra={}){
  return {id,x:r(x-f.cx),y:r(y-f.cy),w:r(w),d:r(d),elevationMm:r(z),heightMm:r(h),role,label,color,material,face,...extra};
}
function cornerParts(f){
  const out=[],P=(...args)=>part(f,...args);
  // End uprights and outer-wall backs only: NO central post/partition at the
  // concave corner. The storage cavity remains a connected, shallow L.
  out.push(P('corner800-west-back',2125,12730,18,1160,0,2700,'cabinet-back','西侧18mm背板'),
    P('corner800-south-back',2143,13872,1182,18,0,2700,'cabinet-back','南侧连续18mm背板',C.cream,'Cream','north'),
    P('corner800-north-end',2143,12730,364,18,0,2700,'cabinet-side','转角库北端独立侧板'),
    P('corner800-east-end',3307,13508,18,364,0,2700,'cabinet-side','转角库东端独立侧板',C.cream,'Cream','north'),
    P('corner800-north-hinge-stile',2507,12730,18,10,0,2700,'outer-hinge-stile','北端10mm固定收口 · 不立内角柱'),
    P('corner800-east-hinge-stile',3255,13490,70,18,0,2700,'outer-hinge-stile','南面外端70mm固定收口',C.cream,'Cream','north'),
    P('corner800-west-plinth',2143,13820,364,52,0,62,'plinth-support','低底座支撑 · 不立中柱'),
    P('corner800-south-plinth',2507,13820,800,52,0,62,'plinth-support','南臂底座支撑',C.cream,'Cream','north'));
  function boards(z,role,label,color=C.cream,material='Cream'){
    const west=P('corner800-'+role+'-west-'+z,2143,12748,364,1124,z,18,role,label+' · 西臂',color,material);
    const south=P('corner800-'+role+'-south-'+z,2507,13508,800,364,z,18,role,label+' · 南臂',color,material,'north');
    out.push(west,south);return [west,south];
  }
  boards(62,'cabinet-bottom','连通L形底板 · 完成高80',C.wood,'OakLight');
  boards(2682,'cabinet-top','通顶L形18mm顶板');
  // Bottom bay remains clear from 80 to 950. These high shelves and thin LED
  // diffusers are illustrative; support, load and hinges need a cabinet maker.
  for(const z of [950,1350,1750,2100,2400]){
    const [west,south]=boards(z,'corner-shelf','L形可调层板',C.wood,'OakLight');
    if([1350,2100,2400].includes(z))out.push(
      P('corner800-led-west-'+z,2464,12772,8,1076,z-4,4,'led-strip','层板底面暖光 · 西臂',C.light,'Light','east',{anchorPartId:west.id,anchor:'panel-underside',insetMm:35,lightWash:false}),
      P('corner800-led-south-'+z,2531,13543,752,8,z-4,4,'led-strip','层板底面暖光 · 南臂',C.light,'Light','north',{anchorPartId:south.id,anchor:'panel-underside',insetMm:35,lightWash:false}));
  }
  for(const y of [12900,13650])out.push(P('corner800-rail-west-'+y,2143,y,12,18,950,1520,'shelf-adjustment-rail','背板层板调节轨 · 固定/承重待核',C.metal,'Metal'));
  for(const x of [2750,3120])out.push(P('corner800-rail-south-'+x,x,13860,18,12,950,1520,'shelf-adjustment-rail','南臂调节轨',C.metal,'Metal','north'));
  const definitions=[
    {group:'west',face:'east',x:2507,y:12741.5,w:18,d:747,hinge:[2525,12741.5],closed:[0,1],open:[1,0],length:747,order:0,sign:-1,normalOffset:9},
    {group:'south',face:'north',x:2526.5,y:13490,w:727,d:18,hinge:[3253.5,13490],closed:[-1,0],open:[0,-1],length:727,order:1,sign:1,normalOffset:-9}
  ];
  for(const q of definitions)for(const tier of [{id:'lower',z:81.5,h:2017},{id:'upper',z:2101.5,h:597}])out.push(
    P('corner800-door-'+q.group+'-'+tier.id,q.x,q.y,q.w,q.d,tier.z,tier.h,'door-hinged','转角库奶白'+(tier.id==='upper'?'上门':'长门')+' · '+(q.group==='west'?'先开后关':'后开先关'),C.cream,'Cream',q.face,
      {doorStyle:'hinged',panelIndex:q.order,cornerDoorTier:tier.id,cabinetDoor:{group:q.group,sequenceOrder:q.order,
        hingeMm:[r(q.hinge[0]-f.cx),r(q.hinge[1]-f.cy)],closedDirection:q.closed,openDirection:q.open,lengthMm:q.length,
        thicknessMm:18,normalOffsetMm:q.normalOffset,frontSign:q.sign,handleStyle:'recessed',handleElevationMm:tier.id==='lower'?1050:300}}));
  return out;
}
function remainingReturnParts(f){
  const P=(...args)=>part(f,...args),out=[];
  // The original 1225-mm sliding return crossed the new pantry boundary.
  // Retain the 425-mm eastern section, with real thin boards and a lower slide.
  for(const [suffix,x]of [['west',3325],['east',3732]])out.push(P('corner-return-base-side-'+suffix,x,13532,18,358,0,832,'cabinet-side','425返柜18mm侧板',C.cream,'Cream','north'));
  out.push(P('corner-return-base-back',3343,13872,389,18,0,832,'cabinet-back','返柜背板',C.cream,'Cream','north'),
    P('corner-return-base-bottom',3343,13532,389,340,0,18,'cabinet-bottom','返柜底板',C.cream,'Cream','north'));
  for(const z of [290,560])out.push(P('corner-return-shelf-'+z,3343,13532,389,340,z,18,'cabinet-shelf','返柜可调层板',C.cream,'Cream','north'));
  for(let i=0;i<2;i++)out.push(P('corner-return-lower-door-'+i,3326.5+i*212.5,13490+i*20,209.5,18,1.5,829,'door-sliding','返柜奶白滑门 · 不向过道外开',C.cream,'Cream','north',{doorStyle:'sliding',panelIndex:i}));
  out.push(P('corner-return-counter',3325,13490,425,400,832,18,'wood-countertop','保留425返柜850高原木台面',C.wood,'OakLight','north'),
    P('corner-return-niche-back',3325,13872,425,18,850,650,'niche-back','保留奶白中空背板',C.cream,'Cream','north'));
  for(const [suffix,x]of [['west',3325],['east',3732]])out.push(P('corner-return-upper-side-'+suffix,x,13630,18,260,1500,1200,'cabinet-side','返柜通顶吊柜侧板',C.cream,'Cream','north'));
  const bottom=P('corner-return-upper-bottom',3343,13630,389,242,1500,18,'cabinet-bottom','保留吊柜底板',C.wood,'OakLight','north');
  out.push(P('corner-return-upper-back',3343,13872,389,18,1500,1200,'cabinet-back','返柜吊柜背板',C.cream,'Cream','north'),bottom,
    P('corner-return-upper-top',3343,13630,389,242,2682,18,'cabinet-top','返柜吊柜顶板',C.cream,'Cream','north'),
    P('corner-return-upper-shelf',3343,13630,389,242,2100,18,'cabinet-shelf','返柜吊柜层板',C.wood,'OakLight','north'),
    P('corner-return-upper-door',3326.5,13610,422,18,1501.5,1197,'door-hinged','返柜原木吊柜门',C.wood,'OakLight','north',{doorStyle:'hinged',panelIndex:0}),
    P('corner-return-light',3351,13665,373,8,1496,4,'led-strip','保留返柜吊柜底面暖光',C.light,'Light','north',{anchorPartId:bottom.id,anchor:'panel-underside',insetMm:35,lightWash:false}));
  return out;
}
function applyFamilyCornerStorage(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyBalconyServiceUpdate,'Apply after balcony service layer');
  assert.ok(!p.metadata.familyCornerStorageUpdate,'Corner storage layer already applied');
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const f=p.defaultFurniture.find(f=>f.id===CABINET_ID);assert.ok(f?.parts&&f.cabinetRevision==='sideboard-reference-v2');
  assert.deepEqual([f.cx,f.cy,f.w,f.d,f.heightMm],[2937.5,11245,1625,5290,2700]);
  const original=clone(f),previousMetadataFields=Object.fromEntries(META_KEYS.map(key=>[key,clone(p.metadata[key])]));
  const preserved=f.parts.filter(part=>!REMOVED_PREFIXES.some(prefix=>part.id.startsWith(prefix)));
  f.parts=[...preserved,...cornerParts(f),...remainingReturnParts(f)];
  Object.assign(f,{name:'通顶餐边柜 · 两面开门转角800库',layoutRevision:REVISION,cornerDoorOpen:false,
    notes:original.notes+' 2026-10-12：西南转角改连通浅型800库，400柜深与入户占地保持；底部80–950高件区，上方L形层板和暖光。两面门采用内嵌扣手，西门先开、南门后开，关闭反向；合页、限位、防夹和承重待厂家深化。',
    cornerDoorDesign:{revision:REVISION,status:'concept-hardware-pending',openingSequence:['west','south'],closingSequence:['south','west'],
      partIds:f.parts.filter(part=>part.cabinetDoor).map(part=>part.id),hingeOpeningDegrees:90,
      focusBoundsMm:[2125-f.cx,12730-f.cy,3325-f.cx,13890-f.cy],
      notes:'两面门不能同时从闭合位置等速外开；先开西门，再开南门，关门反向。合页、拉手、顺序联动/限位与防夹必须由定制方选型验证。'},
    sourceNotes:'2026-10-12用户参考图：只把方案2西南餐边柜转角改成通顶、两面开门、连通层板的浅型800库。沿原400mm柜深和L占地，不增步入房间，不恢复旧独立储物库。'});
  f.cabinetDesign={...clone(f.cabinetDesign),revision:REVISION,layoutRevision:REVISION,title:'通顶餐边柜 · 连通L形转角800库',
    sourceReference:'用户提供转角800库照片及西南角标注 · 2026-10-12',
    faces:f.cabinetDesign.faces.map(face=>face.face==='north'?{...face,label:'南返柜 · 转角库及425mm保留餐台'}:clone(face)),
    features:[...original.cabinetDesign.features.slice(0,4),
      '西南端原滑门高柜、格栅和盲角改成奶白两面开门转角库；内角无中立柱，连通L形原木层板与暖光。',
      '西面门约747mm、南面门约727mm，外端收口10/70mm；分长门和上门，采用内嵌扣手，开启西侧在先，南侧在后，关闭反向。',
      '柜内底板完成高80，第一层板950，底部留约870mm高件收纳区；上方950/1350/1750/2100/2400mm层板高度为概念。',
      '南返柜东端保留425mm奶白滑门地柜、850mm原木台面、中空和通顶原木吊柜/灯带，入户通道及餐桌椅不动。'],
    dimensions:[...original.cabinetDesign.dimensions,
      '转角库沿西臂1160、南臂1200mm外包（含400盲角）；两臂400深，L形毛占地0.784㎡，不是1200×1160实心房间。',
      '仅为浅型连通储物柜，层板净深约364mm；不保证步入或儿童车/折叠婴儿车收纳，不能按800名称推断深度。'],
    layoutAdaptations:{...clone(original.cabinetDesign.layoutAdaptations),cornerStorage:{revision:REVISION,walkIn:false,
      grossFootprintMm2:784000,depthMm:400,westFrontLengthMm:760,southFrontLengthMm:800,remainingReturnLengthMm:425,
      noCenterPost:true,lowClearHeightMm:870,openingSequence:['west','south'],simultaneousOpeningApproved:false}}};
  f.conditions=[...original.conditions.filter(t=>!t.includes('盲角')&&!t.includes('南上柜')),
    '转角库是400mm深两臂连通的浅型L柜，不是步入式储物间；不增加入户占地、不改墙门窗，也不保证容纳此前两辆车。',
    '内转角无中立柱，合页在两外端；西门先开、南门后开，关闭反向。独立同时外开会互撞，需顺序联动/限位、门板重量与防夹设计，模型顺序动画不是五金安装批准。',
    '模型开门范围不碰餐桌椅或室内入户门；距南餐椅约355mm只是门扫纵向间隔，不代表站位或能同时取物通行。',
    '18mm板、调节轨、L形拼接和层板灯带均为构造示意；承重、背板锚固、防倾倒、门缝/踢脚线、通顶收口与下单尺寸由定制方现场深化。'];
  const migrationFields=Object.fromEntries([[f.id,[...new Set([...Object.keys(original),...Object.keys(f)])].filter(key=>key!=='id'&&JSON.stringify(original[key])!==JSON.stringify(f[key])).sort()]]);
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-12',sourceIds:[CABINET_ID],
    description:'方案2餐边柜西南转角参考照片做通顶连通浅型800库，两面柜门顺序开合、底部高件区和L形层板；不扩占地，不复原旧独立800库。',sourceSnapshotsUnchanged:true}];
  p.metadata.conditions=[...(p.metadata.conditions||[]),...f.conditions.slice(-4)];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-corner-storage-20261012.cjs';
  p.metadata.familyCornerStorageUpdate={id:REVISION,date:'2026-10-12',title:'方案2 · 两面开门转角800库',status:'applied-owner-request-concept',
    sourceSnapshotsUnchanged:true,architectureUnchanged:true,furnitureEnvelopeUnchanged:true,notHardwareApproval:true,walkIn:false,
    cornerFootprintPolygonsMm:[[[2125,12730],[2525,12730],[2525,13890],[2125,13890]],[[2525,13490],[3325,13490],[3325,13890],[2525,13890]]],
    grossFootprintMm2:784000,depthMm:400,remainingReturnRectMm:[3325,13490,3750,13890],openingSequence:['west','south'],simultaneousOpeningApproved:false,
    preservedPartIds:preserved.map(p=>p.id),removedPartPrefixes:[...REMOVED_PREFIXES],
    previousPlanFields:{},previousFurniture:[original],previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:[CABINET_ID],newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],preserveCustomSizeIds:[CABINET_ID],migrationFields};
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized architecture edit');
  for(const old of previous.defaultFurniture)if(old.id!==CABINET_ID)assert.deepEqual(p.defaultFurniture.find(q=>q.id===old.id),old,'Unexpected object edit '+old.id);
  for(const part of preserved)assert.deepEqual(f.parts.find(q=>q.id===part.id),original.parts.find(q=>q.id===part.id),'Unrelated cabinet module changed '+part.id);
  for(const part of f.parts){assert.ok(part.x>=-f.w/2&&part.y>=-f.d/2&&part.x+part.w<=f.w/2+.001&&part.y+part.d<=f.d/2+.001,'Part outside old envelope '+part.id);}
  assert.equal(new Set(f.parts.map(p=>p.id)).size,f.parts.length,'Unique part IDs');
  for(const part of f.parts.filter(p=>p.role==='led-strip')){const anchor=f.parts.find(p=>p.id===part.anchorPartId);assert.ok(anchor&&Math.abs(part.elevationMm+part.heightMm-anchor.elevationMm)<.001,'LED not anchored '+part.id);}
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized change');
  assert.deepEqual(beforeFamilyCornerStorage(p),previous,'Corner layer exact previous-model rollback');
  return bundle;
}
function beforeFamilyCornerStorage(value){
  const out=beforeFamilyCeilingLighting(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyCornerStorageUpdate;
  if(!m)return out;
  const original=new Map(m.previousFurniture.map(f=>[f.id,f])),current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(original.get(id)||current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyCornerStorageUpdate;
  return out;
}
module.exports={applyFamilyCornerStorage,beforeFamilyCornerStorage,REVISION,CABINET_ID};
