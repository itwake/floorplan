'use strict';
// Model/detail regression checks, not fabrication, electrical or accessible-
// clearance approval. Historical cm source files remain immutable.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),plans=require(path.join(root,'data/house-plans.js'));
// The reference cabinet layer and source-union comparisons belong only to
// the three original cm imports; screen is independently checked in mm.
const legacySchemes=['wood','family','laundry'].map(id=>{assert.ok(plans.schemes[id],id+': original imported scheme missing');return [id,plans.schemes[id]];});
const revision='sideboard-reference-v2',target='fit-dining_sideboard_wall',T=18,tol=.01;
const mm=n=>n*10,eq=(a,b,label)=>assert.ok(Math.abs(a-b)<tol,`${label}: ${a} != ${b}`);
const rect=p=>({x:mm(p.x),y:mm(p.y),w:mm(p.w),d:mm(p.d)});
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>tol&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>tol;
const overlap3=(a,b)=>overlap(a,b)&&Math.min(a.elevationMm+a.heightMm,b.elevationMm+b.heightMm)-Math.max(a.elevationMm,b.elevationMm)>tol;
const within=(a,b)=>a.x>=b.x-tol&&a.y>=b.y-tol&&a.x+a.w<=b.x+b.w+tol&&a.y+a.d<=b.y+b.d+tol;
// Exact rectangle-union containment, not the full L-shaped bounding box. Cut
// at every source edge, so a component cannot bridge the empty L concavity.
function withinUnion(p,regions){
  const xs=[p.x,p.x+p.w,...regions.flatMap(q=>[q.x,q.x+q.w]).filter(x=>x>p.x&&x<p.x+p.w)].sort((a,b)=>a-b);
  const ys=[p.y,p.y+p.d,...regions.flatMap(q=>[q.y,q.y+q.d]).filter(y=>y>p.y&&y<p.y+p.d)].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){
    if(xs[i]-xs[i-1]<tol||ys[j]-ys[j-1]<tol)continue;
    const x=(xs[i-1]+xs[i])/2,y=(ys[j-1]+ys[j])/2;
    if(!regions.some(q=>x>=q.x-tol&&x<=q.x+q.w+tol&&y>=q.y-tol&&y<=q.y+q.d+tol))return false;
  }
  return true;
}
const report=[];
for(const [id,scheme]of legacySchemes){
  const referenceId=id==='wood'&&scheme.metadata.layoutUpdate?'family':id;
  const source=JSON.parse(fs.readFileSync(path.join(root,'data/source',referenceId+'.json'),'utf8'));
  const fit=source.storageFitouts.find(q=>q.id==='dining_sideboard_wall'),f=scheme.defaultFurniture.find(q=>q.id===target);
  assert.equal(f.cabinetRevision,revision,id+': reference sideboard missing');
  assert.equal(f.cabinetDesign.revision,revision);assert.equal(f.heightMm,2700);assert.equal(f.baseHeightMm,2700);
  assert.equal(f.cabinetDesign.previousHeightMm,2500);assert.deepEqual(f.cabinetDesign.previousColors,['#F3EFE6','#F4F1E9']);
  assert.equal(f.cabinetDesign.ceilingHeightMm,2700);assert.equal(f.cabinetDesign.ceilingStatus,'model-only-pending-site-check');
  assert.match(f.cabinetDesign.dimensions.join(' '),/现场.*待|现场.*复核/);
  assert.equal(scheme.ROOMS.find(r=>r.id==='living').heightMm||scheme.HEIGHT_MM,2700,id+': to-ceiling claim differs from model ceiling');
  const bases=fit.parts.filter(p=>['sideboard_base','sideboard_blind_base'].includes(p.role)).map(rect);
  const uppers=fit.parts.filter(p=>['upper_cabinet','upper_blind_corner'].includes(p.role)).map(rect);
  const absolute=f.parts.map(p=>({...p,x:p.x+f.cx,y:p.y+f.cy}));
  assert.equal(new Set(absolute.map(p=>p.id)).size,absolute.length,id+': duplicated part ID');
  for(const p of absolute){
    assert.ok(withinUnion(p,[...bases,...uppers]),id+'/'+p.id+': leaves original L/straight planar union');
    assert.ok(p.elevationMm>=0&&p.elevationMm+p.heightMm<=2700+tol,id+'/'+p.id+': leaves approved vertical envelope');
    if(p.id.includes('reference-west-central-upper')||p.id.startsWith('reference-upper-blind-bridge')||p.id.startsWith('d_return_upper')||p.id.startsWith('d_corner_upper'))assert.ok(withinUnion(p,uppers),id+'/'+p.id+': central/return shallow upper moved off its old union');
  }
  const shape=absolute.find(p=>p.shape==='rounded-shell');
  assert.ok(shape,id+': real hollow curved end missing');assert.equal(shape.role,'rounded-end-shell');assert.equal(shape.radiusMm,60);assert.equal(shape.wallThicknessMm,T);
  assert.equal(shape.heightMm,2664);assert.equal(shape.elevationMm,T);assert.equal(shape.usableStorage,false);
  assert.equal(Math.min(shape.w,shape.d),160,id+': rounded end is a 160mm hollow column, not a radius-clamped 18mm solid panel');
  const curvedCaps=absolute.filter(p=>p.shape==='rounded-plan-board');assert.equal(curvedCaps.length,2);
  assert.deepEqual(curvedCaps.map(p=>p.elevationMm).sort((a,b)=>a-b),[0,2682]);
  for(const p of curvedCaps){assert.equal(p.heightMm,T);assert.equal(p.radiusMm,60);eq(p.w,shape.w,p.id+' width');eq(p.d,shape.d,p.id+' depth');}
  const slats=absolute.filter(p=>p.role==='wood-slat');assert.ok(slats.length>=9,id+': decorative oak grille missing');
  for(const p of slats){assert.equal(p.color,'#CDB594');assert.equal(p.heightMm,2700);assert.equal(Math.min(p.w,p.d),9);}
  const tallFronts=absolute.filter(p=>/^door-/.test(p.role)&&p.elevationMm<2&&p.heightMm>2600);assert.ok(tallFronts.length>=2);
  assert.ok(tallFronts.filter(p=>p.id.includes('left-tall')).every(p=>p.role==='door-sliding'),id+': southern high cabinet must not hinge into dining chairs');
  for(const p of tallFronts){assert.equal(p.color,'#F4F1E9');eq(p.elevationMm+p.heightMm,2698.5,p.id+' ceiling front');}
  const oakFronts=absolute.filter(p=>p.role==='door-hinged'&&p.elevationMm>=1500);assert.ok(oakFronts.length>=2,id+': oak upper door segment missing');
  for(const p of oakFronts)assert.equal(p.material,'OakLight');
  const upperMiddle=absolute.filter(p=>p.id.endsWith('open-middle'));assert.equal(upperMiddle.length,1,id+': open book niche must have two levels');
  assert.equal(upperMiddle[0].elevationMm,2100);assert.equal(upperMiddle[0].heightMm,T);
  const displayShelves=absolute.filter(p=>p.id.includes('reference-west-display-display-shelf-'));assert.equal(displayShelves.length,4,id+': vertical display column must have five cells');
  assert.deepEqual(displayShelves.map(p=>p.elevationMm),[540,1080,1620,2160]);
  const lights=absolute.filter(p=>p.role==='led-strip');assert.ok(lights.length>=8,id+': expected work niche, book cells and five display lights');
  const mainLight=lights.filter(p=>p.lightWash);assert.equal(mainLight.length,1,id+': continuous central LED should not become multiple heavy lights');
  for(const p of lights){
    const board=absolute.find(q=>q.id===p.anchorPartId);assert.ok(board,id+'/'+p.id+': real anchor panel missing');
    assert.equal(p.anchor,'panel-underside');assert.equal(p.material,'Light');assert.equal(p.heightMm,4);
    eq(p.elevationMm+p.heightMm,board.elevationMm,id+'/'+p.id+' actual board underside');
    assert.ok(within(p,board),id+'/'+p.id+': strip floats beyond anchor board');
  }
  const displayLights=lights.filter(p=>p.id.includes('reference-west-display-display-light-'));assert.equal(displayLights.length,5);
  const middleLights=lights.filter(p=>/open-mid-light|open-top-light/.test(p.id));assert.equal(middleLights.length,2);
  assert.ok(mainLight[0].id.includes('niche-continuous-light'));assert.ok(mainLight[0].anchorPartId.endsWith('shared-bottom'));
  const sharedBottom=absolute.find(p=>p.id===mainLight[0].anchorPartId);assert.equal(sharedBottom.heightMm,T);assert.equal(sharedBottom.elevationMm,1500);
  const rail=absolute.filter(p=>p.role==='socket-rail');assert.equal(rail.length,1);assert.equal(rail[0].socketCount,3);assert.equal(rail[0].installation,'power-circuit-pending');
  assert.equal(rail[0].heightMm,40);assert.equal(rail[0].elevationMm,1170);
  const drawers=absolute.filter(p=>p.role==='drawer-front');assert.equal(drawers.length,3,id+': lower column must have three drawers');
  assert.deepEqual(drawers.map(p=>p.drawerLayer).sort(),[1,2,3]);
  const drawerWidth=referenceId==='family'?400:600;
  const adaptation=f.cabinetDesign.layoutAdaptations;
  assert.equal(adaptation.facadeLeft,'south');assert.equal(adaptation.facadeRight,'north');
  assert.equal(adaptation.drawerColumn.widthMm,drawerWidth);assert.equal(adaptation.drawerColumn.maxExtensionMm,250);
  const expectedY=referenceId==='family'?[9190,9590]:[9200,9800];assert.deepEqual([adaptation.drawerColumn.yStartMm,adaptation.drawerColumn.yEndMm],expectedY);
  const fixed=absolute.filter(p=>/^cabinet-|niche-back/.test(p.role));
  for(const drawer of absolute.filter(p=>p.role==='drawer-box'))for(const p of fixed)assert.ok(!overlap3(drawer,p),id+'/'+drawer.id+': drawer intersects fixed '+p.id);
  const peopleFurniture=source.furniture.filter(q=>q.name==='四人餐桌'||/餐椅/.test(q.name)).map(q=>({...rect(q),name:q.name}));
  assert.equal(peopleFurniture.length,5,id+': dining table plus four chairs expected');
  for(const p of drawers){
    assert.equal(p.maxExtensionMm,250);assert.equal(p.placement,'north-safe-zone');eq(Math.max(p.w,p.d),drawerWidth-3,p.id+' front width');
    const extended={x:p.x+250,y:p.y,w:p.w,d:p.d};
    const swept={x:p.x,y:p.y,w:p.w+250,d:p.d};
    for(const q of peopleFurniture)assert.ok(!overlap(swept,q),id+'/'+p.id+': 0–250mm drawer sweep collides with '+q.name);
    assert.ok(!overlap(extended,peopleFurniture[0]),id+': fully open drawer hits table');
  }
  // The photo has drawers, but this real table contact region retains sliders
  // rather than pretending a front-opening drawer could operate behind it.
  const table=peopleFurniture.find(p=>p.name==='四人餐桌');
  for(const p of absolute.filter(q=>q.face==='east'&&q.elevationMm<850&&q.y<table.y+table.d&&q.y+q.d>table.y))if(p.role.startsWith('door-'))assert.equal(p.role,'door-sliding',id+': door at table-contact region should not hinge into it');
  const blind=absolute.filter(p=>p.id.startsWith('d_corner_')||p.id.startsWith('reference-upper-blind-bridge'));
  if(referenceId==='family'){
    assert.equal(blind.length,0);assert.ok(!absolute.some(p=>p.face==='north'),id+': north-opening 800库 must not gain a blocking return');
    assert.equal(scheme.BIFOLDS.length,1);assert.equal(scheme.BIFOLDS[0].closed,true);assert.equal(scheme.BIFOLDS[0].panels,4);
  }else{
    assert.ok(blind.length>0);for(const p of blind){assert.equal(p.usableStorage,false,p.id+': blind corner invents storage');assert.ok(!p.doorStyle&&!/^door-|drawer-front/.test(p.role),p.id+': blind corner falsely claims access');}
    const ret=absolute.filter(p=>p.id.startsWith('d_return_'));assert.ok(ret.some(p=>p.role==='wood-countertop'));assert.ok(ret.some(p=>p.role==='led-strip'));
    assert.ok(ret.filter(p=>p.role==='door-sliding').length>=2,id+': L return lower must retain sliding fronts');
  }
  const books=absolute.filter(p=>p.role==='display-book');assert.ok(books.length>=9);
  for(const p of books){assert.ok(p.heightMm<=260&&p.w<=160&&p.d<=160,p.id+': book is a real small accessory, not an opaque cubby filler');assert.equal(p.material,'BookPaper');}
  report.push({id,planarUnionMatchesReference:referenceId,heightMm:2700,defaultHeightPendingSiteCheck:true,drawerWidthMm:drawerWidth,drawerSweepsAvoidDiningFurniture:true,ledsAnchoredToRealPanels:lights.length,roundedHollowEnd:true});
}
console.log(JSON.stringify({status:'PASS',revision,modelGeometryOnly:true,schemes:report},null,2));
