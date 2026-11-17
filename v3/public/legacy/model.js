import {dougongCase} from './dougong.js';
import {chineseCase} from './chinese.js';

// Geometry is expressed in mm: X across, Y up, Z towards the front.
// All coordinates, slots, joint markers and motion endpoints originate here.
export const FIELD_NAMES = {
  w: '总宽度', h: '总高度', d: '总深度', t: '板材厚度', m: '上下留边',s:'整体显示比例'
};

export const CASES = {
  chinese:chineseCase,
  dougong:dougongCase,
  shelf: {
    id: 'shelf', name: '案上双层置物架', subtitle: '四件木构件的嵌槽装配',
    connection: '双侧嵌槽',
    limits: {w: [360, 800], h: [320, 600], d: [180, 320], t: [18, 24], m: [24, 180]},
    presets: [
      {id: 'standard', name: '标准款', w: 600, h: 480, d: 240, t: 18, m: 60},
      {id: 'compact', name: '紧凑款', w: 420, h: 360, d: 200, t: 18, m: 45}
    ],
    requirement: '希望在书桌上放一个双层置物架，收纳文具与小物。',
    review: '由工艺人员确定锁固方法，评估侧向摇摆、倾覆与层板承载，再确定可用范围。',
    checkRelations: shelfChecks,
    geometry: shelfGeometry,
    keyframe: shelfFrame,
    tableLift: (p, roll) => p.w / 2 * Math.sin(roll)
  },
  divider: {
    id: 'divider', name: '十字分格架', subtitle: '两块开槽板垂直对插',
    connection: '十字半槽对插',
    limits: {w: [180, 500], h: [70, 220], d: [140, 420], t: [8, 22]},
    presets: [
      {id: 'desktop', name: '桌面款', w: 300, h: 120, d: 240, t: 12},
      {id: 'drawer', name: '矮身款', w: 220, h: 80, d: 180, t: 10}
    ],
    requirement: '想用两块可拆装的木板给桌面托盘分格。',
    review: '核对交叉槽完全就位、底边齐平，检查晃动和槽口劈裂。',
    checkRelations: dividerChecks,
    geometry: dividerGeometry,
    keyframe: dividerFrame,
    tableLift: () => 0
  }
};

export const MATERIALS = ['白蜡木', '黑胡桃木'];
export const ENGINEERING_NOTE = '名义尺寸用于设计与教学。槽口配合、含水率、加工余量、耐久和稳定性需由加工方审定并试制实测。';

export function defaults(caseId = 'shelf') {
  const def = CASES[caseId];
  if (!def || !Object.hasOwn(CASES, caseId)) throw new Error('请选择已有案例');
  const {id, name, ...dims} = def.presets[0];
  return {caseId, ...dims, material: MATERIALS[0], requirement: def.requirement};
}

const rounded = number => Math.round(number * 100) / 100;
const check = (label, detail, ok) => ({label, detail, ok});

function shelfChecks({w,h,t,m}) {
    const g = rounded(t / 3);
    const clear = h - 2 * m - 2 * t;
    const maxMargin = Math.floor((h - 2 * t - 60) / 2);
    return [
      check('层间净高', `净高 ${clear} mm，本教学案例预留至少 60 mm。留边应 ≤ ${maxMargin} mm，亦可增高或减薄板材。`, clear >= 60),
      check('槽底剩余厚度', `槽深 ${g} mm，槽底余厚 ${rounded(t - g)} mm。槽深须小于板厚，比例待试配。`, g > 0 && g < t),
      check('层板两端入槽', `净宽 ${w - 2 * t} mm，层板长 ${rounded(w - 2 * t + 2 * g)} mm，左右各入槽 ${g} mm。`, w > 2 * t),
      check('双槽与板边分离', `上下槽外缘各距端面 ${m} mm，留边应至少为一倍板厚。`, m >= t)
    ];
}

function dividerChecks({w,h,d,t}) {
  const arm = (Math.min(w, d) - t) / 2;
  const remaining = h / 2;
  return [
    check('半槽闭合', `两道槽各深 ${remaining} mm。对插到位后，两块板的上缘和下缘分别齐平。`, h > 0 && 2 * remaining === h),
    check('槽肩宽度', `较短板每侧净肩 ${arm} mm，应至少为两倍板厚。请增加板长或减小厚度。`, arm >= 2 * t),
    check('槽底保留材料', `两板槽底各保留 ${remaining} mm，本案例要求 ≥ ${2 * t} mm。请增高或减薄板材。`, remaining >= 2 * t)
  ];
}

