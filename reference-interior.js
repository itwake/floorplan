// Geometry and original procedural artwork inspired by the owner's room
// references. These are editable scene meshes, not a panoramic image overlay.
// No purchased IKEA furniture is intercepted by this module.
export function createReferenceInterior({THREE,RoundedBoxGeometry,finish}) {
  const textureCache=new Map(),materialCache=new Map();
  const M=n=>Number(n||0)/1000,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const palette={cream:'#EAE4D8',linen:'#E9E2D6',rose:'#CDAEA3',wood:'#B58A5E','dark-oak':'#846345',rug:'#C5C0B5',metal:'#857C70'};
  function material(kind,color=palette[kind]||palette.cream){
    if(finish){const value=finish(kind,color);if(value)return value;}
    const key=kind+color;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness:kind==='metal'?.42:.86,metalness:kind==='metal'?.45:0}));
    return materialCache.get(key);
  }
  function mesh(geometry,mat,role){const o=new THREE.Mesh(geometry,mat);o.castShadow=true;o.receiveShadow=true;o.userData={role,referenceInterior:true,referenceApproximation:true};return o;}
  function box(g,w,h,d,mat,x,y,z,role='reference-detail',radius=0){
    const safe=Math.max(.00015,Math.min(w,h,d)),r=clamp(radius,0,safe/2-.00001);
    const geometry=r>0&&RoundedBoxGeometry?new RoundedBoxGeometry(w,h,d,2,r):new THREE.BoxGeometry(w,h,d);
    const o=mesh(geometry,mat,role);o.position.set(x,y+h/2,z);g.add(o);return o;
  }
  function cylinder(g,r,h,mat,x,y,z,role='reference-detail',topRadius=r){const o=mesh(new THREE.CylinderGeometry(topRadius,r,h,24),mat,role);o.position.set(x,y+h/2,z);g.add(o);return o;}
  function rod(g,a,b,r,mat,role){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),mat,role);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(o);return o;}
  function extruded(shape,depth){const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12,steps:1});geometry.translate(0,0,-depth/2);return geometry;}
  function archShape(w,h,rise=w/2){
    rise=clamp(rise,.001,h);const s=new THREE.Shape(),bottom=-h/2,spring=h/2-rise;
    s.moveTo(-w/2,bottom);s.lineTo(w/2,bottom);s.lineTo(w/2,spring);
    for(let i=1;i<=18;i++){const a=i*Math.PI/18;s.lineTo(Math.cos(a)*w/2,spring+Math.sin(a)*rise);}
    s.lineTo(-w/2,bottom);s.closePath();return s;
  }
  function stripedPillowMaterial(){
    const key='striped-linen';if(materialCache.has(key))return materialCache.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#DED8C9';c.fillRect(0,0,128,128);
    for(let x=0;x<128;x+=10){c.fillStyle='#373731';c.fillRect(x,0,4,128);c.fillStyle='rgba(255,255,255,.20)';c.fillRect(x+1,0,1,128);}
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,1);
    const mat=new THREE.MeshStandardMaterial({map,roughness:1});materialCache.set(key,mat);return mat;
  }
  function pillow(g,w,h,d,mat,x,y,z,role='reference-bed-pillow'){
    return box(g,w,h,d,mat,x,y,z,role,Math.min(.055,h*.35));
  }
  function bed(g,f,child){
    const W=M(f.w),D=M(f.d),H=M(f.heightMm),style=f.referenceStyle||{},raw=style.mattressMm;
    const mmw=Array.isArray(raw)?raw[0]:raw?.width??raw?.w??(child?1500:1800),mmd=Array.isArray(raw)?raw[1]:raw?.depth??raw?.length??raw?.d??2000;
    // Do not silently shrink a confirmed mattress to squeeze an invalid frame.
    const MW=M(mmw),MD=M(mmd);if(MW>W+.00001||MD>D+.00001)throw Error('Reference bed frame is smaller than mattress '+f.id);
    const cream=material('linen',child?'#E8E0D4':'#E7E1D6'),white=material('linen','#F1EDE3'),rose=material('rose','#CBAA9E'),dark=material('linen','#64645C');
    const baseH=Math.min(.255,H*.26),mattressH=Math.min(.19,H*.19),top=baseH+mattressH;
    const headDepth=Math.min(.10,Math.max(.045,D-MD)),mattressZ=Math.min((D-MD)/2,headDepth/2);
    box(g,W,baseH,D,cream,0,0,0,'reference-bed-upholstered-frame',.038);
    const mattress=box(g,MW,mattressH,MD,white,0,baseH,mattressZ,'reference-mattress',.038);
    mattress.userData.mattressDimensionsMm={width:mmw,depth:mmd};
    if(child){
      const height=H-.12,z=-D/2+headDepth/2;
      const piping=mesh(extruded(archShape(W,height,Math.min(W*.48,height*.72)),headDepth),rose,'reference-child-headboard-rose-piping');piping.position.set(0,.12+height/2,z);g.add(piping);
      const front=mesh(extruded(archShape(W-.026,height-.024,Math.min((W-.026)*.48,(height-.024)*.72)),headDepth*.73),white,'reference-child-arched-headboard');front.position.set(0,.12+(height-.024)/2,z+headDepth*.12);g.add(front);
    }else{
      const n=Math.max(12,Math.min(22,Math.round(W/.085))),cw=(W-.012)/n;
      for(let i=0;i<n;i++)box(g,cw-.003,H-.12,headDepth,material('linen','#C8C1B5'),-W/2+.006+cw*(i+.5),.12,-D/2+headDepth/2,'reference-master-headboard-channel',Math.min(.026,cw*.4));
    }
    const duvetW=Math.min(MW+.026,W-.012),duvetD=MD*.75,duvetZ=mattressZ+MD*.115;
    box(g,duvetW,.065,duvetD,white,0,top-.008,duvetZ,'reference-bed-white-duvet',.028);
    // Low, uneven folds are real narrow meshes; linen micro-detail comes from
    // the finish material, avoiding an expensive displaced cloth simulation.
    for(let i=0;i<5;i++)box(g,duvetW*.91,.010,Math.min(.026,duvetD*.025),white,0,top+.048,duvetZ-duvetD*.35+i*duvetD*.15,'reference-duvet-fold',.004);
    const count=MW>1.2?2:1,pw=Math.min(.68,(MW-.13)/count),pillowZ=mattressZ-MD/2+.32;
    for(let i=0;i<count;i++)pillow(g,pw,.15,.39,white,(i-(count-1)/2)*(pw+.035),top+.015,pillowZ);
    const coverW=Math.min(MW+.035,W-.012),coverD=child?.68:.57,coverZ=mattressZ+MD*.27;
    box(g,coverW,.032,coverD,child?rose:dark,0,top+.061,coverZ,child?'reference-rose-bed-throw':'reference-charcoal-bed-throw',.012);
    for(const s of[-1,1])box(g,.018,Math.min(.18,top-.08),coverD,child?rose:dark,s*(coverW/2-.009),top-.11,coverZ,'reference-bed-throw-side',.005);
    if(child){
      box(g,coverW*.53,.014,coverD*.82,material('linen','#A8A69C'),-.06,top+.094,coverZ-.035,'reference-gray-woven-bed-runner',.006);
      pillow(g,.34,.22,.13,rose,-MW*.13,top+.11,pillowZ+.20,'reference-rose-accent-pillow');
    }else pillow(g,.51,.23,.13,stripedPillowMaterial(),-MW*.19,top+.11,pillowZ+.20,'reference-black-white-striped-pillow');
    g.userData.referenceMattressMm={width:mmw,depth:mmd};return true;
  }
  function nightstand(g,f,round){
    const W=M(f.w),D=M(f.d),H=M(f.heightMm),wood=material('wood','#B28B60'),cream=material('cream','#E6DED2');
    if(round){
      const radius=Math.min(W,D)/2;
      cylinder(g,radius-.028,H-.025,cream,0,0,0,'reference-child-round-nightstand-body');
      cylinder(g,radius-.014,.016,wood,0,H-.025,0,'reference-child-nightstand-tray');
      const rim=mesh(new THREE.TorusGeometry(radius-.008,.008,8,40),wood,'reference-child-nightstand-tray-rim');rim.rotation.x=Math.PI/2;rim.position.y=H-.008;g.add(rim);
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7,o=mesh(new THREE.SphereGeometry(.024,12,8),wood,'reference-child-nightstand-oak-dot');o.position.set(Math.sin(a)*(radius-.033),H*.28,Math.cos(a)*(radius-.033));g.add(o);}
    }else{
      const plinth=Math.min(.065,H*.13);box(g,W*.78,plinth,D*.76,wood,0,0,0,'reference-nightstand-inset-plinth');
      box(g,W,H-plinth,D,wood,0,plinth,0,'reference-oak-nightstand-body',.004);
      const gap=.004,drawerH=(H-plinth-.024-gap)/2;
      for(let i=0;i<2;i++)box(g,W-.016,drawerH,.016,material('wood',i?'#B0895E':'#B58E62'),0,plinth+.009+i*(drawerH+gap),D/2-.008,'reference-two-drawer-front',.002);
      box(g,W-.035,.003,.002,material('dark-oak','#7B6148'),0,plinth+.009+drawerH,D/2-.001,'reference-nightstand-recessed-pull');
    }
    return true;
  }
  function desk(g,f){
    const W=M(f.w),D=M(f.d),H=M(f.heightMm),thickness=Math.min(.15,H),bottom=H-thickness,cream=material('cream','#E8E3D8');
    box(g,W,thickness,D,cream,0,bottom,0,'reference-floating-desk-box',Math.min(.026,D*.05));
    const drawerH=thickness-.018;
    for(let i=0;i<2;i++)box(g,(W-.021)/2,drawerH,.010,cream,(i-.5)*(W-.007)/2,bottom+.004,D/2-.005,'reference-floating-desk-drawer',.005);
    box(g,W-.03,.009,D-.018,material('cream','#F1EEE5'),0,H-.009,0,'reference-floating-desk-top',.004);
    // A laptop is an optional reference prop, not the removed desktop PC.
    if(f.referenceStyle?.laptop){
      const lw=Math.min(.29,W*.36),ld=Math.min(.21,D*.52),lt=.004,y=H-.028;
      box(g,lw,lt,ld,material('metal','#B0AAA1'),-W*.12,y,0,'reference-laptop-base');
      box(g,lw,.019,.008,material('metal','#4F514B'),-W*.12,y+lt,-ld/2,'reference-laptop-closed-screen');
    }
    return true;
  }
  function sofa(g,f){
    const W=M(f.w),D=M(f.d),H=M(f.heightMm),linen=material('linen','#E8E1D4'),baseH=Math.min(.17,H*.22),seatH=Math.min(.17,H*.22),backD=Math.min(.25,D*.30);
    box(g,W,baseH,D,linen,0,0,0,'reference-low-sofa-base',.025);
    const n=W>1.3?3:2,cw=(W-.022)/n,seatD=D-backD-.014;
    for(let i=0;i<n;i++){
      const x=-W/2+.011+cw*(i+.5);
      box(g,cw-.008,seatH,seatD,linen,x,baseH,-D/2+backD+seatD/2,'reference-low-sofa-seat-module',.035);
      box(g,cw-.008,H-baseH-seatH,backD,linen,x,baseH+seatH,-D/2+backD/2,'reference-low-sofa-loose-back-cushion',.060);
      const weltY=baseH+seatH-.006;box(g,cw-.018,.005,.005,material('linen','#D5CCBD'),x,weltY,D/2-.013,'reference-sofa-seat-welt',.002);
    }
    const throwW=Math.min(.49,W*.30),throwD=Math.min(.59,D*.77),throwX=W*.23;
    box(g,throwW,.013,throwD,material('linen','#8A8980'),throwX,baseH+seatH+.001,D/2-throwD/2-.015,'reference-study-sofa-knit-throw',.005);
    return true;
  }
  function chair(g,f){
    const W=M(f.w),D=M(f.d),H=M(f.heightMm),wood=material('wood','#BA9871'),cream=material('linen','#EAE4D7'),seatTop=H*.52;
    for(const x of[-W*.36,W*.36])for(const z of[-D*.33,D*.33])cylinder(g,.013,seatTop-.065,wood,x,0,z,'reference-chair-wood-leg',.018);
    box(g,W*.94,.085,D*.88,cream,0,seatTop-.085,0,'reference-chair-upholstered-seat',.037);
    const backH=H-seatTop-.035;box(g,W*.88,backH,D*.22,cream,0,seatTop+.035,-D/2+D*.14,'reference-chair-soft-wrap-back',.042);
    return true;
  }
  function rug(g,f){const W=M(f.w),D=M(f.d),H=Math.max(.002,M(f.heightMm));box(g,W,H,D,material('rug',f.color||'#C8C1B4'),0,0,0,'reference-woven-rug',Math.min(.01,H/3));return true;}
  function diningPendant(g,f){
    const W=M(f.w),D=M(f.d),H=M(f.heightMm),brass=material('metal','#A18B65'),cream=material('cream','#F0EADC');
    const x=-W*.34,canopyH=Math.min(.022,H*.04),radius=Math.min(D/2-.008,.18),shadeH=Math.min(.16,H*.24),shadeTop=shadeH+.008;
    cylinder(g,Math.min(.043,D*.20),canopyH,cream,x,H-canopyH,0,'reference-dining-pendant-ceiling-canopy');
    rod(g,[x,H-canopyH,0],[x,H*.68,0],.0032,brass,'reference-dining-pendant-vertical-suspension');
    rod(g,[x,H*.68,0],[W*.20,H*.45,0],.004,brass,'reference-dining-pendant-articulated-arm-upper');
    rod(g,[W*.20,H*.45,0],[0,shadeTop+.020,0],.0035,brass,'reference-dining-pendant-articulated-arm-lower');
    rod(g,[0,shadeTop+.020,0],[0,shadeTop-.004,0],.004,brass,'reference-dining-pendant-shade-stem');
    const joint=mesh(new THREE.SphereGeometry(.009,10,7),brass,'reference-dining-pendant-arm-joint');joint.position.set(W*.20,H*.45,0);g.add(joint);
    cylinder(g,radius,shadeH,cream,0,.008,0,'reference-dining-pendant-cream-conical-shade',radius*.34);
    const glow=new THREE.MeshStandardMaterial({color:'#FFF0D1',emissive:'#FFD99A',emissiveIntensity:.65,roughness:.72});
    const emitter=cylinder(g,radius*.92,.007,glow,0,0,0,'reference-dining-pendant-warm-diffuser');emitter.castShadow=false;
    g.userData.referenceDiningPendant=true;g.userData.extraPointLightsAdded=false;return true;
  }
  function buildFurniture(g,f){
    const variant=f.referenceStyle?.variant;
    // Explicit variant allow-list: existing sofas, dining tables and chairs
    // without these reference tags retain their original purchased models.
    switch(variant){
      case'master-channel-bed':return bed(g,f,false);
      case'child-arch-bed':return bed(g,f,true);
      case'oak-two-drawer-nightstand':return nightstand(g,f,false);
      case'round-child-nightstand':return nightstand(g,f,true);
      case'floating-desk':return desk(g,f);
      case'low-linen-sofa':return sofa(g,f);
      case'cream-wood-chair':return chair(g,f);
      case'woven-rug':return rug(g,f);
      case'articulated-dining-pendant':return diningPendant(g,f);
      default:return false;
    }
  }
  function buildSpecialPanel(p,W,D,H){
    if(!['arch-spandrel','arched-back'].includes(p.shape))return null;
    const across=['east','west'].includes(p.face),span=across?D:W,thickness=across?W:D;
    let shape;
    if(p.shape==='arched-back')shape=archShape(span,H,Math.min(M(p.archRiseMm||p.archRadiusMm)||span/2,H));
    else{
      // The white shoulder panel is a polygon around the TOP of an open arch.
      // Its cutout connects to the lower boundary: no hidden solid fills the
      // arch, and no pink material is used for the white front moulding.
      const opening=clamp(M(p.openingWidthMm)||span-.036,.001,span-.0005),rise=clamp(M(p.archRiseMm||p.archRadiusMm)||opening/2,.001,H),s=new THREE.Shape(),bottom=-H/2;
      s.moveTo(-span/2,bottom);s.lineTo(-span/2,H/2);s.lineTo(span/2,H/2);s.lineTo(span/2,bottom);s.lineTo(opening/2,bottom);
      for(let i=1;i<=20;i++){const a=i*Math.PI/20;s.lineTo(Math.cos(a)*opening/2,bottom+Math.sin(a)*rise);}
      s.lineTo(-span/2,bottom);s.closePath();shape=s;
    }
    const geometry=extruded(shape,thickness);if(across)geometry.rotateY(Math.PI/2);
    const o=mesh(geometry,material(p.shape==='arched-back'?'rose':'cream',p.color||(p.shape==='arched-back'?'#D0B2A9':'#EBE6DD')),p.shape==='arched-back'?'reference-pink-arched-niche-back':'reference-cream-open-arch-spandrel');
    o.userData.openArch=p.shape==='arch-spandrel';o.userData.panelShape=p.shape;return o;
  }
  function decorateFurniture(g,f){
    if(f.id!=='family-f3'||f.referenceStyle?.variant!=='master-cream-wardrobe')return false;
    const assembly=new THREE.Group();assembly.name='reference-master-open-niche-garments';assembly.userData={referenceInterior:true,referenceApproximation:true,role:'reference-open-wardrobe-garments'};
    const settings=[{kind:'coat',x:-.919,z:.065,w:.340,h:.950,bottom:1.030,color:'#B4AD9E',fold:'#A29B8D',hanger:'#524C43'},
      {kind:'shirt',x:-.863,z:-.035,w:.330,h:.865,bottom:1.115,color:'#EEE8DA',fold:'#DDD5C6',hanger:'#A2835F'}];
    for(const spec of settings){
      const outline=new THREE.Shape(),points=[[-.11,1],[-.27,.96],[-.43,.88],[-.50,.58],[-.35,.55],[-.28,.75],[-.25,.05],[-.17,0],[.17,0],[.25,.05],[.28,.75],[.35,.55],[.50,.58],[.43,.88],[.27,.96],[.11,1],[.08,.95],[-.08,.95]];
      points.forEach(([x,y],i)=>i?outline.lineTo(x*spec.w,y*spec.h):outline.moveTo(x*spec.w,y*spec.h));outline.closePath();
      const cloth=mesh(extruded(outline,.020),material('linen',spec.color),'reference-open-wardrobe-garment-'+spec.kind);cloth.position.set(spec.x,spec.bottom,spec.z);cloth.userData.garmentKind=spec.kind;assembly.add(cloth);
      // Slightly offset, low-contrast raised seams indicate soft drape without
      // opaque rectangular planes, high-resolution cloth or simulated fabric.
      for(let i=0;i<5;i++){const x=spec.x+(i-2)*.039,y=spec.bottom+.12,slope=(i-2)*.0018,fold=new THREE.Shape();fold.moveTo(x-.001,y);fold.lineTo(x+.001,y);fold.quadraticCurveTo(x+slope+.006,y+spec.h*.29,x+slope+.001,y+spec.h*.62);fold.lineTo(x+slope-.001,y+spec.h*.62);fold.quadraticCurveTo(x+slope+.004,y+spec.h*.29,x-.001,y);const crease=mesh(extruded(fold,.0015),material('linen',spec.fold),'reference-open-wardrobe-soft-fold');crease.position.z=spec.z+.0105;assembly.add(crease);}
      const hanger=new THREE.Group();hanger.userData={referenceInterior:true,referenceApproximation:true,role:'reference-open-wardrobe-hanger',garmentKind:spec.kind};
      const hw=.147,shape=new THREE.Shape();shape.moveTo(-hw,1.935);shape.lineTo(0,2.018);shape.lineTo(hw,1.935);shape.lineTo(hw-.006,1.929);shape.lineTo(-hw+.006,1.929);shape.closePath();
      const hollow=new THREE.Path();hollow.moveTo(-hw+.024,1.937);hollow.lineTo(hw-.024,1.937);hollow.lineTo(0,2.005);hollow.closePath();shape.holes.push(hollow);
      const frame=mesh(extruded(shape,.005),material(spec.kind==='coat'?'metal':'wood',spec.hanger),'reference-open-wardrobe-hanger-outline');frame.position.set(spec.x,0,spec.z);hanger.add(frame);
      // The neck returns to the actual rail depth z=0; a small YZ hook rises
      // over its 2050..2066-mm visible bar instead of floating at cloth depth.
      const hookPoints=[[2.012,spec.z],[2.035,0],[2.050,-.015],[2.072,-.015],[2.080,0],[2.072,.015],[2.068,.014]].map(([y,z])=>new THREE.Vector3(spec.x,y,z));
      const hook=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hookPoints),18,.002,5,false),material('metal',spec.hanger),'reference-open-wardrobe-hanger-hook');hanger.add(hook);assembly.add(hanger);
    }
    // Follow the same explicit envelope edit scales as the real cabinet parts.
    assembly.scale.set(f.w/(f.baseWidthMm||2240),f.heightMm/(f.baseHeightMm||2790),f.d/(f.baseDepthMm||600));g.add(assembly);return true;
  }
  function artTexture(kind='warm-abstract'){
    if(textureCache.has(kind))return textureCache.get(kind);
    const landscape=kind==='cloud-landscape',c=document.createElement('canvas');c.width=landscape?960:512;c.height=landscape?540:640;const ctx=c.getContext('2d');
    if(landscape){
      const sky=ctx.createLinearGradient(0,0,0,c.height);sky.addColorStop(0,'#B5BFC0');sky.addColorStop(.62,'#E1DFD1');sky.addColorStop(1,'#C9C0A3');ctx.fillStyle=sky;ctx.fillRect(0,0,c.width,c.height);
      for(let i=0;i<9;i++){ctx.fillStyle='rgba(247,244,231,'+(.22+(i%3)*.08)+')';ctx.beginPath();ctx.ellipse(70+i*112,90+(i%3)*24,130+(i%2)*45,30+(i%3)*6,-.04,0,Math.PI*2);ctx.fill();}
      for(const [color,y,amp]of[['#9EAA9A',340,45],['#87998A',389,37],['#B49C6B',452,20]]){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,c.height);ctx.lineTo(0,y);for(let x=0;x<=c.width;x+=20)ctx.lineTo(x,y+Math.sin(x*.008+y)*amp+Math.cos(x*.019)*amp*.22);ctx.lineTo(c.width,c.height);ctx.closePath();ctx.fill();}
    }else{
      ctx.fillStyle='#DDD8C4';ctx.fillRect(0,0,c.width,c.height);const colors=['#BD773C','#CD9854','#9F9C6B','#7E8A66','#EAE4CE','#B8B39B'];
      let seed=8317;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      for(let i=0;i<42;i++){const x=random()*c.width,y=random()*c.height,w=22+random()*100,h=40+random()*190;ctx.fillStyle=colors[i%colors.length];ctx.globalAlpha=.35+random()*.45;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+w*.8,y-h*.2,x+w*1.1,y+h*.5,x+w*.75,y+h);ctx.lineTo(x-w*.12,y+h*.85);ctx.bezierCurveTo(x+w*.24,y+h*.3,x-w*.22,y+h*.1,x,y);ctx.fill();}
      ctx.globalAlpha=1;ctx.strokeStyle='rgba(245,240,215,.55)';ctx.lineWidth=2;for(let i=0;i<16;i++){ctx.beginPath();ctx.moveTo(random()*512,0);ctx.bezierCurveTo(random()*512,180,random()*512,430,random()*512,640);ctx.stroke();}
    }
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.userData={referenceApproximation:true,proceduralArtwork:true,notOriginalArtwork:true,kind};textureCache.set(kind,texture);return texture;
  }
  return {buildFurniture,buildSpecialPanel,decorateFurniture,artTexture};
}
