import data from './chinese-data.js';

export const CHINESE_NOTE='OBJ 未标注实际尺寸单位。当前保留原始网格与分件，按空间层次编排演示；构件称谓、隐藏榫口、装入路径和实物尺寸需工艺人员核对。';
const r=n=>Math.round(n*100)/100;
const instructions=[
 '先辨认中心立柱与出跳方向。立柱保持原模型的竖直姿态，作为后续各层定位基准。',
 '把底部承托移到中心立柱前方的对应位置，确认底层轮廓与中心线。',
 '依次对照编号布置第一层出跳栱、横向栱及中心垫片。沿箭头观察各件的落位方向。',
 '在第一层两侧布置支承与斗形构件，核对左右配对及中部承托的位置。',
 '第二层出跳栱和两道横向栱落到第一层上方，中心垫片沿立柱定位。',
 '按内外、左右安放四处斗形承托，再核对左右斜栱与中间支承的方向。',
 '第三层栱架向两侧及前方展开，保持长构件原有的朝向，核对中央交叉关系。',
 '逐件对照第三层各承托编号，确认与下方栱端的对应关系。',
 '安放最上层的三道横栱、两侧斜栱与纵向出跳构件，检查各层是否居中。',
 '把顶部各斗形承托与下方栱架逐一对应。可以暂停并点选构件检查内外排位置。',
 '最后定位顶部纵向构件与端头，核对二者衔接处及前后方向。',
 '旋转查看完整斗拱，核对各层、左右对称位置以及 52 个网格分件。可切换爆炸图继续观察。'
];
export const chineseCase={
 id:'chinese',name:'中式斗拱',subtitle:'独立斗拱 · 层层出跳的木构组合',connection:'原始模型',
 limits:{s:[60,140]},fieldUnit:'%',presets:[{id:'original',name:'原始比例 · 100%',s:100},{id:'small',name:'缩小展示 · 75%',s:75}],
 requirement:'观察中式斗拱的构件层次，按编号学习各层的组合关系。',
 engineeringNote:CHINESE_NOTE,review:'本教程为模型分层演示。请结合实体构件确认真实分件、榫卯配合、安装顺序和临时支撑措施。',
 checkRelations:p=>[
  {label:'原始构件对应',detail:'52 个网格分件与原 OBJ 对象一一对应，清单和教程沿用同一编号。',ok:true},
  {label:'比例与动作联动',detail:`显示比例 ${p.s}%，模型外廓、爆炸间距及动作终点同步计算。`,ok:true},
  {label:'尺寸单位',detail:'保留 OBJ 模型单位，尚未换算为实物毫米。',ok:true}
 ],
 camera:{yaw:2.5,pitch:.36,zoom:1.06},tableLift:()=>0,geometry,pose:assemblyPose
};

function geometry(p){
 const factor=p.s/100;
 const parts=data.parts.map(item=>{
  const lo=item.lo.map(v=>v*factor),hi=item.hi.map(v=>v*factor);
  const pos=lo.map((v,i)=>(v+hi[i])/2),box=lo.map((v,i)=>hi[i]-v);
  const leftRight=pos[0]<-1?'左侧':pos[0]>1?'右侧':'中央';
  return {id:item.id,name:item.name,sourceObject:item.sourceObject,sourceIndex:item.sourceIndex,
   installStep:item.installStep,range:item.range,triangleCount:item.triangleCount,
   pos,box,size:box.map(r),solids:[],meshFaces:[],
   offset:[pos[0]*.65,item.installStep*5*factor,pos[2]*.5],
   travel:item.installStep===0?[0,8*factor,0]:[0,10*factor,0],
   labelPoint:[pos[0],hi[1],pos[2]],
   orientation:`位于${leftRight}；保留原模型朝向，按 ${item.id} 核对。`,
   note:`原网格 ${item.sourceObject}；外廓按 X / Y / Z 记录，实际分件与加工尺寸待确认。`,
   drawing:{face:'外包尺寸示意 · 非加工轮廓',width:r(box[0]),height:r(box[1]),unit:'模型单位',features:[],
    note:'这里只标注网格外包范围。准确外形请点选三维构件查看，未提供加工轮廓或榫口尺寸。'}
  };
 });
 const steps=data.stepTitles.map((title,index)=>{
  const movingIds=parts.filter(v=>v.installStep===index).map(v=>v.id);
  return {id:'chinese-'+(index+1),title,movingIds,ids:movingIds.length?movingIds:parts.map(v=>v.id),jointIds:[],
   group:index<4?0:index<8?1:2,groupTitle:index<4?'底层 · 定位与承托':index<8?'中层 · 交叉与出跳':'上层 · 收合与检查',
   text:instructions[index],check:index===11?'完整模型的各件已回到原 OBJ 位置；实物装配顺序与暗榫仍需试装确认。':'核对本步编号、朝向与相邻构件。动画表示空间落位，实物插入路径需试装确认。',duration:2600};
 });
 const dimensions=Object.fromEntries(['w','h','d'].map((key,i)=>[key,r((data.bounds[1][i]-data.bounds[0][i])*factor)]));
 return {parts,steps,joints:[],dimensions,unitLabel:'模型单位',dimensionLabel:'模型外廓',engineeringNote:CHINESE_NOTE,
  gpu:{asset:'assets/chinese-dougong.bin',byteLength:data.byteLength,sha256:data.sha256,factor},
  provenance:{sourceFile:data.sourceFile,sourceObjects:data.sourceObjects,unit:data.sourceUnits,triangles:data.triangles,translation:data.origin.map(v=>-v),meshVersion:data.version}};
}

function assemblyPose(model,index,progress){
 const t=progress*progress*(3-2*progress),step=model.steps[index];
 return {roll:0,lift:0,activeIds:step.movingIds,jointIds:[],parts:Object.fromEntries(model.parts.map(part=>[part.id,{
  visible:part.installStep<=index,offset:part.travel.map(v=>part.installStep===index?v*(1-t):0)
 }]))};
}

