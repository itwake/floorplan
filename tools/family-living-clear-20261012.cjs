'use strict';

// Remove only the two owner-selected living-room items from Scheme 2.
// Keep exact prior objects for historical rollback and browser draft archives.
const assert=require('node:assert/strict');
const {beforeFamilyBalconyService}=require('./family-balcony-service-20261012.cjs');
const REVISION='family-living-clear-20261012';
const IDS=['family-f8','living-floorlamp'];
const META_KEYS=['designCorrections','conditions','converter'];
const clone=structuredClone;

function applyFamilyLivingClear(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyAcWindowUpdate,'Apply after the confirmed window-side AC layout');
  assert.ok(!p.metadata.familyLivingClearUpdate,'Living-room clearance layer already applied');
  const previous=clone(p);
  const others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  assert.equal(p.defaultFurniture.length,59);
  const previousFurniture=IDS.map(id=>clone(p.defaultFurniture.find(f=>f.id===id)));
  assert.equal(previousFurniture[0]?.type,'coffeetable','Expected the living-room tea table, not the dining table');
  assert.equal(previousFurniture[1]?.type,'floorlamp','Expected the living-room floor lamp');
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(key=>[key,clone(p.metadata[key])]));
  p.defaultFurniture=p.defaultFurniture.filter(f=>!IDS.includes(f.id));
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-12',sourceIds:[...IDS],
    description:'仅方案2移除电视前茶几及客厅落地灯，沙发、地毯、电视柜、餐桌与其他摆设原位保留。',sourceSnapshotsUnchanged:true}];
  p.metadata.conditions=[...(p.metadata.conditions||[]),'2026-10-12方案2移除电视前1200×620茶几及客厅落地灯；其他57件家具电器、墙门窗及其他方案保持。旧浏览器草稿中的这两件物品移除时保留JSON归档。'];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-living-clear-20261012.cjs';
  p.metadata.familyLivingClearUpdate={id:REVISION,date:'2026-10-12',title:'方案2 · 客厅移除茶几与落地灯',status:'applied-owner-request',
    sourceSnapshotsUnchanged:true,architectureUnchanged:true,otherFurnitureUnchanged:true,
    previousPlanFields:{},previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:[],newFurnitureIds:[],removedFurnitureIds:[...IDS],replacedFurnitureIds:[],migrationFields:{},
    archiveRemovedDraftObjects:true};
  assert.equal(p.defaultFurniture.length,57);
  assert.deepEqual(p.defaultFurniture,previous.defaultFurniture.filter(f=>!IDS.includes(f.id)),'Only requested removals are authorized');
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized edit');
  assert.deepEqual(beforeFamilyLivingClear(p),previous,'Removal layer must restore the exact prior Scheme 2');
  return bundle;
}

function beforeFamilyLivingClear(value){
  const out=beforeFamilyBalconyService(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyLivingClearUpdate;
  if(!m)return out;
  const original=new Map(m.previousFurniture.map(f=>[f.id,f])),current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(original.get(id)||current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyLivingClearUpdate;
  return out;
}
module.exports={applyFamilyLivingClear,beforeFamilyLivingClear,REVISION};
