#!/usr/bin/env node
'use strict';

// Reproducible import of the user's three designs. All source plan dimensions
// are centimetres; the editor consumes millimetres. No geometry is fitted,
// stretched or averaged to make unresolved measurements appear to close.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {applyCabinetDesigns} = require('./cabinet-designs.cjs');
const root = path.resolve(__dirname, '..');
const ids = ['wood', 'family', 'laundry'];
const names = {wood:'木光原境', family:'木光 · 亲子储物', laundry:'木光 · 家政整墙'};
const sourceArg = process.argv.indexOf('--source');
const sourceRoot = sourceArg >= 0 ? path.resolve(process.argv[sourceArg + 1]) : null;
const refresh = process.argv.includes('--refresh-sources');
const mm = n => Math.round(Number(n) * 10000) / 1000;
const round = n => Math.round(n * 1000) / 1000;
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const vector = p => p.map(mm);
const norm = a => (a % 360 + 360) % 360;
const colors = {Cream:'#F3EFE6',Wall:'#F2EEE5',Oak:'#C8A77E',OakLight:'#C8A77E',Stone:'#ECE8DF',Tile:'#E8E5DF',WhiteLinen:'#EEE8DC',Sage:'#7C9485',Charcoal:'#303533',WarmGrayMetal:'#A9A39A',WindowMetal:'#9FABA8',Glass:'#CADBD9',Brass:'#B29769',Metal:'#D1D5D3',Terracotta:'#BD9B86',RollerFabric:'#EEE8DC'};
const toneColors = {wood:'#C8A77E',fabric:'#D7D1C6',metal:'#D9DDDB',wall:'#F2EEE5',sanitary:'#F5F4EF',wet:'#D4E1DF',cabinet:'#F3EFE6'};
const dimensions = f => ({x:mm(f.x),y:mm(f.y),w:mm(f.w),d:mm(f.d)});
const rectOf = p => [p.x,p.y,p.x+p.w,p.y+p.d].map(round);
function pick(o,keys){ return Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,o[k]])); }

function snapshot(d, provenance){
  const keys=['name','version','unit','north','palette','envelope','anchors','rooms','walls','wallSpecs','doors','windows','furniture','coordinateSystem','geometryRevision','clearances','measurementRevision','purchasedFurnitureRevision','modelAddons','balconyOpennessRevision','woodRevision'];
  const out=pick(d,keys);
  for(const k of ['bayFitouts','storageFitouts','wallFitouts'])out[k]=(d[k]||[]).map(f=>pick(f,['id','roomId','openingId','type','title','x','y','w','d','zCm','hCm','face','summary','description','furnitureIds','parts','conditions','dimensions']));
  for(const k of ['laundry','kitchenFitout','garage'])if(d[k])out[k]=Object.fromEntries(Object.entries(d[k]).filter(([name])=>!['references','render','roomDescriptions'].includes(name)));
  out.provenance=provenance;
  return out;
}

function openingRect(o,thicknessCm=12){
  const a=vector([o.x1,o.y1]),b=vector([o.x2,o.y2]),half=mm(thicknessCm)/2;
  return Math.abs(a[1]-b[1])<.001
    ? [Math.min(a[0],b[0]),a[1]-half,Math.max(a[0],b[0]),a[1]+half]
    : [a[0]-half,Math.min(a[1],b[1]),a[0]+half,Math.max(a[1],b[1])];
}
function matchingWalls(d,o){
  const hz=Math.abs(o.y1-o.y2)<1e-6;
  return d.wallSpecs.filter(w=>{
    const [x1,y1,x2,y2]=w.coords;
    return hz ? Math.abs(y1-o.y1)<1e-6&&Math.abs(y2-o.y1)<1e-6&&Math.max(x1,x2)>=Math.min(o.x1,o.x2)&&Math.min(x1,x2)<=Math.max(o.x1,o.x2)
      : Math.abs(x1-o.x1)<1e-6&&Math.abs(x2-o.x1)<1e-6&&Math.max(y1,y2)>=Math.min(o.y1,o.y2)&&Math.min(y1,y2)<=Math.max(o.y1,o.y2);
  });
}
function baseOpeningMeta(o){
  return {...pick(o,['id','name','grade','notes','source','measurementStatus','designScenario']),sourceId:o.id,
    sourceAxisMm:vector([o.x1,o.y1,o.x2,o.y2]),openingWidthMm:o.widthMm,
    sillMm:mm(o.sillCm??0),heightMm:mm(o.heightCm),headMm:mm((o.sillCm??0)+o.heightCm),
    dimensionStatus:o.measurementStatus?'partial-measured':'design-pending',
    placementStatus:o.measurementStatus?.fullyLocated?'confirmed':'unresolved'};
}

