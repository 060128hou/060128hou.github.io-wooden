import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {build,defaults,pose,csv,snapshot,validate} from '../model.js';
import data from '../chinese-data.js';
import {sampleTasks} from '../reports.js';
const buffer=await fs.readFile(new URL('../assets/chinese-dougong.bin',import.meta.url));
assert.equal(buffer.length,data.byteLength);
assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),data.sha256);
const floats=new Float32Array(buffer.buffer,buffer.byteOffset,buffer.length/4);
let states=0;
for(const scale of [60,75,100,140]){
 const p={...defaults('chinese'),s:scale},m=build(p);
 assert.equal(m.parts.length,52);assert.equal(m.steps.length,12);assert.equal(m.unitLabel,'模型单位');
 assert.equal(new Set(m.parts.map(v=>v.sourceIndex)).size,52);
 assert.equal(m.steps.flatMap(s=>s.movingIds).length,52);
 for(const part of m.parts){
  const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];
  for(let i=part.range.start;i<part.range.start+part.range.count;i++)for(let k=0;k<3;k++){
   const n=floats[i*6+k]*scale/100;assert.ok(Number.isFinite(n));mins[k]=Math.min(mins[k],n);maxs[k]=Math.max(maxs[k],n);
  }
  for(let k=0;k<3;k++){assert.ok(Math.abs(mins[k]-(part.pos[k]-part.box[k]/2))<.00001);assert.ok(Math.abs(maxs[k]-(part.pos[k]+part.box[k]/2))<.00001);}
 }
 for(let step=0;step<m.steps.length;step++)for(const t of [0,.25,.5,.75,1]){
  const frame=pose(m,step,t);states++;
  for(const part of m.parts){
   assert.equal(frame.parts[part.id].visible,part.installStep<=step);
   if(part.installStep<step||t===1)assert.ok(frame.parts[part.id].offset.every(v=>v===0));
  }
 }
 assert.ok(Object.values(pose(m,11,1).parts).every(v=>v.visible&&v.offset.every(n=>n===0)));
 assert.ok(csv(p).includes('X(模型单位)'));assert.ok(!csv(p).includes('长(mm)'));
 const plan=snapshot(p);assert.equal(plan.provenance.triangles,14868);assert.ok(JSON.stringify(plan).length<150000);
 assert.ok(sampleTasks(m,p).every(t=>!t.includes('27 个')));
}
assert.ok(validate({...defaults('chinese'),s:141}).length);
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!/caseNote|referenceDialog|openReference|依据用户提供/.test(html));
assert.ok(!(await fs.readdir(new URL('../assets/',import.meta.url))).includes('dougong-reference.jpg'));
console.log(`Chinese OBJ: exact mesh checksum, 52 parts, 12 steps, ${states} motion states, scales and exports verified.`);
