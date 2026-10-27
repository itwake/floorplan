'use strict';

// Public-room substep for the owner construction-drawing revision. The parent
// layer owns architecture and the final revision/migration record. This module
// mutates only the supplied family plan and returns exact before-images.
const assert=require('node:assert/strict'),{isDeepStrictEqual}=require('node:util');
const REVISION='family-drawing-layout-20261027',clone=structuredClone;
const SOURCE={id:'owner-construction-dwg-20261027',sha256:'405226e8cc00211cc665399110ab7de0f54daeb29c0a456b5f528c1d0db08eb0',
  sheets:['PL-02','PL-03','PL-06','EL-04','EL-05','EL-06','EL-07'],unit:'mm',nativeNorth:'drawing-right',modelNorth:'negative-y',
  transform:'modelX=-2031202.7024225995-CADY+120; modelY=16370039.22570109-CADX+120'};
const CAD={tvWall:{x0:3530,x1:6800,y:6310,continuousVisibleLengthMm:3270},
  sofa:{centerX:5151.572786492994,backY:9810.829937035218,backPartHandle:41664,blockHandle:40443,insertHandle:190364},
  rug:{x0:3639.7017076893244,y0:6853.066177317873,x1:6400.749654324958,y1:9289.08636671491,outlineHandles:[190365,190366]},
  armchair:{centerX:3955.607031009509,centerY:7078.827413585968,bounds:[3581.3797887333203,6704.17014558427,4329.834273285698,7453.484681587666],insertHandle:190357,blockHandle:11621},
  kitchen:{northY:11290,southY:13890,eastX:8030,westX:5610,fridgeBay:[5610,11290,6410,11890],
    applianceCabinetBay:[6410,11290,7010,11890],sinkBay:[7430,11890,8030,12690],dishwasherBay:[7430,12690,8030,13290],
    hobBounds:[6335,13360,7085,13810],hobHandle:2662,flue:[5690,13440,6100,13890],windowWidthMm:890},
  balcony:{floor:[7040,9560,8090,11160],sizeMm:[1050,1600],sharedNorthWindowWidthMm:890}};
