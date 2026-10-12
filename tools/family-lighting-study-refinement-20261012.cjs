'use strict';

// Scheme 2 owner corrections. The lower study window is a labelled estimate,
// not a newly surveyed dimension or approved AC installation.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const REVISION='family-lighting-study-refinement-20261012';
const IDS=['family-living-ceilinglight','family-dining-ceilinglight','family-acwall-room_c'];
const META_KEYS=['designCorrections','conditions','converter'];
const clone=structuredClone;
const changed=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&!isDeepStrictEqual(a[k],b[k])).sort();
function applyFamilyLightingStudyRefinement(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyCeilingLightingUpdate,'Apply after ceiling lighting layer');
  assert.ok(!p.metadata.familyLightingStudyRefinement,'Lighting/study refinement already applied');
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const get=id=>p.defaultFurniture.find(f=>f.id===id),previousFurniture=IDS.map(id=>clone(get(id)));
  assert.ok(previousFurniture.every(Boolean));assert.equal(p.defaultFurniture.length,62);
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  const living=get(IDS[0]),dining=get(IDS[1]),ac=get(IDS[2]);
  assert.deepEqual([living.w,living.d,living.heightMm,living.elevationMm],[907,577,110,2590]);
  Object.assign(living,{layoutRevision:REVISION,lightingDesign:{...living.lightingDesign,frameColor:'#242424',backplateColor:'#F8F7F2'},
    notes:living.notes+' 本次将上方背板改为白色，俯视不再黑成一整块；侧面保留黑色细边。'});
  Object.assign(dining,{name:'餐厅圆形吸顶灯 · 沿用原客厅圆灯',w:440,d:440,rot:0,heightMm:20,elevationMm:2680,
    color:'#FFFFFF',modelVariant:'round-flush-light',layoutRevision:REVISION,dimensionStatus:'reused-model-dimensions-pending',
    lightingDesign:{frameColor:'#FFFFFF',backplateColor:'#FFFFFF'},
    sourceFootprintMm:{x:dining.cx-220,y:dining.cy-220,w:440,d:440},
    notes:'按业主要求沿用原客厅圆形吸顶灯样式。440mm直径、20mm厚度来自此前模型的半径220/厚20圆柱示意，不是实物复尺；居餐桌正上方，按2700模型顶面贴顶。',
    conditions:['沿用原客厅圆灯，不再使用907×577长方灯占位；实物型号、直径、厚度、安装底座和接线位置待核。',
      '灯体白色，模型亮度与色温仅作视觉示意，不代表厂家性能或照度校核。']});
  const i=p.WIN_META.findIndex(w=>w.id==='window_c'),window=p.WIN_META[i];assert.ok(window);
  assert.deepEqual([window.openingWidthMm,window.sillMm,window.heightMm,window.headMm],[1100,900,1400,2300]);
  Object.assign(window,{name:'书房西窗 · 暂估窗高1200／窗台900（待实测）',heightMm:1200,headMm:2100,
    dimensionStatus:'owner-request-lower-window-provisional',placementStatus:'unresolved',layoutRevision:REVISION,
    notes:'业主已确认先用窗洞高1200mm暂估、窗台900mm不变；复尺图仍未给窗高/窗台。仅窗洞高度1400→1200示意，原宽1100及平面位置保持，必须现场确认。'});
  Object.assign(ac,{cx:245,cy:4700,rot:270,layoutRevision:REVISION,
    sourceFootprintMm:{x:120,y:4250,w:250,d:900},
    notes:'本次按业主要求真正移至书房西墙窗上方、朝东。暂估机身900×250×300，底2250/顶2550保持。窗上口按2100暂估，150mm上下间隔只是模型余量，窗高、墙梁、实机及安装条件待核。',
    conditions:[...previousFurniture[2].conditions.slice(0,2),
      '西墙窗上方机身背面x120贴室内墙面，朝东；不挂在玻璃上。书房窗台900/高1200/上口2100均为未复尺示意，并非新确认的测量值。',
      '窗头2100至机身底2250、机身顶2550至顶棚2700各150mm；实际进风、检修、支架、墙梁承载、窗帘和外机接管必须按厂家与现场核验，不据静态无相交确认可安装。'],
    applianceDesign:{...clone(ac.applianceDesign),revision:REVISION,windowPlacement:{...clone(ac.applianceDesign.windowPlacement),
      revision:REVISION,status:'provisional-window-west-wall-installation-pending',mountingWall:'west',mountingDescription:'书房西墙窗头上方 · 朝东',
      bodyRectMm:[120,4250,370,5150],windowHeadMm:2100,bodyAboveWindowHeadMm:150,topToRoomCeilingMm:150,
      windowHeightProvisional:true,windowSillMm:900,windowHeightMm:1200}}});
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-12',sourceIds:[...IDS,'window_c'],
    description:'方案2餐厅沿用原客厅白色圆灯；客厅907×577灯顶背板白色、侧边黑色；书房挂机改西墙窗上方朝东，窗高暂估1200/窗台900且待实测。',sourceSnapshotsUnchanged:true}];
  p.metadata.conditions=[...(p.metadata.conditions||[]),
    '本次修订覆盖前版“餐厅同尺寸长方灯占位”及“书房挂机仍挂北墙”的现状说明：餐厅改原白圆灯，客厅长方灯背板白色，书房机移西窗墙上方朝东。此前文字属于历史方案，不是本版定位。',
    '书房窗未新增复尺确认值：窗台900、窗洞高1200、窗顶2100及原宽1100/平面定位为暂估示意，不能为挤放空调当成实测或施工尺寸。实际窗口、顶部梁、墙体承载、机型及安装净空必须现场核验。'];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-lighting-study-refinement-20261012.cjs';
  p.metadata.familyLightingStudyRefinement={id:REVISION,date:'2026-10-12',title:'方案2 · 圆餐灯、白灯背板与西窗墙空调',
    status:'owner-request-study-window-provisional',sourceSnapshotsUnchanged:true,notInstallationApproval:true,
    changedFurnitureIds:IDS,newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],
    previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    previousPlanFields:{WIN_META:clone(previous.WIN_META)},migrationFields:Object.fromEntries(previousFurniture.map(f=>[f.id,changed(f,get(f.id))])),
    changedWindowIds:['window_c'],otherArchitectureUnchanged:true,remainingFurnitureUnchanged:true,
    diningRoundDimensionsFromOldModelMm:[440,440,20],livingOwnerDimensionsUnchanged:true,livingBackplateColor:'#F8F7F2',
    studyWindow:{status:'provisional-not-surveyed',estimateOwnerConfirmed:true,openingWidthMm:1100,sillMm:900,heightMm:1200,headMm:2100,
      planarLocationUnchanged:true,unmeasuredSillAndHeight:true,source:'更新复尺资料仍写直窗宽度及位置未测；业主要求降低窗高，先用暂估示意。'},
    studyAc:{id:ac.id,mountingWall:'west',faces:'east',bodyRectMm:[120,4250,370,5150],dimensionsMm:[900,250,300],bottomMm:2250,topMm:2550,
      nominalGapAboveWindowMm:150,nominalGapBelowCeilingMm:150,notManufacturerClearance:true}};
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata','WIN_META'].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  for(let j=0;j<p.WIN_META.length;j++)if(j!==i)assert.deepEqual(p.WIN_META[j],previous.WIN_META[j],'Unrelated window changed');
  for(const f of previous.defaultFurniture)if(!IDS.includes(f.id))assert.deepEqual(get(f.id),f,'Unrelated object changed '+f.id);
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized scheme edit');
  assert.deepEqual(beforeFamilyLightingStudyRefinement(p),previous,'Exact previous-model rollback');
  return bundle;
}
function beforeFamilyLightingStudyRefinement(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyLightingStudyRefinement;
  if(!m)return out;
  const old=new Map(m.previousFurniture.map(f=>[f.id,f])),current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyLightingStudyRefinement;
  return out;
}
module.exports={applyFamilyLightingStudyRefinement,beforeFamilyLightingStudyRefinement,REVISION,IDS};
