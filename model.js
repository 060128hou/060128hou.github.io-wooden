export const templates = {
  standard: {name:'案上 · 标准置物架',w:600,h:480,d:240,t:18},
  compact: {name:'案上 · 紧凑置物架',w:420,h:360,d:200,t:18}
};
export const defaults = {template:'standard',w:600,h:480,d:240,t:18,material:'白蜡木',requirement:'为书桌设计一件双层置物架，用来收纳文具与小物。'};
export const limits = {w:[360,800],h:[320,600],d:[180,320],t:[18,24]};
export function validate(p) {
 const errors=[];
 for(const [k,[min,max]] of Object.entries(limits)) if(!Number.isInteger(p[k])||p[k]<min||p[k]>max) errors.push(`${{w:'宽度',h:'高度',d:'深度',t:'板厚'}[k]}应为 ${min}–${max} mm 的整数`);
 if(!templates[p.template])errors.push('请选择有效模板');
 if(!['白蜡木','黑胡桃木'].includes(p.material))errors.push('请选择有效木材');
 if(typeof p.requirement!=='string'||p.requirement.length>1000)errors.push('需求说明最多 1000 字');
 return errors;
}
export function build(p) {
 const errors=validate(p);if(errors.length)throw new Error(errors.join('；'));
 const {w,h,d,t}=p,g=+(t/3).toFixed(2), length=+(w-2*t+2*g).toFixed(2);
 const ys=[60+t/2,h-60-t/2];
 const parts=[
 {id:'A1',name:'左侧板',size:[h,d,t],pos:[-w/2+t/2,h/2,0],box:[t,h,d],offset:[-140,0,0],note:`内侧两道贯通槽，设计槽深 ${g} mm，槽宽 ${t} mm；配合公差待确认。`},
 {id:'A2',name:'右侧板',size:[h,d,t],pos:[w/2-t/2,h/2,0],box:[t,h,d],offset:[140,0,0],note:'与左侧板镜像开槽，确认内外面与上下方向。'},
 ...ys.map((y,i)=>({id:`B${i+1}`,name:i?'上层板':'下层板',size:[length,d,t],pos:[0,y,0],box:[length,t,d],offset:[0,i?125:-60,90],note:`两端各嵌入侧板 ${g} mm；端部配合、含水率及胶合方案待工程确认。`}))
 ].map(x=>({...x,material:p.material,quantity:1}));
 return {parts,g,ys,volume:parts.reduce((v,x)=>v+x.size.reduce((a,b)=>a*b,1),0)/1e9,innerWidth:w-2*t,clearHeight:ys[1]-ys[0]-t};
}
export const steps=[
 {title:'核对构件与方向',ids:['A1','A2','B1','B2'],text:'对照编号核对 2 块侧板和 2 块层板，标记侧板内侧及上下方向。检查裂纹、翘曲和槽口毛刺。先由工程人员确认尺寸与配合。',check:'四个构件齐全，左右侧板镜像对应。'},
 {title:'左侧板与下层板试配',ids:['A1','B1'],text:'将左侧板平放在有软垫的工作台上，使下层板端部对准距底边 60 mm 的槽口。轻推试配，不强行敲入。',check:'下层板端部均匀入槽，没有劈裂或明显松动。'},
 {title:'装入上层板',ids:['A1','B2'],text:'保持下层板稳定，将上层板对准上方槽口。使用直角尺检查两块层板与侧板的关系；装配过程中提供临时支撑。',check:'两块层板方向一致，前后边缘齐平。'},
 {title:'合拢右侧板',ids:['A2','B1','B2'],text:'同时对准两块层板端部与右侧板槽口，缓慢合拢。比较两条对角线，确认框架方正。若卡滞，拆开检查，勿强压。',check:'四个接口贴合，框架没有明显扭曲。'},
 {title:'复核与工程确认',ids:['A1','A2','B1','B2'],text:'完成虚拟装配检查。实物制作前须确认胶合或锁固工艺、抗侧向摇摆措施、加工公差与承载测试。未验证前不要承重或投入实际使用。',check:'记录需修改之处，提交人工审核；教程完成不代表工程验收通过。'}
];
export function snapshot(p){return {schemaVersion:1,case:'案上双层置物架',createdAt:new Date().toISOString(),status:'设计草案 / 待工程验证',parameters:{...p},...build(p),steps,engineering:'尺寸为设计名义值，未含加工余量。承载、抗倾覆、木材含水率、公差、胶合与锁固工艺尚未验证；不是可直接加工的图纸。'};}
export function csv(p){const rows=[['编号','构件','材料','数量','长(mm)','宽(mm)','厚(mm)','说明'],...build(p).parts.map(x=>[x.id,x.name,x.material,1,...x.size,x.note]),['备注','设计名义尺寸，非加工图纸；工程待验证']];return '\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');}
