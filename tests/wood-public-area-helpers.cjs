'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Frozen from 74243b6, BEFORE the October 9 layout. Never regenerate these
// from revised data. Normalization isolates only the authorized new layer.
const baseline={wood:'03bf93e9436c705700a39f3d34d3db8ff09186651378e0d36e12ec4067b90f9a',family:'5421b99746df2c307c52d543579a0a5789f3f38edaea51c589adfeaaf56b139a',laundry:'d2a3c1cec12edc27af4e4d2e2dd153455fed2e20e6a040b042cc641f86541aae'};
function previousPlan(plan){
  const p=structuredClone(plan),r=p.metadata.layoutUpdate;
  if(!r)return p;
  assert.equal(p.id,'wood');assert.equal(r.id,'wood-public-area-20261009');
  p.defaultFurniture=p.defaultFurniture.filter(f=>!r.newFurnitureIds.includes(f.id)).map(f=>structuredClone(r.previousFurniture.find(q=>q.id===f.id)||f));
  p.BIFOLDS=structuredClone(r.previousBifolds);
  p.metadata.sideboardReference=structuredClone(r.previousSideboardMetadata);
  delete p.metadata.layoutUpdate;
  assert.equal(hash(p),baseline.wood,'Wood change beyond the authorized public-area layer, or altered historical snapshot');
  return p;
}
module.exports={previousPlan,hash,baseline};
