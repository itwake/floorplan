'use strict';
// Compare public static resources against the committed bytes, not Windows CRLF.
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const base = process.env.FLOORPLAN_BASE_URL || 'https://itwake.github.io/floorplan/';
const files = ['index.html','data/house-plans.js','data/manifest.json',
  'vendor/three/build/three.module.js',
  'vendor/three/examples/jsm/controls/OrbitControls.js',
  'vendor/three/examples/jsm/controls/PointerLockControls.js',
  'vendor/three/examples/jsm/environments/RoomEnvironment.js',
  'vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js',
  'vendor/three/examples/jsm/renderers/CSS2DRenderer.js'];
const digest = b => createHash('sha256').update(b).digest('hex');
(async()=>{
  const results=[];
  for(const file of files){
    const committed=execFileSync('git',['show','HEAD:'+file],{cwd:root,maxBuffer:5000000});
    const response=await fetch(new URL(file,base),{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)throw Error(file+': HTTP '+response.status);
    const body=Buffer.from(await response.arrayBuffer());
    if(digest(body)!==digest(committed))throw Error(file+': published version not current');
    results.push({file,bytes:body.length,status:'matched'});
  }
  console.log(JSON.stringify({status:'PASS',url:base,assets:results},null,2));
})().catch(err=>{console.error(err.message);process.exitCode=1;});
