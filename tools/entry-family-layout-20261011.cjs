'use strict';

// Apply after applyScreenPlan. This is a subsequent owner-requested layer;
// the retained source snapshots and the confirmed screen scheme are untouched.
const assert=require('node:assert/strict');
const REVISION='entry-family-layout-20261011',VERSION='1.0.0',DATE='2026-10-11';
const TARGETS=['wood','family','laundry'];
const SIDEBOARD_ID='fit-dining_sideboard_wall',ENTRY_CABINET_ID='fit-entry_shoe_station';
const REMOVED_IDS=['fit-family_garage','garage-folded_stroller','garage-child_bike'];
const MIGRATION_FIELDS=['cx','cy','w','d','rot','heightMm','elevationMm'];
const clone=v=>structuredClone(v);
const ENTRY_NOTE='2026-10-11用户修订：入户门参照方案4向室外开启，保持本方案原洞口、宽高及门叶长度；合页从本方案洞口东端内退60mm作示意。公共走廊、邻户门、门套、闭门器及允许开启角度尚待现场核对，不构成外开施工批准。';
const CABINET_SWING_NOTE='入户门参照方案4向外开启，模型内不再扫过鞋柜正面；门外公共通行、相邻门、门套、闭门器及限位仍须现场确认，模型不构成外开施工批准。';

function updateEntryCabinet(f){
  // Only current explanatory text changes. Board shapes, occupied footprint,
  // cabinet height, material, doors and lighting remain exactly as before.
  f.notes=(f.notes||'')+' 入户门已按2026-10-11修订为外开，柜体位置与650mm沿墙长度均不变；门外扫动和五金仍待核。';
  f.sourceNotes='2026-10-11生成层同步入户外开修订；此柜沿用原650×340mm占地和全部造型，仅更新入户开向及使用说明。';
  f.conditions=(f.conditions||[]).map(note=>{
    if(note.includes('650mm是本模型能留出门把手端部余量'))return '650mm为沿用的暂估紧凑柜长，不照抄参考图鞋柜长度；门套、把手、电箱、对讲及闭门器实测后再定柜。';
    if(note.includes('入户右合页90°')||note.includes('必须先收门再使用'))return CABINET_SWING_NOTE;
    if(note.includes('模型示意门把手端部留空'))return '外开门五金和门外扫动尚未完成现场验证；需核对全开/关门、取鞋及多人进出，不以模型留空认定通行安全。';
    return note;
  });
  if(f.cabinetDesign?.features)f.cabinetDesign.features=f.cabinetDesign.features.map(note=>
    note.includes('入户门打开会挡柜面')||note.includes('取鞋和使用钥匙区前需先收门')?CABINET_SWING_NOTE:note);
  f.layoutRevision=REVISION;
}

function expandEntryBounds(p,door){
  // Preserve the old framing and include the fully open leaf, not merely
  // the unchanged structural opening. No room or wall geometry is moved.
  const b=p.PLAN_BOUNDS,points=[[b.x,b.y],[b.x+b.w,b.y+b.h]];
  const normal=[-door.o[1],door.o[0]],halfThickness=20;
  for(const end of [0,door.len])for(const side of [-1,1])points.push([
    door.h[0]+door.o[0]*end+normal[0]*halfThickness*side,
    door.h[1]+door.o[1]*end+normal[1]*halfThickness*side
  ]);
  const x=Math.min(...points.map(q=>q[0])),y=Math.min(...points.map(q=>q[1]));
  const maxX=Math.max(...points.map(q=>q[0])),maxY=Math.max(...points.map(q=>q[1]));
  p.PLAN_BOUNDS={x,y,w:maxX-x,h:maxY-y};
  p.BOUNDS={x:x-1000,y:y-1000,w:maxX-x+2000,h:maxY-y+2000};
  p.CENTER={x:(x+maxX)/2,y:(y+maxY)/2};
}

