'use strict';

// Owner-confirmed follow-up to the October 11 plan and its A4 dimension sheet.
// Apply last; preserve all source snapshots and the other three schemes.
const assert=require('node:assert/strict');
const REVISION='family-master-bath-confirmed-20261011';
const clone=structuredClone;
const changedFields=(a,b)=>[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])]
  .filter(k=>k!=='id'&&JSON.stringify(a?.[k])!==JSON.stringify(b?.[k]));

function applyFamilyMasterBath(bundle){
  const p=bundle.schemes.family;assert.ok(p?.metadata.bedroomUpdate,'Apply after confirmed bedroom layer');
  assert.ok(!p.metadata.familyBathUpdate,'Family master-bath layer already applied');
  const previous=clone(p),untouched=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const door=id=>p.DOORS.find(d=>d.id===id),furn=id=>p.defaultFurniture.find(f=>f.id===id);
  const main=door('door_a'),bath=door('door_bath_1'),vanity=furn('vanity_main'),toilet=furn('family-f11'),wardrobe=furn('family-f3');
  assert.deepEqual(main.rect,[3375,3550,3495,4450]);assert.deepEqual(main.h,[3435,4390]);
  assert.deepEqual(bath.rect,[4390,3740,4510,4490]);assert.deepEqual(bath.h,[4450,4430]);
  assert.deepEqual([vanity.cx,vanity.cy,vanity.w,vanity.d,vanity.rot],[4830,3550,600,360,0]);
  assert.deepEqual([toilet.cx,toilet.cy,toilet.w,toilet.d,toilet.rot],[5570,3660,360,580,0]);
  const previousDoors=[clone(main),clone(bath)],previousFurniture=[clone(vanity),clone(toilet),clone(wardrobe)];
  const wallChanges=[[25,3,3850],[26,1,4750],[32,3,3440],[33,1,4190]];
  assert.deepEqual(p.WALLS[25],[3375,60,3495,3550,'u']);assert.deepEqual(p.WALLS[26],[3375,4450,3495,4930,'u']);
  assert.deepEqual(p.WALLS[32],[4390,3280,4510,3740,'u']);assert.deepEqual(p.WALLS[33],[4390,4490,4510,4930,'u']);
  const previousWalls=wallChanges.map(([index])=>({index,wall:clone(p.WALLS[index])}));
  for(const[index,key,value]of wallChanges)p.WALLS[index][key]=value;
  Object.assign(main,{name:'主卧900平开门 · 南移300mm',rect:[3375,3850,3495,4750],sourceAxisMm:[3435,3850,3435,4750],h:[3435,4690],
    directionStatus:'user-design-correction',swingRevision:REVISION,
    notes:'2026-10-11确认：900mm门洞向南300mm，仍南侧合页向套内开；南墙垛模型120mm。与书房门洞纵向重叠270mm，但各向自身室内开启；主卧门全开横占套内入口，需绕门通过。门套、五金及通行仍需现场深化，不把门板间距当作连续通行净宽。'});
  main.operation={type:'hinged',hingeCm:[343.5,469],swing:{dx:0,dy:-1,ox:1,oy:0,sweep:1},openLeafCm:{x:343.5,y:467,w:78,d:4}};
  Object.assign(bath,{name:'主卫750平开门 · 北移300mm、北铰内开',rect:[4390,3440,4510,4190],sourceAxisMm:[4450,3440,4450,4190],h:[4450,3500],c:[0,1],o:[1,0],
    directionStatus:'user-design-correction',swingRevision:REVISION,
    notes:'2026-10-11确认：750mm门洞向北300mm，改北側合页向卫内开，北墙垛模型100mm；盆柜与马桶改背靠南墙、面北，淋浴与主卫北墙不动。应先把门开启到位再使用盆柜；排水改位、壁挂水箱、门套及五金净空仍须现场核对。'});
  bath.operation={type:'hinged',hingeCm:[445,350],swing:{dx:0,dy:1,ox:1,oy:0,sweep:0},openLeafCm:{x:445,y:348,w:63,d:4}};
  Object.assign(vanity,{name:'主卫南墙600浴室柜 · 镜面朝北',cy:4690,rot:180,face:'north',layoutRevision:REVISION,
    sourceFootprintMm:{x:4530,y:4510,w:600,d:360},
    notes:'2026-10-11确认：600×360mm盆柜背部贴南墙，镜子随柜放南墙、面向北；主卫门改北铰内开。给排水、镜柜开合和门套待现场核对；模型几何无相交不等于使用舒适度或施工可行性认证。'});
  vanity.originalSourceFootprintMm=clone(previousFurniture[0].originalSourceFootprintMm||previousFurniture[0].sourceFootprintMm);
  Object.assign(toilet,{cy:4580,rot:180,face:'north',layoutRevision:REVISION,sourceFootprintMm:{x:5390,y:4290,w:360,d:580},
    notes:'2026-10-11确认：马桶背部贴南墙、面向北，排水能否移位及壁挂水箱待核。东侧外缘至淋浴外缘仅60mm、轴心至玻璃240mm，属于紧凑占位，不宣称使用舒适度或施工已核实。'});
  toilet.originalSourceFootprintMm=clone(previousFurniture[1].originalSourceFootprintMm||previousFurniture[1].sourceFootprintMm);
  // Remove one now-obsolete usage sentence without changing a cabinet board.
  wardrobe.conditions=wardrobe.conditions.map(s=>s.includes('主卧900mm门洞与其原位置不移动')
    ?s.replace('主卧900mm门洞与其原位置不移动','主卧900mm门洞已按本轮向南300mm；柜体位置与板件不变，入口门套和动线仍需核验'):s);
  const previousDesignCorrections=clone(p.metadata.designCorrections),previousConditions=clone(p.metadata.conditions),previousConverter=p.metadata.converter;
  p.metadata.designCorrections=(p.metadata.designCorrections||[]).map(q=>q.id==='bath-south-hinge-20261008'?{...q,status:'superseded-for-family',supersededBy:REVISION}:q);
  p.metadata.designCorrections.push({id:REVISION,date:'2026-10-11',sourceIds:['door_a','door_bath_1','vanity_main','family-f11'],
    description:'方案2主卧门南移300mm；主卫门北移300mm、北铰内开；南墙盆厕及镜面朝北，淋浴和房间边界不动。',openingWidthsUnchanged:true,sourceSnapshotsUnchanged:true,
    usageNote:'门侧墙段随新洞口补齐，未改变墙体轴线或主卫北墙；门位移是已确认设计参数而非新增实测，排水与五金仍待核。'});
  p.metadata.conditions=[...(p.metadata.conditions||[]),'方案2本轮主卧门南移300mm、主卫门北移300mm并改北铰内开；盆厕贴南墙面北。门位为确认设计参数，非新增实测；马桶侧至淋浴仅60mm，排水移位与门套、通行条件仍须现场深化。'];
  p.metadata.converter=(previousConverter||'tools/convert-house-plans.cjs')+' + tools/family-master-bath-20261011.cjs';
  const migrationFields={};for(const before of previousFurniture)migrationFields[before.id]=changedFields(before,furn(before.id));
  p.metadata.familyBathUpdate={id:REVISION,date:'2026-10-11',title:'方案2 · 主卧门南移、主卫北铰及南墙盆厕',status:'applied-owner-confirmed',
    sourceReference:'2026-10-11方案2主卧入口主卫确认稿及A4尺寸图，经用户确认应用3D并发布',sourceSnapshotsUnchanged:true,
    previousDoors,previousWalls,previousFurniture,previousDesignCorrections,previousConditions,previousConverter,
    changedFurnitureIds:['vanity_main','family-f11','family-f3'],notesOnlyFurnitureIds:['family-f3'],newFurnitureIds:[],removedFurnitureIds:[],migrationFields,
    openingWidthsUnchanged:true,roomBoundariesUnchanged:true,windowsUnchanged:true,showerUnchanged:true,
    clearancesMm:{mainSouthJamb:120,bathNorthJamb:100,studyMainDoorProjectedOverlap:270,vanityFrontToNorthWall:1170,vanityFrontToFullyOpenLeaf:990,toiletFrontToNorthWall:950,toiletEastEdgeToShower:60},
    conditions:['两门位移各300mm是确认设计值，不是新增实测；洞宽900/750、门叶780/630及高度保持。',
      '40mm门板扫掠未见墙体/家具/互相碰撞，但主卧门全开横占套内入口，必须核验绕门动线。',
      '马桶东侧到淋浴仅60mm偏紧，轴心到玻璃240mm；图面无相交不代表舒适、无障碍或施工可行性认证。',
      '主卫北墙、南墙轴线、淋浴和窗均原位；窗复尺500×1400mm仍保留旧定位示意，台高及定位待核。',
      '给排水改位、壁挂水箱、镜柜开启和门套五金需现场核对；所有承重性未鉴定，不据模型施工。',
      '已有浏览器草稿按字段升级默认值，保留自定义尺寸、摆位、颜色和删除；墙侧拆除标记仍保留，需核对新门洞。']};
  for(const k of ['ROOMS','WALL_META','WINS','WIN_META','BAYS','BIFOLDS','SLIDES','PLAN_BOUNDS','BOUNDS','CENTER','HEIGHT_MM'])assert.deepEqual(p[k],previous[k],k+': unauthorized family architecture change');
  for(const[id,before]of Object.entries(untouched))assert.deepEqual(bundle.schemes[id],before,id+': unauthorized scheme change');
  return bundle;
}
module.exports={applyFamilyMasterBath,REVISION};
