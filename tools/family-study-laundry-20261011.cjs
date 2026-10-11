'use strict';

// Final, reversible owner-confirmed layer. The imported source snapshots and
// schemes 1, 3 and 4 are immutable; millimetres, x east / y south.
const assert=require('node:assert/strict');
const REVISION='family-study-laundry-confirmed-20261011';
const clone=structuredClone;
const ARCH_KEYS=['DOORS','WALLS','WALL_META','ROOMS','SLIDES'];
const CHANGED_IDS=['study_full_desk','family-f5','fit-study_bookwall','vanity_guest','laundry_washer','laundry_dryer'];
const REMOVED_IDS=['fit-laundry_wall','fit-laundry_basin'];
const ADDED_IDS=['study_window_return'];
const C={cream:'#F4F1E9',wood:'#CDB594',counter:'#F5F4EF',metal:'#9D9386',light:'#FFF1CF',basin:'#F5F7F5',mirror:'#BCCFD0'};
const round=n=>Math.round(n*1000)/1000;
const changedFields=(a,b)=>[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])]
  .filter(k=>k!=='id'&&JSON.stringify(a?.[k])!==JSON.stringify(b?.[k])).sort();
function keepOriginalFootprint(f,old){
  if(old.originalSourceFootprintMm||old.sourceFootprintMm)f.originalSourceFootprintMm=clone(old.originalSourceFootprintMm||old.sourceFootprintMm);
}
function part(id,x,y,w,d,z,h,role,label,color,material='Cream',face='south'){
  return {id,x:round(x),y:round(y),w:round(w),d:round(d),elevationMm:round(z),heightMm:round(h),role,label,color,material,face};
}

// Rebuild to its approved 1680 mm outer width; never squeeze 22 mm boards with
// a scale transform. Preserve the original 12 mm back, 22 mm shelves/uprights,
// 18 mm doors, 2.5 mm pulls and lower diffuser/LED elevations.
function studyShelfParts(f){
  const W=1680,D=282.5,T=22,left=-W/2,front=-D/2,span=(W-T)/4,clear=span-T;
  const out=[part(f.id+'-back',left,129.25,W,12,1460,1040,'back','12mm原木背板',C.wood,'OakLight','north')];
  for(let i=0;i<=4;i++)out.push(part(f.id+'-upright-'+i,left+i*span,-138.75,T,268,1460,1040,'upright','22mm竖板',C.cream,'Cream','north'));
  for(let i=0;i<4;i++){
    const x=left+i*span+T;
    for(const z of [1460,1800,2140,2478])out.push(part(f.id+'-shelf-'+i+'-'+z,x,-116.75,clear,246,z,T,'shelf','22mm薄层板',C.wood,'OakLight','north'));
    out.push({...part(f.id+'-door-'+i,x+1.5,-138.75,clear-3,18,2163.5,313,'door','高位封闭门',C.cream,'Cream','north'),doorStyle:'hinged',panelIndex:i});
    out.push(part(f.id+'-pull-'+i,x+(clear-60)/2,front,60,2.5,2170,7,'pull','内嵌浅原木扣手',C.wood,'OakLight','north'));
    for(let row=0;row<2;row++)for(let j=0;j<3;j++){
      const palettes=[['#F3EFE6','Cream'],['#EEE8DC','WhiteLinen'],['#7C9485','Sage']];
      const [color,material]=palettes[(i+j+row)%3];
      out.push(part(f.id+'-book-'+i+'-'+row+'-'+j,x+25+j*40,-108.75,31,210,row?1822:1482,210+(j%3)*20,'book','常用书占位',color,material,'north'));
    }
  }
  out.push(part(f.id+'-diffuser',left+60,-118.75,W-120,16,1452,8,'light-diffuser','原书墙下部灯罩',C.wood,'Lamp','north'));
  out.push({...part(f.id+'-light',left+24,front+30,W-48,8,1448,4,'led-strip','书架下板底面工作灯带',C.light,'Light','north'),anchor:'shelf-underside'});
  return out;
}

