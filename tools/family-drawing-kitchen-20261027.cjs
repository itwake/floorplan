'use strict';

// This is a furniture/services substep of family-drawing-20261027. The parent
// owns the architectural DWG reconstruction and its reversible history. Do not
// reopen the shared window wall to accommodate the former two-machine recess.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const clone=structuredClone,REVISION='family-drawing-kitchen-20261027';
const SOURCE={id:'owner-construction-dwg-20261027',sha256:'405226e8cc00211cc665399110ab7de0f54daeb29c0a456b5f528c1d0db08eb0',
  sheets:['PL-02','PL-03','PL-06','EL-05','EL-06','EL-07'],unit:'mm',status:'drawing-reconstruction-not-site-survey-or-approval'};
const GEOMETRY={kitchen:{floor:[[5610,11290],[8030,11290],[8030,13890],[5690,13890],[5690,13360],[5610,13360]],
  fridgeBay:[5610,11290,6410,11890],applianceCabinetBay:[6410,11290,7010,11890],
  sinkBay:[7430,11890,8030,12690],dishwasherBay:[7430,12690,8030,13290],hob:[6335,13360,7085,13810],shaft:[5690,13440,6100,13890]},
  balcony:{floor:[[7040,9560],[8090,9560],[8090,11050],[7930,11050],[7930,11160],[7040,11160]],
    sharedWindow:[7040,11160,7930,11290],windowSillMm:1000,windowHeightMm:1350,
    dryerCabinet:[7155,10490,7815,11160],dryerCavity:[7175,10490,0,7795,11140,980]},
  shoe:{upper:[5110,13290,5460,13890],bottom:[4990,13290,5460,13890],robotCavity:[4990,13310,0,5440,13870,600]}};
const round=n=>Math.round(n*1000)/1000;
function footprint(f){const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));return{x:round(f.cx-w/2),y:round(f.cy-d/2),w:round(w),d:round(d)};}
function move(f,cx,cy,rot){Object.assign(f,{cx,cy,rot,layoutRevision:REVISION});f.sourceFootprintMm=footprint(f);}
function partBuilder(f){const out=[];return{out,P(id,x,y,w,d,z,h,role,label,material='Cream',face='west',extra={}){
  assert.ok(w>0&&d>0&&h>0,'Nonpositive part '+id);
  const q={id,x:round(x-f.cx),y:round(y-f.cy),w:round(w),d:round(d),elevationMm:round(z),heightMm:round(h),role,label,
    color:material==='OakLight'?'#C6AA83':material==='Stone'?'#ECE8DF':material==='Light'?'#FFF1CF':material==='Steel'?'#9DABA8':material==='Tile'?'#E8E5DF':'#F3EFE6',material,face,...extra};out.push(q);return q;
}};}
function setFixture(f,rect,h,name){Object.assign(f,{name,cx:(rect[0]+rect[2])/2,cy:(rect[1]+rect[3])/2,w:rect[2]-rect[0],d:rect[3]-rect[1],heightMm:h,elevationMm:0,rot:0,
  baseWidthMm:rect[2]-rect[0],baseDepthMm:rect[3]-rect[1],baseHeightMm:h,layoutRevision:REVISION,cabinetRevision:REVISION});f.sourceFootprintMm=footprint(f);}
