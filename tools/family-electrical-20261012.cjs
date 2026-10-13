'use strict';

// Scheme 2 electrical location/functional-control concept. Visible faceplates
// and relationships only: this layer does not create wiring, concealed boxes,
// certified circuits, operating power, product ratings or construction approval.
const assert=require('node:assert/strict');
const REVISION='family-electrical-20261012',clone=structuredClone;
const META_KEYS=['conditions','designCorrections','converter'];
const FACE_ROT=Object.freeze({north:180,south:0,east:270,west:90});
const POINT_IDS=Object.freeze([
  ...Array.from({length:14},(_,i)=>'family-elec-s'+String(i+1).padStart(2,'0')),
  ...Array.from({length:36},(_,i)=>i===15?null:'family-elec-p'+String(i+1).padStart(2,'0')).filter(Boolean),
  ...Array.from({length:4},(_,i)=>'family-elec-n'+String(i+1).padStart(2,'0'))
]);
const CONDITIONS=[
  '本版只补充方案2电位概念：14处开关、36处电源用途点、4处弱电，共54个逻辑点；鞋柜原充电面板P16复用原实体，其余新增53个可选中面板。原68物件、建筑及其余方案保持。',
  '86×86×8mm是新面板暂估外形，仅显示墙/柜面安装面；高度为完成地面到面板中心的暂估值，非暗盒尺寸、开槽深度或施工放线批准。P16沿用既有70×70×5mm柜内面板，不重新覆盖。',
  '主卧、次卧、书房、客厅各一组双控，表示两处共同控制同一盏灯的功能意图，不代表实际接线拓扑、真实供电开关模拟、智能设备互通或已批准的控制系统。',
  '电流额定值、线径、负荷、回路容量、插座制式、安全门、接地、漏电保护、等电位、防溅/防护等级及涉水区分区均未确定，须由合格电工结合实测、设备厂家和适用规范审查。不得按示意点位直接施工。',
  '两卫开关放卫外干侧；盆机、台面及马桶用途插座只表达备选位置，并不保证符合涉水区安全距离。洗衣机、烘干机、厨房电器、空调及热水器的独立回路与检修空间须电工和安装商深化。',
  '烘干机和扫地基站电源暂放凹位厨房侧封板，面朝厨房供检修，不藏在机器背后；从封板穿线/开孔、暗盒、护线、独立断电、通风及涉水隔离尚未深化。柜板挂面不等于已批准嵌入可燃板安装。',
  '餐边柜五台电器分别预留用途点，不承诺同时使用不超负荷；各设备带线、排汽、散热、抬盖和柜灯电源布置待选型后复核。强弱电这里只列独立面板，不暗示间距、管线隔离或网络施工已验证。'
];
const roomLamp=roomId=>({kind:'room-lamp',roomId});
const item=(id,channelLabel)=>({kind:'furniture',id,...(channelLabel?{channelLabel}:{})});
const GROUPS=Object.freeze([
  ['G-A','主卧灯双控',['S01','S02'],[roomLamp('room_a')]],
  ['G-B','次卧灯双控',['S03','S04'],[roomLamp('room_b')]],
  ['G-C','书房灯双控',['S05','S06'],[roomLamp('room_c')]],
  ['G-L','客厅吸顶灯双控',['S07','S08'],[item('family-living-ceilinglight')]]
].map(([id,title,codes,targets])=>({id,title,controlCodes:codes,
  controlPointIds:codes.map(code=>'family-elec-'+code.toLowerCase()),targets,
  controlType:'two-way',functionalOnly:true,wiringModeled:false,installationApproved:false})));
const wall=wallIndex=>({kind:'wall',wallIndex});
const lintel=windowId=>({kind:'window-lintel',windowId});
const board=(furnitureId,partId)=>({kind:'cabinet-part',furnitureId,partId});
const shoe=()=>board('fit-entry_shoe_station','e_key_niche-niche-back');
const dining=()=>board('fit-dining_sideboard_wall','reference-west-central-niche-back');
const splash=()=>board('fit-kitchen-20261005','south_splash');
const recess=()=>board('balcony_recess_housing','balcony_recess_housing-kitchen-back');
const dual=(code,roomId,cx,cy,h,face,anchor,groupId,purpose)=>({code,kind:'switch',roomId,cx,cy,centerHeightMm:h,face,anchor,
  groupIds:[groupId],controlTargets:clone(GROUPS.find(g=>g.id===groupId).targets),controlType:'two-way',purpose});