function inferHinge(o){
  const hz=o.y1===o.y2;
  // These drawings did not specify a swing. Preserve their closed presentation
  // and mark the inferred pivot as provisional rather than silently certifying it.
  if(o.id==='entry_door')return {h:vector([o.x2,o.y2]),c:[-1,0],o:[0,-1]};
  if(o.id==='door_a')return {h:vector([o.x1,o.y1]),c:[1,0],o:[0,-1]};
  if(o.id==='door_b')return {h:vector([o.x2,o.y2]),c:[0,-1],o:[-1,0]};
  if(o.id==='door_c')return {h:vector([o.x1,o.y1]),c:[0,1],o:[-1,0]};
  if(o.id==='door_bath_1')return {h:vector([o.x1,o.y1]),c:hz?[1,0]:[0,1],o:hz?[0,1]:[1,0]};
  return {h:vector([o.x1,o.y1]),c:hz?[1,0]:[0,1],o:hz?[0,1]:[1,0]};
}

function convertFurniture(f,id){
  const q=dimensions(f),name=f.displayName||f.name||id;
  let type='cabinet';
  if(f.headDirection)type='bed';
  else if(f.productKey)type=f.productKey;
  else if(/沙发/.test(name))type='sofa';
  else if(/衣柜/.test(name))type='wardrobe';
  else if(/床头柜/.test(name))type='nightstand';
  else if(/办公椅/.test(name))type='officechair';
  else if(/椅/.test(name))type='chair';
  else if(/书桌|长桌|浅台/.test(name))type='desk';
  else if(/茶几/.test(name))type='coffeetable';
  else if(/电视.*柜/.test(name))type='tvstand';
  else if(/浴室柜|洗手|台盆/.test(name))type='vanity';
  else if(/马桶/.test(name))type='toilet';
  else if(/淋浴/.test(name))type='shower';
  let rot=0,w=q.w,dep=q.d;
  const northBack={south:0,west:90,north:180,east:270};
  if(type==='bed'){
    rot={north:0,east:90,south:180,west:270}[f.headDirection];
    w=mm(f.frameWidthCm||f.d);dep=mm(f.frameLengthCm||f.w);
  }else if(['sofa','chair','officechair','wardrobe','cabinet','nightstand','vanity','toilet'].includes(type)&&f.face){
    rot=northBack[f.face]; if(rot===90||rot===270){w=q.d;dep=q.w;}
  }else if(type==='desk'&&f.face){
    rot={north:0,east:90,south:180,west:270}[f.face];if(rot===90||rot===270){w=q.d;dep=q.w;}
  }else if(type==='table'&&f.productKey==='table'){
    // LISABO was purchased as a fixed 1400 x 780 mm table. Rotating it must
    // never replace those product dimensions with a fictitious narrow table.
    if(q.w<q.d){w=q.d;dep=q.w;rot=90;}
  }
  const h=f.heightCm??f.hCm??({bed:108,sofa:83,wardrobe:240,desk:74,table:74,chair:80,officechair:90,nightstand:48,vanity:85,toilet:80,shower:210,tvstand:43,coffeetable:40,cabinet:85}[type]||85);
  return {id,type,name,cx:round(q.x+q.w/2),cy:round(q.y+q.d/2),w, d:dep, rot:norm(rot),
    color:toneColors[f.tone]||'#C8A77E',heightMm:mm(h),elevationMm:mm(f.zCm||0),
    sourceId:f.id||id,sourceFootprintMm:q,roomId:f.roomId,
    ...pick(f,['headDirection','face','doorStyle','notes','productKey','purchasedProductId']),
    dimensionStatus:f.purchasedProductId?'purchased-product-body':'design-pending'};
}

