// Original, deterministic procedural finishes. Photo references specify visual
// intent, not a manufacturer's exact product, scan or PBR material collection.
export function createReferenceFinishes(THREE,{getEnvironment=()=>null}={}){
  const cache=new Map(),textures=new Map();
  const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  function texture(kind,color){
    const key=kind+color;if(textures.has(key))return textures.get(key);
    const cv=document.createElement('canvas');cv.width=512;cv.height=kind.includes('wood')||kind.includes('oak')?1024:512;
    const c=cv.getContext('2d'),R=random(504259),W=cv.width,H=cv.height;
    c.fillStyle=color;c.fillRect(0,0,W,H);
    if(/wood|oak/.test(kind)){
      for(let i=0;i<360;i++){
        const x=R()*W,phase=R()*7,amp=1+R()*5;
        c.strokeStyle=`rgba(76,51,28,${.018+R()*.043})`;c.lineWidth=.3+R()*.85;c.beginPath();
        for(let y=0;y<=H;y+=12){const xx=x+Math.sin(y*.008+phase)*amp+Math.sin(y*.025+phase)*.7;y?c.lineTo(xx,y):c.moveTo(xx,y);}c.stroke();
      }
      if(kind==='floor-wood'){
        c.fillStyle='rgba(68,43,22,.12)';c.fillRect(0,0,2,H);c.fillRect(W-1,0,1,H);
        c.fillRect(0,H*.56,W,1.5);
        for(let i=0;i<4;i++){c.fillStyle=`rgba(255,255,255,${.008+i*.004})`;c.fillRect(i*W/4,0,W/4,H);}
      }
    }else if(/linen|rug|rose|curtain/.test(kind)){
      const gap=kind==='rug'?4:3;
      for(let y=0;y<H;y+=gap){c.strokeStyle=`rgba(64,49,36,${.025+R()*.04})`;c.lineWidth=.7;c.beginPath();c.moveTo(0,y);c.lineTo(W,y+.5);c.stroke();}
      for(let x=0;x<W;x+=gap){c.strokeStyle=`rgba(255,255,255,${.06+R()*.09})`;c.lineWidth=.8;c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
      for(let i=0;i<3500;i++){c.fillStyle=`rgba(65,52,41,${R()*.025})`;c.fillRect(R()*W,R()*H,1,1);}
    }else{
      for(let i=0;i<14000;i++){c.fillStyle=`rgba(${R()>.5?'255,255,255':'78,68,52'},${R()*.014})`;c.fillRect(R()*W,R()*H,1+R(),1+R());}
      if(kind==='floor-tile'){c.fillStyle='rgba(120,111,94,.15)';c.fillRect(0,0,W,1);c.fillRect(0,0,1,H);}
    }
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
    if(kind==='floor-wood')t.repeat.set(1/.19,1/1.8);
    if(kind==='floor-tile')t.repeat.set(1/.8,1/.8);
    t.userData={referenceFinish:kind,originalProcedural:true,notManufacturerTexture:true};textures.set(key,t);return t;
  }
  function material(kind,color){
    const defaults={cream:'#EAE5DA',wood:'#BF9F79','dark-oak':'#8E7358',linen:'#E8E2D7',rose:'#D3B7AC',rug:'#C5BEB1',metal:'#91806B','floor-wood':'#C6AB87','floor-tile':'#E2DDD3',curtain:'#D8D0C2'};
    color=color||defaults[kind]||defaults.cream;const key=kind+color;if(cache.has(key))return cache.get(key);
    const cloth=/linen|rug|rose|curtain/.test(kind),wood=/wood|oak/.test(kind);
    const m=new THREE.MeshStandardMaterial({color:kind==='metal'?color:'#ffffff',map:kind==='metal'?null:texture(kind,color),
      roughness:cloth?.98:wood?.73:kind==='metal'?.4:kind==='floor-tile'?.57:.73,metalness:kind==='metal'?.65:0});
    if(getEnvironment()&&!cloth){m.envMap=getEnvironment();m.envMapIntensity=kind==='metal'?.42:.13;}
    if(cloth){m.bumpMap=m.map;m.bumpScale=kind==='rug'?.0015:.00065;}
    m.userData={referenceFinish:kind,originalProcedural:true,notExactSourceMaterial:true};cache.set(key,m);return m;
  }
  return {material,floor:kind=>kind==='wood'?material('floor-wood'):kind==='tile800'?material('floor-tile'):null};
}
