'use strict';

// SD01/SD02 electrical LOCATION AND FUNCTIONAL-CONTROL overlay. Source
// drawings are not a site survey, selected faceplate product, or wiring design.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const REVISION='family-drawing-electrical-20261027',META_KEY='familyDrawingElectricalUpdate',clone=structuredClone;
const FACE_ROT={south:0,west:90,north:180,east:270},round=n=>Math.round(n*1000)/1000;
const SOURCE={file:'业主提供施工图.pdf',pages:[28,29,30],sheets:['SD-01','SD-02','SD-03'],
  status:'drawing-intent-not-measured-or-approved',symbolCentersNotExtractedFromTextInsertionPoints:true};
const changedFields=(a,b)=>[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].filter(k=>k!=='id'&&!isDeepStrictEqual(a?.[k],b?.[k])).sort();
function rect(f){const a=(f.rot||0)*Math.PI/180,c=Math.abs(Math.cos(a))<1e-10?0:Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a))<1e-10?0:Math.abs(Math.sin(a)),w=f.w*c+f.d*s,d=f.w*s+f.d*c;return{x:round(f.cx-w/2),y:round(f.cy-d/2),w:round(w),d:round(d)};}
function roomBounds(p,id){const q=p.ROOMS.find(r=>r.id===id);assert.ok(q?.poly?.length,'Electrical room '+id);const xs=q.poly.map(v=>v[0]),ys=q.poly.map(v=>v[1]);return{west:Math.min(...xs),east:Math.max(...xs),north:Math.min(...ys),south:Math.max(...ys),height:q.heightMm};}
function worldPart(f,q){const a=(f.rot||0)*Math.PI/180,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a));assert.ok(Math.abs(c)+Math.abs(s)===1,'Electrical cabinet host must be cardinal '+f.id);const lx=q.x+q.w/2,ly=q.y+q.d/2,w=Math.abs(q.w*c)+Math.abs(q.d*s),d=Math.abs(q.w*s)+Math.abs(q.d*c),cx=f.cx+lx*c-ly*s,cy=f.cy+lx*s+ly*c;return{x:round(cx-w/2),y:round(cy-d/2),w:round(w),d:round(d),bottom:(f.elevationMm||0)+q.elevationMm,top:(f.elevationMm||0)+q.elevationMm+q.heightMm};}
function pointId(code){return'family-elec-'+code.toLowerCase();}
const roomLamp=roomId=>({kind:'room-lamp',roomId}),item=id=>({kind:'furniture',id});
function buildParts(f,prototype,count=1){
  const src=prototype.parts;assert.ok(src?.length,'Electrical prototype must contain visible faceplate geometry');
  f.w=86*count;f.d=8;f.heightMm=86;f.baseWidthMm=f.w;f.baseDepthMm=8;f.baseHeightMm=86;
  f.parts=[];
  for(let i=0;i<count;i++)for(const q of src){const oldId=q.id.startsWith(prototype.id)?q.id.slice(prototype.id.length).replace(/^-/,''):q.id;
    f.parts.push({...clone(q),id:f.id+'-drawing-unit-'+i+'-'+oldId,x:round(q.x+(i-(count-1)/2)*86),
      label:(q.label||q.role)+' · '+(i+1)+'/'+count+'单元（制式待选）'});}
  f.electricalDesign={...clone(f.electricalDesign),visibleFaceplateModules:count,nominalModuleDimensionsMm:[86,8,86],
    selectedProduct:false,backBoxesModeled:false,multipleOutletGroup:count>1};
}
function completePoint(f,spec,anchor){
  const d=clone(f.electricalDesign),[x,y]=spec.position;
  Object.assign(f,{cx:round(x),cy:round(y),rot:FACE_ROT[spec.face],face:spec.face,roomId:spec.roomId||f.roomId,
    elevationMm:spec.heightMm-f.heightMm/2,layoutRevision:REVISION,dimensionStatus:'drawing-intent-model-host-not-site-survey'});
  f.sourceFootprintMm=rect(f);f.electricalDesign={...d,layoutRevision:REVISION,centerHeightMm:spec.heightMm,face:spec.face,
    mountingRoomId:spec.roomId||f.roomId,anchor,installationApproved:false,wiringModeled:false,productSelected:false,
    circuitConfirmed:false,protectiveMeasuresConfirmed:false,
    drawingEvidence:{source:clone(SOURCE),heightStatus:spec.heightStatus||'SD02-labelled-height',heightMm:spec.heightMm,
      ...(spec.handle?{textHandle:spec.handle}:{}),positionStatus:spec.positionStatus||'room-or-service-relative-drawing-location-pending-final-datum',
      textPositionIsNotOutletPosition:true},
    ...(spec.extra||{})};
  if(spec.purpose){f.electricalDesign.purpose=spec.purpose;f.name=f.electricalDesign.code+' · '+spec.purpose;}
  f.notes='2026-10-27：'+(spec.note||'依据施工图用途与新模型安装面重新锚定。')+' 面板外形仅86mm单元组合示意，非已选暗盒；线缆、回路和涉水保护未批准。';
  return f;
}
function wallPoint(p,f,plane,along,face,heightMm,extra={}){
  const vertical=face==='east'||face==='west',span=f.w,edge=span/2;
  const candidates=p.WALLS.map((w,i)=>({w,i})).filter(({w})=>{
    const v=face==='east'?w[2]:face==='west'?w[0]:face==='south'?w[3]:w[1];
    return Math.abs(v-plane)<.02&&(vertical?w[3]-w[1]:w[2]-w[0])>=span-.02;
  }).map(({w,i})=>{const lo=(vertical?w[1]:w[0])+edge,hi=(vertical?w[3]:w[2])-edge,t=Math.min(hi,Math.max(lo,along));return{w,i,t,distance:Math.abs(t-along)};}).sort((a,b)=>a.distance-b.distance);
  assert.ok(candidates.length,'No solid model face for '+f.id+' at '+face+' '+plane);
  const host=candidates[0],position=vertical?[plane+(face==='east'?4:-4),host.t]:[host.t,plane+(face==='south'?4:-4)];
  return completePoint(f,{...extra,heightMm,face,position}, {kind:'wall',wallIndex:host.i,wallRectMm:clone(host.w),surfaceVerifiedAgainstCurrentModel:true,
    siteVerified:false,requestedAlongMm:along,clampedAlongMm:host.t,relocationToSolidHostMm:round(host.t-along),drawingHostRecheckRequired:false});
}
function windowPoint(p,f,windowId,along,face,heightMm,kind,extra={}){
  const i=p.WIN_META.findIndex(m=>m.id===windowId),m=p.WIN_META[i],w=p.WINS[i];assert.ok(m&&w,'Window electrical host missing '+windowId);
  const a=m.sourceAxisMm,vertical=face==='east'||face==='west',lo=vertical?Math.min(a[1],a[3]):Math.min(a[0],a[2]),hi=vertical?Math.max(a[1],a[3]):Math.max(a[0],a[2]);
  const t=Math.max(lo+f.w/2,Math.min(hi-f.w/2,along)),plane=face==='north'?Math.min(w[1],w[3]):face==='south'?Math.max(w[1],w[3]):face==='west'?Math.min(w[0],w[2]):Math.max(w[0],w[2]);
  const sill=m.sillMm,head=m.headMm??sill+m.heightMm;
  assert.ok(kind==='window-sill'?heightMm+43<=sill+.01:heightMm-43>=head-.01,'Electrical plate is on glass '+f.id);
  const position=vertical?[plane+(face==='east'?4:-4),t]:[t,plane+(face==='south'?4:-4)];
  return completePoint(f,{...extra,face,heightMm,position},{kind,windowId,sourceAxisMm:clone(a),sourceWindowRectMm:clone(w),surfaceVerifiedAgainstCurrentModel:true,
    aboveWindowHeadMm:kind==='window-lintel'?heightMm-43-head:null,belowWindowSillMm:kind==='window-sill'?sill-heightMm-43:null,siteVerified:false});
}
function cabinetPoint(p,f,hostId,partId,along,heightMm,face,extra={}){
  const host=p.defaultFurniture.find(q=>q.id===hostId),q=host?.parts?.find(q=>q.id===partId);assert.ok(host&&q,'Electrical cabinet host missing '+hostId+'/'+partId);
  const w=worldPart(host,q),vertical=face==='west'||face==='east',lo=vertical?w.y:w.x,hi=lo+(vertical?w.d:w.w),t=Math.max(lo+f.w/2,Math.min(hi-f.w/2,along));
  assert.ok(hi-lo>=f.w-.01,'Cabinet back too short for plate '+f.id);assert.ok(heightMm-43>=w.bottom-.01&&heightMm+43<=w.top+.01,'Cabinet plate outside backing height '+f.id);
  const plane=face==='west'?w.x:face==='east'?w.x+w.w:face==='north'?w.y:w.y+w.d;
  const position=vertical?[plane+(face==='east'?4:-4),t]:[t,plane+(face==='south'?4:-4)];
  const a=(host.rot||0)*Math.PI/180,dx=position[0]-host.cx,dy=position[1]-host.cy;
  return completePoint(f,{...extra,face,heightMm,position},{kind:'cabinet-part',furnitureId:hostId,partId,localCenterMm:[round(dx*Math.cos(a)+dy*Math.sin(a)),round(-dx*Math.sin(a)+dy*Math.cos(a)),heightMm-(host.elevationMm||0)],
    baseHostDimensionsMm:[host.w,host.d,host.heightMm],hostRotationDegrees:host.rot||0,surfaceVerifiedAgainstCurrentModel:true,
    siteVerified:false,cabinetBoxAndPenetrationPending:true,nominalPartWorldRectMm:[w.x,w.y,w.x+w.w,w.y+w.d],backingHeightMm:[w.bottom,w.top]});
}
function validateFamilyDrawingElectrical(p){
  const points=p.defaultFurniture.filter(f=>f.electricalDesign),errors=[],codes=new Set();
  for(const f of points){const d=f.electricalDesign;if(codes.has(d.code))errors.push('Duplicate code '+d.code);codes.add(d.code);
    if(!d.anchor?.surfaceVerifiedAgainstCurrentModel)errors.push('Unverified model host '+f.id);
    if(Math.abs(f.elevationMm+f.heightMm/2-d.centerHeightMm)>.001)errors.push('Height mismatch '+f.id);
    if(![0,90,180,270].includes(f.rot))errors.push('Non-cardinal panel '+f.id);
    if(new Set(f.parts.map(q=>q.id)).size!==f.parts.length)errors.push('Duplicate panel part '+f.id);
    for(const q of f.parts)if(q.x < -f.w/2-.01||q.x+q.w>f.w/2+.01||q.y < -4-.01||q.y+q.d>4+.01||q.elevationMm<0||q.elevationMm+q.heightMm>86+.01)errors.push('Panel part outside envelope '+q.id);
    if(d.installationApproved!==false||d.wiringModeled!==false)errors.push('Electrical overlay cannot approve real installation '+f.id);
  }
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const a=points[i],b=points[j],ra=rect(a),rb=rect(b);
    if(Math.min(ra.x+ra.w,rb.x+rb.w)>Math.max(ra.x,rb.x)+.01&&Math.min(ra.y+ra.d,rb.y+rb.d)>Math.max(ra.y,rb.y)+.01&&
      Math.min(a.elevationMm+a.heightMm,b.elevationMm+b.heightMm)>Math.max(a.elevationMm,b.elevationMm)+.01)errors.push('Panel overlap '+a.id+'/'+b.id);
  }
  // A verified wall host alone is insufficient when a new cabinet back,
  // mirror, transverse board or appliance occupies the same visible volume.
  const overlaps=[];
  const cross=(a,b)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+.01&&Math.min(a.y+a.d,b.y+b.d)>Math.max(a.y,b.y)+.01&&Math.min(a.top,b.top)>Math.max(a.bottom,b.bottom)+.01;
  for(const f of points){const a={...rect(f),bottom:f.elevationMm,top:f.elevationMm+f.heightMm};
    for(const other of p.defaultFurniture.filter(o=>!o.electricalDesign)){
      const boxes=other.parts?.map(q=>({...worldPart(other,q),id:q.id}))||[{...rect(other),bottom:other.elevationMm||0,top:(other.elevationMm||0)+other.heightMm,id:other.id}];
      for(const b of boxes)if(cross(a,b))overlaps.push({pointId:f.id,furnitureId:other.id,partId:b.id});
    }
  }
  for(const o of overlaps)errors.push('Visible plate intersects furniture '+o.pointId+'/'+o.partId);
  const groups=p.metadata[META_KEY]?.groups||[];for(const g of groups)for(const id of g.controlPointIds){const f=points.find(f=>f.id===id);if(!f||!f.electricalDesign.groupIds.includes(g.id))errors.push('Control group incomplete '+g.id+'/'+id);}
  return{ok:errors.length===0,errors,visiblePointGroups:points.length,visibleFaceplateModules:points.reduce((n,f)=>n+(f.electricalDesign.visibleFaceplateModules||1),0),
    nonElectricalBodyCrossings:overlaps,sourcePositionStatus:'drawing-relative-model-surface-not-site-survey',wiringModeled:false,installationApproved:false};
}
function applyFamilyDrawingElectrical(value,options={}){
  const p=value.schemes?.family||value;assert.ok(p.defaultFurniture&&p.ROOMS&&p.WALLS&&p.metadata.familyElectricalUpdate,'Apply after original electrical layer');
  assert.ok(!p.metadata[META_KEY],'Drawing electrical overlay already applied');const old=clone(p),get=id=>p.defaultFurniture.find(f=>f.id===id),byCode=c=>get(pointId(c));
  const protoSocket=clone(byCode('P01')),protoSwitch=clone(byCode('S02')),protoMulti=clone(byCode('S14'));
  const newIds=[];
  function add(code,kind,prototype,purpose,served=[]){assert.ok(!byCode(code),'New electrical code already exists '+code);const f=clone(prototype);f.id=pointId(code);f.sourceId=f.id;
    f.electricalDesign={...clone(prototype.electricalDesign),kind,code,purpose,servedFurnitureIds:served,groupIds:[],controlTargets:[],anchor:{}};f.name=code+' · '+purpose;p.defaultFurniture.push(f);newIds.push(f.id);return f;}
  add('S15','switch',protoSwitch,'主卧北床头 · 主灯三处控制');
  const shoe=get('fit-entry_shoe_station'),oldP16=p.metadata.familyElectricalUpdate.existingPoints.find(q=>q.code==='P16'),oldPart=shoe?.parts?.find(q=>q.id===oldP16?.hostPartId);
  const reusedP16=Boolean(oldPart);if(!reusedP16)add('P16','socket',protoSocket,'玄关鞋柜中空 · 原手机充电用途保留');
  add('P37','socket',protoSocket,'主卧北床头 · 图示两处电源',['drawing-night-a-north']);
  const banks={P01:2,P02:2,P05:2,P06:2,P13:4,P15:2,P30:2,P33:2,P37:2};
  for(const f of p.defaultFurniture.filter(f=>f.electricalDesign))buildParts(f,f.electricalDesign.kind==='switch'?protoSwitch:f.electricalDesign.kind==='socket'?protoSocket:f,banks[f.electricalDesign.code]||1);
  const A=roomBounds(p,'room_a'),B=roomBounds(p,'room_b'),C=roomBounds(p,'room_c'),L=roomBounds(p,'living'),K=roomBounds(p,'kitchen');
  const spec=(roomId,extra={})=>({roomId,...extra}),S=(c,plane,along,face,z,extra={})=>wallPoint(p,byCode(c),plane,along,face,z,extra),
    doorH={heightStatus:'SD03-general-switch-height-not-individual-SD01-measurement'};
  S('S01',A.west,3410,'east',1350,spec('room_a',{...doorH,purpose:'主卧门侧 · 主灯三处控制'}));
  S('S02',A.east,A.north+2690,'west',700,spec('room_a',{heightStatus:'bedside-cluster-height-adapted-from-SD02/pending-switch-confirmation',purpose:'主卧南床头 · 主灯三处控制'}));
  S('S15',A.east,A.north+390,'west',700,spec('room_a',{heightStatus:'bedside-cluster-height-adapted-from-SD02/pending-switch-confirmation'}));
  S('S03',B.south,2440,'north',1350,spec('room_b',doorH));S('S04',B.west,B.south-400,'east',700,spec('room_b',{heightStatus:'bedside-cluster-switch-height-pending'}));
  S('S05',C.east,4990,'west',1350,spec('room_c',doorH));S('S06',C.north,C.west+300,'south',1350,spec('room_c',{...doorH,note:'保留原书房双控用途，高于现沙发及未来床头暂估高度；图纸开关分线与高度须深化。'}));
  S('S08',3530,3415,'west',1350,spec('living',{...doorH,purpose:'卧室走廊 · 客厅及餐厅各一路双控'}));
  S('S10',5050,4240,'west',1350,spec('room_a',{...doorH,purpose:'主卫门外 · 照明与浴霸遥控功能预留',extra:{remoteControlIntent:true}}));
  S('S11',3530,6090,'west',1350,spec('living',{...doorH,purpose:'客卫门外 · 照明与浴霸遥控功能预留',extra:{remoteControlIntent:true}}));
  S('S12',5470,13260,'west',1350,spec('living',{...doorH,purpose:'厨房门外 · 照明／凉霸功能预留'}));
  S('S13',11160,6650,'north',1350,spec('living',{...doorH,purpose:'生活阳台照明 · 厅侧开关'}));
  for(const[c,y]of[['S07',13410],['S09',13530],['S14',13650],...(!reusedP16?[['P16',13770]]:[])])cabinetPoint(p,byCode(c),shoe.id,'e_key_niche-niche-back',y,1200,'west',
    spec('living',{heightStatus:'retained-owner-cabinet-control-height-not-SD02-specific',...(c==='S09'?{purpose:'餐厅吊灯 · 入户侧双控'}:{})}));
  S('P01',A.east,A.north+2870,'west',700,spec('room_a',{handle:249348}));S('P37',A.east,A.north+180,'west',700,spec('room_a',{handle:249349}));
  S('P02',A.west,A.north+350,'east',1000,spec('room_a'));S('N01',A.west,A.north+650,'east',1000,spec('room_a'));
  S('P04',A.west,A.north+3220,'east',350,spec('room_a',{heightStatus:'SD02-general-low-outlet/old-purpose-retained',note:'原衣柜备用用途移至柜南端实墙，避免藏在新2220封闭柜后。'}));
  S('P05',B.west,B.south-200,'east',700,spec('room_b'));S('P06',B.west,B.north+300,'east',1000,spec('room_b'));
  S('N02',B.west,B.north+650,'east',1000,spec('room_b'));S('P08',B.east,B.north+2300,'west',350,spec('room_b',{heightStatus:'SD02-general-low-outlet/old-purpose-retained'}));
  for(const[c,x]of[['P09',C.west+330],['P10',C.west+830],['N03',C.west+1100]])S(c,C.south,x,'north',1000,spec('room_c',{handle:c==='N03'?249331:249330}));
  S('P11',C.north,C.west+80,'south',350,spec('room_c',{note:'图示低位用途放沙发北墙左侧露出段，避开1900宽沙发实体；未来床和电源线可达性另核。'}));
  for(const[c,roomId,windowId]of[['P03','room_a','window_a'],['P07','room_b','window_b']]){
    const ac=get('family-acwall-'+roomId),q=rect(ac);windowPoint(p,byCode(c),windowId,q.x+q.w+100,'south',2300,'window-lintel',spec(roomId));}
  S('P12',C.west,5230,'east',2300,spec('room_c',{note:'保留书房西窗侧空调用途，放真实窗南侧实墙，避开窗玻璃及空调机身。'}));
  const tv=get('family-f7'),sofa=get('family-f6'),ac=get('family-living-aircon');
  S('P13',6310,tv.cx-650,'south',550,spec('living',{handle:249311,purpose:'电视服务位 · 图示四组电源',extra:{concealedConduitIntent:{diameterMm:50,heightMm:1000,sourceTextHandle:249310,modeled:false}}}));
  S('N04',6310,tv.cx-1050,'south',550,spec('living',{handle:249312,purpose:'电视服务位 · 网络／IPTV用途'}));
  S('P18',6310,3650,'south',350,spec('living',{heightStatus:'retained-cleaning-purpose/SD02-general-low-outlet'}));
  S('P14',6800,ac.cy+500,'west',2300,spec('living',{note:'按SD02空调插座2300意向，高于柜机；线长、插拔及柜机型号另核。'}));
  S('P15',6800,sofa.cy,'west',350,spec('living'));S('P17',6800,sofa.cy-250,'west',350,spec('living',{heightStatus:'old-spare-purpose/SD02-general-low-outlet'}));
  const dining=get('fit-dining_sideboard_wall');
  for(const[i,kind]of['blender','temperaturekettle','sterilizer','healthkettle','waterdispenser'].entries()){
    const f=get('family-sideboard-'+kind);cabinetPoint(p,byCode('P'+(19+i)),dining.id,'reference-west-central-niche-back',f.cy,1200,'east',
      spec('living',{purpose:byCode('P'+(19+i)).electricalDesign.purpose,note:'图示餐边轨道H1200意向；保留五台原家电服务用途。各取电模块、同时使用负荷、蒸汽和插拔净空待核。',
        extra:{trackPowerIntent:true,trackSelected:false,applianceAccessPending:true}}));
  }
  const fridge=get('kitchen_fridge'),dw=get('kitchen_dishwasher'),hood=get('kitchen_hood'),heater=get('kitchen_heater');
  cabinetPoint(p,byCode('P24'),'fit-kitchen-20261005','drawing-kitchen-fridge-bay-bridge-back',fridge.cx,2100,'south',
    spec('kitchen',{purpose:'冰箱上方检修用途电源 · 图示H2100',note:'按图示冰箱2100标高锚真实上柜背板室内面，保留机顶独立检修用途；柜门打开、线长及插拔待核。'}));
  const dr=rect(dw);cabinetPoint(p,byCode('P25'),'fit-kitchen-20261005','drawing-kitchen-south-base-3-east',dr.y+dr.d+80,550,'west',
    spec('kitchen',{purpose:'洗碗机相邻可达柜位电源 · 图示H550',note:'面板在洗碗机南端外的相邻柜侧板内面，避开机器、门板及前承重板；开柜插拔和穿板待核。'}));
  cabinetPoint(p,byCode('P26'),'fit-kitchen-20261005','drawing-kitchen-south-upper-east-back',hood.cx+hood.w/2+120,2000,'north',
    spec('kitchen',{note:'按图示油烟机2000标高锚真实上柜背板前面，横向避开烟机；柜内插拔与穿板待核。'}));
  const hr=rect(heater);S('P27',K.east,hr.y+hr.d+130,'west',1550,spec('kitchen',{heightStatus:'owner-heater-service-preserved/no-SD02-heater-height',note:'保留已确认燃气热水器供电用途及1550暂估标高；图纸未列该设备，插座与机器、燃气和烟管安装由厂家核定。'}));
  for(const[c,x]of[['P28',K.east-700],['P29',K.east-250]])cabinetPoint(p,byCode(c),'fit-kitchen-20261005','drawing-kitchen-south-splash',x,1200,'north',spec('kitchen'));
  S('P30',5150,4320,'east',1200,spec('bath_1',{handle:249347,extra:{wetAreaReviewPending:true},note:'镜旁两组用途放主卫盆侧实墙；避开镜面、龙头和门洞，涉水分区不据此批准。'}));
  S('P31',3240,6650,'south',350,spec('bath_1',{handle:249345,extra:{wetAreaReviewPending:true},note:'马桶用途保留并暂锚北侧实墙，避开机背和淋浴实体；线长、暗接、防溅与涉水区须复核。'}));
  S('P32',4590,4750,'south',1100,spec('bath_2',{heightStatus:'old-accessible-washer-height-retained/SD02-height-not-labelled',extra:{wetAreaReviewPending:true},note:'客卫仍使用业主600×530×840洗衣机，插座暂置台上可达1100；图纸洗衣机电位未清晰标高，不能当实测。'}));
  S('P33',4590,4310,'south',1200,spec('bath_2',{handle:249321,extra:{wetAreaReviewPending:true},note:'镜旁两组用途放镜面东侧与洗衣机之间的实墙，避镜背板；防溅、手持器具和涉水区保护待核。'}));
  S('P34',4839.851,5700,'south',350,spec('bath_2',{handle:249319,extra:{wetAreaReviewPending:true},note:'保留客卫马桶用途，放机身东侧北墙空段；不以当前几何代替涉水保护核定。'}));
  // Dryer alone remains in the balcony. The robot is now in the independently
  // supported shoe-cabinet base; it must never retain a balcony service anchor.
  const robot=get('balcony_robot'),robotHost=shoe.parts.find(q=>/robot.*back|back.*robot/i.test(q.id+' '+q.role));
  assert.ok(robot&&robot.roomId==='living','Robot must be moved to the shoe cabinet before electrical overlay');
  if(robotHost){const q=worldPart(shoe,robotHost),face=robotHost.face||'west',along=(face==='east'||face==='west')?q.y+45:q.x+45;
    cabinetPoint(p,byCode('P35'),shoe.id,robotHost.id,along,Math.min(q.top-43,Math.max(550,q.bottom+43)),face,
      spec('living',{heightStatus:'owner-robot-service-cabinet-concept-not-SD02',purpose:'扫地机器人 · 入户鞋柜独立空腔电源',extra:{servedRoomId:'living'},
        note:'随业主确认移至鞋柜底部空腔，面板底507高于500基站且侧向名义仅2mm缝；仅静态避让，不确认插头、线材、手部操作及散热，必须按真实基站和插头重核。'}));
  }else{
    const r=rect(robot);S('P35',5470,Math.max(13260,r.y+r.d+100),'west',650,spec('living',{heightStatus:'owner-robot-service-concept/host-detail-pending',
      purpose:'扫地机器人 · 入户鞋柜独立空腔电源',extra:{servedRoomId:'living',robotCabinetHostDetailPending:true},note:'机器人改入鞋柜，原阳台电位取消；暂锚邻近厨房西墙干侧，柜体内可达开孔与插头位置待核。'}));
  }
  const balconyWindow=p.WIN_META.find(m=>(m.sourceId==='window_kitchen_balcony'||m.id==='window_kitchen_balcony'||m.id==='window_kitchen')&&m.sillMm>=636)||
    p.WIN_META.find(m=>m.sourceAxisMm&&Math.abs(m.sourceAxisMm[1]-11225)<150&&Math.abs(m.sourceAxisMm[3]-m.sourceAxisMm[1])<1&&m.sillMm>=636);
  assert.ok(balconyWindow,'Dryer outlet requires the measured shared-window low wall');
  windowPoint(p,byCode('P36'),balconyWindow.id,7100,'north',550,'window-sill',spec('balcony',{heightStatus:'low-wall-service-concept/SD02-appliance-H550',
    purpose:'阳台烘干机 · 窗下低墙可达电源',extra:{servedRoomId:'balcony',wetAreaReviewPending:true},note:'阳台只保烘干机；点位在窗台1000以下、烘干机西侧空段，避免机背与玻璃。插头、线长、涉水保护及可达性待核。'}));
  const groups=[
    {id:'G-A',title:'主卧主灯三处控制',codes:['S01','S02','S15'],type:'three-location',targets:[roomLamp('room_a')],source:'SD01/S4三控'},
    {id:'G-B',title:'次卧主灯双控',codes:['S03','S04'],type:'two-way',targets:[roomLamp('room_b')],source:'owner-prior-intent-retained/SD01-room-control'},
    {id:'G-C',title:'书房主灯双控',codes:['S05','S06'],type:'two-way',targets:[roomLamp('room_c')],source:'owner-prior-intent-retained/SD01-study-control'},
    {id:'G-L',title:'客厅吸顶灯双控',codes:['S07','S08'],type:'two-way',targets:[item('family-living-ceilinglight')],source:'SD01/S2双控'},
    {id:'G-D',title:'餐厅吊灯双控',codes:['S09','S08'],type:'two-way',targets:[item('family-dining-ceilinglight')],source:'SD01/S1双控'}
  ].map(g=>({id:g.id,title:g.title,controlCodes:g.codes,controlPointIds:g.codes.map(pointId),controlType:g.type,numberOfLocations:g.codes.length,targets:g.targets,source:g.source,
    functionalOnly:true,wiringModeled:false,installationApproved:false}));
  for(const f of p.defaultFurniture.filter(f=>f.electricalDesign?.kind==='switch')){
    const memberships=groups.filter(g=>g.controlPointIds.includes(f.id));if(!memberships.length)continue;
    const targets=memberships.flatMap(g=>g.targets);f.electricalDesign={...clone(f.electricalDesign),groupIds:memberships.map(g=>g.id),controlTargets:targets,
      controlType:memberships.some(g=>g.controlType==='three-location')?'three-location':'two-way',
      channelControls:memberships.map(g=>({groupId:g.id,controlType:g.controlType,targets:clone(g.targets)}))};
    if(memberships.length>1)buildParts(f,protoMulti,1);
  }
  const oldBy=new Map(old.defaultFurniture.map(f=>[f.id,f])),changed=p.defaultFurniture.filter(f=>oldBy.has(f.id)&&!isDeepStrictEqual(f,oldBy.get(f.id))).map(f=>f.id);
  for(const f of old.defaultFurniture.filter(f=>!f.electricalDesign))assert.deepEqual(get(f.id),f,'Electrical layer cannot alter appliance/cabinet/architecture '+f.id);
  const priorServiceMap=Object.fromEntries(old.defaultFurniture.filter(f=>f.electricalDesign).map(f=>[f.id,clone(f.electricalDesign.servedFurnitureIds||[])]));
  for(const[id,served]of Object.entries(priorServiceMap))assert.deepEqual(get(id).electricalDesign.servedFurnitureIds||[],served,'Old service relationship retained '+id);
  const points=p.defaultFurniture.filter(f=>f.electricalDesign).map(f=>({...clone(f.electricalDesign),id:f.id,roomId:f.roomId,cx:f.cx,cy:f.cy,rot:f.rot,w:f.w,d:f.d,heightMm:f.heightMm,elevationMm:f.elevationMm}));
  const counts={switch:points.filter(f=>f.kind==='switch').length,socket:points.filter(f=>f.kind==='socket').length,data:points.filter(f=>f.kind==='data').length};
  const result={id:REVISION,date:'2026-10-27',title:'方案2 · 施工图电位与三处／双处控制',source:clone(SOURCE),groups,points,existingPoints:reusedP16?[clone(oldP16)]:[],
    counts,logicalPointCount:points.length+(reusedP16?1:0),newVisiblePointCount:points.length,sourceSnapshotsUnchanged:true,architectureUnchanged:true,
    defaultPanelDimensionsMm:[86,8,86],centerHeightDatum:'finished-floor-to-faceplate-center-drawing-intent-not-measured',
    functionalRelationshipsOnly:true,wiringModeled:false,installationApproved:false,ratingsConfirmed:false,circuitConfirmed:false,protectiveMeasuresConfirmed:false,
    changedFurnitureIds:changed,newFurnitureIds:newIds,removedFurnitureIds:[],previousFurniture:changed.map(id=>clone(oldBy.get(id))),previousFurnitureOrder:old.defaultFurniture.map(f=>f.id),
    previousPlanFields:{},migrationFields:Object.fromEntries(changed.map(id=>[id,changedFields(oldBy.get(id),get(id))])),previousMetadataFields:{},priorServiceMap,
    notes:['按SD02标高：一般低位350、床头700、桌面1000、餐边轨道1200、电视550、空调2300、冰箱2100、烟机2000；未给专门标高的旧热水器/洗衣机/机器人用途明确沿用暂估。',
      '主卧S4三控新增北床头S15；餐厅S1及客厅S2双控在走廊S08共用双键面板，各自为独立控制通道，未把一个物理面板当两只重叠面板。',
      '图示两联/四联插座按多个真实86mm单元重建外包，不是已选成品规格；暗盒和强弱电分隔仍待选型。',
      '保留原36种插座用途和四处弱电服务，P16从旧鞋柜内置part改为独立面板；机器人服务改鞋柜空腔，阳台只保留烘干机服务。'],
    pending:['SD01/02部分符号已打散，文字插入点不是电位中心；本层用新墙/柜真实面与相对位置锚定，未称所有沿墙偏距都已实测。',
      '图纸两处仍写洗衣机，按业主本轮确定为客卫洗衣机、阳台烘干机，不复制洗衣机。',
      'SD02蒸烤箱、净水器、厨房消毒柜插座及主客卫镜灯1800预留线均记录为未选设备/导线用途，不凭图示增加电器或把线头冒充插座。',
      'SD01卧室走廊灯S3双控与两处A3单控为图纸功能说明，旧模型无独立对应灯具，需灯具分组深化；不把其与次卧S3名称冲突自动接成同一回路。',
      '全部额定值、线径、分路、暗盒、插头可达性、湿区防护及安装仍待现场及合格电工复核。'],
    unmodeledDrawingPurposes:[{purpose:'主卫镜灯预留线',heightMm:1800,sourceTextHandle:249346,kind:'power-wire-not-socket'},
      {purpose:'客卫镜灯预留线',heightMm:1800,sourceTextHandle:249320,kind:'power-wire-not-socket'},
      {purpose:'蒸烤箱专用插座',heightMm:1200,applianceSelected:false},{purpose:'厨房净水器插座',heightMm:550,applianceSelected:false},
      {purpose:'厨房内嵌消毒柜插座',heightMm:550,applianceSelected:false}],
    drawingCircuitProposal:{sourceSheet:'SD03',status:'document-only-not-site-verified-or-load-approved',boxWays:26,boxBottomMm:1800,wiringModeled:false}};
  p.metadata[META_KEY]=result;result.validation=validateFamilyDrawingElectrical(p);assert.ok(result.validation.ok,result.validation.errors.join('\n'));
  for(const k of Object.keys(old))if(!['defaultFurniture','metadata'].includes(k))assert.deepEqual(p[k],old[k],'Electrical overlay keeps plan '+k);
  for(const k of Object.keys(old.metadata))assert.deepEqual(p.metadata[k],old.metadata[k],'Electrical overlay keeps historical metadata '+k);
  assert.deepEqual(beforeFamilyDrawingElectrical(p),old,'Electrical overlay exact rollback');return result;
}
function beforeFamilyDrawingElectrical(value){const out=clone(value),p=out.schemes?.family||out,m=p?.metadata?.[META_KEY];if(!m)return out;
  const old=new Map(m.previousFurniture.map(f=>[f.id,f])),now=new Map(p.defaultFurniture.map(f=>[f.id,f]));p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||now.get(id)));delete p.metadata[META_KEY];return out;}
module.exports={applyFamilyDrawingElectrical,beforeFamilyDrawingElectrical,validateFamilyDrawingElectrical,REVISION,META_KEY,rect,worldPart};