function partGeometry(p){
  return {...dimensions(p),elevationMm:mm(p.zCm??p.bottomCm??0),heightMm:mm(p.hCm??p.heightCm??3),
    color:colors[p.material]||(/cushion/.test(p.role||'')?'#D9D1C3':'#C8A77E'),
    id:p.id,role:p.role||'panel',material:p.material,face:p.face};
}
function hollowNiche(p){
  const q=partGeometry(p),t=18,out=[];
  const east=p.face==='east',west=p.face==='west';
  const back={...q,id:p.id+'-back',role:'niche-back'};
  if(east||west){back.x=east?q.x:q.x+q.w-t;back.w=t;}
  else{back.y=p.face==='north'?q.y+q.d-t:q.y;back.d=t;}
  out.push(back,{...q,id:p.id+'-shelf',role:'niche-bottom',heightMm:t});
  return out;
}
function groupedFixture(id,name,parts,meta={}){
  const filtered=parts.filter(p=>[p.x,p.y,p.w,p.d,p.heightMm].every(Number.isFinite)&&p.w>0&&p.d>0&&p.heightMm>0);
  if(!filtered.length)return null;
  const x=Math.min(...filtered.map(p=>p.x)),y=Math.min(...filtered.map(p=>p.y));
  const x1=Math.max(...filtered.map(p=>p.x+p.w)),y1=Math.max(...filtered.map(p=>p.y+p.d));
  const cx=(x+x1)/2,cy=(y+y1)/2,w=x1-x,d=y1-y;
  return {id,type:'fixture',name,cx:round(cx),cy:round(cy),w:round(w),d:round(d),rot:0,color:'#F3EFE6',
    baseWidthMm:round(w),baseDepthMm:round(d),heightMm:Math.max(...filtered.map(p=>p.elevationMm+p.heightMm)),elevationMm:0,
    parts:filtered.map(p=>({...p,x:round(p.x-cx),y:round(p.y-cy)})),
    sourceId:id,dimensionStatus:'design-pending',...meta};
}

