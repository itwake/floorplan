'use strict';

// Scheme 2 construction-drawing furniture leaf. Architecture is supplied by
// the outer construction layer: no PDF pixels are converted to wall positions.
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const REVISION='family-drawing-bedrooms-20261027',META_KEY='familyDrawingBedroomsUpdate',clone=structuredClone;
const T=18,GAP=3,C={cream:'#F3EFE6',oak:'#C6AA83',pink:'#D6B8AF',metal:'#282522',light:'#FFF0C8'};
const SOURCE='业主提供施工图.pdf';
const r=n=>Math.round(n*1000)/1000;
const fields=(a,b)=>[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].filter(k=>k!=='id'&&!isDeepStrictEqual(a?.[k],b?.[k])).sort();
function worldRect(f){
  const a=(f.rot||0)*Math.PI/180,c=Math.abs(Math.cos(a))<1e-12?0:Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a))<1e-12?0:Math.abs(Math.sin(a));
  const w=f.w*c+f.d*s,d=f.w*s+f.d*c;return{x:r(f.cx-w/2),y:r(f.cy-d/2),w:r(w),d:r(d)};
}
function bounds(room){
  assert.ok(room?.poly?.length,'Drawing bedroom requires a room polygon');
  const xs=room.poly.map(q=>q[0]),ys=room.poly.map(q=>q[1]);
  return{westMm:Math.min(...xs),eastMm:Math.max(...xs),northMm:Math.min(...ys),southMm:Math.max(...ys)};
}
function anchorsFor(p,supplied={}){
  const out={};for(const[key,id]of Object.entries({master:'room_a',child:'room_b',study:'room_c'})){
    const b=bounds(p.ROOMS.find(q=>q.id===id));out[key]={...b,...clone(supplied[key]||{})};
    const a=out[key];for(const k of['westMm','eastMm','northMm','southMm'])assert.ok(Number.isFinite(a[k]),key+' '+k);
    assert.ok(a.eastMm>a.westMm&&a.southMm>a.northMm,key+' invalid supplied anchors');
  }
  // Master is L shaped: its east bed-head wall stops before the entrance.
  out.master.bedWallLengthMm=supplied.master?.bedWallLengthMm??3020;
  return out;
}
function mark(f,patch,notes){
  Object.assign(f,patch,{layoutRevision:REVISION,dimensionStatus:'construction-drawing-dimensions-with-pending-details'});
  f.sourceFootprintMm=worldRect(f);if(notes)f.notes=notes;return f;
}
function part(f,id,x,y,w,d,z,h,role,label,color=C.cream,material='Cream',extra={}){
  return{id:f.id+'-drawing-'+id,x:r(x),y:r(y),w:r(w),d:r(d),elevationMm:r(z),heightMm:r(h),role,label,color,material,face:'south',...extra};
}
function carcass(out,f,id,x,w,H,{floor=true}={}){
  const y=-275;
  out.push(part(f,id+'-back',x,y,w,T,0,H,'cabinet-back','18mm柜背 · 深550'),
    part(f,id+'-left',x,y+T,T,514,0,H,'cabinet-side','18mm端板'),
    part(f,id+'-right',x+w-T,y+T,T,514,0,H,'cabinet-side','18mm端板'),
    part(f,id+'-top',x+T,y+T,w-2*T,514,H-T,T,'cabinet-top','18mm顶板'));
  if(floor)out.push(part(f,id+'-bottom',x+T,y+T,w-2*T,514,0,T,'cabinet-bottom','18mm底板'));
}
function doors(out,f,id,x,w,bottom,H,count,label){
  const cell=w/count;for(let i=0;i<count;i++)out.push(part(f,id+'-'+i,x+i*cell+GAP/2,257,cell-GAP,T,bottom+GAP/2,H-GAP,'door-hinged',label,
    C.cream,'Cream',{doorStyle:'hinged',panelIndex:i,hingeHardwarePending:true,openingOperationNotValidated:true}));
}
function mainWardrobe(f,a){
  // Local +X is north after the existing 270 degree rotation. The 800mm
  // north dressing bay is OPEN below2060; it is not a floor-to-ceiling block.
  mark(f,{name:'主卧施工图衣柜与梳妆上柜 · 2220+800',cx:a.westMm+275,cy:a.northMm+1510,w:3020,d:550,rot:270,
    heightMm:2790,elevationMm:0,roomId:'room_a',face:'east',doorStyle:'hinged',baseWidthMm:3020,baseDepthMm:550,baseHeightMm:2790,
    cabinetRevision:REVISION,referenceStyle:{revision:REVISION,variant:'drawing-master-wardrobe',source:SOURCE,pages:[8,25,26],
      notPurchasedModel:true,installationApproved:false,preserveExistingEnvelope:false,masterOldOpenGarmentsRemoved:true}},
    '按PL03/EL09：西墙总3020×550，南2220封闭柜、北800梳妆位上柜；柜顶2790、上柜730、下口2060。北800下方留空，独立梳妆桌750高。个别门叶505/430标注合2225与总2220差5，当前五等分门缝仅示意，厂家须核实。');
  const out=[],X=-1510,W=2220,S=2060;
  carcass(out,f,'closed',X,W,2790);
  out.push(part(f,'closed-upper-floor',X+T,-257,W-2*T,514,S,T,'cabinet-shelf','2060mm上柜分界 · 上层730'),
    part(f,'dressing-upper-back',X+W,-275,800,T,S,730,'cabinet-back','梳妆台上柜薄背'),
    part(f,'dressing-upper-north-side',1510-T,-257,T,514,S,730,'cabinet-side','北端吊柜端板'),
    part(f,'dressing-upper-bottom',X+W,-257,800-T,514,S,T,'cabinet-bottom','梳妆台上柜底 · 下方800留空'),
    part(f,'dressing-upper-top',X+W,-257,800-T,514,2790-T,T,'cabinet-top','梳妆台上柜顶'));
  doors(out,f,'closed-lower-door',X,W,T,S-T,5,'图示平开衣柜下门 · 五等分缝仅示意');
  doors(out,f,'closed-upper-door',X,W,S+T,730-T,5,'主卧上柜平板门 · 高730分区');
  doors(out,f,'dressing-upper-door',X+W,800,S+T,730-T,2,'梳妆位上两扇平板门');
  const span=(W-4*T)/3;
  for(let i=1;i<3;i++)out.push(part(f,'closed-divider-'+i,X+T+i*(span+T)-T,-257,T,514,T,S-T,'cabinet-divider','18mm挂衣内分区'));
  for(let i=0;i<2;i++)out.push(part(f,'closed-hanging-'+i,X+T+i*(span+T)+24,-8,span-48,16,1850,16,'hanging-rail','主柜挂衣杆 · 内部待深化',C.metal,'WarmGrayMetal'));
  for(const z of[450,900,1350,1800])out.push(part(f,'closed-fold-'+z,X+T+2*(span+T),-257,span,514,z,T,'cabinet-shelf','18mm叠衣层板 · 内部待深化'));
  f.parts=out;f.cabinetDesign={revision:REVISION,title:f.name,status:'drawing-exterior-interior-concept',boardThicknessMm:T,doorGapMm:GAP,
    palette:{door:C.cream,wood:C.oak},faces:[{face:'south',lengthMm:3020,depthMm:550,label:'主卧西墙柜体 · 南2220衣柜+北800梳妆吊柜'}],
    dimensions:['总3020×550×2790；封闭柜2220、梳妆800；上层730，下口2060；梳妆台高750。'],
    sourcePages:[8,25,26],closedRunLengthMm:2220,dressingBayWidthMm:800,upperBandMm:[2060,2790],
    openDressingBayBelowMm:2060,individualDoorWidthsPending:true,nominalConflictingDoorWidthsMm:[505,430,430,430,430],
    buildableConfirmed:false};
  f.conditions=['外包及分区采用施工图数值；18mm板和3mm门缝为现有模型构造参数，五金、承重和收口待定制方深化。',
    '图示门叶宽标合2225与总2220差5，当前等分门不是确认加工尺寸。',
    '真实床架长2100时柜前带比图纸按2000床垫标的600减少100；本层给出实际几何，不保证开门站位舒适。'];
  return f;
}
function childWardrobe(f,a){
  mark(f,{name:'次卧施工图东墙衣柜 · 第三列拱形开放格',cx:a.eastMm-275,cy:a.northMm+1050,w:2100,d:550,rot:90,
    heightMm:2790,elevationMm:0,roomId:'room_b',face:'west',doorStyle:'hinged',baseWidthMm:2100,baseDepthMm:550,baseHeightMm:2790,
    cabinetRevision:REVISION,referenceStyle:{revision:REVISION,variant:'drawing-child-arch-wardrobe',source:SOURCE,pages:[8,27],
      realOpenNiche:true,nicheWidthMm:525,nicheLocation:'third-525-module-from-north',installationApproved:false}},
    '按PL03/EL10：东墙柜2100×550×2790，四列525，第三列为真实开放拱格，其余三列封闭；上层330、下层2460；南端至房南墙理论余980。原460mm窗端拱龛及旧555净距已被此版替代。');
  const out=[],X=-1050,H=2790,S=2460;
  carcass(out,f,'outer',X,2100,H);
  out.push(part(f,'upper-floor',X+T,-257,2064,514,S,T,'cabinet-shelf','2460mm上柜分层 · 上层330'));
  for(let i=1;i<4;i++)out.push(part(f,'divider-'+i,X+i*525-T/2,-257,T,514,T,S-T,'cabinet-divider','四列525分区 · 18mm竖板'));
  for(const i of[0,1,3]){
    doors(out,f,'lower-door-'+i,X+i*525,525,T,S-T,1,'次卧525mm封闭平开下门');
    for(const z of(i===3?[450,900,1350,1800]:[650]))out.push(part(f,'fold-'+i+'-'+z,X+i*525+T,-257,525-2*T,514,z,T,'cabinet-shelf','18mm内层板 · 内部待深化'));
    if(i<2)out.push(part(f,'rail-'+i,X+i*525+T+20,-8,525-2*T-40,16,2160,16,'hanging-rail','525列挂衣杆',C.metal,'WarmGrayMetal'));
  }
  doors(out,f,'upper-door',X,2100,S+T,H-S-T,4,'330mm高上柜分区门');
  const nx=X+2*525,clear=489,radius=clear/2,bottom=180,apex=2400,spring=apex-radius;
  out.push(part(f,'arch-back',nx+T,-257,clear,T,bottom,apex-bottom,'arched-niche-back','第三列18mm粉色拱背 · 非实心占位',C.pink,'PaintPink',
    {shape:'arched-back',archRadiusMm:radius,archRiseMm:radius,archSpringHeightMm:spring-bottom,openNiche:true,backThicknessMm:T}),
    part(f,'arch-spandrel',nx,257,525,T,spring,S-spring,'arched-niche-spandrel','真实拱洞18mm前饰板',C.cream,'Cream',
      {shape:'arch-spandrel',openingWidthMm:clear,openingInsetMm:T,archRadiusMm:radius,archRiseMm:radius,openingBelowPart:true,openNiche:true,solidFiller:false}),
    part(f,'arch-bottom',nx+T,-239,clear,496,bottom,T,'cabinet-bottom','拱格18mm底板'));
  for(const z of[500,900,1300,1700])out.push(part(f,'arch-shelf-'+z,nx+T,-239,clear,496,z,T,'display-shelf','第三列拱格18mm白层板 · '+z));
  f.parts=out;f.cabinetDesign={revision:REVISION,title:f.name,status:'drawing-exterior-interior-concept',boardThicknessMm:T,doorGapMm:GAP,
    palette:{door:C.cream,wood:C.oak,pink:C.pink},faces:[{face:'south',lengthMm:2100,depthMm:550,label:'次卧东墙 · 四列525'}],
    sourcePages:[8,27],columnWidthsMm:[525,525,525,525],openArchColumnIndex:2,upperBandMm:[2460,2790],
    dimensions:['2100×550×2790，四列525，第三列拱格；图示上柜330、下层2460。'],buildableConfirmed:false};
  f.conditions=['外包2100×550×2790及525分列来自施工图；拱半径、高度、层板与18mm细分沿用参考深化，图纸未标出其加工值。',
    '柜前采用床架真实2100外长计算；平开门、把手、站位、开柜和避让条件需定制方核验。'];return f;
}
function studyShelves(f){
  const out=[],x=-f.w/2,y=-f.d/2;
  for(const z of[1500,1950]){
    const q=part(f,'shelf-'+z,x,y,f.w,f.d,z,T,'display-shelf','书房1300通长18mm悬板 · '+z,C.oak,'OakLight',{face:'north'});out.push(q,
      part(f,'led-'+z,x+24,y+35,f.w-48,8,z-4,4,'led-strip','真实层板底4mm灯带',C.light,'Light',
        {face:'north',anchorPartId:q.id,anchor:'panel-underside',installationApproved:false}));
    for(let i=0;i<3;i++)out.push(part(f,'bracket-'+z+'-'+i,x+60+i*((f.w-150)/2),f.d/2-12,30,12,z-34,34,'hidden-shelf-support','后沿隐藏支架示意',C.metal,'WarmGrayMetal',
      {face:'north',hiddenSupport:true,structuralCapacityConfirmed:false}));
  }
  f.parts=out;f.baseWidthMm=f.w;f.baseDepthMm=f.d;f.baseHeightMm=f.heightMm;f.cabinetRevision=REVISION;
  f.cabinetDesign={...clone(f.cabinetDesign),revision:REVISION,title:'施工图1300桌上两悬板',faces:[{face:'north',lengthMm:f.w,depthMm:f.d}],
    dimensions:[f.w+'×'+f.d+'mm投影；两悬板保留1500/1950mm板底及18mm板厚，图纸未给书架高度细分。']};
}
function pointMove(f,x,y,face,{centerHeightMm,hostId,notes}={}){
  const ed=f.electricalDesign;assert.ok(ed);const z=centerHeightMm??ed.centerHeightMm;
  mark(f,{cx:x,cy:y,rot:face==='east'?270:face==='west'?90:face==='north'?180:0,elevationMm:z-f.heightMm/2},notes||f.notes);
  f.electricalDesign={...clone(ed),face,centerHeightMm:z,layoutRevision:REVISION,anchor:{kind:'drawing-room-surface',
    surfaceVerifiedAgainstCurrentModel:false,wallIndexPending:true,...(hostId?{hostFurnitureId:hostId}:{} )}};
}
function moveServices(p,a,mode){
  const get=id=>p.defaultFurniture.find(f=>f.id===id),m=a.master,b=a.child,c=a.study;
  // Optional because the outer layer may own the complete SD01/SD02 rewrite.
  if(mode==='none')return[];
  const moved=[];
  for(const[key,roomId]of[['master','room_a'],['child','room_b'],['study','room_c']]){
    const f=get('family-acwall-'+roomId);if(!f)continue;const q=a[key],old=clone(f);
    const windowId=roomId==='room_a'?'window_a':roomId==='room_b'?'window_b':'window_c';
    const win=p.WIN_META?.find(n=>n.id===windowId),axis=win?.sourceAxisMm;
    assert.ok(axis?.length===4,'AC relocation requires a located window axis '+windowId);
    const west=roomId==='room_c',center=west?(axis[1]+axis[3])/2:(axis[0]+axis[2])/2;
    mark(f,{cx:west?q.westMm+f.d/2:center,cy:west?center:q.northMm+f.d/2},old.notes);const R=worldRect(f);
    f.applianceDesign={...clone(old.applianceDesign),layoutRevision:REVISION,windowPlacement:{...clone(old.applianceDesign?.windowPlacement),
      bodyRectMm:[R.x,R.y,R.x+R.w,R.y+R.d],windowHeadMm:win.headMm,bodyAboveWindowHeadMm:f.elevationMm-win.headMm,
      topToRoomCeilingMm:(p.ROOMS.find(n=>n.id===roomId)?.heightMm||2790)-f.elevationMm-f.heightMm,
      status:'wall-reanchored-window-height-and-installation-pending'}};moved.push(f.id);
  }
  if(mode==='ac-only')return moved;
  const rows=[
    ['p01',m.eastMm-4,m.northMm+m.bedWallLengthMm-150,'west',700,'draft-night-a'],
    ['p02',m.westMm+4,m.northMm+400,'east',1000,'draft-desk-a'],
    ['n01',m.westMm+4,m.northMm+600,'east',1000,'draft-desk-a'],
    ['p04',m.westMm+4,m.northMm+3220,'east',350,null],
    ['p05',b.westMm+4,b.southMm-200,'east',700,'draft-night-b'],
    ['p06',b.westMm+4,b.northMm+300,'east',1000,'draft-desk-b'],
    ['n02',b.westMm+4,b.northMm+500,'east',1000,'draft-desk-b'],
    ['p08',b.eastMm-4,b.northMm+2300,'west',350,null],
    ['p09',c.westMm+330,c.southMm-4,'north',1000,'study_full_desk'],
    ['p10',c.westMm+830,c.southMm-4,'north',1000,'study_full_desk'],
    ['n03',c.westMm+1100,c.southMm-4,'north',1000,'study_full_desk'],
    ['p11',c.westMm+480,c.northMm+4,'south',350,'study_north_sofa']
  ];
  for(const[id,x,y,face,z,host]of rows){const f=get('family-elec-'+id);if(!f)continue;pointMove(f,x,y,face,{centerHeightMm:z,hostId:host,
    notes:'2026-10-27随施工图卧室/书桌重新锚定；面板高度采用SD02相应用途值，具体沿墙位置与回路由外层水电图核对。'});moved.push(f.id);}
  for(const[id,roomId]of[['p03','room_a'],['p07','room_b'],['p12','room_c']]){
    const f=get('family-elec-'+id),ac=get('family-acwall-'+roomId);if(!f||!ac)continue;const q=worldRect(ac);
    const west=roomId==='room_c';pointMove(f,west?q.x+4:q.x+q.w+80,west?q.y+q.d+80:q.y+4,west?'east':'south',{centerHeightMm:2300,hostId:ac.id});moved.push(f.id);
  }
  return moved;
}
function assertParts(f){
  assert.equal(new Set(f.parts.map(q=>q.id)).size,f.parts.length,'Unique drawing panel IDs '+f.id);
  for(const q of f.parts){
    assert.ok(q.w>0&&q.d>0&&q.heightMm>0,'Positive drawing panel '+q.id);
    assert.ok(q.x>=-f.w/2-.001&&q.x+q.w<=f.w/2+.001&&q.y>=-f.d/2-.001&&q.y+q.d<=f.d/2+.001,'Drawing panel in envelope '+q.id);
    assert.ok(q.elevationMm>=0&&q.elevationMm+q.heightMm<=f.heightMm+.001,'Drawing panel under roof '+q.id);
    if(q.role==='led-strip'){const host=f.parts.find(n=>n.id===q.anchorPartId);assert.ok(host&&Math.abs(q.elevationMm+q.heightMm-host.elevationMm)<.001,'LED actually anchored '+q.id);}
  }
}
function applyFamilyDrawingBedrooms(bundle,options={}){
  const p=bundle.schemes?.family||bundle;assert.ok(p.defaultFurniture&&p.metadata&&p.ROOMS,'Scheme 2 furniture plan required');
  assert.ok(!p.metadata[META_KEY],'Drawing bedroom leaf already applied');const old=clone(p),a=anchorsFor(p,options.anchors),get=id=>p.defaultFurniture.find(f=>f.id===id);
  const required=['bed_a','bed_b','family-f3','family-f1','draft-desk-a','draft-desk-b','draft-chair-a','draft-chair-b','draft-night-a','draft-night-b',
    'study_full_desk','study_window_return','study_north_sofa','fit-study_bookwall','family-f5'];for(const id of required)assert.ok(get(id),'Drawing target missing '+id);
  const m=a.master,b=a.child,c=a.study;
  mainWardrobe(get('family-f3'),m);childWardrobe(get('family-f1'),b);
  const ba=get('bed_a'),bb=get('bed_b');
  assert.deepEqual([ba.w,ba.d,ba.heightMm,ba.mattressMm],[1900,2100,1080,[1800,2000]],'Keep actual master frame/mattress');
  assert.deepEqual([bb.w,bb.d,bb.heightMm,bb.mattressMm],[1600,2100,1080,[1500,2000]],'Keep actual child frame/mattress');
  mark(ba,{cx:m.eastMm-1050,cy:m.northMm+640+900,rot:90},'床垫1800×2000与床架1900×2100保留；按图EL08床垫北640/南580定位，床架每侧多50。柜前净距以2100床架外长计算。');
  mark(bb,{cx:b.westMm+1050,cy:b.northMm+950+750,rot:270},'床垫1500×2000与床架1600×2100保留；按图PL03北950/南630定位，床架每侧多50。');
  mark(get('draft-desk-a'),{name:'主卧北端800梳妆台 · 接西墙衣柜',cx:m.westMm+275,cy:m.northMm+400,w:800,d:550,rot:270,face:'east',heightMm:750},'EL09北端800×550梳妆台，台面750高；上方730吊柜归入family-f3，下面不放实心高柜。');
  mark(get('draft-chair-a'),{cx:m.westMm+800,cy:m.northMm+400,rot:90,face:'west'},'梳妆椅朝西，保原450×450占位；拉椅及实物待核。');
  mark(get('draft-night-a'),{cx:m.eastMm-225,cy:m.northMm+m.bedWallLengthMm-150},'主卧床南侧450×300床头柜，靠东床头墙；图纸成品床头柜具体尺寸待核。');
  mark(get('draft-desk-b'),{name:'次卧北侧800小桌 · 西墙',cx:b.westMm+275,cy:b.northMm+400,w:800,d:550,rot:270,face:'east',heightMm:750},'次卧北侧书桌按PL03位置；图未标桌宽深，暂800×550以保床架北缘100间隙，原1000桌会侵入床架。');
  mark(get('draft-chair-b'),{cx:b.westMm+800,cy:b.northMm+400,rot:90,face:'west'},'次卧北桌椅保450×450；实物与退椅待核。');
  mark(get('draft-night-b'),{cx:b.westMm+225,cy:b.southMm-200},'次卧床南侧450×400床头柜，靠西床头墙；图纸成品尺寸待核。');
  const studyDesk=get('study_full_desk'),returnDesk=get('study_window_return'),shelf=get('fit-study_bookwall');
  mark(studyDesk,{name:'书房7字桌 · 图示南段1300×550',cx:c.westMm+650,cy:c.southMm-275,w:1300,d:550,rot:0,face:'north',heightMm:740},'PL03图示南桌长1300；550深、740高沿用原暂估，南墙位置跟随外层实测架构。');
  mark(returnDesk,{cx:c.westMm+250,cy:c.southMm-550-305,w:500,d:610,rot:0,face:'east',heightMm:740},'保留7字西窗返桌500×610，图纸未标返桌净尺寸，明确待核。');
  mark(get('family-f5'),{cx:c.westMm+750,cy:c.southMm-850,rot:0,face:'south'},'书房南桌椅跟随1300桌；原实物占位480×500保留。');
  mark(get('study_north_sofa'),{cx:(c.westMm+c.eastMm)/2,cy:c.northMm+425,w:1900,d:850,roomId:'room_c'},'PL03北墙沙发床长1900；深850、高830沿用原暂估，展开尺寸图未给。');
  mark(shelf,{cx:c.westMm+650,cy:c.southMm-shelf.d/2,w:1300,rot:0},'两木悬板长度随南桌改1300，层板高度与18mm细分沿用原方案；图纸未标层板加工尺寸。');studyShelves(shelf);
  const newIds=[],removed=[];
  if(options.addMasterNorthNightstand!==false){
    const id='drawing-night-a-north';assert.ok(!get(id),'Drawing north nightstand duplicates '+id);
    const f=clone(get('draft-night-a'));Object.assign(f,{id,sourceId:id,name:'主卧床北侧床头柜 · 450×300暂估',cy:m.northMm+150});
    mark(f,{},'EL08床两侧均有成品床头柜；此北侧尺寸沿用南柜450×300暂估，图中未标加工尺寸。');p.defaultFurniture.push(f);newIds.push(id);
  }
  if(options.removeOldBayTea!==false){const f=get('fit-bay_b_tea');if(f){removed.push(clone(f));p.defaultFurniture=p.defaultFurniture.filter(q=>q.id!==f.id);}}
  const serviceMode=options.services||'none',serviceIds=moveServices(p,a,serviceMode);
  for(const f of[get('family-f3'),get('family-f1'),shelf])assertParts(f);
  const prior=new Map(old.defaultFurniture.map(f=>[f.id,f])),changedIds=p.defaultFurniture.filter(f=>prior.has(f.id)&&!isDeepStrictEqual(f,prior.get(f.id))).map(f=>f.id);
  const gapMaster=r(worldRect(ba).x-(m.westMm+550)),gapChild=r((b.eastMm-550)-(worldRect(bb).x+worldRect(bb).w));
  const expected={masterEastWestMm:3150,masterBedHeadWallMm:3020,childEastWestMm:3410,childNorthSouthMm:3080,studyEastWestMm:2300,studyNorthSouthMm:2730};
  const actual={masterEastWestMm:m.eastMm-m.westMm,masterBedHeadWallMm:m.bedWallLengthMm,childEastWestMm:b.eastMm-b.westMm,
    childNorthSouthMm:b.southMm-b.northMm,studyEastWestMm:c.eastMm-c.westMm,studyNorthSouthMm:c.southMm-c.northMm};
  const unresolved=Object.keys(expected).filter(k=>Math.abs(expected[k]-actual[k])>.01).map(k=>({field:k,drawingMm:expected[k],anchorMm:actual[k]}));
  p.metadata[META_KEY]={id:REVISION,date:'2026-10-27',title:'方案2 · 施工图卧室与书房家具',sourceFile:SOURCE,sourcePages:[7,8,11,25,26,27],
    planOrientation:'north-right-in-pdf/north-up-in-model',architectureUnchanged:true,windowDimensionsUnchanged:true,sourceSnapshotsUnchanged:true,
    anchors:clone(a),expectedRoomDimensionsMm:expected,actualAnchorDimensionsMm:actual,unresolvedRoomDimensions:unresolved,
    servicesMode:serviceMode,serviceFurnitureIds:serviceIds,changedFurnitureIds:changedIds,newFurnitureIds:newIds,removedFurnitureIds:removed.map(f=>f.id),
    previousFurniture:old.defaultFurniture.filter(f=>changedIds.includes(f.id)||removed.some(q=>q.id===f.id)).map(f=>clone(f)),previousFurnitureOrder:old.defaultFurniture.map(f=>f.id),
    previousPlanFields:{},previousMetadataFields:{},migrationFields:Object.fromEntries(changedIds.map(id=>[id,fields(prior.get(id),p.defaultFurniture.find(f=>f.id===id))])),
    clearancesMm:{masterFrameToWardrobe:gapMaster,childFrameToWardrobe:gapChild,childDeskToFrame:worldRect(bb).y-(b.northMm+800),
      studyFutureBedFootToSouthDesk:c.southMm-550-(c.northMm+2100),studyFutureBedSideToWestReturn:c.eastMm-1600-(c.westMm+500)},
    dressingAnchors:{masterBedRect:worldRect(ba),childBedRect:worldRect(bb),masterWallEastMm:m.eastMm,childWallWestMm:b.westMm,
      studyNorthWallYmm:c.northMm,masterDressingRect:worldRect(get('draft-desk-a')),wardrobeOldGarmentsDisabled:true},
    pending:['次卧书桌800×550、返桌500×610、床头柜和内部板细分未标加工尺寸，沿用/暂估并标注。','主柜五扇门宽标合计与总宽相差5mm，细分待厂家复核。',
      '主柜下方梳妆空区与独立桌为有意外接框重叠，不能把整柜3020外包当实心占地。','两卧及书房窗洞高未见明确竖向尺寸，此模块保留原窗高与窗台。',
      '墙、门、窗、梁位由外层DWG/施工图架构负责；本层只锚定家具，不把室内18mm板当成建筑墙。','卧室三控、回路、暗盒、卫浴保护区与全屋电位统一由外层SD01/SD02复核。']};
  for(const k of Object.keys(old))if(!['defaultFurniture','metadata'].includes(k))assert.deepEqual(p[k],old[k],'Drawing bedroom keeps architecture '+k);
  for(const k of Object.keys(old.metadata))assert.deepEqual(p.metadata[k],old.metadata[k],'Drawing bedroom keeps history '+k);
  assert.deepEqual(beforeFamilyDrawingBedrooms(p),old,'Drawing bedroom exact rollback');return bundle;
}
function beforeFamilyDrawingBedrooms(value){
  const out=clone(value),p=out.schemes?.family||out,m=p?.metadata?.[META_KEY];if(!m)return out;
  const previous=new Map(m.previousFurniture.map(f=>[f.id,f])),now=new Map(p.defaultFurniture.map(f=>[f.id,f]));
  p.defaultFurniture=m.previousFurnitureOrder.map(id=>clone(previous.get(id)||now.get(id)));delete p.metadata[META_KEY];return out;
}
module.exports={applyFamilyDrawingBedrooms,beforeFamilyDrawingBedrooms,REVISION,META_KEY,worldRect,anchorsFor,assertParts};
