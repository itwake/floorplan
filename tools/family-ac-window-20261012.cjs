'use strict';

// Scheme 2 window-side indoor-unit placement refinement, in mm. A short
// conceptual path toward an exterior wall is not an approved pipe route,
// penetration, drainage connection or outdoor-unit installation.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const REVISION='family-ac-window-20261012';
const DATE='2026-10-12';
const clone=structuredClone;
const META_KEYS=['designCorrections','conditions','converter'];
const IDS=['family-acwall-room_a','family-acwall-room_b','family-acwall-room_c'];
const PLACEMENTS=[
  {id:IDS[0],roomId:'room_a',windowId:'window_a',cx:4990,cy:245,rot:0,wall:'north',
    title:'主卧北飘窗上方室内北墙',windowHeadMm:2070,bodyAboveWindowHeadMm:180,
    conditions:['机身在房间内部北墙窗头上方，背面y120、前沿y370；不是装在外凸飘窗内或玻璃上。','窗头2070mm至机身底2250mm为180mm模型间隔，机身顶2550mm至房顶2790mm为240mm；实际顶部进风、安装检修及飘窗梁/窗帘位置待核。']},
  {id:IDS[1],roomId:'room_b',windowId:'window_b',cx:1870,cy:245,rot:0,wall:'north',
    title:'次卧北飘窗上方室内北墙',windowHeadMm:2070,bodyAboveWindowHeadMm:180,
    conditions:['机身在房间内部北墙窗头上方，背面y120、前沿y370；不是装在外凸飘窗内或玻璃上。','窗头2070mm至机身底2250mm为180mm模型间隔，机身顶2550mm至房顶2700mm为150mm；实际顶部进风、安装检修及飘窗梁/窗帘位置待核。']},
  {id:IDS[2],roomId:'room_c',windowId:'window_c',cx:620,cy:3465,rot:0,wall:'north',
    title:'书房西北窗侧角的北墙',windowHeadMm:2300,bodyAboveWindowHeadMm:null,
    conditions:['书房挂机留在北墙、移到西北窗侧角：机身x170..1070/y3340..3590，距西内墙50mm、顶棚150mm。它不是挂在西窗玻璃或西外墙上的已安装空调。','书房西窗头2300mm，900mm挂机不能完整放入窗北侧810mm西墙段；南侧950mm墙段被高书架占用。窗上方若底2330/顶2630仅有30mm窗头间隔和70mm顶棚余量，未验证厂家安装条件，因此不采用。','窗侧西北角可作为向西外墙短接的概念位置；外机机位、可穿墙点、冷媒管路、冷凝水坡度/排水及电源全部未定位，不渲染虚构外机、孔洞或管线。']}
];

