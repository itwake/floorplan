'use strict';

// Owner-approved October 12 refinement, applied after the immutable historical
// double-sliding-door layer. Millimetres, x east / y south; no source edits.
const assert=require('node:assert/strict');
const REVISION='family-study-door-20261012';
const DATE='2026-10-12';
const clone=structuredClone;
const ARCH_KEYS=['DOORS','WALLS','WALL_META'];
const META_KEYS=['designCorrections','conditions','converter'];
const CHANGED_IDS=['study_full_desk','fit-study_bookwall'];
const C={cream:'#F4F1E9',wood:'#CDB594',light:'#FFF1CF'};
const round=n=>Math.round(n*1000)/1000;
const changedFields=(a,b)=>[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])]
  .filter(k=>k!=='id'&&JSON.stringify(a?.[k])!==JSON.stringify(b?.[k])).sort();
function part(id,x,y,w,d,z,h,role,label,color,material='Cream',face='north'){
  return {id,x:round(x),y:round(y),w:round(w),d:round(d),elevationMm:round(z),heightMm:round(h),role,label,color,material,face};
}

// Rebuild actual boards to 1450 rather than scale the 1680 assembly. The
// imported 22/12/18/2.5 mm board/back/door/pull dimensions remain unchanged.
function studyShelfParts(f){
  const W=1450,D=282.5,T=22,left=-W/2,front=-D/2,span=(W-T)/4,clear=span-T;
  const out=[part(f.id+'-back',left,129.25,W,12,1460,1040,'back','12mm原木背板',C.wood,'OakLight')];
  for(let i=0;i<=4;i++)out.push(part(f.id+'-upright-'+i,left+i*span,-138.75,T,268,1460,1040,'upright','22mm竖板',C.cream));
  for(let i=0;i<4;i++){
    const x=left+i*span+T;
    for(const z of [1460,1800,2140,2478])out.push(part(f.id+'-shelf-'+i+'-'+z,x,-116.75,clear,246,z,T,'shelf','22mm薄层板',C.wood,'OakLight'));
    out.push({...part(f.id+'-door-'+i,x+1.5,-138.75,clear-3,18,2163.5,313,'door','高位封闭门',C.cream),doorStyle:'hinged',panelIndex:i});
    out.push(part(f.id+'-pull-'+i,x+(clear-60)/2,front,60,2.5,2170,7,'pull','内嵌浅原木扣手',C.wood,'OakLight'));
    for(let row=0;row<2;row++)for(let j=0;j<3;j++){
      const palettes=[['#F3EFE6','Cream'],['#EEE8DC','WhiteLinen'],['#7C9485','Sage']], [color,material]=palettes[(i+j+row)%3];
      out.push(part(f.id+'-book-'+i+'-'+row+'-'+j,x+25+j*40,-108.75,31,210,row?1822:1482,210+(j%3)*20,'book','常用书占位',color,material));
    }
  }
  out.push(part(f.id+'-diffuser',left+60,-118.75,W-120,16,1452,8,'light-diffuser','原书墙下部灯罩',C.wood,'Lamp'));
  out.push({...part(f.id+'-light',left+24,front+30,W-48,8,1448,4,'led-strip','书架下板底面工作灯带',C.light,'Light'),anchor:'shelf-underside'});
  return out;
}