export function validate(p) {
  if (!p || !Object.hasOwn(CASES, p.caseId)) return ['请选择有效案例'];
  const errors = [];
  for (const [key, [min, max]] of Object.entries(CASES[p.caseId].limits)) {
    if (!Number.isInteger(p[key]) || p[key] < min || p[key] > max) {
      errors.push(`${FIELD_NAMES[key]}应为 ${min}–${max} ${CASES[p.caseId].fieldUnit||'mm'} 的整数`);
    }
  }
  if (!errors.length) {
    for (const item of CASES[p.caseId].checkRelations(p)) {
      if (!item.ok) errors.push(`${item.label}：${item.detail}`);
    }
  }
  if (!MATERIALS.includes(p.material)) errors.push('请选择有效木材');
  if (typeof p.requirement !== 'string' || p.requirement.length > 1000) errors.push('需求文字最多 1000 字');
  return errors;
}

const solid = (pos, size) => ({pos, size});
const joint = (id, name, receiverId, moverId, point, direction) => ({
  id, name, receiverId, moverId, partIds: [receiverId, moverId], point, direction
});

function step(id, title, ids, movingIds, jointIds, text, checkText, duration = 2600) {
  return {id, title, ids, movingIds, jointIds, text, check: checkText, duration};
}

function shelfGeometry(p) {
  const {w, h, d, t, m} = p;
  const g = rounded(t / 3);
  const length = rounded(w - 2 * t + 2 * g);
  const ys = [m + t / 2, h - m - t / 2];
  const parts = [];
  for (const [index, side] of [-1, 1].entries()) {
    const pos = [side * (w - t) / 2, h / 2, 0];
    // A continuous outside web and three inside strips leave the two open grooves.
    const solids = [solid([side * (w / 2 - (t - g) / 2), h / 2, 0], [t - g, h, d])];
    for (const [lo, hi] of [[0, m], [m + t, h - m - t], [h - m, h]]) {
      solids.push(solid([side * (w / 2 - t + g / 2), (lo + hi) / 2, 0], [g, hi - lo, d]));
    }
    parts.push({
      id: `A${index + 1}`, name: index ? '右侧板' : '左侧板', size: [h, d, t],
      pos, box: [t, h, d], solids, offset: [side * 0.23 * w, 0, 0],
      labelPoint: [pos[0], h - m / 2, d * 0.23],
      drawing: {
        face:'内侧槽面',width:d,height:h,
        features:ys.map((center,i)=>({
          jointId:(index?'R':'L')+(i+1),kind:'groove',x:0,y:center-t/2,width:d,height:t,
          description:`距下端 ${center-t/2} mm，槽宽 ${t} mm，深 ${g} mm，沿板深贯通。`
        }))
      },
      marks: [
        {label:'上缘',point:[pos[0],h,d/2],direction:[0,1,0]},
        {label:'槽面',point:[side*(w/2-t),h/2,d/2],direction:[-side,0,0]}
      ],
      orientation: `槽口朝${index ? '左' : '右'}，指向架内；将本标签贴在靠近上缘处。`,
      note: `镜像双槽，槽宽 ${t} mm、深 ${g} mm，外槽缘分别距上下端 ${m} mm。`
    });
  }
  for (const [index, y] of ys.entries()) {
    const pos = [0, y, 0], box = [length, t, d];
    parts.push({
      id: `B${index + 1}`, name: index ? '上层板' : '下层板', size: [length, d, t],
      pos, box, solids: [solid(pos, box)], offset: [0, index ? 0.24 * h : -0.12 * h, 0.3 * d],
      marks: [{label:'入槽端',point:[-length/2,y,d/2],direction:[-1,0,0]}],
      drawing: {
        face:'层板俯视',width:length,height:d,
        features:[['L',0],['R',length-g]].map(([side,x])=>({
          jointId:side+(index+1),kind:'engagement',x,y:0,width:g,height:d,
          description:`${side==='L'?'左':'右'}端名义入槽 ${g} mm，层板在该处保留完整截面。`
        }))
      },
      orientation: `长边沿总宽方向，标签对应${index ? '上' : '下'}槽。`,
      note: `端面各入槽 ${g} mm，名义长度含两个入槽段。`
    });
  }
  const joints = [];
  for (const [index, y] of ys.entries()) {
    const board = `B${index + 1}`;
    joints.push(joint(`L${index + 1}`, `左${index ? '上' : '下'}槽`, 'A1', board, [-length / 2, y, d / 2], [-1, 0, 0]));
    joints.push(joint(`R${index + 1}`, `右${index ? '上' : '下'}槽`, board, 'A2', [length / 2, y, d / 2], [-1, 0, 0]));
  }
  const ids = parts.map(x => x.id), allJoints = joints.map(x => x.id);
  const steps = [
    step('orient', '核对编号与方向', ids, ids, [], '核对 A1、A2 两块镜像侧板，以及 B1、B2 两块层板。转到侧放工位，内槽朝向架体中心。图中悬置件为待装位置。', '确认 A1 两条槽朝上，A2 槽口与其相对。'),
    step('base', '放稳左侧板', ['A1'], ['A1'], [], '将 A1 外侧平面放到有软垫的工作台上，让两道槽口向上。后续层板用夹具或辅助人员临时扶稳。', 'A1 平放，标签指示的下槽与上槽已辨清。'),
    step('insert-lower', '装入下层板', ['A1', 'B1'], ['B1'], ['L1'], `将 B1 的端面对准 A1 的下槽。保持板面垂直于侧板，沿槽口法向轻放，名义嵌入深度为 ${g} mm。`, `B1 与槽底贴合，前后边齐平；出现阻力时退回检查。`),
    step('insert-upper', '装入上层板', ['A1', 'B2'], ['B2'], ['L2'], `按同一方向把 B2 放入上槽。两层板之间应留 ${h - 2 * m - 2 * t} mm 净空，保持临时支撑。`, 'B1、B2 互相平行，层板前后边缘对齐。'),
    step('close', '同时合拢两处槽口', ['A2', 'B1', 'B2'], ['A2'], ['R1', 'R2'], '让 A2 内槽朝下，同时对准 B1、B2 的外露端面。平行下放直到两层板端部同时到位。', '两道槽口同步闭合；单侧卡滞时先退出，再核对两层板姿态。'),
    step('inspect', '复核框架', ids, ids, allJoints, '动画将模型转回正视工位，以便观察四个接口。实物应在连接与固定方案确认后由两人托住框架翻正。', '核对四处接口、对角线、前后齐平和抗摇摆措施；记录待加工方试验的项目。')
  ];
  return {parts, joints, steps, g, ys, innerWidth: w - 2 * t, clearHeight: h - 2 * m - 2 * t};
}