const single=(code,roomId,cx,cy,h,face,anchor,purpose,targets,extra={})=>({code,kind:'switch',roomId,cx,cy,centerHeightMm:h,
  face,anchor,purpose,controlTargets:targets,controlType:targets.length>1?'multifunction-concept':'single',...extra});
const socket=(code,roomId,cx,cy,h,face,anchor,purpose,ids=[],extra={})=>({code,kind:'socket',roomId,cx,cy,
  centerHeightMm:h,face,anchor,purpose,servedFurnitureIds:ids,...extra});
const data=(code,roomId,cx,cy,h,face,anchor,purpose,ids=[])=>({...socket(code,roomId,cx,cy,h,face,anchor,purpose,ids),kind:'data'});
const PLACEMENTS=Object.freeze([
  dual('S01','room_a',3499,3730,1200,'east',wall(25),'G-A','主卧门侧 · 主灯双控'),
  dual('S02','room_a',6746,3070,820,'west',wall(15),'G-A','主卧床头 · 主灯双控'),
  dual('S03','room_b',2350,3216,1200,'north',wall(27),'G-B','次卧门侧 · 主灯双控'),
  dual('S04','room_b',124,3020,820,'east',wall(4),'G-B','次卧床头 · 主灯双控'),
  dual('S05','room_c',2336,5160,1200,'west',wall(29),'G-C','书房门侧 · 主灯双控'),
  dual('S06','room_c',450,3344,1200,'south',wall(27),'G-C','书房北墙 · 主灯双控（沙发／未来床头）'),
  dual('S07','living',5268,13380,1200,'west',shoe(),'G-L','入户鞋柜中空 · 客厅主灯双控'),
  dual('S08','living',3371,3630,1200,'west',wall(25),'G-L','卧室走廊 · 客厅主灯双控'),
  single('S09','living',5268,13620,1200,'west',shoe(),'餐厅独立圆灯开关',[item('family-dining-ceilinglight')]),
  single('S10','room_a',4386,4300,1200,'west',wall(33),'主卫门外干侧 · 照明／浴霸分通道',
    [roomLamp('bath_1'),item('family-bathheater-bath_1','浴霸多功能通道待选型')],{servedRoomId:'bath_1',channelLabels:['主卫照明','主卫浴霸多功能']}),
  single('S11','living',3371,5890,1200,'west',wall(38),'客卫门外干侧 · 照明／浴霸分通道',
    [roomLamp('bath_2'),item('family-bathheater-bath_2','浴霸多功能通道待选型')],{servedRoomId:'bath_2',channelLabels:['客卫照明','客卫浴霸多功能']}),
  single('S12','living',5296,11320,1200,'west',wall(23),'厨房门外 · 照明／凉霸分通道',
    [roomLamp('kitchen'),item('family-kitchen-ceilingfan','凉霸通道待选型')],{servedRoomId:'kitchen',channelLabels:['厨房照明','厨房凉霸']}),
  single('S13','living',6520,11146,1200,'north',wall(22),'生活阳台灯 · 厅侧开关',[roomLamp('balcony')],{servedRoomId:'balcony'}),
  single('S14','living',5268,13500,1200,'west',shoe(),'餐边柜／鞋柜灯带 · 分通道开关',
    [item('fit-dining_sideboard_wall','餐边柜灯带'),item('fit-entry_shoe_station','鞋柜灯带')],{channelLabels:['餐边柜灯带','鞋柜灯带']}),
  socket('P01','room_a',6746,3070,650,'west',wall(15),'主卧床头充电',['draft-night-a']),
  socket('P02','room_a',6746,450,1100,'west',wall(15),'主卧小书桌电源',['draft-desk-a']),
  socket('P03','room_a',5570,124,2300,'south',lintel('window_a'),'主卧窗上空调电源',['family-acwall-room_a']),
  socket('P04','room_a',3499,2750,300,'east',wall(25),'主卧衣柜南端备用电源'),
  socket('P05','room_b',124,3020,650,'east',wall(4),'次卧床头充电',['draft-night-b']),
  socket('P06','room_b',124,450,1100,'east',wall(4),'次卧小书桌电源',['draft-desk-b']),
  socket('P07','room_b',2440,124,2300,'south',lintel('window_b'),'次卧窗上空调电源',['family-acwall-room_b']),
  socket('P08','room_b',3371,2450,300,'west',wall(25),'次卧衣柜南端备用电源'),
  socket('P09','room_c',450,6196,1100,'north',wall(6),'书房南段书桌 · 电脑电源',['study_full_desk']),
  socket('P10','room_c',1040,6196,1100,'north',wall(6),'书房南段书桌 · 备用电源',['study_full_desk']),
  socket('P11','room_c',600,3344,1200,'south',wall(27),'书房沙发／未来床头电源',['study_north_sofa'],
    {reviewNotes:'高于当前830沙发和未来暂估1080床头；未来床架外形与插头操作空间仍待核。'}),
  socket('P12','room_c',124,5330,2300,'east',wall(5),'书房西窗南段空调电源',['family-acwall-room_c']),
  socket('P13','living',4160,6324,650,'south',wall(39),'电视左服务位电源',['family-f7']),
  socket('P14','living',6746,6970,1000,'west',wall(18),'客厅立柜空调电源',['family-living-aircon']),
  socket('P15','living',6746,9300,650,'west',wall(18),'客厅沙发东侧充电',['family-f6']),
  // P16 is the existing 70mm plate inside the entry key niche, not a new fixture.
  socket('P17','living',6746,7100,300,'west',wall(18),'客厅东墙低位备用电源'),
  socket('P18','living',3650,6324,300,'south',wall(39),'电视柜西侧清洁备用电源'),
  socket('P19','living',2147,9450,1390,'east',dining(),'餐边柜破壁机用途电源',['family-sideboard-blender']),
  socket('P20','living',2147,9790,1390,'east',dining(),'餐边柜恒温壶用途电源',['family-sideboard-temperaturekettle']),
  socket('P21','living',2147,10230,1390,'east',dining(),'餐边柜蒸汽奶瓶消毒柜用途电源',['family-sideboard-sterilizer']),
  socket('P22','living',2147,10620,1390,'east',dining(),'餐边柜养生壶用途电源',['family-sideboard-healthkettle']),
  socket('P23','living',2147,11050,1390,'east',dining(),'餐边柜饮水机用途电源',['family-sideboard-waterdispenser']),
  socket('P24','kitchen',6240,11274,1200,'south',wall(22),'冰箱东侧检修用途电源',['kitchen_fridge']),
  socket('P25','kitchen',6520,11274,1200,'south',wall(22),'洗碗机可达用途电源',['kitchen_dishwasher']),
  socket('P26','kitchen',7140,13886,2100,'north',wall(10),'抽油烟机侧上方电源',['kitchen_hood'],
    {reviewNotes:'此位置位于原厨房450待核调整段；净宽闭合及柜体重排后须重新核点，不按此放线。'}),
  socket('P27','kitchen',8286,11870,1550,'west',wall(12),'热水器南侧用途电源',['kitchen_heater']),
  socket('P28','kitchen',7590,13874,1200,'north',splash(),'厨房备餐台左备用电源'),
  socket('P29','kitchen',7870,13874,1200,'north',splash(),'厨房备餐台右备用电源'),
  socket('P30','bath_1',4514,4250,1200,'east',wall(33),'主卫干侧镜旁用途电源',['vanity_main'],
    {reviewNotes:'暂避开淋浴、镜面与完整门扫；涉水分区及保护、防溅、线缆和使用器具均须电工审查，不是安全距离认证。'}),
  socket('P31','bath_1',4514,4440,650,'east',wall(33),'主卫马桶备用 · 西侧干区检修位',['family-f11'],
    {reviewNotes:'不把插座藏在马桶背后；马桶型号、暗接检修、线长、涉水分区需深化，不能据此使用明拉延长线。'}),
  socket('P32','bath_2',3980,4994,1100,'south',wall(35),'客卫台下洗衣机 · 左侧可达电源',['laundry_washer'],
    {reviewNotes:'保持原洗衣机独立排水；面板避开完整门扫和机背，独立回路、涉水保护及厂家线长待核。'}),
  socket('P33','bath_2',4550,4994,1250,'south',wall(36),'客卫镜旁用途电源',['vanity_guest'],
    {reviewNotes:'仅几何试排，面板右边暂离小盆左边247mm，不把此距离当作施工合规；涉水保护和现场定位待电工审查。'}),
  socket('P34','bath_2',3499,5990,650,'east',wall(38),'客卫马桶备用 · 西侧干区检修位',['family-f14'],
    {reviewNotes:'不把插座藏在马桶后；设备暗接、厂家线长、通达检修和涉水保护待深化，不是明拉延长线方案。'}),
  socket('P35','kitchen',7210,11924,850,'south',recess(),'扫地机基站 · 凹位厨房侧可达电源',['balcony_robot'],
    {servedRoomId:'balcony',reviewNotes:'固定在现凹位厨房侧封板表面、面朝厨房；穿线/电盒、检修、独立断电及涉水防护未深化。'}),
  socket('P36','kitchen',7510,11924,850,'south',recess(),'烘干机 · 凹位厨房侧可达电源',['laundry_dryer'],
    {servedRoomId:'balcony',reviewNotes:'为避开原厨房右侧盆柜北板及台面，西移至现凹位厨房侧封板的空段，面朝厨房；厂家电源线长、插拔检修、穿线/固定电盒、独立断电及涉水防护未深化。'}),
  data('N01','room_a',6746,650,1100,'west',wall(15),'主卧小书桌网络用途点',['draft-desk-a']),
  data('N02','room_b',124,650,1100,'east',wall(4),'次卧小书桌网络用途点',['draft-desk-b']),
  data('N03','room_c',1220,6196,1100,'north',wall(6),'书房南书桌网络用途点',['study_full_desk']),
  data('N04','living',4020,6324,650,'south',wall(39),'电视左服务位网络用途点',['family-f7'])
]);

