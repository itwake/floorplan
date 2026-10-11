'use strict';

// Independent last layer over the confirmed study/laundry scheme. Do not
// modify imported snapshots or silently shorten a desktop for an unconfirmed
// swing change. Door apertures, wall indexes, furniture and other schemes stay.
const assert=require('node:assert/strict');
const REVISION='family-door-refinement-20261011';
const clone=structuredClone;
const SLIDE_IDS=['balcony_door','door_kitchen'];
const META_KEYS=['designCorrections','conditions','converter'];

function applyFamilyDoorRefinement(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyStudyLaundryUpdate,'Apply after the confirmed family study/laundry layer');
  assert.ok(!p.metadata.familyDoorRefinement,'Family door-refinement layer already applied');
  const previous=clone(p),untouched=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const previousPlanFields={SLIDES:clone(p.SLIDES)};
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  for(const id of SLIDE_IDS){
    const s=p.SLIDES.find(d=>d.id===id);assert.ok(s,'Missing target sliding door '+id);
    assert.equal(s.panelCount,3,id+': expected existing three leaves');
    assert.equal(s.trackCount,3,id+': expected existing three tracks');
    const balcony=id==='balcony_door';
    s.panelCount=2;s.trackCount=2;s.layoutRevision=REVISION;
    s.name=balcony?'生活阳台双扇双轨玻璃推拉门 · 原门轴保持':'厨房1700双扇双轨玻璃推拉门（扩洞条件方案，待复尺）';
    s.notes=(s.notes||'').replace(/三扇三轨/g,'双扇双轨').replace(/三扇/g,'双扇').replace(/三轨/g,'双轨')+
      ' 本轮仅改双扇双轨；原洞口、宽高、原堆叠方向及玻璃不变。两扇叠放的可用通行宽度约为洞宽一半，扣门框/搭接后更小，门套、轨道与五金仍须实物深化。';
  }
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-10-11',sourceIds:[...SLIDE_IDS],
    description:'方案2厨房及生活阳台玻璃推拉门由三扇三轨改双扇双轨，保持原洞口和堆叠方向。',sourceSnapshotsUnchanged:true,
    openingWidthsUnchanged:true,wallIndexesUnchanged:true,furnitureUnchanged:true,
    usageNote:'没有默认采纳尚待确认的书房反向开门及桌棚收短；此层只变两个推拉门。'}];
  p.metadata.conditions=[...(p.metadata.conditions||[]),
    '方案2厨房1700、生活阳台1500mm原门洞保持，仅改双扇双轨玻璃推拉门；厨房向北、阳台向南堆叠不变。开门后的可用通行宽度约为洞宽一半，实际门框/搭接/五金再扣，须核对搬运、操作和防水高差。'];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-door-refinement-20261011.cjs';
  p.metadata.familyDoorRefinement={id:REVISION,date:'2026-10-11',title:'方案2 · 双扇双轨厨房与生活阳台门',status:'applied-owner-confirmed',
    sourceReference:'2026-10-11业主要求方案2厨房及生活阳台推拉门改为两扇；书房反向与桌棚收短另待确认',sourceSnapshotsUnchanged:true,
    previousPlanFields,previousMetadataFields,changedSlidingDoorIds:[...SLIDE_IDS],openingWidthsUnchanged:true,glassUnchanged:true,stackingDirectionsUnchanged:true,
    furnitureUnchanged:true,wallIndicesUnchanged:true,changedFurnitureIds:[],newFurnitureIds:[],removedFurnitureIds:[],migrationFields:{},
    approximationsMm:{kitchenHalfOpeningBeforeFrame:850,balconyHalfOpeningBeforeFrame:750},
    conditions:['洞宽1700/1500mm不是新复尺；保留旧扩洞条件与未闭合定位，不据此直接施工。',
      '双扇双轨不是单轨移门：模型保留两片玻璃的独立轨道；堆叠后开口名义约850/750mm，门框与搭接会继续减小。',
      '原书房900mm北铰门与1680书桌、浅书架未变；南移反向会涉及桌棚收短，应在业主确认后另行应用。']};
  for(const k of Object.keys(previous))if(!['SLIDES','metadata'].includes(k))assert.deepEqual(p[k],previous[k],k+': unexpected family geometry change');
  for(const s of previous.SLIDES){
    const after=p.SLIDES.find(q=>q.id===s.id);
    if(!SLIDE_IDS.includes(s.id)){assert.deepEqual(after,s);continue;}
    const accepted={...after,name:s.name,notes:s.notes,panelCount:s.panelCount,trackCount:s.trackCount};
    if(s.layoutRevision===undefined)delete accepted.layoutRevision;else accepted.layoutRevision=s.layoutRevision;
    assert.deepEqual(accepted,s,s.id+': only leaf count/track count and explanations may change');
  }
  for(const[id,before]of Object.entries(untouched))assert.deepEqual(bundle.schemes[id],before,id+': unexpected other scheme change');
  assert.deepEqual(beforeFamilyDoorRefinement(p),previous,'Door-refinement layer must restore the original scheme exactly');
  return bundle;
}

function beforeFamilyDoorRefinement(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyDoorRefinement;
  if(!m)return out;
  for(const[k,v]of Object.entries(m.previousPlanFields))p[k]=clone(v);
  for(const k of META_KEYS){
    if(m.previousMetadataFields[k]===undefined)delete p.metadata[k];else p.metadata[k]=clone(m.previousMetadataFields[k]);
  }
  delete p.metadata.familyDoorRefinement;
  return out;
}

module.exports={applyFamilyDoorRefinement,beforeFamilyDoorRefinement,REVISION};
