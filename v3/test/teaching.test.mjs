import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import catalog from '../lib/teaching.catalog.json' with {type:'json'};
import {validateDesign} from '../lib/workshop.ts';

const plan=(entry=catalog[0])=>({version:3,title:entry.title,material:'walnut',pieces:[],notes:'预览方案，待工坊确认',catalog:'teaching-'+entry.id,catalogState:{scale:1.2,step:entry.stepCount-1}});

test('every published catalog entry has matching geometry, parts, steps, and a rendered cover',()=>{
 assert.equal(catalog.length,19);
 const ids=new Set();
 for(const entry of catalog){
  assert(!ids.has(entry.id));ids.add(entry.id);
  const model=JSON.parse(gunzipSync(fs.readFileSync(new URL('../public'+entry.url,import.meta.url))));
  assert.equal(model.id,entry.id);assert.equal(model.parts.length,entry.partCount);assert.equal(model.steps.length,entry.stepCount);
  assert(fs.statSync(new URL('../public'+entry.thumbnail,import.meta.url)).size>1000);
  const assigned=model.steps.flatMap((s,i)=>s.partIds.map(id=>{assert.equal(model.parts.find(p=>p.id===id)?.installStep,i);return id;}));
  assert.equal(assigned.length,model.parts.length);assert.equal(new Set(assigned).size,model.parts.length);
 }
});

test('all catalog snapshots retain material, preview scale, and a valid last step',()=>{
 for(const entry of catalog){const d=plan(entry);assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(d))),d);}
});

test('invalid scale, model, and out-of-range assembly state are rejected before persistence',()=>{
 for(const scale of [NaN,Infinity,0,.59,1.41,'1'])assert.throws(()=>validateDesign({...plan(),catalogState:{scale,step:0}}));
 for(const step of [-2,.5,NaN,Infinity,catalog[0].stepCount])assert.throws(()=>validateDesign({...plan(),catalogState:{scale:1,step}}));
 assert.throws(()=>validateDesign({...plan(),catalog:'teaching-nonexistent'}));
 assert.throws(()=>validateDesign({...plan(),catalog:'timber-hall'}));
 assert.equal(validateDesign({...plan(),catalogState:{scale:.6,step:-1}}).catalogState.step,-1);
 assert.equal(validateDesign({...plan(),catalogState:{scale:1.4,step:0}}).catalogState.scale,1.4);
});
