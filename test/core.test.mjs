import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {defaults,build,validate,snapshot,csv} from '../public/model.js';
import {createServer} from '../server.mjs';
test('尺寸边界、左右镜像、入槽长度与材积一致',()=>{
 for(const w of [360,600,800])for(const h of [320,480,600])for(const t of [18,19,24]){
 const p={...defaults,w,h,t},m=build(p);assert.equal(m.parts.length,4);assert.equal(m.parts[0].pos[0],-m.parts[1].pos[0]);assert.ok(Math.abs(m.parts[2].size[0]-(w-2*t+2*m.g))<.011);assert.ok(m.clearHeight>0);assert.ok(m.volume>0);assert.equal(snapshot(p).parameters.w,w);
 }assert.ok(validate({...defaults,w:NaN}).length);assert.ok(validate({...defaults,w:900}).length);assert.ok(validate({...defaults,t:18.5}).length);assert.ok(csv(defaults).startsWith('\uFEFF'));assert.equal(csv(defaults).split('\r\n').length,6);
});
test('申请验证、固定待人工确认、不可变快照、重启读取、静态路由隔离',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wood-test-'));let server;
 const start=async()=>{server=createServer(dir);await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};
 try{let url=await start();let res=await fetch(url);assert.equal(res.status,200);assert.ok((await res.text()).includes('千年木艺'));assert.equal((await fetch(url+'/data/applications')).status,404);
 const post=body=>fetch(url+'/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post({parameters:{...defaults,w:900},note:''})).status,400);
 res=await post({parameters:defaults,note:'请人工确认',status:'已支付'});assert.equal(res.status,201);const r=await res.json();assert.equal(r.status,'待人工确认');assert.equal(r.plan.parts.length,4);assert.equal(r.plan.parameters.w,600);
 assert.equal((await fetch(url+'/api/applications',{method:'POST',headers:{Origin:'http://example.com'},body:'{}'})).status,403);
 await new Promise(r=>server.close(r));url=await start();const list=await(await fetch(url+'/api/applications')).json();assert.equal(list.length,1);assert.equal(list[0].id,r.id);assert.equal(list[0].plan.parameters.w,600);
 }finally{if(server)await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
