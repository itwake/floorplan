'use strict';

// Owner-confirmed R4 uses the editor's millimetre coordinates. It is a new,
// isolated scheme: none of the three existing source snapshots are rewritten.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const snapshotPath=path.resolve(__dirname,'../data/source/screen-confirmed-20261010.json');
const clone=v=>structuredClone(v);

function detailScreen(f){
  const slats=f.parts.filter(p=>p.role==='screen-vertical-slat').map(p=>({...p,elevationMm:40,heightMm:1920,material:'Oak'}));
  f.parts=[
    {id:'screen-bottom-beam',role:'screen-beam',x:-750,y:-40,w:1500,d:80,elevationMm:0,heightMm:40,color:'#C8B08C',material:'Oak'},
    {id:'screen-top-beam',role:'screen-beam',x:-750,y:-40,w:1500,d:80,elevationMm:1960,heightMm:40,color:'#C8B08C',material:'Oak'},
    ...slats
  ];
  f.baseHeightMm=2000;
  f.notes='R4确认占地1500×80mm、高2000mm。真实18mm木格栅、上下40mm细梁；不把平面投影建成实心墙。板件、安装与现场层高待核。';
}

function detailKitchen(f,original){
  const t=18,panels=[],baselines=f.parts.filter(p=>p.role==='base-cabinet');
  const worktops=f.parts.filter(p=>p.role!=='base-cabinet').map(clone);
  const holes=[[7740,12160,450,780],[6120,13350,750,450]];
  let serial=0;
  const add=(role,x,y,w,d,z,h,face,color='#F3EFE6',material='Cream')=>{
    if(w<=0||d<=0||h<=0)return;
    panels.push({id:'screen-k-'+serial++,role,x:x-f.cx,y:y-f.cy,w,d,elevationMm:z,heightMm:h,face,color,material});
  };
  const intersects=(r,q)=>Math.min(r[0]+r[2],q[0]+q[2])>Math.max(r[0],q[0])&&Math.min(r[1]+r[3],q[1]+q[3])>Math.max(r[1],q[1]);
  baselines.forEach((p,index)=>{
    const x=f.cx+p.x,y=f.cy+p.y,w=p.w,d=p.d,face=index===0?'south':index===1?'west':'north';
    add('base-bottom-panel',x,y,w,d,100,t,face);
    if(face==='west'){
      add('base-back-panel',x+w-t,y,t,d,100,750,face);
      add('base-end-panel',x,y,w,t,100,750,face);
      add('base-end-panel',x,y+d-t,w,t,100,750,face);
      add('base-toe-panel',x+30,y,t,d,0,100,face,'#D7C6AE','Oak');
      const n=Math.max(2,Math.round(d/550)),step=d/n;
      for(let i=0;i<n;i++){
        add('base-front-door',x,y+i*step+2,t,step-4,110,732,face,'#D7C6AE','Oak');
        if(i){
          const q=[x,y+i*step-t/2,w,t],h=holes.some(hole=>intersects(q,hole))?540:750;
          add('base-divider-panel',...q,100,h,face);
        }
      }
    }else{
      const front=face==='north'?y:y+d-t,back=face==='north'?y+d-t:y;
      add('base-back-panel',x,back,w,t,100,750,face);
      add('base-end-panel',x,y,t,d,100,750,face);
      add('base-end-panel',x+w-t,y,t,d,100,750,face);
      add('base-toe-panel',x,face==='north'?front+30:front-30,w,t,0,100,face,'#D7C6AE','Oak');
      const n=Math.max(1,Math.round(w/550)),step=w/n;
      for(let i=0;i<n;i++){
        add('base-front-door',x+i*step+2,front,step-4,t,110,732,face,'#D7C6AE','Oak');
        if(i)add('base-divider-panel',x+i*step-t/2,y,t,d,100,750,face);
      }
    }
  });
  // Retain the already designed safe upper runs: east 7970..8290 x
  // 12070..13570, south 7390..7970 x 13570..13890. No cabinet across
  // the north kitchen window, fridge, hood or wall-mounted water heater.
  const uppers=original.parts.filter(p=>p.elevationMm>=1400&&/upper|led-strip/.test(p.role||'')).map(p=>({...clone(p),x:p.x+original.cx-f.cx,y:p.y+original.cy-f.cy}));
  f.parts=[...panels,...worktops,...uppers];
  f.heightMm=f.baseHeightMm=2350;
  f.name='方案4厨房 · 薄板地柜、台面与吊柜';
  f.roomId='kitchen';
  f.notes='与确认R4相同的地面外包；18mm空心板壳与柜门，水槽向下嵌入台面，盆下不填实芯。吊柜复用原安全分区，底1500/顶2350mm，窗与热水器留空；仅示意，非加工或安装批准。';
}

