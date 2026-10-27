'use strict';
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const {applyFamilyDrawingShell}=require('./family-drawing-shell-20261027.cjs');
const {applyFamilyDrawingBedrooms}=require('./family-drawing-bedrooms-20261027.cjs');
const {applyFamilyDrawingBathrooms}=require('./family-drawing-bathrooms-20261027.cjs');
const {applyFamilyDrawingPublic}=require('./family-drawing-public-20261027.cjs');
const REVISION='family-drawing-20261027',KEY='familyDrawingUpdate',clone=structuredClone;
const CHILD_KEYS=['familyDrawingShellUpdate','familyDrawingBedroomsUpdate','familyDrawingElectricalUpdate'];
function beforeFamilyDrawing(value){
  const result=clone(value),p=result.schemes?.family||result,m=p?.metadata?.[KEY];if(!m)return result;
  for(const [key,entry] of Object.entries(m.previousFields)){if(entry.present)p[key]=clone(entry.value);else delete p[key];}
  const old=new Map(m.previousFurniture.map(f=>[f.id,f])),now=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||now.get(id)));
  for(const key of CHILD_KEYS)delete p.metadata[key];delete p.metadata[KEY];
  return result;
}
function applyFamilyDrawing(bundle){
  const p=bundle.schemes.family;assert.ok(p&&!p.metadata[KEY]);const original=clone(p),other=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  applyFamilyDrawingShell(p);applyFamilyDrawingBedrooms(p,{services:'none'});applyFamilyDrawingBathrooms(p);
  const publicResult=applyFamilyDrawingPublic(p);
  // Electrical and kitchen adaptations are applied by independent helpers
  // after the architectural datum and furniture hosts are established.
  const kitchenResult=require('./family-drawing-kitchen-20261027.cjs').applyFamilyDrawingKitchen(p);
  const electricalResult=require('./family-drawing-electrical-20261027.cjs').applyFamilyDrawingElectrical(p);
  const balcony=p.ROOMS.find(r=>r.id==='balcony');
  if(balcony)balcony.notes='按新图约1050×1600mm阳台轮廓，东北/东南柱及围护以图纸示意；烘干机单独位于窗下，扫地机移入户鞋柜下。600mm外挑为非踩踏概念，实际结构、排水及安装条件待核。';
  const oldBy=new Map(original.defaultFurniture.map(f=>[f.id,f])),newBy=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  const changed=p.defaultFurniture.filter(f=>oldBy.has(f.id)&&!isDeepStrictEqual(f,oldBy.get(f.id))).map(f=>f.id);
  const added=p.defaultFurniture.filter(f=>!oldBy.has(f.id)).map(f=>f.id),removed=original.defaultFurniture.filter(f=>!newBy.has(f.id)).map(f=>f.id);
  const previousFields=clone(p.metadata.familyDrawingShellUpdate.previousFields);
  const migrationFields=Object.fromEntries(changed.map(id=>{const a=oldBy.get(id),b=newBy.get(id);return[id,[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&!isDeepStrictEqual(a[k],b[k])).sort()];}));
  p.metadata[KEY]={id:REVISION,date:'2026-10-27',title:'方案2 · 按最新施工图与已购设备调整',
    source:'业主提供的平面、砌墙与立面图；尺寸为图纸模型数据，现场复核',
    previousFields,previousFurniture:changed.concat(removed).map(id=>clone(oldBy.get(id))),previousFurnitureOrder:original.defaultFurniture.map(f=>f.id),
    changedFurnitureIds:changed,newFurnitureIds:added,removedFurnitureIds:removed,migrationFields,replacedFurnitureIds:[],
    preserveCustomPartsIds:[...new Set([...publicResult.preserveCustomPartsIds,'family-f3','family-f1','study_full_desk','fit-study_bookwall','vanity_guest','fit-kitchen-20261005'])],
    preserveCustomSizeIds:[...new Set([...publicResult.preserveCustomSizeIds,'family-f3','family-f1','study_full_desk','fit-study_bookwall','vanity_guest','fit-kitchen-20261005'])],
    previousWalls:clone(original.WALLS),demolishedWallIndexMap:clone(p.metadata.familyDrawingShellUpdate.oldToNewWallIndexMap),
    notes:[...publicResult.notes,...(kitchenResult.notes||[]),...(electricalResult.notes||[])],
    pending:[...(p.metadata.familyDrawingBedroomsUpdate.pending||[]),...(kitchenResult.pending||[]),...(electricalResult.pending||[])],
    clearancesMm:clone(p.metadata.familyDrawingBedroomsUpdate.clearancesMm),
    sourceStatus:'drawing-reconstruction-not-site-survey-or-approval'};
  for(const id of Object.keys(other))assert.deepEqual(bundle.schemes[id],other[id],'Other scheme changed '+id);
  assert.deepEqual(beforeFamilyDrawing(p),original,'Drawing revision must undo exactly');return bundle;
}
module.exports={applyFamilyDrawing,beforeFamilyDrawing,REVISION,KEY};