function convert(d,id){
  if(d.unit!=='cm')throw new Error(`${id}: source unit must be cm`);
  const openings=[...d.windows,...d.doors];
  const plan={id,name:names[id],sourceName:d.name,ROOMS:[],WALLS:[],WALL_META:[],WINS:[],WIN_META:[],DOORS:[],SLIDES:[],BAYS:[],BIFOLDS:[],defaultFurniture:[],HEIGHT_MM:2700};
  plan.ROOMS=d.rooms.map(r=>({id:r.id,name:({room_a:'主卧',room_b:'次卧 B',room_c:'书房 · 客卧',balcony:'生活阳台'}[r.id]||r.name),poly:r.points.map(vector),mat:r.tone==='wet'||r.tone==='balcony'?'antislip':'tile800',at:vector(r.planLabel||centroid(r.points)),heightMm:mm(r.heightCm||270),notes:r.notes,dimensionStatus:'design-pending'}));
  for(let wi=0;wi<d.wallSpecs.length;wi++){
    const spec=d.wallSpecs[wi],c=vector(spec.coords),hz=Math.abs(c[1]-c[3])<.001;
    if(!hz&&Math.abs(c[0]-c[2])>.001)throw new Error(`${id}: non-axis wall ${spec.id}`);
    const start=Math.min(c[hz?0:1],c[hz?2:3]),end=Math.max(c[hz?0:1],c[hz?2:3]),fixed=c[hz?1:0],half=mm(spec.thicknessCm)/2;
    const ops=openings.filter(o=>matchingWalls(d,o).includes(spec)).map(o=>({lo:mm(Math.min(o[hz?'x1':'y1'],o[hz?'x2':'y2'])),hi:mm(Math.max(o[hz?'x1':'y1'],o[hz?'x2':'y2'])),o}));
    const cuts=[start,end,...(spec.heightSegments||[]).flatMap(s=>[mm(s.fromCm),mm(s.toCm)]),...ops.flatMap(s=>[s.lo,s.hi])].filter(n=>n>=start&&n<=end).sort((a,b)=>a-b);
    const points=[...new Set(cuts)];
    for(let i=0;i<points.length-1;i++){
      const lo=points[i],hi=points[i+1],mid=(lo+hi)/2;
      if(hi-lo<.001||ops.some(o=>mid>o.lo-.001&&mid<o.hi+.001))continue;
      const rect=hz?[lo,fixed-half,hi,fixed+half]:[fixed-half,lo,fixed+half,hi];
      const height=spec.heightSegments?.find(s=>mid>=mm(s.fromCm)&&mid<=mm(s.toCm))?.heightCm||spec.heightCm;
      plan.WALLS.push([...rect,wi<8?'e':'u']);
      plan.WALL_META.push({sourceId:spec.id,sourceWallIndex:wi,sourceAxisMm:c,thicknessMm:mm(spec.thicknessCm),heightMm:mm(height),bearingStatus:'unverified',grade:spec.grade,notes:spec.source||'沿用方案墙线；承重性及全屋共同基准待核。'});
    }
  }
  for(const o of d.windows){
    const wall=matchingWalls(d,o)[0],meta=baseOpeningMeta(o),rect=openingRect(o,wall?.thicknessCm||12);
    if(o.windowType==='bay'){
      plan.WINS.push(rect);plan.WIN_META.push({...meta,type:'bay-aperture',noGlass:true,noFrame:true});
      const n=o.bay.outward,hz=o.y1===o.y2,half=mm(wall?.thicknessCm||12)/2,projection=mm(o.bay.projectionCm),distance=half+projection;
      const front=rect.map((v,i)=>v+(i%2===0?n[0]:n[1])*distance),axis=meta.sourceAxisMm.map((v,i)=>v+(i%2===0?n[0]:n[1])*distance);
      // The front frame in the original model is 100 mm deep. The original
      // wall throat stays open; it is not an extra flat glazed window.
      if(hz){front[1]=axis[1]-50;front[3]=axis[1]+50;}else{front[0]=axis[0]-50;front[2]=axis[0]+50;}
      plan.WINS.push(front);plan.WIN_META.push({...meta,id:o.id+'-front',type:'bay-front',sourceAxisMm:axis});
      const a=vector([o.x1,o.y1]),b=vector([o.x2,o.y2]),fa=[a[0]+n[0]*distance,a[1]+n[1]*distance],fb=[b[0]+n[0]*distance,b[1]+n[1]*distance];
      const poly=[a,b,fb,fa];
      const returnT=mm(o.bay.returnThicknessCm),sideRects=hz?[
        [a[0]-returnT,Math.min(a[1]+n[1]*half,fa[1]+n[1]*50),a[0],Math.max(a[1]+n[1]*half,fa[1]+n[1]*50)],
        [b[0],Math.min(b[1]+n[1]*half,fb[1]+n[1]*50),b[0]+returnT,Math.max(b[1]+n[1]*half,fb[1]+n[1]*50)]
      ]:[
        [Math.min(a[0]+n[0]*half,fa[0]+n[0]*50),a[1]-returnT,Math.max(a[0]+n[0]*half,fa[0]+n[0]*50),a[1]],
        [Math.min(b[0]+n[0]*half,fb[0]+n[0]*50),b[1],Math.max(b[0]+n[0]*half,fb[0]+n[0]*50),b[1]+returnT]
      ];
      plan.BAYS.push({...meta,rect,frontRect:front,poly,outward:n,projectionMm:projection,returnThicknessMm:returnT,slabThicknessMm:mm(o.bay.slabThicknessCm),sideRects,returnBottomMm:meta.sillMm-20,returnHeightMm:meta.heightMm+20});
      plan.ROOMS.push({id:'bay_'+o.id,name:o.name,poly,mat:'marble',counted:false,sillMm:meta.sillMm,heightMm:meta.heightMm,bay:true});
    }else{
      const openAir=o.windowType==='guarded-open-air';
      plan.WINS.push(rect);plan.WIN_META.push({...meta,type:openAir?'guarded-open-air':'window',noGlass:openAir,guard:openAir,dimensionStatus:openAir?'photo-estimate':meta.dimensionStatus});
    }
  }
  for(const o of d.doors){
    const wall=matchingWalls(d,o)[0],meta=baseOpeningMeta(o),rect=openingRect(o,wall?.thicknessCm||12),v=o.x1===o.x2;
    if(o.sliding||o.operation?.type==='surface-sliding'){
      plan.SLIDES.push({...meta,rect,v,panelCount:o.sliding?.panelCount||1,trackCount:o.sliding?.trackCount||1,stackTo:o.sliding?.stackTo||o.operation?.stackTo,
        surface:o.operation?.type==='surface-sliding',panelRect:o.operation?.panelCm?rectOf(dimensions(o.operation.panelCm)):undefined,
        parkedRect:o.operation?.parkedCm?rectOf(dimensions(o.operation.parkedCm)):undefined,defaultOpen:true,glass:o.kind==='glass-door'});
    }else{
      const oper=o.operation,sw=oper?.swing,leaf=oper?.openLeafCm;
      const shape=oper?{h:vector(oper.hingeCm),c:[sw.dx,sw.dy],o:[sw.ox,sw.oy]}:inferHinge(o);
      plan.DOORS.push({...meta,rect,...shape,len:leaf?mm(Math.max(leaf.w,leaf.d)):Math.max(100,o.widthMm-110),entry:o.id==='entry_door',defaultOpen:Boolean(oper)||o.id==='entry_door',directionStatus:oper?'source-design':'provisional',operation:oper});
    }
  }

  const overridden=new Set();
  for(const f of d.furniture)if(f.storageFitoutId||f.kitchenFitoutId||f.laundryFitoutId||f.garageFitoutId)overridden.add(f);
  for(let fi=0;fi<d.furniture.length;fi++){
    const f=d.furniture[fi];if(overridden.has(f))continue;
    if(f.rugCm)plan.defaultFurniture.push({...convertFurniture({...f.rugCm,name:'客厅地毯',tone:'fabric'},id+'-living-rug'),type:'rug',heightMm:12});
    plan.defaultFurniture.push(convertFurniture(f,f.id||`${id}-f${fi}`));
  }
  const add=(g)=>{if(g)plan.defaultFurniture.push(g);};
  for(const fit of d.bayFitouts){add(groupedFixture('fit-'+fit.id,fit.title,fit.parts.map(partGeometry),{roomId:fit.roomId,notes:fit.summary,conditions:fit.conditions}));}
  for(const fit of d.storageFitouts){
    const parts=fit.parts.flatMap(p=>/niche/.test(p.role)?hollowNiche(p):[partGeometry(p)]);
    add(groupedFixture('fit-'+fit.id,fit.title,parts,{roomId:fit.roomId,notes:fit.summary,conditions:fit.conditions}));
  }
  for(const fit of d.wallFitouts){add(groupedFixture('fit-'+fit.id,fit.title||fit.name||'书房通长书架',fit.parts.filter(p=>p.role!=='book-label').map(partGeometry),{roomId:fit.roomId,notes:fit.description,conditions:fit.conditions}));}
  if(d.laundry){
    const l=d.laundry;
    add(groupedFixture('fit-'+l.id,l.title,l.parts.filter(p=>p.roomId!=='living').map(partGeometry),{roomId:'balcony',conditions:l.conditions}));
    add(groupedFixture('fit-'+l.id+'-bookcase','客厅东墙 · 整墙书架',l.parts.filter(p=>p.roomId==='living').map(partGeometry),{roomId:'living',conditions:l.conditions}));
    for(const machine of l.machines){add({...convertFurniture({...machine,tone:'metal'},machine.id),type:/dryer/.test(machine.id)?'dryer':'washer'});}
    const basin=l.basin;
    // A shallow basin bowl is a hollow set of five panels, not a solid box
    // blocking the washing machine. Its base is at the source bottom height.
    if(basin){
      const q=dimensions(basin),bottom=mm(basin.bottomCm),h=mm(basin.rimCm-basin.bottomCm),t=12;
      const p=[{...q,elevationMm:bottom,heightMm:t,color:'#F4F3EF',role:'basin-bottom'},
        {...q,d:t,elevationMm:bottom,heightMm:h,color:'#F4F3EF',role:'basin-side'},
        {...q,y:q.y+q.d-t,d:t,elevationMm:bottom,heightMm:h,color:'#F4F3EF',role:'basin-side'},
        {...q,w:t,elevationMm:bottom,heightMm:h,color:'#F4F3EF',role:'basin-side'},
        {...q,x:q.x+q.w-t,w:t,elevationMm:bottom,heightMm:h,color:'#F4F3EF',role:'basin-side'}];
      add(groupedFixture('fit-'+basin.id,'洗烘上方独立浅盆',p,{roomId:'balcony'}));
    }
  }
  if(d.kitchenFitout){
    const k=d.kitchenFitout,raw=[...k.parts.filter(p=>p.role!=='shaft').map(partGeometry),...k.countertops.flatMap(top=>splitCutouts(top).map(partGeometry))];
    for(const shaft of k.parts.filter(p=>p.role==='shaft')){
      const r=rectOf(dimensions(shaft));plan.WALLS.push([...r,'shaft']);
      plan.WALL_META.push({sourceId:shaft.id,sourceWallIndex:-1,thicknessMm:mm(Math.min(shaft.w,shaft.d)),heightMm:mm(shaft.hCm),bearingStatus:'service-shaft',nonDemolishable:true,grade:'provisional',notes:'西南烟道不可利用；外包600×600mm仍暂估，检修与排烟接口待核。'});
    }
    add(groupedFixture('fit-'+k.id,'厨房定制地柜 · 吊柜 · 台面',raw,{roomId:'kitchen',conditions:k.conditions}));
    const types={fridge:'fridge',dishwasher:'dishwasher',doubleSink:'ksink',gasHob:'stove',hood:'hood',waterHeater:'waterheater',faucet:'faucet'};
    for(const a of k.appliances){
      const f=convertFurniture({...a,name:{fridge:'厨房冰箱',dishwasher:'厨房洗碗机',doubleSink:'厨房双槽水槽',gasHob:'燃气灶',hood:'抽油烟机',waterHeater:'壁挂热水器',faucet:'水槽龙头'}[a.type],tone:'metal'},a.id);
      f.type=types[a.type]||a.type;f.dimensionStatus=a.dimensionStatus;f.sourceType=a.type;add(f);
    }
  }
  if(d.garage){
    const g=d.garage;add(groupedFixture('fit-'+g.id,'800库围合与层架',g.parts.filter(p=>p.role!=='folded-door').map(partGeometry),{roomId:'living',conditions:g.conditions}));
    for(const item of g.items){add({...convertFurniture({...item,name:item.label,tone:'metal'},'garage-'+item.id),type:item.kind});}
    const spec=g.presentationDoor||{},opening=g.opening,axis=opening.x1===opening.x2?'y':'x',depth=mm(spec.panelDepthCm||2.5);
    const x=mm(Math.min(opening.x1,opening.x2)),y=mm(Math.min(opening.y1,opening.y2));
    const rect=axis==='x'?[x,y,x+mm(Math.abs(opening.x2-opening.x1)),y+depth]:[x,y,x+depth,y+mm(Math.abs(opening.y2-opening.y1))];
    plan.BIFOLDS.push({id:'800-library-door',name:'800库四扇内折门',rect,axis,panels:spec.panelCount||g.doorOperation.panelCount,
      heightMm:mm(spec.heightCm||opening.heightCm),elevationMm:mm(spec.zCm||0),closed:spec.default==='closed'||g.presentationDoorState==='folded-closed',foldDirection:g.doorFoldDirection||'inward',color:'#F3EFE6',
      insideRect:rectOf(dimensions(g.inner)),panelWidthMm:mm(spec.panelWidthCm||g.doorOperation.panelWidthCm),clearWidthMm:mm(opening.clearWidthCm),conditions:g.conditions});
  }
  if(d.modelAddons?.livingFloorLampCm){const p=d.modelAddons.livingFloorLampCm;add({id:'living-floorlamp',type:'floorlamp',name:'客厅落地灯',cx:mm(p.x),cy:mm(p.y),w:400,d:400,rot:0,color:'#B29769',heightMm:1600});}
  const art=d.modelAddons?.livingWallArt;
  if(art?.items)add(groupedFixture('living-east-art','沙发东侧装饰画',art.items.map(p=>partGeometry({...p,material:'OakLight',role:'wall-art'})),{roomId:'living'}));
  const allRects=[...plan.WALLS,...plan.WINS,...plan.BAYS.flatMap(b=>b.sideRects),...plan.BIFOLDS.map(b=>b.rect)];
  const pts=[...plan.ROOMS.flatMap(r=>r.poly),...allRects.flatMap(w=>[[w[0],w[1]],[w[2],w[3]]])];
  const x=Math.min(...pts.map(p=>p[0])),y=Math.min(...pts.map(p=>p[1])),maxX=Math.max(...pts.map(p=>p[0])),maxY=Math.max(...pts.map(p=>p[1]));
  plan.PLAN_BOUNDS={x,y,w:maxX-x,h:maxY-y};plan.BOUNDS={x:x-1000,y:y-1000,w:maxX-x+2000,h:maxY-y+2000};plan.CENTER={x:(x+maxX)/2,y:(y+maxY)/2};
  plan.metadata={sourceUnit:'cm',unit:'mm',sourceVersion:d.version,source:d.provenance,coordinateSystem:{x:'向东（图右）',y:'向南（图下）'},
    measurements:d.measurementRevision,anchors:d.anchors,products:d.purchasedFurnitureRevision?.products,
    conditions:['墙体、房间多边形和面积沿用既有方案；部分复尺已应用，全屋墙线和共同基准未闭合。','编辑器中的尺寸以模型坐标为准；已购家具保持机身外廓，安装、门套及五金余量待核。'],
    balconyOpenness:d.balconyOpennessRevision,garageMovement:d.garage?.movementValidation,
    converter:'tools/convert-house-plans.cjs',wallStatus:'承重性未鉴定；原源数据未授权将未知内墙标记为可拆非承重墙。'};
  applyCabinetDesigns(plan,d);
  validate(plan,d);return plan;
}

