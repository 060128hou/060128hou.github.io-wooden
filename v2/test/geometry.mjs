import assert from 'node:assert/strict';
import {defaults, build, validate, pose, csv, snapshot} from '../model.js';

const epsilon = 1e-7;
const near = (a, b, message) => assert.ok(Math.abs(a - b) < epsilon, `${message}: ${a} != ${b}`);

function bodyBounds(solid, offset) {
  return solid.pos.map((v, i) => [v + offset[i] - solid.size[i] / 2, v + offset[i] + solid.size[i] / 2]);
}

function overlaps(a, b) {
  return a.every(([lo, hi], i) => Math.min(hi, b[i][1]) - Math.max(lo, b[i][0]) > epsilon);
}

let validCount = 0, invalidCount = 0, sampledPoses = 0;
function audit(p) {
  const errors = validate(p);
  if (errors.length) {
    assert.throws(() => build(p));
    invalidCount++;
    return;
  }
  validCount++;
  const model = build(p);
  assert.ok(model.checks.every(c => c.ok));
  for(const joint of model.joints) assert.ok(joint.partIds.every(id => model.parts.some(v => id === v.id)));
  const exported = snapshot(p);
  const cutList = csv(p);
  for(const part of model.parts) {
    assert.ok(part.solids.every(s => s.size.every(v => v > 0)));
    assert.ok(part.jointIds.every(id => model.joints.some(j => j.id === id)));
    assert.ok(cutList.includes('"' + part.id + '"'));
    assert.ok(exported.parts.some(x => x.id === part.id));
    const {width, height, features} = part.drawing;
    assert.deepEqual(features.map(f => f.jointId).sort(), [...part.jointIds].sort());
    for (const feature of features) {
      assert.ok(feature.width > 0 && feature.height > 0);
      assert.ok(feature.x >= 0 && feature.x + feature.width <= width + epsilon);
      assert.ok(feature.y >= 0 && feature.y + feature.height <= height + epsilon);
    }
  }
  for(let i = 0; i < model.steps.length; i++) {
    const step = model.steps[i];
    for(const name of step.ids) assert.ok(model.parts.find(x => x.id === name));
    if (i) {
      const previous = pose(model, i - 1, 1), next = pose(model, i, 0);
      near(previous.roll, next.roll, 'continuous roll');
      near(previous.lift, next.lift, 'continuous lift');
      for (const part of model.parts) {
        previous.parts[part.id].offset.forEach((v, axis) => near(v, next.parts[part.id].offset[axis], 'continuous translation'));
      }
    }
    for(let f = 0; f <= 20; f++) {
      const frame = pose(model, i, f / 20), solids = model.parts.map(part => part.solids.map(s => bodyBounds(s, frame.parts[part.id].offset)));
      sampledPoses++;
      for(const [j, boxes] of solids.entries()) {
        for(const a of boxes) {
          // Model.roll is rigid; pairwise interferences can be checked before rotation.
          const lowestY = a[0][0] * Math.sin(frame.roll) + a[1][0] * Math.cos(frame.roll) + frame.lift;
          assert.ok(lowestY >= -epsilon, `part under table ${model.parts[j].id}: ${lowestY}`);
          for(const peer of solids.slice(j + 1)) for(const b of peer) {
            assert.ok(!overlaps(a,b), `${p.caseId} collision at step ${i}, ${f / 20}`);
          }
        }
      }
    }
    // Every active pair is fully seated by the end of its insertion step.
    if (['insert-upper','insert-lower','close','interlock'].includes(step.id)) {
      const end = pose(model,i,1);
      for (const jointId of step.jointIds) {
        for (const partId of model.joints.find(j=>j.id===jointId).partIds) {
          end.parts[partId].offset.forEach(v=>near(v,0,'seated joint'));
        }
      }
    }
  }
  const last = pose(model,model.steps.length - 1,1);
  for(const part of model.parts)last.parts[part.id].offset.forEach(v=>near(v,0,'complete'));
  if (p.caseId === 'shelf') {
    // The shelf ends touch the web, not the inner face of the uncut side stock.
    for (const [index, y] of model.ys.entries()) {
      const board = model.parts.find(x => x.id === `B${index + 1}`);
      near(board.box[0] / 2, p.w / 2 - p.t + model.g, 'right slot floor');
      near(y, index ? p.h - p.m - p.t / 2 : p.m + p.t / 2, 'shelf to slot elevation');
      near(board.size[1], p.d, 'flush depth');
      const groove = model.parts[0].drawing.features[index];
      near(groove.y + groove.height / 2, y, 'elevation in the side drawing');
      near(board.drawing.features[1].x, board.size[0] - model.g, 'right seating band in the top view');
    }
    assert.equal(model.steps.find(s=>s.id==='close').jointIds.length,2);
  } else {
    near(model.parts[0].solids[0].size[1] / 2 + model.parts[0].solids[0].pos[1], p.h / 2, 'lower notch base');
    near(model.parts[1].solids[0].pos[1] - model.parts[1].solids[0].size[1] / 2, p.h / 2, 'upper notch base');
    near(model.parts[0].drawing.features[0].y, p.h / 2, 'up-opening slot on the first drawing');
    near(model.parts[1].drawing.features[0].y, 0, 'down-opening slot on the second drawing');
  }
}
for(const w of [360,600,800])for(const h of [320,480,600])for(const d of [180,320])for(const t of [18,19,24])for(const m of [24,60,180])audit({...defaults('shelf'),w,h,d,t,m});
for(const w of [180,500])for(const h of [70,121,220])for(const d of [140,420])for(const t of [8,15,22])audit({...defaults('divider'),w,h,d,t});
assert.ok(validate({...defaults('shelf'),h:320,m:140,t:20}).some(s=>s.includes('净高')));
assert.ok(validate({...defaults('divider'),h:70,t:22}).some(s=>s.includes('保留材料')));
assert.equal(validCount,176);
assert.equal(invalidCount,22);
assert.equal(sampledPoses,20832);
console.log({validCount,invalidCount,sampledPoses});
