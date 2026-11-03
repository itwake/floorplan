'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=process.argv[2];
if(!output)throw Error('Usage: node tools/export-purchase-budget.cjs <absolute-output.html>');
if(!path.isAbsolute(output))throw Error('Output path must be absolute');
let html=fs.readFileSync(path.join(root,'budget.html'),'utf8');
const css=['purchase-budget.css','purchase-budget-details.css'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
html=html.replace(/  <link rel="stylesheet" href="purchase-budget\.css[^\"]*">/,()=> '  <style>\n'+css+'\n  </style>');
html=html.replace(/  <link rel="stylesheet" href="purchase-budget-details\.css[^\"]*">\r?\n/,'');
html=html.replace(/  <script defer src="[^\"]+"><\/script>\r?\n/g,'');
html=html.replaceAll('href="./index.html"','href="https://itwake.github.io/floorplan/"');
html=html.replace('返回户型编辑 ↗','在线户型编辑 ↗');
const sources=['data/house-plans.js','purchase-plan.js','data/purchase-catalog.js','purchase-budget-core.js','purchase-budget.js'];
const scripts=sources.map(file=>{
  let code=fs.readFileSync(path.join(root,file),'utf8');
  if(file==='data/purchase-catalog.js')for(const name of fs.readdirSync(path.join(root,'data/purchase-images'))){const relative='data/purchase-images/'+name;code=code.replaceAll(JSON.stringify(relative),JSON.stringify('data:image/png;base64,'+fs.readFileSync(path.join(root,relative)).toString('base64')));}
  if(file==='purchase-budget.js')code=code.replace("const back='./index.html?'","const back='https://itwake.github.io/floorplan/?'");
  return '<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>';
}).join('\n');
html=html.replace('</body>',()=>scripts+'\n</body>');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html,'utf8');
console.log(JSON.stringify({output,bytes:Buffer.byteLength(html),standalone:true}));
