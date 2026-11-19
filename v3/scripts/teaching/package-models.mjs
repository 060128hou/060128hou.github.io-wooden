import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import crypto from 'node:crypto';
const project=fileURLToPath(new URL('../../',import.meta.url)),src=path.join(project,'.teaching-build/models'),out=path.join(project,'public/assets/teaching');
const entries=JSON.parse(fs.readFileSync(path.join(project,'lib/teaching.catalog.json'),'utf8')),summary=[],fingerprints=new Set();
fs.mkdirSync(out,{recursive:true});
for(const entry of entries){
 const file=path.join(src,entry.id+'.json');if(!fs.existsSync(file)){if(process.argv.includes('--partial'))continue;throw Error('Missing model '+entry.id);}
 const model=JSON.parse(fs.readFileSync(file,'utf8')),ids=new Set(),steps=new Set();
 if(model.id!==entry.id||model.parts.length<10||model.parts.length>350||model.steps.length<3)throw Error('Incomplete model '+entry.id);
 for(const [index,s]of model.steps.entries()){
  if(!s.id||steps.has(s.id)||!s.title||!s.text)throw Error('Invalid step '+entry.id);steps.add(s.id);
  for(const id of s.partIds){const p=model.parts.find(p=>p.id===id);if(!p||p.installStep!==index)throw Error('Wrong assembly relationship '+entry.id);}
 }
 let triangles=0;
 for(const p of model.parts){
  if(ids.has(p.id)||!p.name||!Array.isArray(p.positions)||p.positions.length%9||p.positions.length<36||[...p.positions,...p.position,...p.size,...p.travel].some(n=>typeof n!=='number'||!Number.isFinite(n))||p.size.some(n=>n<=0))throw Error('Invalid part '+entry.id+' '+p.id);
  if(model.steps[p.installStep]?.partIds.filter(id=>id===p.id).length!==1)throw Error('Part must have exactly one install step '+entry.id+' '+p.id);
  ids.add(p.id);triangles+=p.positions.length/9;
 }
 const fingerprint=crypto.createHash('sha256').update(JSON.stringify(model.parts.map(p=>[p.position,p.positions]))).digest('hex');if(fingerprints.has(fingerprint))throw Error('Duplicate model geometry '+entry.id);fingerprints.add(fingerprint);
 if(/[A-Z]:[\\/]|\/assets\/manuals\//i.test(JSON.stringify(model)))throw Error('Private/source path in model '+entry.id);
 const data=Buffer.from(JSON.stringify(model)),compressed=gzipSync(data,{level:9});fs.writeFileSync(path.join(out,entry.id+'.json.gz'),compressed);
 Object.assign(entry,{title:model.title,subtitle:model.subtitle,category:model.category,order:model.order,description:model.description,partCount:model.parts.length,stepCount:model.steps.length,tags:[...new Set(model.parts.map(p=>p.name))]});
 summary.push({id:model.id,parts:model.parts.length,steps:model.steps.length,triangles,bytes:compressed.length});
}
fs.writeFileSync(path.join(project,'lib/teaching.catalog.json'),JSON.stringify(entries,null,2)+'\n');
fs.writeFileSync(path.join(project,'.teaching-build/validation.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({models:summary.length,parts:summary.reduce((n,m)=>n+m.parts,0),steps:summary.reduce((n,m)=>n+m.steps,0),bytes:summary.reduce((n,m)=>n+m.bytes,0),modelsDetail:summary}));
