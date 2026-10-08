'use strict';

// A reversible design-detail layer over the imported plan. This module never
// changes room/wall coordinates, fixture footprints, purchased furniture, or
// the family 800-library opening. Millimetres; front v=0, back v=depth.
const REVISION = 'cream-oak-functional-v1';
const PALETTE = {door:'#F4F1E9',wood:'#CDB594',counter:'#CDB594',metal:'#9D9386',light:'#FFF1CF'};
const T=18, GAP=3;
const mm=n=>Math.round(Number(n)*10000)/1000;
const round=n=>Math.round(n*1000)/1000;
function box(p){return {id:p.id,x:mm(p.x),y:mm(p.y),w:mm(p.w),d:mm(p.d),z:mm(p.zCm||0),h:mm(p.hCm),face:p.face||'south'};}
function length(q){return /east|west/.test(q.face)?q.d:q.w;}
function depth(q){return /east|west/.test(q.face)?q.w:q.d;}
function panel(q,s,v,z,l,d,h,role,label,color=PALETTE.door,suffix=''){
  let x,y,w,dep;
  if(q.face==='east'){x=q.x+q.w-v-d;y=q.y+s;w=d;dep=l;}
  else if(q.face==='west'){x=q.x+v;y=q.y+s;w=d;dep=l;}
  else if(q.face==='north'){x=q.x+s;y=q.y+v;w=l;dep=d;}
  else{x=q.x+s;y=q.y+q.d-v-d;w=l;dep=d;}
  const material=color===PALETTE.wood||color===PALETTE.counter?'OakLight':color===PALETTE.door?'Cream':color===PALETTE.light?'Light':'WarmGrayMetal';
  return {id:q.id+'-'+(suffix||role),x:round(x),y:round(y),w:round(w),d:round(dep),elevationMm:round(z),heightMm:round(h),role,label,color,material,face:q.face};
}
function subregion(q,start,size,suffix){
  return /east|west/.test(q.face)?{...q,id:q.id+'-'+suffix,y:q.y+start,d:size}:{...q,id:q.id+'-'+suffix,x:q.x+start,w:size};
}
function shell(q,opts={}){
  const L=length(q),D=depth(q),z=q.z,h=q.h;
  // Reserve the first 42 mm for two sliding tracks, so closed doors do not
  // geometrically intersect the gables or the adjustable shelves.
  const out=[panel(q,0,42,z,T,D-42,h-T,'cabinet-side','侧板',PALETTE.door,'side-0'),panel(q,L-T,42,z,T,D-42,h-T,'cabinet-side','侧板',PALETTE.door,'side-1'),
    panel(q,T,0,z,L-2*T,D-T,T,'cabinet-bottom','底板')];
  if(!opts.omitBack)out.push(panel(q,T,D-T,z,L-2*T,T,h-T,'cabinet-back','柜内背板',opts.backColor||PALETTE.door));
  if(!opts.omitTop)out.push(panel(q,0,0,z+h-T,L,D,T,opts.topRole||'cabinet-top',opts.topLabel||'顶板',opts.topColor||PALETTE.door));
  for(const [i,at]of(opts.shelves||[]).entries())out.push(panel(q,T,42,z+at,L-2*T,D-42-T,T,'cabinet-shelf','可调层板',PALETTE.door,'shelf-'+i));
  return out;
}
function doors(q,count=2,style='hinged',bottom=q.z,height=q.h){
  const L=length(q),slot=(L-GAP)/count,out=[];
  for(let i=0;i<count;i++){
    const v=style==='sliding'?(i%2)*20:0;
    out.push({...panel(q,GAP/2+i*slot,v,bottom+T+GAP/2,slot-GAP,T,height-2*T-GAP,style==='sliding'?'door-sliding':'door-hinged',style==='sliding'?'奶白滑门 · 不外开':'奶白封闭柜门',PALETTE.door,'door-'+i),doorStyle:style,panelIndex:i});
    // Thin, recessed edge pull is inside the original depth (not a new handle
    // projecting into the entry, dining chair space, or bedroom passage).
    const at=GAP/2+i*slot+slot-GAP-13;
    out.push(panel(q,at,v+T-2,bottom+height*.55,7,2,Math.min(120,height*.25),'handle-recess','内嵌扣手',PALETTE.wood,'pull-'+i));
  }
  return out;
}
function drawers(q,bottom,heights,maxExtension=250,topInset=0){
  const L=length(q),D=depth(q),out=[];let z=bottom;
  for(const [i,h]of heights.entries()){
    const insetTop=i===heights.length-1?topInset:0;
    out.push({...panel(q,GAP/2,0,z+GAP/2,L-GAP,T,h-GAP-insetTop,'drawer-front','钥匙/餐具浅抽屉',PALETTE.door,'drawer-front-'+i),maxExtensionMm:maxExtension});
    const b={...q,id:q.id+'-drawer-'+i,z:z+15,h:h-30-insetTop};
    // Drawer rear must sit in front of, not inside, the carcass/niche back.
    // Reserve the 18-mm drawer back plus a 10-mm installation gap before
    // the independent 18-mm fixed cabinet back. The box floor/sides stop at
    // the drawer back's front plane rather than overlapping its thickness.
    const inset=42,rearV=D-2*T-10,innerD=rearV-inset;
    out.push(panel(b,T,inset,b.z,L-2*T,innerD,T,'drawer-box','抽屉底板',PALETTE.wood,'floor'),
      panel(b,T,rearV,b.z,L-2*T,T,b.h,'drawer-box','抽屉背板 · 柜背前留10mm',PALETTE.wood,'back'),
      panel(b,T,inset,b.z,T,innerD,b.h,'drawer-box','抽屉侧板',PALETTE.wood,'side-0'),
      panel(b,L-2*T,inset,b.z,T,innerD,b.h,'drawer-box','抽屉侧板',PALETTE.wood,'side-1'));
    z+=h;
  }
  return out;
}
function niche(q,options={}){
  const L=length(q),D=depth(q),out=[panel(q,0,D-T,q.z,L,T,q.h,'niche-back','浅原木中空背板',PALETTE.wood),
    panel(q,0,0,q.z-T,L,D,T,'wood-countertop',`${q.z}mm完成面 · 单层原木置物台面`,PALETTE.wood,'niche-countertop')];
  if(options.upper){
    const upper=options.upper,vertical=/east|west/.test(q.face),start=vertical?q.y:q.x,upStart=vertical?upper.y:upper.x;
    const s=Math.max(0,upStart-start)+24,end=Math.min(L,upStart+length(upper)-start)-24;
    // The upper cabinet is shallower than the lower one. Attach the LED to
    // its real underside, 35 mm behind that upper front, not in open air in
    // front of it and not inside the upper's 18-mm bottom board.
    if(end>s)out.push({...panel(q,s,D-depth(upper)+35,upper.z-4,end-s,8,4,'led-strip','浅吊柜底面暖光灯带 · 前沿内退35mm',PALETTE.light),anchorSourceId:upper.id,anchor:'upper-underside',insetMm:35});
  }
  if(options.socket)out.push(panel(q,L-150,D-T-5,q.z+150,85,5,85,'socket-plate','台面电器插座预留 · 线路待核',PALETTE.door));
  return out;
}
function displayMetadata(f,title,features,dimensions,faces){
  f.cabinetRevision=REVISION;
  f.baseWidthMm=f.w;f.baseDepthMm=f.d;f.baseHeightMm=f.heightMm;
  f.cabinetDesign={revision:REVISION,title,status:'concept-pending-detail',previousColor:f.color,
    boardThicknessMm:T,doorGapMm:GAP,palette:PALETTE,faces,features,
    dimensions:[...dimensions,'便捷分区与板件为概念建议；柜体高度、门轨、承重、安装与下单尺寸仍待厂家现场深化。']};
  f.color=PALETTE.door;
  return f;
}
function faceSummaries(raw){
  return [...new Set(raw.map(p=>p.face))].map(face=>{
    const ps=raw.filter(p=>p.face===face),vertical=/east|west/.test(face);
    const starts=ps.map(p=>vertical?p.y:p.x),ends=ps.map(p=>vertical?p.y+p.d:p.x+p.w);
    return {face,label:{east:'西墙柜 · 面朝餐厅',west:'东墙柜 · 面朝玄关',north:'南端返柜 · 面朝北',south:'低柜 · 面朝餐区'}[face],lengthMm:round(Math.max(...ends)-Math.min(...starts)),depthMm:Math.max(...ps.map(p=>vertical?p.w:p.d))};
  });
}
function storageDetail(fit){
  const raw=fit.parts.map(box),byId=new Map(raw.map(q=>[q.id,q]));
  let parts=[];
  const entry=fit.id==='entry_shoe_station',side=fit.id==='dining_sideboard_wall',sofa=fit.id==='sofa_back_storage';
  const northern=fit.parts.filter(p=>p.role==='sideboard_base'&&p.face==='east').sort((a,b)=>a.y-b.y)[0]?.id;
  const hasLinkedNiche=q=>fit.parts.filter(p=>/niche/.test(p.role)).map(p=>byId.get(p.id)).some(n=>n.face===q.face&&Math.abs(n.x-q.x)<.01&&Math.abs(n.y-q.y)<.01&&Math.abs(n.w-q.w)<.01&&Math.abs(n.d-q.d)<.01&&Math.abs(n.z-q.z-q.h)<.01);
  const rear=q=>q.face==='east'?q.x:q.face==='west'?q.x+q.w:q.face==='north'?q.y+q.d:q.y;
  const linkedUpper=q=>fit.parts.filter(p=>/upper/.test(p.role)).map(p=>byId.get(p.id)).filter(u=>{
    const vertical=/east|west/.test(q.face),start=vertical?q.y:q.x,upStart=vertical?u.y:u.x;
    return u.face===q.face&&Math.abs(rear(u)-rear(q))<.01&&Math.abs(u.z-q.z-q.h)<.01&&Math.min(start+length(q),upStart+length(u))>Math.max(start,upStart);
  }).sort((a,b)=>length(b)-length(a))[0];
  for(const p of fit.parts){
    const q=byId.get(p.id);
    if(p.role==='entry_accessories'||p.role==='dining_accessories')continue;
    if(p.role==='shoe_lower'){
      const open=mm(p.openBaseCm||20),lower={...q,z:q.z+open,h:q.h-open};
      parts.push(...shell(lower,{shelves:[260,520],omitTop:hasLinkedNiche(q)}),...doors(lower,p.doorPanels||2,'sliding'));
      // The old importer filled this entire volume. A hollow 200-mm toe space
      // now represents the source's common-shoe bay without adding a bench.
      parts.push(panel(q,0,depth(q)-T,q.z,length(q),T,open,'cabinet-back','常鞋位背板',PALETTE.wood,'common-back'),
        panel(q,0,0,q.z,length(q),depth(q),T,'common-shoe-shelf','200mm常鞋开放位',PALETTE.wood,'common-floor'));
      parts.push(panel(q,0,0,q.z,T,depth(q),open,'cabinet-side','常鞋位侧板',PALETTE.door,'common-side-0'),panel(q,length(q)-T,0,q.z,T,depth(q),open,'cabinet-side','常鞋位侧板',PALETTE.door,'common-side-1'));
    }else if(p.role==='sideboard_base'){
      const drawer=side&&q.id===northern;
      parts.push(...shell(q,{topRole:'wood-countertop',topLabel:`${q.z+q.h}mm原木柜台面`,topColor:PALETTE.wood,shelves:[280,500],omitTop:hasLinkedNiche(q)}));
      if(drawer){
        // Keep the shallow-drawer column at a realistic concept width rather
        // than specifying a 1200/1310-mm single unsupported drawer.
        const drawerWidth=Math.min(600,length(q)-360),draw=subregion(q,0,drawerWidth,'drawer-column'),rest=subregion(q,drawerWidth,length(q)-drawerWidth,'sliding-column');
        parts.push(...doors(draw,2,'sliding',q.z,q.h-240),...drawers(draw,q.z+q.h-240,[120,120],250,T),...doors(rest,2,'sliding'));
        parts.push(panel(q,drawerWidth-T/2,42,q.z+T,T,depth(q)-42-T,q.h-2*T,'cabinet-divider','600mm浅抽分区板 · 净宽待深化',PALETTE.door,'drawer-divider'));
      }
      else parts.push(...doors(q,p.doorPanels||2,'sliding'));
    }else if(p.role==='upper_cabinet')parts.push(...shell(q,{shelves:[q.h/2]}),...doors(q,p.doorPanels||2));
    else if(/niche/.test(p.role)){
      parts.push(...niche(q,{upper:linkedUpper(q),socket:side&&q.id.includes('1_niche')||side&&q.id==='d_niche'}));
      if(p.role==='key_niche'){
        // The shallow key drawer is closed, not an open tray: its 90-mm zone
        // includes a fixed 18-mm top, with shortened front and drawer box.
        // The rear edge stops at the niche back, so it does not duplicate it.
        parts.push(...drawers({...q,id:q.id+'-key'},q.z,[90],160,T),panel(q,0,0,q.z+90-T,length(q),depth(q)-T,T,'wood-countertop','钥匙浅抽盖顶 · 随手小置物面',PALETTE.wood,'key-drawer-top'));
        for(let i=0;i<3;i++)parts.push(panel(q,110+i*170,depth(q)-T-22,q.z+320,16,22,32,'coat-hook','钥匙/轻便包挂钩 · 不代替长衣挂区',PALETTE.wood,'hook-'+i));
        parts.push(panel(q,length(q)-110,depth(q)-T-5,q.z+180,70,5,70,'socket-plate','手机充电预留 · 电路待核',PALETTE.door));
      }
    }else if(/blind/.test(p.role))parts.push(...shell(q,{omitTop:hasLinkedNiche(q)}),...doors(q,1).map(a=>({...a,role:a.role==='door-hinged'?'blind-corner-front':a.role,label:'封闭转角 · 不计可用储物量'})));
    else throw new Error('Unhandled cabinet source part: '+p.role);
  }
  // Validate operational finished heights and real LED anchorage in addition
  // to the global footprint invariants. These remain true on every import.
  for(const p of fit.parts.filter(p=>/niche/.test(p.role))){
    const q=byId.get(p.id),counter=parts.find(b=>b.id===q.id+'-niche-countertop');
    if(!counter||Math.abs(counter.elevationMm+counter.heightMm-q.z)>.01)throw new Error('Incorrect cabinet finished counter level: '+q.id);
  }
  for(const light of parts.filter(p=>p.role==='led-strip'&&p.anchorSourceId)){
    const upper=byId.get(light.anchorSourceId);
    if(!upper||light.x<upper.x-.01||light.y<upper.y-.01||light.x+light.w>upper.x+upper.w+.01||light.y+light.d>upper.y+upper.d+.01||Math.abs(light.elevationMm+light.heightMm-upper.z)>.01)throw new Error('Cabinet light is not on linked upper underside: '+light.id);
  }
  const faces=faceSummaries(raw.filter(p=>!fit.parts.find(s=>s.id===p.id)?.role.includes('accessories')));
  const features=entry?['底部200mm常鞋开放位；取消旧实心堵塞，无固定换鞋凳。','1000–1500mm中空含90mm钥匙浅抽分区，抽上1090mm小置物面；另有3个小挂钩和充电预留，不是长衣挂放区。','上柜浅280mm封闭放低频鞋盒；鞋柜下部滑门，不向门口伸出。','入户门打开会挡柜面；取鞋和使用钥匙区前需先收门，净开角及门把手干涉仍须现场核验。','奶白门板 + 浅原木中空背板/台面 + 内嵌灯带。']:
    sofa?['3扇奶白滑门朝餐厅，不设置外伸抽屉。','浅原木顶面放遥控与临时小物；内部放薄书、游戏和分类小盒。','保持与沙发20mm间隙与既有绕行通路，固定防倾倒待核。']:
    ['从高频台面小电器/杯盘，到封闭日用品，再到上柜低频储物分区。','仅最北模块约600mm宽一列增加2层120mm浅抽；其余保持全高滑门，最大拉出250mm须确认椅子与取物动作。','贴餐桌、靠800库和南端返柜保留滑门，不能照搬参考的外开深抽。','中空保持通透，移除原填满中空的示意配件实体；奶白门板配浅原木背板、台面与暖光。'];
  const dimensions=entry?['沿墙650×外深340×高2500mm；中空500高，上柜280深。']:
    sofa?['2000×250×650mm；内部进深扣板与双轨后须再核。']:
    ['下柜台面850mm，中空650mm高，上柜280mm深；原各模块与总外包保持不变。','北端抽屉列外包约600mm，内部净宽和五金待深化；餐桌接触柜面的区域不设置抽屉。'];
  return {parts,meta:{title:entry?'入户轻便归家柜':sofa?'沙发背后浅储物':'餐边柜便捷分区',features,dimensions,faces}};
}
function localCabinet(f,type){
  const q={id:f.id,x:-f.w/2,y:-f.d/2,w:f.w,d:f.d,z:0,h:f.heightMm,face:'south'};
  let parts;
  if(type==='wardrobe'){
    const shallow=f.d<450,upperH=400,lower={...q,h:q.h-upperH};
    parts=[...shell(q),...doors(lower,Math.max(2,Math.ceil(f.w/800)),'sliding'),...doors({...q,id:q.id+'-upper',z:q.h-upperH,h:upperH},Math.max(2,Math.ceil(f.w/800)))];
    const n=Math.max(2,Math.ceil(f.w/800)),span=(f.w-2*T)/n;
    for(let i=1;i<n;i++)parts.push(panel(q,T+i*span,42,T,T,f.d-42-T,q.h-upperH-2*T,'cabinet-divider','内部分区板',PALETTE.door,'divider-'+i));
    parts.push(panel(q,T,42,q.h-upperH,f.w-2*T,f.d-42-T,T,'cabinet-shelf','上层被褥分区',PALETTE.door,'seasonal-shelf'));
    for(let i=0;i<n;i++){
      const levels=shallow?[400,800,1200,1600]:i===n-1?[350,700,1050,1400]:[];
      for(const z of levels)if(z<q.h-upperH-T)parts.push(panel(q,T+i*span,42,z,span-T,f.d-42-T,T,'cabinet-shelf',shallow?'300mm浅柜叠衣层板':'叠衣分类层板',PALETTE.door,`fold-${i}-${z}`));
      if(!shallow&&i<n-1)parts.push(panel(q,T+i*span+20,f.d/2,q.h-upperH-120,span-40,16,16,'hanging-rail','600mm柜深挂衣杆示意',PALETTE.metal,'rail-'+i));
    }
    return {parts,meta:{title:shallow?'次卧浅柜 · 叠衣分类':'衣柜 · 封闭分区',features:[shallow?'300mm外深只建议叠衣、薄物和小配件；不是常规正向挂衣柜。':'600mm外深建议挂衣与叠衣分区，净深须扣双轨和背板再核。','奶白滑门与内嵌浅原木扣手；不增加过道外伸把手。','上400mm低频被褥层；内部为概念分区，不改变床尾通路。'],dimensions:[`${f.w}×${f.d}×${f.heightMm}mm沿用模型；柜高不是现场定制下单确认值。`],faces:[{face:'south',label:'衣柜正面（随原柜体旋转）',lengthMm:f.w,depthMm:f.d}]}};
  }
  const left={...q,id:f.id+'-left',w:f.w*.34},right={...q,id:f.id+'-right',x:q.x+f.w*.66,w:f.w*.34};
  parts=[...shell(q,{topRole:'wood-countertop',topColor:PALETTE.wood,omitBack:true}),...doors(left,1,'sliding'),...doors(right,1,'sliding'),
    panel(left,T,f.d-T,0,left.w-T,T,q.h-T,'cabinet-back','左侧闭柜奶白背板',PALETTE.door),panel(right,0,f.d-T,0,right.w-T,T,q.h-T,'cabinet-back','右侧闭柜奶白背板',PALETTE.door)];
  const mid={...q,id:f.id+'-AV',x:q.x+f.w*.34,w:f.w*.32};
  parts.push(panel(mid,0,f.d-T,0,mid.w,T,q.h-T,'niche-back','影音设备独立原木背板 · 与左右背板不重叠',PALETTE.wood),panel(mid,0,42,q.h/2,mid.w,f.d-42-T,T,'cabinet-shelf','影音设备开放层',PALETTE.wood));
  return {parts,meta:{title:'电视薄柜 · 影音与杂物分区',features:[`保留电视及${f.w}mm薄柜，不增加遮窗或挡走廊的高柜。`,'两侧奶白滑门封闭杂物，中间影音开放层；走线散热现场深化。'],dimensions:[`${f.w}×${f.d}×${f.heightMm}mm；柜高沿用编辑器暂定值，非复尺确认。`],faces:[{face:'south',label:'电视薄柜正面',lengthMm:f.w,depthMm:f.d}]}};
}
function attach(f,meta){return displayMetadata(f,meta.title,meta.features,meta.dimensions,meta.faces);}
function localize(parts,f){return parts.map(p=>({...p,x:round(p.x-f.cx),y:round(p.y-f.cy)}));}
function applyCabinetDesigns(plan,source){
  const invariants=JSON.stringify({rooms:plan.ROOMS,walls:plan.WALLS,bifolds:plan.BIFOLDS});
  const before=new Map(plan.defaultFurniture.map(f=>[f.id,JSON.stringify([f.cx,f.cy,f.w,f.d,f.rot,f.heightMm,f.sourceFootprintMm])]));
  for(const fit of source.storageFitouts||[]){
    if(!['entry_shoe_station','dining_sideboard_wall','sofa_back_storage'].includes(fit.id))continue;
    const f=plan.defaultFurniture.find(f=>f.id==='fit-'+fit.id);if(!f)throw new Error('Cabinet not imported: '+fit.id);
    const detail=storageDetail(fit);f.parts=localize(detail.parts,f);attach(f,detail.meta);
  }
  for(const f of plan.defaultFurniture){
    if(f.type==='wardrobe'||f.type==='tvstand'){
      const type=f.type,detail=localCabinet(f,type);f.parts=detail.parts;
      if(type==='wardrobe'){f.nativeType=type;f.type='fixture';}
      attach(f,detail.meta);
    }
    if(f.id==='fit-study_bookwall'){
      for(const p of f.parts){p.face='north';if(['back','shelf','pull'].includes(p.role)){p.color=PALETTE.wood;p.material='OakLight';}else if(['door','upright'].includes(p.role)){p.color=PALETTE.door;p.material='Cream';}}
      const x=-f.w/2,y=-f.d/2,z=Math.min(...f.parts.map(p=>p.elevationMm));
      f.parts.push({id:f.id+'-light',x:x+24,y:y+30,w:f.w-48,d:8,elevationMm:z-4,heightMm:4,color:PALETTE.light,material:'Light',role:'led-strip',label:'书架下板底面工作灯带',face:'north'});
      attach(f,{title:'书房通长书墙',features:['保留现有6格书架、通长书桌及上下层；只优化奶白门板、浅原木背板与内嵌灯带。','上层封闭放低频文件，开放格放常用书；安装承重与电源现场深化。'],dimensions:[`${f.w}mm通长，外深${f.d}mm；书架本体下口${z}mm，薄灯带底${z-4}mm，上口2500mm沿用既有设计。`],faces:[{face:'north',label:'书房书墙 · 朝书桌',lengthMm:f.w,depthMm:f.d}]});
    }
    if(source.kitchenFitout&&f.id==='fit-'+source.kitchenFitout.id){
      for(const p of f.parts){if(/front/.test(p.role)){p.color=PALETTE.door;p.material='Cream';}else if(p.material==='OakLight')p.color=PALETTE.wood;}
      const floors=source.kitchenFitout.parts.filter(p=>p.role==='upper-panel'&&/_floor$/.test(p.id));
      for(const p of floors){const q=box(p);f.parts.push(...localize([panel(q,24,28,q.z-4,length(q)-48,8,4,'led-strip','吊柜下板底面灯带 · 电路待核',PALETTE.light)],f));}
      const kitchenFaces=faceSummaries(source.kitchenFitout.parts.filter(p=>p.face).map(box)).map(a=>({...a,label:{west:'东墙地柜/吊柜 · 朝操作区',north:'南墙地柜/吊柜 · 朝操作区',south:'北墙地柜 · 朝操作区'}[a.face]||'厨房柜正面'}));
      attach(f,{title:'厨房定制柜 · 奶白门板细化',features:['保持原地柜吊柜、切槽台面和电器预留，不把洗碗机位填满。','奶白封闭门板配浅原木细节和内嵌灯带；热水器侧不补满吊柜。','烟道、热水器、灶具通风与检修原条件全部保留。'],dimensions:['既有厨房柜体、电器、窗与管井外包不变；缺省45cm待核模块仍待核。'],faces:kitchenFaces});
    }
  }
  for(const f of plan.defaultFurniture){
    if(before.get(f.id)!==JSON.stringify([f.cx,f.cy,f.w,f.d,f.rot,f.heightMm,f.sourceFootprintMm]))throw new Error('Cabinet detail altered plan placement: '+f.id);
    if(!f.cabinetRevision)continue;
    for(const p of f.parts){
      if(p.x<-f.w/2-.01||p.y<-f.d/2-.01||p.x+p.w>f.w/2+.01||p.y+p.d>f.d/2+.01||p.elevationMm<0||p.elevationMm+p.heightMm>f.heightMm+.01)throw new Error('Cabinet panel outside original outer envelope: '+f.id+'/'+p.id);
    }
  }
  if(invariants!==JSON.stringify({rooms:plan.ROOMS,walls:plan.WALLS,bifolds:plan.BIFOLDS}))throw new Error('Cabinet detail mutated room/wall/library geometry');
  plan.metadata.cabinetRevision={revision:REVISION,title:'奶白 + 浅原木便捷分区',status:'concept-pending-detail',geometryPolicy:'保留所有柜体原外包、位置与800库北开口；只替换柜内/门板细节。'};
}
module.exports={applyCabinetDesigns,REVISION,PALETTE};
