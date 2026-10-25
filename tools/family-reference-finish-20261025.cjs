'use strict';

// Scheme 2 photo-reference finish, not a measured product specification.
// This independent final leaf deliberately imports no earlier layout layer.
// All cabinet boards are rebuilt at stated thicknesses, never group-scaled.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const REVISION='family-reference-finish-20261025',DATE='2026-10-25',clone=structuredClone;
const META_KEYS=['conditions','designCorrections','converter'];
const CABINET_ID='fit-dining_sideboard_wall',TV_ID='family-f7',WARDROBE_IDS=['family-f1','family-f3'],STUDY_ID='fit-study_bookwall';
const C={cream:'#F3EFE6',oak:'#C6AA83',walnut:'#81664F',pink:'#D6B8AF',metal:'#282522',light:'#FFF0C8'};
const REF_IMAGES=['微信图片_20261025184302.jpg','微信图片_20261025184257.png','微信图片_20261025184252.png',
  '微信图片_20261025184242.png','微信图片_20261025184306.jpg','微信图片_20261025184313.jpg'];
const T=18,GAP=3,round=n=>Math.round(n*1000)/1000;
const changed=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&!isDeepStrictEqual(a[k],b[k])).sort();
const CONDITIONS=[
  '2026-10-25本版只在方案2现有户型与家具定位上参考业主六张图深化材质和构造：奶白平板柜、整面浅木中空、悬浮视觉下柜、木色多格电视矮柜、主卧挂衣龛、次卧粉色拱龛和书房两层悬板。不是图片原房间实测、产品复刻或施工图。',
  '已购IKEA VIMLE沙发、LISABO餐桌及四把餐椅保持原尺寸、颜色和位置；沙发仍靠东墙，电视仍北墙斜向观看，不恢复茶几、落地灯或原中部背柜。',
  '餐边柜本轮按相对原4890mm直臂缩短800mm：北端y9400、南端y13890，西直臂4090mm；总包1625×4490mm仅为L柜外接框。原南转角浅型800库、425mm返柜、180°门轴与临时移椅方式保持。',
  '中央2730×400mm台面y10000–12730，完成面850mm；木背开放区上口2250mm，1500/1900mm两道18mm全长层板及2250mm上柜下口均有真实板底灯带。柜高2700mm仅按现模型屋顶，净高和收口仍待现场核验。',
  '下柜下口离地240mm仅为参考悬浮视觉；模型保留隐藏后支承示意，墙体锚固、悬臂承重、防倾倒与支腿尺寸均未批准。餐桌后段木色面板为滑门，不是假称可拉出的抽屉；最南400mm列为两抽，开抽前须临时移南餐椅，不构成取物站位或通行认证。',
  '五台餐边电器和P19–P23用途面板的世界位置及真实机身尺寸保持，只重算对新柜的局部锚坐标。最低层板下灯带1496mm，比原面板上沿1433mm高63mm；这仅表示静态几何不相交，不证明插头、散热、蒸汽、开盖、负荷、回路或涉水电气安全。',
  '主次卧2240×600mm衣柜原占地不变，下部主要衣柜区域仍使用滑门，床尾模型净距555mm偏紧。主柜通顶2790mm、次柜2700mm仅跟随各自模型室高；上柜开门、顶面安装、门套、床尾操作和承重待定制方复核。',
  '主卧入口端挂衣龛和下方两木抽为参考构造，抽屉最大250mm仅概念，不据555mm床尾带认定站位舒适。次卧窗边粉色拱龛为18mm薄背、真实空洞、四道白层板及奶白拱形饰面，不把实心粉块当开放柜。',
  '三卧（含书房）地面改真木地板意向，公共区与厨卫及阳台地面不变；木材种类、铺法、基层防潮、地暖适用性、门底净空与完成面厚度待实物和现场核定，不默认为木纹瓷砖。',
  '18mm柜板/门板、3mm门缝、薄背与灯带均为构造概念参数，柜门五金、开角、防夹、电源、布线、驱动检修、承重及厂家深化均未批准；原燃气/排烟、排水、电位与建筑待核事项继续有效。'
];
function local(f,id,x,y,w,d,z,h,role,label,color=C.cream,material='Cream',face='south',extra={}){
  return{id,x:round(x),y:round(y),w:round(w),d:round(d),elevationMm:round(z),heightMm:round(h),role,label,color,material,face,...extra};
}
function absolute(f,id,x,y,w,d,z,h,role,label,color=C.cream,material='Cream',face='east',extra={}){
  return local(f,id,x-f.cx,y-f.cy,w,d,z,h,role,label,color,material,face,extra);
}
function worldPart(f,q){
  assert.equal(f.rot||0,0);
  return{...clone(q),x:round(f.cx+q.x),y:round(f.cy+q.y),...(q.cabinetDoor?{cabinetDoor:{...clone(q.cabinetDoor),
    hingeMm:q.cabinetDoor.hingeMm.map((v,i)=>round(v+[f.cx,f.cy][i]))}}:{})};
}
function relocateWorldPart(f,q){
  const color=q.material==='OakLight'?C.oak:q.material==='Cream'?C.cream:q.color;
  return{...clone(q),x:round(q.x-f.cx),y:round(q.y-f.cy),color,
    ...(q.cabinetDoor?{cabinetDoor:{...clone(q.cabinetDoor),hingeMm:q.cabinetDoor.hingeMm.map((v,i)=>round(v-[f.cx,f.cy][i]))}}:{})};
}
function led(f,id,anchor,x,y,w,d,label){
  return absolute(f,id,x,y,w,d,anchor.elevationMm-4,4,'led-strip',label,C.light,'Light',anchor.face,
    {anchorPartId:anchor.id,anchor:'panel-underside',lightWash:true,installationApproved:false});
}
function referenceStyle(variant,extra={}){
  return{revision:REVISION,variant,source:'owner-six-reference-images-20261025',status:'concept-not-original-model',
    appearanceReferenceOnly:true,notPurchasedModel:true,installationApproved:false,palette:clone(C),...extra};
}
function diningParts(f,old){
  const out=[],P=(...a)=>absolute(f,...a),Y=10000,L=2730;
  // North 600mm cream tower replaces the previous round/display/narrow stack.
  out.push(P('reference-north-cream-side-north',2125,9400,358,T,0,2700,'cabinet-side','北端奶白通顶侧板 · 留双轨前区'),
    P('reference-north-cream-side-south',2125,9982,358,T,0,2700,'cabinet-side','北端奶白通顶侧板 · 留双轨前区'),
    P('reference-north-cream-back',2125,9418,T,564,0,2700,'cabinet-back','北端18mm奶白背板'),
    P('reference-north-cream-bottom',2143,9418,340,564,0,T,'cabinet-bottom','北端18mm底板 · 止于前轨后方'),
    P('reference-north-cream-top',2143,9418,340,564,2682,T,'cabinet-top','北端通顶18mm盖板 · 不穿门板'),
    P('reference-north-cream-upper-floor',2143,9418,340,564,2250,T,'cabinet-shelf','北端上柜分层板'));
  for(let i=0;i<2;i++){
    const y=9401.5+i*300;
    out.push(P('reference-north-cream-front-'+i,2507-i*20,y,T,297,1.5,2247,'door-sliding','北端奶白平板滑门 · 不占餐椅区',C.cream,'Cream','east',
      {doorStyle:'sliding',panelIndex:i}),P('reference-north-cream-upper-front-'+i,2507,y,T,297,2251.5,447,'door-hinged','北端奶白上柜门',C.cream,'Cream','east',
      {doorStyle:'hinged',panelIndex:i}));
  }
  for(const z of[550,1050,1550,2050])out.push(P('reference-north-cream-shelf-'+z,2143,9418,340,564,z,T,'cabinet-shelf','北端封闭柜18mm分类层板'));
  // Rear-recessed supports are deliberately visible in data, not an assertion
  // that a 2730mm cabinet can safely float without engineered anchors.
  for(const[i,y]of[10030,10850,11670,12670].entries())
    out.push(P('reference-west-central-hidden-support-'+i,2135,y,30,30,0,240,'hidden-cabinet-support','后沿隐藏支承暂估 · 墙体与承重待核',C.metal,'WarmGrayMetal','east',
      {hiddenSupport:true,structuralCapacityConfirmed:false}));
  out.push(P('reference-west-central-side-north',2143,Y,340,T,240,592,'cabinet-side','悬浮视觉下柜北侧板'),
    P('reference-west-central-side-south',2143,Y+L-T,340,T,240,592,'cabinet-side','悬浮视觉下柜南侧板'),
    P('reference-west-central-back',2125,Y,T,L,240,592,'cabinet-back','18mm悬浮视觉下柜背板'),
    P('reference-west-central-bottom',2143,Y+T,340,L-2*T,240,T,'cabinet-bottom','240mm离地18mm底板'),
    P('reference-west-central-base-divider',2143,12321,340,T,258,574,'cabinet-divider','滑门与南端两抽分区板'));
  const counter=P('reference-west-central-countertop',2125,Y,400,L,832,T,'wood-countertop','850mm完成面 · 18mm通长浅木台面',C.oak,'OakLight');
  out.push(counter,P('reference-west-central-niche-back',2125,Y,T,L,850,1400,'niche-back','850至2250完整浅木中空背板',C.oak,'OakLight'));
  // Table-backed stretch: eight real wood sliding faces in two rows, not
  // fronts that pretend they can pull out through the purchased table.
  const slidingL=2330,cell=slidingL/4,rowH=296;
  for(let i=0;i<4;i++)for(let row=0;row<2;row++)
    out.push(P('reference-west-central-wood-slide-'+row+'-'+i,2507-(i%2)*20,Y+i*cell+GAP/2,T,cell-GAP,240+row*rowH+GAP/2,rowH-GAP,
      'door-sliding','木色上下分片滑门 · 餐桌后不可作拉抽',C.oak,'OakLight','east',{doorStyle:'sliding',panelIndex:i,sectionRow:row,notPullOutDrawer:true}));
  for(const z of[440,640])out.push(P('reference-west-central-closed-shelf-'+z,2143,Y+T,340,2294,z,T,'cabinet-shelf','木滑门后杯盘18mm分类板'));
  // Exactly the existing 400mm southern safe/conditional column, now two
  // drawers. Its full stroke still requires the existing temporary chair move.
  for(let row=0;row<2;row++){
    const z=240+row*296;
    out.push(P('reference-west-central-south-drawer-front-'+row,2507,12331.5,T,397,z+1.5,293,'drawer-front','南端400mm木色两抽 · 先临时移南椅',C.oak,'OakLight','east',
      {drawerLayer:row+1,maxExtensionMm:250,placement:'south-conditional-chair-clearance',requiresTemporaryChairMove:true}));
    const bx=2171,by=12348,bw=312,bd=364,bz=z+22,bh=250;
    out.push(P('reference-west-central-south-drawer-floor-'+row,bx,by,bw,bd,bz,T,'drawer-box','18mm抽屉底板',C.oak,'OakLight'),
      P('reference-west-central-south-drawer-side-north-'+row,bx,by,bw,T,bz+T,bh-T,'drawer-box','18mm抽屉北侧板',C.oak,'OakLight'),
      P('reference-west-central-south-drawer-side-south-'+row,bx,by+bd-T,bw,T,bz+T,bh-T,'drawer-box','18mm抽屉南侧板',C.oak,'OakLight'),
      P('reference-west-central-south-drawer-back-'+row,bx,by+T,T,bd-2*T,bz+T,bh-T,'drawer-box','18mm抽屉后板 · 对接两侧板',C.oak,'OakLight'));
  }
  // Full-width shallow shelves meet, rather than overlap, the real wood back.
  for(const z of[1500,1900]){
    const s=P('reference-west-central-open-shelf-'+z,2143,Y,262,L,z,T,'display-shelf','通长18mm浅木开放层板 · '+z+'高',C.oak,'OakLight');
    out.push(s,led(f,'reference-west-central-open-shelf-light-'+z,s,2360,Y+24,8,L-48,'通长开放层板底嵌暖光 · '+z));
  }
  const up=P('reference-west-central-upper-bottom',2125,Y,280,L,2250,T,'cabinet-bottom','2250上口奶白吊柜底板');
  out.push(up,led(f,'reference-west-central-upper-niche-light',up,2360,Y+24,8,L-48,'2250上口吊柜底暖光'),
    P('reference-west-central-upper-back',2125,Y+T,T,L-2*T,2268,432,'cabinet-back','上柜18mm奶白背板'),
    P('reference-west-central-upper-side-north',2143,Y,244,T,2268,432,'cabinet-side','上柜北侧板'),
    P('reference-west-central-upper-side-south',2143,Y+L-T,244,T,2268,432,'cabinet-side','上柜南侧板'),
    P('reference-west-central-upper-top',2143,Y+T,244,L-2*T,2682,T,'cabinet-top','上柜通顶18mm奶白盖板'));
  const span=L/5;
  for(let i=0;i<5;i++)out.push(P('reference-west-central-upper-cream-front-'+i,2387,Y+i*span+1.5,T,span-3,2269.5,429,
    'door-hinged','奶白平板上柜门 · 上口2250至2700',C.cream,'Cream','east',{doorStyle:'hinged',panelIndex:i}));
  // Southern corner/return coordinates, door hinges and all section dimensions
  // survive exactly; only their visible cream/oak shades follow this palette.
  out.push(...old.parts.filter(q=>q.id.startsWith('corner800-')||q.id.startsWith('corner-return-')).map(q=>relocateWorldPart(f,worldPart(old,q))));
  return out;
}
function rebuildDining(p){
  const f=p.defaultFurniture.find(q=>q.id===CABINET_ID),old=clone(f);assert.ok(f?.cornerDoorDesign);assert.equal(f.d,4290);
  Object.assign(f,{cy:11645,d:4490,baseDepthMm:4490,color:C.cream,baseWidthMm:1625,baseHeightMm:2700,
    layoutRevision:REVISION,cabinetRevision:REVISION,name:'奶白通顶餐边柜 · 浅木整面中空与悬浮视觉下柜',
    referenceStyle:referenceStyle('cream-oak-reference-sideboard',{fullWoodNiche:true,floatingBaseVisualMm:240,hiddenSupportPending:true})});
  f.sourceFootprintMm={x:2125,y:9400,w:1625,d:4490};f.parts=diningParts(f,old);
  f.notes=CONDITIONS.slice(2,6).join(' ');f.sourceNotes='业主2026-10-25餐边柜正面照片；只提取奶白平板、完整浅木中空、悬浮视觉下柜、木层板和灯带语言，按本户尺寸重建，不照抄照片户型。';
  f.conditions=[...CONDITIONS.slice(2,6),CONDITIONS[9],...old.conditions.filter(s=>/180|先西|虚拟轴|浅型L|连通的浅|870/.test(s))];
  f.cornerDoorDesign=clone(old.cornerDoorDesign);
  f.cornerDoorDesign.focusBoundsMm=old.cornerDoorDesign.focusBoundsMm.map((v,i)=>round(v+[old.cx-f.cx,old.cy-f.cy,old.cx-f.cx,old.cy-f.cy][i]));
  const chair=clone(old.cornerDoorDesign.operatingChair);chair.relativeMm=[round(chair.cx-f.cx),round(chair.cy-f.cy)];
  f.cornerDoorDesign.operatingChair=chair;
  f.cabinetDesign={...clone(old.cabinetDesign),revision:REVISION,layoutRevision:REVISION,title:'奶白平板通顶 · 浅木整面中空餐边柜',
    sourceReference:REF_IMAGES[1],palette:{door:C.cream,wood:C.oak,counter:C.oak,metal:C.metal,light:C.light},
    boardThicknessMm:T,doorGapMm:GAP,materialColorRespect:true,
    faces:old.cabinetDesign.faces.map(q=>q.face==='east'?{...clone(q),lengthMm:4090}:clone(q)),
    features:['北端600mm奶白通顶平板柜；中央完整浅木中空，2250–2700奶白上柜，不再使用圆弧收口/竖展示分区。',
      '2730mm全长浅木层板在1500/1900高，2250上口及两板底均有真实锚固暖光灯带。',
      '下柜240mm离地悬浮视觉，后沿隐藏支承暂估；餐桌后为上下分片木滑门而非拉出抽屉。',
      '最南400mm为两木抽，保持原先开柜前临时移南椅规则；南转角180°库门和425返柜结构不动。'],
    dimensions:['西直臂4090×400mm（原4890减800），总包1625×4490mm；北9400、南13890。',
      '中央台面2730×400，完成高850；下柜240–832、18mm台面，浅木中空850–2250。',
      '1500/1900mm两道18mm层板，灯带底1496/1896；上口2250mm底暖光2246，电源与检修待核。',
      '板18mm、门缝3mm，南转角原世界构造、操作门轴与临时椅位均保持；所有承重和下单尺寸待定制方核验。'],
    layoutAdaptations:{...clone(old.cabinetDesign.layoutAdaptations),northEndRetreatMm:800,northEndMm:9400,southEndMm:13890,
      currentStraightLengthMm:4090,currentCentralCounterLengthMm:2730,
      drawerColumn:{yStartMm:12330,yEndMm:12730,widthMm:400,drawerCount:2,maxExtensionMm:250},
      drawerReason:'餐桌后2330mm明确为滑门，只有最南400mm两抽可概念拉出，仍须先临时移南餐椅。',
      actualLayoutConstraints:{drawerFullExtensionMm:250,drawerFullExtensionRequiresMovingChair:true,drawerOperatingChairId:'family-f27',
        drawerOperatingChairPoseMm:[3420,12080],drawerTableInterference:false,operationAndCirculationCertified:false},
      cornerStorage:{...clone(old.cabinetDesign.layoutAdaptations.cornerStorage),operatingChair:clone(chair)}}};
  for(let i=19;i<=23;i++){
    const q=p.defaultFurniture.find(f=>f.id==='family-elec-p'+i);assert.ok(q?.electricalDesign?.anchor);
    q.electricalDesign.anchor={...clone(q.electricalDesign.anchor),localCenterMm:[q.cx-f.cx,q.cy-f.cy,q.electricalDesign.centerHeightMm-(f.elevationMm||0)],
      baseHostDimensionsMm:[f.w,f.d,f.heightMm],hostRotationDegrees:f.rot||0,surfaceVerifiedAgainstCurrentModel:true};
    q.electricalDesign.layoutRevision=REVISION;q.layoutRevision=REVISION;
  }
  return f;
}
function tvParts(f){
  const out=[],P=(id,...a)=>local(f,f.id+'-reference-'+id,...a),wood=(id,x,y,w,d,z,h,role,label,extra={})=>P(id,x,y,w,d,z,h,role,label,C.walnut,'OakDark','south',extra);
  out.push(wood('top',-1100,-170,2200,340,412,T,'wood-countertop','18mm哑光中深木顶板'),
    wood('bottom',-1100,-170,2200,340,100,T,'cabinet-bottom','细腿上18mm底板'),
    wood('back',-1082,-170,2164,12,118,294,'cabinet-back','12mm多格薄背板'),
    wood('side-left',-1100,-170,T,340,118,294,'cabinet-side','18mm左侧板'),
    wood('side-right',1082,-170,T,340,118,294,'cabinet-side','18mm右侧板'));
  for(const x of[-378,-9,360])out.push(wood('divider-'+x,x,-158,T,310,118,294,'cabinet-divider','18mm小格与中央抽屉分隔板'));
  for(const[i,x]of[-1082,378].entries()){
    out.push(wood('open-shelf-left-'+i,x,-158,343,310,255,T,'cabinet-shelf','开放格18mm层板 · 对接竖板'),
      wood('open-shelf-right-'+i,x+361,-158,343,310,255,T,'cabinet-shelf','开放格18mm层板 · 对接竖板'),
      wood('open-divider-'+i,x+343,-158,T,310,118,294,'cabinet-divider','开放格18mm竖板'));
  }
  for(let col=0;col<2;col++)for(let row=0;row<3;row++){
    const x=col===0?-360:9,z=118+row*98;
    out.push(wood('small-drawer-front-'+col+'-'+row,x+1.5,151.5,348,T,z+1.5,95,'drawer-front','中央两列三行小木抽',
      {drawerLayer:row+1,drawerColumn:col+1,maxExtensionMm:200}),
      wood('small-drawer-floor-'+col+'-'+row,x+18,-134,315,268,z+16,12,'drawer-box','小抽12mm底板'),
      wood('small-drawer-side-left-'+col+'-'+row,x+18,-134,12,268,z+28,52,'drawer-box','小抽12mm左侧板'),
      wood('small-drawer-side-right-'+col+'-'+row,x+321,-134,12,268,z+28,52,'drawer-box','小抽12mm右侧板'),
      wood('small-drawer-back-'+col+'-'+row,x+30,-134,291,12,z+28,52,'drawer-box','小抽12mm背板'),
      P('small-drawer-knob-'+col+'-'+row,x+172,169.5,7,.5,z+46,7,'handle-recess','小抽内凹深色圆孔示意',C.metal,'WarmGrayMetal','south'));
  }
  for(const x of[-1040,1010])for(const y of[-130,100])out.push(wood('leg-'+x+'-'+y,x,y,30,30,0,100,'cabinet-leg','30mm细木腿 · 承重待核',
    {structuralCapacityConfirmed:false}));
  return out;
}
function rebuildTv(f){
  assert.deepEqual([f.w,f.d,f.heightMm],[2200,340,430]);
  Object.assign(f,{name:'电视矮柜 · 哑光木多格与六小抽',parts:tvParts(f),color:C.walnut,
    baseWidthMm:f.w,baseDepthMm:f.d,baseHeightMm:f.heightMm,cabinetRevision:REVISION,layoutRevision:REVISION,
    referenceStyle:referenceStyle('walnut-open-drawer-tvstand',{drawerColumns:2,drawerRows:3,thinLegsMm:30}),
    notes:'2026-10-25参考电视墙图片，保留2200×340×430mm原位，改18mm中深木薄板多格开放柜、中央两列三行小抽及30mm细腿；没有新增茶几。实物承重、走线、散热及防倾倒待核。',
    conditions:['2200×340×430mm外包及原位保持；图片只作多格、木色、小抽和细腿造型参考，不是原柜或已购产品。',
      '开放格18mm板、12mm背/小抽板与30mm腿仅概念，承重、支承、防倾倒、插座与影音散热需定制方深化。'],
    cabinetDesign:{revision:REVISION,title:'哑光木多格电视矮柜',status:'concept-not-original-model',boardThicknessMm:18,backThicknessMm:12,doorGapMm:3,
      palette:{door:C.walnut,wood:C.walnut},faces:[{face:'south',lengthMm:2200,depthMm:340,label:'中深木多格电视柜'}],
      features:['两翼真实开放小格；中央两列三行六小抽；100mm细腿离地。','电视/柜体原位、总包不动，原购买家具不替换。'],
      dimensions:['2200×340×430mm，100mm细腿、18mm主板、12mm薄背和小抽板；厂家承重与走线待核。']}});
}
function wardrobeParts(f,H,master){
  const out=[],P=(id,...a)=>local(f,f.id+'-reference-'+id,...a),W=2240,X=-1120,NICHE=460,split=X+NICHE,closedW=1780;
  const wood=(id,x,y,w,d,z,h,role,label,extra={})=>P(id,x,y,w,d,z,h,role,label,C.oak,'OakLight','south',extra);
  out.push(P('side-niche',X,-300,T,582,0,H,'cabinet-side','18mm通顶外侧板 · 止于前门背面'),
    P('side-closed',1102,-300,T,582,0,H,'cabinet-side','18mm通顶外侧板 · 止于前门背面'),
    P('niche-divider',split-T,-282,T,564,18,H-36,'cabinet-divider','18mm开放龛与衣柜分隔板'),
    P('closed-back',split,-300,1762,T,0,H,'cabinet-back','18mm奶白封闭柜背'),
    P('bottom',X+T,-282,2204,564,0,T,'cabinet-bottom','18mm通长底板'),
    P('top',X+T,-282,2204,564,H-T,T,'cabinet-top','按房间模型高度通顶18mm盖板'),
    P('closed-upper-floor',split,-282,1762,540,2250,T,'cabinet-shelf','2250mm上柜分层板'));
  for(let i=0;i<3;i++){
    const span=closedW/3,x=split+i*span+1.5;
    out.push(P('closed-low-slide-'+i,x,282-(i%2)*20,span-3,T,19.5,2229,'door-sliding','奶白下部滑门 · 不向555mm床尾带外伸',C.cream,'Cream','south',
      {doorStyle:'sliding',panelIndex:i}),P('closed-upper-door-'+i,x,282,span-3,T,2269.5,H-2271,'door-hinged','通顶奶白上柜门 · 开启待核',C.cream,'Cream','south',
      {doorStyle:'hinged',panelIndex:i}));
  }
  for(const x of[split+580,split+1160])out.push(P('closed-divider-'+x,x,-282,T,540,18,2232,'cabinet-divider','18mm挂衣叠衣内分区板'));
  for(const z of[450,900,1350,1800])out.push(P('closed-fold-'+z,split+1178,-282,584,540,z,T,'cabinet-shelf','封闭叠衣区18mm层板'));
  for(const[i,[a,b]]of[[split,split+580],[split+598,split+1160]].entries())
    out.push(P('closed-rail-'+i,a+20,-8,b-a-40,16,2050,16,'hanging-rail','黑色挂衣杆示意',C.metal,'WarmGrayMetal','south'));
  if(master){
    out.push(P('niche-back',X+T,-300,424,T,18,2232,'niche-back','入口端挂衣开放龛薄背'),
      wood('niche-counter',X+T,-282,424,564,620,T,'wood-countertop','两木抽上18mm浅木台面'),
      P('niche-rail',X+38,-8,384,16,2050,16,'hanging-rail','入口挂衣龛黑杆',C.metal,'WarmGrayMetal','south'));
    const cap=P('niche-cap',X+T,-282,424,564,2250,T,'cabinet-shelf','入口龛顶18mm奶白板');out.push(cap,
      P('niche-led',X+36,240,388,8,2246,4,'led-strip','挂衣龛顶板底暖光',C.light,'Light','south',
        {anchorPartId:cap.id,anchor:'panel-underside',installationApproved:false}));
    out.push(P('niche-upper-front',X+1.5,282,457,T,2269.5,H-2271,'door-hinged','挂衣龛上奶白通顶封闭门',C.cream,'Cream','south',{doorStyle:'hinged',panelIndex:3}));
    for(let row=0;row<2;row++){
      const z=18+row*301;
      out.push(wood('niche-drawer-front-'+row,X+19.5,282,421,T,z+1.5,298,'drawer-front','入口挂衣龛下两木抽 · 床尾操作待核',
        {drawerLayer:row+1,maxExtensionMm:250,operatingClearanceConfirmed:false}),
        wood('niche-drawer-floor-'+row,X+36,-246,388,492,z+20,T,'drawer-box','木抽18mm底板'),
        wood('niche-drawer-side-left-'+row,X+36,-246,T,492,z+38,230,'drawer-box','木抽18mm侧板'),
        wood('niche-drawer-side-right-'+row,X+406,-246,T,492,z+38,230,'drawer-box','木抽18mm侧板'),
        wood('niche-drawer-back-'+row,X+54,-246,352,T,z+38,230,'drawer-box','木抽18mm后板'));
    }
  }else{
    const bottom=180,apex=2210,radius=212,spring=apex-radius;
    out.push(P('arch-back',X+T,-300,424,T,bottom,apex-bottom,'arched-niche-back','18mm粉色拱形薄背 · 真实空龛',C.pink,'PaintPink','south',
      {shape:'arched-back',archRadiusMm:radius,archRiseMm:radius,archSpringHeightMm:spring-bottom,openNiche:true,backThicknessMm:T}),
      P('arch-front-spandrel',X,282,460,T,spring,2250-spring,'arched-niche-spandrel','奶白拱洞上方18mm前饰板 · 不封洞',C.cream,'Cream','south',
        {shape:'arch-spandrel',openingWidthMm:424,openingInsetMm:T,archRadiusMm:radius,archRiseMm:radius,
          openingBelowPart:true,openNiche:true,solidFiller:false}),
      P('arch-bottom',X+T,-282,424,564,bottom,T,'cabinet-bottom','拱龛18mm白色底板'),
      P('arch-upper-floor',X+T,-282,424,564,2250,T,'cabinet-shelf','拱龛上方18mm分层板'),
      P('arch-upper-front',X+1.5,282,457,T,2269.5,H-2271,'door-hinged','拱龛上奶白通顶门',C.cream,'Cream','south',{doorStyle:'hinged',panelIndex:3}));
    for(const z of[500,900,1300,1700])out.push(P('arch-white-shelf-'+z,X+T,-282,424,564,z,T,'display-shelf','粉色拱龛内18mm白层板 · '+z));
    // The outer side/divider are cream carcass plates, so the arch has real
    // vertical jambs and the pink finish remains a rear sheet, not a prism.
  }
  return out;
}
function rebuildWardrobe(p,id){
  const f=p.defaultFurniture.find(q=>q.id===id),master=id==='family-f3',room=p.ROOMS.find(r=>r.id===f.roomId),H=room.heightMm;
  assert.deepEqual([f.w,f.d],[2240,600]);
  Object.assign(f,{heightMm:H,baseHeightMm:H,baseWidthMm:2240,baseDepthMm:600,color:C.cream,parts:wardrobeParts(f,H,master),
    layoutRevision:REVISION,cabinetRevision:REVISION,name:master?'主卧通顶奶白衣柜 · 入口挂衣龛与两木抽':'次卧通顶奶白衣柜 · 窗边粉色拱形开放龛',
    referenceStyle:referenceStyle(master?'master-cream-wardrobe':'child-pink-arch-wardrobe',{
      nicheWidthMm:460,nicheLocation:master?'south-entry-end':'north-window-end',bedFootGapMm:555,realOpenNiche:true}),
    dimensionStatus:'reference-image-concept-current-room-envelope',
    notes:(master?'主卧入口南端460mm挂衣龛、黑杆、顶灯带和下方两木抽。':'次卧窗边北端460mm粉色高拱开放龛，18mm粉色薄背、奶白拱饰板及四道白层板，不是实心粉块。')+
      ' 原2240×600mm占地、柜面方向与床尾555mm保持，主要下柜奶白滑门不向床尾外开；通顶高度仅跟随房间模型，安装收口和真实操作待厂家复核。',
    conditions:[CONDITIONS[6],CONDITIONS[7],CONDITIONS[9]],
    cabinetDesign:{revision:REVISION,title:master?'主卧奶白通顶与入口挂衣龛':'次卧奶白通顶与粉色高拱龛',status:'concept-not-original-model',
      boardThicknessMm:T,doorGapMm:GAP,bedFootGapMm:555,roomModelCeilingMm:H,ceilingStatus:'model-only-site-check-pending',
      palette:{door:C.cream,wood:C.oak,pink:C.pink,metal:C.metal,light:C.light},faces:[{face:'south',label:'柜正面随原旋转',lengthMm:2240,depthMm:600}],
      features:master?['主要下柜奶白滑门和通顶奶白上柜；入口端真实开放挂衣龛、黑杆、顶灯带与两木抽。']:
        ['主要下柜奶白滑门和通顶奶白上柜；靠窗端真实粉色拱形薄背、奶白拱饰板、四道白层板，不用实心色块冒充开放柜。'],
      dimensions:[`2240×600×${H}mm，18mm板、3mm门缝，龛外宽460mm、净宽424mm；床尾555mm偏紧，不作舒适通行认证。`,
        '所有结构、轨道、上门开角、墙体固定、承重和现场完成尺寸待核；下单前须现场深化。']}});
}
function rebuildStudy(f){
  const out=[],x=-f.w/2,y=-f.d/2;
  for(const z of[1500,1950]){
    const s=local(f,f.id+'-reference-shelf-'+z,x,y,f.w,f.d,z,T,'display-shelf','书房通长18mm浅木悬板 · '+z,C.oak,'OakLight','north');
    out.push(s,local(f,f.id+'-reference-led-'+z,x+24,y+35,f.w-48,8,z-4,4,'led-strip','真实悬板底暖光 · '+z,C.light,'Light','north',
      {anchorPartId:s.id,anchor:'panel-underside',installationApproved:false}));
    for(let i=0;i<3;i++)out.push(local(f,f.id+'-reference-hidden-bracket-'+z+'-'+i,x+60+i*((f.w-150)/2),f.d/2-12,30,12,z-34,34,
      'hidden-shelf-support','后沿隐藏支承示意 · 基层及锚固待核',C.metal,'WarmGrayMetal','north',{hiddenSupport:true,structuralCapacityConfirmed:false}));
  }
  Object.assign(f,{parts:out,color:C.oak,cabinetRevision:REVISION,layoutRevision:REVISION,
    baseWidthMm:f.w,baseDepthMm:f.d,baseHeightMm:f.heightMm,
    name:'书房南墙 · 两道浅木悬板与板底暖光',referenceStyle:referenceStyle('two-floating-oak-shelves',{shelfBottomsMm:[1500,1950],boardThicknessMm:18}),
    notes:'2026-10-25书房参考图：原1450×282.5mm占地不动，将56件四格书柜替换为1500/1950mm两道18mm浅木通长悬板及真实板底暖光，取消旧竖隔、背板、高柜门与书占位。隐藏支架和悬挂承重待厂家深化。',
    conditions:['原1450×282.5mm投影及东端x1570避门范围保持；两悬板1500/1950高、18mm厚、各自真实底面暖光。',
      '完整18mm板和4mm灯带仍应参与门叶扫掠检查，不能当成空投影；基层、锚固、承重、眩光与驱动检修待核。'],
    cabinetDesign:{revision:REVISION,title:'书房两道浅木悬板',status:'concept-not-original-model',boardThicknessMm:T,doorGapMm:0,
      palette:{wood:C.oak,light:C.light},faces:[{face:'north',lengthMm:f.w,depthMm:f.d,label:'书房南墙两悬板'}],
      features:['两道真实18mm通长木板，不以实心大柜体代替。','各悬板底面真实4mm暖光灯带，后沿隐藏支承仅概念。'],
      dimensions:['1450×282.5mm原投影，板底1500/1950mm；18mm厚，灯带底1496/1946mm。','保留旧家具2500mm概念上包框供兼容，实际可见板顶1968mm；门、基层、锚固和承重待核。']}});
}
function tagFurniture(p){
  const diningLamp=p.defaultFurniture.find(f=>f.id==='family-dining-ceilinglight');
  Object.assign(diningLamp,{name:'餐厅细黄铜折臂吊灯 · 效果参考暂估',w:1000,d:380,heightMm:760,elevationMm:1940,
    modelVariant:'reference-articulated-pendant',referenceStyle:referenceStyle('articulated-dining-pendant'),layoutRevision:REVISION,
    sourceFootprintMm:{x:2455,y:10810,w:1000,d:380},dimensionStatus:'reference-appearance-design-pending',
    lightingDesign:{revision:REVISION,variant:'articulated-dining-pendant',dimensionsMm:[1000,380,760],
      ceilingHeightMm:2700,bottomMm:1940,fixtureSelected:false,installationApproved:false,lightingCalculated:false,
      notes:'按参考图细杆与锥形罩重建；尺寸为场景暂估，不是已购型号或照度/配线确认。'}});
  const tags={bed_a:'master-channel-bed',bed_b:'child-arch-bed','draft-night-a':'oak-two-drawer-nightstand',
    'draft-night-b':'round-child-nightstand','draft-chair-a':'cream-wood-chair','draft-chair-b':'cream-wood-chair',
    'family-f5':'cream-wood-chair','draft-desk-a':'floating-desk','draft-desk-b':'floating-desk',
    'study_full_desk':'floating-desk','study_window_return':'floating-desk','study_north_sofa':'low-linen-sofa','family-living-rug':'woven-rug'};
  for(const[id,variant]of Object.entries(tags)){
    const f=p.defaultFurniture.find(q=>q.id===id);assert.ok(f,'Reference style target '+id);
    f.referenceStyle=referenceStyle(variant,{preserveExistingEnvelope:true,...(id==='bed_a'?{upholsteryColor:'#E4DCCF',channels:true}:
      id==='bed_b'?{upholsteryColor:'#EEE2DC',accentColor:C.pink}:{} )});
    f.layoutRevision=REVISION;
    if(id==='draft-desk-a'||id==='draft-desk-b'||id==='study_full_desk'||id==='study_window_return')f.color=C.cream;
    if(id==='draft-night-a')f.color=C.oak;
    if(id==='draft-night-b')f.color=C.cream;
    if(id==='study_north_sofa')f.color='#E8E0D1';
  }
}
function verify(p,old){
  const f=p.defaultFurniture.find(q=>q.id===CABINET_ID),cabOld=old.defaultFurniture.find(q=>q.id===CABINET_ID);
  assert.deepEqual([f.cx,f.cy,f.w,f.d,f.heightMm],[2937.5,11645,1625,4490,2700]);
  const top=f.parts.find(q=>q.id==='reference-west-central-countertop');
  assert.deepEqual([top.x+f.cx,top.y+f.cy,top.w,top.d,top.elevationMm+top.heightMm],[2125,10000,400,2730,850]);
  for(const q of cabOld.parts.filter(q=>q.id.startsWith('corner800-')||q.id.startsWith('corner-return-'))){
    const a=worldPart(cabOld,q),b=worldPart(f,f.parts.find(n=>n.id===q.id));delete a.color;delete b.color;
    assert.deepEqual(b,a,'South corner/return world geometry and hinge remain exact '+q.id);
  }
  for(const id of['family-f6','family-f23','family-f24','family-f25','family-f26','family-f27'])
    assert.deepEqual(p.defaultFurniture.find(q=>q.id===id),old.defaultFurniture.find(q=>q.id===id),'Purchased furniture stays exact '+id);
  for(const id of['family-sideboard-blender','family-sideboard-temperaturekettle','family-sideboard-sterilizer','family-sideboard-healthkettle','family-sideboard-waterdispenser'])
    assert.deepEqual(p.defaultFurniture.find(q=>q.id===id),old.defaultFurniture.find(q=>q.id===id),'Counter appliance body stays exact '+id);
  for(const id of[TV_ID,...WARDROBE_IDS,STUDY_ID]){
    const a=p.defaultFurniture.find(q=>q.id===id),b=old.defaultFurniture.find(q=>q.id===id);
    assert.deepEqual([a.cx,a.cy,a.w,a.d,a.rot],[b.cx,b.cy,b.w,b.d,b.rot],'Cabinet placement preserved '+id);
  }
  for(const f of p.defaultFurniture.filter(q=>[CABINET_ID,TV_ID,...WARDROBE_IDS,STUDY_ID].includes(q.id))){
    assert.equal(new Set(f.parts.map(q=>q.id)).size,f.parts.length,'Unique cabinet parts '+f.id);
    for(const q of f.parts){
      assert.ok(q.w>0&&q.d>0&&q.heightMm>0,'Positive real panel '+q.id);
      assert.ok(q.x>=-f.w/2-.001&&q.y>=-f.d/2-.001&&q.x+q.w<=f.w/2+.001&&q.y+q.d<=f.d/2+.001,'Part fits envelope '+q.id);
      assert.ok(q.elevationMm>=0&&q.elevationMm+q.heightMm<=f.heightMm+.001,'Panel below model roof '+q.id);
      if(q.role==='led-strip'){
        const a=f.parts.find(s=>s.id===q.anchorPartId);assert.ok(a&&Math.abs(q.elevationMm+q.heightMm-a.elevationMm)<.001,'LED truly under panel '+q.id);
      }
    }
  }
}
function applyFamilyReferenceFinish(bundle){
  const p=bundle.schemes.family;assert.ok(p?.metadata.familyLivingEastUpdate,'Apply after east-wall sofa layout');
  assert.ok(!p.metadata.familyReferenceFinishUpdate,'Reference finish layer already applied');assert.equal(p.defaultFurniture.length,120);
  const old=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])])),previousROOMS=clone(p.ROOMS);
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  const roomMaterialChanges=[];
  for(const id of['room_a','room_b','room_c']){
    const r=p.ROOMS.find(q=>q.id===id);assert.ok(r);roomMaterialChanges.push({roomId:id,previousMat:r.mat,mat:'wood',materialIntent:'real-wood-not-wood-look-tile'});r.mat='wood';
  }
  rebuildDining(p);rebuildTv(p.defaultFurniture.find(q=>q.id===TV_ID));
  for(const id of WARDROBE_IDS)rebuildWardrobe(p,id);
  rebuildStudy(p.defaultFurniture.find(q=>q.id===STUDY_ID));tagFurniture(p);
  const previousById=new Map(old.defaultFurniture.map(q=>[q.id,q])),changedIds=p.defaultFurniture.filter(q=>!isDeepStrictEqual(q,previousById.get(q.id))).map(q=>q.id);
  const previousFurniture=changedIds.map(id=>clone(previousById.get(id)));
  const cabinetIds=[CABINET_ID,TV_ID,...WARDROBE_IDS,STUDY_ID];
  p.metadata.conditions=[...(p.metadata.conditions||[]),...CONDITIONS];
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:DATE,sourceIds:changedIds,
    description:'方案2按六张业主参考图重建餐边、电视、两卧柜及书房两悬板；餐边相对原长缩800，三卧真木地板、床桌软装造型标签，已购沙发餐桌餐椅及无茶几布局保持。',sourceSnapshotsUnchanged:true}];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-reference-finish-20261025.cjs';
  p.metadata.familyReferenceFinishUpdate={id:REVISION,date:DATE,title:'方案2 · 六图奶白浅木柜与卧室参考深化',status:'concept-not-original-model',
    sourceImages:[...REF_IMAGES],referenceAppearanceOnly:true,sourceSnapshotsUnchanged:true,architectureUnchangedExceptRoomMaterials:true,
    wallDoorWindowGeometryUnchanged:true,otherSchemesUnchanged:true,purchasedLivingAndDiningFurnitureUnchanged:true,noCoffeeTable:true,
    styleSpec:{revision:REVISION,palette:clone(C),bedroomFlooring:'real-wood',publicFlooringUnchanged:true,
      dining:{northEndMm:9400,southEndMm:13890,retreatFromOriginalMm:800,originalStraightLengthMm:4890,straightLengthMm:4090,
        centralCounterRectMm:[2125,10000,2525,12730],counterFinishedHeightMm:850,nicheTopMm:2250,woodShelfBottomsMm:[1500,1900],
        upperCreamBandMm:[2250,2700],floatingBaseVisualMm:240,hiddenSupportsModeled:true,structuralCapacityConfirmed:false,
        tableBackedFronts:'wood-sliding-not-pullout-drawers',southernDrawerBandMm:[12330,12730],southernDrawerCount:2,
        southCornerWorldGeometryUnchanged:true,hingeOpeningDegrees:180,temporaryChairMoveStillRequired:true},
      tvstand:{outerMm:[2200,340,430],matteMediumDarkWood:true,openCubbies:true,smallDrawerColumns:2,smallDrawerRows:3,thinLegHeightMm:100},
      wardrobes:{fixedPlanMm:[2240,600],bedFootGapMm:555,lowerDoors:'sliding',masterHeightMm:2790,childHeightMm:2700,
        masterEntryNicheMm:460,masterWoodDrawers:2,childWindowArchNicheMm:460,childArchBackThicknessMm:18,childWhiteShelfCount:4,
        archShapeContracts:['arched-back','arch-spandrel'],constructionApproval:false},
      study:{twoRealWoodShelves:true,shelfBottomsMm:[1500,1950],boardThicknessMm:18,underBoardLed:true,
        deskVariant:'floating-desk',sofaVariant:'low-linen-sofa'},
      softFurniturePreservesExistingEnvelopes:true,notSourceRoomReconstruction:true,installationApproved:false},
    roomMaterialChanges,previousROOMS,previousFurniture,previousFurnitureOrder:old.defaultFurniture.map(q=>q.id),previousMetadataFields,
    previousPlanFields:{ROOMS:clone(previousROOMS)},changedFurnitureIds:changedIds,newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],
    preserveCustomSizeIds:cabinetIds,preserveCustomPartsIds:cabinetIds,
    migrationFields:Object.fromEntries(changedIds.map(id=>[id,changed(previousById.get(id),p.defaultFurniture.find(q=>q.id===id))]))};
  verify(p,old);
  for(const k of Object.keys(old))if(!['metadata','defaultFurniture','ROOMS'].includes(k))assert.deepEqual(p[k],old[k],'Unchanged architecture '+k);
  for(const k of Object.keys(old.metadata))if(!META_KEYS.includes(k))assert.deepEqual(p.metadata[k],old.metadata[k],'Historical metadata exact '+k);
  for(const[id,before]of Object.entries(others))assert.deepEqual(bundle.schemes[id],before,'Other scheme exact '+id);
  assert.deepEqual(beforeFamilyReferenceFinish(p),old,'Independent finish leaf exact rollback');
  return bundle;
}
function beforeFamilyReferenceFinish(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyReferenceFinishUpdate;if(!m)return out;
  const old=new Map(m.previousFurniture.map(q=>[q.id,q])),now=new Map(p.defaultFurniture.map(q=>[q.id,q]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||now.get(id)));
  for(const[k,v]of Object.entries(m.previousPlanFields))p[k]=clone(v);
  for(const k of META_KEYS){if(m.previousMetadataFields[k]===undefined)delete p.metadata[k];else p.metadata[k]=clone(m.previousMetadataFields[k]);}
  delete p.metadata.familyReferenceFinishUpdate;return out;
}
module.exports={applyFamilyReferenceFinish,beforeFamilyReferenceFinish,REVISION};