function rect(f){
  const a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),w=Math.abs(c)*f.w+Math.abs(s)*f.d,d=Math.abs(s)*f.w+Math.abs(c)*f.d;
  return [f.cx-w/2,f.cy-d/2,f.cx+w/2,f.cy+d/2,f.elevationMm||0,(f.elevationMm||0)+(f.heightMm||0)];
}
function solidPart(f,q){
  const a=(f.rot||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=q.x+q.w/2,y=q.y+q.d/2,w=Math.abs(c)*q.w+Math.abs(s)*q.d,d=Math.abs(s)*q.w+Math.abs(c)*q.d,cx=f.cx+c*x-s*y,cy=f.cy+s*x+c*y,z=(f.elevationMm||0)+q.elevationMm;
  return [cx-w/2,cy-d/2,cx+w/2,cy+d/2,z,z+q.heightMm];
}
const overlap=(a,b)=>[[0,2],[1,3],[4,5]].every(([lo,hi])=>Math.min(a[hi],b[hi])-Math.max(a[lo],b[lo])>.001);
function assertPlacement(p,items){
  for(const f of items){
    const r=rect(f),room=p.ROOMS.find(q=>q.id===f.roomId),placement=PLACEMENTS.find(q=>q.id===f.id),window=p.WIN_META.find(q=>q.id===placement.windowId);
    assert.ok(room&&window,f.id+': missing room or associated window');
    assert.equal(window.headMm,placement.windowHeadMm,f.id+': source window head changed');
    assert.deepEqual([f.w,f.d,f.heightMm,f.elevationMm],[900,250,300,2250],f.id+': appliance dimensions or elevation changed');
    assert.ok(r[4]>=0&&r[5]<=room.heightMm,f.id+': crosses ceiling');
    assert.equal(r[1],placement.roomId==='room_c'?3340:120,f.id+': back must touch room-side north wall, not glazing');
    const bounds=[Math.min(...room.poly.map(q=>q[0])),Math.min(...room.poly.map(q=>q[1])),Math.max(...room.poly.map(q=>q[0])),Math.max(...room.poly.map(q=>q[1]))];
    assert.ok(r[0]>=bounds[0]&&r[1]>=bounds[1]&&r[2]<=bounds[2]&&r[3]<=bounds[3],f.id+': outside associated room');
    for(const old of p.defaultFurniture.filter(q=>!IDS.includes(q.id))){
      const solids=old.parts?.length?old.parts.map(q=>[q.id,solidPart(old,q)]):[[old.id,rect(old)]];
      for(const[id,solid]of solids)assert.ok(!overlap(r,solid),f.id+': intersects '+old.id+'/'+id);
    }
    p.WALLS.forEach((w,i)=>assert.ok(!overlap(r,[...w.slice(0,4),0,p.WALL_META[i]?.heightMm||p.HEIGHT_MM]),f.id+': intersects wall '+i));
    p.WINS.forEach((w,i)=>{const m=p.WIN_META[i];assert.ok(!overlap(r,[...w.slice(0,4),m.sillMm,m.headMm]),f.id+': occupies opening '+m.id);});
    for(const b of p.BAYS){
      b.sideRects.forEach(w=>assert.ok(!overlap(r,[...w, b.returnBottomMm,b.returnBottomMm+b.returnHeightMm]),f.id+': intersects bay side '+b.id));
      const xs=b.poly.map(q=>q[0]),ys=b.poly.map(q=>q[1]);
      assert.ok(!overlap(r,[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys),b.headMm,b.headMm+b.slabThicknessMm]),f.id+': intersects projecting bay top '+b.id);
    }
    for(const door of [...p.DOORS,...p.SLIDES])assert.ok(!overlap(r,[...door.rect.slice(0,4),0,door.heightMm||2150]),f.id+': intersects door '+door.sourceId);
  }
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert.ok(!overlap(rect(items[i]),rect(items[j])),'Indoor units overlap');
}
function changedFields(before,after){
  return [...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>!isDeepStrictEqual(before[k],after[k])).sort();
}
function applyFamilyAcWindow(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyAppliancesUpdate,'Apply after the Scheme 2 appliance addition');
  assert.ok(!p.metadata.familyAcWindowUpdate,'Scheme 2 window-side AC layer already applied');
  const previous=clone(p),untouched=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  const get=id=>p.defaultFurniture.find(f=>f.id===id),previousFurniture=IDS.map(id=>{const f=get(id);assert.ok(f?.type==='acwall','Expected existing wall AC '+id);return clone(f);});
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  for(const q of PLACEMENTS){
    const f=get(q.id),room=p.ROOMS.find(r=>r.id===q.roomId);
    Object.assign(f,{cx:q.cx,cy:q.cy,rot:q.rot,layoutRevision:REVISION});
    const r=rect(f);f.sourceFootprintMm={x:r[0],y:r[1],w:r[2]-r[0],d:r[3]-r[1]};
    f.notes='2026-10-12方案2窗侧挂机定位：'+q.title+'；保留900×250×300mm、底2250mm暂估机身。外机、穿墙与排水未核。';
    f.conditions=[...clone(previousFurniture.find(old=>old.id===f.id).conditions),...clone(q.conditions)];
    f.applianceDesign={...f.applianceDesign,revision:REVISION,windowPlacement:{revision:REVISION,status:'concept-location-installation-pending',
      windowId:q.windowId,mountingWall:q.wall,mountingDescription:q.title,bodyRectMm:r.slice(0,4),
      windowHeadMm:q.windowHeadMm,bodyAboveWindowHeadMm:q.bodyAboveWindowHeadMm,topToRoomCeilingMm:room.heightMm-r[5],
      exteriorConnectionStatus:'outdoor-position-wall-penetration-refrigerant-condensate-electricity-pending',
      actualOutdoorUnitAdded:false,actualPipeOrHoleAdded:false}};
  }
  assertPlacement(p,IDS.map(get));
  const migrationFields=Object.fromEntries(previousFurniture.map(f=>[f.id,changedFields(f,get(f.id))]));
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:DATE,sourceIds:[...IDS],
    description:'仅方案2三台已有挂机移到窗侧：主次卧室内北墙窗头上方，书房北墙西北窗侧角；尺寸与底2250标高保持，不改窗墙柜及其他九件电器。',
    sourceSnapshotsUnchanged:true,usageNote:'窗边位置为概念摆放，不代表外机、管路或穿墙安装已核定。'}];
  p.metadata.conditions=[...(p.metadata.conditions||[]),
    '2026-10-12方案2三房挂机改到窗侧：主次卧北窗上方室内墙带，窗头2070至机身底2250为180mm；不装入外凸飘窗顶棚或玻璃，不改变窗体。',
    '书房挂机向西移550mm至北墙西北窗侧角，距西墙50mm、距房顶150mm；西窗头2300上方直接挂装只有70mm顶棚余量的候选不采用，不为挤放而改机宽、书架或窗高。',
    '三挂机仍900×250×300mm、底2250/顶2550；主卧/次卧/书房顶棚余240/150/150mm仅模型几何量，非厂家进风检修要求。窗帘、基层、墙梁、实际机型、室外机位及穿孔冷媒管/排水/电源需专业现场核对，不构成安装批准。'];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-ac-window-20261012.cjs';
  p.metadata.familyAcWindowUpdate={id:REVISION,date:DATE,title:'方案2 · 三房挂机窗侧定位',status:'applied-owner-request-concept',
    sourceSnapshotsUnchanged:true,notInstallationApproval:true,architectureUnchanged:true,existingCabinetPartsUnchanged:true,
    previousPlanFields:{},previousFurniture,previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:[...IDS],newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],migrationFields,
    dimensionsAndElevationUnchanged:true,otherNineAppliancesUnchanged:true,applianceHistoryUnchanged:true,
    placements:PLACEMENTS.map(q=>({...clone(q),sourceFootprintMm:clone(get(q.id).sourceFootprintMm),dimensionsMm:[900,250,300],bottomMm:2250,topMm:2550,
      roomCeilingMm:p.ROOMS.find(r=>r.id===q.roomId).heightMm,topToRoomCeilingMm:p.ROOMS.find(r=>r.id===q.roomId).heightMm-2550})),
    rejectedStudyWestWindowCandidate:{reason:'顶部与窗头空隙未经安装条件核验，不采用',windowHeadMm:2300,proposedBottomMm:2330,proposedTopMm:2630,
      bodyAboveWindowHeadMm:30,topToRoomCeilingMm:70,northWestWallSegmentMm:810,unitWidthMm:900,
      southWestWallSegmentMm:950,southSegmentBookwallHeightMm:2500,southSegmentBookwallDepthByYmm:282.5,
      applied:false},
    conditions:['仅三台已有挂机位置与窗侧说明更新，未新增外机、孔洞、管线或供电线路。',
      '空调靠窗侧可缩短概念接管方向，但实际外机位置、结构允许穿孔处、管长、坡度和检修均未核；不得以模型静态无相交作为安装可行结论。']};
  for(const k of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(k))assert.deepEqual(p[k],previous[k],k+': unauthorized architecture change');
  for(const f of previous.defaultFurniture)if(!IDS.includes(f.id))assert.deepEqual(get(f.id),f,'Unexpected furniture/appliance edit '+f.id);
  assert.deepEqual(p.metadata.familyAppliancesUpdate,previous.metadata.familyAppliancesUpdate,'Original appliance layer history must remain unchanged');
  for(const[id,before]of Object.entries(untouched))assert.deepEqual(bundle.schemes[id],before,id+': other scheme changed');
  assert.deepEqual(beforeFamilyAcWindow(p),previous,'Window-side AC layer must exactly restore prior Scheme 2');
  return bundle;
}
function beforeFamilyAcWindow(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyAcWindowUpdate;
  if(!m)return out;
  const originals=new Map(m.previousFurniture.map(f=>[f.id,f])),current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(originals.get(id)||current.get(id)));
  for(const[k,v]of Object.entries(m.previousPlanFields))p[k]=clone(v);
  for(const k of META_KEYS){if(m.previousMetadataFields[k]===undefined)delete p.metadata[k];else p.metadata[k]=clone(m.previousMetadataFields[k]);}
  delete p.metadata.familyAcWindowUpdate;
  return out;
}
module.exports={applyFamilyAcWindow,beforeFamilyAcWindow,REVISION};