const round=n=>Math.round(n*1000)/1000;
function footprint(f){const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));return{x:round(f.cx-w/2),y:round(f.cy-d/2),w:round(w),d:round(d)};}
const fields=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='id'&&!isDeepStrictEqual(a[k],b[k])).sort();
function addNote(f,text){f.notes=(f.notes?f.notes+' ':'')+text;}
function move(f,x,y,rotation,revision){f.cx=round(x);f.cy=round(y);if(rotation!==undefined)f.rot=rotation;f.sourceFootprintMm=footprint(f);f.layoutRevision=revision;}
function wallAnchor(p,f){
  const a=f.electricalDesign?.anchor;if(a?.kind!=='wall')return;
  const face=f.face||f.electricalDesign.face,r=footprint(f),tol=.05;
  const matches=p.WALLS.map((w,i)=>({w,i})).filter(({w})=>{
    if(face==='west')return Math.abs(r.x+r.w-w[0])<tol&&r.y>=w[1]-tol&&r.y+r.d<=w[3]+tol;
    if(face==='east')return Math.abs(r.x-w[2])<tol&&r.y>=w[1]-tol&&r.y+r.d<=w[3]+tol;
    if(face==='south')return Math.abs(r.y-w[3])<tol&&r.x>=w[0]-tol&&r.x+r.w<=w[2]+tol;
    if(face==='north')return Math.abs(r.y+r.d-w[1])<tol&&r.x>=w[0]-tol&&r.x+r.w<=w[2]+tol;
    return false;
  });
  f.electricalDesign.anchor={...clone(a),...(matches[0]?{wallIndex:matches[0].i}:{}),surfaceVerifiedAgainstCurrentModel:Boolean(matches.length),drawingHostRecheckRequired:!matches.length};
}
function movePoint(p,id,x,y,revision,reason){
  const f=p.defaultFurniture.find(q=>q.id===id);if(!f)return;
  move(f,x,y,undefined,revision);f.electricalDesign={...clone(f.electricalDesign),layoutRevision:revision,
    installationApproved:false,wiringModeled:false,drawingRelocationReason:reason};wallAnchor(p,f);addNote(f,'2026-10-27：'+reason+'；原负荷/回路/保护及安装待核状态保留。');
}
function replaceChairDistance(value,distance){return String(value||'').replace(/465(?=\s*(?:mm|毫米))/g,String(distance));}
function retargetCornerChair(cabinet,chair,parkedX,parkedY,revision){
  if(!cabinet.cornerDoorDesign?.operatingChair)return null;
  const old=clone(cabinet.cornerDoorDesign.operatingChair),distance=round(parkedX-chair.cx),spec={...old,
    cx:round(parkedX),cy:round(parkedY),relativeMm:[round(parkedX-cabinet.cx),round(parkedY-cabinet.cy)],
    defaultChairCenterMm:[chair.cx,chair.cy],temporaryTranslationMm:[distance,round(parkedY-chair.cy)],temporaryMoveMm:distance,
    notes:'2026-10-27餐桌贴柜后，南餐椅用餐中心为('+chair.cx+','+chair.cy+')；开柜仍临时移至('+round(parkedX)+','+round(parkedY)+')，向东'+distance+'mm；闭门后恢复。非永久挪椅。'};
  cabinet.cornerDoorDesign={...clone(cabinet.cornerDoorDesign),operatingChair:spec,diningLayoutRevision:revision};
  if(cabinet.cabinetDesign){
    const d=clone(cabinet.cabinetDesign);for(const k of['features','dimensions'])if(Array.isArray(d[k]))d[k]=d[k].map(s=>replaceChairDistance(s,distance));
    if(d.layoutAdaptations?.cornerStorage)d.layoutAdaptations.cornerStorage={...d.layoutAdaptations.cornerStorage,operatingChair:clone(spec)};
    cabinet.cabinetDesign=d;
  }
  cabinet.conditions=(cabinet.conditions||[]).map(s=>replaceChairDistance(s,distance));cabinet.notes=replaceChairDistance(cabinet.notes,distance);
  addNote(cabinet,spec.notes);cabinet.layoutRevision=revision;return{chairId:chair.id,oldSpec:old,newSpec:clone(spec),geometryAndHingeAxesUnchanged:true};
}
function newArmchair(revision,options={}){
  const w=options.widthMm||650,d=options.depthMm||680,h=options.heightMm||800;
  const f={id:'drawing-living-armchair',sourceId:'drawing-living-armchair',type:'armchair',name:'客厅紧凑单人沙发 · 按图试排（选型待核）',
    cx:round(options.cx??CAD.armchair.centerX),cy:round(options.cy??7200),w,d,heightMm:h,elevationMm:0,rot:options.rot??315,color:'#E8E0D1',roomId:'living',
    layoutRevision:revision,dimensionStatus:'drawing-symbol-placeholder-product-pending',notPurchasedModel:true,installationApproved:false,
    drawingReview:{source:clone(SOURCE),cadSymbol:clone(CAD.armchair),bodySizeConfirmed:false,
      clearanceAdaptationMm:[round((options.cx??CAD.armchair.centerX)-CAD.armchair.centerX),round((options.cy??7200)-CAD.armchair.centerY)],
      reason:'图示单椅为示意块，不是已购产品；紧凑外包向南少量避让保留的2200mm电视柜，需复核舒适度与实际选型。'},
    notes:'原图客厅单椅按紧凑650×680×800mm暂估，非图纸产品尺寸；位置参照DWG后作有限避让，未新增茶几。'};
  f.sourceFootprintMm=footprint(f);return f;
}
function rebuildDrawingSideboard(f,revision,options={}){
  const old=clone(f),X=options.westX??2145,N=9210,S=13890,H=2730,T=20,G=3,Y=9910,L=1880,CN=12730,returnY=13290;
  Object.assign(f,{cx:X+820,cy:(N+S)/2,w:1640,d:S-N,heightMm:H,baseWidthMm:1640,baseDepthMm:S-N,baseHeightMm:H,
    layoutRevision:revision,cabinetRevision:revision,name:'通顶餐边柜 · 按施工图短800 / 180°转角功能待核'});
  const out=[],P=(id,x,y,w,d,z,h,role,label,material='Cream',face='east',extra={})=>{const p={id,x:round(x-f.cx),y:round(y-f.cy),w:round(w),d:round(d),elevationMm:round(z),heightMm:round(h),role,label,
    color:material==='OakLight'?'#C6AA83':material==='Light'?'#FFF0C8':'#F3EFE6',material,face,...extra};out.push(p);return p;};
  function tall(id,y,length){
    P(id+'-north',X,y,380,T,0,H,'cabinet-side','20mm通顶端板');P(id+'-south',X,y+length-T,380,T,0,H,'cabinet-side','20mm通顶端板');
    P(id+'-back',X,y+T,T,length-2*T,0,H,'cabinet-back','20mm背板');P(id+'-floor',X+T,y+T,360,length-2*T,0,T,'cabinet-bottom','20mm底板');P(id+'-top',X+T,y+T,360,length-2*T,H-T,T,'cabinet-top','20mm顶板');
    for(const z of[520,1000,1500,2000])P(id+'-shelf-'+z,X+T,y+T,360,length-2*T,z,T,'cabinet-shelf','20mm搁板');
    for(let i=0;i<2;i++)P(id+'-front-'+i,X+380,y+1.5+i*length/2,T,length/2-G,1.5,H-G,'door-hinged','奶白柜门 · 开角及五金待深化');
  }
  tall('drawing-north-short-tower',N,700);tall('drawing-south-tower',11790,940);
  P('drawing-central-side-north',X,Y,380,T,280,600,'cabinet-side','悬浮下柜20mm侧板');P('drawing-central-side-south',X,Y+L-T,380,T,280,600,'cabinet-side','悬浮下柜20mm侧板');
  P('drawing-central-base-back',X,Y+T,T,L-2*T,280,600,'cabinet-back','下柜背板');P('drawing-central-base-bottom',X+T,Y+T,360,L-2*T,280,T,'cabinet-bottom','悬浮底板下口280');
  for(const y of[Y+80,Y+L-110])P('drawing-central-hidden-support-'+round(y),X+T,y,40,30,0,280,'hidden-support','保留隐藏后支承示意，非悬空承重批准');
  for(const z of[510,720])P('drawing-central-base-shelf-'+z,X+T,Y+T,360,L-2*T,z,T,'cabinet-shelf','下柜20mm搁板');
  for(let i=0;i<4;i++)P('drawing-central-sliding-front-'+i,X+360+(i%2)*20,Y+1.5+i*L/4,T,L/4-G,281.5,597,'door-sliding','桌后木色滑门，非可拉满抽屉','OakLight');
  P('reference-west-central-countertop',X,Y,400,L,880,T,'wood-countertop','20mm台板，完成面900','OakLight');
  P('reference-west-central-niche-back',X,Y,T,L,900,H-900,'niche-back','整面木背开放格','OakLight');
  for(const[z,i]of[[1600,0],[1950,1],[2300,2],[2650,3]]){
    const q=P('drawing-central-open-shelf-'+i,X,Y,280,L,z,T,i===3?'cabinet-top':'display-shelf',i===0?'台上700净高中空之上的20mm层板':'330mm净格上沿20mm层板','OakLight');
    P('drawing-central-open-light-'+i,X+235,Y+25,8,L-50,z-4,4,'led-strip','真实板底暖光灯带','Light','east',{anchorPartId:q.id,anchor:'panel-underside',lightWash:true,installationApproved:false});
  }
  P('drawing-central-top-filler',X+260,Y,20,L,2670,60,'cabinet-filler','尺寸链闭合的60mm顶收口，待定制方核图');
  // Retain the owner-requested paired 180-degree access function, but rebuild
  // each physical part around the NEW 600-mm-deep return. Never group-scale
  // the old 18-mm hinge panels into an approved new hardware assembly.
  const oldWest=old.cx-old.w/2,dx=X-oldWest,dy=returnY-13490;
  for(const source of old.parts.filter(q=>q.id.startsWith('corner800-'))){
    const q=clone(source),worldX=old.cx+q.x,worldY=old.cy+q.y;
    let x=worldX+dx,y=worldY;
    const id=q.id;
    if(/west-back$/.test(id)){y=CN;q.d=S-CN;}
    else if(/east-hinge-stile$/.test(id))y+=dy;
    else if(/east-end$/.test(id)){y+=dy;q.d+=200;}
    else if(/cabinet-bottom-west|cabinet-top-west|corner-shelf-west/.test(id)){/* north end remains in place */}
    else if(/cabinet-bottom-south|cabinet-top-south|corner-shelf-south/.test(id)){y+=dy;q.d+=200;}
    else if(/led-west/.test(id)){/* follow unchanged western shelf footprint */}
    else if(/led-south/.test(id))y+=dy;
    if(q.heightMm===2700)q.heightMm=H;
    if(/cabinet-top/.test(id))q.elevationMm=H-q.heightMm;
    if(q.cabinetDoor){
      const d=q.cabinetDoor,west=d.group==='west';if(west){q.d-=200;d.lengthMm-=200;}else y+=dy;
      if(/upper/.test(id))q.heightMm+=30;
      d.hingeMm=[round(old.cx+d.hingeMm[0]+dx-f.cx),round(old.cy+d.hingeMm[1]+(west?0:dy)-f.cy)];
      d.hardwareStatus='new-600mm-return-180-function-concept-hinge-review-required';d.installationApproved=false;
    }
    q.x=round(x-f.cx);q.y=round(y-f.cy);q.label=(q.label||q.id)+' · 新600深转角，板/门轴须深化';out.push(q);
  }
  // The remaining 440-mm return is a full-height cabinet, not the old425-mm
  // countertop composition. Ordinary fronts remain conceptual hinged panels.
  const RX=X+1200,RW=440;
  P('drawing-return-west',RX,returnY,T,600,0,H,'cabinet-side','南返20mm端板','Cream','north');
  P('drawing-return-east',RX+RW-T,returnY,T,600,0,H,'cabinet-side','南返20mm端板','Cream','north');
  P('drawing-return-back',RX+T,S-T,RW-2*T,T,0,H,'cabinet-back','南返背板','Cream','north');
  for(const z of[0,550,1050,1550,2050,H-T])P('drawing-return-board-'+z,RX+T,returnY+T,RW-2*T,560,z,T,'cabinet-shelf','南返20mm层板','Cream','north');
  P('drawing-return-front',RX+1.5,returnY,RW-G,T,1.5,H-G,'door-hinged','南返通顶门 · 五金/开角待核','Cream','north');
  f.parts=out;f.sourceFootprintMm=footprint(f);f.referenceStyle={...clone(old.referenceStyle),revision,variant:'cream-oak-reference-sideboard',drawingReference:true};
  f.cornerDoorDesign={...clone(old.cornerDoorDesign),revision,hardwareInstallationApproved:false,
    status:'new-drawing-return-with-prior-180-functional-request-not-approved',focusBoundsMm:[X-f.cx,CN-f.cy,X+1200-f.cx,S-f.cy],
    geometryUnchanged:false,originalHingeGeometryRetained:false,hardwareReviewRequired:true,
    notes:'新图仅示意转角柜；保留业主180°取物功能。600mm南返使西门实长由747改547、南门727保持；通顶2730和新门轴为参数化概念，必须重新确认铰链/门重/轨迹/限位/防夹。'};
  f.cabinetDesign={...clone(old.cabinetDesign),layoutRevision:revision,title:'施工图餐边柜 · 窗端减800 / 180°转角功能深化',
    faces:[{face:'east',lengthMm:4080,label:'西直柜4080'},{face:'north',lengthMm:1640,label:'600深南返1640'}],
    features:['图示4880西直段从窗端减800，分为700+1880+1500；600深南返后总长4680。','顶2730、底悬空280、下柜600+20台板=900完成面；保留隐藏后支承示意，不批准真实悬挂。','中央1880木背，台上700净空；三格330净高，20mm层板底灯带，顶部60收口待定制核图。','桌后下柜使用滑门，避免将不可拉出的门面冒充抽屉。','保留180°双面库门功能，但新600深南返不等于旧硬件已通过；门轴/门重/运行碰撞必须重新深化。'],
    dimensions:['全高2730；西直4080=700+1880+1500；南返1640×600；模型总包1640×4680。','新一般柜板/台板20mm、门缝3mm；180°门内部18mm概念构件单独保留，非图纸铰链/板厚确认。','中央台面完成面900；首板底1600，后续板底1950/2300，顶板底2650，上60mm收口待核。'],
    layoutAdaptations:{...clone(old.cabinetDesign.layoutAdaptations),drawingSideboard:{windowEndRetreatMm:800,unshortenedStraightMm:4880,straightMm:4080,northEndMm:N,southEndMm:S,returnDepthMm:600,counterTopMm:900,centralMm:[Y,Y+L],generalBoardThicknessMm:T,topFillerPendingMm:60},
      cornerStorage:{...clone(old.cabinetDesign.layoutAdaptations.cornerStorage),newReturnDepthMm:600,hingeGeometryChanged:true,hardwareInstallationApproved:false}}};
  f.conditions=['本轮按施工图柜面重建，唯窗端缩短800；图示4880与旧源4890不同，采用4080西直段，不沿用4090旧尺寸。','一般板/台20mm；转角180°功能保留原18mm五金概念构件并重新定位，不表示新600深南返可直接按旧门轴施工。','顶2730、台面900和悬空280依图示；三层330净格链另有60顶收口，必须定制方复核，未将不闭合尺寸强行认证。'];
  f.notes=f.conditions.join(' ');
  return{cabinetRectMm:[X,N,X+1640,S],counterRectMm:[X,Y,X+400,Y+L],cornerNorthMm:CN,returnNorthMm:returnY,
    oldCornerHardwareConceptNotApproved:true,cornerGeometryChanged:true};
}
function alignCounterAppliances(p,cabinet,revision){
  const kinds=['blender','temperaturekettle','sterilizer','healthkettle','waterdispenser'],ys=[10150,10470,10830,11190,11530],west=cabinet.cx-cabinet.w/2;
  for(let i=0;i<kinds.length;i++){
    const f=p.defaultFurniture.find(q=>q.id==='family-sideboard-'+kinds[i]),point=p.defaultFurniture.find(q=>q.id==='family-elec-p'+(19+i));assert.ok(f&&point);
    // Body sizes/rotation and existing rear clearances are not reinterpreted
    // as appliance manufacturer installation or operating permissions.
    const oldX=f.cx;move(f,oldX+west-2125,ys[i],f.rot,revision);f.elevationMm=900;f.supportPartId='reference-west-central-countertop';
    f.applianceDesign={...clone(f.applianceDesign),layoutRevision:revision,bottomMm:900,topMm:900+f.heightMm,supportTopMm:900,cabinetNicheTopMm:1600,
      supportPartId:f.supportPartId,aboveBodyToLowestLedMm:1596-900-f.heightMm,behindBodyToNicheBackMm:30,openingAndSteamClearanceStatus:'pending-actual-product'};
    addNote(f,'2026-10-27：随1880mm中空和900mm台面重排；仅静态外包试放，开盖/蒸汽/散热与实际型号仍待核。');
    move(point,west+24,ys[i],point.rot,revision);const d=clone(point.electricalDesign);
    point.electricalDesign={...d,layoutRevision:revision,anchor:{...clone(d.anchor),partId:'reference-west-central-niche-back',
      localCenterMm:[round(point.cx-cabinet.cx),round(point.cy-cabinet.cy),d.centerHeightMm],baseHostDimensionsMm:[cabinet.w,cabinet.d,cabinet.heightMm],
      hostRotationDegrees:0,surfaceVerifiedAgainstCurrentModel:true,cabinetBoxAndPenetrationPending:true}};
    addNote(point,'2026-10-27：随实际小家电重排到新20mm木背板；中心高1390暂保留，额定值/回路/保护未批准。');
  }
}
function rebuildDrawingShoe(p,revision){
  const f=p.defaultFurniture.find(q=>q.id==='fit-entry_shoe_station');if(!f)return null;
  const X=5110,Y=13290,W=350,D=600,H=2730,T=20,out=[];
  Object.assign(f,{cx:X+W/2,cy:Y+D/2,w:W,d:D,heightMm:H,baseWidthMm:W,baseDepthMm:D,baseHeightMm:H,rot:0,
    layoutRevision:revision,cabinetRevision:revision,name:'玄关鞋柜 · 600×350×2730施工图示意'});
  const P=(id,x,y,w,d,z,h,role,label)=>out.push({id,x:x-f.cx,y:y-f.cy,w,d,elevationMm:z,heightMm:h,role,label,color:'#F3EFE6',material:'Cream',face:'west'});
  for(const[y,s]of[[Y,'south'],[Y+D-T,'north']])P('drawing-shoe-side-'+s,X,y,W,T,0,H,'cabinet-side','20mm侧板');
  P('drawing-shoe-base-back',X+W-T,Y+T,T,D-2*T,0,900,'cabinet-back','下柜背板');
  for(const z of[0,300,600,880])P('drawing-shoe-lower-board-'+z,X+T,Y+T,W-2*T,D-2*T,z,T,'cabinet-shelf','下柜20mm层板');
  P('drawing-shoe-counter',X,Y,W,D,900,T,'wood-countertop','20mm台板，板上920');
  P('e_key_niche-niche-back',X+W-T,Y,T,D,920,450,'niche-back','450高中空的真实背板');
  P('drawing-shoe-niche-top',X,Y,W,D,1370,T,'cabinet-bottom','中空上20mm搁板');
  P('drawing-shoe-upper-back',X+W-T,Y+T,T,D-2*T,1390,H-1390,'cabinet-back','上柜背板');
  P('drawing-shoe-upper-top',X+T,Y+T,W-2*T,D-2*T,H-T,T,'cabinet-top','20mm顶板');
  for(let i=0;i<2;i++){
    P('drawing-shoe-lower-door-'+i,X,Y+1.5+i*D/2,T,D/2-3,1.5,897,'door-hinged','鞋柜下门，五金待深化');
    P('drawing-shoe-upper-door-'+i,X,Y+1.5+i*D/2,T,D/2-3,1391.5,H-1393,'door-hinged','鞋柜上门，五金待深化');
  }
  f.parts=out;f.sourceFootprintMm=footprint(f);f.referenceStyle={revision,variant:'drawing-entry-shoe-cabinet',appearanceReferenceOnly:false,installationApproved:false};
  f.cabinetDesign={layoutRevision:revision,title:'玄关鞋柜 · 按EL05-A',palette:{door:'#F3EFE6',wood:'#C6AA83'},faces:[{face:'west',lengthMm:D}],
    features:['600长×350深×2730高，靠厨房西侧外墙留10mm示意。','900下柜+20板+450中空+20板+1340上柜闭合2730。'],dimensions:['柜外包350×600×2730；板厚20mm，门缝3mm，门套及安装净空待核。']};
  f.conditions=['图纸玄关鞋柜尺寸示意，实际入口门扇扫掠及柜门五金尚待核；不改变主层确定的入户外开。'];
  for(const id of['family-elec-s07','family-elec-s09','family-elec-s14']){
    const q=p.defaultFurniture.find(q=>q.id===id);if(!q)continue;move(q,X+W-T-4,q.cy,q.rot,revision);
    q.electricalDesign={...clone(q.electricalDesign),layoutRevision:revision,anchor:{...clone(q.electricalDesign.anchor),furnitureId:f.id,partId:'e_key_niche-niche-back',
      localCenterMm:[q.cx-f.cx,q.cy-f.cy,q.electricalDesign.centerHeightMm],baseHostDimensionsMm:[W,D,H],hostRotationDegrees:0,surfaceVerifiedAgainstCurrentModel:true,cabinetBoxAndPenetrationPending:true}};
  }
  return{outerRectMm:[X,Y,X+W,Y+D],heightMm:H,nicheMm:[920,1370]};
}
function verify(p,sourceBefore,{armchair,corner}){
  const get=id=>p.defaultFurniture.find(f=>f.id===id),sofa=get('family-f6'),tv=get('family-f7'),rug=get('family-living-rug');
  for(const id of['family-f6','family-f23','family-f24','family-f25','family-f26','family-f27']){
    const a=sourceBefore.defaultFurniture.find(f=>f.id===id),b=get(id);for(const k of['w','d','heightMm','purchasedProductId','color'])assert.deepEqual(b[k],a[k],'Purchased body unchanged '+id+'/'+k);
  }
  assert.equal(sofa.rot,180);assert.ok(Math.abs(sofa.cy+sofa.d/2-CAD.sofa.backY)<.002,'CAD sofa rear datum');
  assert.equal(tv.cx,5165);assert.equal(tv.cy-tv.d/2,6320);assert.ok(rug.d>2400&&rug.w>2700);
  const ac=footprint(get('family-living-aircon')),t=footprint(tv);assert.ok(ac.x>=t.x+t.w+30,'Cabinet AC clears retained TV cabinet');assert.equal(ac.x+ac.w,6800);
  if(armchair){const r=footprint(armchair);assert.ok(r.y>=t.y+t.d+60,'Compact chair stays clear of TV front');assert.ok(r.y+r.d<sofa.cy-sofa.d/2-1100,'Chair/sofa gap retained');assert.ok(r.x>=3400,'No chair in corridor mouth');}
  if(corner){assert.equal(corner.newSpec.cx,3420);assert.equal(corner.newSpec.cy,12080);}
  for(const id of['fit-dining_sideboard_wall','fit-entry_shoe_station']){
    const f=get(id);assert.equal(f.heightMm,2730);assert.equal(new Set(f.parts.map(q=>q.id)).size,f.parts.length);
    for(const q of f.parts){assert.ok(q.w>0&&q.d>0&&q.heightMm>0,'positive drawing panel '+q.id);assert.ok(q.x>=-f.w/2-.01&&q.x+q.w<=f.w/2+.01&&q.y>=-f.d/2-.01&&q.y+q.d<=f.d/2+.01,'panel fits new unscaled cabinet '+q.id);assert.ok(q.elevationMm>=0&&q.elevationMm+q.heightMm<=f.heightMm+.01,'panel under new model roof '+q.id);
      if(q.role==='led-strip'){const a=f.parts.find(p=>p.id===q.anchorPartId);assert.ok(a,'real light support '+q.id);assert.ok(Math.abs(a.elevationMm-q.elevationMm-q.heightMm)<.01,'LED under real board '+q.id);}}
  }
  assert.ok(!p.defaultFurniture.some(f=>f.type==='coffeetable'||f.type==='coffee-table'||/茶几/.test(f.name||'')),'Do not restore a coffee table from drawing');
}
function applyFamilyDrawingPublic(plan,options={}){
  const p=plan.schemes?plan.schemes.family:plan;assert.equal(p.id,'family');assert.ok(p.metadata.familyReferenceFinishUpdate,'Apply after six-reference finish');
  const before=clone(p),revision=options.revision||REVISION,get=id=>{const f=p.defaultFurniture.find(q=>q.id===id);assert.ok(f,'Public drawing target '+id);return f;};
  const sofa=get('family-f6'),tv=get('family-f7'),rug=get('family-living-rug'),ac=get('family-living-aircon'),table=get('family-f23'),cabinet=get('fit-dining_sideboard_wall');
  const oldTv=clone(tv),oldTable=clone(table),notes=[],omissions=[];
  const cabinetMapping=rebuildDrawingSideboard(cabinet,revision,options.sideboard),shoeMapping=rebuildDrawingShoe(p,revision);alignCounterAppliances(p,cabinet,revision);
  move(tv,5165,CAD.tvWall.y+10+tv.d/2,0,revision);addNote(tv,'2026-10-27：按DWG连续可见电视墙3270mm居中x5165，柜后留10mm；保留原2200×340矮柜及电视。');
  move(sofa,CAD.sofa.centerX,CAD.sofa.backY-sofa.d/2,180,revision);sofa.face='north';
  sofa.drawingReview={source:clone(SOURCE),drawingReference:clone(CAD.sofa),purchasedBodyPreserved:true,wallToBackMm:round(CAD.sofa.backY-CAD.tvWall.y),notFrontViewingDistance:true};
  addNote(sofa,'2026-10-27：按CAD沙发主体中点x5151.573、后背y9810.830；已购2410×980×830保持，朝北电视。3500是墙至后背，不是沙发前沿净距。');
  Object.assign(rug,{w:round(CAD.rug.x1-CAD.rug.x0),d:round(CAD.rug.y1-CAD.rug.y0)});move(rug,(CAD.rug.x0+CAD.rug.x1)/2,(CAD.rug.y0+CAD.rug.y1)/2,0,revision);
  rug.drawingReview={source:clone(SOURCE),outlineHandles:clone(CAD.rug.outlineHandles),occludedRectangleCompleted:true,notPurchasedProductSize:true};
  move(ac,6550,ac.cy,ac.rot,revision);addNote(ac,'2026-10-27：随东墙内面6800移至x6550，保留500×380机身；与居中电视柜横向净隔35mm，仅静态摆位，散热/检修仍待厂家。');
  const livingLamp=get('family-living-ceilinglight');move(livingLamp,rug.cx,rug.cy,livingLamp.rot,revision);livingLamp.elevationMm=2730-livingLamp.heightMm;addNote(livingLamp,'2026-10-27：随DWG地毯客厅区重定位，顶与2730模型顶平；已购907×577×110mm保持。灯位非放线批准。');
  const counter=cabinet.parts?.find(q=>q.id==='reference-west-central-countertop'),counterEast=counter?cabinet.cx+counter.x+counter.w:cabinet.cx-cabinet.w/2+400;
  move(table,counterEast+table.d/2,table.cy,90,revision);addNote(table,'2026-10-27：用户确认保留已购1400×780mm，西长边贴餐边柜台面边，不将图示1500×750当成已购规格。');
  for(const id of['family-f24','family-f25','family-f26','family-f27']){const f=get(id);move(f,f.cx+table.cx-oldTable.cx,f.cy+table.cy-oldTable.cy,f.rot,revision);}
  const diningLamp=get('family-dining-ceilinglight');move(diningLamp,table.cx,table.cy,diningLamp.rot,revision);diningLamp.elevationMm=2730-diningLamp.heightMm;
  const corner=retargetCornerChair(cabinet,get('family-f27'),3420,12080,revision);
  let armchair=null;if(options.addArmchair!==false){assert.ok(!p.defaultFurniture.some(f=>f.id==='drawing-living-armchair'),'Drawing armchair already applied');armchair=newArmchair(revision,options.armchair);p.defaultFurniture.push(armchair);}
  movePoint(p,'family-elec-p13',get('family-elec-p13').cx+tv.cx-oldTv.cx,CAD.tvWall.y+4,revision,'电视用途电源随新电视墙面与电视柜定位');
  movePoint(p,'family-elec-n04',get('family-elec-n04').cx+tv.cx-oldTv.cx,CAD.tvWall.y+4,revision,'电视弱电用途点随新电视墙面与电视柜定位');
  movePoint(p,'family-elec-p18',get('family-elec-p18').cx,CAD.tvWall.y+4,revision,'电视墙备用低位点跟随实际墙南面');
  movePoint(p,'family-elec-p14',6796,get('family-elec-p14').cy,revision,'柜机用途电源跟随东墙内面6800');
  movePoint(p,'family-elec-p15',6796,sofa.cy,revision,'沙发用途点留在真实东墙，纵向跟随新沙发；不是悬空背面的已装插座，接电方式待核');
  movePoint(p,'family-elec-p17',6796,get('family-elec-p17').cy,revision,'客厅东墙备用低位点跟随墙内面6800');
  notes.push('图纸PL03餐桌1500×750与业主已购1400×780冲突，依用户本轮确认保留已购机身；布局和灯位按实际尺寸重排。',
    '餐边柜依EL04/EL05重建2730高/900台/280悬浮/1640×600南返，窗端按业主唯一例外缩800；西直段采用图示4880减800=4080，不沿用旧源4090。保留180°功能但新门轴/原18mm内部板需定制重审。',
    '保留无茶几、无落地灯；新增图示紧凑单人沙发为可编辑暂估物件，并用实际保留电视柜做静态净空检验。',
    '3500.829937mm由DWG PL03标注端点及PL02后背板共同核对，后背y9810.829937，不把旧效果图或扫描像素当尺寸。');
  omissions.push({id:'kitchen-balcony-cross-window-conflict',status:'requires-owner-main-layer-choice',
    observed:{drawingNorthWindowWidthMm:890,oldTwoMachineHousingWidthMm:get('balcony_recess_housing').w,dryerBodyWidthMm:get('laundry_dryer').w,robotBodyWidthMm:get('balcony_robot').w},
    reason:'旧1114mm两机凹柜不能被当成可通过890mm新窗下开口；不能擅自扩窗或复制DWG中又标洗衣机的设备。厨房/阳台的结构由主层按CAD调整，设备回阳台或凹柜开口须明确。'},
    {id:'kitchen-fitout-exact-redesign',status:'not-silently-scaled',source:clone(CAD.kitchen),
      reason:'新厨房2420×2600及410×450烟道与旧2270×2620柜不同，须重建实板、600深台面、800冰箱槽/600电器柜/盆/DW分段，不能仅移动或整体缩放旧柜。'},
    {id:'drawing-cabinet-top-chain-and-hardware',status:'manufacturer-review-pending',reason:'900+700+三格330及20mm板共2670，按2730顶另留60收口；新600深转角的180功能门轴/18mm内部构件不是图纸已批五金。'});
  verify(p,before,{armchair,corner});
  for(const k of Object.keys(before))if(k!=='defaultFurniture')assert.deepEqual(p[k],before[k],'Public helper must not mutate plan architecture/metadata '+k);
  const oldBy=new Map(before.defaultFurniture.map(f=>[f.id,f])),newBy=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  const changedIds=p.defaultFurniture.filter(f=>oldBy.has(f.id)&&!isDeepStrictEqual(f,oldBy.get(f.id))).map(f=>f.id),newIds=p.defaultFurniture.filter(f=>!oldBy.has(f.id)).map(f=>f.id),removedIds=before.defaultFurniture.filter(f=>!newBy.has(f.id)).map(f=>f.id);
  return{revision,source:clone(SOURCE),mapping:{...clone(CAD),sideboard:cabinetMapping,shoe:shoeMapping},notes,omissions,cornerChairOperation:corner,
    previousFurniture:changedIds.concat(removedIds).map(id=>clone(oldBy.get(id))),previousFurnitureOrder:before.defaultFurniture.map(f=>f.id),previousPlanFields:{},
    changedFurnitureIds:changedIds,newFurnitureIds:newIds,removedFurnitureIds:removedIds,replacedFurnitureIds:[],
    preserveCustomPartsIds:['fit-dining_sideboard_wall','fit-entry_shoe_station'],preserveCustomSizeIds:['fit-dining_sideboard_wall','fit-entry_shoe_station'],
    migrationFields:Object.fromEntries(changedIds.map(id=>[id,fields(oldBy.get(id),newBy.get(id))]))};
}
module.exports={applyFamilyDrawingPublic,REVISION,SOURCE,CAD,footprint};