function recalculateBounds(p){
  const rects=[...p.WALLS,...p.WINS,...p.BAYS.flatMap(b=>b.sideRects),...p.DOORS.map(d=>d.rect),...p.SLIDES.map(d=>d.rect)];
  const points=[...p.ROOMS.flatMap(r=>r.poly),...rects.flatMap(r=>[[r[0],r[1]],[r[2],r[3]]])];
  p.DOORS.filter(d=>d.entry&&d.defaultOpen).forEach(d=>points.push([d.h[0]+d.o[0]*d.len,d.h[1]+d.o[1]*d.len]));
  const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1])),maxX=Math.max(...points.map(p=>p[0])),maxY=Math.max(...points.map(p=>p[1]));
  p.PLAN_BOUNDS={x,y,w:maxX-x,h:maxY-y};p.BOUNDS={x:x-1000,y:y-1000,w:maxX-x+2000,h:maxY-y+2000};p.CENTER={x:(x+maxX)/2,y:(y+maxY)/2};
}

function applyScreenPlan(bundle){
  const prior=JSON.stringify(bundle.schemes),raw=fs.readFileSync(snapshotPath,'utf8'),p=JSON.parse(raw);
  p.id='screen';p.name='木光 · 屏风客餐厅';
  delete p.metadata.layoutUpdate;
  p.metadata.source={repository:'owner-confirmed-design',path:'data/source/screen-confirmed-20261010.json',sha256:crypto.createHash('sha256').update(raw).digest('hex'),importDate:'2026-10-10',basedOn:'family'};
  p.metadata.converter='tools/convert-house-plans.cjs + tools/screen-plan.cjs';
  p.metadata.draft.status='3d-preview';
  p.metadata.draft.warnings=p.metadata.draft.warnings.map(note=>note==='厨房柜体仅平面占位，五金和水电需后续深化'?'厨房已生成薄板柜体3D，五金、净深和水电仍需现场深化':note);
  p.metadata.threeDRevision={id:'screen-r4-3d-20261010',confirmedPlan:'R4',unit:'mm',provisional:true,description:'确认平面应用3D；仅深化厨房薄板/吊柜和屏风格栅，不改变家具位置、尺寸或墙洞。',pending:['墙体拆改与门套净口待核','厨房冰箱高1900mm，其北窗左缘约150mm在当前示意中可能被遮挡；设备原位保留','家政浅盆、洗烘承载及排水仍待深化','入户外开门公区与邻门避让待核']};
  const get=id=>{const f=p.defaultFurniture.find(f=>f.id===id);assert.ok(f,id);return f;};
  detailScreen(get('scheme4-entry-screen'));
  detailKitchen(get('fit-kitchen-20261005'),bundle.schemes.family.defaultFurniture.find(f=>f.id==='fit-kitchen-20261005'));
  get('kitchen_double_sink').modelVariant='recessed-double-bowl';
  get('kitchen_hob').modelVariant='hob-only';
  get('family-f6').face='west';get('scheme4-living-armchair').face='east';get('family-f23').face='south';
  p.SLIDES.find(d=>d.id==='balcony_door').frameDetail=true;
  // Original footprint fields are provenance, not the current placement.
  // Keep the provenance explicitly while refreshing the editable envelope.
  for(const f of p.defaultFurniture){
    if(f.sourceFootprintMm)f.originalSourceFootprintMm=clone(f.sourceFootprintMm);
    const a=f.rot*Math.PI/180,w=Math.abs(f.w*Math.cos(a))+Math.abs(f.d*Math.sin(a)),d=Math.abs(f.w*Math.sin(a))+Math.abs(f.d*Math.cos(a));
    f.sourceFootprintMm={x:f.cx-w/2,y:f.cy-d/2,w,d};
  }
  recalculateBounds(p);
  assert.equal(JSON.stringify(bundle.schemes),prior,'Existing schemes must not change');
  assert.equal(p.WALLS.length,p.WALL_META.length);assert.equal(p.WINS.length,p.WIN_META.length);
  bundle.schemes.screen=p;
  return p;
}
module.exports={applyScreenPlan};
