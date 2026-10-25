// Scene-only window/wall/ceiling dressing for the owner's six room references.
// All source measurements remain untouched; nothing here becomes movable data
// furniture, a hidden architectural edit, or an installation approval.
export function createReferenceDressing({THREE,finish,artTexture,wx,wz}){
  const M=n=>Number(n||0)/1000,cache=new Map();
  const C={cream:'#ECE6DB',curtain:'#BDB5A9',sheer:'#F4F1E8',pink:'#E7D5CE',rose:'#CDAEA5',wood:'#A28361',gold:'#C4A46D'};
  function material(kind,color){
    const key=kind+color;if(cache.has(key))return cache.get(key);
    const base=finish?.(kind,color)||new THREE.MeshStandardMaterial({color,roughness:.9});cache.set(key,base);return base;
  }
  function translucent(kind,color,opacity){
    const key=kind+color+opacity;if(cache.has(key))return cache.get(key);
    const m=material(kind,color).clone();m.transparent=true;m.opacity=opacity;m.depthWrite=false;m.side=THREE.DoubleSide;
    m.userData={...m.userData,referenceDressing:true,referenceApproximation:true,translucentFabric:true};cache.set(key,m);return m;
  }
  function mesh(geometry,mat,role,extra={}){
    const o=new THREE.Mesh(geometry,mat);o.castShadow=true;o.receiveShadow=true;
    o.userData={role,referenceDressing:true,referenceApproximation:true,notInstallationApproval:true,...extra};return o;
  }
  function group(role,roomId,topMm,cut,extra={}){
    const g=new THREE.Group();g.name=role;g.visible=M(topMm)<=cut+.000001;
    g.userData={role,roomId,referenceDressing:true,referenceApproximation:true,maximumHeightMm:topMm,notInstallationApproval:true,...extra};return g;
  }
  // Absolute plan coordinates are millimetres; all THREE geometry is metres.
  function box(g,x,y,w,d,bottom,h,mat,role,extra={}){
    const o=mesh(new THREE.BoxGeometry(M(w),M(h),M(d)),mat,role,extra);
    o.position.set(wx(x),M(bottom+h/2),wz(y));g.add(o);return o;
  }
  function opening(id,windows,meta){
    const index=meta.findIndex(m=>m.id===id);if(index<0)return null;
    const m=meta[index],r=windows[index];if(!Array.isArray(r)||r.length<4)return null;
    const a=m.sourceAxisMm;if(!Array.isArray(a)||a.length!==4)return null;
    const horizontal=Math.abs(a[2]-a[0])>=Math.abs(a[3]-a[1]);
    const start=horizontal?Math.min(a[0],a[2]):Math.min(a[1],a[3]);
    const end=horizontal?Math.max(a[0],a[2]):Math.max(a[1],a[3]);
    const sill=Number(m.sillMm),head=Number(m.headMm??(sill+Number(m.heightMm)));
    if(!Number.isFinite(sill)||!Number.isFinite(head)||end<=start||head<=sill)return null;
    return{id,meta:m,rect:r.slice(0,4),axis:a.slice(),horizontal,start,end,sill,head,length:end-start};
  }
  function pleatedCurtain(g,opening,x0,width,plane,bottom,top,sheer){
    const segments=28,geometry=new THREE.PlaneGeometry(M(width),M(top-bottom),segments,1),p=geometry.attributes.position;
    const folds=sheer?9:11,depth=sheer?3.5:11;
    for(let i=0;i<p.count;i++){
      const u=p.getX(i)/M(width)+.5;
      p.setZ(i,M(depth)*Math.sin(u*Math.PI*2*folds));
    }
    geometry.computeVertexNormals();
    const mat=sheer?translucent('curtain',C.sheer,.33):material('curtain',C.curtain).clone();mat.side=THREE.DoubleSide;
    const o=mesh(geometry,mat,sheer?'reference-open-sheer-curtain':'reference-pleated-side-curtain',
      {windowSourceId:opening.id,nominalPanelWidthMm:width,withinOriginalOpening:true,sheerMiddleOpenFraction:sheer?.7:null});
    o.position.set(wx(x0+width/2),M((bottom+top)/2),wz(plane));g.add(o);
  }
  function bedroomCurtains(id,roomId,windows,meta,cut){
    const o=opening(id,windows,meta);if(!o||!o.horizontal)return null;
    const g=group('reference-bedroom-bay-curtains',roomId,o.head,cut,{windowSourceId:id,
      sourceOpeningRectMm:o.rect,sourceAxisMm:o.axis,noOpeningResize:true,partiallyOpen:true});
    const edge=36,clear=o.length-2*edge,width=Math.min(260,clear*.17),bottom=o.sill+26,top=o.head-40;
    if(clear<700||top<=bottom)return null;
    // Bay front is -650..-550 in the current plan. These planes derive from
    // its real interior edge: +30mm cloth and +14mm sheer, never through frame.
    const inner=Math.max(o.rect[1],o.rect[3]),clothPlane=inner+30,sheerPlane=inner+14;
    const lo=o.start+edge,hi=o.end-edge,sheerW=clear*.15;
    pleatedCurtain(g,o,lo,width,clothPlane,bottom,top,false);
    pleatedCurtain(g,o,hi-width,width,clothPlane,bottom,top,false);
    pleatedCurtain(g,o,lo,sheerW,sheerPlane,bottom,top,true);
    pleatedCurtain(g,o,hi-sheerW,sheerW,sheerPlane,bottom,top,true);
    box(g,(o.start+o.end)/2,clothPlane,clear,14,o.head-26,10,material('cream',C.cream),'reference-curtain-recessed-track',
      {windowSourceId:id,withinOriginalOpening:true,trackAndFixingsPending:true});
    return g;
  }
  function zebraBlind(id,roomId,windows,meta,cut,{count=24,living=false}={}){
    const o=opening(id,windows,meta);if(!o||o.horizontal)return null;
    const g=group('reference-open-zebra-blind',roomId,o.head,cut,{windowSourceId:id,sourceOpeningRectMm:o.rect,
      sourceAxisMm:o.axis,noOpeningResize:true,alternateTranslucentGaps:true,fixingsPending:true});
    const margin=32,span=o.length-2*margin,bottom=o.sill+(living?65:30),top=o.head-45,clear=top-bottom;
    if(span<=0||clear<=0)return null;
    // West window's room-facing edge: living 1450+10=1460, study 120+25=145.
    const plane=Math.max(o.rect[0],o.rect[2])+(living?10:25),center=(o.start+o.end)/2;
    const sheer=translucent('curtain',C.sheer,.12),stripe=translucent('curtain',C.cream,.78);
    box(g,plane-1,center,1,span,bottom,clear,sheer,'reference-zebra-sheer-backing',{windowSourceId:id,lightTransmitting:true});
    const pitch=clear/count,band=pitch*.52;
    for(let i=0;i<count;i++)box(g,plane+1,center,2,span,bottom+i*pitch,band,stripe,'reference-zebra-translucent-stripe',
      {windowSourceId:id,stripeIndex:i,visibleGapMm:pitch-band,lightTransmitting:true});
    box(g,plane+8,center,20,span,o.head-31,18,material('cream',C.cream),'reference-zebra-roller-cover',
      {windowSourceId:id,withinOriginalOpening:true,fixingsPending:true});
    return g;
  }
  function ellipseGeometry(rx,ry,height){
    const s=new THREE.Shape();s.absellipse(0,0,M(rx),M(ry),0,Math.PI*2,false,0);
    const geometry=new THREE.ExtrudeGeometry(s,{depth:M(height),bevelEnabled:false,curveSegments:48});geometry.rotateX(-Math.PI/2);return geometry;
  }
  function rugs(archFloor,rooms,cut,created){
    const master=rooms.find(r=>r.id==='room_a'),child=rooms.find(r=>r.id==='room_b');
    if(master){
      const g=group('reference-master-slim-bedside-rug','room_a',5,cut,{nominalThicknessMm:4,noTallFurniture:true,wardrobeFootprintExcluded:true});
      // x4350..5250 stops 255mm short of the unchanged wardrobe face x4095;
      // the other edge is tucked below the existing bed, not a new aisle object.
      box(g,4800,2000,900,2200,1,4,material('rug','#BDB8AC'),'reference-gray-beige-bedside-rug',
        {worldPlanRectMm:[4350,900,5250,3100],nominalThicknessMm:4,notWalkwayCertification:true});
      archFloor.add(g);created.push(g);
    }
    if(child){
      const g=group('reference-child-pink-oval-rug','room_b',5,cut,{nominalThicknessMm:4,noTallFurniture:true,wardrobeFootprintExcluded:true});
      const o=mesh(ellipseGeometry(900,980,4),material('rug','#D7B8AE'),'reference-pink-oval-rug',
        {nominalThicknessMm:4,worldPlanBoundsMm:[950,1060,2750,3020],notWalkwayCertification:true});
      o.position.set(wx(1850),M(1),wz(2040));g.add(o);
      // Thin raised weave-ring line, not another solid or a high rug edge.
      const pts=Array.from({length:96},(_,i)=>{const a=i*Math.PI*2/96;return new THREE.Vector3(wx(1850+850*Math.cos(a)),M(5.05),wz(2040+930*Math.sin(a)));});
      const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#EADDD2'}));
      line.userData={role:'reference-child-rug-woven-border',referenceDressing:true,referenceApproximation:true,visualWeaveOnly:true};g.add(line);
      archFloor.add(g);created.push(g);
    }
  }
  function painting({roomId,x,y,w,h,bottom,face,cut,role}){
    const g=group(role,roomId,bottom+h,cut,{wallMounted:true,originalProceduralArtwork:true,notOriginalArtwork:true});
    const wood=material('wood',C.wood),cream=material('cream','#E8E0D1'),border=12,depth=8;
    if(face==='south'){
      box(g,x,y,w,depth,bottom,h,wood,'reference-art-thin-oak-frame');
      box(g,x,y+4.2,w-2*border,.6,bottom+border,h-2*border,cream,'reference-art-mat-border');
    }else{
      box(g,x,y,depth,w,bottom,h,wood,'reference-art-thin-oak-frame');
      box(g,x-4.2,y,.6,w-2*border,bottom+border,h-2*border,cream,'reference-art-mat-border');
    }
    const map=artTexture?.('warm-abstract'),mat=new THREE.MeshStandardMaterial({color:'#fff',map:map||null,roughness:.88,side:THREE.FrontSide});
    const image=mesh(new THREE.PlaneGeometry(M(w-2*border-8),M(h-2*border-8)),mat,'reference-warm-abstract-painting',
      {artworkKind:'warm-abstract',originalProceduralArtwork:true,notOriginalArtwork:true});
    if(face==='south')image.position.set(wx(x),M(bottom+h/2),wz(y+4.7));
    else{image.rotation.y=-Math.PI/2;image.position.set(wx(x-4.7),M(bottom+h/2),wz(y));}
    g.add(image);return g;
  }
  function childWallAccents(archUp,rooms,cut,created){
    const r=rooms.find(q=>q.id==='room_b');if(!r)return;
    const top=Math.min(M(r.heightMm||2700),cut);if(top>.001){
      const g=group('reference-child-thin-pink-wall-finish','room_b',top*1000,cut,{decorativeFinishOnly:true,noWallMove:true,nominalThicknessMm:2});
      box(g,121,1670,2,3100,0,top*1000,material('rose',C.pink),'reference-child-2mm-pink-wall-face',
        {wallInteriorPlaneMm:120,nominalThicknessMm:2,noStructuralModification:true});archUp.add(g);created.push(g);
    }
    const g=group('reference-child-outline-wall-decals','room_b',2050,cut,{visualDecalOnly:true,noTallFurniture:true});
    function outline(points,color,role){
      const geo=new THREE.BufferGeometry().setFromPoints(points.map(([y,z])=>new THREE.Vector3(wx(124),M(z),wz(y))));
      const o=new THREE.LineLoop(geo,new THREE.LineBasicMaterial({color}));o.userData={role,referenceDressing:true,referenceApproximation:true,visualDecalOnly:true};g.add(o);
    }
    const star=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?55:115;star.push([2050+Math.cos(a)*r,1780+Math.sin(a)*r]);}
    outline(star,C.gold,'reference-child-small-star-outline');
    const moon=[];for(let i=0;i<=22;i++){const a=-Math.PI*.42+i*(Math.PI*1.84)/22;moon.push([2460+Math.cos(a)*90,1920+Math.sin(a)*90]);}
    for(let i=22;i>=0;i--){const a=-Math.PI*.42+i*(Math.PI*1.84)/22;moon.push([2484+Math.cos(a)*69,1920+Math.sin(a)*69]);}
    outline(moon,'#C6B29A','reference-child-small-moon-outline');archUp.add(g);created.push(g);
  }
  function bedroomCeilingLights(archUp,rooms,cut,created){
    for(const id of['room_a','room_b']){
      const r=rooms.find(q=>q.id===id);if(!r)continue;
      const H=Number(r.heightMm||2700),xs=r.poly.map(p=>p[0]),xMax=Math.max(...xs),xMin=Math.min(...xs),edgeY=r.poly.filter(p=>p[0]===xMax).map(p=>p[1]);
      if(edgeY.length<2)continue;
      const x=(xMin+xMax)/2,y=(Math.min(...edgeY)+Math.max(...edgeY))/2;
      if(id==='room_a'){
        const g=group('reference-master-four-cup-ceiling-light',id,H,cut,{replacesImplicitLampMeshOnly:true,notElectricalDesign:true,noAdditionalPointLight:true});
        const cream=material('cream',C.cream),black=material('metal','#292822');
        box(g,x,y,250,250,H-78,70,cream,'reference-master-small-square-light-base');
        box(g,x,y,220,220,H-8,8,cream,'reference-master-square-light-ceiling-mount');
        const diffuse=new THREE.MeshStandardMaterial({color:'#DDD3B7',roughness:.72,emissive:'#FFE4B1',emissiveIntensity:.18});
        for(const[i,[dx,dy]]of[[-60,-60],[60,-60],[-60,60],[60,60]].entries()){
          const cup=mesh(new THREE.CylinderGeometry(.047,.047,.016,24),black,'reference-master-black-light-cup',
            {cupIndex:i,roomId:id,noAdditionalPointLight:true});
          cup.position.set(wx(x+dx),M(H-86),wz(y+dy));g.add(cup);
          const disk=mesh(new THREE.CylinderGeometry(.034,.034,.001,24),diffuse,'reference-master-warm-cup-diffuser',
            {cupIndex:i,roomId:id,notElectricalDesign:true,noAdditionalPointLight:true});
          disk.position.set(wx(x+dx),M(H-94.5),wz(y+dy));g.add(disk);
        }
        archUp.add(g);created.push(g);continue;
      }
      const g=group('reference-bedroom-cloud-ceiling-light',id,H,cut,{replacesImplicitLampMeshOnly:true,notElectricalDesign:true});
      const glow=new THREE.MeshStandardMaterial({color:'#F3EEE3',roughness:.7,emissive:'#FFF0D2',emissiveIntensity:.22});
      box(g,x,y,220,160,H-10,8,material('cream',C.cream),'reference-cloud-lamp-thin-ceiling-mount');
      for(const[i,[dx,dy,rx,rz]]of[[0,0,240,205],[-215,-45,185,170],[215,-20,195,170],[-110,145,185,150],[115,145,185,150],[25,-145,195,150]].entries()){
        const o=mesh(new THREE.SphereGeometry(1,24,12),glow,'reference-cloud-lamp-white-lobe',
          {roomId:id,lobeIndex:i,notElectricalDesign:true,noAdditionalPointLight:true});
        o.scale.set(M(rx),M(30),M(rz));o.position.set(wx(x+dx),M(H-39),wz(y+dy));g.add(o);
      }
      archUp.add(g);created.push(g);
    }
  }
  function masterBedsidePendant(archUp,rooms,cut,created){
    const room=rooms.find(r=>r.id==='room_a');if(!room)return;
    const H=Number(room.heightMm||2790),x=6500,y=900;
    // Existing master desk is below750mm, bed starts y1020, and the 180mm
    // shade ends y990. The north-wall AC/window and west wardrobe are away
    // from this thin, scene-only pendant; its electrical position is not set.
    const g=group('reference-master-fine-bedside-pendant','room_a',H,cut,{wallMounted:false,ceilingMounted:true,
      shadeDiameterMm:180,shadeBottomMm:1150,positionConceptMm:[x,y],notElectricalDesign:true,noAdditionalPointLight:true});
    const brass=material('metal','#AC9068'),cream=material('cream','#EBE5D8');
    const cap=mesh(new THREE.CylinderGeometry(.024,.024,.012,20),brass,'reference-pendant-small-brass-ceiling-cap');
    cap.position.set(wx(x),M(H-6),wz(y));g.add(cap);
    const cordHeight=H-12-1225;
    if(cordHeight>0){
      const cord=mesh(new THREE.CylinderGeometry(.00125,.00125,M(cordHeight),8),brass,'reference-pendant-fine-brass-cord',
        {nominalDiameterMm:2.5,notElectricalDesign:true});cord.position.set(wx(x),M(1225+cordHeight/2),wz(y));g.add(cord);
    }
    const neck=mesh(new THREE.CylinderGeometry(.004,.004,.010,12),brass,'reference-pendant-brass-neck');
    neck.position.set(wx(x),M(1220),wz(y));g.add(neck);
    const shade=mesh(new THREE.SphereGeometry(.09,28,12,0,Math.PI*2,0,Math.PI/2),cream,'reference-pendant-small-cream-dome');
    shade.scale.y=.7;shade.position.set(wx(x),M(1152),wz(y));g.add(shade);
    const diffuse=new THREE.MeshStandardMaterial({color:'#ECE2CD',roughness:.75,emissive:'#FFE9BE',emissiveIntensity:.16});
    const disk=mesh(new THREE.CylinderGeometry(.084,.084,.002,24),diffuse,'reference-pendant-warm-bottom-diffuser');
    disk.position.set(wx(x),M(1151),wz(y));g.add(disk);
    archUp.add(g);created.push(g);
  }
  function build({archUp,archFloor,rooms=[],windows=[],windowMeta=[],cut=Infinity}){
    const created=[];
    for(const[id,roomId]of[['window_a-front','room_a'],['window_b-front','room_b']]){
      const g=bedroomCurtains(id,roomId,windows,windowMeta,cut);if(g){archUp.add(g);created.push(g);}
    }
    for(const[id,roomId,living]of[['window_living_west-front','living',true],['window_c','room_c',false]]){
      const g=zebraBlind(id,roomId,windows,windowMeta,cut,{count:24,living});if(g){archUp.add(g);created.push(g);}
    }
    rugs(archFloor,rooms,cut,created);childWallAccents(archUp,rooms,cut,created);
    if(rooms.some(r=>r.id==='room_c')){
      const p=painting({roomId:'room_c',x:1170,y:3345,w:600,h:700,bottom:1100,face:'south',cut,role:'reference-study-north-warm-art'});archUp.add(p);created.push(p);
    }
    if(rooms.some(r=>r.id==='room_a')){
      const p=painting({roomId:'room_a',x:6745,y:1800,w:460,h:600,bottom:1700,face:'west',cut,role:'reference-master-east-warm-art'});archUp.add(p);created.push(p);
    }
    bedroomCeilingLights(archUp,rooms,cut,created);masterBedsidePendant(archUp,rooms,cut,created);
    return{groups:created,windowIds:created.map(g=>g.userData.windowSourceId).filter(Boolean),referenceDressing:true,referenceApproximation:true};
  }
  return{build};
}
