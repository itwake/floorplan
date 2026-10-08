'use strict';
// Subsequent user-approved design. The original survey/source snapshots and
// scheme 2/3 stay untouched; scheme 1 reuses scheme 2's storage/dining details.
const REVISION='wood-public-area-20261009';
const {applyCabinetDesigns}=require('./cabinet-designs.cjs');
const placement=['cx','cy','w','d','rot','heightMm','elevationMm'];
const worldRect=f=>{const a=f.rot*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),w=f.w*c+f.d*s,d=f.w*s+f.d*c;return {x:f.cx-w/2,y:f.cy-d/2,w,d};};
function applyWoodPublicArea(bundle){
  const p=bundle.schemes.wood,reference=bundle.schemes.family;
  if(!p||!reference||p.metadata.layoutUpdate)throw Error('Wood public-area revision needs unchanged source plans');
  const previousFurniture=[],newFurnitureIds=[],get=id=>p.defaultFurniture.find(f=>f.id===id);
  const record=f=>{if(!f)throw Error('Missing wood furniture');previousFurniture.push(structuredClone(f));};
  const fromReference=id=>{const f=reference.defaultFurniture.find(f=>f.id===id);if(!f)throw Error('Missing family reference '+id);return structuredClone(f);};
  const shift=(id,x,y)=>{
    const f=get(id);record(f);f.originalSourceFootprintMm=structuredClone(f.sourceFootprintMm);
    f.cx=x;if(y!==undefined)f.cy=y;f.sourceFootprintMm=worldRect(f);f.layoutRevision=REVISION;
  };
  // Centre on scheme 1's actual rendered TV-wall segment, not scheme 2's
  // longer wall. Its final finished-face boundaries still need surveying.
  const wallIndex=p.WALL_META.findIndex(w=>w.sourceId==='w_bath_south');
  const wall=p.WALLS[wallIndex],TV_WALL=[wall[0],wall[2]],centerX=(TV_WALL[0]+TV_WALL[1])/2;
  const living=p.ROOMS.find(r=>r.id==='living');
  if(!living.poly.some(([x,y])=>x===4100&&y===6320)||!living.poly.some(([x,y])=>x===6750&&y===6320))throw Error('Wood TV-wall inside bounds need review');
  shift('wood-f6',centerX);shift('wood-f5',centerX);shift('wood-living-rug',centerX);shift('wood-f7',centerX);
  const sofa=get('wood-f5'),tv=get('wood-f6'),rug=get('wood-living-rug');
  // Centre the rug on the free floor BETWEEN the TV cabinet and sofa, without
  // changing the original rug dimensions. The coffee table shares its centre.
  const rugY=((tv.cy+tv.d/2)+(sofa.cy-sofa.d/2))/2;
  rug.cy=rugY;rug.sourceFootprintMm=worldRect(rug);get('wood-f7').cy=rugY;get('wood-f7').sourceFootprintMm=worldRect(get('wood-f7'));
  const diningPairs=[['wood-f8','family-f23'],['wood-f9','family-f24'],['wood-f10','family-f25'],['wood-f11','family-f26'],['wood-f12','family-f27']];
  for(const [id,ref]of diningPairs){
    const f=get(id),q=fromReference(ref);record(f);f.originalSourceFootprintMm=structuredClone(f.sourceFootprintMm);
    // Preserve the already-purchased bodies, names and local original IDs.
    for(const k of placement)f[k]=q[k];f.face=q.face;f.sourceFootprintMm=worldRect(f);f.layoutRevision=REVISION;
  }
  const oldSideboard=get('fit-dining_sideboard_wall');record(oldSideboard);
  const sideboard=fromReference(oldSideboard.id);sideboard.layoutRevision=REVISION;sideboard.designReferenceSchemeId='family';
  sideboard.name='方案一 · 西墙通顶餐边柜 / 南接800库';
  sideboard.notes='2026-10-09用户修订：参考方案2改西墙直柜，取消南侧7字返柜以布置北开口800库；沿用2026-10-08通顶参考分区和灯带。';
  p.defaultFurniture[p.defaultFurniture.indexOf(oldSideboard)]=sideboard;
  const back=fromReference('fit-sofa_back_storage');back.cx=centerX;back.cy=sofa.cy+sofa.d/2+20+back.d/2;back.w=1900;back.layoutRevision=REVISION;
  back.name='方案一 · 沙发背后浅储物低柜';back.designReferenceSchemeId='family';
  // Reuse the same three-slider design at the shorter width, regenerating
  // real 18-mm boards instead of shrinking their thickness by scaling.
  applyCabinetDesigns({ROOMS:[],WALLS:[],BIFOLDS:[],defaultFurniture:[back],metadata:{}},{storageFitouts:[{id:'sofa_back_storage',parts:[{id:'family_sofa_back_base',role:'sideboard_base',face:'south',x:(back.cx-back.w/2)/10,y:(back.cy-back.d/2)/10,w:back.w/10,d:back.d/10,hCm:back.heightMm/10,zCm:0,doorPanels:3}]}]});
  back.notes=back.notes.replaceAll('2000×250×650','1900×250×650');
  back.conditions=back.conditions.map(s=>s.replaceAll('2000×250×650','1900×250×650'));
  back.cabinetDesign.dimensions=back.cabinetDesign.dimensions.map(s=>s.replaceAll('2000×250×650','1900×250×650'));
  const garage=fromReference('fit-family_garage');garage.id='fit-wood_garage';garage.sourceId='wood_garage';garage.name='方案一 · 800库围合与层架';garage.layoutRevision=REVISION;garage.designReferenceSchemeId='family';
  for(const f of [back,garage,fromReference('garage-folded_stroller'),fromReference('garage-child_bike')]){
    if(get(f.id))throw Error('Wood addition duplicates '+f.id);f.layoutRevision=REVISION;p.defaultFurniture.push(f);newFurnitureIds.push(f.id);
  }
  const previousBifolds=structuredClone(p.BIFOLDS);p.BIFOLDS=structuredClone(reference.BIFOLDS);
  p.BIFOLDS.forEach(d=>{d.designReferenceSchemeId='family';d.layoutRevision=REVISION;});
  const previousSideboardMetadata=structuredClone(p.metadata.sideboardReference);
  p.metadata.sideboardReference.geometryPolicy='方案1按2026-10-09修订改4260mm直柜及800库；通顶参考造型不变。';
  p.metadata.layoutUpdate={id:REVISION,date:'2026-10-09',referenceScheme:'family',
    title:'方案一 · 800库、贴柜餐桌与东移居中客厅',previousFurniture,newFurnitureIds,previousBifolds,previousSideboardMetadata,
    migrationFields:placement,sourceSnapshotsUnchanged:true,
    alignment:{modelWallX:TV_WALL,centerX,tvId:tv.id,sofaId:sofa.id,rugId:rug.id,coffeeId:'wood-f7',rugCenterY:rugY},
    conditions:['800库沿用方案2暂估1500×1000mm、北向四扇内折门、两车分层；原车型及折门取车空间限制继续保留，不能据此证明取车可行。',
      '餐桌保持已购1400×780mm，贴西柜竖放，一北一南及东侧两椅；使用时退椅会临时占用通道。',
      '电视/沙发/茶几/地毯沿方案1实际模型电视墙4160–6810mm取中心5485mm；旧墙线与净轮廓端点存在差异，最终完成面和电视挂点待现场核对。',
      '背柜沿用方案2滑门分区，宽微调至1900mm、深250mm、高650mm，距沙发20mm；柜东端至阳台门框当前仅27.5mm，此为模型边界间隙而不是通路，不可据此下单。',
      '旧浏览器草稿按字段只升级未改过的默认值；已自定义摆位/尺寸保留，并提示重新核对动线，不复活已删除旧家具。']};
}
module.exports={applyWoodPublicArea,REVISION,worldRect};