function faceplateParts(f,kind){
  const part=(id,x,y,w,d,z,h,role,label,color='#F7F4EC')=>({
    id:f.id+'-'+id,x,y,w,d,elevationMm:z,heightMm:h,role,label,color,material:'Cream',face:'south'
  });
  const out=[
    part('plate-body',-43,-4,86,6,0,86,'electrical-plate-body','暂估86面板可见背壳，不是墙内暗盒','#D8D3C9'),
    part('face',-42,2,84,1.6,1,84,'electrical-face','奶白面板正面')
  ];
  if(kind==='switch'){
    const multi=f.electricalDesign.controlTargets.length>1;
    out.push(...(multi?[
      part('rocker-left',-35,3.6,32,0.4,10,62,'electrical-rocker','左控制键 · 功能示意','#EFECE3'),
      part('rocker-right',3,3.6,32,0.4,10,62,'electrical-rocker','右控制键 · 功能示意','#EFECE3')
    ]:[part('rocker',-35,3.6,70,0.4,10,62,'electrical-rocker','控制键 · 功能示意','#EFECE3')]));
    out.push(part('rocker-seam',-34,3.6,68,0.4,12,1,'electrical-seam','按键边界','#D8D3C9'),
      part('indicator',28,3.6,3,0.4,77,2,'electrical-indicator','指示符号 · 非通电状态','#8C9D94'),
      part('rocker-seam-left',-36,3.6,1,0.4,10,62,'electrical-seam','按键左侧细缝','#D8D3C9'),
      part('rocker-seam-right',35,3.6,1,0.4,10,62,'electrical-seam','按键右侧细缝','#D8D3C9'));
  }else if(kind==='socket'){
    // Five dark face symbols, not drilled holes or a declared outlet standard.
    for(const [id,x,z,w,h]of[
      ['upper-left',-19,52,7,10],['upper-right',12,52,7,10],
      ['lower-earth',-3,35,6,12],['lower-left',-22,16,8,11],['lower-right',14,16,8,11]
    ])out.push(part(id,x,3.6,w,0.4,z,h,'electrical-socket-symbol','五孔面符号 · 插座规格待定','#4E5552'));
    out.push(part('earth-mark',-3,3.6,6,0.4,72,1,'electrical-mark','接地符号 · 接地未建模','#C6C2B8'));
  }else{
    out.push(part('port-frame',-20,3.6,40,0.4,30,25,'electrical-data-frame','弱电面接口框','#D8D5CC'),
      part('port-dark',-16,3.6,32,0.4,33,18,'electrical-data-port','弱电端口示意 · 制式待定','#4E5552'),
      part('port-tab',-7,3.6,14,0.4,30,3,'electrical-data-tab','接口卡扣符号','#8E958F'));
  }
  assert.ok(out.length>=5&&out.length<=8);
  for(const q of out)assert.ok(q.x>=-43&&q.x+q.w<=43&&q.y>=-4&&q.y+q.d<=4&&q.elevationMm>=0&&q.elevationMm+q.heightMm<=86,
    'Visible electrical parts stay inside stated faceplate envelope '+f.id);
  return out;
}
function pointInside([x,y],poly){
  let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
  }return hit;
}
function rect(f){
  const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),
    d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));
  return {x:f.cx-w/2,y:f.cy-d/2,w,d,z:f.elevationMm||0,h:f.heightMm};
}
function partRect(f,q){
  const a=(f.rot||0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),
    x=q.x+q.w/2,y=q.y+q.d/2,w=Math.abs(q.w*ca)+Math.abs(q.d*sa),d=Math.abs(q.w*sa)+Math.abs(q.d*ca);
  return{x:f.cx+x*ca-y*sa-w/2,y:f.cy+x*sa+y*ca-d/2,w,d,
    z:(f.elevationMm||0)+(q.elevationMm||0),h:q.heightMm};
}
function overlaps(a,b){return ['x','y','z'].every((k,i)=>
  Math.min(a[k]+a[['w','d','h'][i]],b[k]+b[['w','d','h'][i]])-Math.max(a[k],b[k])>.001);}
