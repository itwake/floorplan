'use strict';

// Explicit signed half-turns, not shortest-angle inference. These virtual
// offset axes and the operating-chair pose remain cabinet-hardware concepts.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const {beforeFamilyBalconyRecess}=require('./family-balcony-recess-20261012.cjs');
const REVISION='family-corner-door-180-20261012',CABINET_ID='fit-dining_sideboard_wall';
const META_KEYS=['conditions','designCorrections','converter'],clone=structuredClone;
const OPERATING_CHAIR={id:'family-f27',cx:3420,cy:12080,relativeMm:[482.5,835],temporary:true,ownerConfirmed:true,
  notes:'用餐时保留原位；开柜前向东临时移465mm，关柜后可显式恢复。不是永久改餐椅布局。'};
function applyFamilyCornerDoor180(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyLightingStudyRefinement,'Apply after lighting/study refinement');
  assert.ok(!p.metadata.familyCornerDoor180Update,'Corner door 180 layer already applied');
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const f=p.defaultFurniture.find(q=>q.id===CABINET_ID),chair=p.defaultFurniture.find(q=>q.id===OPERATING_CHAIR.id);
  assert.ok(f?.cornerDoorDesign&&chair);assert.equal(p.defaultFurniture.length,62);
  assert.deepEqual([chair.cx,chair.cy],[2955,12080]);assert.equal(f.cornerDoorDesign.hingeOpeningDegrees,90);
  const original=clone(f),previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  const doorParts=f.parts.filter(q=>q.cabinetDoor);assert.equal(doorParts.length,4);
  const changedPartIds=doorParts.map(q=>q.id);
  for(const q of doorParts){
    const west=q.cabinetDoor.group==='west',d=q.cabinetDoor;
    Object.assign(d,{openingSweepDegrees:west?-180:180,openDirection:west?[0,-1]:[1,0],
      hingeMm:west?[2530-f.cx,12741.5-f.cy]:[3253.5-f.cx,13485-f.cy],normalOffsetMm:west?14:-14,
      outboardAxisOffsetMm:5,hingeBarrelAtPivot:true,hardwareStatus:'offset-180-hinge-concept-installation-pending'});
    q.label=q.label+' · 最大180°';
  }
  Object.assign(f,{name:'通顶餐边柜 · 转角180°双面库门',layoutRevision:REVISION,
    notes:original.notes+' 本次四块门板最大180°展开，先西侧后南侧，关闭反序；5mm外移虚拟门轴与相应板厚偏移保持闭门原位，并给全开柜面10mm示意间隙。开柜前需临时向东移南餐椅465mm，关柜后显式恢复。180°五金、门重、实际运动轨迹、限位与防夹需厂家验证。',
    cornerDoorDesign:{...clone(original.cornerDoorDesign),revision:REVISION,hingeOpeningDegrees:180,
      openingSweepDegrees:{west:-180,south:180},closedLeafGeometryUnchanged:true,virtualOutboardAxisMm:5,
      nominalOpenFacadeGapMm:10,operatingChair:clone(OPERATING_CHAIR),defaultChairBlocksOpening:true,
      status:'180-offset-hardware-and-operating-clearance-concept',
      notes:'西门先开、南门后开；关闭反序。先临时移开南餐椅再打开180°。5mm外移轴、10mm全开间隙为模型示意，实际180°铰链、安装板、门重、收口、防夹/联动与厂家净空必须复核。'}});
  f.cabinetDesign={...clone(original.cabinetDesign),layoutRevision:REVISION,
    features:[...original.cabinetDesign.features,'两面库门最大180°，开柜前临时向东移南餐椅465mm；关门后恢复，不永久改变用餐布局。'],
    dimensions:[...original.cabinetDesign.dimensions,'180°示意轴外移5mm，配合门板偏移让闭合原位不变、全开至邻柜面留10mm模型间隙；不代表五金已经选型。'],
    layoutAdaptations:{...clone(original.cabinetDesign.layoutAdaptations),cornerStorage:{...clone(original.cabinetDesign.layoutAdaptations.cornerStorage),
      openingDegrees:180,operatingChair:clone(OPERATING_CHAIR),nominalOpenFacadeGapMm:10,hardwareInstallationApproved:false}}};
  f.conditions=[...original.conditions,
    '本版最大开角180°，西门先开、南门后开；关闭反序。原用餐位的南餐椅会在西门约123–166°扫掠中干涉，必须先移椅再开门。',
    '保留南餐椅默认(2955,12080)，业主确认开柜时临时向东移至(3420,12080)，关门后再恢复；可撤销，不能把本版动画看成不挪椅也能开足。',
    '虚拟轴外移5mm仅用于模型闭合对齐及全开10mm柜面间隙；实际180°铰链、挂接件、门重/挠度、联动限位、防夹与承重需定制商选型和现场确认。'];
  p.metadata.conditions=[...(p.metadata.conditions||[]),...f.conditions.slice(-3)];
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-12',sourceIds:[CABINET_ID],
    description:'方案2转角库两面柜门改显式180°顺序开合；保留用餐布局，开柜前临时移南餐椅并可恢复。柜内层板/灯带、整体占地、其他家具及房屋结构不改。',sourceSnapshotsUnchanged:true}];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-corner-door-180-20261012.cjs';
  const migrationFields=Object.fromEntries([[CABINET_ID,[...new Set([...Object.keys(original),...Object.keys(f)])].filter(k=>k!=='id'&&!isDeepStrictEqual(original[k],f[k])).sort()]]);
  p.metadata.familyCornerDoor180Update={id:REVISION,date:'2026-10-12',title:'方案2 · 转角库180°柜门与临时移椅',
    status:'owner-confirmed-model-hardware-pending',sourceSnapshotsUnchanged:true,architectureUnchanged:true,
    other61FurnitureUnchanged:true,defaultDiningLayoutUnchanged:true,hardwareInstallationApproved:false,
    hingeOpeningDegrees:180,openingSweepDegrees:{west:-180,south:180},openingSequence:['west','south'],closingSequence:['south','west'],
    operatingChair:clone(OPERATING_CHAIR),defaultChairBlocksOpening:true,virtualOutboardAxisMm:5,nominalOpenFacadeGapMm:10,
    changedPartIds,previousPlanFields:{},previousFurniture:[original],previousFurnitureOrder:previous.defaultFurniture.map(q=>q.id),previousMetadataFields,
    changedFurnitureIds:[CABINET_ID],newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],preserveCustomPartsIds:[CABINET_ID],migrationFields};
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  for(const old of previous.defaultFurniture)if(old.id!==CABINET_ID)assert.deepEqual(p.defaultFurniture.find(q=>q.id===old.id),old,'Unrelated object changed '+old.id);
  for(const part of original.parts)if(!part.cabinetDoor)assert.deepEqual(f.parts.find(q=>q.id===part.id),part,'Unrelated cabinet part changed '+part.id);
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized scheme edit');
  assert.deepEqual(beforeFamilyCornerDoor180(p),previous,'Exact previous model rollback');
  return bundle;
}
function beforeFamilyCornerDoor180(value){
  const out=beforeFamilyBalconyRecess(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyCornerDoor180Update;if(!m)return out;
  const old=new Map(m.previousFurniture.map(q=>[q.id,q])),current=new Map(p.defaultFurniture.map(q=>[q.id,q]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyCornerDoor180Update;return out;
}
module.exports={applyFamilyCornerDoor180,beforeFamilyCornerDoor180,REVISION,CABINET_ID,OPERATING_CHAIR};