function dividerGeometry(p) {
  const {w, h, d, t} = p;
  const parts = [];
  for (const alongX of [true, false]) {
    const length = alongX ? w : d;
    const arm = (length - t) / 2;
    const solids = [solid([0, alongX ? h / 4 : 3 * h / 4, 0], alongX ? [length, h / 2, t] : [t, h / 2, length])];
    for (const sign of [-1, 1]) {
      const center = sign * (arm + t) / 2;
      solids.push(solid(alongX ? [center, 3 * h / 4, 0] : [0, h / 4, center], alongX ? [arm, h / 2, t] : [t, h / 2, arm]));
    }
    parts.push({
      id: alongX ? 'C1' : 'C2', name: alongX ? '横向分格板' : '纵向分格板',
      size: [length, h, t], pos: [0, h / 2, 0], box: alongX ? [w, h, t] : [t, h, d], solids,
      labelPoint: alongX ? [-w*.27,h*.55,t/2] : [t/2,h*.55,d*.29],
      marks: [{label:alongX?'槽口向上':'槽口向下',point:alongX?[0,h,t/2]:[t/2,0,0],direction:alongX?[0,1,0]:[0,-1,0]}],
      drawing: {
        face:'板面展开',width:length,height:h,
        features:[{
          jointId:'X1',kind:'notch',x:arm,y:alongX?h/2:0,width:t,height:h/2,
          description:`槽口朝${alongX?'上':'下'}，槽宽 ${t} mm，槽深 ${h/2} mm，居中开设。`
        }]
      },
      offset: alongX ? [-0.12 * w, 0, 0] : [0.12 * w, 1.08 * h, 0],
      orientation: alongX ? '缺口朝上；标签面朝观察者。' : '缺口朝下；长边沿前后方向。',
      note: `中央直槽，名义槽宽 ${t} mm，深 ${h / 2} mm；槽边至对应端面 ${arm} mm。`
    });
  }
  const joints = [joint('X1', '中心十字接口', 'C1', 'C2', [t / 2, h / 2, t / 2], [0, -1, 0])];
  const steps = [
    step('orient', '核对两块半槽板', ['C1', 'C2'], ['C1'], [], '将 C1 置于平稳工作台上，槽口朝上。扶稳 C1，核对 C2 的槽口朝下。', 'C1 与 C2 各有一条居中的半高槽。'),
    step('align', '对齐中心槽', ['C1', 'C2'], ['C2'], ['X1'], '扶住 C2，在高于 C1 的位置平移，使两槽中心线重合。两块板在俯视图中应成直角。', 'C2 尚在 C1 上方，槽口方向相向。'),
    step('interlock', '垂直交叉对插', ['C1', 'C2'], ['C2'], ['X1'], `保持 C1 稳定，沿竖直方向轻放 C2，直至两块板的 ${h / 2} mm 深半槽互相咬合。`, '两板上下边分别平齐，不需扭转或强敲。'),
    step('inspect', '检查齐平与垂直', ['C1', 'C2'], [], ['X1'], '查看前后、左右四条支臂及中心接口，再用直角尺检查垂直度。将分格架放入实际托盘前，检查外形与托盘净空。', '目检槽底贴合、端面无裂纹；槽宽公差与抗晃动表现需通过样件确认。')
  ];
  return {parts, joints, steps};
}

