'use strict';
const assert=require('node:assert/strict'),{isDeepStrictEqual:same}=require('node:util');
const source=require('../data/source/guest-shower-drawing-20261105.json');
const KEY='familyGuestShowerDrawingUpdate',REVISION='family-guest-shower-rect-20261105',ID='family-f15',clone=structuredClone;
const NOTE='客卫淋浴严格按PL-02直线玻璃和PL-06的990×1000mm标注恢复长方形，不设斜切角；北侧200mm图示带另保留平面线。花洒符号位于南墙。原图未明确玻璃门扇与开启方式，不添加内开或推拉假定；玻璃高度沿旧示意，北侧图示带不凭空拉伸成柜体。';
const planOf=v=>v.schemes?.family||v;
function beforeFamilyGuestShower(value){const out=clone(value),p=planOf(out),m=p?.metadata?.[KEY];if(!m)return out;p.defaultFurniture=p.defaultFurniture.map(f=>f.id===ID?clone(m.previousFurniture[0]):f);for(const[k,v]of Object.entries(m.previousMetadataFields)){if(v.present)p.metadata[k]=clone(v.value);else delete p.metadata[k];}delete p.metadata[KEY];return out;}
function applyFamilyGuestShower(value){const p=planOf(value);assert.equal(p.id,'family');if(p.metadata[KEY])return value;assert.ok(p.metadata.familyBathFitUpdate);const previous=clone(p),f=p.defaultFurniture.find(f=>f.id===ID);assert.ok(f);
  assert.deepEqual([f.cx-f.w/2,f.cy-f.d/2,f.cx+f.w/2,f.cy+f.d/2],source.showerRectMm,'Keep the dimensioned CAD rectangle');
  Object.assign(f,{name:'客卫长方形淋浴990×1000 · 按原设计图',layoutRevision:REVISION,notes:NOTE,showerDesign:{revision:REVISION,shape:'rectangle',glassFace:'west',glassCenterInsetMm:30,glassHeightMm:1950,controlsWall:'south',controlsCenterOffsetMm:source.showerControlSymbolCenterX-f.cx,doorOperation:source.doorOperation,installationVerified:false,drawingSource:{sha256:source.sourceSha256,sheets:source.sheets,glassLineHandles:source.glassLines.map(q=>q.handle),dimensionHandles:source.dimensions.map(q=>q.handle)}}});
  const previousMetadataFields=Object.fromEntries(['conditions','converter'].map(k=>[k,{present:Object.hasOwn(previous.metadata,k),...(Object.hasOwn(previous.metadata,k)?{value:clone(previous.metadata[k])}:{})}]));
  // Supersede the incorrect current-use note while retaining revision snapshots.
  p.metadata.conditions=p.metadata.conditions.map(t=>t.replace('斜角玻璃门均向淋浴内部开。','客卫改按原图长方形直线玻璃，开启方式待明确。'));p.metadata.conditions.push(NOTE);p.metadata.converter+=' + tools/family-guest-shower-rect-20261105.cjs';
  const old=previous.defaultFurniture.find(f=>f.id===ID);
  p.metadata[KEY]={id:REVISION,date:'2026-11-05',title:'方案2 · 客卫淋浴按设计图恢复长方形',previousFurniture:[clone(old)],previousMetadataFields,changedFurnitureIds:[ID],newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],migrationFields:{[ID]:Object.keys(f).filter(k=>k!=='id'&&!same(old[k],f[k]))},source:clone(source),notes:[NOTE],sourceSnapshotsUnchanged:true};
  assert.deepEqual(beforeFamilyGuestShower(p),previous,'Guest correction exact rollback');return value;
}
module.exports={applyFamilyGuestShower,beforeFamilyGuestShower,KEY,REVISION,ID,NOTE};