function applyFamilyStudyDoor(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyDoorRefinement,'Apply after the confirmed family double-sliding-door layer');
  assert.ok(!p.metadata.familyStudyDoorUpdate,'Family study south-hinge layer already applied');
  const previous=clone(p),untouched=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const get=id=>p.defaultFurniture.find(f=>f.id===id),door=p.DOORS.find(d=>d.id==='door_c'),main=p.DOORS.find(d=>d.id==='door_a');
  const desk=get('study_full_desk'),chair=get('family-f5'),shelf=get('fit-study_bookwall');
  assert.ok(door&&main&&desk&&chair&&shelf,'Missing confirmed study objects');
  assert.deepEqual(door.rect,[2340,4980,2460,5880]);assert.deepEqual(door.h,[2400,5040]);
  assert.equal(door.openingWidthMm,900);assert.equal(door.len,780);assert.equal(door.heightMm,2150);
  assert.deepEqual(p.WALLS[29],[2340,3280,2460,4980,'u']);assert.deepEqual(p.WALLS[30],[2340,5880,2460,6260,'u']);
  assert.deepEqual([desk.cx,desk.cy,desk.w,desk.d,desk.heightMm],[960,5925,1680,550,740]);
  assert.equal(desk.modelVariant,'north-facing-workstation');assert.deepEqual([chair.cx,chair.cy],[960,5350]);
  assert.deepEqual([shelf.cx,shelf.cy,shelf.w,shelf.d],[960,6058.75,1680,282.5]);
  const previousPlanFields=Object.fromEntries(ARCH_KEYS.map(k=>[k,clone(p[k])]));
  const previousFurniture=previous.defaultFurniture.filter(f=>CHANGED_IDS.includes(f.id)).map(f=>clone(f));
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));

  Object.assign(door,{name:'书房900普通门 · 再南移300mm、南铰内开',rect:[2340,5280,2460,6180],sourceAxisMm:[2400,5280,2400,6180],h:[2400,6120],c:[0,-1],o:[-1,0],
    directionStatus:'user-design-correction',swingRevision:REVISION,
    notes:'2026-10-12确认：900mm门洞再南移300（自最初累计800），改南侧合页向书房内开，全开门板靠南墙但模型仍留60mm门板边距。南桌及浅书架收短1450避让；洞下墙垛仅20mm，门套、把手、墙厚及实物拉椅需现场核对。'});
  door.operation={type:'hinged',hingeCm:[240,612],swing:{dx:0,dy:-1,ox:-1,oy:0,sweep:-1},openLeafCm:{x:162,y:610,w:78,d:4},source:'2026-10-12已确认书房再南移与南铰门、1450桌棚'};
  p.WALLS[29]=[2340,3280,2460,5280,'u'];p.WALLS[30]=[2340,6180,2460,6260,'u'];
  for(const i of [29,30])Object.assign(p.WALL_META[i],{sourceAxisMm:[2400,3280,2400,6260],notes:'2026-10-12确认：书房900门洞再南移300并南铰内开；房间轮廓/墙轴线保持，洞下室内20mm墙垛和门套结构待核。'});
  main.notes=main.notes.replace('与书房新门洞纵向错开230mm','与书房新门洞纵向错开530mm');

  Object.assign(desk,{name:'书房7字桌 · 南段1450×550',cx:845,w:1450,layoutRevision:REVISION,
    sourceFootprintMm:{x:120,y:5650,w:1450,d:550},notes:'2026-10-12确认：南桌东端收至x1570，保留北向办公桌variant及740高，避让南铰900门连续开启；西窗返桌原位，支撑与实物使用待深化。'});
  // Retain the approved chair at x960 rather than force it to the new desktop
  // centre x845: centring its 480 mm footprint would overlap the unchanged
  // west-window return desk by 15 mm. The original chair keeps a 100 mm gap.
  Object.assign(shelf,{name:'书房南墙浅书架 · 1450四格与工作灯带',cx:845,w:1450,baseWidthMm:1450,baseDepthMm:282.5,baseHeightMm:2500,layoutRevision:REVISION,
    sourceFootprintMm:{x:120,y:5917.5,w:1450,d:282.5},notes:'2026-10-12确认：随南桌收短1450，东端x1570避让南铰门，四格真板与上层奶白门；22mm竖/层板、12mm背板、18mm门不等比缩小，保留灯带；西窗不增高柜。'});
  shelf.parts=studyShelfParts(shelf);
  shelf.conditions=['1450mm外包、四格净跨335mm；22mm竖板及层板、12mm背板、18mm高位门原厚度保持，承载锚固仍待厂家核验。',
    '实际下部书格、竖板、背板与灯带在门高2150mm以内，不可只检查地面桌子或把书架当空投影；模型40mm厚门叶全角度扫掠均需避让。',
    '书格下口1460、顶2500、灯带底1448mm沿用设计值；独立吊挂及基层、窗帘、电源需现场核对。'];
  shelf.cabinetDesign={...clone(shelf.cabinetDesign),title:'书房1450四格浅书墙',boardThicknessMm:22,backThicknessMm:12,layoutRevision:REVISION,
    faces:[{face:'north',label:'书房南墙书架 · 朝北',lengthMm:1450,depthMm:282.5}],
    features:['四格两排开放书位与顶部奶白封闭门，净跨335mm。','22mm竖/层板、12mm背板及18mm门按真实尺寸重建，不缩放板厚。','实际下部板件及灯带与40mm门叶连续扫掠一起核对。'],
    dimensions:['1450×282.5mm外包；下口1460、顶2500、薄灯带底1448mm，门洞2150mm内板件应避让。','门套把手、板件边角、高位柜门、照明眩光与锚固荷载须现场深化。']};

  const sweepRadiusMm=Math.hypot(780,20),sweepToTableMm=2400-sweepRadiusMm-1570;
  const futureBedFootprintMm={x:120,y:3340,w:2100,d:1600};
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:DATE,sourceIds:['door_c','door_a',...CHANGED_IDS],
    description:'方案2书房900门洞再南移300并改南铰内开，南桌与浅书墙缩至1450；坐椅原位避让西窗返桌，主卧门仅纠正说明为530mm纵向间隔。',sourceSnapshotsUnchanged:true,
    openingWidthsUnchanged:true,wallAxesUnchanged:true,usageNote:'独立新层取代书房北铰1680旧状态；历史版本元数据不改。返桌、沙发、未来床外包、厨房/阳台双扇门全部保持。'}];
  p.metadata.conditions=(p.metadata.conditions||[]).map(s=>s.startsWith('方案2书房900门洞南移500，7字桌与1680浅书墙；')
    ?s.replace('方案2书房900门洞南移500，7字桌与1680浅书墙；与主卧门洞纵向间隔230mm，历史270mm投影重叠说明已由本轮替代。',
      '方案2书房900门洞累计南移800，本轮再南移300并改南铰内开；7字南桌与浅书墙1450，与主卧门洞纵向间隔530mm。'):s);
  p.metadata.conditions.push('2026-10-12方案2书房1450桌/真实书架东端至40mm门叶连续扫掠外包约49.74mm，余量有限，不含把手、门套和安装偏差；洞下室内墙垛仅20mm。未来床侧710mm与坐椅共用偏紧，床尾120mm不是通道。');
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-study-door-20261012.cjs';
  const migrationFields={};for(const id of CHANGED_IDS)migrationFields[id]=changedFields(previous.defaultFurniture.find(f=>f.id===id),get(id));
  p.metadata.familyStudyDoorUpdate={id:REVISION,date:DATE,title:'方案2 · 书房南铰门与1450短桌书架',status:'applied-owner-confirmed',sourceSnapshotsUnchanged:true,
    sourceReference:'2026-10-12用户明确批准书房门再南移反向、书桌和书架收短至约1450mm',
    previousPlanFields,previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedDoorIds:['door_c'],notesOnlyDoorIds:['door_a'],changedFurnitureIds:[...CHANGED_IDS],newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],preserveCustomSizeIds:[...CHANGED_IDS],migrationFields,wallIndicesUnchanged:true,
    study:{openingWidthMm:900,openingY:[5280,6180],southShiftFromPreviousMm:300,cumulativeSouthShiftMm:800,hingeMm:[2400,6120],hingeSide:'south',closedDirection:[0,-1],openDirection:[-1,0],
      leafMm:[780,40],doorHeightMm:2150,deskMm:[1450,550,740],shelfMm:[1450,282.5,2500],shelfBays:4,shelfClearSpanMm:335,returnDeskUnchanged:true,chairUnchanged:true,chairCenterMm:[960,5350],sofaRetained:true},
    clearancesMm:{mainStudyDoorLongitudinalGap:530,southOpeningJambInside:20,fullyOpenLeafToSouthWall:60,chairToWestReturnStaticSideGap:100,doorContinuousSweepToDesktop:sweepToTableMm,
      doorContinuousSweepEastOfBookcaseOuterEdge:sweepToTableMm,futureBedSouthToDeskFront:710,futureBedFootEast:120,futureBedToReturn:100,futureBedToDoorSweepByY:6120-sweepRadiusMm-4940},
    futureBed:{mattressMm:[1500,2000],assumedFrameMm:[1600,2100],sourceFootprintMm:futureBedFootprintMm,head:'west',replacesFurnitureId:'study_north_sofa',notSameTime:true,addedToCurrentScene:false},
    conditions:['书房房间轮廓2220×2860、返桌500×610、北墙沙发与未来床预留原样保持；床架2100×1600仅占位假设。',
      '坐椅保持原中心960/5350，距西窗返桌侧边100mm；不强制移到新桌心845（否则其480mm占位会与返桌重叠15mm）。',
      '床侧710mm同时承担上下床与坐椅使用，用床时应收椅或移开；床尾120mm不作为通道。',
      '2150mm门高范围内的真实书架竖板/背板/层板及1448mm灯带必须避让40mm厚门叶全部角度扫掠，不能只看桌面或一张90度门板。',
      '模型门扫掠至桌/书架外包约49.74mm，门全开离南墙60mm；均未计门把手、门套、墙面完成层、板件变形和安装误差。',
      '900洞下室内墙垛仅20mm，门套收口、合页固定、开合限位与承重性尚未核实，不据模型直接施工或下单。',
      '主卧/主卫门几何不动，厨房及阳台双扇双轨、客卫洗衣机和其他方案原样保持；历史北铰1680及230间隔条件由当前层替代。']};

  for(const k of Object.keys(previous))if(![...ARCH_KEYS,'defaultFurniture','metadata'].includes(k))assert.deepEqual(p[k],previous[k],k+': unexpected change');
  for(const f of previous.defaultFurniture)if(!CHANGED_IDS.includes(f.id))assert.deepEqual(get(f.id),f,'Unexpected furniture edit '+f.id);
  for(const d of previous.DOORS)if(!['door_c','door_a'].includes(d.id))assert.deepEqual(p.DOORS.find(q=>q.id===d.id),d,'Unexpected door edit '+d.id);
  assert.deepEqual({...main,notes:previous.DOORS.find(q=>q.id==='door_a').notes},previous.DOORS.find(q=>q.id==='door_a'),'Main door geometry must remain unchanged');
  for(const[id,before]of Object.entries(untouched))assert.deepEqual(bundle.schemes[id],before,id+': unexpected other scheme change');
  assert.deepEqual(beforeFamilyStudyDoor(p),previous,'New study-door layer must restore exact previous plan');
  return bundle;
}

function beforeFamilyStudyDoor(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyStudyDoorUpdate;
  if(!m)return out;
  for(const[k,v]of Object.entries(m.previousPlanFields))p[k]=clone(v);
  const originals=new Map(m.previousFurniture.map(f=>[f.id,f])),current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(originals.get(id)||current.get(id)));
  for(const k of META_KEYS){if(m.previousMetadataFields[k]===undefined)delete p.metadata[k];else p.metadata[k]=clone(m.previousMetadataFields[k]);}
  delete p.metadata.familyStudyDoorUpdate;
  return out;
}
module.exports={applyFamilyStudyDoor,beforeFamilyStudyDoor,REVISION};