function verifyMountingSurface(p,f){
  const a=f.electricalDesign.anchor,b=rect(f),n={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]}[f.face];
  assert.ok(a&&n,'A visible point requires a named real supporting surface '+f.id);
  let support;
  if(a.kind==='wall'){
    const w=p.WALLS[a.wallIndex];assert.ok(w,'Existing wall anchor '+f.id);
    support={x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1],z:0,h:p.ROOMS.find(r=>r.id===f.roomId)?.heightMm||2700};
  }else if(a.kind==='window-lintel'){
    const i=p.WIN_META.findIndex(w=>w.id===a.windowId),wm=p.WIN_META[i],w=p.WINS[i];
    assert.ok(wm&&w,'Existing window upper wall '+f.id);
    support={x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1],z:wm.headMm,h:(p.ROOMS.find(r=>r.id===f.roomId)?.heightMm||2700)-wm.headMm};
    assert.ok(b.z>=wm.headMm,'Point stays on lintel, not glazing '+f.id);
  }else{
    assert.equal(a.kind,'cabinet-part');const host=p.defaultFurniture.find(q=>q.id===a.furnitureId),part=host?.parts?.find(q=>q.id===a.partId);
    assert.ok(host&&part,'Original cabinet support part '+f.id);support=partRect(host,part);
    a.localCenterMm=[f.cx-host.cx,f.cy-host.cy,f.electricalDesign.centerHeightMm-(host.elevationMm||0)];
    a.baseHostDimensionsMm=[host.w,host.d,host.heightMm];
    a.hostRotationDegrees=host.rot||0;
    a.cabinetBoxAndPenetrationPending=true;
  }
  const close=(x,y)=>Math.abs(x-y)<.01;
  if(n[0]!==0){
    assert.ok(close(n[0]>0?b.x:b.x+b.w,n[0]>0?support.x+support.w:support.x),'Point back flush with X support '+f.id);
    assert.ok(b.y>=support.y-.01&&b.y+b.d<=support.y+support.d+.01,'Point width on X support '+f.id);
  }else{
    assert.ok(close(n[1]>0?b.y:b.y+b.d,n[1]>0?support.y+support.d:support.y),'Point back flush with Y support '+f.id);
    assert.ok(b.x>=support.x-.01&&b.x+b.w<=support.x+support.w+.01,'Point width on Y support '+f.id);
  }
  assert.ok(b.z>=support.z-.01&&b.z+b.h<=support.z+support.h+.01,'Point height within support '+f.id);
  assert.equal(overlaps(b,support),false,'Surface contact, no buried faceplate '+f.id);
  a.surfaceVerifiedAgainstCurrentModel=true;
}
function verifyVisibleClearances(p,points){
  for(let i=0;i<points.length;i++){
    const f=points[i],b=rect(f);
    for(const w of p.WALLS)assert.equal(overlaps(b,{x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1],z:0,h:2790}),false,
      'Visible point must not bury inside an original wall '+f.id);
    for(const old of p.defaultFurniture){
      const solids=old.parts?.length?old.parts.map(q=>partRect(old,q)):[rect(old)];
      for(const s of solids)assert.equal(overlaps(b,s),false,'Visible point intersects an original solid '+f.id+' / '+old.id);
    }
    for(let j=0;j<i;j++)assert.equal(overlaps(b,rect(points[j])),false,'Electrical faceplates must not overlap '+f.id+' / '+points[j].id);
    for(const door of p.DOORS){
      const a0=Math.atan2(door.c[1],door.c[0]),a1=Math.atan2(door.o[1],door.o[0]);
      let sweep=a1-a0;while(sweep>Math.PI)sweep-=2*Math.PI;while(sweep<-Math.PI)sweep+=2*Math.PI;
      for(let step=0;step<=180;step++){
        const a=a0+sweep*step/180,c=Math.cos(a),s=Math.sin(a),x=door.h[0]+c*door.len/2,y=door.h[1]+s*door.len/2,
          body={cx:x,cy:y,w:door.len,d:40,heightMm:door.heightMm,elevationMm:0,rot:a*180/Math.PI};
        // Conservative swept AABBs include full model leaf thickness. Geometry
        // tests independently check actual polygons at a finer resolution.
        assert.equal(overlaps(b,rect(body)),false,'Point covered by a full original door sweep '+f.id+' / '+door.id);
      }
    }
  }
}
function makePoint(spec){
  const {code,kind,cx,cy,centerHeightMm,face,roomId,purpose,anchor,groupIds=[],controlTargets=[],servedFurnitureIds=[],controlType}=spec;
  const id='family-elec-'+code.toLowerCase(),f={id,sourceId:id,type:'fixture',nativeType:kind,
    modelVariant:'electrical-'+kind,name:code+' · '+purpose,cx,cy,w:86,d:8,heightMm:86,elevationMm:centerHeightMm-43,
    baseWidthMm:86,baseDepthMm:8,baseHeightMm:86,rot:FACE_ROT[face],color:'#F7F4EC',roomId,face,
    kind,code,dimensionStatus:'provisional-electrical-point-concept',layoutRevision:REVISION,cabinetRevision:REVISION,
    visualOnly:true,installationApproved:false,notConstructionApproval:true,wiringModeled:false,
    electricalDesign:{kind,code,purpose,centerHeightMm,face,mountingRoomId:roomId,
      groupIds:[...groupIds],controlTargets:clone(controlTargets),servedFurnitureIds:[...servedFurnitureIds],
      ...(controlType?{controlType}:{}),...(spec.channelLabels?{channelLabels:clone(spec.channelLabels)}:{}),
      anchor:clone(anchor),installationApproved:false,ratingAmps:null,ipRating:null,wiringModeled:false,
      productSelected:false,circuitConfirmed:false,protectiveMeasuresConfirmed:false,
      separateCircuitRecommendation:spec.separateCircuitRecommendation||'electrician-review-pending',
      ...(spec.servedRoomId?{servedRoomId:spec.servedRoomId}:{}),
      reviewNotes:spec.reviewNotes||'面板、点位、高度、线路和保护措施均需现场核验。'},
    notes:purpose+'。'+(spec.reviewNotes||'')+' 中心高'+centerHeightMm+'mm、86×86×8面板均暂估；只表示位置/用途，不表示施工合规或真实布线。',
    conditions:[CONDITIONS[1],CONDITIONS[3]]};
  f.sourceFootprintMm=(()=>{const b=rect(f);return{x:b.x,y:b.y,w:b.w,d:b.d};})();
  f.parts=faceplateParts(f,kind);return f;
}
function applyFamilyElectrical(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyFloorDrainsUpdate,'Apply after five visible floor drains');
  assert.ok(!p.metadata.familyElectricalUpdate,'Electrical concept layer already applied');
  assert.equal(p.defaultFurniture.length,68);
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const priorIds=new Set(p.defaultFurniture.map(f=>f.id));
  for(const id of POINT_IDS)assert.ok(!priorIds.has(id),'Duplicate electrical ID '+id);
  const additions=PLACEMENTS.map(makePoint);
  assert.equal(additions.length,53);
  assert.deepEqual(additions.map(f=>f.id),POINT_IDS);
  for(const f of additions){
    assert.ok(Number.isFinite(f.cx)&&Number.isFinite(f.cy)&&f.elevationMm>=0);
    const room=p.ROOMS.find(r=>r.id===f.roomId),b=rect(f);assert.ok(room,'Mounting room '+f.id);
    for(const x of[b.x+.01,b.x+b.w-.01])for(const y of[b.y+.01,b.y+b.d-.01])
      assert.ok(pointInside([x,y],room.poly),'Point remains in named room '+f.id);
    verifyMountingSurface(p,f);
  }
  verifyVisibleClearances(p,additions);
  const host=p.defaultFurniture.find(f=>f.id==='fit-entry_shoe_station'),part=host?.parts?.find(q=>q.id==='e_key_niche-socket-plate');
  assert.ok(host&&part,'Reuse the existing key-niche charging outlet');
  const pr=partRect(host,part),existingPoints=[{
    code:'P16',kind:'socket',purpose:'玄关鞋柜中空 · 手机充电预留（复用）',
    roomId:'living',mountingRoomId:'living',face:'west',cx:pr.x+pr.w/2,cy:pr.y+pr.d/2,
    centerHeightMm:pr.z+pr.h/2,widthMm:70,depthMm:5,heightMm:70,
    hostFurnitureId:host.id,hostPartId:part.id,existingEntityReused:true,
    groupIds:[],controlTargets:[],servedFurnitureIds:[],installationApproved:false,ratingAmps:null,ipRating:null,wiringModeled:false,
    anchor:{kind:'cabinet-part',furnitureId:host.id,partId:part.id,existingVisiblePart:true,
      localCenterMm:[part.x+part.w/2,part.y+part.d/2,part.elevationMm+part.heightMm/2],
      baseHostDimensionsMm:[host.w,host.d,host.heightMm],hostRotationDegrees:host.rot||0},
    reviewNotes:'沿用鞋柜原手机充电面板和尺寸，不复制实体；线路、柜板安装和涉水/用电保护待电工核验。'
  }];
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  p.defaultFurniture.push(...additions);
  p.metadata.conditions=[...(p.metadata.conditions||[]),...CONDITIONS];
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{
    id:REVISION,date:'2026-10-12',sourceIds:[...POINT_IDS],sourceSnapshotsUnchanged:true,
    description:'仅方案2补充54个逻辑电位：14开关、36电源、4弱电；鞋柜P16复用原面板，其余53新增。三房及客厅四组双控；不改原68家具、建筑、实测来源，不模拟真实接线或批准施工。'
  }];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-electrical-20261012.cjs';
  p.metadata.familyElectricalUpdate={id:REVISION,date:'2026-10-12',title:'方案2 · 电位及四组双控功能示意',
    status:'provisional-position-functional-control-concept',sourceSnapshotsUnchanged:true,architectureUnchanged:true,
    other68FurnitureUnchanged:true,logicalPointCount:54,newVisiblePointCount:53,
    counts:{switch:14,socket:36,data:4},defaultPanelDimensionsMm:[86,8,86],
    centerHeightDatum:'finished-floor-to-faceplate-center-provisional',functionalRelationshipsOnly:true,
    wiringModeled:false,realPowerOrAutomationSimulated:false,installationApproved:false,
    electricalSafetyReviewRequired:true,ratingsConfirmed:false,circuitConfirmed:false,protectiveMeasuresConfirmed:false,
    references:[],groups:clone(GROUPS),existingPoints,
    points:additions.map(f=>({id:f.id,...clone(f.electricalDesign),roomId:f.roomId,cx:f.cx,cy:f.cy,rot:f.rot,
      w:f.w,d:f.d,heightMm:f.heightMm,elevationMm:f.elevationMm})),
    previousPlanFields:{},previousFurniture:[],previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:[],newFurnitureIds:[...POINT_IDS],removedFurnitureIds:[],replacedFurnitureIds:[],migrationFields:{}
  };
  assert.equal(p.defaultFurniture.length,121);
  assert.deepEqual(p.defaultFurniture.slice(0,68),previous.defaultFurniture,'All 68 existing objects remain exact');
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  for(const key of Object.keys(previous.metadata))if(!META_KEYS.includes(key))assert.deepEqual(p.metadata[key],previous.metadata[key],'Historical metadata changed '+key);
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized scheme edit');
  assert.deepEqual(beforeFamilyElectrical(p),previous,'Electrical layer exact undo');
  return bundle;
}
function beforeFamilyElectrical(value){
  const out=require('./family-kitchen-heater-20261013.cjs').beforeFamilyKitchenHeater(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyElectricalUpdate;
  if(!m)return out;
  const current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyElectricalUpdate;return out;
}
module.exports={applyFamilyElectrical,beforeFamilyElectrical,REVISION,POINT_IDS};