function centroid(poly){
  // Interior label positions in the source win; for the remaining polygons
  // this bounding-box center mirrors the original viewer's room label fallback.
  return [(Math.min(...poly.map(p=>p[0]))+Math.max(...poly.map(p=>p[0])))/2,(Math.min(...poly.map(p=>p[1]))+Math.max(...poly.map(p=>p[1])))/2];
}
function splitCutouts(top){
  const xs=[top.x,top.x+top.w,...(top.cutouts||[]).flatMap(c=>[c.x,c.x+c.w])].filter(x=>x>=top.x&&x<=top.x+top.w).sort((a,b)=>a-b);
  const ys=[top.y,top.y+top.d,...(top.cutouts||[]).flatMap(c=>[c.y,c.y+c.d])].filter(y=>y>=top.y&&y<=top.y+top.d).sort((a,b)=>a-b);
  const out=[];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
    const x=xs[i],y=ys[j],w=xs[i+1]-x,d=ys[j+1]-y;
    if(w<=0||d<=0||(top.cutouts||[]).some(c=>x+w/2>c.x&&x+w/2<c.x+c.w&&y+d/2>c.y&&y+d/2<c.y+c.d))continue;
    out.push({...top,id:top.id+`-${i}-${j}`,x,y,w,d,role:'countertop'});
  }
  return out;
}
function area(poly){return Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;}
function validate(p,d){
  const ensure=(v,msg)=>{if(!v)throw new Error(`${p.id}: ${msg}`);};
  ensure(p.WINS.length===p.WIN_META.length,'window metadata must match geometry');
  ensure(p.WALLS.length===p.WALL_META.length,'wall metadata must match geometry');
  ensure(new Set(p.defaultFurniture.map(f=>f.id)).size===p.defaultFurniture.length,'furniture ids must be unique');
  for(const r of d.rooms){const imported=p.ROOMS.find(q=>q.id===r.id);ensure(Math.abs(area(imported.poly)-area(r.points)*100)<.01,`area changed for ${r.id}`);}
  for(const w of p.WALLS)ensure(w[2]>w[0]&&w[3]>w[1],'walls must have positive thickness');
  for(const o of [...d.windows,...d.doors]){
    const matching=matchingWalls(d,o);ensure(matching.length,`${o.id}: aperture has no source wall`);
    const rect=openingRect(o,matching[0].thicknessCm);
    p.WALLS.forEach((w,i)=>{
      if(!matching.some(s=>s.id===p.WALL_META[i].sourceId))return;
      const overlapX=Math.min(w[2],rect[2])-Math.max(w[0],rect[0]),overlapY=Math.min(w[3],rect[3])-Math.max(w[1],rect[1]);
      ensure(overlapX<.001||overlapY<.001,`${o.id}: imported full-height wall obstructs its aperture`);
    });
  }
  for(const door of p.DOORS){ensure(Math.abs(door.c[0]*door.o[0]+door.c[1]*door.o[1])<.001,`${door.sourceId}: hinged directions not perpendicular`);ensure(door.len<=door.openingWidthMm,`${door.sourceId}: leaf larger than opening`);}
  for(const f of p.defaultFurniture){
    ensure([f.cx,f.cy,f.w,f.d,f.rot,f.heightMm].every(Number.isFinite),`${f.id}: non-finite furniture geometry`);
    ensure(f.w>0&&f.d>0,`${f.id}: invalid furniture footprint`);
    if(f.sourceFootprintMm){const a=f.rot*Math.PI/180,q=f.sourceFootprintMm;const worldW=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),worldD=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));ensure(Math.abs(worldW-q.w)<.01&&Math.abs(worldD-q.d)<.01,`${f.id}: rotation changed world occupied footprint`);}
  }
  for(const f of p.defaultFurniture.filter(f=>f.purchasedProductId)){
    const prod=d.purchasedFurnitureRevision.products.find(q=>q.id===f.purchasedProductId);
    ensure(prod,`${f.id}: missing purchased product provenance`);ensure(f.w===prod.dimensionsMm.width&&f.d===prod.dimensionsMm.depth,`${f.id}: purchased width/depth changed`);ensure(f.heightMm===prod.dimensionsMm.height,`${f.id}: purchased height changed`);
  }
  ensure(p.BAYS.length===3,'must retain three projecting bay windows');
  for(const bay of p.BAYS){
    const source=d.windows.find(w=>w.id===bay.sourceId),frontCenter=[(bay.frontRect[0]+bay.frontRect[2])/2,(bay.frontRect[1]+bay.frontRect[3])/2],sourceCenter=[mm((source.x1+source.x2)/2),mm((source.y1+source.y2)/2)];
    const distance=(frontCenter[0]-sourceCenter[0])*bay.outward[0]+(frontCenter[1]-sourceCenter[1])*bay.outward[1];
    ensure(Math.abs(distance-bay.projectionMm-60)<.001,`${bay.id}: outward bay projection changed`);
    ensure(p.WIN_META.filter(w=>w.sourceId===bay.sourceId&&w.type==='bay-aperture'&&w.noGlass).length===1,`${bay.id}: bay throat must remain unglazed`);
  }
  ensure(p.WIN_META.filter(w=>w.type==='guarded-open-air'&&w.noGlass&&w.guard).length===2,'balcony north/east guarded openings must remain unglazed');
  ensure(p.defaultFurniture.filter(f=>f.type==='bed').every(f=>f.headDirection===('bed_a'===f.sourceId?'east':'west')),'bed orientation changed');
  if(p.id==='family')ensure(p.BIFOLDS[0]?.panels===4&&p.BIFOLDS[0]?.closed,'800 library must default to four closed folding leaves');
}