function describeFamilyDrawerConstraint(f){
  // Retain the reference's complete board assembly and 250-mm hardware
  // concept. Scheme 2's existing north dining chair is NOT the same layout
  // as the reference, so its actual drawer/seat overlap must be explicit.
  const note='方案2北侧三抽拉满250mm会与现有北餐椅投影交叠约50×133.5mm，拉满前须先收/移北椅；180mm仅为静态示意行程，与椅约留20mm，不含取物站位或舒适操作认证，五金仍须现场核验。';
  f.notes=(f.notes||'')+' '+note;
  f.conditions=f.conditions.map(s=>{
    if(s.includes('北段250mm抽屉加取物站位'))return '桌旁和南短臂下柜均为移门，不向过道拉出抽屉；北段三抽最大250mm行程需先收/移北餐椅，取物期间柜前不同时作绕行通道。';
    if(s.includes('已重新核对椅位'))return '采用已购1400×780mm固定四人桌及460×510mm餐椅，保留方案2原椅位；北椅与三抽250mm全行程存在交叠，须先收/移椅。180mm静态示意余20mm不是取物站位、多人或无障碍通行认证。';
    return s;
  });
  f.cabinetDesign.features=f.cabinetDesign.features.map(s=>s.includes('安全列')
    ? '下柜保留奶白封闭滑门，三层抽屉保留北侧600mm列；方案2现有北餐椅与250mm全行程交叠，拉满须先收/移椅，不称为无冲突安全列。':s);
  f.cabinetDesign.dimensions=f.cabinetDesign.dimensions.map(s=>s.includes('最多拉出250mm')
    ? '三抽列y9200–9800mm、外宽600mm，保留最大250mm概念行程；拉满需先收/移方案2北椅。180mm示意行程仅静态余20mm，五金和取物站位须现场核验。':s);
  f.cabinetDesign.layoutAdaptations.drawerReason='保留参考北段三抽的板件及250mm最大概念行程；方案2北餐椅未移动，当前全行程存在交叠，拉满前先收/移椅，不能沿用已防止抽屉与座位冲突的说明。';
  f.cabinetDesign.layoutAdaptations.actualLayoutConstraints={
    drawerFullExtensionMm:250,drawerFullExtensionRequiresMovingChair:true,
    drawerIllustrativeExtensionWithChairMm:180,drawerToChairIllustrativeGapMm:20
  };
}

