/* Shared layout-to-budget bridge. Reads complete furniture groups, never cabinet parts. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PurchasePlan=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='floorplan:purchase-layout:';
  const categoryFor={aircon:'ac',acwall:'ac',hood:'hood',stove:'stove',waterheater:'heater',ceilingfan:'cooler',robotvacuum:'robot',ovencol:'oven',oven:'oven'};
  const excludedVariants=new Set(['balcony-exterior-projection','square-floor-drain']);
  function area(poly){return Math.abs(poly.reduce((n,p,i)=>{const q=poly[(i+1)%poly.length];return n+p[0]*q[1]-q[0]*p[1];},0))/2e6;}
  function inside(x,y,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
  function dimensions(f){return {width:Math.round(f.w||0),depth:Math.round(f.d||0),height:Math.round(f.heightMm||f.h||f.baseHeightMm||0)};}
  function snapshot({schemeId,schemeName,rooms,furniture,roomNames={},ownedFurnitureIds}){
    const validRooms=rooms.filter(r=>r.counted!==false),byRoom=new Map(validRooms.map(r=>[r.id,r]));
    const roomInfo=validRooms.map(r=>({id:r.id,name:roomNames[r.id]?.name||r.name,area:area(r.poly)}));
    const groups=new Map(),excluded=[];
    const items=furniture.slice();
    for(const stand of furniture.filter(f=>f.type==='tvstand'))items.push({id:stand.id+':screen',type:'tv',name:'电视 / 艺术屏（电视柜附带模型）',roomId:stand.roomId,cx:stand.cx,cy:stand.cy,w:stand.referenceStyle?1700:1450,d:stand.referenceStyle?35:25,heightMm:stand.referenceStyle?940:840,color:'#393735'});
    for(const f of items){
      if(f.electricalDesign||excludedVariants.has(f.modelVariant)){excluded.push({id:f.id,name:f.name,reason:f.electricalDesign?'电位':'结构或地漏'});continue;}
      const geometric=validRooms.find(r=>inside(f.cx,f.cy,r.poly));
      const assigned=geometric||byRoom.get(f.roomId);
      const roomId=assigned?.id||'unassigned',room=roomInfo.find(r=>r.id===roomId);
      const size=dimensions(f),category=f.type==='waterheater'&&/电热水器|储水式/.test(f.name||'')?'furniture':categoryFor[f.type]||'furniture';
      const owned=!!f.purchasedProductId&&(!ownedFurnitureIds||ownedFurnitureIds.includes(f.id));
      const key=JSON.stringify([roomId,f.type,f.purchasedProductId||f.name||f.type,size.width,size.depth,size.height,owned]);
      if(!groups.has(key))groups.set(key,{key,name:f.name||f.type,category,sourceType:f.type,roomId,roomName:room?.name||'未归属房间',roomArea:room?.area??null,size,color:f.color||'#ddd4c7',owned,mattress:f.mattressMm||null,sourceIds:[],quantity:0});
      const group=groups.get(key);group.sourceIds.push(String(f.id));group.quantity++;
    }
    const result={version:1,schemeId,schemeName,rooms:roomInfo,groups:[...groups.values()],excluded};
    result.signature=JSON.stringify([result.rooms,result.groups]);result.updatedAt=Date.now();return result;
  }
  function fromLibrary(library,id,storage){
    const s=library.schemes[id];if(!s)return null;
    let furniture=s.defaultFurniture,roomNames={};
    try{const key='floorplan:house-design:'+id+':'+library.version+':'+s.metadata.source.sha256.slice(0,12),draft=JSON.parse(storage.getItem(key));if(draft&&Array.isArray(draft.furniture)){furniture=draft.furniture;roomNames=draft.rooms||{};}}catch{}
    return snapshot({schemeId:id,schemeName:s.name,rooms:s.ROOMS,furniture,roomNames,ownedFurnitureIds:s.defaultFurniture.filter(f=>f.purchasedProductId).map(f=>f.id)});
  }
  function acKind(row){if(row.sourceType==='aircon'||row.roomId==='living'||(!row.sourceKey&&/客厅|客餐厅/.test(row.name)))return 'floor';if(row.sourceType==='acwall'||['room_a','room_b','room_c'].includes(row.roomId)||(!row.sourceKey&&/主卧|次卧|书房/.test(row.name)))return 'wall';return null;}
  function eligible(product,row){
    if(product.category!==row.category)return false;
    if(product.category!=='ac')return true;
    const floor=acKind(row)==='floor',wall=acKind(row)==='wall';
    if(floor)return product.acForm==='floor'&&(!product.areaRange||!Number.isFinite(row.roomArea)||(row.roomArea>=product.areaRange[0]&&row.roomArea<=product.areaRange[1]));
    if(wall){if(product.acForm!=='wall')return false;if(!Number.isFinite(row.roomArea))return !row.sourceKey;return Array.isArray(product.areaRange)&&row.roomArea>=product.areaRange[0]&&row.roomArea<=product.areaRange[1];}
    return true;
  }
  function sync(plan,snap,makeRow,products){
    if(plan.sourceSchemeId!==snap.schemeId)return {added:0,removed:0,invalidated:0};
    const existing=new Map(plan.rows.filter(r=>r.sourceKey).map(r=>[r.sourceKey,r])),next=[],archive=plan.sourceArchive||[];
    let added=0,removed=0,invalidated=0;
    for(const g of snap.groups){
      let r=existing.get(g.key);
      if(r)existing.delete(g.key);else{r=makeRow(g.name,g.category,!g.owned);added++;}
      Object.assign(r,{sourceKey:g.key,sourceIds:g.sourceIds,sourceType:g.sourceType,roomId:g.roomId,roomName:g.roomName,roomArea:g.roomArea,size:g.size,color:g.color,mattress:g.mattress,owned:g.owned,name:g.name,category:g.category,quantity:String(g.quantity)});
      if(r.productId&&products.has(r.productId)&&!eligible(products.get(r.productId),r)){
        archive.push({...r,archivedReason:'当前房间面积或机型不再匹配',archivedAt:Date.now()});r.productId='';r.unitPrice='';r.fee='';invalidated++;
      }
      next.push(r);
    }
    for(const r of existing.values()){archive.push({...r,archivedReason:'户型已移除或尺寸、房间已变更',archivedAt:Date.now()});removed++;}
    plan.rows=next.concat(plan.rows.filter(r=>!r.sourceKey));plan.sourceArchive=archive;
    plan.sourceSignature=snap.signature;plan.sourceSchemeName=snap.schemeName;plan.sourceUpdatedAt=snap.updatedAt;
    return {added,removed,invalidated};
  }
  function preview(size,type='furniture',color='#d8c8b3'){
    const w=Number(size?.width)||600,d=Number(size?.depth)||400,h=Number(size?.height)||800;
    const scale=Math.min(108/w,70/d),pw=Math.max(12,w*scale),pd=Math.max(10,d*scale),x=(160-pw)/2,y=(102-pd)/2;
    const safe=/^#[a-f0-9]{3,8}$/i.test(color)?color:'#d8c8b3';
    let detail='';
    if(type==='bed')detail=`<rect x="${x+pw*.1}" y="${y+pd*.08}" width="${pw*.8}" height="${pd*.2}" rx="3" fill="#fff9"/>`;
    if(type==='chair'||type==='officechair')detail=`<path d="M${x+4},${y+pd*.3}H${x+pw-4}" stroke="#87705c" stroke-width="3"/>`;
    return `<svg viewBox="0 0 160 132" role="img" aria-label="当前物件平面尺寸示意"><rect x="${x}" y="${y}" width="${pw}" height="${pd}" rx="4" fill="${safe}" stroke="#8f7d68"/>${detail}<path d="M${x},111H${x+pw}M${x},108V114M${x+pw},108V114" stroke="#9c8c7a"/><text x="80" y="126" text-anchor="middle" fill="#776b5e" font-size="10">宽 ${Math.round(w)} × 深 ${Math.round(d)} mm</text></svg>`;
  }
  return {KEY,area,snapshot,fromLibrary,acKind,eligible,sync,preview};
});
