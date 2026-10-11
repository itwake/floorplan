'use strict';

// User-confirmed bedroom furniture layer, October 11, 2026. This does not
// import or reinterpret the historical cm survey snapshots. Coordinates come
// from the approved family/screen bedroom draft and are already millimetres.
const assert=require('node:assert/strict');
const REVISION='bedroom-confirmed-20261011';
const DATE='2026-10-11';
const ADDED_IDS=['draft-desk-b','draft-chair-b','draft-night-b','draft-desk-a','draft-chair-a','draft-night-a'];
const CHANGED_IDS=['bed_b','bed_a','family-f1','family-f3','fit-bay_b_tea'];
const REMOVED_IDS=['bed_b_niche_console'];
const ARCH_KEYS=['ROOMS','WALLS','WALL_META','WINS','WIN_META','DOORS','SLIDES','BAYS','BIFOLDS'];
const r=n=>Math.round(n*1000000)/1000000;
function worldRect(f){
  const a=(f.rot||0)*Math.PI/180,c=Math.abs(Math.cos(a))<1e-12?0:Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a))<1e-12?0:Math.abs(Math.sin(a));
  const w=f.w*c+f.d*s,d=f.w*s+f.d*c;
  return {x:r(f.cx-w/2),y:r(f.cy-d/2),w:r(w),d:r(d)};
}
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.000001&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>.000001;
const clone=structuredClone;
function preserveSource(f,old){
  if(old.originalSourceFootprintMm)f.originalSourceFootprintMm=clone(old.originalSourceFootprintMm);
  else if(old.sourceFootprintMm)f.originalSourceFootprintMm=clone(old.sourceFootprintMm);
  else delete f.originalSourceFootprintMm;
  f.sourceFootprintMm=worldRect(f);
}
function setCabinetDescription(f,isB){
  f.roomId=isB?'room_b':'room_a';f.face=isB?'west':'east';f.sourceId=f.id;f.doorStyle='sliding';
  f.name=isB?'次卧东墙衣柜 · 与主卧镜像':'主卧西墙衣柜 · 与次卧镜像';
  f.notes=`${isB?'次卧东墙':'主卧西墙'}2240×600mm衣柜，北端贴北墙、背板贴两卧共用墙；床尾柜前模型净距555mm，偏紧。下部使用滑门，柜内五金净深及固定仍待现场深化。`;
  f.conditions=[
    '2240×600mm外包与2400mm柜高为模型设计参数；板材、墙面完成面、净高及安装尺寸仍待厂家现场深化。',
    '床尾至柜前555mm偏紧；下部滑门不外伸，但不据此认定柜前站位或多人通行舒适。',
    '保留18mm板件、内嵌扣手和上400mm低频被褥分区；上柜门为高位平开，五金及开启条件另核。',
    isB?'衣柜南端至次卧门轴线开门叶端约140mm；门扇厚度计入连续扫掠后约139.74mm，不是门口通行净宽。':'衣柜南端以南到床尾的西侧进房带模型宽1155mm；主卧900mm门洞与其原位置不移动。'
  ];
  assert.ok(f.cabinetDesign&&f.parts?.length,'Bedroom cabinet requires the existing detailed 18mm main wardrobe');
  // Local face stays south: rotating the same board assembly by 90/270 gives
  // the west/east world faces. Do not double-rotate or stretch the panels.
  f.cabinetDesign={...clone(f.cabinetDesign),title:isB?'次卧东墙镜像衣柜 · 555mm床尾带':'主卧西墙衣柜 · 555mm床尾带',
    faces:[{face:'south',label:isB?'次卧柜正面 · 朝西（随柜体旋转）':'主卧柜正面 · 朝东（随柜体旋转）',lengthMm:2240,depthMm:600}],
    features:['600mm外深用于挂衣及叠衣分区，净深仍须扣除双轨和背板核验。','奶白下部滑门及内嵌浅原木扣手；不向555mm床尾带拉出抽屉或门扇。','保留上400mm低频被褥层及高位平开门；此层不扩张衣柜占地。'],
    dimensions:['2240×600×2400mm模型外包；柜高与柜内净尺寸仍待现场定制复核。','床尾柜前555mm偏紧，下门采用滑门；该净距不等于舒适操作及通行认证。','18mm板件保持原2240mm主柜组件尺寸，不缩放板厚，轨道与承重待厂家深化。'],
    bedroomRevision:REVISION};
  f.baseWidthMm=2240;f.baseDepthMm=600;f.baseHeightMm=f.heightMm;
}
function addFurniture(p,id,type,name,cx,cy,w,d,rot,roomId){
  assert.ok(!p.defaultFurniture.some(f=>f.id===id),'Bedroom addition duplicates '+id);
  const f={id,type,name,cx,cy,w,d,rot,roomId,sourceId:id,color:type==='chair'?'#D5CBB8':'#D8BB97',
    heightMm:type==='desk'?750:type==='chair'?800:500,elevationMm:0,dimensionStatus:'design-pending',layoutRevision:REVISION};
  f.sourceFootprintMm=worldRect(f);
  f.notes=type==='desk'?'北侧紧凑小桌尺寸占位；桌深500mm，与床架边缘模型相隔100mm，非标准大办公桌。':
    type==='chair'?'小书桌配椅，450×450mm尺寸占位；退椅会占用室内地面，实物/开合动作仍需核验。':
    '南侧窄边放床头柜，与床架边缘相切为平面设计示意；该侧边不标为进房主通道。';
  p.defaultFurniture.push(f);return f;
}
function sweptDoorHits(door,rect,thicknessMm=40){
  // Conservative continuous quarter-sector, not sampled angles. Inflate the
  // fixture by half the leaf thickness. All imported hinged axes are cardinal.
  const [hx,hy]=door.h,sx=Math.sign(door.c[0]||door.o[0]),sy=Math.sign(door.c[1]||door.o[1]);
  assert.ok(sx&&sy,'Non-cardinal door needs a new sweep review: '+door.id);
  const half=thicknessMm/2,xs=[sx*(rect.x-half-hx),sx*(rect.x+rect.w+half-hx)],ys=[sy*(rect.y-half-hy),sy*(rect.y+rect.d+half-hy)];
  const x1=Math.max(...xs),y1=Math.max(...ys);if(x1<0||y1<0)return false;
  const x0=Math.max(0,Math.min(...xs)),y0=Math.max(0,Math.min(...ys));
  return Math.hypot(x0,y0)<=door.len+.000001;
}
function changedFields(previous,current){
  return [...new Set([...Object.keys(previous||{}),...Object.keys(current||{})])]
    .filter(k=>k!=='id'&&JSON.stringify(previous?.[k])!==JSON.stringify(current?.[k]));
}
function review(p,previous){
  const get=id=>p.defaultFurniture.find(f=>f.id===id),changed=p.defaultFurniture.filter(f=>['bed_b','bed_a','family-f1','family-f3',...ADDED_IDS].includes(f.id));
  for(let i=0;i<changed.length;i++)for(let j=i+1;j<changed.length;j++)assert.ok(!overlap(worldRect(changed[i]),worldRect(changed[j])),p.id+': '+changed[i].id+' overlaps '+changed[j].id);
  for(const f of changed){const q=worldRect(f),b=f.roomId==='room_b'||['bed_b','family-f1'].includes(f.id);assert.ok(q.x>=(b?120:3495)&&q.x+q.w<=(b?3375:6750)&&q.y>=120&&q.y+q.d<=3220,p.id+': bedroom footprint outside model '+f.id);}
  const bCab=worldRect(get('family-f1')),aCab=worldRect(get('family-f3')),bBed=worldRect(get('bed_b')),aBed=worldRect(get('bed_a'));
  assert.equal(bCab.x-(bBed.x+bBed.w),555);assert.equal(aBed.x-(aCab.x+aCab.w),555);
  const bDoor=p.DOORS.find(d=>d.sourceId==='door_b'||d.id==='door_b');assert.ok(bDoor,p.id+': bedroom door missing');
  const openTipY=bDoor.h[1]+bDoor.o[1]*bDoor.len;assert.equal(openTipY,2500);assert.equal(openTipY-bCab.y-bCab.d,140);
  const radius=Math.hypot(bDoor.len,20),secondarySweepGapMm=r(bDoor.h[1]-radius-(bCab.y+bCab.d));
  for(const door of p.DOORS)for(const f of changed)assert.ok(!sweptDoorHits(door,worldRect(f)),p.id+': '+door.id+' continuous swing hits '+f.id);
  for(const id of ['family-f1','family-f3']){
    const f=get(id);assert.equal(f.w,2240);assert.equal(f.d,600);assert.equal(f.heightMm,2400);
    assert.equal(new Set(f.parts.map(q=>q.id)).size,f.parts.length,id+': duplicate board id');
    for(const q of f.parts)assert.ok(q.x>=-1120-.01&&q.x+q.w<=1120+.01&&q.y>=-300-.01&&q.y+q.d<=300+.01&&q.elevationMm>=0&&q.elevationMm+q.heightMm<=2400+.01,id+': board outside unchanged assembly '+q.id);
  }
  for(const key of ARCH_KEYS)assert.deepEqual(p[key],previous[key],p.id+': bedroom edit mutated architecture '+key);
  const allowed=new Set([...CHANGED_IDS,...REMOVED_IDS]);
  for(const f of previous.defaultFurniture.filter(f=>!allowed.has(f.id)))assert.deepEqual(get(f.id),f,p.id+': non-bedroom furniture changed '+f.id);
  return {bedFootToWardrobeB:555,bedFootToWardrobeA:555,secondaryDoorToCabinetLeafCenterline:140,
    secondaryDoorToCabinetLeafSweepApprox:secondarySweepGapMm,bedBToNorthDesk:100,bedAToNorthDesk:100,masterSouthBand:300,secondarySouthBand:400,masterWestRouteBelowCabinet:1155,suiteEntryWidth:895,
    continuousDoorSweepsAvoidUpdatedFurniture:true};
}
function applyBedroomLayout(bundle,ids=['family','screen']){
  assert.ok(Array.isArray(ids)&&ids.length,'Bedroom target scheme list required');
  for(const id of ids){
    assert.ok(['family','screen'].includes(id),'Bedroom update is authorized only for schemes 2 and 4');
    const p=bundle.schemes[id];assert.ok(p,'Missing bedroom target '+id);assert.ok(!p.metadata.bedroomUpdate,'Bedroom layer requires a fresh generated scheme: '+id);
    const previous=clone(p),get=id=>p.defaultFurniture.find(f=>f.id===id);
    const main=get('family-f3'),oldSecondary=get('family-f1');
    assert.ok(main&&oldSecondary&&get('bed_a')&&get('bed_b')&&get('bed_b_niche_console')&&get('fit-bay_b_tea'),id+': original bedroom objects missing');
    assert.deepEqual([main.cx,main.cy,main.w,main.d,main.rot,main.heightMm],[3795,1240,2240,600,270,2400],id+': confirmed mirrored main cabinet no longer matches');
    const priorFurniture=previous.defaultFurniture.filter(f=>[...CHANGED_IDS,...REMOVED_IDS].includes(f.id)).map(f=>clone(f));
    const secondary=clone(main);
    Object.assign(secondary,{id:'family-f1',cx:3075,cy:1240,rot:90,layoutRevision:REVISION});
    secondary.parts=secondary.parts.map(q=>({...q,id:q.id.startsWith(main.id)?secondary.id+q.id.slice(main.id.length):secondary.id+'-'+q.id}));
    preserveSource(secondary,oldSecondary);setCabinetDescription(secondary,true);
    p.defaultFurniture[p.defaultFurniture.indexOf(oldSecondary)]=secondary;
    p.defaultFurniture=p.defaultFurniture.filter(f=>!REMOVED_IDS.includes(f.id));
    const b=get('bed_b'),oldB=previous.defaultFurniture.find(f=>f.id===b.id);
    Object.assign(b,{name:'次卧床垫1500×2000',cx:1170,cy:2020,w:1600,d:2100,mattressMm:[1500,2000],roomId:'room_b',layoutRevision:REVISION,
      notes:'床头仍贴西墙；1500×2000mm床垫，床架外包暂1600×2100mm，向南移动745mm。床尾柜前555mm偏紧；北侧小桌与南侧床头柜为模型占位，实物与踢脚线收口待核。'});
    preserveSource(b,oldB);
    const a=get('bed_a'),oldA=previous.defaultFurniture.find(f=>f.id===a.id);
    Object.assign(a,{name:'主卧床垫1800×2000',cx:5700,cy:1970,w:1900,d:2100,mattressMm:[1800,2000],roomId:'room_a',layoutRevision:REVISION,
      notes:'床头仍贴东墙；1800×2000mm床垫，床架外包暂1900×2100mm，向南移动350mm。床尾柜前555mm偏紧；800×500mm北侧小桌不是标准大办公桌，实物床架与收口待核。'});
    preserveSource(a,oldA);
    const oldMain=previous.defaultFurniture.find(f=>f.id===main.id);main.layoutRevision=REVISION;preserveSource(main,oldMain);setCabinetDescription(main,false);
    addFurniture(p,'draft-desk-b','desk','次卧小书桌1000×500',370,620,1000,500,270,'room_b');
    addFurniture(p,'draft-chair-b','chair','次卧书椅',895,620,450,450,90,'room_b');
    addFurniture(p,'draft-night-b','nightstand','次卧床头柜450×400',345,3020,450,400,0,'room_b');
    addFurniture(p,'draft-desk-a','desk','主卧小书桌800×500',6500,520,800,500,90,'room_a');
    addFurniture(p,'draft-chair-a','chair','主卧书椅',5975,520,450,450,270,'room_a');
    addFurniture(p,'draft-night-a','nightstand','主卧床头柜450×300',6525,3070,450,300,0,'room_a');
    const tea=get('fit-bay_b_tea');tea.notes=(tea.notes||'').replace(/次卧无独立桌椅[。；]?\s*/g,'');tea.layoutRevision=REVISION;
    const clearancesMm=review(p,previous),migrationFields={};
    for(const f of p.defaultFurniture.filter(f=>[...CHANGED_IDS,...ADDED_IDS].includes(f.id)))migrationFields[f.id]=changedFields(previous.defaultFurniture.find(q=>q.id===f.id),f);
    const metadataBefore=clone(previous.metadata);
    p.metadata.bedroomUpdate={id:REVISION,date:DATE,title:'方案2、4 · 双卧床垫升级与镜像床尾衣柜',
      sourceReference:'output/bedrooms-family-screen-20261011/2026-10-11用户确认平面稿',sourceSnapshotsUnchanged:true,
      priorFurniture,previousFurniture:priorFurniture,previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),changedFurnitureIds:[...CHANGED_IDS],replacedFurnitureIds:['family-f1'],
      newFurnitureIds:[...ADDED_IDS],removedFurnitureIds:[...REMOVED_IDS],migrationFields,
      notesOnlyFurnitureIds:['fit-bay_b_tea'],architectureUnchanged:true,clearancesMm,
      assumptions:['次卧床垫1500×2000、主卧1800×2000mm；床架外包分别暂1600×2100、1900×2100mm，并非产品已核实。',
        '两侧衣柜均2240×600×2400mm；次卧镜像原主卧18mm板件，北端贴北墙。','次卧床向南745mm、主卧向南350mm；床头朝向、西侧/东侧墙体及所有门洞保持。'],
      conditions:['两卧柜前床尾带均555mm，偏紧，下门采用滑门；此层仅模型家具排布，不作施工或舒适通行认证。',
        '主卧800×500、次卧1000×500为紧凑小桌；500mm桌深与床架北边之间100mm为模型间隙，不是通路。',
        '南侧300/400mm床头柜带与西侧1155mm进房带用途不同，不把窄床侧带标为主通道。',
        '次卧原900mm门洞东余垛仅7.5mm；门套、门把手、柜末端及全屋墙体闭合仍需现场复核。',
        '保留次卧飘窗茶座全部几何和防坠条件；此次增加室内独立桌椅，移除原“无独立桌椅”说明。',
        '浏览器草稿只按字段升级仍等于旧默认值的内容；已有自定义摆位、尺寸、颜色或删除不应被强行恢复。']};
    const metadataAfter=clone(p.metadata);delete metadataAfter.bedroomUpdate;assert.deepEqual(metadataAfter,metadataBefore,id+': existing metadata changed');
  }
  return bundle;
}
module.exports={applyBedroomLayout,REVISION,worldRect,sweptDoorHits};