// Coordinates are relative to the fixture centre (4690,5290). Washer bay has
// no bottom, back or door: it is a genuine empty opening, not a solid cabinet.
// Counter support is independent of the appliance; basin is only in the right
// 440 mm gross / 404 mm internal compartment, with an actual countertop hole.
function guestVanityParts(f){
  const P=(id,x,y,w,d,z,h,role,label,color=C.cream,material='Cream')=>part(f.id+'-'+id,x-f.cx,y-f.cy,w,d,z,h,role,label,color,material);
  const out=[
    P('left-support',4140,4990,18,600,0,890,'cabinet-side','独立左支撑18mm'),
    P('partition',4800,4990,18,600,0,890,'cabinet-divider','盆机独立分隔支撑18mm'),
    P('right-support',5222,4990,18,600,0,890,'cabinet-side','独立右支撑18mm'),
    P('sink-bottom',4818,5008,404,564,60,18,'cabinet-bottom','仅右侧盆柜底板'),
    P('sink-back',4818,4990,404,18,78,812,'cabinet-back','右侧盆柜背板 · 排水预留'),
    {...P('sink-door',4819.5,5572,401,18,79.5,667,'door-hinged','右侧小盆柜门 · 五金开启待核'),doorStyle:'hinged',panelIndex:0},
    P('sink-pull',5198,5588,7,2,450,100,'handle-recess','盆柜内嵌扣手',C.wood,'OakLight'),
    // Four rectangular strips form the countertop around the 360 x 350 hole.
    P('top-left',4140,4990,700,600,890,30,'countertop','左机位至盆开孔的连续台面',C.counter),
    P('top-right',5200,4990,40,600,890,30,'countertop','盆右收边台面',C.counter),
    P('top-back',4840,4990,360,50,890,30,'countertop','盆后台面',C.counter),
    P('top-front',4840,5390,360,200,890,30,'countertop','盆前台面',C.counter),
    // Empty recessed basin: only walls and a low bottom, not a filled block.
    P('basin-west',4840,5040,12,350,760,160,'basin-wall','360×350小盆左壁',C.basin,'Basin'),
    P('basin-east',5188,5040,12,350,760,160,'basin-wall','小盆右壁',C.basin,'Basin'),
    P('basin-north',4852,5040,336,12,760,160,'basin-wall','小盆后壁',C.basin,'Basin'),
    P('basin-south',4852,5378,336,12,760,160,'basin-wall','小盆前壁',C.basin,'Basin'),
    P('basin-bottom',4852,5052,336,326,748,12,'basin-bottom','空盆底 · 排水待深化',C.basin,'Basin'),
    P('basin-drain',4998,5193,44,44,760,2,'basin-drain','排水口示意',C.metal,'WarmGrayMetal'),
    P('faucet-stem',5009,5004,22,22,920,150,'faucet-stem','右侧盆独立龙头立管',C.metal,'WarmGrayMetal'),
    P('faucet-arm',5011,5015,18,100,1052,18,'faucet-arm','龙头出水臂',C.metal,'WarmGrayMetal'),
    P('mirror-backing',4828,4990,386,12,1170,680,'mirror-backing','小盆北墙镜背板',C.wood,'OakLight'),
    P('mirror-face',4834,5002,374,2,1176,668,'mirror-face','右盆镜面 · 机位不设低镜柜',C.mirror,'Mirror')
  ];
  return out;
}

