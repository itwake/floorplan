'use strict';

// A second, source-preserving detail layer for the user's October 8 reference.
// Only the restaurant cabinet changes; its horizontal envelope never changes.
// All coordinates are mm. On an east-facing cabinet s grows north -> south,
// which is RIGHT -> LEFT when standing in the room and looking at the facade.
const REVISION='sideboard-reference-v2';
const PALETTE={door:'#F4F1E9',wood:'#CDB594',counter:'#CDB594',metal:'#9D9386',light:'#FFF1CF'};
const T=18,GAP=3,HEIGHT=2700,COUNTER=850,UPPER=1500;
const r=n=>Math.round(n*1000)/1000;
const mm=n=>r(Number(n)*10);
const len=q=>/east|west/.test(q.face)?q.d:q.w;
const dep=q=>/east|west/.test(q.face)?q.w:q.d;
function fromSource(p){return {id:p.id,x:mm(p.x),y:mm(p.y),w:mm(p.w),d:mm(p.d),face:p.face||'east',z:mm(p.zCm||0),h:mm(p.hCm)};}
function region(q,s,L,id){return /east|west/.test(q.face)?{...q,id,y:q.y+s,d:L}:{...q,id,x:q.x+s,w:L};}
function piece(q,s,v,z,L,D,H,role,label,color=PALETTE.door,id=role,extra={}){
  let x,y,w,d;
  if(q.face==='east'){x=q.x+q.w-v-D;y=q.y+s;w=D;d=L;}
  else if(q.face==='west'){x=q.x+v;y=q.y+s;w=D;d=L;}
  else if(q.face==='north'){x=q.x+s;y=q.y+v;w=L;d=D;}
  else{x=q.x+s;y=q.y+q.d-v-D;w=L;d=D;}
  return {id:q.id+'-'+id,x:r(x),y:r(y),w:r(w),d:r(d),elevationMm:r(z),heightMm:r(H),role,label,color,
    material:color===PALETTE.wood?'OakLight':color===PALETTE.light?'Light':color===PALETTE.metal?'WarmGrayMetal':'Cream',face:q.face,...extra};
}
function carcass(q,z,H,{back=PALETTE.door,frontReserve=42,top=true,bottom=true,shelves=[]}={}){
  const L=len(q),D=dep(q),out=[];
  // Side/back/upper/lower plates meet at butt joints, rather than overlapping.
  out.push(piece(q,0,frontReserve,z,T,D-frontReserve,H,'cabinet-side','18mm柜侧板',PALETTE.door,'side-0'),
    piece(q,L-T,frontReserve,z,T,D-frontReserve,H,'cabinet-side','18mm柜侧板',PALETTE.door,'side-1'),
    piece(q,T,D-T,z,L-2*T,T,H,'cabinet-back','独立18mm柜背板',back,'back'));
  if(bottom)out.push(piece(q,T,frontReserve,z,L-2*T,D-T-frontReserve,T,'cabinet-bottom','18mm柜底板',PALETTE.door,'bottom'));
  if(top)out.push(piece(q,T,frontReserve,z+H-T,L-2*T,D-T-frontReserve,T,'cabinet-top','18mm柜顶板',PALETTE.door,'top'));
  for(const [i,h]of shelves.entries())out.push(piece(q,T,frontReserve,z+h,L-2*T,D-T-frontReserve,T,'cabinet-shelf','可调储物层板',PALETTE.door,'shelf-'+i));
  return out;
}
function fronts(q,z,H,{style='sliding',color=PALETTE.door,count=Math.max(2,Math.ceil(len(q)/650))}={}){
  const L=len(q),span=L/count,out=[];
  for(let i=0;i<count;i++){
    const v=style==='sliding'?(i%2)*20:0;
    out.push(piece(q,i*span+GAP/2,v,z+GAP/2,span-GAP,T,H-GAP,style==='sliding'?'door-sliding':'door-hinged',
      color===PALETTE.wood?'原木无明把手吊柜门':style==='sliding'?'奶白滑门 · 不外占餐区':'奶白通顶高柜门',color,'front-'+i,{doorStyle:style,panelIndex:i,handle:'recessed-edge'}));
  }
  return out;
}
function light(q,s,v,board,L,id,{wash=false,label='嵌入式暖光灯带 · 固定在层板底面'}={}){
  return piece(q,s,v,board.elevationMm-4,L,8,4,'led-strip',label,PALETTE.light,id,
    {anchorPartId:board.id,anchor:'panel-underside',insetMm:35,lightWash:wash,ledGroup:wash?'main-niche':'display'});
}
function tall(q,{style='hinged'}={}){
  const L=len(q),out=carcass(q,0,HEIGHT,{shelves:[500,1000,1500,2000],frontReserve:style==='sliding'?42:20});
  out.push(...fronts(q,0,HEIGHT,{style,count:style==='sliding'?Math.max(2,Math.ceil(L/550)):Math.max(1,Math.ceil(L/550))}));
  return out;
}
function roundedEnd(q){
  // This is a thin-walled cabinet skin, not a solid 2700-mm block. The renderer
  // extrudes an annular rounded plan, with independent 18-mm top and bottom.
  return [piece(q,0,0,T,len(q),dep(q),HEIGHT-2*T,'rounded-end-shell','奶白圆弧收口端柜 · 18mm薄壁概念',PALETTE.door,'skin',
      {shape:'rounded-shell',radiusMm:60,wallThicknessMm:T,usableStorage:false}),
    piece(q,0,0,0,len(q),dep(q),T,'cabinet-bottom','圆弧端柜18mm底板',PALETTE.door,'bottom',{shape:'rounded-plan-board',radiusMm:60}),
    piece(q,0,0,HEIGHT-T,len(q),dep(q),T,'cabinet-top','圆弧端柜18mm通顶盖板',PALETTE.door,'top',{shape:'rounded-plan-board',radiusMm:60})];
}
function displayTower(q){
  const L=len(q),D=dep(q),out=carcass(q,0,HEIGHT,{back:PALETTE.wood,frontReserve:0,shelves:[]});
  const shelves=[540,1080,1620,2160].map((z,i)=>piece(q,T,0,z,L-2*T,D-T,T,'display-shelf','原木竖向展示层板',PALETTE.wood,'display-shelf-'+i));
  out.push(...shelves);
  const cap=out.find(p=>p.id===q.id+'-top');
  for(const [i,board]of [...shelves,cap].entries())out.push(light(q,T+8,35,board,L-2*T-16,'display-light-'+i));
  // Actual A5/A6-sized books, instead of a volume that fills the open cubby.
  for(let i=0;i<4;i++)out.push(piece(q,T+20+i*26,D-T-145,18,22,145,210+i*9,'display-book','小型书册示意 · 非承重校核',i%2?PALETTE.door:PALETTE.wood,'book-'+i,{material:'BookPaper'}));
  return out;
}
function grille(q){
  const L=len(q),D=dep(q),out=[piece(q,0,21,0,L,6,HEIGHT,'grille-back','竖木格栅背衬 · 不超出柜面',PALETTE.wood,'back')];
  const pitch=18,width=9,count=Math.floor((L-12)/pitch),offset=(L-(count-1)*pitch-width)/2;
  for(let i=0;i<count;i++)out.push(piece(q,offset+i*pitch,0,0,width,21,HEIGHT,'wood-slat','9mm竖向原木格栅 · 间隔9mm',PALETTE.wood,'slat-'+i));
  // The unused volume behind the decorative end is deliberately not labelled
  // as storage or furnished with an imaginary access door.
  out.push(piece(q,0,D-T,0,L,T,HEIGHT,'cabinet-back','格栅端部封闭背板 · 不计可用容量',PALETTE.door,'rear'));
  return out;
}
function drawerColumn(q,H=COUNTER-T){
  const L=len(q),D=dep(q),out=[],span=H/3;
  for(let i=0;i<3;i++){
    const z=i*span;
    out.push(piece(q,GAP/2,0,z+GAP/2,L-GAP,T,span-GAP,'drawer-front','奶白三层餐具抽屉 · 最大拉出250mm',PALETTE.door,'drawer-front-'+i,
      {maxExtensionMm:250,drawerLayer:i+1,placement:'north-safe-zone'}));
    const bx=T,innerL=L-2*T,frontV=42,rearV=D-2*T-10,bz=z+20,bh=span-40;
    out.push(piece(q,bx,frontV,bz,innerL,rearV-frontV,T,'drawer-box','18mm原木抽屉底板',PALETTE.wood,'drawer-floor-'+i),
      piece(q,bx,frontV,bz+T,T,rearV-frontV,bh-T,'drawer-box','18mm抽屉左侧板',PALETTE.wood,'drawer-side0-'+i),
      piece(q,bx+innerL-T,frontV,bz+T,T,rearV-frontV,bh-T,'drawer-box','18mm抽屉右侧板',PALETTE.wood,'drawer-side1-'+i),
      piece(q,bx,rearV,bz,innerL,T,bh,'drawer-box','抽屉背板 · 柜背前预留10mm',PALETTE.wood,'drawer-back-'+i));
  }
  return out;
}
function centralRun(q,drawerWidth){
  const L=len(q),D=dep(q),out=carcass(q,0,COUNTER-T,{top:false,shelves:[]});
  const dq=region(q,0,drawerWidth,q.id+'-safe-drawers'),sq=region(q,drawerWidth,L-drawerWidth,q.id+'-closed-base');
  out.push(...drawerColumn(dq),...fronts(sq,0,COUNTER-T));
  out.push(piece(q,drawerWidth-T/2,42,T,T,D-T-42,COUNTER-2*T,'cabinet-divider','三抽列与滑门列分区 · 底板承托',PALETTE.door,'base-divider'));
  for(const [i,z]of [290,560].entries())out.push(piece(q,drawerWidth+T/2,42,z,L-drawerWidth-T*1.5,D-T-42,T,'cabinet-shelf','滑门区杯盘分类层板',PALETTE.door,'base-shelf-'+i));
  out.push(piece(q,0,0,COUNTER-T,L,D,T,'wood-countertop','850mm完成面 · 单层18mm原木细台面',PALETTE.wood,'countertop'),
    piece(q,0,D-T,COUNTER,L,T,UPPER-COUNTER,'niche-back','连续奶白中空背板 · 不填满开放区',PALETTE.door,'niche-back'));
  const railL=Math.min(800,L*.45),railS=Math.min(L-railL-60,Math.max(drawerWidth+80,L*.3));
  out.push(piece(q,railS,D-T-10,COUNTER+320,railL,10,40,'socket-rail','原木色插座轨道 · 三圆形插口概念',PALETTE.wood,'socket-rail',
    {socketCount:3,installation:'power-circuit-pending',material:'OakLight'}));
  // The entire upper is rear-aligned to the original wall. Its front is
  // shallower than the base by 120/160mm; the lights follow its true underside.
  const upperD=280,vertical=/east|west/.test(q.face),up={...q,id:q.id+'-upper',w:vertical?upperD:q.w,d:vertical?q.d:upperD,z:UPPER,h:HEIGHT-UPPER};
  if(q.face==='west')up.x=q.x+D-upperD;
  if(q.face==='north')up.y=q.y+D-upperD;
  const openL=r(L*.48),oq=region(up,0,openL,up.id+'-two-open'),cq=region(up,openL,L-openL,up.id+'-oak-closed');
  // A shared, single bottom board makes the work-niche light truly continuous
  // across the oak doors and the two open cells. Uprights start above it, so
  // there is no overlapped second shelf or duplicated solid board at the seam.
  const commonBottom=piece(up,0,0,UPPER,L,upperD,T,'cabinet-bottom','通长原木吊柜底板 · 连续灯带锚固',PALETTE.wood,'shared-bottom');
  const closed=carcass(cq,UPPER+T,HEIGHT-UPPER-T,{frontReserve:20,bottom:false,shelves:[600-T]});
  out.push(commonBottom,...closed,...fronts(cq,UPPER+T,HEIGHT-UPPER-T,{style:'hinged',color:PALETTE.wood,count:Math.max(2,Math.ceil(len(cq)/650))}));
  const open=carcass(oq,UPPER+T,HEIGHT-UPPER-T,{frontReserve:0,back:PALETTE.door,bottom:false,shelves:[]});
  const mid=piece(oq,T,0,UPPER+600,len(oq)-2*T,upperD-T,T,'display-shelf','原木两层开放书格的中层板',PALETTE.wood,'open-middle');
  out.push(...open,mid);
  out.push(light(oq,T+8,35,mid,len(oq)-2*T-16,'open-mid-light'));
  const openCap=open.find(p=>p.id===oq.id+'-top');out.push(light(oq,T+8,35,openCap,len(oq)-2*T-16,'open-top-light'));
  out.push(light(up,24,35,commonBottom,L-48,'niche-continuous-light',{wash:true,label:'连续中空暖光灯带 · 固定于通长吊柜底板'}));
  for(let i=0;i<5;i++)out.push(piece(oq,T+35+i*30,upperD-T-160,UPPER+T,24,160,225+i*5,'display-book','两层开放格少量书册',i%2?PALETTE.door:PALETTE.wood,'upper-book-'+i,{material:'BookPaper'}));
  return out;
}
function straightRun(source){
  const bases=source.parts.filter(p=>p.role==='sideboard_base'&&p.face==='east').map(fromSource).sort((a,b)=>a.y-b.y);
  if(!bases.length)throw new Error('Reference sideboard needs the original east-facing west run');
  const start=bases[0].y,end=Math.max(...bases.map(p=>p.y+p.d)),D=Math.max(...bases.map(p=>p.w));
  const q={id:'reference-west',x:bases[0].x,y:start,w:D,d:end-start,face:'east'},L=len(q),family=L<4500;
  const roundL=160,displayL=240,northTallL=200,southTallL=560,slatL=200,northEnd=roundL+displayL+northTallL,southStart=L-southTallL-slatL;
  const central=region(q,northEnd,southStart-northEnd,q.id+'-central');
  const out=[...roundedEnd(region(q,0,roundL,q.id+'-round')),
    ...displayTower(region(q,roundL,displayL,q.id+'-display')),
    ...tall(region(q,roundL+displayL,northTallL,q.id+'-narrow-tall')),
    ...centralRun(central,family?400:600),
    ...tall(region(q,southStart,southTallL,q.id+'-left-tall'),{style:'sliding'}),
    ...grille(region(q,L-slatL,slatL,q.id+'-left-grille'))];
  return {parts:out,q,drawerStart:start+northEnd,drawerEnd:start+northEnd+(family?400:600),drawerWidth:family?400:600,family};
}
function returnRun(fit){
  const out=[];
  const base=fit.parts.find(p=>p.role==='sideboard_base'&&p.segmentId==='south-return');
  if(!base)return out;
  const q=fromSource(base),L=len(q),D=dep(q);
  out.push(...carcass(q,0,COUNTER-T,{top:false,shelves:[290,560]}),...fronts(q,0,COUNTER-T),
    piece(q,0,0,COUNTER-T,L,D,T,'wood-countertop','南向返柜850mm连续原木细台面',PALETTE.wood,'return-counter'),
    piece(q,0,D-T,COUNTER,L,T,UPPER-COUNTER,'niche-back','返柜奶白中空背板',PALETTE.door,'return-niche-back'));
  const upper=fromSource(fit.parts.find(p=>p.id==='d_return_upper'));
  const upperParts=carcass(upper,UPPER,HEIGHT-UPPER,{frontReserve:20,shelves:[600]});
  out.push(...upperParts,...fronts(upper,UPPER,HEIGHT-UPPER,{style:'hinged',color:PALETTE.wood,count:2}));
  out.push(light(upper,T+8,35,upperParts.find(p=>p.id===upper.id+'-bottom'),len(upper)-2*T-16,'return-niche-light',{wash:false,label:'7字返柜吊柜底面暖光'}));
  const cb=fromSource(fit.parts.find(p=>p.id==='d_corner_base'));
  // The blind corner remains blind, not an apparent extra opening or a new
  // extension toward the front door. Upper corner uses the old 280-mm envelope.
  out.push(...carcass(cb,0,COUNTER-T,{frontReserve:20,top:false}).map(p=>({...p,usableStorage:false})),
    piece(cb,0,0,0,len(cb),T,COUNTER-T,'blind-corner-front','原盲角封闭饰面 · 无门无抽，不计储物',PALETTE.door,'blind-front',{usableStorage:false}),
    piece(cb,0,0,COUNTER-T,len(cb),dep(cb),T,'wood-countertop','400mm原盲角连接台面 · 不计储物',PALETTE.wood,'corner-counter',{usableStorage:false}),
    piece(cb,0,dep(cb)-T,COUNTER,len(cb),T,UPPER-COUNTER,'niche-back','盲角奶白中空背板',PALETTE.door,'corner-niche-back',{usableStorage:false}));
  const cu=fromSource(fit.parts.find(p=>p.id==='d_corner_upper'));
  // The old d4_upper extended 120mm past the last base module to meet the
  // retreated 280mm upper blind corner. Keep that short rear-aligned bridge,
  // otherwise an unintended open gap appears in the ceiling-height L return.
  const bridge={id:'reference-upper-blind-bridge',x:cu.x,y:cb.y,w:cu.w,d:cu.y-cb.y,face:'east'};
  if(bridge.d>0)out.push(...carcass(bridge,UPPER,HEIGHT-UPPER,{frontReserve:20}).map(p=>({...p,usableStorage:false})),
    piece(bridge,0,0,UPPER,len(bridge),T,HEIGHT-UPPER,'blind-corner-front','原120mm退进上盲角连接饰面 · 无门无抽',PALETTE.door,'blind-front',{usableStorage:false}));
  out.push(...carcass(cu,UPPER,HEIGHT-UPPER,{frontReserve:20}).map(p=>({...p,usableStorage:false})),
    piece(cu,0,0,UPPER,len(cu),T,HEIGHT-UPPER,'blind-corner-front','封闭上盲角饰面 · 无门无抽，不计储物',PALETTE.door,'blind-front',{usableStorage:false}));
  return out;
}
function applySideboardReference(plan,source){
  const f=plan.defaultFurniture.find(p=>p.id==='fit-dining_sideboard_wall'),fit=source.storageFitouts?.find(p=>p.id==='dining_sideboard_wall');
  if(!f||!fit)throw new Error('Reference sideboard target missing');
  const invariant=JSON.stringify({rooms:plan.ROOMS,walls:plan.WALLS,bifolds:plan.BIFOLDS,furniture:plan.defaultFurniture.map(p=>[p.id,p.cx,p.cy,p.w,p.d,p.rot,p.sourceFootprintMm])});
  const straight=straightRun(fit),absolute=[...straight.parts,...returnRun(fit)];
  const ids=new Set();
  f.parts=absolute.map(p=>{if(ids.has(p.id))throw new Error('Duplicate reference panel: '+p.id);ids.add(p.id);return {...p,x:r(p.x-f.cx),y:r(p.y-f.cy)};});
  f.heightMm=HEIGHT;f.baseHeightMm=HEIGHT;f.baseWidthMm=f.w;f.baseDepthMm=f.d;f.cabinetRevision=REVISION;f.color=PALETTE.door;
  const hasReturn=fit.parts.some(p=>p.segmentId==='south-return');
  f.cabinetDesign={revision:REVISION,title:'通顶餐边柜 · 参考图原木中空与展示分区',status:'concept-pending-detail',
    previousColor:'#F4F1E9',previousColors:['#F3EFE6','#F4F1E9'],previousHeightMm:2500,boardThicknessMm:T,doorGapMm:GAP,
    palette:PALETTE,materialColorRespect:true,ceilingHeightMm:HEIGHT,ceilingStatus:'model-only-pending-site-check',
    sourceReference:'用户提供小红书餐边柜参考图 · 2026-10-08',
    faces:[{face:'east',label:'西墙餐边柜 · 左南右北（面朝柜体）',lengthMm:len(straight.q),depthMm:dep(straight.q)},
      ...(hasReturn?[{face:'north',label:'7字南向返柜 · 保留原盲角占地',lengthMm:1625,depthMm:400}]:[])],
    features:['奶白通顶高柜＋左侧竖原木格栅，右侧窄高柜、竖向原木展示格与60mm圆弧端柜。',
      '中间上柜按正面视角：左侧原木封闭门，右侧两层开放书格；每层均有贴板底暖光灯带。',
      '850–1500mm保持连续奶白中空，18mm原木细台面、三圆形插座轨道与连续嵌入暖光。',
      `下柜保留奶白封闭滑门，三层抽屉按本户动线调序到北侧${straight.drawerWidth}mm安全列，不外伸到餐桌接触段。`,
      '南端奶白高柜保留两片滑门，避免向餐椅区外开；200mm北侧高柜仅作窄物分类，净宽不超过164mm；圆弧端部不虚计储物容量。',
      hasReturn?'保留7字返柜、原400mm盲角及其旧占地；不移动入口或任何家具。':'南端仍接800库北缘，北向折叠门开口不增加返柜或遮挡。'],
    dimensions:[`柜高2700mm贴合当前模型屋顶；现场净高/吊顶/找平仍待复核，不是下单确认值。`,
      `直柜长${len(straight.q)}mm，下柜外深${dep(straight.q)}mm，上柜深280mm；台面完成面850mm，中空650mm高。`,
      `三抽列y${straight.drawerStart}–${straight.drawerEnd}mm，外宽${straight.drawerWidth}mm、最多拉出250mm；五金、取物站位待核。`,
      '每道灯带厚4mm、贴真实上柜/层板底面；色温约3000K概念，电源与检修设计待核。',
      '18mm板件、3mm门缝与R60圆弧为概念参数，厂家须深化净尺寸、轨道、抽屉承重及圆弧工艺。'],
    layoutAdaptations:{facadeLeft:'south',facadeRight:'north',drawerColumn:{yStartMm:straight.drawerStart,yEndMm:straight.drawerEnd,widthMm:straight.drawerWidth,maxExtensionMm:250},
      drawerReason:'参考右侧三抽按本户餐桌及餐椅位置调序到北段，防止抽屉与座位/通路冲突。',returnPreserved:hasReturn}};
  for(const p of f.parts)if(p.x<-f.w/2-.01||p.y<-f.d/2-.01||p.x+p.w>f.w/2+.01||p.y+p.d>f.d/2+.01||p.elevationMm<0||p.elevationMm+p.heightMm>HEIGHT+.01)
    throw new Error('Reference sideboard part outside unchanged envelope: '+p.id);
  for(const p of f.parts.filter(p=>p.role==='led-strip')){const a=f.parts.find(q=>q.id===p.anchorPartId);if(!a||Math.abs(p.elevationMm+p.heightMm-a.elevationMm)>.01)throw new Error('Unanchored reference light: '+p.id);}
  if(invariant!==JSON.stringify({rooms:plan.ROOMS,walls:plan.WALLS,bifolds:plan.BIFOLDS,furniture:plan.defaultFurniture.map(p=>[p.id,p.cx,p.cy,p.w,p.d,p.rot,p.sourceFootprintMm])}))throw new Error('Reference design changed plan footprint');
  plan.metadata.sideboardReference={revision:REVISION,title:'三套同步通顶餐边柜参考',heightPolicy:'2700mm仅按模型屋顶；现场待核',geometryPolicy:'仅餐边柜高度/内部细节变更，平面占地及800库折叠门保留'};
}
module.exports={applySideboardReference,REVISION,PALETTE};
