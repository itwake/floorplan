// Rendering-only optimizations. Original objects, dimensions, materials and
// ownership remain available for editing, measurements and exact surface picks.
export const QUALITY_PRESETS={
  smooth:{pixelRatio:1,pixelBudget:900000,shadowSize:1024,spots:2,points:2},
  balanced:{pixelRatio:1,pixelBudget:1800000,shadowSize:1024,spots:4,points:4},
  detail:{pixelRatio:1.5,pixelBudget:4000000,shadowSize:2048,spots:Infinity,points:Infinity}
};
export function drawingRatio(preset,width,height,dpr=1){
  return Math.min(dpr,preset.pixelRatio,Math.sqrt(preset.pixelBudget/Math.max(1,width*height)));
}

export function createStaticBatcher(THREE){
  const SOURCE_LAYER=31;
  function eligible(o,root){
    if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||o.userData.renderBatch||!o.layers.test(root.layers))return false;
    for(let p=o;p&&p!==root;p=p.parent){
      if(!p.visible||p.userData.door||p.userData.cabinetDoor||p.userData.walkOnly||p.userData.balconyProjectionCutMin!==undefined||p.userData.ceilingLightingCutMin!==undefined)return false;
    }
    const g=o.geometry;if(!g?.attributes.position||!g.attributes.normal||!g.attributes.uv||g.morphAttributes.position?.length||o.customDepthMaterial||o.customDistanceMaterial)return false;
    if(Object.keys(g.attributes).some(k=>!['position','normal','uv'].includes(k)))return false;
    const ms=Array.isArray(o.material)?o.material:[o.material];
    return ms.every(m=>m&&!m.transparent&&m.opacity===1&&!m.clippingPlanes?.length&&!m.isShaderMaterial&&!m.vertexColors);
  }
  function batch(root){
    root.updateWorldMatrix(true,true);
    const inverse=root.matrixWorld.clone().invert(),groups=new Map();
    root.traverse(o=>{
      if(!eligible(o,root))return;
      const matrix=inverse.clone().multiply(o.matrixWorld);if(matrix.determinant()<0)return;
      const geo=o.geometry,total=geo.index?.count||geo.attributes.position.count;
      if(geo.drawRange.start!==0||geo.drawRange.count<total)return;
      const ranges=Array.isArray(o.material)?geo.groups:[{start:0,count:total,materialIndex:0}];
      if(!ranges.length||ranges.reduce((s,r)=>s+r.count,0)!==total)return;
      for(const range of ranges){
        const material=Array.isArray(o.material)?o.material[range.materialIndex]:o.material,key=[material.uuid,o.castShadow,o.receiveShadow,o.renderOrder].join(':');
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push({object:o,matrix,normal:new THREE.Matrix3().getNormalMatrix(matrix),material,...range});
      }
    });
    const batched=new Set();let batches=0;
    for(const records of groups.values()){
      // A single existing draw call has nothing to gain from a copied buffer.
      if(records.length<2)continue;
      const count=records.reduce((s,r)=>s+r.count,0),position=new Float32Array(count*3),normal=new Float32Array(count*3),uv=new Float32Array(count*2),v=new THREE.Vector3(),n=new THREE.Vector3();
      let offset=0;
      for(const r of records){
        const geo=r.object.geometry,p=geo.attributes.position,no=geo.attributes.normal,t=geo.attributes.uv;
        r.firstFace=offset/3;r.lastFace=(offset+r.count)/3;
        for(let k=0;k<r.count;k++){
          const index=geo.index?geo.index.getX(r.start+k):r.start+k;
          v.fromBufferAttribute(p,index).applyMatrix4(r.matrix);n.fromBufferAttribute(no,index).applyMatrix3(r.normal).normalize();
          position.set([v.x,v.y,v.z],(offset+k)*3);normal.set([n.x,n.y,n.z],(offset+k)*3);uv.set([t.getX(index),t.getY(index)],(offset+k)*2);
        }
        offset+=r.count;batched.add(r.object);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const first=records[0],merged=new THREE.Mesh(geometry,first.material);
      merged.castShadow=first.object.castShadow;merged.receiveShadow=first.object.receiveShadow;merged.renderOrder=first.object.renderOrder;
      merged.userData={renderBatch:true,sourceMeshCount:records.length};
      merged.raycast=function(raycaster,hits){
        const start=hits.length;THREE.Mesh.prototype.raycast.call(this,raycaster,hits);
        for(let i=start;i<hits.length;i++){
          const hit=hits[i],r=records.find(r=>hit.faceIndex>=r.firstFace&&hit.faceIndex<r.lastFace);if(!r)continue;
          hit.object=r.object;hit.faceIndex=hit.faceIndex-r.firstFace+r.start/3;
          if(hit.face){
            const geometry=r.object.geometry,at=k=>geometry.index?geometry.index.getX(hit.faceIndex*3+k):hit.faceIndex*3+k;
            hit.face.a=at(0);hit.face.b=at(1);hit.face.c=at(2);hit.face.materialIndex=r.materialIndex;
            THREE.Triangle.getNormal(new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,hit.face.a),new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,hit.face.b),new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,hit.face.c),hit.face.normal);
          }
          if(hit.normal)hit.normal.applyMatrix3(r.normal.clone().invert()).normalize();
        }
      };
      root.add(merged);batches++;
    }
    // Do not hide a multi-material object unless ALL of its ranges were batched.
    // Unbatched singleton ranges are emitted as small independent render proxies.
    for(const o of batched){
      for(const records of groups.values())if(records.length===1&&records[0].object===o){
        const r=records[0],g=o.geometry.clone();g.clearGroups();g.setDrawRange(r.start,r.count);
        const proxy=new THREE.Mesh(g,r.material);proxy.matrix.copy(r.matrix);proxy.matrixAutoUpdate=false;proxy.castShadow=o.castShadow;proxy.receiveShadow=o.receiveShadow;proxy.renderOrder=o.renderOrder;proxy.userData={renderBatch:true,sourceMeshCount:1};
        proxy.raycast=function(raycaster,hits){const start=hits.length;THREE.Mesh.prototype.raycast.call(this,raycaster,hits);for(let i=start;i<hits.length;i++){hits[i].object=o;if(hits[i].face)hits[i].face.materialIndex=r.materialIndex;}};root.add(proxy);batches++;
      }
      o.layers.set(SOURCE_LAYER);o.userData.performanceBatched=true;
    }
    return{sources:batched.size,batches};
  }
  return{batch};
}