function applyFamilyStudyLaundry(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyBathUpdate,'Apply after confirmed family master-bath layer');
  assert.ok(!p.metadata.familyStudyLaundryUpdate,'Family study/laundry layer already applied');
  const previous=clone(p),untouched=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const get=id=>p.defaultFurniture.find(f=>f.id===id),door=p.DOORS.find(d=>d.id==='door_c');
  for(const id of [...CHANGED_IDS,...REMOVED_IDS])assert.ok(get(id),'Missing prerequisite furniture '+id);
  assert.ok(!get(ADDED_IDS[0]),'Return desk already exists');
  assert.deepEqual(door.rect,[2340,4480,2460,5380]);
  assert.deepEqual(p.WALLS[29],[2340,3280,2460,4480,'u']);
  assert.deepEqual(p.WALLS[30],[2340,5380,2460,6260,'u']);
  assert.deepEqual(p.WALLS[19],[6462.5,11100,6582.5,11210,'u']);
  assert.equal(p.WALL_META[40].sourceId,'laundry_north_return');
  const previousPlanFields=Object.fromEntries(ARCH_KEYS.map(k=>[k,clone(p[k])]));
  const previousFurniture=previous.defaultFurniture.filter(f=>[...CHANGED_IDS,...REMOVED_IDS].includes(f.id)).map(f=>clone(f));
  const previousMetadataFields=Object.fromEntries(['designCorrections','conditions','converter'].map(k=>[k,clone(p.metadata[k])]));

  Object.assign(door,{name:'书房900普通门 · 南移500mm',rect:[2340,4980,2460,5880],sourceAxisMm:[2400,4980,2400,5880],h:[2400,5040],
    directionStatus:'user-design-correction',swingRevision:REVISION,
    notes:'2026-10-11确认：900普通门南移500mm，仍北铰向书房内开；配1680南桌及西窗返桌，为未来1500×2000床垫预留。门套、把手、实物床架与拉椅待核。'});
  door.operation={type:'hinged',hingeCm:[240,504],swing:{dx:0,dy:1,ox:-1,oy:0,sweep:1},openLeafCm:{x:162,y:502,w:78,d:4},source:'2026-10-11已确认书房7字桌与完整床预留'};
  const mainDoor=p.DOORS.find(d=>d.id==='door_a');
  mainDoor.notes=mainDoor.notes.replace('与书房门洞纵向重叠270mm','与书房新门洞纵向错开230mm');
  p.WALLS[29]=[2340,3280,2460,4980,'u'];p.WALLS[30]=[2340,5880,2460,6260,'u'];
  for(const i of [29,30])Object.assign(p.WALL_META[i],{sourceAxisMm:[2400,3280,2400,6260],notes:'2026-10-11确认：书房900门洞南移500mm，房间外轮廓及墙轴线不变，承重性及门套待核。'});

  const desk=get('study_full_desk'),chair=get('family-f5'),shelf=get('fit-study_bookwall');
  keepOriginalFootprint(desk,clone(desk));
  Object.assign(desk,{name:'书房7字桌 · 南段1680×550',cx:960,cy:5925,w:1680,d:550,heightMm:740,roomId:'room_c',modelVariant:'north-facing-workstation',layoutRevision:REVISION,
    sourceFootprintMm:{x:120,y:5650,w:1680,d:550},notes:'确认：南桌东端缩至x1800，避让南移门扇；西端接500深窗边返桌。台高740暂沿用，支撑及收口待深化。'});
  keepOriginalFootprint(chair,clone(chair));
  Object.assign(chair,{cx:960,roomId:'room_c',layoutRevision:REVISION,sourceFootprintMm:{x:720,y:5100,w:480,d:500},
    notes:'对应短南桌移位；未来用床时与床侧共用710mm活动带，需收椅或移开，实物拉椅空间待核。'});
  p.defaultFurniture.push({id:'study_window_return',sourceId:'study_window_return',type:'desk',name:'书房7字桌 · 西窗返桌',cx:370,cy:5345,w:500,d:610,rot:0,
    color:desk.color,heightMm:740,elevationMm:0,roomId:'room_c',face:'east',dimensionStatus:'design-pending',layoutRevision:REVISION,modelVariant:'bare-worktop',
    sourceFootprintMm:{x:120,y:5040,w:500,d:610},notes:'从南桌转到西窗下段；含南桌拐角后的西段总长1160。窗扇、窗台、窗帘待复核；玻璃前不加高柜。'});
  keepOriginalFootprint(shelf,clone(shelf));
  Object.assign(shelf,{name:'书房南墙浅书架 · 1680四格与工作灯带',cx:960,w:1680,baseWidthMm:1680,baseDepthMm:282.5,baseHeightMm:2500,roomId:'room_c',layoutRevision:REVISION,
    sourceFootprintMm:{x:120,y:5917.5,w:1680,d:282.5},notes:'已确认随南桌收短1680，四格原木开放书架与上层奶白柜门；22mm板及12mm背板不缩放，下方工作灯带保留。东端与桌齐，不延伸到西窗。'});
  shelf.parts=studyShelfParts(shelf);
  shelf.conditions=['1680mm外包、四格、每格净跨392.5mm；22mm竖板与层板、12mm背板、18mm上柜门沿用原构造尺寸，锚固承重需厂家核验。',
    '开放格下口1460mm、顶2500mm为设计值；工作灯带底1448mm，不把高处书格当儿童自助书架。',
    '书架独立吊挂，不支在桌面或西窗玻璃上；基层、窗帘和电源待现场深化。'];
  shelf.cabinetDesign={...clone(shelf.cabinetDesign),title:'书房1680四格浅书墙',boardThicknessMm:22,backThicknessMm:12,layoutRevision:REVISION,
    faces:[{face:'north',label:'书房南墙书架 · 朝北',lengthMm:1680,depthMm:282.5}],
    features:['四格两排开放书位与顶部奶白封闭柜门。','原22mm板件、12mm背板和独立吊挂，不等比例缩板。','下板底面工作灯带；玻璃前只有返桌，不增挡窗高柜。'],
    dimensions:['1680×282.5mm外包，书格净跨392.5mm；下口1460、顶2500、薄灯带底1448mm。','门缝、拉手、照明眩光、基层锚固和荷载仍需现场深化。']};

  const vanity=get('vanity_guest'),washer=get('laundry_washer'),dryer=get('laundry_dryer');
  keepOriginalFootprint(vanity,clone(vanity));
  Object.assign(vanity,{type:'fixture',nativeType:'vanity',name:'客卫1100一体台 · 左机右盆',cx:4690,cy:5290,w:1100,d:600,heightMm:920,
    baseWidthMm:1100,baseDepthMm:600,baseHeightMm:920,assemblyHeightMm:1850,rot:0,face:'south',color:C.cream,roomId:'bath_2',layoutRevision:REVISION,
    sourceFootprintMm:{x:4140,y:4990,w:1100,d:600},counterHeightMm:920,counterThicknessMm:30,
    notes:'1100×600×920mm独立承重台：左660机位，下置600×530×840洗衣机，扣18mm侧板后两侧各21mm、后50、机顶至台底50mm概念余量；右440盆区净404，独立360×350开孔空盆。机门/管线/承重及防水用电待实物深化。',
    conditions:['920mm为台面完成高；龙头与保留小盆墙镜另在其上，assemblyHeightMm1850为组合立面示意。',
      '左机位无底板、背板和柜门，台面由独立18mm侧板及分隔板支撑，不把荷载传给机器。',
      '台前模型仅610mm，柜东侧至马桶40mm偏紧；未核实洗衣机机门开启包络及取衣通路。',
      '客卫复尺局部980及退台尚未与全屋基准闭合；机身深度是否包含门与软管、排水、防水、插座及检修必须现场核对。'],
    cabinetRevision:REVISION,
    cabinetDesign:{revision:REVISION,title:'客卫独立承重 · 左机右小盆',status:'concept-pending-detail',boardThicknessMm:18,counterThicknessMm:30,
      dimensions:['外包1100×600、完成台高920mm；左660机位，右440毛宽/404净宽盆柜。','盆开孔360×350；实际盆口、排水与龙头选型未核定。'],
      features:['机位是真实空腔，不用封闭大盒遮盖机器。','台面右侧开孔与空盆，盆和排水不叠在机身上方。','独立侧板/分隔板承台，板材、支撑及安装净空由定制方深化。'],
      faces:[{face:'south',label:'客卫台面及机位 · 面向南',lengthMm:1100,depthMm:600}]}});
  vanity.parts=guestVanityParts(vanity);
  keepOriginalFootprint(washer,clone(washer));
  Object.assign(washer,{name:'客卫台下洗衣机600×530×840',cx:4479,cy:5305,w:600,d:530,heightMm:840,rot:0,face:'south',roomId:'bath_2',layoutRevision:REVISION,dimensionStatus:'owner-provided',
    sourceFootprintMm:{x:4179,y:5040,w:600,d:530},notes:'业主提供600×530×840mm；左右21mm、后50mm、台底50mm只是概念摆位余量，须核对型号、门/软管总深、机门及安装维护说明。'});
  keepOriginalFootprint(dryer,clone(dryer));
  Object.assign(dryer,{name:'阳台单烘干机600×600×840',cx:7650,cy:10750,w:600,d:600,heightMm:840,rot:180,face:'north',roomId:'balcony',layoutRevision:REVISION,dimensionStatus:'owner-provided',
    sourceFootprintMm:{x:7350,y:10450,w:600,d:600},notes:'业主提供600×600×840mm，面北靠厨房墙侧；后部暂留100、前方790mm。尺寸是否含门/软管及检修散热待核。'});
  p.defaultFurniture=p.defaultFurniture.filter(f=>!REMOVED_IDS.includes(f.id));

  const slide=p.SLIDES.find(d=>d.id==='balcony_door');assert.ok(slide);
  assert.deepEqual(slide.rect,[6462.5,9600,6582.5,11100]);
  Object.assign(slide,{name:'生活阳台三轨推拉门 · 回退原门轴',rect:[6750,9600,6870,11100],sourceAxisMm:[6810,9600,6810,11100],layoutRevision:REVISION,
    notes:'取消借厅外凸，沿记录原门轴向东287.5mm恢复；窗、外墙和原1500门洞不动。模型净宽1420与复尺1240差180，门套、防水高差、整体定位及50×150凸处待核。'});
  p.WALLS[19]=[6750,11100,6870,11210,'u'];
  Object.assign(p.WALL_META[19],{sourceAxisMm:[6810,9600,6810,11210],notes:'确认：生活阳台内侧门轴退回原位向东287.5mm，取消借厅外凸；原垛、结构与防水高差待鉴定。'});
  p.WALLS.splice(40,1);p.WALL_META.splice(40,1);
  const balcony=p.ROOMS.find(r=>r.id==='balcony'),living=p.ROOMS.find(r=>r.id==='living');
  Object.assign(balcony,{poly:[[6870,9660],[8290,9660],[8290,11150],[6870,11150]],at:[7570,10080],
    notes:'仅单烘干机，取消借厅外凸。复尺净1240×1490mm；恢复原门轴后模型1420×1490仍多180，整体定位/墙厚与50×150凸处待核，不按图下单。'});
  const notch=living.poly.findIndex(q=>q[0]===6750&&q[1]===9540);
  assert.ok(notch>=0);assert.deepEqual(living.poly.slice(notch,notch+3),[[6750,9540],[6462.5,9540],[6462.5,11150]]);
  living.poly.splice(notch,3,[6750,11150]);

  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-11',sourceIds:['door_c',...CHANGED_IDS,...ADDED_IDS,...REMOVED_IDS,'balcony_door'],
    description:'方案2确认书房门南移500及7字窗边桌；洗衣机入客卫左机右盆台，阳台只留单干机且退回原门轴。',sourceSnapshotsUnchanged:true,
    usageNote:'当前保留书房沙发，1500×2000未来床只作替换校核，不与沙发同时新增；客卫门和主卫、双卧本轮不动。'}];
  p.metadata.conditions=[...(p.metadata.conditions||[]).map(s=>s.replace(/书房门洞纵向重叠270mm/g,'书房新门洞纵向错开230mm')),
    '方案2书房900门洞南移500，7字桌与1680浅书墙；与主卧门洞纵向间隔230mm，历史270mm投影重叠说明已由本轮替代。未来完整床须替换沙发并收椅。客卫台前610mm偏紧，机门/取衣须实物试摆。阳台取消借厅外凸但全屋净宽与复尺差180mm尚未闭合。'];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-study-laundry-20261011.cjs';
  const migrationFields={};for(const id of [...CHANGED_IDS,...ADDED_IDS])migrationFields[id]=changedFields(previous.defaultFurniture.find(f=>f.id===id),get(id));
  p.metadata.familyStudyLaundryUpdate={id:REVISION,date:'2026-10-11',title:'方案2 · 书房完整床预留与洗衣机移位',status:'applied-owner-confirmed',sourceSnapshotsUnchanged:true,
    sourceReference:'output/family-study-bed-review-20261011/方案2_书房调整_当前沙发草案.json；用户确认做成3D并发布',
    previousPlanFields,previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:[...CHANGED_IDS],newFurnitureIds:[...ADDED_IDS],removedFurnitureIds:[...REMOVED_IDS],replacedFurnitureIds:['vanity_guest'],migrationFields,
    demolishedWallIndexMap:Object.fromEntries(previous.WALLS.map((_,i)=>[i,i===40?null:i>40?i-1:i])),removedWallIndices:[40],notesOnlyDoorIds:['door_a'],
    previousDoors:clone(previous.DOORS),previousWalls:clone(previous.WALLS),previousWallMeta:clone(previous.WALL_META),previousRooms:clone(previous.ROOMS),previousSlides:clone(previous.SLIDES),
    study:{openingWidthMm:900,southShiftMm:500,doorOpeningY:[4980,5880],southDeskMm:[1680,550,740],westReturnMm:[500,610,740],westLegOverallMm:1160,shelfWidthMm:1680,sofaRetained:true},
    futureBed:{mattressMm:[1500,2000],assumedFrameMm:[1600,2100],sourceFootprintMm:{x:120,y:3340,w:2100,d:1600},head:'west',replacesFurnitureId:'study_north_sofa',notSameTime:true,addedToCurrentScene:false,
      clearancesMm:{bedSouthToDeskFront:710,bedFootEast:120,bedToOpenDoorLeaf:80,bedToReturn:100,doorSweepToSouthDesk:75.37205590004271}},
    appliancesMm:{washer:[600,530,840],dryer:[600,600,840],guestCounter:[1100,600,920]},
    clearancesMm:{mainStudyDoorLongitudinalGap:230,guestCounterFrontToSouthWall:610,counterEastEdgeToToilet:40,washerSideAfterPanels:21,washerRearConcept:50,washerTopToCounterUnderside:50,dryerFrontToNorthFace:790,dryerRearConcept:100,balconyRetreat:287.5},
    balconyDimensionsMm:{model:[1420,1490],existingMeasured:[1240,1490],unclosedWidthDifference:180},
    assumptions:['确认当前沙发状态，未来1500×2000床垫暂按2100×1600床架外包替换沙发，不是已选产品。','阳台原双机台面和上方浅盆取消；不新增高柜，北/东开敞视野与玻璃、栏护全部保持。','洗衣机与烘干机尺寸由业主提供，未认证厂家安装净空或型号。','复尺未闭合，不移动外墙伪造尺寸一致。'],
    conditions:['书房未来床侧710mm与坐椅共用偏紧，床尾120mm不是通道；用床时收椅或移开，门套把手窗帘需实物复核。','书房原净宽2220、净深2860、西窗1100及台高740为当前模型/设计值，非新增实测。','客卫门保持北铰内开，台前610mm仍狭窄；机门开启、取衣、管线防水用电与承重检修须现场深化。','阳台模型1420×1490与复尺1240×1490仍差180mm，50×150凸处定位待补；此图非施工、下单或舒适通行认证。','原主卫门/南墙盆厕、双卧布局及其余方案全部保持；已存自定义尺寸/摆位/颜色和删除应按字段迁移而非强制恢复。']};
  for(const k of ['WINS','WIN_META','BAYS','BIFOLDS','PLAN_BOUNDS','BOUNDS','CENTER','HEIGHT_MM'])assert.deepEqual(p[k],previous[k],k+': unauthorized family change');
  for(const f of previous.defaultFurniture)if(![...CHANGED_IDS,...REMOVED_IDS].includes(f.id))assert.deepEqual(get(f.id),f,'Unexpected furniture edit '+f.id);
  for(const d of previous.DOORS)if(!['door_c','door_a'].includes(d.id))assert.deepEqual(p.DOORS.find(q=>q.id===d.id),d,'Other door changed '+d.id);
  assert.deepEqual({...p.DOORS.find(q=>q.id==='door_a'),notes:previous.DOORS.find(q=>q.id==='door_a').notes},previous.DOORS.find(q=>q.id==='door_a'),'Main door only updates obsolete study note');
  for(const[id,before]of Object.entries(untouched))assert.deepEqual(bundle.schemes[id],before,id+': unauthorized scheme change');
  assert.deepEqual(beforeFamilyStudyLaundry(p),previous,'Layer must be exactly reversible');
  return bundle;
}

// Accept either a scheme or the complete bundle. Return a clone with this one
// layer undone, including original array order and metadata key values.
function beforeFamilyStudyLaundry(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyStudyLaundryUpdate;
  if(!m)return out;
  for(const k of ARCH_KEYS)p[k]=clone(m.previousPlanFields[k]);
  const originals=new Map(m.previousFurniture.map(f=>[f.id,f]));
  const current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(originals.get(id)||current.get(id)));
  for(const k of ['designCorrections','conditions','converter']){
    if(m.previousMetadataFields[k]===undefined)delete p.metadata[k];else p.metadata[k]=clone(m.previousMetadataFields[k]);
  }
  delete p.metadata.familyStudyLaundryUpdate;
  return out;
}
module.exports={applyFamilyStudyLaundry,beforeFamilyStudyLaundry,REVISION};
