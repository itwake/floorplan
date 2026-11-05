'use strict';

const assert=require('node:assert/strict'),{isDeepStrictEqual:same}=require('node:util');
const clone=structuredClone,KEY='familyBathFitUpdate',REVISION='family-bath-fit-20261105';
const ARCH=['WALLS','WALL_META','ROOMS'];
const NOTES=[
  '按业主2026-11-05更正，两卫之间为连续实墙，补齐东侧漏段；沿用现有南北墙面4719.851／4840mm，墙厚约120mm，不新建两卫互通门。',
  '主卫盆柜600×360贴西南角、马桶背靠东墙朝西；淋浴900×800收回南墙内侧，西北斜角门向淋浴内开启。马桶中心到北墙及淋浴边各约340mm，是紧凑试排，舒适度仍需实物核对。',
  '客卫1400×600一体台贴北墙，西盆东洗衣机；机器600×530×840置于独立承重的台下净腔，后留50、前退20、顶部50mm名义间隙。马桶背靠隔墙，淋浴贴东南角；斜角玻璃门均向淋浴内部开。',
  '斜角门名义边长约636mm，玻璃、五金及安装后净口待选型；此处校核模型占地和开启避碰，不把名义尺寸当作实际通行净宽。排水、涉水电位及墙体性质仍按现场条件深化。'
];
const planOf=v=>v.schemes?.family||v,round=n=>Math.round(n*1000)/1000;
function rect(f){const a=(f.rot||0)*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));return[round(f.cx-w/2),round(f.cy-d/2),round(f.cx+w/2),round(f.cy+d/2)];}
function overlap(a,b){return Math.min(a[2],b[2])-Math.max(a[0],b[0])>0.001&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>0.001;}
function area(poly){return Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;}
function insideRect(r,poly){const xs=[...new Set([r[0],r[2],...poly.map(q=>q[0]).filter(x=>x>r[0]&&x<r[2])])].sort((a,b)=>a-b),ys=[...new Set([r[1],r[3],...poly.map(q=>q[1]).filter(y=>y>r[1]&&y<r[3])])].sort((a,b)=>a-b);for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const x=(xs[i-1]+xs[i])/2,y=(ys[j-1]+ys[j])/2;let inside=false;for(let k=0,l=poly.length-1;k<poly.length;l=k++){const a=poly[k],b=poly[l];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(!inside)return false;}return true;}
function showerDesign(){return{revision:REVISION,wallCorner:'south-east',entryCorner:'north-west',chamferMm:450,doorLengthMm:round(Math.SQRT2*450),hinge:'north-end',opens:'inward',defaultAngleDegrees:80,maximumAngleDegrees:80,glassHeightMm:1950,installationVerified:false};}
function beforeFamilyBathFit(value){const out=require('./family-guest-shower-rect-20261105.cjs').beforeFamilyGuestShower(value),p=planOf(out),m=p?.metadata?.[KEY];if(!m)return out;for(const k of ARCH)for(const entry of m.previousArchitecture[k])p[k][entry.index]=clone(entry.value);const old=new Map(m.previousFurniture.map(f=>[f.id,f]));p.defaultFurniture=p.defaultFurniture.map(f=>clone(old.get(f.id)||f));for(const[k,v]of Object.entries(m.previousMetadataFields)){if(v.present)p.metadata[k]=clone(v.value);else delete p.metadata[k];}delete p.metadata[KEY];return out;}
function validateFamilyBathFit(value){const p=planOf(value),get=id=>p.defaultFurniture.find(f=>f.id===id),core=['vanity_main','family-f11','family-f12','vanity_guest','family-f14','family-f15','laundry_washer'];
  assert.deepEqual(p.WALLS[20],[5050,4719.851,6800,4839.851,'i']);assert.deepEqual(p.WALLS[21],[5050,4839.851,6800,4840,'i']);
  for(const id of core){const f=get(id),r=rect(f),room=p.ROOMS.find(q=>q.id===f.roomId);assert.ok(insideRect(r,room.poly),id+' outside its own room');for(const wall of p.WALLS)assert.ok(!overlap(r,wall),id+' intersects solid wall');}
  for(let i=0;i<core.length;i++)for(let j=i+1;j<core.length;j++){const a=core[i],b=core[j];if([a,b].includes('vanity_guest')&&[a,b].includes('laundry_washer'))continue;assert.ok(!overlap(rect(get(a)),rect(get(b))),a+' overlaps '+b);}
  const main=rect(get('family-f12')),guest=rect(get('family-f15'));assert.equal(main[3],4719.851);assert.equal(guest[3],6040);assert.equal(guest[2],6800);
  for(const n of[1,2]){const shower=get(n===1?'family-f12':'family-f15'),drain=get('family-drain-bath'+n+'-shower');assert.ok(insideRect(rect(drain),[[...rect(shower).slice(0,2)],[rect(shower)[2],rect(shower)[1]],[...rect(shower).slice(2)],[rect(shower)[0],rect(shower)[3]]]));assert.equal(shower.showerDesign.opens,'inward');}
  const wc=get('family-f11'),washer=get('laundry_washer');assert.equal(wc.cy-3240,340);assert.equal(round(main[1]-wc.cy),339.851);assert.deepEqual(rect(washer),[4400,4640,5000,5170]);
  return{ok:true,partitionThicknessMm:120.149,masterNetMm:[1650,1479.851],masterShowerMm:[900,800],masterToiletSideCentersMm:[340,339.851],masterToiletFrontToWestWallMm:1070,guestToiletFrontToSouthWallMm:620,guestToiletCenterToShowerMm:385,washerClearancesMm:{rear:50,frontSetback:20,top:50,sideTotal:64},diagonalDoorNominalMm:round(450*Math.SQRT2)};
}
function applyFamilyBathFit(value){const p=planOf(value);assert.equal(p.id,'family');if(p.metadata[KEY])return value;assert.ok(p.metadata.familyStudyNorthUpdate);const previous=clone(p),get=id=>p.defaultFurniture.find(f=>f.id===id);
  p.WALLS[20]=[5050,4719.851,6800,4839.851,'i'];p.WALLS[21]=[5050,4839.851,6800,4840,'i'];
  for(const i of[20,21])Object.assign(p.WALL_META[i],{layoutRevision:REVISION,modelRectMm:p.WALLS[i].slice(0,4),geometryStatus:'owner-correction-continuous-shared-bath-wall',ownerCorrectionDate:'2026-11-05',notes:NOTES[0]});
  for(const [id,poly]of[['bath_1',[[5150,3240],[6800,3240],[6800,4719.851],[5150,4719.851]]],['bath_2',[[3650,4590],[5050,4590],[5050,4840],[6800,4840],[6800,6040],[4220,6040],[4220,6190],[3650,6190]]]]){const r=p.ROOMS.find(q=>q.id===id);Object.assign(r,{poly,planAreaM2:round(area(poly)/1e6),layoutRevision:REVISION,areaStatus:'owner-corrected-model-inner-face-area-not-site-survey'});}
  function place(id,props,note){const f=get(id);Object.assign(f,props,{layoutRevision:REVISION,notes:note});const r=rect(f);f.sourceFootprintMm={x:r[0],y:r[1],w:round(r[2]-r[0]),d:round(r[3]-r[1])};return f;}
  place('vanity_main',{cx:5450,name:'主卫西南角600浴室柜 · 镜面靠南墙朝北'},NOTES[1]);
  place('family-f11',{cy:3580},NOTES[1]);
  place('family-f12',{cy:4319.851,w:900,d:800,name:'主卫东南角淋浴900×800 · 斜角内开门',showerDesign:showerDesign()},NOTES[1]+' '+NOTES[3]);
  place('family-f14',{cy:5130},'马桶背面贴两卫隔墙南面，朝南；前方模型净距620mm，排污及水箱待现场核对。');
  place('family-f15',{name:'客卫东南角淋浴990×1000 · 斜角内开门',showerDesign:showerDesign()},NOTES[2]+' '+NOTES[3]);
  place('laundry_washer',{cx:4700,cy:4905},NOTES[2]);
  place('family-bathheater-bath_1',{cy:4319.851},'浴霸随主卫淋浴区收回隔墙北侧，机型、吊顶及接线待核。');
  const point=place('family-elec-p34',{cy:4844},'客卫马桶东侧隔墙南面干区预留，随更正后的完整墙面定位。');point.electricalDesign.anchor.wallIndex=21;point.electricalDesign.anchor.wallRectMm=clone(p.WALLS[21]);point.electricalDesign.anchor.surfaceVerifiedAgainstCurrentModel=true;
  const changed=p.defaultFurniture.filter(f=>!same(f,previous.defaultFurniture.find(q=>q.id===f.id))).map(f=>f.id),old=new Map(previous.defaultFurniture.map(f=>[f.id,f]));
  const previousMetadataFields=Object.fromEntries(['conditions','designCorrections','converter'].map(k=>[k,{present:Object.hasOwn(previous.metadata,k),...(Object.hasOwn(previous.metadata,k)?{value:clone(previous.metadata[k])}:{})}]));
  p.metadata.conditions=[...(p.metadata.conditions||[]),...NOTES];p.metadata.designCorrections=[...(p.metadata.designCorrections||[]),{id:REVISION,date:'2026-11-05',description:NOTES[0],source:'owner-message-correction',sourceSnapshotsUnchanged:true}];p.metadata.converter+=' + tools/family-bath-fit-20261105.cjs';
  p.metadata[KEY]={id:REVISION,date:'2026-11-05',title:'方案2 · 两卫连续隔墙与靠墙嵌入布置',previousArchitecture:Object.fromEntries(ARCH.map(k=>[k,(k==='ROOMS'?previous.ROOMS.map((r,i)=>/^bath_/.test(r.id)?i:-1).filter(i=>i>=0):[20,21]).map(index=>({index,value:clone(previous[k][index])}))])),previousFurniture:changed.map(id=>clone(old.get(id))),previousMetadataFields,previousWalls:Object.fromEntries([20,21].map(i=>[i,clone(previous.WALLS[i])])),demolishedWallIndexMap:{20:null,21:null},changedFurnitureIds:changed,newFurnitureIds:[],removedFurnitureIds:[],replacedFurnitureIds:[],migrationFields:Object.fromEntries(changed.map(id=>[id,[...new Set([...Object.keys(old.get(id)),...Object.keys(get(id))])].filter(k=>k!=='id'&&!same(old.get(id)[k],get(id)[k]))])),preserveCustomPlacementIds:changed,notes:NOTES,sourceSnapshotsUnchanged:true};
  p.metadata[KEY].validation=validateFamilyBathFit(p);assert.deepEqual(beforeFamilyBathFit(p),previous,'Bath correction exactly reversible');return value;
}
module.exports={applyFamilyBathFit,beforeFamilyBathFit,validateFamilyBathFit,KEY,REVISION,NOTES,rect,overlap,insideRect};