export function build(p) {
  const errors = validate(p);
  if (errors.length) throw new Error(errors.join('；'));
  const def = CASES[p.caseId];
  const geometry = def.geometry(p);
  const parts = geometry.parts.map(part => ({...part, material: p.material, quantity: 1, jointIds: geometry.joints.filter(j => j.partIds.includes(part.id)).map(j => j.id)}));
  const volume = geometry.unitLabel ? null : parts.reduce((v, part) => v + part.size.reduce((a, b) => a * b, 1), 0) / 1e9;
  return {dimensions:{w:p.w,h:p.h,d:p.d},...geometry, caseId: p.caseId, name: def.name, parameters: {...p}, connection: def.connection, camera:def.camera, parts, checks: def.checkRelations(p), volume};
}

// Keyframes in assembly coordinates. Intermediate steps keep seated parts fixed.
function shelfFrame(p, frame) {
  const travel = Math.max(55, Math.round(p.w * 0.13));
  return {
    roll: frame >= 1 && frame <= 5 ? Math.PI / 2 : 0,
    offsets: {
      A1: [frame < 2 ? travel / 3 : 0, 0, 0], A2: [frame < 5 ? 2 * travel : 0, 0, 0],
      B1: [frame < 3 ? travel : 0, 0, 0], B2: [frame < 4 ? travel : 0, 0, 0]
    }
  };
}

function dividerFrame(p, frame) {
  return {roll: 0, offsets: {
    C1: [0, frame === 0 ? Math.round(p.h * 0.16) : 0, 0],
    C2: [frame < 2 ? p.w * 0.22 : 0, frame < 3 ? p.h + p.t * 2 : 0, 0]
  }};
}

export function pose(model, stepIndex, progress) {
  const index = Math.min(model.steps.length - 1, Math.max(0, Math.trunc(stepIndex) || 0));
  const unit = Math.max(0, Math.min(1, Number(progress) || 0));
  const time = unit * unit * (3 - 2 * unit);
  const definition = CASES[model.caseId];
  if(definition.pose)return definition.pose(model,index,unit);
  const frame = definition.keyframe;
  const start = frame(model.parameters, index), end = frame(model.parameters, index + 1);
  const mix = (a, b) => a + (b - a) * time;
  const roll = mix(start.roll, end.roll);
  const parts = {};
  for (const part of model.parts) {
    parts[part.id] = {visible: true, offset: start.offsets[part.id].map((v, axis) => mix(v, end.offsets[part.id][axis]))};
  }
  return {parts, roll, lift: definition.tableLift(model.parameters, roll),
    activeIds: model.steps[index].movingIds.length ? model.steps[index].movingIds : model.steps[index].ids,
    jointIds: model.steps[index].jointIds};
}

export function snapshot(p) {
  const model = build(p);
  return {schemaVersion: 2, case: model.name, createdAt: new Date().toISOString(),
    status: model.gpu?'原始网格展示 / 待实物核对':model.engineeringNote?'图示比例复原 / 待实物核对':'名义设计 / 样件及工艺待验证', ...model, engineering: model.engineeringNote||ENGINEERING_NOTE};
}

export function csv(p) {
  const {parts,unitLabel='mm'} = build(p);
  const dimensions=unitLabel==='mm'?['长(mm)','宽(mm)','厚(mm)']:[`X(${unitLabel})`,`Y(${unitLabel})`,`Z(${unitLabel})`];
  const rows = [['案例', '编号', '构件', '材料', '数量', ...dimensions, '接口编号', '方向', '设计备注'],
    ...parts.map(part => [CASES[p.caseId].name, part.id, part.name, part.material, part.quantity, ...part.size, part.jointIds.join(' / '), part.orientation, part.note]),
    ['待工程验证', '', '', '', '', '', '', '', '', '', CASES[p.caseId].engineeringNote||ENGINEERING_NOTE]];
  return '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
