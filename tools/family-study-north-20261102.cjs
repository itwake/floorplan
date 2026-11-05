'use strict';

// Independent reversible furniture-only leaf. Keep construction-drawing walls,
// windows and the south-hinged study door intact; no artificial room enlargement.
const assert=require('node:assert/strict'),{isDeepStrictEqual:same}=require('node:util');
const clone=structuredClone,REVISION='family-study-north-20261102',KEY='familyStudyNorthUpdate';
const BED_ID='study_south_bed',ORGANIZER_ID='study_north_organizer';
const REMOVED=['study_window_return','study_north_sofa','fit-study_bookwall'];
const META_KEYS=['conditions','designCorrections','converter'];
const CONDITIONS=[
  '方案2书房按图纸内墙净面2300×2730mm试排，北墙通长桌2300×550×740，南墙床头朝南；原北墙沙发、西窗返桌、南墙桌上层板移除，墙体、880门洞及南铰内开方向不动。',
  '采用1200×2000mm床垫，床架按1300×2100mm、床头高950mm暂估。床架西侧贴墙，东侧余1000mm，可从东侧上下床；桌边到床尾仅80mm，不能作为床尾通道。办公椅位于东侧桌段。',
  '1500×2000mm床垫按1600×2100mm床架试排，东缘进入现有810mm门叶全开范围110mm；即使按裸1500宽也仅差10mm。因此本版使用用户允许的1200宽，不缩短床架强行放1500床。',
  '北墙桌上为白色洞洞板、开放木层板、板底灯带与小挂件，不做封闭吊柜；洞洞板孔距30、孔径6、板厚12mm为外观暂估，基层、承重及加工尺寸待深化。',
  '桌面电源P09/P10和网口N03移至北墙、中心高1000；床头双控S06移南墙高1100、床头电源P11高700，均位于床架东侧，避免被床头板遮住。保留门侧双控S05及西窗空调/电源P12；点位为布局联动示意，线缆及现场安装未确定。',
  '床架、桌深、椅子回退、门套及踢脚尚未实物复核；2300×2730是现有图纸模型内墙尺寸，不是新的复尺结果。此版日常办公从东侧座位使用，床西侧贴墙。'
];
const planOf=v=>v.schemes?.family||v,round=n=>Math.round(n*1000)/1000;
function footprint(f){const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));return{x:round(f.cx-w/2),y:round(f.cy-d/2),w:round(w),d:round(d)};}
function rect(f){const r=footprint(f);return[r.x,r.y,r.x+r.w,r.y+r.d];}
function overlap(a,b){return Math.min(a[2],b[2])-Math.max(a[0],b[0])>1e-5&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>1e-5;}
function leafPolygon(door,angle){const c=door.c,o=door.o,t=angle*Math.PI/180,u=[c[0]*Math.cos(t)+o[0]*Math.sin(t),c[1]*Math.cos(t)+o[1]*Math.sin(t)],n=[-u[1],u[0]],h=door.h,T=20;return [[0,-T],[door.len,-T],[door.len,T],[0,T]].map(([s,z])=>[h[0]+s*u[0]+z*n[0],h[1]+s*u[1]+z*n[1]]);}
function polygonsOverlap(a,b){for(const p of[a,b])for(let i=0;i<p.length;i++){const e=p[(i+1)%p.length],q=p[i],n=[e[1]-q[1],q[0]-e[0]],project=s=>s.map(v=>v[0]*n[0]+v[1]*n[1]),x=project(a),y=project(b);if(Math.min(Math.max(...x),Math.max(...y))-Math.max(Math.min(...x),Math.min(...y))<=1e-5)return false;}return true;}
function doorHits(door,b){const r=Array.isArray(b)?b:rect(b),p=[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]];return Array.from({length:181},(_,i)=>i/2).filter(a=>polygonsOverlap(leafPolygon(door,a),p));}
function part(f,id,x,y,w,d,z,h,role,label,material='Cream',extra={}){return{id,x:x-f.cx,y:y-f.cy,w,d,elevationMm:z,heightMm:h,role,label,material,color:material==='OakLight'?'#C6AA83':'#F3EFE6',face:'south',...extra};}
function makeDesk(old){
  const f={...clone(old),type:'fixture',nativeType:'desk',name:'北墙通长书桌2300×550 · 东侧办公',cx:1270,cy:3595,w:2300,d:550,heightMm:740,elevationMm:0,rot:0,face:'south',
    baseWidthMm:2300,baseDepthMm:550,baseHeightMm:740,layoutRevision:REVISION,cabinetRevision:REVISION,modelVariant:'study-north-wall-worktop',
    referenceStyle:{revision:REVISION,variant:'full-wall-worktop',appearanceReferenceOnly:true},dimensionStatus:'owner-layout-with-provisional-furniture-dimensions',parts:[]};
  const P=(...a)=>f.parts.push(part(f,...a));
  P('study-north-top',120,3320,2300,550,710,30,'desktop','满墙30mm浅色桌板');
  for(const [name,x]of[['west',120],['east',2390]])P('study-north-support-'+name,x,3340,30,510,0,710,'desk-side-support','桌端支承示意');
  P('study-north-back-rail',150,3320,2240,30,560,150,'desk-support-rail','后沿加强，不遮挡东侧坐人空间');
  P('study-north-mid-support',1240,3340,30,490,0,710,'desk-side-support','中部支承位于床宽区域，东侧座位留空');
  f.cabinetDesign={revision:REVISION,title:'北墙满墙书桌',palette:{door:'#F3EFE6',wood:'#C6AA83'},faces:[{face:'south',lengthMm:2300}],features:['2300×550通长桌板，完成高740mm。','东侧办公位，桌下不做满柜；左侧桌段位于床尾，80mm间隙不作通道。']};
  f.notes=CONDITIONS[0]+' '+CONDITIONS[1];f.conditions=[CONDITIONS[1],CONDITIONS[5]];f.sourceFootprintMm=footprint(f);return f;
}
function makeBed(){const f={id:BED_ID,sourceId:BED_ID,type:'bed',roomId:'room_c',name:'书房南墙床 · 床垫1200×2000',cx:770,cy:5000,w:1300,d:2100,heightMm:950,elevationMm:0,rot:180,face:'north',headDirection:'south',mattressMm:[1200,2000],color:'#E7E1D6',layoutRevision:REVISION,dimensionStatus:'provisional-frame-not-purchased-product',referenceStyle:{revision:REVISION,variant:'master-channel-bed',mattressMm:[1200,2000],appearanceReferenceOnly:true,notPurchasedModel:true},notes:CONDITIONS[1]+' '+CONDITIONS[2],conditions:[CONDITIONS[1],CONDITIONS[5]]};f.sourceFootprintMm=footprint(f);return f;}
function makeOrganizer(){
  const f={id:ORGANIZER_ID,sourceId:ORGANIZER_ID,type:'fixture',roomId:'room_c',name:'北墙置物架与白色洞洞板 · 无吊柜',cx:1270,cy:3450,w:2260,d:240,heightMm:2070,elevationMm:0,rot:0,face:'south',baseWidthMm:2260,baseDepthMm:240,baseHeightMm:2070,color:'#F3EFE6',cabinetRevision:REVISION,layoutRevision:REVISION,modelVariant:'study-pegboard-open-shelves',referenceStyle:{revision:REVISION,variant:'pegboard-open-shelves',appearanceReferenceOnly:true},dimensionStatus:'provisional-joinery-dimensions',parts:[]};
  const P=(...a)=>f.parts.push(part(f,...a));
  P('study-north-pegboard',145,3330,2250,12,1100,620,'pegboard-panel','白色穿孔洞洞板 · 桌上留出插座带','Cream',{shape:'perforated-pegboard',holePitchMm:30,holeDiameterMm:6});
  for(const [name,x,w,h]of[['lower',140,2260,1790],['upper',140,1100,2050]]){
    P('study-north-shelf-'+name,x,3330,w,240,h,20,'display-shelf','开放浅木层板，无上部柜门','OakLight');
    P('study-north-led-'+name,x+20,3505,w-40,8,h-4,4,'led-strip','层板底暖光','Light',{lightWash:true});
    for(const b of[x+80,x+w-100])P('study-north-bracket-'+name+'-'+b,b,3330,20,205,h-70,70,'shelf-bracket','薄支架示意','Cream');
  }
  P('study-north-mini-shelf',1740,3342,540,150,1430,18,'pegboard-shelf','可调小层板','Cream');
  for(let i=0;i<5;i++){const x=1480+i*130;P('study-north-hook-stem-'+i,x,3342,8,45,1260,8,'pegboard-hook','洞洞板小挂钩');P('study-north-hook-tip-'+i,x,3379,8,8,1260,25,'pegboard-hook','挂钩上弯示意');}
  f.cabinetDesign={revision:REVISION,title:'开放层板与洞洞板',palette:{door:'#F3EFE6',wood:'#C6AA83'},faces:[{face:'south',lengthMm:2260}],features:['洞洞板底1100、顶1720mm；插座中心1000位于板下。','通长开放层板1790mm、左侧第二层2050mm，均20厚、底部暖光。','小层板和挂钩用于常用小物，不新增封闭吊柜。']};
  f.conditions=[CONDITIONS[3]];f.notes=CONDITIONS[3];f.sourceFootprintMm=footprint(f);return f;
}
function moveElectrical(p,id,x,y,height,face,purpose,servedIds){const f=p.defaultFurniture.find(q=>q.id===id);assert.ok(f,id);const north=face==='south',idx=p.WALLS.findIndex(w=>north?w[3]===3320&&w[0]<=x&&w[2]>=x:w[1]===6050&&w[0]<=x&&w[2]>=x);assert.ok(idx>=0,'Study wall host');Object.assign(f,{cx:x,cy:y,rot:north?0:180,elevationMm:height-f.heightMm/2,face,layoutRevision:REVISION,name:f.code+' · '+purpose});f.sourceFootprintMm=footprint(f);f.electricalDesign={...clone(f.electricalDesign),purpose,centerHeightMm:height,face,mountingRoomId:'room_c',servedFurnitureIds:servedIds,layoutRevision:REVISION,anchor:{kind:'wall',wallIndex:idx,wallRectMm:clone(p.WALLS[idx]),surfaceVerifiedAgainstCurrentModel:true,siteVerified:false},drawingEvidence:{...clone(f.electricalDesign.drawingEvidence),sourceDrawingHeightMm:f.electricalDesign.drawingEvidence?.heightMm,heightMm:height,heightStatus:'owner-study-layout-provisional-not-SD03-individual-location',positionStatus:'owner-study-north-desk-south-bed-adaptation',currentPositionMm:[x,y,height]},reviewNotes:CONDITIONS[4]};f.notes=CONDITIONS[4];}
function validateFamilyStudyNorth(value){
  const p=planOf(value),get=id=>p.defaultFurniture.find(q=>q.id===id),desk=get('study_full_desk'),bed=get(BED_ID),chair=get('family-f5'),organizer=get(ORGANIZER_ID),room=p.ROOMS.find(q=>q.id==='room_c'),door=p.DOORS.find(q=>q.id==='door_c');
  assert.deepEqual(room.poly,[[120,3320],[2420,3320],[2420,6050],[120,6050]]);
  assert.deepEqual(rect(desk),[120,3320,2420,3870]);assert.deepEqual(rect(bed),[120,3950,1420,6050]);assert.deepEqual(bed.mattressMm,[1200,2000]);assert.equal(bed.rot,180);
  for(const f of[desk,bed,chair]){const r=rect(f);assert.ok(r[0]>=120&&r[1]>=3320&&r[2]<=2420&&r[3]<=6050,f.id+' outside room');assert.equal(doorHits(door,f).length,0,'Door sweep hits '+f.id);}
  assert.ok(!overlap(rect(bed),rect(desk))&&!overlap(rect(bed),rect(chair))&&!overlap(rect(chair),rect(desk)));
  const wide=[120,3950,1720,6050];assert.ok(doorHits(door,wide).includes(90),'1600 wide frame must fail actual door sweep');assert.ok(doorHits(door,[120,3950,1620,6050]).includes(90),'Bare1500 still enters door leaf');
  assert.ok(REMOVED.every(id=>!get(id)));assert.ok(organizer.parts.some(q=>q.shape==='perforated-pegboard'));assert.ok(!organizer.parts.some(q=>q.role.startsWith('door')));
  for(const id of['family-elec-p09','family-elec-p10','family-elec-n03']){const f=get(id);assert.equal(f.cy,3324);assert.equal(f.rot,0);assert.ok(f.elevationMm+f.heightMm<1100,'Socket below pegboard');assert.deepEqual(p.WALLS[f.electricalDesign.anchor.wallIndex],f.electricalDesign.anchor.wallRectMm);}
  for(const id of['family-elec-s06','family-elec-p11']){const f=get(id),r=rect(f);assert.equal(f.cy,6046);assert.equal(f.rot,180);assert.ok(r[0]>1420&&r[2]<1610,'Bedside plate outside bed and full-open leaf');assert.deepEqual(p.WALLS[f.electricalDesign.anchor.wallIndex],f.electricalDesign.anchor.wallRectMm);}
  return{ok:true,roomNetMm:[2300,2730],deskMm:[2300,550,740],mattressMm:[1200,2000],frameMm:[1300,2100,950],headDirection:'south',eastAccessWidthMm:1000,bedFootToDeskMm:80,bedFootPassage:false,chairRectMm:rect(chair),doorSweepSampleStepDegrees:.5,currentBedDoorHits:[],rejected1500FrameDoorOverlapMm:110,doorUnchanged:true,westWindowAndACUnchanged:true,oldSouthShelvesRemoved:true,closedUpperCabinets:false};
}
function beforeFamilyStudyNorth(value){const out=require('./family-bath-fit-20261105.cjs').beforeFamilyBathFit(value),p=planOf(out),m=p.metadata?.[KEY];if(!m)return out;const old=new Map(m.previousFurniture.map(f=>[f.id,f])),now=new Map(p.defaultFurniture.map(f=>[f.id,f]));p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(old.get(id)||now.get(id)));p.ROOMS=clone(m.previousRooms);for(const[k,v]of Object.entries(m.previousMetadataFields)){if(v.present)p.metadata[k]=clone(v.value);else delete p.metadata[k];}delete p.metadata[KEY];return out;}
function applyFamilyStudyNorth(value){
  const p=planOf(value);assert.equal(p.id,'family');assert.ok(p.metadata.familyDryerKitchenUpdate);if(p.metadata[KEY])return value;const previous=clone(p),get=id=>p.defaultFurniture.find(f=>f.id===id),old=new Map(p.defaultFurniture.map(f=>[f.id,clone(f)]));
  p.defaultFurniture=p.defaultFurniture.filter(f=>!REMOVED.includes(f.id)).map(f=>f.id==='study_full_desk'?makeDesk(f):f);p.defaultFurniture.push(makeBed(),makeOrganizer());
  Object.assign(get('family-f5'),{cx:1970,cy:4200,rot:180,face:'north',layoutRevision:REVISION,notes:'北墙书桌东侧座位；椅子与床架、桌沿及房门扫掠分离。'});get('family-f5').sourceFootprintMm=footprint(get('family-f5'));
  for(const[id,x]of[['family-elec-p09',1600],['family-elec-p10',1880],['family-elec-n03',2160]])moveElectrical(p,id,x,3324,1000,'south',id.endsWith('n03')?'北墙书桌 · 网络接口':'北墙书桌 · 电脑/充电电源',['study_full_desk']);
  moveElectrical(p,'family-elec-s06',1490,6046,1100,'north','南墙床头 · 主灯双控',[BED_ID]);moveElectrical(p,'family-elec-p11',1490,6046,700,'north','南墙床侧 · 充电电源',[BED_ID]);
  const room=p.ROOMS.find(q=>q.id==='room_c');room.studyFurnitureRevision=REVISION;room.studyNorthDesk=true;room.notes=CONDITIONS.slice(0,3).join(' ');
  const validation=validateFamilyStudyNorth(p),changed=p.defaultFurniture.filter(f=>old.has(f.id)&&!same(f,old.get(f.id))).map(f=>f.id),added=p.defaultFurniture.filter(f=>!old.has(f.id)).map(f=>f.id),now=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,{present:Object.hasOwn(previous.metadata,k),...(Object.hasOwn(previous.metadata,k)?{value:clone(previous.metadata[k])}:{})}]));
  p.metadata.conditions=[...(p.metadata.conditions||[]),...CONDITIONS];p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-11-02',description:'书房北墙2300通长桌与开放置物架/洞洞板，床头南向，因1500床与现有门叶冲突采用1200床垫。',sourceIds:['room_c'],sourceSnapshotsUnchanged:true}];p.metadata.converter+=' + tools/family-study-north-20261102.cjs';
  p.metadata[KEY]={id:REVISION,date:'2026-11-02',title:'方案2 · 书房北墙满墙桌、南向1200床与洞洞板',status:'owner-layout-provisional-furniture-details',validation,notes:CONDITIONS,
    previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousFurniture:[...changed,...REMOVED].map(id=>clone(old.get(id))),previousRooms:clone(previous.ROOMS),previousMetadataFields,
    changedFurnitureIds:changed,newFurnitureIds:added,removedFurnitureIds:REMOVED,replacedFurnitureIds:[],
    migrationFields:Object.fromEntries(changed.map(id=>[id,[...new Set([...Object.keys(old.get(id)),...Object.keys(now.get(id))])].filter(k=>k!=='id'&&!same(old.get(id)[k],now.get(id)[k]))])),
    preserveCustomPartsIds:['study_full_desk'],preserveCustomSizeIds:['study_full_desk'],preserveCustomPlacementIds:['study_full_desk','family-f5',...changed.filter(id=>id.startsWith('family-elec-'))],
    sourceSnapshotsUnchanged:true,otherSchemesUnchanged:true};
  for(const k of['WALLS','WALL_META','DOORS','SLIDES','WINS','WIN_META','BAYS','BIFOLDS','PLAN_BOUNDS','BOUNDS','CENTER'])assert.deepEqual(p[k],previous[k],k+' unchanged');
  for(const id of['family-acwall-room_c','family-elec-p12','family-elec-s05'])assert.deepEqual(get(id),old.get(id));assert.deepEqual(beforeFamilyStudyNorth(p),previous,'Exact leaf rollback');return value;
}
module.exports={applyFamilyStudyNorth,beforeFamilyStudyNorth,validateFamilyStudyNorth,REVISION,KEY,CONDITIONS,BED_ID,ORGANIZER_ID,REMOVED,doorHits,rect};