function applyEntryFamilyLayout(bundle){
  const schemes=bundle?.schemes;
  assert.ok(schemes?.screen,'Entry/family revision must run after applyScreenPlan');
  for(const id of TARGETS)assert.ok(schemes[id],`Missing ${id} scheme`);
  const applied=TARGETS.map(id=>schemes[id].metadata?.entryFamilyUpdate?.id===REVISION);
  if(applied.every(Boolean))return bundle;
  assert.ok(applied.every(v=>!v),'Entry/family revision cannot be partially reapplied');

  const screenDoor=schemes.screen.DOORS.find(d=>d.entry),reference=schemes.laundry.defaultFurniture.find(f=>f.id===SIDEBOARD_ID);
  assert.ok(screenDoor&&reference,'Missing confirmed entry door or laundry L-sideboard');
  assert.deepEqual(screenDoor.c,[-1,0]);assert.deepEqual(screenDoor.o,[0,1]);
  assert.equal(screenDoor.h[0],screenDoor.rect[2]-60);
  assert.equal(screenDoor.h[1],(screenDoor.rect[1]+screenDoor.rect[3])/2);
  const screenSideboard=schemes.screen.defaultFurniture.find(f=>f.id===SIDEBOARD_ID);
  assert.ok(screenSideboard,'Missing screen L-sideboard reference');
  assert.deepEqual(reference.parts,screenSideboard.parts,'Laundry and screen L-sideboards must share their full shape');
  // Preflight all needed objects before changing any scheme.
  for(const id of TARGETS){
    const p=schemes[id],d=p.DOORS.find(q=>q.entry);
    assert.ok(d&&p.defaultFurniture.some(f=>f.id===ENTRY_CABINET_ID),`${id}: missing entry objects`);
    assert.ok(d.rect[2]-d.rect[0]>d.rect[3]-d.rect[1],`${id}: entry opening needs horizontal-axis review`);
    assert.ok(Number.isFinite(d.len)&&d.len>0&&d.len<=d.rect[2]-d.rect[0]-60,`${id}: entry leaf does not fit`);
    assert.ok(p.PLAN_BOUNDS,`${id}: missing plan bounds`);
  }
  const family=schemes.family;
  assert.ok(family.defaultFurniture.some(f=>f.id===SIDEBOARD_ID),'Missing family sideboard');
  for(const id of REMOVED_IDS)assert.ok(family.defaultFurniture.some(f=>f.id===id),`Missing removed family item ${id}`);
  assert.ok(family.BIFOLDS.some(d=>d.id==='800-library-door'),'Missing family storage folding door');
  const screenBefore=JSON.stringify(schemes.screen);

  for(const id of TARGETS){
    const p=schemes[id],door=p.DOORS.find(d=>d.entry),cabinet=p.defaultFurniture.find(f=>f.id===ENTRY_CABINET_ID);
    const update={
      id:REVISION,version:VERSION,date:DATE,
      title:'三套入户门外开；方案2取消800库并采用整墙7字餐边柜',
      referenceScheme:'screen',sideboardReferenceScheme:'laundry',
      previousEntryDoor:clone(door),previousEntryCabinet:clone(cabinet),
      previousFurniture:[],previousFurnitureOrder:p.defaultFurniture.map(f=>f.id),previousBifolds:clone(p.BIFOLDS),
      previousCabinetRevision:clone(p.metadata.cabinetRevision),
      previousSideboardReference:clone(p.metadata.sideboardReference),
      previousGarageMovement:clone(p.metadata.garageMovement),
      previousConverter:p.metadata.converter,previousDesignCorrections:clone(p.metadata.designCorrections),
      previousConditions:clone(p.metadata.conditions),
      previousBounds:{PLAN_BOUNDS:clone(p.PLAN_BOUNDS),BOUNDS:clone(p.BOUNDS),CENTER:clone(p.CENTER)},
      removedFurnitureIds:[],removedBifoldIds:[],replacedFurnitureIds:[],newFurnitureIds:[],
      migrationFields:[...MIGRATION_FIELDS],sourceSnapshotsUnchanged:true,
      openingUnchanged:true,entryCabinetGeometryUnchanged:true,
      conditions:['仅更新未被用户自定义的默认布局；已删家具不自动复活，自定义摆位或尺寸须保留并提示核对。','入户门外开为模型设计修订；公区、相邻门和五金尚待现场核验。']
    };
    door.h=[door.rect[2]-60,(door.rect[1]+door.rect[3])/2];
    door.c=[-1,0];door.o=[0,1];door.defaultOpen=true;
    door.name=screenDoor.name;door.directionStatus='user-design-correction';door.swingRevision=REVISION;
    door.dimensionStatus='design-pending';door.placementStatus='unresolved';
    door.notes=ENTRY_NOTE;
    door.source='2026-10-11用户要求三套入户门完全参照方案4外开；原源快照洞口与门叶尺寸保留。';
    door.sourceNotes='仅生成层覆盖原推断的内开方向；本方案sourceAxisMm、rect、openingWidthMm、heightMm和len未改。';
    door.operation={...clone(door.operation),type:'hinged',hingeCm:door.h.map(n=>n/10),
      swing:{dx:-1,dy:0,ox:0,oy:1,sweep:-1},
      openLeafCm:{x:(door.h[0]-20)/10,y:door.h[1]/10,w:4,d:door.len/10},
      source:door.source};
    updateEntryCabinet(cabinet);

    if(id==='family'){
      const affected=new Set([SIDEBOARD_ID,...REMOVED_IDS]);
      update.previousFurniture=p.defaultFurniture.filter(f=>affected.has(f.id)).map(clone);
      update.removedFurnitureIds=[...REMOVED_IDS];update.replacedFurnitureIds=[SIDEBOARD_ID];
      update.removedBifoldIds=p.BIFOLDS.filter(d=>d.id==='800-library-door').map(d=>d.id);
      const sideboard=clone(reference);
      sideboard.layoutRevision=REVISION;sideboard.designReferenceSchemeId='laundry';
      sideboard.sourceNotes='2026-10-11用户修订：方案2取消800库，餐边柜完整采用方案3/方案4相同的7字板件、材质和返柜；其他公共区家具与厨房原位保留。';
      describeFamilyDrawerConstraint(sideboard);
      update.conditions.push('方案2餐柜北侧三抽250mm全行程与现有北餐椅投影交叠约50×133.5mm，拉满前须先收/移椅；180mm仅静态示意余20mm，不是取物站位或舒适操作认证，五金仍待现场核验。');
      p.defaultFurniture=p.defaultFurniture.filter(f=>!REMOVED_IDS.includes(f.id)).map(f=>f.id===SIDEBOARD_ID?sideboard:f);
      p.BIFOLDS=p.BIFOLDS.filter(d=>!update.removedBifoldIds.includes(d.id));
      delete p.metadata.garageMovement;
      p.metadata.cabinetRevision.geometryPolicy='2026-10-11方案2移除800库及两车，餐边柜完整采用方案3相同7字返柜；其余柜体几何和公共区家具位置不变。';
      p.metadata.sideboardReference.geometryPolicy='2026-10-11方案2采用方案3相同4890mm西直柜、7字南返柜与原400mm盲角；原800库及折叠门已移除。';
    }
    expandEntryBounds(p,door);
    p.metadata.converter=p.metadata.converter+' + tools/entry-family-layout-20261011.cjs';
    p.metadata.conditions=[...(p.metadata.conditions||[]),CABINET_SWING_NOTE];
    p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{
      id:REVISION,sourceId:door.sourceId,description:ENTRY_NOTE,openingUnchanged:true,
      hingeMm:clone(door.h),closedDirection:clone(door.c),openDirection:clone(door.o),leafLengthMm:door.len
    }];
    p.metadata.entryFamilyUpdate=update;
  }
  assert.equal(JSON.stringify(schemes.screen),screenBefore,'Confirmed screen scheme must remain unchanged');
  return bundle;
}

module.exports={applyEntryFamilyLayout,REVISION};
