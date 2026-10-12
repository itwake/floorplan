'use strict';

// Owner-provided body dimensions, parametric photo-inspired styling. No SKU,
// photometric performance or installation approval is inferred from the photo.
const assert=require('node:assert/strict');
const {beforeFamilyLightingStudyRefinement}=require('./family-lighting-study-refinement-20261012.cjs');
const REVISION='family-ceiling-lighting-20261012';
const IDS=['family-living-ceilinglight','family-dining-ceilinglight'];
const META_KEYS=['designCorrections','conditions','converter'];
const clone=structuredClone;
function light(id,name,cx,cy,rot,dimensionStatus,notes){
  const worldW=rot===90?577:907,worldD=rot===90?907:577;
  return {id,type:'ceilinglight',name,cx,cy,w:907,d:577,rot,color:'#F8F7F2',heightMm:110,elevationMm:2590,
    roomId:'living',modelVariant:'rounded-rectangle-flush-light',layoutRevision:REVISION,dimensionStatus,
    sourceId:id,sourceFootprintMm:{x:cx-worldW/2,y:cy-worldD/2,w:worldW,d:worldD},
    notes,conditions:['按当前2700mm模型层高贴顶，灯底2590mm；真实吊顶完成面、底座安装及电线点位待现场确认。',
      '黑色细边、白色圆角灯罩为照片参考的参数化示意；发光仅用于模型展示，不代表功率、色温、照度或厂家光学参数。']};
}
function applyFamilyCeilingLighting(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyCornerStorageUpdate,'Apply after corner storage layer');
  assert.ok(!p.metadata.familyCeilingLightingUpdate,'Ceiling lighting layer already applied');
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  assert.equal(p.defaultFurniture.length,60);
  const rug=p.defaultFurniture.find(f=>f.id==='family-living-rug'),table=p.defaultFurniture.find(f=>f.id==='family-f23');
  assert.deepEqual([rug.cx,rug.cy,table.cx,table.cy,table.rot],[5075,7630,2955,11000,90]);
  assert.equal(p.ROOMS.find(r=>r.id==='living').heightMm,2700);
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(key=>[key,clone(p.metadata[key])]));
  p.defaultFurniture.push(
    light(IDS[0],'客厅黑色细边圆角吸顶灯 · 907×577×110',rug.cx,rug.cy,0,'owner-provided',
      '2026-10-12业主提供907×577×110mm及参考照片。按图做黑色细边、白色圆角面罩的薄型吸顶灯，居客厅地毯中心；未提供具体品牌型号。'),
    light(IDS[1],'餐厅同风格吸顶灯 · 同尺寸暂定占位',table.cx,table.cy,table.rot,'design-pending',
      '2026-10-12餐桌上方新增独立灯。尚未确认餐厅型号，暂用客厅同风格907×577×110mm占位，长边与餐桌长边平行；可独立改尺寸和位置。'));
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-12',sourceIds:IDS,
    description:'方案2客厅换业主参考的907×577×110圆角吸顶灯，置地毯中心；餐桌正上方新增同风格同尺寸暂定灯，取代客餐厅旧圆形占位灯。',sourceSnapshotsUnchanged:true}];
  p.metadata.conditions=[...(p.metadata.conditions||[]),
    '2026-10-12仅方案2更新客餐厅两盏吸顶灯。客厅907×577×110mm为业主提供值；餐厅同尺寸为暂定占位，未推定已购买。两盏分别居地毯/餐桌中心，不能当作实际灯位施工图。',
    '按当前模型2700层高贴顶，灯底2590；吊顶完成面、接线盒、安装固定、开关回路和实际灯具规格待现场核对。模型亮度/暖白外观仅为展示，不表示照度或厂家参数。'];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-ceiling-lighting-20261012.cjs';
  p.metadata.familyCeilingLightingUpdate={id:REVISION,date:'2026-10-12',title:'方案2 · 客厅圆角吸顶灯与餐厅独立灯',
    status:'applied-owner-request-dining-placeholder',sourceSnapshotsUnchanged:true,architectureUnchanged:true,otherFurnitureUnchanged:true,
    disabledImplicitRoomLampIds:['living'],ceilingHeightMm:2700,livingOwnerDimensionsMm:[907,577,110],
    diningStatus:'same-style-same-size-provisional',notPhotometricOrInstallationApproval:true,
    previousPlanFields:{},previousFurniture:[],previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:[],newFurnitureIds:IDS,removedFurnitureIds:[],replacedFurnitureIds:[],migrationFields:{}};
  assert.equal(p.defaultFurniture.length,62);
  assert.deepEqual(p.defaultFurniture.slice(0,60),previous.defaultFurniture,'All prior objects must remain exact');
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized edit');
  assert.deepEqual(beforeFamilyCeilingLighting(p),previous,'Lighting layer exact previous-model rollback');
  return bundle;
}
function beforeFamilyCeilingLighting(value){
  const out=beforeFamilyLightingStudyRefinement(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyCeilingLightingUpdate;
  if(!m)return out;
  const originals=new Map(m.previousFurniture.map(f=>[f.id,f])),current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(originals.get(id)||current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyCeilingLightingUpdate;
  return out;
}
module.exports={applyFamilyCeilingLighting,beforeFamilyCeilingLighting,REVISION,IDS};
