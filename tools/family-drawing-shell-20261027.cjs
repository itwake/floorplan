'use strict';

// Native DWG plan geometry, rotated/translated into the existing millimetre
// convention. This module has no dependency on the conversion scratch files,
// earlier revision leaves, a CAD installation, or browser rendering.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const REVISION='family-drawing-shell-20261027',META_KEY='familyDrawingShellUpdate',DATE='2026-10-27',clone=structuredClone;
const ARCH_FIELDS=['ROOMS','WALLS','WALL_META','WINS','WIN_META','DOORS','SLIDES','BAYS','BIFOLDS','PLAN_BOUNDS','BOUNDS','CENTER'];
const SOURCE={id:'owner-construction-dwg-20261027',file:'业主提供施工图.dwg',
  sha256:'405226e8cc00211cc665399110ab7de0f54daeb29c0a456b5f528c1d0db08eb0',
  pdf:'业主提供施工图.pdf',sheets:['PL-02','PL-03','PL-06'],unit:'mm',
  nativeNorth:'drawing-right',modelNorth:'negative-y',scalingApplied:false,
  transform:'modelX=-2031202.7024225995-CADY+120; modelY=16370039.22570109+sheetDeltaX-CADX+120',
  sheetDeltaX:{'PL-02':0,'PL-03':23138.659583967,'PL-06':92554.638335861},
  status:'construction-drawing-reference-not-site-or-structural-approval'};
// These rectangles are a disjoint union of PL-06 wall hatch boundaries and
// paired wall-edge lines. The 0.149 mm source step is intentionally retained.
const WALL_RECTS=[
  [-120,-120,1000,120],[2760,-120,4140,120],[5900,-120,7040,120],
  [-120,120,120,3200],[3530,120,3650,3200],[6800,120,7040,3140],
  [5050,3140,7040,3240],[-120,3200,2590,3320],[3470,3200,3650,3320],
  [5050,3240,5150,3290],[6800,3240,7040,3520],[-120,3320,120,3980],
  [2420,3320,2540,5120],[3530,3320,3650,3510],[6800,4020,7040,5250],
  [5050,4090,5150,4470],[3530,4390,3650,4470],[3530,4470,5150,4590],
  [3530,4590,3650,5190],[5050,4590,5150,4719.851],[5050,4719.851,5940,4839.851],
  [5810,4839.851,5940,4840],[-120,5130,120,6050],[6800,5780,7040,6040],
  [3530,5990,3650,6190],[2420,6000,2540,6180],[4220,6040,7040,6190],
  [-120,6050,2140,6180],[-120,6180,2540,6310],[3530,6190,7040,6310],
  [6800,6310,7040,9620],[1420,8410,2140,8650],[1900,8650,2140,13890],
  [7930,11050,8270,11290],[5470,11160,7040,11290],[5470,11290,5610,11360],
  [8030,11290,8270,13890],[5470,13160,5610,13360],[5470,13360,5690,13890],
  [1900,13890,3910,14130],[4990,13890,8270,14130]
];
const SHAFT_RECT=[5690,13440,6100,13890];
const EXTERIOR_INDICES=new Set([0,1,2,3,5,10,11,14,22,23,27,28,30,31,32,33,36,39,40]);
const MASTER_HEIGHT_INDICES=new Set([1,2,4,5,6,9,13,15,16,17]);
const ROOM_POLYGONS={
  room_b:[[120,120],[3530,120],[3530,3200],[120,3200]],
  room_c:[[120,3320],[2420,3320],[2420,6050],[120,6050]],
  room_a:[[3650,120],[6800,120],[6800,3140],[5050,3140],[5050,4470],[3650,4470]],
  bath_1:[[5150,3240],[6800,3240],[6800,4840],[5940,4840],[5940,4719.851],[5150,4719.851]],
  bath_2:[[3650,4590],[5050,4590],[5050,4839.851],[5810,4839.851],[5810,4840],[6800,4840],[6800,6040],[4220,6040],[4220,6190],[3650,6190]],
  living:[[2540,3320],[3530,3320],[3530,6310],[6800,6310],[6800,11160],[5470,11160],[5470,13890],[2140,13890],[2140,6310],[2540,6310]],
  kitchen:[[5610,11290],[8030,11290],[8030,13890],[5690,13890],[5690,13360],[5610,13360]],
  balcony:[[7040,9560],[8090,9560],[8090,11050],[7930,11050],[7930,11160],[7040,11160]],
  bay_window_b:[[1000,-480],[2760,-480],[2760,120],[1000,120]],
  bay_window_a:[[4140,-480],[5900,-480],[5900,120],[4140,120]],
  bay_window_living_west:[[1540,6310],[2140,6310],[2140,8410],[1540,8410]]
};
const ROOM_LABELS={room_b:[1720,2310],room_a:[5350,2680],room_c:[1270,4550],bath_1:[6040,4130],
  bath_2:[4850,5600],living:[4830,7600],kitchen:[6800,12590],balcony:[7565,10200],
  bay_window_b:[1880,-170],bay_window_a:[5020,-170],bay_window_living_west:[1840,7360]};
