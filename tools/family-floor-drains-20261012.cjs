'use strict';

// Owner-requested Scheme 2 floor-drain covers. These are visible, selectable
// layout placeholders only: no buried trap/pipe, verified slope, structural
// opening or new washer drain connection is manufactured by this layer.
const assert=require('node:assert/strict');
const REVISION='family-floor-drains-20261012',clone=structuredClone;
const META_KEYS=['conditions','designCorrections','converter'];
const DRAIN_IDS=Object.freeze([
  'family-drain-balcony','family-drain-bath1-dry','family-drain-bath1-shower',
  'family-drain-bath2-dry','family-drain-bath2-shower'
]);
const PLACEMENTS=Object.freeze([
  {id:DRAIN_IDS[0],roomId:'balcony',name:'生活阳台洗地地漏 · 暂估150方格栅',cx:6975,cy:10700,elevationMm:0,
    purpose:'独立洗地/接桶龙头附近的阳台地面排水',
    placementNote:'位于原阳台主体地面西侧，原地面边界内；不放在北/东外挑铁皮、门轨、设备柜底或基站正前方350mm模型直线路径中。水桶仅临时接水，不能盖住地漏或挡住基站。'},
  {id:DRAIN_IDS[1],roomId:'bath_1',name:'主卫干区地漏 · 暂估150方格栅',cx:5250,cy:4290,elevationMm:0,
    purpose:'主卫盆厕前方干区偶发地面积水排水',
    placementNote:'位于主卫干区，暂避开北铰门完整扫掠、南侧盆柜和马桶底座；不当作盆柜或马桶排水接口。'},
  {id:DRAIN_IDS[2],roomId:'bath_1',assignedShowerId:'family-f12',name:'主卫淋浴地漏 · 暂估150方格栅',cx:6420,cy:3600,elevationMm:50,
    purpose:'主卫淋浴区域地面排水',
    placementNote:'在原900×1410淋浴盘面内，格栅北边暂离盘北边125mm、东边暂离盘东边215mm；原50mm示意盘面、玻璃、龙头及房屋地面不改。'},
  {id:DRAIN_IDS[3],roomId:'bath_2',name:'客卫干区地漏 · 暂估150方格栅',cx:5070,cy:6000,elevationMm:0,
    purpose:'客卫盆机前方干区偶发地面积水排水',
    placementNote:'位于盆机柜前方南侧干区，暂避开原门完整扫掠、洗衣机/盆柜底、马桶底座和淋浴玻璃；格栅南边距房间内边125mm。洗衣机原独立排水未改。'},
  {id:DRAIN_IDS[4],roomId:'bath_2',assignedShowerId:'family-f15',name:'客卫淋浴地漏 · 暂估150方格栅',cx:6430,cy:5240,elevationMm:50,
    purpose:'客卫淋浴区域地面排水',
    placementNote:'在原880×1110淋浴盘面内，格栅北边暂离盘北边125mm、东边暂离盘东边195mm；原50mm示意盘面、玻璃、龙头及房屋地面不改。'}
]);
const CONDITIONS=[
  '本版仅方案2新增五个可选中地漏盖示意：阳台洗地1、主卫干区1/淋浴1、客卫干区1/淋浴1。150×150mm是暂估格栅占位，非已购产品或实测地漏规格。',
  '地漏点位、下方排水管/存水弯、管径、水封/防臭、检修、实际地坪高差及找坡均未核验；可见4mm仅格栅模型厚度，不代表完成地面应凸起或可据本图施工。',
  '阳台地漏仅放在原室内楼板地面，不放在600mm非踩踏外挑。水龙头用于接桶/软管洗地，禁止直接冲电器；需由现场确认排水落点、防水及通往地漏的坡向。',
  '两处淋浴地漏沿用原50mm模型盘面作为显示标高，未修改原盘、玻璃、门扇或地面坡度；原北侧装饰线性排水图例关闭，不重复表达两个实际排水口。',
  '客卫洗衣机及盆柜位置和独立排水方案保持；洗衣机排水不能自动当作接到干区/淋浴/阳台新增地漏，实际接管与防溢流须单独深化。'
];