fs.mkdirSync(path.join(root,'data','source'),{recursive:true});
let sourceCommit=null;
if(sourceRoot)try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8'}).trim();}catch{}
const bundle={version:'1.0.0',defaultScheme:'family',unit:'mm',schemes:{}};
for(const id of ids){
  const snapshotPath=path.join(root,'data','source',id+'.json');
  if(refresh||!fs.existsSync(snapshotPath)){
    if(!sourceRoot)throw new Error('First import requires --source <house-design repo> --refresh-sources');
    const relative=`models/schemes/${id}/design-data.json`,raw=fs.readFileSync(path.join(sourceRoot,relative),'utf8');
    const d=JSON.parse(raw),p={repository:'https://github.com/itwake/house-design',commit:sourceCommit,path:relative,sha256:hash(raw),importDate:'2026-10-07',lastViewerVersion:'3.13.3'};
    fs.writeFileSync(snapshotPath,JSON.stringify(snapshot(d,p),null,2)+'\n');
  }
  bundle.schemes[id]=convert(JSON.parse(fs.readFileSync(snapshotPath,'utf8')),id);
}
const serialized=JSON.stringify(bundle,null,2);
fs.writeFileSync(path.join(root,'data','house-plans.js'),'// Generated by tools/convert-house-plans.cjs. Units: mm.\n(function(root){\n\'use strict\';\nconst plans = '+serialized+';\nroot.HOUSE_PLANS=plans;\nif(typeof module!==\'undefined\'&&module.exports)module.exports=plans;\n})(typeof window!==\'undefined\'?window:globalThis);\n');
fs.writeFileSync(path.join(root,'data','manifest.json'),JSON.stringify({version:bundle.version,defaultScheme:bundle.defaultScheme,schemes:ids.map(id=>{const s=bundle.schemes[id];return {id,name:s.name,rooms:s.ROOMS.filter(r=>r.counted!==false).length,walls:s.WALLS.length,windows:s.WINS.length,doors:s.DOORS.length,slidingDoors:s.SLIDES.length,furniture:s.defaultFurniture.length,source:s.metadata.source};})},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',schemes:ids.map(id=>({id,rooms:bundle.schemes[id].ROOMS.length,furniture:bundle.schemes[id].defaultFurniture.length,walls:bundle.schemes[id].WALLS.length})),output:'data/house-plans.js'},null,2));