const DOOR_SPECS=[
  {id:'entry_door',name:'入户1080平开门 · 向室外南开',rect:[3910,13890,4990,14130],width:1080,
    h:[4955,14130],c:[-1,0],o:[0,1],len:1010,entry:true,hingeStatus:'35mm-frame-offset-illustration-exterior-face',heightStatus:'general-CAD-MH2300-note'},
  {id:'door_a',name:'主卧880平开门 · 南铰向室内东开',rect:[3530,3510,3650,4390],width:880,
    h:[3650,4355],c:[0,-1],o:[1,0],len:810,handle:196782},
  {id:'door_b',name:'次卧880平开门 · 东铰向室内北开',rect:[2590,3200,3470,3320],width:880,
    h:[3435,3200],c:[-1,0],o:[0,-1],len:810,handle:196786},
  {id:'door_c',name:'书房880平开门 · 南铰向室内西开',rect:[2420,5120,2540,6000],width:880,
    h:[2420,5965],c:[0,-1],o:[-1,0],len:810,handle:196790},
  {id:'door_bath_1',name:'主卫800平开门 · 北铰向卫内东开',rect:[5050,3290,5150,4090],width:800,
    h:[5090.482,3321.808],c:[0,1],o:[1,0],len:728.23,handle:221513},
  {id:'door_bath_2',name:'客卫800平开门 · 南铰向卫内东开',rect:[3530,5190,3650,5990],width:800,
    h:[3570.482,5958.191],c:[0,-1],o:[1,0],len:728.23,handle:196859}
];
const WINDOW_SPECS=[
  {id:'window_b',name:'次卧北飘窗主体洞口',rect:[1000,-120,2760,120],type:'bay-aperture',noGlass:true,noFrame:true},
  {id:'window_b-front',name:'次卧北飘窗前窗',rect:[1000,-600,2760,-480],type:'bay-front',sourceId:'window_b'},
  {id:'window_a',name:'主卧北飘窗主体洞口',rect:[4140,-120,5900,120],type:'bay-aperture',noGlass:true,noFrame:true},
  {id:'window_a-front',name:'主卧北飘窗前窗',rect:[4140,-600,5900,-480],type:'bay-front',sourceId:'window_a'},
  {id:'window_c',name:'书房西窗1150 · 窗台900／窗高1200暂估',rect:[-120,3980,120,5130],type:'window'},
  {id:'window_living_west',name:'客厅西低飘窗主体洞口2100',rect:[1900,6310,2140,8410],type:'bay-aperture',noGlass:true,noFrame:true},
  {id:'window_living_west-front',name:'客厅西低飘窗前窗2100',rect:[1420,6310,1540,8410],type:'bay-front',sourceId:'window_living_west'},
  {id:'window_bath_1_east',name:'主卫东窗500 · 竖向保留旧示意待核',rect:[6800,3520,7040,4020],type:'window'},
  {id:'window_bath_2_east',name:'客卫东窗530 · 窗台与窗高待核',rect:[6800,5250,7040,5780],type:'window'},
  {id:'window_kitchen_balcony',name:'厨房—阳台共用窗890 · 图注窗台1000／窗高1350',rect:[7040,11160,7930,11290],
    type:'window',sill:1000,height:1350,heightHandles:[288590,288528]},
  {id:'balcony_north_opening',name:'生活阳台北向通透围护1050 · 竖向待核',rect:[7040,9470,8090,9560],type:'guarded-open-air',noGlass:true,guard:true},
  {id:'balcony_east_opening',name:'生活阳台东向通透围护1490 · 竖向待核',rect:[8090,9560,8210,11050],type:'guarded-open-air',noGlass:true,guard:true},
  // The source side returns are glazing/frame bands, not full-height solid
  // bearing walls. The aperture begins at the old building's exterior face.
  {id:'window_b-west-return',name:'次卧飘窗西侧返玻璃 · 构造待核',rect:[880,-480,1000,-120],type:'bay-front',sourceId:'window_b',verticalFrom:'window_b',returnGlazing:true},
  {id:'window_b-east-return',name:'次卧飘窗东侧返玻璃 · 构造待核',rect:[2760,-480,2880,-120],type:'bay-front',sourceId:'window_b',verticalFrom:'window_b',returnGlazing:true},
  {id:'window_a-west-return',name:'主卧飘窗西侧返玻璃 · 构造待核',rect:[4020,-480,4140,-120],type:'bay-front',sourceId:'window_a',verticalFrom:'window_a',returnGlazing:true},
  {id:'window_a-east-return',name:'主卧飘窗东侧返玻璃 · 构造待核',rect:[5900,-480,6020,-120],type:'bay-front',sourceId:'window_a',verticalFrom:'window_a',returnGlazing:true}
];
const CONDITIONS=[
  '2026-10-27方案2建筑平面按业主10.25原生DWG的PL-02/PL-06定位：单位mm，只作旋转和平移，不按整张图框或全局包围盒缩放。PDF北箭头朝页面右侧，模型北仍朝上。',
  '墙、门洞及平面窗位采用本次施工图坐标；240/140/130/120/100mm等墙段及约0.149mm卫浴阶梯保留源几何。图层、填充或墙厚不等同已确认承重鉴定；拆改与现场闭合定位仍须复核。',
  '卧室和书房门洞880mm、两卫800mm、厨房双扇推拉门1800mm、生活阳台双扇推拉门1540mm、入户门1080mm外开，均为图面洞口，不是安装后通行净宽。门扇按DWG符号及门框内退示意，入户公共走廊条件未建模。',
  '门高2300mm来源为本套图MH2300标注/通用说明，非每扇现场复尺；生活阳台门高未见明确标注，保留旧2400mm示意并待核。建筑墙高沿原各室模型，卫浴2300mm吊顶不被误作整墙高度。',
  '厨房与阳台共用窗按图例CH为窗高、DH为窗台离地及第20页立面C交叉核对：窗台1000、窗高1350、上口2350mm；旧窗下低位服务开口不自动沿用。图注不等于现场实测，机器、管线与窗下实体墙的关系由本次家具深化另行核对。',
  '其余窗洞的平面宽度与位置按本次DWG；竖向优先保留原已录复尺或业主暂估，并逐窗标明来源。主卫记录窗高1400mm但窗台未测，仍保留台1500／窗高800mm旧示意，避免误叠加超高。',
  '生活阳台内框按图1050×1600mm，东南固定柱占160×110mm，地面按柱位切角、约1.6624平方米；北、东围护保持上部通透。外挑铁皮、防盗网或框架不计入地面面积；本图没有新增承重地面。',
  '厨房西南烟道以410×450mm保守外接框作为不可使用占位，原曲线细部未被声称为精确矩形；不能作柜内储物。旧草稿拆墙索引只在墙矩形完全相等时迁移，否则归档待重新选择。'
];
const r=n=>Math.round(n*1000)/1000;
function area(poly){return Math.abs(poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p[0]*q[1]-q[0]*p[1];},0))/2;}
function axis(rect){const[x0,y0,x1,y1]=rect;return x1-x0>=y1-y0?[x0,r((y0+y1)/2),x1,r((y0+y1)/2)]:[r((x0+x1)/2),y0,r((x0+x1)/2),y1];}
function intersection(a,b){return Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));}
function pointInPoly(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
function orthogonalOverlapArea(a,b){
  const xs=[...new Set([...a,...b].map(q=>q[0]))].sort((x,y)=>x-y),ys=[...new Set([...a,...b].map(q=>q[1]))].sort((x,y)=>x-y);let total=0;
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
    const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;
    if(pointInPoly(x,y,a)&&pointInPoly(x,y,b))total+=(xs[i+1]-xs[i])*(ys[j+1]-ys[j]);
  }return total;
}
function fieldSnapshot(p){return Object.fromEntries(ARCH_FIELDS.map(k=>[k,{present:Object.hasOwn(p,k),...(Object.hasOwn(p,k)?{value:clone(p[k])}:{})}]));}
function planOf(p){return p?.schemes?p.schemes.family:p;}
function doorOperation(d){
  const end=[d.h[0]+d.o[0]*d.len,d.h[1]+d.o[1]*d.len],thick=40;
  const openRect=[Math.min(d.h[0],end[0])-(d.o[0]===0?thick/2:0),Math.min(d.h[1],end[1])-(d.o[1]===0?thick/2:0),
    Math.max(d.h[0],end[0])+(d.o[0]===0?thick/2:0),Math.max(d.h[1],end[1])+(d.o[1]===0?thick/2:0)];
  const cross=d.c[0]*d.o[1]-d.c[1]*d.o[0];
  return{type:'hinged',hingeCm:d.h.map(v=>r(v/10)),swing:{dx:d.c[0],dy:d.c[1],ox:d.o[0],oy:d.o[1],sweep:Math.sign(cross)},
    openLeafCm:{x:r(openRect[0]/10),y:r(openRect[1]/10),w:r((openRect[2]-openRect[0])/10),d:r((openRect[3]-openRect[1])/10)},
    source:'PL-02门扇/圆弧方向；门框内退按源符号示意，非门厂安装尺寸。'};
}
function makeDoor(spec){
  const d={id:spec.id,sourceId:spec.id,name:spec.name,grade:'施工图定位（待现场核验）',rect:clone(spec.rect),sourceAxisMm:axis(spec.rect),
    openingWidthMm:spec.width,sillMm:0,heightMm:2300,headMm:2300,h:clone(spec.h),c:clone(spec.c),o:clone(spec.o),len:spec.len,
    entry:Boolean(spec.entry),defaultOpen:true,directionStatus:spec.entry?'owner-confirmed-outward-and-drawing':'CAD-door-leaf-and-arc',
    dimensionStatus:'CAD-rough-opening-not-installed-clearance',placementStatus:'native-DWG-plan-reference',layoutRevision:REVISION,swingRevision:REVISION,
    heightStatus:spec.heightStatus||'general-CAD-MH2300-note-not-individual-site-measurement',
    hingeStatus:spec.hingeStatus||'source-symbol-frame-offset-not-hardware-specification',drawingSource:{...clone(SOURCE),...(spec.handle?{insertHandle:spec.handle}:{})},
    notes:'2026-10-27按PL-02/PL-06平面洞口和开启方向更新；门洞宽'+spec.width+'mm，门扇长'+spec.len+'mm为符号门框内退示意，不能当作净通行。高度2300mm来自本套图通用/MH标注，门套、五金及现场净空待核。'+(spec.entry?'入户向南侧室外开启，外侧公区、邻门及防火条件未建模。':'')};
  d.operation=doorOperation(d);return d;
}
function makeSlide(old,id,name,rect,height,heightStatus,stackTo){
  return{id,sourceId:id,name,grade:'施工图定位（待现场核验）',rect:clone(rect),sourceAxisMm:axis(rect),openingWidthMm:r(rect[3]-rect[1]),
    sillMm:0,heightMm:height,headMm:height,heightStatus,dimensionStatus:'CAD-rough-opening-not-installed-clearance',placementStatus:'native-DWG-plan-reference',
    v:true,panelCount:2,trackCount:2,stackTo:stackTo||old?.stackTo||'south',surface:false,defaultOpen:true,glass:true,layoutRevision:REVISION,drawingSource:clone(SOURCE),
    notes:'2026-10-27洞口按DWG平面更新；双扇双轨按既有业主要求保留。门框、搭接和可用通行均未由洞宽直接认定。'+
      (heightStatus==='retained-old-illustration-unmarked-in-examined-drawing'?'图中未查明门高，暂沿用旧'+height+'mm示意。':'图注MH2300作为门高来源，非现场复尺。')};
}
function makeWindow(spec,previous){
  const old=previous.get(spec.verticalFrom||spec.id)||previous.get(spec.sourceId)||{};
  const sill=spec.sill??old.sillMm??900,height=spec.height??old.heightMm??1200,head=sill+height;
  const vertical=spec.height!==undefined?'CAD-CH-height1350-DH-sill1000-elevation-C-page20-not-site-measurement':
    (spec.id==='window_c'?'owner-confirmed-provisional-900-sill-1200-opening':
      (spec.id==='window_bath_1_east'?'retained-old-800-opening-1400-measurement-not-vertically-located':
        (old.measurementStatus?'retained-recorded-partial-measurement-not-new-CAD-height':'retained-old-provisional-height-not-marked-in-examined-drawing')));
  const m={id:spec.id,sourceId:spec.sourceId||spec.id,name:spec.name,grade:'施工图平面定位／竖向来源分列',
    source:SOURCE.file+' PL-02/PL-06；平面为原生毫米坐标，窗台/窗高来源另列，不由平面比例推断。',sourceAxisMm:axis(spec.rect),
    rect:clone(spec.rect),openingWidthMm:Math.max(spec.rect[2]-spec.rect[0],spec.rect[3]-spec.rect[1]),sillMm:sill,heightMm:height,headMm:head,
    dimensionStatus:'CAD-plan-position-with-separate-vertical-source',placementStatus:'native-DWG-plan-reference',verticalDimensionStatus:vertical,
    type:spec.type,noGlass:Boolean(spec.noGlass),noFrame:Boolean(spec.noFrame),guard:Boolean(spec.guard),layoutRevision:REVISION,
    drawingSource:{...clone(SOURCE),...(spec.heightHandles?{heightAnnotationHandles:clone(spec.heightHandles),verticalElevationSheet:'EL-03-C',verticalElevationPdfPage:20,
      heightLegend:{CH:'window-opening-height',DH:'window-sill-above-floor'}}:{})},
    ...(old.measurementStatus?{measurementStatus:{...clone(old.measurementStatus),fullyLocated:false,retainedVerticalRecordOnly:true}}:{}),
    ...(spec.returnGlazing?{returnGlazing:true,sourceGeometry:'CAD-side-frame-band-glazing-not-solid-bearing-wall',frameDetailStatus:'source-band-envelope-not-fabrication-detail'}:{}),
    structuralUnverified:true,notConstructionApproval:true,
    notes:'2026-10-27平面窗位/宽度按DWG更新。'+(spec.height!==undefined?'图例CH为窗洞高1350、DH为窗台离地1000；已与第20页立面C下段1000及窗段1350交叉核对，上口2350mm，待现场复核；不沿用原窗下低位服务开口。':
      '本次图未给出可确认的该窗完整竖向定位，沿用旧窗台'+sill+'／窗高'+height+'／上口'+head+'mm示意或原部分复尺记录，仍待现场闭合。')+
      (spec.id==='window_bath_1_east'?'主卫原复尺窗高1400mm记录保留；窗台未测，因此继续用1500/800旧示意，不将1400加在旧窗台上。':'')};
  if(spec.id==='window_bath_1_east')m.recordedUnlocatedHeightMm=1400;
  return m;
}
function makeBay(id,roomId,frontId,rooms,wins){
  const m=wins.find(q=>q.id===id),front=wins.find(q=>q.id===frontId),poly=rooms.find(q=>q.id===roomId).poly;
  return{...clone(m),id,rect:clone(m.rect),frontRect:clone(front.rect),poly:clone(poly),outward:id==='window_living_west'?[-1,0]:[0,-1],
    projectionMm:600,returnThicknessMm:120,slabThicknessMm:100,sideRects:[],returnBottomMm:m.sillMm,returnHeightMm:m.heightMm,
    sideReturnStatus:id==='window_living_west'?'bounded-by-source-building-walls':'side-return-glazing-in-WINS-not-solid-wall',
    roofSlabStatus:'retained-100mm-concept-not-source-structural-thickness'};
}
function wallMigration(oldWalls,newWalls,oldMeta){
  const result={},archive=[];
  oldWalls.forEach((w,i)=>{const same=newWalls.map((n,j)=>({n,j})).filter(({n})=>w.slice(0,4).every((v,k)=>v===n[k]));
    result['w'+i]=same.length===1?'w'+same[0].j:null;
    if(same.length!==1)archive.push({oldWallId:'w'+i,oldWallIndex:i,rect:clone(w),metadata:clone(oldMeta[i]||{}),
      reason:'No unique exactly equal current wall rectangle; old draft demolition selection must be archived, not applied by index.'});
  });return{oldToNewWallMap:result,oldToNewWallIndexMap:oldWalls.map((_,i)=>result['w'+i]===null?null:Number(result['w'+i].slice(1))),unmappedOldWalls:archive};
}
function validateFamilyDrawingShell(value){
  const p=planOf(value),errors=[],warnings=[],openingChecks=[];
  const validRect=q=>Array.isArray(q)&&q.length>=4&&q.slice(0,4).every(Number.isFinite)&&q[2]>q[0]&&q[3]>q[1];
  const fail=(type,details)=>errors.push({type,...details});
  if(p.WALLS.length!==p.WALL_META.length)fail('wall-metadata-count',{});
  if(p.WINS.length!==p.WIN_META.length)fail('window-metadata-count',{});
  p.WALLS.forEach((w,i)=>{if(!validRect(w))fail('invalid-wall',{wallIndex:i,rect:w});
    for(let j=0;j<i;j++)if(intersection(w,p.WALLS[j])>.001)fail('overlapping-solid-walls',{wallIndices:[j,i]});});
  const openings=[...p.DOORS,...p.SLIDES,...p.WINS.map((rect,i)=>({...p.WIN_META[i],rect}))];
  for(const d of openings){
    if(!validRect(d.rect)){fail('invalid-opening',{id:d.id,rect:d.rect});continue;}
    const overlaps=p.WALLS.map((w,i)=>({wallId:'w'+i,areaMm2:r(intersection(w,d.rect))})).filter(q=>q.areaMm2>.001);
    openingChecks.push({id:d.id,rect:clone(d.rect),blockingWallIds:overlaps.map(q=>q.wallId),solidWallOverlapMm2:r(overlaps.reduce((s,q)=>s+q.areaMm2,0))});
    if(overlaps.length)fail('solid-wall-obstructs-opening',{id:d.id,overlaps});
    if(!(d.heightMm>0&&d.sillMm>=0&&Math.abs(d.headMm-d.sillMm-d.heightMm)<.01))fail('invalid-opening-height',{id:d.id});
    const long=Math.max(d.rect[2]-d.rect[0],d.rect[3]-d.rect[1]);
    if(Math.abs(long-d.openingWidthMm)>.01)fail('opening-width-mismatch',{id:d.id,long,width:d.openingWidthMm});
  }
  // Sweeps test the actual 40mm leaf, not an inflated rough door opening.
  // Wall clearance alone does not establish an unobstructed furniture route.
  const doorSweepChecks=[];
  for(const d of p.DOORS){
    const a0=Math.atan2(d.c[1],d.c[0]),raw=Math.atan2(d.o[1],d.o[0])-a0,delta=Math.atan2(Math.sin(raw),Math.cos(raw));let collisions=[];
    for(let k=0;k<=180;k++){
      const a=a0+delta*k/180,c=Math.cos(a),s=Math.sin(a);
      // Exact rectangle SAT at each sampled angle includes thin fragments;
      // the sample spacing is reported rather than called a continuous proof.
      const leaf=[[0,-20],[d.len,-20],[d.len,20],[0,20]].map(([x,y])=>[d.h[0]+c*x-s*y,d.h[1]+s*x+c*y]);
      for(let i=0;i<p.WALLS.length;i++)if(convexRectIntersects(leaf,p.WALLS[i]))collisions.push({wallId:'w'+i,angleDegrees:r(Math.abs(delta)*180/Math.PI*k/180)});
    }
    collisions=collisions.filter((q,i,a)=>i===a.findIndex(z=>z.wallId===q.wallId));
    doorSweepChecks.push({id:d.id,sampleStepDegrees:.5,collisions});
    if(collisions.length)fail('door-leaf-sweep-wall-collision',{id:d.id,collisions});
  }
  const floorChecks=[];
  for(const room of p.ROOMS){
    if(!Array.isArray(room.poly)||room.poly.length<3||room.poly.some(q=>q.length!==2||!q.every(Number.isFinite))||area(room.poly)<=0){fail('invalid-room-polygon',{id:room.id});continue;}
    if(room.bay)continue;
    for(let i=0;i<p.WALLS.length;i++){
      const w=p.WALLS[i],overlap=orthogonalOverlapArea(room.poly,[[w[0],w[1]],[w[2],w[1]],[w[2],w[3]],[w[0],w[3]]]);
      if(overlap>.001){
        const allowed=room.id==='kitchen'&&p.WALL_META[i].sourceId==='DWG_KITCHEN_SHAFT_ENVELOPE';
        floorChecks.push({roomId:room.id,wallId:'w'+i,overlapMm2:r(overlap),allowedFixedShaftFootprint:allowed});
        if(!allowed)fail('room-floor-crosses-solid-wall',{roomId:room.id,wallId:'w'+i,overlapMm2:r(overlap)});
      }
    }
  }
  for(let i=0;i<p.ROOMS.length;i++)for(let j=0;j<i;j++){
    const a=p.ROOMS[i],b=p.ROOMS[j],overlap=orthogonalOverlapArea(a.poly,b.poly);
    if(overlap>.001)fail('room-floor-regions-overlap',{roomIds:[b.id,a.id],overlapMm2:r(overlap)});
  }
  const ids=[...p.DOORS,...p.SLIDES,...p.WIN_META].map(q=>q.id);if(new Set(ids).size!==ids.length)fail('duplicate-opening-id',{});
  const shared=p.WIN_META.find(q=>q.id==='window_kitchen_balcony');
  if(!shared||shared.sillMm!==1000||shared.heightMm!==1350||shared.headMm!==2350)
    fail('shared-window-elevation-C-mismatch',{expected:{sillMm:1000,heightMm:1350,headMm:2350},actual:shared?{sillMm:shared.sillMm,heightMm:shared.heightMm,headMm:shared.headMm}:null});
  warnings.push('The shared window has CH=1350mm opening height and DH=1000mm sill height, cross-checked against elevation C on PDF page20. Other window verticals retain prior records or provisional models; CAD plan location is not site verification.',
    'Door sweep checks cover walls only, at 0.5 degree intervals; furniture, hardware, users, outside entry circulation and construction approval are outside this test.',
    'The SW kitchen shaft is a conservative rectangular envelope of a source curved detail, excluded from cabinetry use.');
  return{ok:errors.length===0,errors,warnings,counts:{walls:p.WALLS.length,rooms:p.ROOMS.length,windows:p.WINS.length,doors:p.DOORS.length,slides:p.SLIDES.length,bays:p.BAYS.length},openingChecks,doorSweepChecks,floorChecks};
}
function convexRectIntersects(poly,rect){
  const box=[[rect[0],rect[1]],[rect[2],rect[1]],[rect[2],rect[3]],[rect[0],rect[3]]],axes=[[1,0],[0,1]];
  for(let i=0;i<2;i++){const a=poly[i],b=poly[i+1];axes.push([-(b[1]-a[1]),b[0]-a[0]]);}
  return axes.every(([ax,ay])=>{const a=poly.map(q=>q[0]*ax+q[1]*ay),b=box.map(q=>q[0]*ax+q[1]*ay);return Math.min(Math.max(...a),Math.max(...b))-Math.max(Math.min(...a),Math.min(...b))>1e-7;});
}
function applyFamilyDrawingShell(value){
  const p=planOf(value);assert.ok(p&&(!p.id||p.id==='family'),'Drawing shell requires scheme family');
  if(p.metadata?.[META_KEY]?.revision===REVISION)return value;
  const original=clone(p),previousFields=fieldSnapshot(p),oldWin=new Map((p.WIN_META||[]).map(q=>[q.id,q]));
  const rooms=new Map(p.ROOMS.map(q=>[q.id,q]));
  p.ROOMS=Object.entries(ROOM_POLYGONS).map(([id,poly])=>{
    const old=rooms.get(id);assert.ok(old,'Missing source room '+id);
    return{...clone(old),poly:clone(poly),at:clone(ROOM_LABELS[id]),planAreaM2:r(area(poly)/1e6),
      areaStatus:'CAD-inner-face-rendering-region-not-survey-certified-area',layoutRevision:REVISION,drawingSource:clone(SOURCE),
      heightStatus:'retained-prior-room-height-not-reinterpreted-as-ceiling-drop'};
  });
  p.WALLS=WALL_RECTS.map((q,i)=>[...q,EXTERIOR_INDICES.has(i)?'e':'i']);
  p.WALL_META=WALL_RECTS.map((q,i)=>({sourceId:'DWG_PL06_WALL_'+i,sourceWallIndex:i,sourceAxisMm:axis(q),sourceRectMm:clone(q),
    thicknessMm:Math.min(q[2]-q[0],q[3]-q[1]),heightMm:MASTER_HEIGHT_INDICES.has(i)?(rooms.get('room_a').heightMm||2790):(p.HEIGHT_MM||2700),
    heightStatus:'retained-model-building-wall-height-not-ceiling-height',bearingStatus:'unverified',grade:'DWG-plan-reference',
    ...(EXTERIOR_INDICES.has(i)?{envelope:true}:{}),layoutRevision:REVISION,drawingSource:{...clone(SOURCE),sheet:'PL-06'},
    notes:'由PL-06墙填充及成对墙线求不重叠矩形；矩形分片短边不一定是原整段标称墙厚。结构性质、拆改许可及现场闭合仍待核。'}));
  p.WALLS.push([...SHAFT_RECT,'e']);p.WALL_META.push({sourceId:'DWG_KITCHEN_SHAFT_ENVELOPE',sourceWallIndex:null,sourceAxisMm:axis(SHAFT_RECT),sourceRectMm:clone(SHAFT_RECT),
    thicknessMm:410,heightMm:p.HEIGHT_MM||2700,bearingStatus:'service-shaft-not-storage',nonDemolishable:true,noCabinetUse:true,
    curvedDetailBoundary:true,conservativeEnvelopeOnly:true,layoutRevision:REVISION,drawingSource:clone(SOURCE),
    notes:'烟道源细节含曲线，410×450mm为不可使用保守外接框，不能当精确矩形或储物位。'});
  p.DOORS=DOOR_SPECS.map(makeDoor);
  p.SLIDES=[makeSlide(original.SLIDES.find(q=>q.id==='balcony_door'),'balcony_door','生活阳台1540双扇双轨玻璃推拉门',
    [6800,9620,7040,11160],original.SLIDES.find(q=>q.id==='balcony_door')?.heightMm||2400,'retained-old-illustration-unmarked-in-examined-drawing','south'),
    makeSlide(original.SLIDES.find(q=>q.id==='door_kitchen'),'door_kitchen','厨房1800双扇双轨玻璃推拉门',[5470,11360,5610,13160],2300,'CAD-MH2300-note','north')];
  p.WINS=WINDOW_SPECS.map(q=>clone(q.rect));p.WIN_META=WINDOW_SPECS.map(q=>makeWindow(q,oldWin));
  p.BAYS=[makeBay('window_b','bay_window_b','window_b-front',p.ROOMS,p.WIN_META),makeBay('window_a','bay_window_a','window_a-front',p.ROOMS,p.WIN_META),
    makeBay('window_living_west','bay_window_living_west','window_living_west-front',p.ROOMS,p.WIN_META)];
  p.BIFOLDS=[];
  // Include the fully open outward entry leaf. The balcony's optional 600mm
  // non-walkable projection still fits inside the extra 1000mm view margin.
  p.PLAN_BOUNDS={x:-120,y:-600,w:8390,h:15740};p.BOUNDS={x:-1120,y:-1600,w:10390,h:17740};p.CENTER={x:4075,y:7270};
  const migration=wallMigration(original.WALLS,p.WALLS,original.WALL_META||[]);
  p.metadata=p.metadata||{};p.metadata[META_KEY]={revision:REVISION,date:DATE,source:clone(SOURCE),previousFields,
    previousMetadataPresent:Object.hasOwn(original,'metadata'),previousOwnMetadataPresent:Object.hasOwn(original.metadata||{},META_KEY),
    ...(Object.hasOwn(original.metadata||{},META_KEY)?{previousOwnMetadata:clone(original.metadata[META_KEY])}:{}),
    previousPlanFields:Object.fromEntries(ARCH_FIELDS.filter(k=>Object.hasOwn(original,k)).map(k=>[k,clone(original[k])])),
    ...migration,currentConditions:clone(CONDITIONS),currentRoomAreasM2:Object.fromEntries(p.ROOMS.map(q=>[q.id,q.planAreaM2])),
    changedArchitecturalFields:ARCH_FIELDS.filter(k=>!isDeepStrictEqual(original[k],p[k])),preservesFurnitureExactly:true,
    oldDraftWallSelectionsRequireArchive:true,sourceGeometricWallCount:41,additionalShaftEnvelopeCount:1,
    currentTvWall:{x0:3530,x1:6800,y:6310,lengthMm:3270,centerX:5165},
    verticalUncertaintyWindowIds:p.WIN_META.filter(q=>!q.drawingSource.heightAnnotationHandles).map(q=>q.id),
    removedOldConditionalLowerServiceOpening:clone(oldWin.get('window_kitchen_balcony')?.lowerServiceOpeningMm||null)};
  const validation=validateFamilyDrawingShell(p);p.metadata[META_KEY].validation=validation;
  assert.ok(validation.ok,JSON.stringify(validation.errors));
  assert.deepEqual(p.defaultFurniture,original.defaultFurniture,'Shell must not mutate any furniture or electrical point');
  for(const k of Object.keys(original))if(![...ARCH_FIELDS,'metadata'].includes(k))assert.deepEqual(p[k],original[k],'Unchanged field '+k);
  for(const k of Object.keys(original.metadata||{}))if(k!==META_KEY)assert.deepEqual(p.metadata[k],original.metadata[k],'Historical metadata exact '+k);
  assert.deepEqual(beforeFamilyDrawingShell(p),original,'Independent shell exact rollback');return value;
}
function beforeFamilyDrawingShell(value){
  const out=clone(value),p=planOf(out),m=p?.metadata?.[META_KEY];if(!m)return out;
  for(const[k,s]of Object.entries(m.previousFields)){if(s.present)p[k]=clone(s.value);else delete p[k];}
  if(m.previousOwnMetadataPresent)p.metadata[META_KEY]=clone(m.previousOwnMetadata);else delete p.metadata[META_KEY];
  if(!m.previousMetadataPresent)delete p.metadata;return out;
}
module.exports={applyFamilyDrawingShell,beforeFamilyDrawingShell,validateFamilyDrawingShell,REVISION,META_KEY,
  ARCH_FIELDS,CONDITIONS,SOURCE,ROOM_POLYGONS,WALL_RECTS};
