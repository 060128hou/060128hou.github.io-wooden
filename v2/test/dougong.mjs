import assert from 'node:assert/strict';
import {build,defaults,validate,pose,csv,snapshot} from '../model.js';
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.00001,`${label}: ${a} / ${b}`);
let count=0;
for(const s of [60,75,100,140]){
  const p={...defaults('dougong'),s},model=build(p),factor=s/100;
  assert.equal(model.parts.length,27);
  assert.equal(new Set(model.parts.map(part=>part.id)).size,27);
  assert.equal(model.steps.length,15);
  assert.equal(model.joints.length,26);
  near(model.dimensions.w,264*factor,'scaled width');
  near(model.dimensions.h,302*factor,'scaled height');
  near(model.dimensions.d,350*factor,'scaled depth');
  for(const part of model.parts){
    assert.ok(part.box.every(v=>Number.isFinite(v)&&v>0));
    assert.ok(part.installStep>=0&&model.steps[part.installStep].ids.includes(part.id));
    assert.ok(csv(p).includes('"'+part.id+'"'));
    assert.ok(part.drawing.note.includes('实物核对'));
    for(const face of part.meshFaces){
      near(Math.hypot(...face.normal),1,'unit normal');
      const distance=dot(face.vertices[0],face.normal);
      for(const vertex of face.vertices){
        // A non-planar frustum side previously made BSP sorting recurse forever.
        near(dot(vertex,face.normal),distance,'planar mesh face');
        assert.ok(vertex.every(Number.isFinite));
      }
      assert.equal(face.vertices.length,face.borders.length);
    }
  }
  for(let step=0;step<model.steps.length;step++){
    for(const fraction of [0,.25,.5,.75,1]){
      const frame=pose(model,step,fraction);
      for(const part of model.parts){
        const state=frame.parts[part.id];
        assert.equal(state.visible,part.installStep<=step);
        if(part.installStep<step||fraction===1)state.offset.forEach(n=>near(n,0,'installed component remains fixed'));
      }
      count++;
    }
    for(const id of model.steps[step].jointIds) {
      const j=model.joints.find(j=>j.id===id);
      assert.ok(j&&j.partIds.every(id=>model.parts.find(part=>part.id===id).installStep<=step));
    }
  }
  const exported=snapshot(p);
  assert.ok(exported.engineering.includes('比例展示'));
  assert.equal(exported.parameters.s,s);
}
assert.ok(validate({...defaults('dougong'),s:0}).length);
assert.ok(validate({...defaults('dougong'),s:75.5}).length);
console.log(`Dougong: four scales, 27 parts, planar meshes and ${count} sampled tutorial states passed.`);

