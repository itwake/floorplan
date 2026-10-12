'use strict';

// Owner-requested Scheme 2 service recess. This is a conditional furniture /
// window-underwall concept, NOT an approved structural alteration or new slab.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const REVISION='family-balcony-recess-20261012';
const KITCHEN_ID='fit-kitchen-20261005',WINDOW_ID='window_kitchen_balcony';
const META_KEYS=['conditions','designCorrections','converter'],ARCH_KEYS=['ROOMS','WIN_META'];
const CHANGED_IDS=['laundry_dryer','balcony_robot',KITCHEN_ID];
const ADDED_IDS=['balcony_recess_housing','balcony_bucket_tap'],REMOVED_IDS=['balcony_service_counter'];
const clone=structuredClone;
const RECESS={x1:7023,x2:8137,y1:11150,y2:11920,boardMm:18,openingTopMm:980,
  counterUndersideMm:950,counterTopMm:980,clearDepthMm:752,
  robotBay:{x1:7041,x2:7461,widthMm:420},dryerBay:{x1:7479,x2:8119,widthMm:640}};
const BUCKET_ZONE={x1:6870,x2:7170,y1:10750,y2:11050,widthMm:300,depthMm:300,
  temporary:true,blocksRobotWhenOccupied:true,notDedicatedDrain:true,
  status:'provisional-use-zone-clear-after-use'};
