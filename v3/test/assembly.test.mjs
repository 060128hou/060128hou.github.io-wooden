import assert from 'node:assert/strict';
import {preset,planAssembly,clone,validateDesign,csv,makePiece,snapPiece,bounds,partCode} from '../lib/workshop.ts';
let checks=0;const ok=(v,msg)=>{assert.ok(v,msg);checks++;};
const pavilion=preset(),plan=planAssembly(pavilion);ok(plan.valid,JSON.stringify(plan.issues));ok(plan.steps.length===12,'12 modules planned');
const reversed=clone(pavilion);reversed.pieces.reverse();ok(JSON.stringify(planAssembly(reversed).steps)===JSON.stringify(plan.steps),'planning independent of editing/array history');
for(const scale of [.6,1,1.4,2]){const d=clone(pavilion);d.pieces.forEach(p=>{p.size=p.size.map(x=>x*scale);p.position=p.position.map(x=>x*scale);});ok(planAssembly(d).valid,'parameter-scaled assembly '+scale);}
const floating=clone(pavilion);floating.pieces[1].position[1]+=8;ok(!planAssembly(floating).valid,'floating part must not get tutorial');
const collision=clone(pavilion);collision.pieces.push({...clone(collision.pieces[1]),id:'duplicate-location'});ok(planAssembly(collision).issues.some(i=>i.message.includes('重叠')),'overlap detected');
const removed=clone(pavilion);removed.pieces.splice(1,1);ok(!planAssembly(removed).valid,'removed support propagates to assembly invalidity');
ok(planAssembly(preset('screen')).valid,'screen demo valid');ok(!planAssembly(preset('empty')).valid,'empty is not a tutorial');
const screen=preset('screen'),decorated=clone(screen);decorated.pieces[1].patterns.push({id:'o1',pattern:'pattern-01',face:'front',size:65,rotation:30,u:0,v:0});ok(planAssembly(validateDesign(decorated)).valid,'ornaments preserve support rules');
const bad=clone(screen);bad.pieces[1].size[0]=Infinity;assert.throws(()=>validateDesign(bad));checks++;
const rotation=clone(screen);rotation.pieces[1].rotation=15;ok(!planAssembly(rotation).valid,'unsupported rotation rejected');
const duplicateID=clone(screen);duplicateID.pieces[1].id=duplicateID.pieces[0].id;assert.throws(()=>validateDesign(duplicateID));checks++;
const p=clone(screen.pieces[1]);p.position[1]+=8;ok(snapPiece(p,screen.pieces).position[1]===screen.pieces[1].position[1],'snap aligns foot with support');
const code=partCode(screen.pieces[1]);screen.pieces.reverse();ok(partCode(screen.pieces[0])===code,'part code stable after reorder');ok(csv(screen).includes(code),'same stable code exported');
console.log(JSON.stringify({checks,status:'passed'}));
