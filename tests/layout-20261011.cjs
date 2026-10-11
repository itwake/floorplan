'use strict';

// Owner-confirmed October 11 layout. All gaps below are model arithmetic,
// not a measurement certificate, accessible-route or construction approval.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {beforeFamilyBathReview,verifyFamilyBathReview}=require('./family-bath-review-20261011.cjs');
const root=path.resolve(__dirname,'..');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Frozen from published fe2ec4a BEFORE either October 11 generator was run.
// These include all cabinet parts, operation data, metadata and array order.
const baseline={
  wood:'22be3487cbf971be1d57e305c7b5967034d094b1f04e6188413f134327fedca5',
  family:'5421b99746df2c307c52d543579a0a5789f3f38edaea51c589adfeaaf56b139a',
  laundry:'d2a3c1cec12edc27af4e4d2e2dd153455fed2e20e6a040b042cc641f86541aae',
  screen:'9ca78fb35de0e67d1038544605e327cdefcf865170acf120f953cfefe61ae545'
};
const sourceBaseline={wood:'f9d084d5cd9e4e44ac228f01ef83d679547379ab5f74c1bf155256015c747eb8',family:'7c026c7cb8f8035426299220acebc6e757126e5b33252666a44e02679e39e895',laundry:'71f8cae04f7ff7e808eb4c796d7a362121ac551a0321c337d7c1c072b35e80ce'};
const ENTRY='entry-family-layout-20261011',BEDROOM='bedroom-confirmed-20261011';
const bedroomOldIds=['bed_a','bed_b','family-f1','family-f3','bed_b_niche_console','fit-bay_b_tea'];
const bedroomNewIds=['draft-desk-b','draft-chair-b','draft-night-b','draft-desk-a','draft-chair-a','draft-night-a'];
const garageIds=['fit-family_garage','garage-folded_stroller','garage-child_bike'];
const clone=v=>structuredClone(v),tol=.02,eq=(a,b,label)=>assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} != ${b}`);
const omit=(v,keys)=>Object.fromEntries(Object.entries(v).filter(([k])=>!keys.includes(k)));
const get=(p,id)=>{const f=p.defaultFurniture.find(f=>f.id===id);assert.ok(f,`${p.id}/${id}: missing furniture`);return f;};
const worldRect=f=>{const a=f.rot*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),w=f.w*c+f.d*s,d=f.w*s+f.d*c;return{x:f.cx-w/2,y:f.cy-d/2,w,d};};
const rectArray=f=>{const r=worldRect(f);return[r.x,r.y,r.x+r.w,r.y+r.d];};
const eqRect=(f,expected,label)=>rectArray(f).forEach((n,i)=>eq(n,expected[i],label+' edge '+i));
const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>tol&&Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y)>tol;

function restoreFurniture(p,u){
  const map=new Map(p.defaultFurniture.filter(f=>!u.newFurnitureIds.includes(f.id)).map(f=>[f.id,f]));
  for(const f of u.previousFurniture)map.set(f.id,clone(f));
  assert.deepEqual([...map.keys()].sort(),[...u.previousFurnitureOrder].sort(),p.id+': reversal furniture ID set changed');
  p.defaultFurniture=u.previousFurnitureOrder.map(id=>map.get(id));
}
function restoreMetadata(p,key,value){if(value===undefined)delete p.metadata[key];else p.metadata[key]=clone(value);}
function beforeLayout20261011(plan){
  // Reverse the separately exact-tested later bath authorization first.
  // The October 11 entry/bedroom historical hashes remain frozen.
  const p=beforeFamilyBathReview(plan),b=p.metadata.bedroomUpdate;
  // Reverse in generator order: bedroom was applied after entry/family.
  if(b){assert.equal(b.id,BEDROOM);restoreFurniture(p,b);delete p.metadata.bedroomUpdate;}
  const e=p.metadata.entryFamilyUpdate;
  if(e){
    assert.equal(e.id,ENTRY);restoreFurniture(p,e);
    p.DOORS=p.DOORS.map(d=>d.id===e.previousEntryDoor.id?clone(e.previousEntryDoor):d);
    p.defaultFurniture=p.defaultFurniture.map(f=>f.id===e.previousEntryCabinet.id?clone(e.previousEntryCabinet):f);
    p.BIFOLDS=clone(e.previousBifolds);
    for(const [k,v]of Object.entries(e.previousBounds))p[k]=clone(v);
    for(const [key,previous]of [['cabinetRevision','previousCabinetRevision'],['sideboardReference','previousSideboardReference'],['garageMovement','previousGarageMovement'],['converter','previousConverter'],['designCorrections','previousDesignCorrections'],['conditions','previousConditions']])restoreMetadata(p,key,e[previous]);
    delete p.metadata.entryFamilyUpdate;
  }
  return p;
}

// Continuous outward west/south quarter-sector, fixture inflated by half the
// 40 mm leaf thickness. Public-space obstacles are unknown, not assumed free.
function outwardSweepHits(door,fixture){
  const [hx,hy]=door.h,half=20,x0=fixture.x-half,x1=Math.min(hx,fixture.x+fixture.w+half),y0=Math.max(hy,fixture.y-half),y1=fixture.y+fixture.d+half;
  return x0<=x1&&y0<=y1&&Math.hypot(hx-x1,y0-hy)<=door.len+tol;
}
function assertFinite(v,at){
  if(typeof v==='number')assert.ok(Number.isFinite(v),at+': non-finite number');
  else if(Array.isArray(v))v.forEach((q,i)=>assertFinite(q,at+'['+i+']'));
  else if(v&&typeof v==='object')for(const[k,q]of Object.entries(v))assertFinite(q,at+'.'+k);
}

function verifyLayout(plans){
  assert.equal(plans.defaultScheme,'family');assert.deepEqual(Object.keys(plans.schemes).sort(),['family','laundry','screen','wood']);
  // Validate actual current data before deriving the historical entry/bedroom
  // view; this must never turn a new geometry change into a blanket exemption.
  const bathReview=plans.schemes.family.metadata.familyBathUpdate?verifyFamilyBathReview(plans):null;
  const layoutSchemes=Object.fromEntries(Object.entries(plans.schemes).map(([id,p])=>[id,beforeFamilyBathReview(p)]));
  const prior=Object.fromEntries(Object.entries(layoutSchemes).map(([id,p])=>[id,beforeLayout20261011(p)]));
  for(const[id,p]of Object.entries(prior))assert.equal(hash(p),baseline[id],id+': changed outside precisely restored October 11 targets, or modified historical layer');
  for(const[id,digest]of Object.entries(sourceBaseline))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/source',id+'.json'),'utf8').replace(/\r\n/g,'\n')).digest('hex'),digest,id+': original source snapshot changed');
  assert.equal(hash(JSON.parse(fs.readFileSync(path.join(root,'data/source/screen-confirmed-20261010.json'),'utf8'))),'d3f2941bedc0b05c9f67843ef091f3b2a3ab25cf47ca980ce14f44e56bd53015','screen R4 confirmation snapshot changed');
  const report=[];
  for(const id of ['wood','family','laundry']){
    const p=layoutSchemes[id],old=prior[id],u=p.metadata.entryFamilyUpdate;
    assert.equal(u.id,ENTRY);assert.equal(u.date,'2026-10-11');assert.equal(u.sourceSnapshotsUnchanged,true);
    assert.equal(u.openingUnchanged,true);assert.equal(u.entryCabinetGeometryUnchanged,true);
    assert.deepEqual(u.newFurnitureIds,[]);
    assert.deepEqual(u.removedFurnitureIds,id==='family'?garageIds:[]);
    assert.deepEqual(u.replacedFurnitureIds,id==='family'?['fit-dining_sideboard_wall']:[]);
    assert.deepEqual(u.removedBifoldIds,id==='family'?['800-library-door']:[]);
    assert.deepEqual(u.previousFurniture.map(f=>f.id).sort(),id==='family'?['fit-dining_sideboard_wall',...garageIds].sort():[]);
    assert.deepEqual(u.previousEntryDoor,old.DOORS.find(d=>d.entry));assert.deepEqual(u.previousEntryCabinet,get(old,'fit-entry_shoe_station'));
    const door=p.DOORS.find(d=>d.entry),oldDoor=old.DOORS.find(d=>d.entry);
    for(const k of ['sourceId','sourceAxisMm','rect','openingWidthMm','heightMm','headMm','sillMm','len','entry','grade'])assert.deepEqual(door[k],oldDoor[k],id+': entry '+k+' changed');
    assert.deepEqual(door.h,[door.rect[2]-60,(door.rect[1]+door.rect[3])/2]);assert.deepEqual(door.c,[-1,0]);assert.deepEqual(door.o,[0,1]);
    assert.equal(door.defaultOpen,true);assert.equal(door.swingRevision,ENTRY);assert.equal(door.directionStatus,'user-design-correction');
    assert.equal(door.dimensionStatus,'design-pending');assert.equal(door.placementStatus,'unresolved');
    assert.match(door.notes,/公共|公区/);assert.match(door.notes,/待|尚/);assert.match(door.notes,/不构成/);
    assert.deepEqual(door.operation.hingeCm,door.h.map(n=>n/10));assert.deepEqual(door.operation.swing,{dx:-1,dy:0,ox:0,oy:1,sweep:-1});
    assert.deepEqual(door.operation.openLeafCm,{x:(door.h[0]-20)/10,y:door.h[1]/10,w:4,d:door.len/10});
    assert.ok(door.h[0]-door.len>=door.rect[0]&&door.h[0]<=door.rect[2],'closed leaf no longer fits old entry opening');
    for(const f of p.defaultFurniture.filter(f=>f.type!=='rug'))assert.ok(!outwardSweepHits(door,worldRect(f)),id+'/'+f.id+': outward leaf sweeps interior object');
    const shoe=get(p,'fit-entry_shoe_station'),oldShoe=get(old,shoe.id);
    assert.deepEqual(omit(shoe,['notes','sourceNotes','conditions','cabinetDesign','layoutRevision']),omit(oldShoe,['notes','sourceNotes','conditions','cabinetDesign','layoutRevision']),id+': entry cabinet geometry/material changed');
    assert.deepEqual(omit(shoe.cabinetDesign,['features']),omit(oldShoe.cabinetDesign,['features']),id+': entry cabinet design outside swing description changed');
    assert.equal(shoe.cabinetDesign.features.length,oldShoe.cabinetDesign.features.length);
    for(let i=0;i<oldShoe.cabinetDesign.features.length;i++)if(i!==3)assert.equal(shoe.cabinetDesign.features[i],oldShoe.cabinetDesign.features[i]);
    assert.ok(!/先收门|先关门|打开会挡柜面|右合页90°/.test(JSON.stringify({notes:shoe.notes,conditions:shoe.conditions,features:shoe.cabinetDesign.features})),id+': obsolete inside-swing use instruction');
    assert.match(shoe.cabinetDesign.features[3],/向外开启/);
    for(const key of ['ROOMS','WALLS','WALL_META','WINS','WIN_META','SLIDES','BAYS'])assert.deepEqual(p[key],old[key],id+'/'+key+': unauthorized architecture change');
    assert.deepEqual(p.DOORS.filter(d=>!d.entry),old.DOORS.filter(d=>!d.entry),id+': other door changed');
    const entryAffected=new Set(['fit-entry_shoe_station',...(id==='family'?['fit-dining_sideboard_wall',...garageIds]:[]),...(id==='family'?bedroomOldIds:[])]);
    for(const f of old.defaultFurniture)if(!entryAffected.has(f.id))assert.deepEqual(get(p,f.id),f,id+'/'+f.id+': unauthorized furniture change');
    if(id==='family'){
      assert.equal(p.BIFOLDS.length,0);for(const removed of garageIds)assert.ok(!p.defaultFurniture.some(f=>f.id===removed));
      const f=get(p,'fit-dining_sideboard_wall'),ref=get(prior.laundry,f.id);
      // Only actual-family use warnings differ. Every board, material and
      // numerical fixture field is still copied exactly from the L reference.
      assert.deepEqual(omit(f,['layoutRevision','designReferenceSchemeId','sourceNotes','notes','conditions','cabinetDesign']),omit(ref,['notes','conditions','cabinetDesign']),'family L-sideboard must be the complete laundry cabinet, not only same bounding box');
      const design=f.cabinetDesign,refDesign=ref.cabinetDesign;
      assert.deepEqual(omit(design,['features','dimensions','layoutAdaptations']),omit(refDesign,['features','dimensions','layoutAdaptations']));
      assert.equal(design.features.length,refDesign.features.length);assert.equal(design.dimensions.length,refDesign.dimensions.length);assert.equal(f.conditions.length,ref.conditions.length);
      for(let i=0;i<refDesign.features.length;i++)if(i!==3)assert.equal(design.features[i],refDesign.features[i]);
      for(let i=0;i<refDesign.dimensions.length;i++)if(i!==2)assert.equal(design.dimensions[i],refDesign.dimensions[i]);
      for(let i=0;i<ref.conditions.length;i++)if(![2,4].includes(i))assert.equal(f.conditions[i],ref.conditions[i]);
      assert.deepEqual(omit(design.layoutAdaptations,['drawerReason','actualLayoutConstraints']),omit(refDesign.layoutAdaptations,['drawerReason']));
      assert.deepEqual(design.layoutAdaptations.actualLayoutConstraints,{drawerFullExtensionMm:250,drawerFullExtensionRequiresMovingChair:true,drawerIllustrativeExtensionWithChairMm:180,drawerToChairIllustrativeGapMm:20});
      const warning=[f.notes,f.conditions[2],f.conditions[4],design.features[3],design.dimensions[2],design.layoutAdaptations.drawerReason].join(' ');
      assert.match(warning,/先收\/移|收\/移/);assert.match(warning,/现场/);assert.match(warning,/50×133\.5/);assert.match(warning,/180mm/);assert.match(warning,/20mm/);
      assert.ok(!/已重新核对椅位/.test(f.conditions.join(' ')),'family must not retain reference-only verified-chair claim');
      assert.deepEqual(f.parts,get(layoutSchemes.screen,f.id).parts,'family/screen full L-sideboard shape mismatch');
      assert.ok(f.parts.some(t=>t.id.startsWith('d_return_'))&&f.parts.some(t=>t.id.startsWith('d_corner_')),'family L return and blind corner missing');
      const people=['family-f23','family-f24','family-f25','family-f26','family-f27'].map(id=>get(p,id)),drawers=f.parts.filter(t=>t.role==='drawer-front');assert.equal(drawers.length,3);
      const known=[];
      for(const part of drawers){
        assert.equal(part.maxExtensionMm,250);
        const swept={x:f.cx+part.x,y:f.cy+part.y,w:part.w+250,d:part.d};
        for(const chair of people){const r=worldRect(chair);if(!overlaps(swept,r))continue;
          assert.equal(chair.id,'family-f24','unexpected drawer collision cannot be treated as known limitation');
          const ox=Math.min(swept.x+swept.w,r.x+r.w)-Math.max(swept.x,r.x),oy=Math.min(swept.y+swept.d,r.y+r.d)-Math.max(swept.y,r.y);
          eq(ox,50,'known north-chair/drawer x overlap');eq(oy,133.5,'known north-chair/drawer y overlap');
          const shortSweep={...swept,w:part.w+180};assert.ok(!overlaps(shortSweep,r));eq(r.x-(shortSweep.x+shortSweep.w),20,'180mm illustrative drawer-to-chair gap');
          known.push(part.id+'|'+chair.id);
        }
      }
      assert.equal(known.length,3,'all three known full-extension plan overlaps must remain explicit');
      report.push({id,referenceCabinetBoardShapeExact:true,knownNorthChairDrawerPlanOverlapMm:[50,133.5],full250MmTravelRequiresMovingChair:true,illustrative180MmTravelGapMm:20,illustrationNotHardwareOrUsageApproval:true});
    }else assert.deepEqual(p.BIFOLDS,old.BIFOLDS,id+': storage folding door changed without authorization');
    report.push({id,entryOpeningUnchanged:true,outwardInteriorSweepClear:true,publicSwingNotApproved:true,entryCabinetShapeUnchanged:true,familyLibraryRemoved:id==='family'});
  }
  assert.equal(layoutSchemes.screen.metadata.entryFamilyUpdate,undefined,'entry generator must not rewrite screen');

  for(const id of ['family','screen']){
    const p=layoutSchemes[id],old=prior[id],u=p.metadata.bedroomUpdate;
    assert.equal(u.id,BEDROOM);assert.equal(u.date,'2026-10-11');
    assert.deepEqual(u.newFurnitureIds.slice().sort(),bedroomNewIds.slice().sort());
    assert.deepEqual(u.removedFurnitureIds,['bed_b_niche_console']);
    assert.deepEqual(u.previousFurniture.map(f=>f.id).sort(),bedroomOldIds.slice().sort());
    assert.ok(!p.defaultFurniture.some(f=>f.id==='bed_b_niche_console'));
    const bedB=get(p,'bed_b'),bedA=get(p,'bed_a'),cabB=get(p,'family-f1'),cabA=get(p,'family-f3');
    assert.deepEqual([bedB.w,bedB.d,bedB.rot],[1600,2100,270]);assert.deepEqual([bedA.w,bedA.d,bedA.rot],[1900,2100,90]);
    assert.deepEqual(bedB.mattressMm,[1500,2000]);assert.deepEqual(bedA.mattressMm,[1800,2000]);
    assert.match(bedB.notes,/暂1600/);assert.match(bedA.notes,/暂1900/);
    eqRect(bedB,[120,1220,2220,2820],id+' B bed');eqRect(bedA,[4650,1020,6750,2920],id+' A bed');
    eqRect(cabB,[2775,120,3375,2360],id+' B wardrobe');eqRect(cabA,[3495,120,4095,2360],id+' A wardrobe');
    assert.deepEqual([cabB.w,cabB.d,cabB.heightMm],[2240,600,2400]);assert.equal(cabB.rot,90);assert.equal(cabB.face,'west');assert.equal(cabB.doorStyle,'sliding');
    assert.equal(cabA.doorStyle,'sliding');assert.equal(cabB.cabinetRevision,cabA.cabinetRevision);
    assert.equal(cabB.sourceId,'family-f1');assert.equal(cabB.roomId,'room_b');
    for(const key of ['type','nativeType','color','heightMm','baseWidthMm','baseDepthMm','baseHeightMm'])assert.deepEqual(cabB[key],cabA[key],id+': mirrored wardrobe '+key+' differs');
    const normalizePartIds=parts=>parts.map(q=>({...q,id:q.id.replace(/family-f[13]/g,'wardrobe')}));
    assert.deepEqual(normalizePartIds(cabB.parts),normalizePartIds(cabA.parts),id+': B wardrobe is not true mirrored A construction');
    for(const f of [cabA,bedA,bedB])for(const key of ['type','heightMm','elevationMm','color','sourceId','parts'])assert.deepEqual(f[key],get(old,f.id)[key],id+'/'+f.id+': unrelated '+key+' changed');
    assert.deepEqual(omit(get(p,'fit-bay_b_tea'),['notes','layoutRevision']),omit(get(old,'fit-bay_b_tea'),['notes','layoutRevision']),id+': notes-only bay tea seat geometry or material changed');
    for(const k of ['cx','cy','w','d','rot','heightMm','parts'])assert.deepEqual(cabA[k],get(old,cabA.id)[k],id+': A wardrobe geometry changed');
    const expected={
      'draft-desk-b':[120,120,620,1120], 'draft-chair-b':[670,395,1120,845], 'draft-night-b':[120,2820,570,3220],
      'draft-desk-a':[6250,120,6750,920], 'draft-chair-a':[5750,295,6200,745], 'draft-night-a':[6300,2920,6750,3220]
    };
    for(const[key,r]of Object.entries(expected)){
      const f=get(p,key);eqRect(f,r,id+'/'+key);
      const type=key.includes('desk')?'desk':key.includes('chair')?'chair':'nightstand';assert.equal(f.type,type);
      assert.equal(f.heightMm,type==='desk'?750:type==='chair'?800:500);assert.equal(f.elevationMm,0);assert.equal(f.dimensionStatus,'design-pending');
    }
    assert.equal(get(p,'draft-chair-b').rot,90);assert.equal(get(p,'draft-chair-a').rot,270);
    const beds=[{tag:'B',bed:bedB,cab:cabB,desk:get(p,'draft-desk-b'),chair:get(p,'draft-chair-b'),sign:1},{tag:'A',bed:bedA,cab:cabA,desk:get(p,'draft-desk-a'),chair:get(p,'draft-chair-a'),sign:-1}];
    for(const q of beds){
      const bed=worldRect(q.bed),cab=worldRect(q.cab),desk=worldRect(q.desk),chair=worldRect(q.chair);
      const gap=q.sign===1?cab.x-(bed.x+bed.w):bed.x-(cab.x+cab.w);eq(gap,555,id+' '+q.tag+' static closed-cabinet gap');
      eq(bed.y-(desk.y+desk.d),100,id+' '+q.tag+' desk/bed seam (not passage)');
      const pulled={...chair,x:chair.x+q.sign*600};assert.ok(!overlaps(pulled,bed)&&!overlaps(pulled,cab),id+' '+q.tag+' chair retreat collides');
      eq(q.sign===1?cab.x-(pulled.x+pulled.w):pulled.x-(cab.x+cab.w),1055,id+' '+q.tag+' 600 mm retreat remaining gap');
      for(const f of [q.bed,q.cab,q.desk,q.chair]){
        assert.ok(!p.WALLS.some(w=>overlaps(worldRect(f),{x:w[0],y:w[1],w:w[2]-w[0],d:w[3]-w[1]})),id+'/'+f.id+': intersects solid wall');
        assert.ok(f.sourceFootprintMm,id+'/'+f.id+': current footprint missing');
        for(const k of ['x','y','w','d'])eq(f.sourceFootprintMm[k],worldRect(f)[k],id+'/'+f.id+' footprint '+k);
      }
    }
    const allBedroom=[bedB,bedA,cabB,cabA,...bedroomNewIds.map(key=>get(p,key))];
    for(let i=0;i<allBedroom.length;i++)for(let j=i+1;j<allBedroom.length;j++)assert.ok(!overlaps(worldRect(allBedroom[i]),worldRect(allBedroom[j])),id+': bedroom objects overlap '+allBedroom[i].id+'/'+allBedroom[j].id);
    // The B door is east-hinged and the 2240mm cabinet ends before its north
    // leaf tip. This is a 140mm fixture/leaf gap, NOT a person passage.
    const bDoor=p.DOORS.find(d=>d.sourceId==='door_b'),openB={x:bDoor.h[0]-20,y:bDoor.h[1]-bDoor.len,w:40,d:bDoor.len};
    assert.ok(!overlaps(openB,worldRect(cabB)));eq(openB.y-(worldRect(cabB).y+worldRect(cabB).d),140,id+' B open leaf to cabinet end');
    // Check every full cardinal quarter-sector continuously, independent of
    // the generator's own review, not merely the 90-degree parked leaf.
    for(const door of p.DOORS)for(const f of allBedroom){
      const [hx,hy]=door.h,sx=Math.sign(door.c[0]||door.o[0]),sy=Math.sign(door.c[1]||door.o[1]);
      assert.ok(sx&&sy,door.id+': non-cardinal swing needs a new test');
      const r=worldRect(f),xs=[sx*(r.x-20-hx),sx*(r.x+r.w+20-hx)],ys=[sy*(r.y-20-hy),sy*(r.y+r.d+20-hy)];
      const inQuadrant=Math.max(...xs)>=0&&Math.max(...ys)>=0;
      const closest=Math.hypot(Math.max(0,Math.min(...xs)),Math.max(0,Math.min(...ys)));
      assert.ok(!inQuadrant||closest>door.len+tol,id+'/'+door.id+': continuous sweep hits '+f.id);
    }
    for(const key of ['ROOMS','WALLS','WALL_META','WINS','WIN_META','SLIDES','BAYS'])assert.deepEqual(p[key],old[key],id+'/'+key+': bedroom edit moved architecture');
    if(id==='screen'){
      assert.deepEqual(p.DOORS,old.DOORS);assert.deepEqual(p.BIFOLDS,old.BIFOLDS);
      for(const f of old.defaultFurniture)if(!bedroomOldIds.includes(f.id))assert.deepEqual(get(p,f.id),f,id+'/'+f.id+': screen non-bedroom furniture changed');
    }
    report.push({id,bedroomConfirmed:true,bedMattressB:[1500,2000],bedMattressA:[1800,2000],bedFramesProvisional:true,staticBedTailGapMm:555,wardrobeSliding:true,chairRetreatScenarioMm:600,southBedSideGapMm:{B:400,A:300},notComfortOrAccessCertification:true});
  }
  for(const id of ['wood','laundry'])assert.equal(layoutSchemes[id].metadata.bedroomUpdate,undefined,id+': unauthorized bedroom revision');
  for(const[id,p]of Object.entries(plans.schemes)){assertFinite(p,id);assert.equal(new Set(p.defaultFurniture.map(f=>f.id)).size,p.defaultFurniture.length,id+': duplicate furniture ID');}
  return{status:'PASS',revisions:[ENTRY,BEDROOM],sourceSnapshotsUnchanged:true,allNonTargetFieldsHistoricalHashExact:true,modelOnly:true,laterFamilyBathReview:bathReview,schemes:report};
}

module.exports={beforeLayout20261011,verifyLayout,baseline,hash};
if(require.main===module)console.log(JSON.stringify(verifyLayout(require(path.join(root,'data/house-plans.js'))),null,2));