const C={cream:'#F4F1E9',counter:'#ECE8DF',metal:'#9DABA8'};
function part(f,id,x,y,w,d,z,h,role,label,color=C.cream,material='Cream',extra={}){
  return {id:f.id+'-'+id,x:x-f.cx,y:y-f.cy,w,d,elevationMm:z,heightMm:h,role,label,color,material,face:'north',...extra};
}
function clipNorthKitchenParts(f){
  const old=clone(f.parts),out=[],removed=[],changed=[];
  for(const q of old){
    const relevant=/^north_(adjustment|prep|corner)_/.test(q.id)||q.id==='north_top-0-0';
    const x=f.cx+q.x,end=x+q.w;
    if(!relevant||end<=RECESS.x1||x>=RECESS.x2){out.push(q);continue;}
    const clips=[];
    if(x<RECESS.x1)clips.push([x,RECESS.x1]);
    if(end>RECESS.x2)clips.push([RECESS.x2,end]);
    if(!clips.length){removed.push(q.id);continue;}
    changed.push(q.id);
    for(let i=0;i<clips.length;i++){
      const [a,b]=clips[i],r=clone(q);
      r.x=a-f.cx;r.w=b-a;
      // Keep original IDs on single remnants; the spanning north countertop
      // is genuinely split into two non-overlapping old-height surfaces.
      if(clips.length>1)r.id=q.id+(i===0?'-recess-west':'-recess-east');
      r.label=q.role==='countertop'?'原厨房890台面 · 凹位外保留':
        '凹位外保留原北柜窄余段 · 不作为完整机位';
      out.push(r);
    }
  }
  // A 90mm height transition beside the independent 980mm recess countertop.
  // Starts at the old counter TOP (890), so it does not intersect the old top.
  out.push(part(f,'recess-step-west',7005,11270,18,650,890,90,'counter-step',
    '890→980局部90mm高差封边 · 防水收口待核',C.counter,'Stone'),
    part(f,'recess-step-east',8137,11270,18,650,890,90,'counter-step',
      '980→890局部90mm高差封边 · 不占双槽位',C.counter,'Stone'));
  return {parts:out,removedPartIds:removed,clippedPartIds:changed,
    addedPartIds:out.filter(q=>!old.some(a=>a.id===q.id)).map(q=>q.id)};
}
function housingParts(f){
  const P=(...args)=>part(f,...args);
  return [
    P('west-support',7023,11150,18,770,0,950,'cabinet-side','落地独立左支撑'),
    P('divider',7461,11150,18,770,0,950,'cabinet-divider','基站与烘干机分隔'),
    P('east-support',8119,11150,18,770,0,950,'cabinet-side','落地独立右支撑'),
    P('kitchen-back',7041,11902,1078,18,0,950,'cabinet-back',
      '厨房侧封闭承台板 · 阳台正面开放'),
    P('independent-top',7023,11150,1114,770,950,30,'countertop',
      '厨房局部980高台 · 不压机器',C.counter,'Stone')
  ];
}
function tapParts(f){
  // Tap geometry is positioned at its true 700mm mounting elevation; parts
  // are relative to that origin, not a misleading floor-to-tap envelope.
  const P=(...args)=>{const q=part(f,...args,C.metal,'Metal');q.elevationMm-=f.elevationMm;return q;};
  return [
    P('wall-plate',6924,11138,40,12,700,120,'faucet-plate','西墙垛壁装供水座'),
    P('wall-feed',6934,11106,20,44,736,20,'faucet-feed','朝阳台供水短管'),
    P('body',6934,11106,20,20,720,100,'faucet-stem','洗地/接桶龙头'),
    P('lever',6924,11101,40,10,820,8,'faucet-lever','独立开关手柄'),
    P('arm',6936,11036,16,70,766,16,'faucet-arm','朝北接桶/接软管臂'),
    P('outlet',6936,11036,16,16,750,16,'faucet-outlet','暂估出水口离地750')
  ];
}
function applyFamilyBalconyRecess(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyCornerDoor180Update,'Apply after corner-door 180 layer');
  assert.ok(!p.metadata.familyBalconyRecessUpdate,'Balcony recess layer already applied');
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  assert.equal(p.defaultFurniture.length,62);
  const dryer=p.defaultFurniture.find(q=>q.id==='laundry_dryer'),robot=p.defaultFurniture.find(q=>q.id==='balcony_robot');
  const kitchen=p.defaultFurniture.find(q=>q.id===KITCHEN_ID),counter=p.defaultFurniture.find(q=>q.id===REMOVED_IDS[0]);
  assert.ok(dryer&&robot&&kitchen?.parts&&counter?.parts);
  assert.deepEqual([dryer.w,dryer.d,dryer.heightMm,dryer.rot],[600,600,840,180]);
  assert.deepEqual([robot.w,robot.d,robot.heightMm,robot.rot],[380,450,500,180]);
  for(const id of ADDED_IDS)assert.ok(!p.defaultFurniture.some(q=>q.id===id),'Duplicate '+id);
  const windowIndex=p.WIN_META.findIndex(q=>q.id===WINDOW_ID),window=p.WIN_META[windowIndex];
  assert.ok(window);assert.deepEqual(p.WINS[windowIndex],[6980,11150,8180,11270]);
  assert.deepEqual([window.sillMm,window.heightMm],[1000,1300]);
  const previousFurniture=[...CHANGED_IDS,...REMOVED_IDS].map(id=>clone(p.defaultFurniture.find(q=>q.id===id)));
  const previousPlanFields=Object.fromEntries(ARCH_KEYS.map(key=>[key,clone(p[key])]));
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(key=>[key,clone(p.metadata[key])]));
  Object.assign(dryer,{cx:7799,cy:11450,layoutRevision:REVISION,sourceFootprintMm:{x:7499,y:11150,w:600,d:600},
    name:'烘干机600×600×840 · 厨房侧凹位朝阳台',
    notes:'沿用现有阳台烘干机600×600×840（不是客卫洗衣机），向南推入厨房侧条件凹位，正面朝北。640净宽两侧20/20；净深752、机深600，机后152；台底950、机顶840差110，均仅模型几何余量。型号散热、开门、取出检修和上下水/电源待核。',
    conditions:['厨房与阳台窗下墙只按结构待鉴定的概念开口示意，不拆侧墙垛；机器必须支承在经确认的连续楼板上，不放在外挑铁皮。',
      '本次搬移的是原阳台烘干机；客卫洗衣机不动。尺寸、软管、散热、机门和前方检修净空须按实物深化。']});
  Object.assign(robot,{cx:7251,cy:11375,layoutRevision:REVISION,sourceFootprintMm:{x:7061,y:11150,w:380,d:450},
    name:'紧凑扫地机基站380×450×500 · 凹位西侧',
    notes:'原380×450×500紧凑占位沿用，正面朝北；420净宽两侧20/20，内部净深752、机后302。无底板、低背板或柜门阻挡出入；上方无盆和排水管。型号未定，回充、开盖、取水箱及维修仍待说明书核验。',
    conditions:['基站不放在外挑铁皮上；本轮进入原窗下墙+厨房柜条件凹位，楼板连续、防水和结构待核。',
      '壁装接桶龙头与基站分开，不能对电器冲水；水桶临时使用后移走，不能留在机器人驶出/回充通道中。']});
  const modified=clipNorthKitchenParts(kitchen);kitchen.parts=modified.parts;
  Object.assign(kitchen,{layoutRevision:REVISION,
    notes:'仅北侧原450待核柜段、250备餐段与650转角段在凹位范围重做；原洗碗机及其框、东侧双槽和全部南侧/吊柜保持。凹位上方独立980高台，外侧原890台面保留，两侧90mm高差待深化。厨房宽2870与复尺2420相差450仍未闭合，1114凹位不可作为下单尺寸。'});
  kitchen.conditions=kitchen.conditions.map(s=>s.startsWith('全屋示意在中段保留450mm调整柜段')?
    '厨房旧模型比复尺净宽2420多450mm；本轮1114mm条件凹位穿过原450mm待核柜段，不代表450差值已经消除。全屋共墙/门窗基准闭合后必须重排，不能据本图下单。':s);
  kitchen.conditions.push('本版窗下开口外包1114、净机器人420+烘干640，台底950/完成980。旧北台890保留在凹位两侧，90mm高差防水收口和独立承重待核。',
    '厨房侧封闭隔板深处y11902..11920；阳台正面落地开放，没有柜底、低背板或前门。上部大窗台1000/高1300保持，窗下仅概念开至980，20mm上收口需结构与防水专项确认。');
  kitchen.cabinetDesign={...clone(kitchen.cabinetDesign),layoutRevision:REVISION,
    features:kitchen.cabinetDesign.features.map((s,i)=>i===0?
      '只重做北侧凹位穿入的柜板和台面；洗碗机、双槽、南柜、吊柜及所有电器位置保持。':s),
    dimensions:[...kitchen.cabinetDesign.dimensions,'局部条件凹位1114×770，机位净深752；台底950/完成980，比原890台面高90。450mm全屋宽差及结构待核。']};
  const housing={id:ADDED_IDS[0],sourceId:ADDED_IDS[0],type:'fixture',nativeType:'cabinet',
    name:'厨房侧凹位 · 西基站/东烘干 · 上方无盆',cx:7580,cy:11535,w:1114,d:770,heightMm:980,elevationMm:0,rot:0,
    baseWidthMm:1114,baseDepthMm:770,baseHeightMm:980,color:C.cream,roomId:'balcony',face:'north',
    modelVariant:'balcony-recess-housing',dimensionStatus:'conditional-concept-structural-pending',layoutRevision:REVISION,cabinetRevision:REVISION,
    sourceFootprintMm:{x:7023,y:11150,w:1114,d:770},counterHeightMm:980,counterThicknessMm:30,
    underCounterIds:['balcony_robot','laundry_dryer'],notConstructionApproval:true,structuralUnverified:true,
    notes:'取消原阳台洗手盆与服务台。设备推入厨房侧，正面齐原阳台南边界，原1490模型纵深全部让回阳台。厨房上方局部台面独立承重，无盆、无柜底、无低背板和前门。示意拆去窗下1114×980范围但侧墙垛与上窗不动；结构、楼板、防水和外包尺寸未核。',
    conditions:['条件外包1114=420+640+3×18；开口1200两侧各43。机位净深752=770−18，净高950。以上均旧模型试排，不是复尺确定值。',
      '原台面完成890；本版机位上方独立台完成980，上升90。必须确认台面/隔板承重和冷热/防水接缝，不把台面荷载压在机器上。',
      '窗下实体墙是否可拆、上方原窗支承、连续楼板/梁及机位防水先鉴定；该下穿开口是未批准概念，不调整原WALLS/WINS或房间地面面积。',
      '阳台模型净宽1420与复尺1240差180；厨房模型净宽2870与复尺2420差450。凹位跨待核厨房段，不能以1114已放下推断现场可施工。'],
    cabinetDesign:{revision:REVISION,title:'凹位机柜 · 厨房局部高台',status:'conditional-concept-structural-pending',
      boardThicknessMm:18,counterThicknessMm:30,
      faces:[{face:'north',label:'阳台机位 · 正面开放向北',lengthMm:1114,depthMm:770}],
      features:['只保留独立侧板、中隔、厨房侧封板与台面；无盆和台下水管。','机位落地、正面开放；机器人向北出入，烘干机朝阳台开门。','厨房侧封闭，台面完成980，原890台面以90高差过渡。'],
      dimensions:['机器人净420，烘干净640，三板18；外包1114。','机位净深752，净高950；台完成980。','厨房450和阳台180复尺差仍待核；窗下结构、板面连续承重与防水不确定。']}};
  housing.parts=housingParts(housing);
  const tap={id:ADDED_IDS[1],sourceId:ADDED_IDS[1],type:'fixture',nativeType:'faucet',
    name:'阳台壁装洗地/接桶龙头 · 无洗手盆',cx:6944,cy:11093,w:40,d:114,heightMm:128,elevationMm:700,rot:0,
    baseWidthMm:40,baseDepthMm:114,baseHeightMm:128,color:C.metal,roomId:'balcony',face:'north',
    modelVariant:'balcony-bucket-tap',dimensionStatus:'provisional-height-placement',layoutRevision:REVISION,cabinetRevision:REVISION,
    sourceFootprintMm:{x:6924,y:11036,w:40,d:114},outletHeightMm:750,noBasin:true,
    temporaryBucketZoneMm:clone(BUCKET_ZONE),
    notes:'原窗西侧墙垛北面保留一个壁装出水龙头，朝阳台接桶/接软管洗地；出水口暂估离地750，无洗手盆、台面和盆下排水。定位、防溅/湿区电路、供水防回流、可检修阀与阳台地漏坡度待现场深化；不得冲洗机器。',
    conditions:['龙头在基站西侧墙垛，不与基站共用洗手台；水桶仅临时接水，使用后移走，不能挡住基站出入/回充。',
      '出水口750仅本次展示暂估，非实测或施工高度。实际龙头/软管、防回流、排水坡度、湿区保护与检修净空待选型。']};
  tap.parts=tapParts(tap);
  p.defaultFurniture=p.defaultFurniture.filter(q=>!REMOVED_IDS.includes(q.id));
  p.defaultFurniture.push(housing,tap);
  p.ROOMS.find(q=>q.id==='balcony').notes='烘干机与紧凑扫地基站朝北推进厨房侧条件凹位，原阳台洗手盆/台取消，只留西墙垛洗地接桶龙头。原室内地面、门与面积保持，北东600非踩踏外挑保持。阳台1420与复尺1240差180、厨房2870与2420差450及窗下结构仍待核。';
  Object.assign(window,{layoutRevision:REVISION,
    lowerServiceOpeningMm:{x1:7023,x2:8137,bottom:0,top:980},structuralUnverified:true,notConstructionApproval:true,
    notes:'上部原大窗宽1200、台1000、高1300与两边墙垛保持；窗下仅增加1114×980落地服务开口概念，使厨房側机位向阳台操作。开口只在模型显示、不代表结构允许拆改；980..1000暂留20mm上收口，窗框支承/防水需专项确认。'});
  const obsolete=new Set(counter.conditions);
  p.metadata.conditions=[...(p.metadata.conditions||[]).filter(s=>!obsolete.has(s)),...housing.conditions,...tap.conditions];
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-12',
    sourceIds:[...CHANGED_IDS,...REMOVED_IDS,...ADDED_IDS,WINDOW_ID],sourceSnapshotsUnchanged:true,
    description:'方案2阳台烘干机与基站推进厨房侧条件凹位；取消原阳台洗手盆/台面，保留独立接桶洗地龙头。客卫洗衣机不变。窗下下穿/机柜/局部台高仍为结构待核概念。'}];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-balcony-recess-20261012.cjs';
  const migrationFields=Object.fromEntries(CHANGED_IDS.map(id=>{const old=previousFurniture.find(q=>q.id===id),fresh=p.defaultFurniture.find(q=>q.id===id);
    return [id,[...new Set([...Object.keys(old),...Object.keys(fresh)])].filter(k=>k!=='id'&&!isDeepStrictEqual(old[k],fresh[k])).sort()];}));
  p.metadata.familyBalconyRecessUpdate={id:REVISION,date:'2026-10-12',title:'方案2 · 阳台设备凹入厨房侧与洗地龙头',
    status:'owner-requested-conditional-concept',sourceSnapshotsUnchanged:true,notConstructionApproval:true,structuralUnverified:true,
    sourceWallsAndWindowRectsUnchanged:true,upperWindowUnchanged:true,sideJambsUnchanged:true,originalFloorAreaUnchanged:true,addsWalkableFloor:false,
    movedApplianceIds:['laundry_dryer','balcony_robot'],guestWasherUnchanged:true,removedBasinAndCounter:true,retainBucketTap:true,
    recessMm:clone(RECESS),lowerServiceOpeningMm:{x1:7023,x2:8137,bottom:0,top:980},upperWindowSillMm:1000,
    originalCounterTopMm:890,localCounterTopMm:980,counterHeightStepMm:90,frontOperatingStripMm:1490,
    modelKitchenWidthMm:2870,measuredKitchenWidthMm:2420,unresolvedKitchenWidthDifferenceMm:450,
    modelBalconyWidthMm:1420,measuredBalconyWidthMm:1240,unresolvedBalconyWidthDifferenceMm:180,
    applianceClearancesMm:{robot:{sideWest:20,sideEast:20,rear:302,top:450},dryer:{sideWest:20,sideEast:20,rear:152,top:110}},
    bucketTapOutletHeightMm:750,temporaryBucketZoneMm:clone(BUCKET_ZONE),bucketZoneNotMeasured:true,
    floorDrainLocationConfirmed:false,floorSlopeConfirmed:false,robotProductConfirmed:false,applianceInstallationApproved:false,
    removedKitchenPartIds:modified.removedPartIds,clippedKitchenPartIds:modified.clippedPartIds,addedKitchenPartIds:modified.addedPartIds,
    previousPlanFields,previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(q=>q.id),previousMetadataFields,
    changedFurnitureIds:[...CHANGED_IDS],newFurnitureIds:[...ADDED_IDS],removedFurnitureIds:[...REMOVED_IDS],replacedFurnitureIds:[],
    preserveCustomPartsIds:[KITCHEN_ID],preserveCustomSizeIds:[KITCHEN_ID],migrationFields};
  assert.equal(p.defaultFurniture.length,63);
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata',...ARCH_KEYS].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  for(const old of previous.defaultFurniture)if(![...CHANGED_IDS,...REMOVED_IDS].includes(old.id))assert.deepEqual(p.defaultFurniture.find(q=>q.id===old.id),old,'Unrelated object changed '+old.id);
  for(const old of previous.ROOMS){const fresh=p.ROOMS.find(q=>q.id===old.id);assert.deepEqual(old.poly,fresh.poly,'Floor polygon changed '+old.id);}
  for(const old of previous.WIN_META)if(old.id!==WINDOW_ID)assert.deepEqual(p.WIN_META.find(q=>q.id===old.id),old,'Unrelated window changed '+old.id);
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized scheme edit');
  assert.deepEqual(beforeFamilyBalconyRecess(p),previous,'Exact previous model rollback');
  return bundle;
}
function beforeFamilyBalconyRecess(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyBalconyRecessUpdate;if(!m)return out;
  const old=new Map(m.previousFurniture.map(q=>[q.id,q])),current=new Map(p.defaultFurniture.map(q=>[q.id,q]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyBalconyRecessUpdate;return out;
}
module.exports={applyFamilyBalconyRecess,beforeFamilyBalconyRecess,REVISION,KITCHEN_ID,WINDOW_ID,RECESS};
