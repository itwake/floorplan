'use strict';

// Scheme 2: sanitary equipment placed on the architectural drawing's new
// interior faces. Appliance envelopes remain owner-provided, not CAD symbols.
const assert=require('node:assert/strict');
const REVISION='family-drawing-20261027';
const clean=n=>Math.round(n*1000)/1000;
function footprint(f){const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));return{x:clean(f.cx-w/2),y:clean(f.cy-d/2),w:clean(w),d:clean(d)};}
function applyFamilyDrawingBathrooms(p){
  const ids=['vanity_main','family-f11','family-f12','vanity_guest','family-f14','family-f15','laundry_washer','family-drain-bath1-dry','family-drain-bath1-shower','family-drain-bath2-dry','family-drain-bath2-shower','family-bathheater-bath_1','family-bathheater-bath_2'];
  const previousFurniture=ids.map(id=>structuredClone(p.defaultFurniture.find(f=>f.id===id)));
  assert.ok(previousFurniture.every(Boolean));
  const f=id=>p.defaultFurniture.find(q=>q.id===id);
  function place(id,props,note){const q=f(id);Object.assign(q,props,{layoutRevision:REVISION});q.sourceFootprintMm=footprint(q);q.notes=note;return q;}
  place('vanity_main',{cx:5530,cy:4539.851,rot:180,face:'north',roomId:'bath_1'},'按图纸主卫南墙盆位示意，保留原600×360盆柜。墙面、镜子及排水接入待现场核验。');
  place('family-f11',{cx:6510,cy:3590,rot:90,face:'west',roomId:'bath_1'},'参照图纸主卫东墙马桶位置，朝西；保留既有模型尺寸。坑距、排污和水箱安装待核。');
  place('family-f12',{cx:6350,cy:4390,w:900,d:900,rot:0,roomId:'bath_1'},'主卫淋浴暂用约900×900外接框占位；图纸实际西北角为斜边，玻璃及开启方式待深化。');
  const v=place('vanity_guest',{cx:4350,cy:4890,w:1400,d:600,rot:0,face:'south',roomId:'bath_2',baseWidthMm:1400,baseDepthMm:600,baseHeightMm:920},'按图纸1400×600台位重建：西侧洗手盆、东侧600×530×840洗衣机；台面独立承重，净空和管线待实物核验。');
  v.name='客卫1400一体台 · 西盆东洗衣机';v.counterHeightMm=920;v.counterThicknessMm=30;v.assemblyHeightMm=1850;v.cabinetRevision=REVISION;
  const part=(id,x,y,w,d,z,h,role,color='#F4F1E9',material='Cream')=>({id:'vanity_guest-drawing-'+id,x,y,w,d,elevationMm:z,heightMm:h,role,label:id,color,material,face:'south'});
  v.parts=[
    part('西侧承重板',-700,-300,18,600,0,890,'cabinet-side'),part('中间独立承重板',0,-300,18,600,0,890,'cabinet-divider'),part('东侧承重板',682,-300,18,600,0,890,'cabinet-side'),
    part('盆柜底板',-682,-282,682,564,60,18,'cabinet-bottom'),part('盆柜背板',-682,-300,682,18,78,812,'cabinet-back'),part('盆柜门',-680,282,678,18,80,665,'door-hinged'),
    part('台面西边',-700,-300,90,600,890,30,'countertop'),part('台面中段',-150,-300,850,600,890,30,'countertop'),part('盆后沿',-610,-300,460,60,890,30,'countertop'),part('盆前沿',-610,110,460,190,890,30,'countertop'),
    part('盆西壁',-610,-240,12,350,760,160,'basin-wall','#F5F7F5','Basin'),part('盆东壁',-162,-240,12,350,760,160,'basin-wall','#F5F7F5','Basin'),part('盆北壁',-598,-240,436,12,760,160,'basin-wall','#F5F7F5','Basin'),part('盆南壁',-598,98,436,12,760,160,'basin-wall','#F5F7F5','Basin'),part('盆底',-598,-228,436,326,748,12,'basin-bottom','#F5F7F5','Basin'),
    part('龙头立管',-390,-285,22,22,920,150,'faucet-stem','#9D9386','WarmGrayMetal'),part('龙头出水臂',-388,-274,18,100,1052,18,'faucet-arm','#9D9386','WarmGrayMetal'),
    part('镜背板',-630,-300,500,12,1170,680,'mirror-backing','#CDB594','OakLight'),part('镜面',-624,-288,488,2,1176,668,'mirror-face','#BCCFD0','Mirror')
  ];
  v.cabinetDesign={revision:REVISION,title:'客卫1400独立台 · 西盆东机',status:'concept-pending-detail',boardThicknessMm:18,counterThicknessMm:30,dimensions:['图纸台位1400×600mm；台面高度暂沿用920mm，实物盆、管线和洗衣机门仍待核。'],features:['西盆东机，台面由侧板与隔板独立承重。','机位无底板、背板及柜门，避免遮挡设备。'],faces:[{face:'south',label:'客卫台面及机位',lengthMm:1400,depthMm:600}]};
  v.conditions=['洗衣机净位约664mm宽，机器600mm；管线、门开启、排水与防水仍须现场核验。','台高920mm沿用原方案，非图纸确认值。'];
  place('laundry_washer',{cx:4750,cy:4890,rot:0,face:'south',roomId:'bath_2'},'业主提供机身600×530×840mm，置于客卫台面东侧；门板、后管、取衣净空待实物核验。');
  place('family-f14',{cx:5425,cy:5129.851,rot:0,face:'south',roomId:'bath_2'},'马桶参照新图位置，保留原360×580机身；排污及水箱位置待核。');
  place('family-f15',{cx:6305,cy:5540,w:990,d:1000,rot:0,roomId:'bath_2'},'客卫淋浴区按图中玻璃线与东墙之间约990×1000外接框示意；玻璃门开启待深化。');
  for(const [id,x,y] of [['family-drain-bath1-dry',5500,3960],['family-drain-bath1-shower',6520,4530],['family-drain-bath2-dry',4800,5550],['family-drain-bath2-shower',6520,5800]])place(id,{cx:x,cy:y},'按新卫生间区域重新摆放地漏示意，具体落点、找坡和管线未核验。');
  place('family-bathheater-bath_1',{cx:6350,cy:4389.851},'浴霸随主卫淋浴区移动；机型、吊顶和接线待核。');
  place('family-bathheater-bath_2',{cx:6350,cy:5570},'浴霸随客卫淋浴区移动；机型、吊顶和接线待核。');
  for(const q of v.parts)assert.ok(q.x>=-700&&q.x+q.w<=700&&q.y>=-300&&q.y+q.d<=300,'vanity part in bounding box');
  return {previousFurniture,changedFurnitureIds:ids,newFurnitureIds:[],removedFurnitureIds:[]};
}
module.exports={applyFamilyDrawingBathrooms,REVISION};