function newFixture(id,rect,h,name,roomId){const f={id,sourceId:id,type:'fixture',roomId,color:'#F3EFE6',dimensionStatus:'drawing-adapted-installation-pending',installationApproved:false};setFixture(f,rect,h,name);return f;}
function upsert(p,f){const i=p.defaultFurniture.findIndex(q=>q.id===f.id);if(i<0)p.defaultFurniture.push(f);else p.defaultFurniture[i]=f;}
function rebuildShoe(p){
  const f=p.defaultFurniture.find(q=>q.id==='fit-entry_shoe_station');assert.ok(f,'Kitchen-side entry shoe cabinet missing');
  // Rebase, rather than stretch, every 20 mm panel. The upper cabinet stays in
  // its DWG 350 mm envelope; only the open robot base projects 120 mm farther.
  setFixture(f,GEOMETRY.shoe.bottom,2730,'玄关鞋柜 · 下部扫地机独立开放腔 / 上柜350深');
  const {P,out}=partBuilder(f),X=5110,Y=13290,E=5460,T=20,D=600,H=2730;
  for(const[y,s]of[[Y,'south'],[Y+D-T,'north']]){
    P('drawing-shoe-robot-side-'+s,4990,y,470,T,0,600,'cabinet-side','扫地机开放腔20mm侧板');
    P('drawing-shoe-side-'+s,X,y,350,T,620,H-620,'cabinet-side','上部鞋柜350深20mm侧板');
  }
  P('drawing-shoe-robot-back',E-T,Y+T,T,D-2*T,0,600,'cabinet-back','扫地机腔真实背板，接电及后余量待核');
  P('drawing-shoe-robot-header',4990,Y,470,D,600,T,'cabinet-bottom','扫地机腔上独立20mm隔板，下口600');
  P('drawing-shoe-base-back',E-T,Y+T,T,D-2*T,620,280,'cabinet-back','保留上方短鞋柜背板');
  for(const z of[620,880])P('drawing-shoe-lower-board-'+z,X+T,Y+T,310,D-2*T,z,T,'cabinet-shelf','短鞋柜20mm层板');
  P('drawing-shoe-counter',X,Y,350,D,900,T,'wood-countertop','原鞋柜20mm台板，完成面920');
  P('e_key_niche-niche-back',E-T,Y,T,D,920,450,'niche-back','保留450高中空真实背板及电位宿主');
  P('drawing-shoe-niche-top',X,Y,350,D,1370,T,'cabinet-bottom','中空上20mm搁板');
  P('drawing-shoe-upper-back',E-T,Y+T,T,D-2*T,1390,H-1390,'cabinet-back','上柜背板');
  P('drawing-shoe-upper-top',X+T,Y+T,310,D-2*T,H-T,T,'cabinet-top','上柜20mm顶板');
  for(let i=0;i<2;i++){
    P('drawing-shoe-lower-door-'+i,X,Y+1.5+i*D/2,T,D/2-3,641.5,237,'door-hinged','扫地机上方短鞋柜门，底部通行口无门');
    P('drawing-shoe-upper-door-'+i,X,Y+1.5+i*D/2,T,D/2-3,1391.5,H-1393,'door-hinged','保留原上柜门');
  }
  f.parts=out;f.face='west';f.referenceStyle={revision:REVISION,variant:'drawing-entry-shoe-cabinet',installationApproved:false};
  f.cabinetDesign={layoutRevision:REVISION,title:'玄关鞋柜 · 仅底部加深容纳紧凑基站',palette:{door:'#F3EFE6',wood:'#C6AA83'},faces:[{face:'west',lengthMm:D}],
    features:['上部350深、600长、2730高按图；底部开放机腔外深470，向客厅多伸120mm。','底部无底板、无踢脚、无门；净腔560宽×450深×600高，室内原地面直接进出。','基站380×450×500只作选型占位，后净余量0，接头/开盖/抽出维修未批准。'],
    dimensions:['机腔[4990,13310,0]至[5440,13870,600]；上隔板20mm，下口600mm。','入口洞西侧留外包界4990，与门洞东端4990相接；门套、基站前方通道及实际机器仍待核。']};
  f.robotCabinetDesign={revision:REVISION,ownerConfirmedLocation:true,upperDepthMm:350,bottomDepthMm:470,projectionIntoHallMm:120,
    cavityWidthMm:560,cavityDepthMm:450,cavityHeightMm:600,cavityWorldMm:clone(GEOMETRY.shoe.robotCavity),
    machineId:'balcony_robot',powerPointId:'family-elec-p35',powerAnchorPartId:'drawing-shoe-robot-back',openTo:'west',hasBottomBoard:false,hasPlinth:false,hasFrontDoor:false,
    frontStraightExitZoneMm:[4640,13400,4990,13780],nominalHallWidthToSideboardMm:1205,manufacturerClearancesConfirmed:false,connectionsConfirmed:false,installationApproved:false};
  f.notes='2026-10-27：按业主确认把扫地机器人移入厨房侧入户鞋柜底部。原350mm深柜不足，只有底部独立加深至470mm；板厚20后净深450，实际基站及插头/管接头零后余量，选型安装待核。上方450高中空与上柜保持原350mm进深及真实背板位置。';
  f.conditions=['底部560×450×600是几何净腔，不代表380×450×500基站已满足厂家通风、开盖、接线或抽出要求。','底部外包西边4990不进入1080mm入户洞；与餐边返柜东边3785的名义间隔1205mm，实际门套、门扇及动态进出待现场核验。','无门、无底板、无踢脚阻挡机器人；充电电源与供排水如需均待专业深化，不把厨房或阳台龙头自动接到基站。'];
  const robot=p.defaultFurniture.find(q=>q.id==='balcony_robot');assert.ok(robot,'Existing robot placeholder missing');
  move(robot,5215,13590,90);Object.assign(robot,{roomId:'living',face:'west',name:'紧凑扫地机基站380×450×500 · 入户鞋柜底部',elevationMm:0});
  robot.applianceDesign={...clone(robot.applianceDesign),revision:REVISION,cabinetId:f.id,netCavityMm:[560,450,600],rearNominalClearanceMm:0,frontStraightExitZoneMm:[4640,13400,4990,13780],actualProductSelected:false,connectionsConfirmed:false,installationApproved:false};
  robot.notes='业主确认移至厨房侧入户鞋柜下方，朝西、落在室内原地面；净腔560×450×600mm，机身380×450×500mm，左右各90、顶部100、背后0mm，仅占位。接头、插头、开盖、回充、取水箱与出入路线未验证，不再在阳台或原窗下条件凹柜中。';
  robot.conditions=['基站型号待定，450mm净深没有后方接线/接管余量，需按实机进一步加深或另选紧凑型号。','下口无遮门槛、底板或踢脚；前方名义1205mm通道仍须结合入户门套、柜门和行走实测。'];
  return f;
}
function rebuildKitchen(p){
  const f=p.defaultFurniture.find(q=>q.id==='fit-kitchen-20261005');assert.ok(f,'Kitchen cabinet missing');
  setFixture(f,[5610,11290,8030,13890],2400,'厨房定制柜 · 按DWG重排 / 保留890台面');
  const {P,out}=partBuilder(f),T=20;
  function northTall(id,x,w,{fridge=false}={}){
    P(id+'-west',x,11290,T,600,0,2400,'cabinet-side','20mm高柜侧板','Cream','south');
    P(id+'-east',x+w-T,11290,T,600,0,2400,'cabinet-side','20mm高柜侧板','Cream','south');
    if(fridge){
      P(id+'-bridge-bottom',x+T,11290,w-2*T,600,1940,T,'cabinet-bottom','冰箱上柜下口1940，散热条件待核','Cream','south');
      P(id+'-bridge-back',x+T,11290,w-2*T,T,1960,420,'cabinet-back','冰箱上柜背板','Cream','south');
      for(let i=0;i<2;i++)P(id+'-bridge-door-'+i,x+T+1.5+i*(w-2*T)/2,11870,(w-2*T)/2-3,T,1961.5,417,'door-hinged','冰箱上柜门','Cream','south');
    }else{
      P(id+'-back',x+T,11290,w-2*T,T,0,2400,'cabinet-back','电器高柜背板，设备型号待定','Cream','south');
      for(const z of[100,600,1100,1500])P(id+'-shelf-'+z,x+T,11310,w-2*T,580,z,T,'cabinet-shelf','电器高柜预留层板，非已购设备','OakLight','south');
      for(let i=0;i<2;i++)P(id+'-upper-door-'+i,x+T+1.5+i*(w-2*T)/2,11870,(w-2*T)/2-3,T,1521.5,857,'door-hinged','电器高柜上柜门','Cream','south');
    }
    P(id+'-top',x+T,11290,w-2*T,600,2380,T,'cabinet-top','20mm高柜顶板','Cream','south');
  }
  northTall('drawing-kitchen-fridge-bay',5610,800,{fridge:true});northTall('drawing-kitchen-appliance-tower',6410,600);
  function northBase(id,x,w){
    P(id+'-floor',x+T,11310,w-2*T,560,100,T,'cabinet-bottom','地柜20mm底板','Cream','south');
    P(id+'-back',x+T,11290,w-2*T,T,100,770,'cabinet-back','地柜背板','Cream','south');
    for(const [a,s]of[[x,'west'],[x+w-T,'east']])P(id+'-'+s,a,11290,T,600,100,770,'cabinet-side','地柜侧板','Cream','south');
    P(id+'-plinth',x,11370,w,500,0,100,'plinth','内退踢脚','Cream','south');
    for(let i=0;i<2;i++)P(id+'-door-'+i,x+1.5+i*w/2,11870,w/2-3,T,121.5,747,'door-hinged','窗下低柜门','Cream','south');
  }
  northBase('drawing-kitchen-north-low',7010,1020);
  P('drawing-kitchen-north-counter',7010,11290,1020,600,870,T,'countertop','20mm台面完成面890，窗台1000','Stone','south');
  // East 800 mm sink + 600 mm dishwasher. Shared end panels lie outside the
  // dishwasher body; there is no fake 560 mm box around a 600 mm machine.
  P('drawing-kitchen-sink-floor',7450,11910,560,760,100,T,'cabinet-bottom','水槽下柜底板，排水待深化');
  P('drawing-kitchen-sink-back',8010,11910,T,760,100,770,'cabinet-back','水槽柜背板，检修开孔待深化');
  for(const[y,s]of[[11890,'north'],[12670,'south']])P('drawing-kitchen-sink-side-'+s,7430,y,600,T,100,770,'cabinet-side','800水槽柜端板');
  for(let i=0;i<2;i++)P('drawing-kitchen-sink-door-'+i,7430,11891.5+i*400,T,397,121.5,747,'door-hinged','水槽下柜门');
  P('drawing-kitchen-sink-plinth',7500,11890,510,800,0,100,'plinth','水槽柜内退踢脚');
  // A true rectangular opening surrounds the existing 780 x 450 sink rim.
  for(const[id,x,y,w,d]of[
    ['north',7430,11890,600,10],['west',7430,11900,75,780],['east',7955,11900,75,780],['south',7430,12680,600,610]
  ])P('drawing-kitchen-east-counter-'+id,x,y,w,d,870,T,'countertop','带真实双槽缺口的20mm台面','Stone');
  // Back and legs are outside the appliance envelope, rather than through it.
  P('drawing-kitchen-dw-south-support',7430,13290,600,T,0,870,'cabinet-side','洗碗机南侧独立台面支承');
  // South run starts beyond the permanent smoke shaft at x6100.
  const segments=[[6100,6330],[6330,7110],[7110,7430],[7430,8030]];
  for(const [i,[x,e]]of segments.entries()){
    const w=e-x,id='drawing-kitchen-south-base-'+i;
    P(id+'-floor',x+T,13310,w-2*T,560,100,T,'cabinet-bottom','烟道外地柜20mm底板','Cream','north');
    P(id+'-back',x+T,13870,w-2*T,T,100,770,'cabinet-back','南地柜背板','Cream','north');
    for(const[a,s]of[[x,'west'],[e-T,'east']])P(id+'-'+s,a,13290,T,600,100,770,'cabinet-side','南地柜侧板','Cream','north');
    P(id+'-door',x+1.5,13290,w-3,T,121.5,747,'door-hinged','南地柜门','Cream','north');
    P(id+'-plinth',x,13360,w,510,0,100,'plinth','南柜内退踢脚','Cream','north');
  }
  // No part or countertop covers the permanent 410 x 450 smoke shaft.
  for(const[id,x,y,w,d]of[
    ['west',6100,13290,235,600],['north',6335,13290,750,70],['south',6335,13810,750,80],['east',7085,13290,945,600]
  ])P('drawing-kitchen-south-counter-'+id,x,y,w,d,870,T,'countertop','按灶具轮廓留口的20mm台面','Stone','north');
  function upper(id,x,y,w,d,z,h,face){
    P(id+'-bottom',x,y,w,d,z,T,'cabinet-bottom','吊柜20mm底板','Cream',face);
    P(id+'-top',x,y,w,d,z+h-T,T,'cabinet-top','吊柜20mm顶板','Cream',face);
    const west=face==='west';
    if(west){
      P(id+'-back',x+w-T,y,T,d,z+T,h-2*T,'cabinet-back','吊柜背板','Cream',face);
      for(const[a,s]of[[y,'north'],[y+d-T,'south']])P(id+'-'+s,x,a,w,T,z+T,h-2*T,'cabinet-side','吊柜侧板','Cream',face);
      const count=Math.ceil(d/500);for(let i=0;i<count;i++)P(id+'-door-'+i,x,y+1.5+i*d/count,T,d/count-3,z+21.5,h-43,'door-hinged','奶白吊柜门','Cream',face);
    }else{
      P(id+'-back',x,y+d-T,w,T,z+T,h-2*T,'cabinet-back','吊柜背板','Cream',face);
      for(const[a,s]of[[x,'west'],[x+w-T,'east']])P(id+'-'+s,a,y,T,d,z+T,h-2*T,'cabinet-side','吊柜侧板','Cream',face);
      const count=Math.ceil(w/500);for(let i=0;i<count;i++)P(id+'-door-'+i,x+1.5+i*w/count,y,w/count-3,T,z+21.5,h-43,'door-hinged','奶白吊柜门','Cream',face);
    }
    P(id+'-led',west?x+25:x+20,west?y+20:y+25,west?8:w-40,west?d-40:8,z-4,4,'led-strip','真实吊柜板底灯带','Light',face,{anchorPartId:id+'-bottom',anchor:'panel-underside',lightWash:true,installationApproved:false});
  }
  // East upper cabinets begin after the heater; the 890 mm north window stays
  // open and its wall is neither widened nor cut down to fit an appliance.
  upper('drawing-kitchen-east-upper',7730,11890,300,1400,1500,900,'west');
  upper('drawing-kitchen-south-upper-west',6100,13590,210,300,1550,850,'north');
  upper('drawing-kitchen-south-upper-east',7110,13590,920,300,1550,850,'north');
  upper('drawing-kitchen-hood-bridge',6310,13590,800,300,2020,380,'north');
  P('drawing-kitchen-east-splash',8018,11890,12,1400,890,610,'backsplash','东墙瓷砖挡水示意','Tile');
  P('drawing-kitchen-south-splash',6100,13878,1930,12,890,660,'backsplash','南墙瓷砖挡水示意','Tile','north');
  f.parts=out;f.referenceStyle={revision:REVISION,variant:'drawing-cream-kitchen',installationApproved:false};
  f.drawingKitchenDesign={revision:REVISION,source:clone(SOURCE),geometry:clone(GEOMETRY.kitchen),cabinetTopMm:2400,countertopTopMm:890,boardThicknessMm:T,
    kitchenInteriorWidthMm:2420,kitchenInteriorDepthMm:2600,oldLowerSharedServiceOpeningRemoved:true,oldRecessRemoved:true,
    clearancesAreNominalOnly:true,manufacturerClearancesConfirmed:false,installationApproved:false};
  f.conditions=['DWG厨房净宽2420、南北2600；北侧800冰箱槽+600电器柜，东侧800水槽柜+600洗碗机位，南侧避开410×450现状烟道。','所有20mm板件按新轮廓重建，未把旧柜整体拉伸。800冰箱槽与600电器柜为图纸柜格，不是已购产品外形或已验证安装孔。','保留用户机器：冰箱650×600×1900、洗碗机600×600×805；冰箱后20、前方比台面多20，洗碗机后20、前方多20，均为展示余量，厂家散热/接头/门扇及检修待核。','厨房与阳台890窗宽、1000窗台和1350窗洞按DWG及第20页立面C；旧1114双机凹柜及窗下条件开口取消，不在墙中画新的机器洞。','烘干机留阳台窗下，扫地机移玄关鞋柜；电器高柜仅留示意格，不新增未经确认购买的烤箱/洗衣机。','吊柜高度和板件为按立面适配的柜体方案；厂家燃气灶/烟机/热水器安装、吊装、防火、通风、排烟及检修净空未批准。'];
  f.notes=f.conditions.join(' ');
  const get=id=>{const q=p.defaultFurniture.find(a=>a.id===id);assert.ok(q,'Missing appliance '+id);return q;};
  move(get('kitchen_fridge'),6010,11610,0);
  const dw=get('kitchen_dishwasher');move(dw,7710,12990,90);dw.face='west';
  dw.notes='保留600×600×805已知机器外廓，按图移东侧600位，朝西；机身后20、顶部65、前方比600深台面外伸20，仅模型几何。无底板/背板/柜门穿过机身，实际安装孔宽、接头、电源和开门待核。';
  const sink=get('kitchen_double_sink');move(sink,7730,12290,90);sink.face='west';
  const hob=get('kitchen_hob');move(hob,6710,13585,180);hob.face='north';
  const hood=get('kitchen_hood');move(hood,6710,13690,180);hood.face='north';
  const tap=p.defaultFurniture.find(q=>q.id==='kitchen_tap');if(tap)move(tap,7935,12290,90);
  const fan=p.defaultFurniture.find(q=>q.id==='family-kitchen-ceilingfan');if(fan){
    move(fan,6800,12500,fan.rot||0);const ceiling=p.ROOMS?.find(q=>q.id==='kitchen')?.heightMm||2700;fan.elevationMm=ceiling-fan.heightMm;
    fan.applianceDesign={...clone(fan.applianceDesign),layoutRevision:REVISION,bottomMm:fan.elevationMm,topMm:ceiling};
    fan.notes='按新厨房工作区移动凉霸面板；可见300×300×80占位顶面沿用厨房既有高度'+ceiling+'，不由立面柜高推定新的吊顶或安装腔。';
    fan.conditions=['300×300×80仅可见面板，底'+fan.elevationMm+'、顶'+ceiling+'mm；原房间高度继续待核，吊顶腔、实际整机深度、风路、检修与电源须按实物深化。'];
  }
  const heater=get('kitchen_heater');move(heater,7935,11535,90);
  if(heater.heaterDesign){
    heater.heaterDesign={...clone(heater.heaterDesign),layoutRevision:REVISION,mounting:{...clone(heater.heaterDesign.mounting),rearPlaneMm:8030,bodyPlanRectMm:[7840,11365,8030,11705],
      northSideNominalGapMm:75,originalPositionHeightRetained:false,bodyBottomMm:1320,bodyTopMm:1845,drawingRelocation:true,manufacturerClearancesConfirmed:false,installationApproved:false},
      electricity:{...clone(heater.heaterDesign.electricity),pointUnchanged:false,hostRelocationRequiresPointReview:true}};
  }
  const heaterOldText='机身背面仍贴厨房东墙x8290，朝西，中心y11535、底高1320保持；深度190对应中心x8195。机身北边11365至厨房/阳台共墙室内边11270仅95mm模型间隔，不能据此判定满足厂家边距、散热或安装要求。';
  const heaterNewText='2026-10-27按DWG东墙内面8030移动机身至中心7935、11535，朝西、底高1320；机身北边11365至新北墙内面11290名义75mm，未据此确认厂家边距。原340×190×525仅机身及接口/排烟待核状态保留。';
  heater.notes=String(heater.notes||'').replace(heaterOldText,heaterNewText).replace('厨房P27电源用途点及其他120物件不改；','厨房P27电源用途点随宿主重核；');
  heater.conditions=(heater.conditions||[]).map(s=>s===heaterOldText?heaterNewText:s.replace('厨房P27电源用途点及其他120物件不改；','厨房P27电源用途点随宿主重核；'));
  return f;
}
function rebuildBalcony(p){
  p.defaultFurniture=p.defaultFurniture.filter(q=>q.id!=='balcony_recess_housing');
  const dryer=p.defaultFurniture.find(q=>q.id==='laundry_dryer');assert.ok(dryer,'Existing dryer missing');
  move(dryer,7485,10810,180);Object.assign(dryer,{name:'烘干机600×600×840 · 阳台窗下独立开放柜',roomId:'balcony',face:'north',elevationMm:0});
  dryer.notes='按业主确认仅烘干机保留阳台，新窗下660×670独立柜内落地朝北，不再跨入厨房或挤进客厅；仍为原600×600×840机身，非第二台洗衣机。净腔620×650×980，左右各10、后30、上140仅几何余量，散热及开门检修待厂家核验。';
  dryer.conditions=['独立柜和机器全在DWG原阳台地面内，不放在北/东外挑铁皮、不穿窗下墙。','净腔620×650×980不是厂家确认安装尺寸；开门、散热、接头、搬入及检修仍待核。'];
  dryer.applianceDesign={...clone(dryer.applianceDesign),revision:REVISION,cabinetId:'drawing-balcony-dryer-cabinet',netCavityMm:[620,650,980],rearNominalClearanceMm:30,sideNominalClearanceMm:10,connectionsConfirmed:false,installationApproved:false};
  const cab=newFixture('drawing-balcony-dryer-cabinet',GEOMETRY.balcony.dryerCabinet,1000,'阳台单烘干机开放柜 · 660×670×1000','balcony'),{P,out}=partBuilder(cab);
  for(const[x,s]of[[7155,'west'],[7795,'east']])P('drawing-balcony-dryer-side-'+s,x,10490,20,670,0,980,'cabinet-side','独立台面20mm侧支承','Cream','north');
  P('drawing-balcony-dryer-back',7175,11140,620,20,0,980,'cabinet-back','窗台下20mm背板，连接及通风待核','Cream','north');
  P('drawing-balcony-dryer-top',7155,10490,660,670,980,20,'countertop','独立20mm顶板，完成面1000，无洗手盆','Stone','north');
  cab.parts=out;cab.face='north';cab.openApplianceBay=true;cab.referenceStyle={revision:REVISION,variant:'drawing-balcony-dryer-cabinet',installationApproved:false};
  cab.cabinetDesign={layoutRevision:REVISION,title:'单烘干机窗下柜',features:['无底板、无踢脚、无门，原地面落机；独立侧板支承顶板，不压机器。','净宽620、净深650、台底980；外包660×670×1000，背靠原窗下墙内面11160。'],dimensions:['原机器600×600×840；侧余10/10、后余30、上余140均待厂家确认。']};
  cab.conditions=['柜体与烘干机不穿1000窗台下墙，顶部1000与图注窗台齐平；原890mm共墙窗宽、1350窗洞不变，窗框及开启净空待核。','独立柜只是几何适配，侧板支承/防潮、厂家散热、机器门扇及检修尚未批准。'];upsert(p,cab);
  const tap=p.defaultFurniture.find(q=>q.id==='balcony_bucket_tap');assert.ok(tap,'Bucket tap missing');move(tap,8033,10200,270);tap.face='west';
  tap.notes='按新阳台边界把原无盆洗地/接桶龙头移至东侧低围护内面8090，朝西；暂估出水口750，机身及短臂为示意，供水、防回流及防溅待核。临时水桶留在原阳台地面北侧，使用后收起，不盖地漏、不占烘干机前区；扫地机已移玄关。';
  tap.conditions=['龙头不放在外挑铁皮上，无洗手盆或盆柜；东侧低围护接水条件、软管、防回流和防水须现场核验。','暂估出水口750非实测施工尺寸；不能对机器和电器冲水。'];
  tap.temporaryBucketZoneMm={x1:7750,x2:8050,y1:10020,y2:10320,widthMm:300,depthMm:300,temporary:true,blocksRobotWhenOccupied:false,notDedicatedDrain:true,status:'provisional-use-zone-clear-after-use'};
  for(const q of tap.parts||[])q.label=String(q.label||'').replace('西墙垛','东侧低围护').replace('朝北','朝西');
  const drain=p.defaultFurniture.find(q=>q.id==='family-drain-balcony');assert.ok(drain,'Balcony floor drain missing');move(drain,7870,10400,0);
  drain.notes='按DWG原阳台主体地面内调整至(7870,10400)，临时水桶南侧、独立烘干柜北侧；150×150暂估格栅不落外挑铁皮、不占门轨或机器底。地下排水、地坪找坡、防臭与实际落点均未核验。';
  drain.conditions=['150×150×4仅显示格栅，不代表凸起地坪；地下管、实际落点、找坡及排水连通待核。','机器独立排水和临时接桶不能自动视为接入此地漏；不得盖住格栅。'];
  drain.drainDesign={...clone(drain.drainDesign),layoutRevision:REVISION,placementStatus:'drawing-floor-adapted-not-measured',drainConnectionsConfirmed:false,floorSlopeConfirmed:false,buriedPlumbingModeled:false};
  return cab;
}
function rebuildProjection(p){
  const f=p.defaultFurniture.find(q=>q.id==='balcony_outer_projection');if(!f)return;
  // Conditional exterior sheet at the parapet level, not a floor extension.
  setFixture(f,[7040,8960,8690,11160],2475,'北/东外挑600 · 随新阳台边界重排的非踩踏示意');
  const {P,out}=partBuilder(f);
  for(const[id,x,y,w,d]of[['north',7040,8960,1650,600],['east',8090,9560,600,1600]]){
    P('drawing-projection-'+id+'-sheet',x,y,w,d,1080,20,'exterior-sheet','矮墙标高铁皮 · 非地板非承载','Steel','north',{nonWalkable:true});
    P('drawing-projection-'+id+'-canopy',x,y,w,d,2450,25,'exterior-canopy','外挑顶铁皮示意，锚固待核','Steel','north',{nonWalkable:true});
  }
  function guard(id,x,y,length,horizontal){
    const steps=Math.ceil((length-20)/100);for(let i=0;i<=steps;i++){
      const a=(length-20)*i/steps;P('drawing-projection-'+id+'-bar-'+i,x+(horizontal?a:0),y+(horizontal?0:a),20,20,1100,1350,'guard-bar','20mm外移网杆，锚固待核','Steel');
    }
    for(const z of[1100,1775,2430])P('drawing-projection-'+id+'-rail-'+z,x,y,horizontal?length:20,horizontal?20:length,z,20,'guard-rail','外移网横框','Steel');
  }
  guard('north',7040,8960,1650,true);guard('east',8670,8960,2200,false);guard('west-return',7040,8960,600,false);guard('south-return',8090,11140,600,true);
  f.parts=out;f.nonWalkable=true;f.exteriorProjectionMm=600;f.notConstructionApproval=true;
  f.notes='沿新DWG阳台主体边界：北9560向外600至8960、东8090向外600至8690；外挑铁皮保持1080标高及顶部示意，不增加室内地面或机器承载面。原低墙、边柱及顶梁保留；图纸未确认此外挑，需结构、防坠、防水及物业审批。';
  f.conditions=['非踩踏、非承载；原1050×1600主体地面和面积不因600外挑而扩大，不放烘干机、机器人或水桶。','600是业主先前希望的条件概念，最新DWG未给出批准的构造；高层外立面、锚固、抗风、防坠、防水与排水由专业方现场核验。'];
}
function partRect(f,q){assert.equal(f.rot,0,'Rect helper requires unrotated fixture');return[f.cx+q.x,f.cy+q.y,(f.elevationMm||0)+(q.elevationMm||0),f.cx+q.x+q.w,f.cy+q.y+q.d,(f.elevationMm||0)+(q.elevationMm||0)+q.heightMm];}
function bodyRect(f){const a=footprint(f),z=f.elevationMm||0;return[a.x,a.y,z,a.x+a.w,a.y+a.d,z+f.heightMm];}
function overlaps(a,b,e=1e-6){return a[0]<b[3]-e&&a[3]>b[0]+e&&a[1]<b[4]-e&&a[4]>b[1]+e&&a[2]<b[5]-e&&a[5]>b[2]+e;}
function contains(a,b){return [0,1,2].every(i=>b[i]>=a[i]-1e-6&&b[i+3]<=a[i+3]+1e-6);}
function validate(p){
  const get=id=>p.defaultFurniture.find(q=>q.id===id),shoe=get('fit-entry_shoe_station'),robot=get('balcony_robot'),cab=get('drawing-balcony-dryer-cabinet'),dryer=get('laundry_dryer'),k=get('fit-kitchen-20261005');
  assert.ok(!get('balcony_recess_housing'),'Former shared-wall recess must be removed');
  assert.ok(contains(GEOMETRY.shoe.robotCavity,bodyRect(robot)),'Robot must fit actual open cavity');
  assert.ok(contains(GEOMETRY.balcony.dryerCavity,bodyRect(dryer)),'Dryer must fit separate actual cavity');
  for(const[f,device]of[[shoe,robot],[cab,dryer]])for(const q of f.parts)assert.ok(!overlaps(partRect(f,q),bodyRect(device)),'Appliance blocked by '+q.id);
  const shaft=[5690,13440,0,6100,13890,2730];
  for(const q of k.parts)assert.ok(!overlaps(partRect(k,q),shaft),'Kitchen part intrudes smoke shaft '+q.id);
  for(const id of['kitchen_fridge','kitchen_dishwasher','kitchen_hob','kitchen_hood','kitchen_heater'])assert.ok(!overlaps(bodyRect(get(id)),shaft),'Appliance intrudes smoke shaft '+id);
  // Cabinets cannot hide a solid board through the dishwasher or refrigerator.
  for(const id of['kitchen_fridge','kitchen_dishwasher','kitchen_hood','kitchen_heater'])for(const q of k.parts)assert.ok(!overlaps(partRect(k,q),bodyRect(get(id))),'Kitchen panel '+q.id+' intersects '+id);
  for(const q of k.parts.filter(q=>q.role==='led-strip')){const host=k.parts.find(a=>a.id===q.anchorPartId);assert.ok(host,'LED host missing');assert.equal(q.elevationMm+q.heightMm,host.elevationMm,'LED must touch real underside');}
  const d=footprint(cab);assert.ok(d.x>=7040&&d.x+d.w<=7930&&d.y>=9560&&d.y+d.d<=11160,'Dryer cabinet must stay on old floor and clear southeast pier');
  assert.equal(get('kitchen_heater').heaterDesign?.installationApproved,false,'Heater approval must remain false');
  return{ok:true,robotBodyMm:bodyRect(robot),robotCavityMm:clone(GEOMETRY.shoe.robotCavity),dryerBodyMm:bodyRect(dryer),dryerCavityMm:clone(GEOMETRY.balcony.dryerCavity),
    shoeProjectionMm:120,nominalRobotHallWidthMm:1205,sharedWindowOpeningPreserved:true,noEquipmentUsesExteriorSheet:true,
    checks:['real open machine cavities','no old shared-wall recess','no permanent smoke-shaft occupation','no panels through refrigerator/dishwasher/hood/heater','LEDs attached to new panels']};
}
function applyFamilyDrawingKitchen(value){
  const p=value.schemes?.family||value;assert.ok(p?.defaultFurniture,'Family plan required');
  const before=clone(p.defaultFurniture),architecture=clone({WALLS:p.WALLS,DOORS:p.DOORS,WINDOWS:p.WINDOWS,WIN_META:p.WIN_META,ROOMS:p.ROOMS});
  rebuildShoe(p);rebuildKitchen(p);rebuildBalcony(p);rebuildProjection(p);const validation=validate(p);
  assert.deepEqual({WALLS:p.WALLS,DOORS:p.DOORS,WINDOWS:p.WINDOWS,WIN_META:p.WIN_META,ROOMS:p.ROOMS},architecture,'Kitchen substep must not alter the DWG architecture');
  const old=new Map(before.map(f=>[f.id,f])),now=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  return{revision:REVISION,source:clone(SOURCE),geometry:clone(GEOMETRY),validation,
    changedFurnitureIds:p.defaultFurniture.filter(f=>old.has(f.id)&&!isDeepStrictEqual(old.get(f.id),f)).map(f=>f.id),
    newFurnitureIds:p.defaultFurniture.filter(f=>!old.has(f.id)).map(f=>f.id),removedFurnitureIds:before.filter(f=>!now.has(f.id)).map(f=>f.id),
    notes:['厨房按DWG净宽2420、深2600重建柜板，保留650冰箱/600洗碗机与原热水器；避开410×450永久烟道，890共墙窗不再扩大或下开。',
      '按业主确认：阳台窗下只留600×600×840烘干机；旧1114双机凹柜移除，客卫洗衣机不重复增设。',
      '扫地机器人移入厨房侧鞋柜底部；只有底柜加深120至外深470，真实净腔560×450×600，朝西无底板/门槛/踢脚。',
      '保留无盆洗地龙头并移到东侧低围护，地漏仍在原阳台地面；600外挑铁皮与防盗网随新边界重建，仅条件性非踩踏示意。'],
    pending:['鞋柜底净深450与基站深450相同，后余量0；型号、接头/插头、开盖/取箱、回充、安装及前方通道必须现场核验，不能据占位下单。',
      '阳台烘干柜净620×650×980仅几何适配，左右10/后30/上140；厂家通风散热、机器门和维修待核。',
      '冰箱/洗碗机实际开孔、散热、进排水与接线余量未核，电器高柜格口仅图示，不代表新增已购烤箱。',
      '热水器仍是参考外形而非已确认安装；新北侧75mm名义间隔、侧面通风/排烟/接管及柜体安装须厂家和专业方核验。',
      '龙头及地漏点位不是实测水管落点，防回流、湿区防护、找坡/水封和排水连通未核。',
      '北东外挑600仍是业主条件概念，DWG未确认构造；原地面/面积不扩大，结构、防坠、防水及物业审批未完成。']};
}
module.exports={applyFamilyDrawingKitchen,validateFamilyDrawingKitchen:validate,REVISION,SOURCE,GEOMETRY,footprint};