function coverParts(f){
  const P=(id,x,y,w,d,z,h,role,label,color='#9DABA8')=>({
    id:f.id+'-'+id,x,y,w,d,elevationMm:z,heightMm:h,role,label,color,material:'Metal',face:'north'
  });
  const out=[
    P('frame-north',-75,-75,150,8,1,3,'floor-drain-frame','方形地漏北边框'),
    P('frame-south',-75,67,150,8,1,3,'floor-drain-frame','方形地漏南边框'),
    P('frame-west',-75,-67,8,134,1,3,'floor-drain-frame','方形地漏西边框'),
    P('frame-east',67,-67,8,134,1,3,'floor-drain-frame','方形地漏东边框'),
    P('dark-slot-bed',-67,-67,134,134,0,1,'floor-drain-slot-bed',
      '格栅下暗面 · 仅可视符号、不是地下管或存水弯','#3F4946')
  ];
  for(let i=0;i<10;i++)out.push(P('grate-'+i,-62+i*13,-63,8,126,1,3,
    'floor-drain-grate','暂估地漏格栅条 '+(i+1)));
  assert.equal(out.length,15);
  for(const q of out){assert.ok(q.x>=-75&&q.y>=-75&&q.x+q.w<=75&&q.y+q.d<=75);
    assert.ok(q.elevationMm>=0&&q.elevationMm+q.heightMm<=4,'only visible cover parts');}
  return out;
}
function makeDrain(spec){
  const {id,roomId,name,cx,cy,elevationMm,purpose,placementNote,assignedShowerId}=spec;
  const f={id,sourceId:id,type:'fixture',nativeType:'floordrain',modelVariant:'square-floor-drain',
    name,cx,cy,w:150,d:150,heightMm:4,elevationMm,rot:0,
    baseWidthMm:150,baseDepthMm:150,baseHeightMm:4,color:'#9DABA8',roomId,face:'north',
    dimensionStatus:'provisional-cover-size-placement',layoutRevision:REVISION,cabinetRevision:REVISION,
    sourceFootprintMm:{x:cx-75,y:cy-75,w:150,d:150},
    ...(assignedShowerId?{assignedShowerId}:{}),
    visualOnly:true,placementUnverified:true,notConstructionApproval:true,
    notes:purpose+'。'+placementNote+' 150×150mm格栅盖和点位均为暂估；4mm仅显示厚度，不是地坪凸起要求。未建模地下管、存水弯或实际找坡，排水连通未验证。',
    conditions:[CONDITIONS[1],CONDITIONS[4],placementNote+' 点位不是实测，须确认现有排水落点后深化。'],
    drainDesign:{coverWidthMm:150,coverDepthMm:150,visibleThicknessMm:4,
      coverType:'square-slotted-placeholder',surfaceMount:assignedShowerId?'existing-shower-tray-surface':'floor-surface-concept',
      visualOnly:true,modelDatumElevationMm:elevationMm,placementStatus:'provisional-not-measured',productSelected:false,
      pipeDiameterMm:null,waterSealDepthMm:null,drainConnectionsConfirmed:false,floorSlopeConfirmed:false,
      separateWasherDrainUnchanged:true,buriedPlumbingModeled:false,notConstructionApproval:true}
  };
  f.parts=coverParts(f);return f;
}
function rect(f){
  const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),
    d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));
  return {x:f.cx-w/2,y:f.cy-d/2,w,d,z:f.elevationMm||0,h:f.heightMm};
}
function overlaps(a,b){return ['x','y','z'].every((k,i)=>
  Math.min(a[k]+a[['w','d','h'][i]],b[k]+b[['w','d','h'][i]])-Math.max(a[k],b[k])>.01);}
function partRect(f,q){
  const a=(f.rot||0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),
    x=q.x+q.w/2,y=q.y+q.d/2,w=Math.abs(q.w*ca)+Math.abs(q.d*sa),d=Math.abs(q.w*sa)+Math.abs(q.d*ca);
  return {x:f.cx+x*ca-y*sa-w/2,y:f.cy+x*sa+y*ca-d/2,w,d,
    z:(f.elevationMm||0)+(q.elevationMm||0),h:q.heightMm};
}
function verifyPlacement(p,drains){
  for(const f of drains){
    const room=p.ROOMS.find(r=>r.id===f.roomId),b=rect(f);
    assert.ok(room);const xs=room.poly.map(q=>q[0]),ys=room.poly.map(q=>q[1]);
    assert.ok(b.x>=Math.min(...xs)&&b.x+b.w<=Math.max(...xs)&&b.y>=Math.min(...ys)&&b.y+b.d<=Math.max(...ys),
      'Cover remains inside original room '+f.id);
    for(const w of p.WALLS)assert.equal(overlaps(b,{x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1],z:0,h:2700}),false,
      'Cover intersects unchanged wall '+f.id);
    for(const old of p.defaultFurniture){
      if(old.id===f.assignedShowerId)continue; // The assigned tray is the display datum, not an obstacle.
      const solids=old.parts?.length?old.parts.map(q=>partRect(old,q)):[rect(old)];
      for(const solid of solids)assert.equal(overlaps(b,solid),false,'Cover intersects other existing solid '+f.id+' / '+old.id);
    }
    if(f.assignedShowerId){
      const shower=p.defaultFurniture.find(q=>q.id===f.assignedShowerId),r=rect(shower);
      assert.ok(shower?.type==='shower');
      assert.ok(b.x>=r.x+100&&b.x+b.w<=r.x+r.w-100&&b.y>=r.y+100&&b.y+b.d<=r.y+r.d-100,
        'Inside unchanged shower and at least 100mm from perimeter '+f.id);
      assert.equal(f.elevationMm,50);
    }
    // Conservative swept AABBs include the model's 40mm leaf thickness.
    // Independent tests additionally use exact polygons and finer sampling.
    for(const door of p.DOORS){
      const a0=Math.atan2(door.c[1],door.c[0]),a1=Math.atan2(door.o[1],door.o[0]);
      let delta=a1-a0;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;
      for(let i=0;i<=90;i++){
        const a=a0+delta*i/90,dx=Math.cos(a),dy=Math.sin(a),nx=-dy*20,ny=dx*20;
        const corners=[[door.h[0]+nx,door.h[1]+ny],[door.h[0]-nx,door.h[1]-ny],
          [door.h[0]+door.len*dx+nx,door.h[1]+door.len*dy+ny],
          [door.h[0]+door.len*dx-nx,door.h[1]+door.len*dy-ny]],xx=corners.map(q=>q[0]),yy=corners.map(q=>q[1]);
        assert.equal(overlaps(b,{x:Math.min(...xx),y:Math.min(...yy),w:Math.max(...xx)-Math.min(...xx),
          d:Math.max(...yy)-Math.min(...yy),z:0,h:door.heightMm}),false,'Cover intersects door sweep '+f.id+' / '+door.id);
      }
    }
  }
  const robot=p.defaultFurniture.find(f=>f.id==='balcony_robot'),balconyDrain=drains.find(f=>f.roomId==='balcony');
  assert.ok(robot);
  assert.equal(overlaps(rect(balconyDrain),{x:robot.cx-175,y:9660,w:350,d:11150-9660,z:0,h:110}),false,
    'Balcony drain avoids current compact robot straight exit lane');
}
function applyFamilyFloorDrains(bundle){
  const p=bundle.schemes.family;
  assert.ok(p?.metadata.familyBalconyRecessUpdate,'Apply after balcony recess layer');
  assert.ok(!p.metadata.familyFloorDrainsUpdate,'Floor drain layer already applied');
  assert.equal(p.defaultFurniture.length,63);
  const previous=clone(p),others=Object.fromEntries(['wood','laundry','screen'].map(id=>[id,clone(bundle.schemes[id])]));
  for(const id of DRAIN_IDS)assert.ok(!p.defaultFurniture.some(f=>f.id===id),'Duplicate '+id);
  const drains=PLACEMENTS.map(makeDrain);
  verifyPlacement(p,drains);
  const previousMetadataFields=Object.fromEntries(META_KEYS.map(k=>[k,clone(p.metadata[k])]));
  p.defaultFurniture.push(...drains);
  p.metadata.conditions=[...(p.metadata.conditions||[]),...CONDITIONS];
  p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{
    id:REVISION,date:'2026-10-12',sourceIds:[...DRAIN_IDS],sourceSnapshotsUnchanged:true,
    description:'仅方案2补充阳台及主客卫干区/淋浴共5个暂估方形地漏盖；不改原地面、机器、洗衣机排水、柜体、门窗、淋浴盘或玻璃。地下接管、水封和找坡仍待核。'
  }];
  p.metadata.converter=(p.metadata.converter||'tools/convert-house-plans.cjs')+' + tools/family-floor-drains-20261012.cjs';
  p.metadata.familyFloorDrainsUpdate={id:REVISION,date:'2026-10-12',title:'方案2 · 阳台及两卫五处地漏示意',
    status:'owner-requested-visible-cover-concept',sourceSnapshotsUnchanged:true,architectureUnchanged:true,
    other63FurnitureUnchanged:true,originalFloorsAndShowerTraysUnchanged:true,visualOnly:true,placementUnverified:true,
    notConstructionApproval:true,floorDrainLocationConfirmed:false,floorSlopeConfirmed:false,drainConnectionsConfirmed:false,
    pipeDiameterMm:null,waterSealDepthMm:null,buriedPlumbingModeled:false,coverSizeMm:[150,150],visibleThicknessMm:4,
    showerDisplayDatumMm:50,guestWasherUnchanged:true,separateWasherDrainUnchanged:true,retainedBucketTap:true,
    disabledImplicitShowerDrainIds:['family-f12','family-f15'],
    placements:drains.map(f=>({id:f.id,roomId:f.roomId,cx:f.cx,cy:f.cy,w:f.w,d:f.d,elevationMm:f.elevationMm,
      ...(f.assignedShowerId?{assignedShowerId:f.assignedShowerId}:{})})),
    previousPlanFields:{},previousFurniture:[],previousFurnitureOrder:previous.defaultFurniture.map(f=>f.id),previousMetadataFields,
    changedFurnitureIds:[],newFurnitureIds:[...DRAIN_IDS],removedFurnitureIds:[],replacedFurnitureIds:[],migrationFields:{}
  };
  assert.equal(p.defaultFurniture.length,68);
  for(const key of Object.keys(previous))if(!['defaultFurniture','metadata'].includes(key))assert.deepEqual(p[key],previous[key],key+': unauthorized edit');
  assert.deepEqual(p.defaultFurniture.slice(0,63),previous.defaultFurniture,'All 63 previous objects remain exact');
  for(const key of Object.keys(previous.metadata))if(!META_KEYS.includes(key))assert.deepEqual(p.metadata[key],previous.metadata[key],'Historical metadata changed '+key);
  for(const[id,old]of Object.entries(others))assert.deepEqual(bundle.schemes[id],old,id+': unauthorized scheme edit');
  assert.deepEqual(beforeFamilyFloorDrains(p),previous,'Exact previous model rollback');
  return bundle;
}
function beforeFamilyFloorDrains(value){
  const out=clone(value),p=out.schemes?out.schemes.family:out,m=p?.metadata?.familyFloorDrainsUpdate;
  if(!m)return out;
  const current=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(current.get(id)));
  for(const[key,v]of Object.entries(m.previousPlanFields))p[key]=clone(v);
  for(const key of META_KEYS){if(m.previousMetadataFields[key]===undefined)delete p.metadata[key];else p.metadata[key]=clone(m.previousMetadataFields[key]);}
  delete p.metadata.familyFloorDrainsUpdate;return out;
}
module.exports={applyFamilyFloorDrains,beforeFamilyFloorDrains,REVISION,DRAIN_IDS};
