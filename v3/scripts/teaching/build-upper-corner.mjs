import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ModelBuilder,arch,cup,box,profile,cylinder,T} from './geometry.mjs';

// Display reconstructions of the visible profiles and layered relationships.
// X follows the eaves, +Z points out from the wall, Y is up. Dimensions below
// are illustrative proportions, never a cutting list or construction drawing.
const scope='比例展示构件。隐藏榫口、实际尺寸及装入路径待实物核对。';
const cn={5:'五',6:'六',7:'七',8:'八'};
const rotatePoint=([x,y,z],angle,origin=[0,0,0])=>[x*Math.cos(angle)+z*Math.sin(angle)+origin[0],y+origin[1],-x*Math.sin(angle)+z*Math.cos(angle)+origin[2]];

function notchedBeam(length,height,depth,pos,axis='x',notches=[],bottom=false){
 const l=length/2,b=-height/2,t=height/2;
 const ns=[...notches].sort((a,c)=>a.x-c.x);
 const pts=[[-l,t]];
 if(!bottom)for(const n of ns)pts.push([n.x-n.w/2,t],[n.x-n.w/2,t-n.h],[n.x+n.w/2,t-n.h],[n.x+n.w/2,t]);
 pts.push([l,t],[l,b]);
 if(bottom)for(const n of ns.toReversed())pts.push([n.x+n.w/2,b],[n.x+n.w/2,b+n.h],[n.x-n.w/2,b+n.h],[n.x-n.w/2,b]);
 pts.push([-l,b]);return profile(pts,depth,pos,axis);
}

function headBeam(length,height,depth,pos,axis='z',tail='square',notches=3){
 const l=length/2,h=height/2,pts=[[-l,h],[l-12,h],[l,h-7],[l-9,-h+2],[l-22,-h]];
 for(let i=notches-1;i>=0;i--){const u=-l*.45+i*(length*.57/Math.max(1,notches-1));pts.push([u+8,-h],[u+8,1],[u-8,1],[u-8,-h]);}
 if(tail==='taper')pts.push([-l,-h+height*.65]);else pts.push([-l,-h]);
 return profile(pts,depth,pos,axis);
}

function upperAng(length,rise,depth,pos,notchCount=2){
 // High tail is on the wall side (-Z); low end stays over the projecting arms.
 const l=length/2,h=rise/2;
 const top=u=>h-(u+l)*rise/length;
 const pts=[[-l,top(-l)],[-l+16,top(-l+16)+2],[l,top(l)],[l,top(l)-15]];
 for(let i=notchCount-1;i>=0;i--){const u=-l*.6+i*(length*.62/Math.max(1,notchCount-1)),v=top(u)-20;pts.push([u+9,v],[u+9,v+9],[u-9,v+9],[u-9,v]);}
 pts.push([-l+24,h-28],[-l+18,h-31],[-l+13,h-28],[-l+10,h-24],[-l+4,h-23],[-l,h-18]);
 return profile(pts,depth,pos,'z');
}

function pushCup(b,name,x,y,z,{w=28,d=27,h=16,rot=0}={}){
 return b.part(name,cup(w,d,h,[x,y+h/2,z],16,rot),undefined,'斗口朝上，按承托位置辨认朝向。'+scope);
}

function transverseRow(b,name,z,bottom,top,length,{straight=false,rotation=0,pos=[0,0,0],endCups=true}={}){
 const h=top-bottom,center=rotatePoint([0,(bottom+top)/2,z],rotation,pos);
 const g=straight?notchedBeam(length,h,18,center,'x',[{x:0,w:18,h:Math.min(9,h*.45)}]):arch(length,h,18,center,'x',18);
 // notchedBeam and arch are generated in world coordinates; rotate around row
 // centre so its relationship to the projecting arm remains unchanged.
 if(rotation){g.translate(...center.map(n=>-n));g.rotateY(rotation);g.translate(...center);}
 b.part(name,g,undefined,(straight?'平直枋件横向承托。':'卷杀端朝上，横向跨过出跳构件。')+scope);
 if(endCups){for(const sign of [-1,1]){const p=rotatePoint([sign*length*.37,top,z],rotation,pos);pushCup(b,`${name}承托斗 · ${sign<0?'左':'右'}`,p[0],p[1],p[2],{rot:rotation});}}
}

async function makeUpper(n){
 const id=({5:'wupu',6:'liupu',7:'qipu',8:'bapu'})[n]+'-shangang';
 const descriptions={
 5:'由栌斗、两跳华栱与一支上昂构成，逐层观看计心栱架、上部枋材和圆槫的承接。',
 6:'单上昂与多层华栱共同出跳，局部以平直柱头枋承托。模型重点展示偷心跳与上部平棊枋的层次。',
 7:'两支上昂分层抬起壁内承托，结合三跳华栱、连珠斗与外、里两组枋件观察完整组合。',
 8:'下层三跳华栱向外展开，上层双上昂配合垫木、柱头枋和里外衬方头，形成更丰富的承托层次。'
 };
 const b=new ModelBuilder({id,title:cn[n]+'铺作上昂斗拱',subtitle:n===5?'重栱出上昂并计心':'重栱出'+(n===6?'单':'双')+'上昂 · 偷心跳',category:'上昂',order:n,description:descriptions[n],orientation:'Y 向上，+Z 为檐外，-Z 为壁内。'});
 b.step('栌斗就位','先放稳栌斗，以十字斗口确定横向与出跳方向。','确认斗口向上，底面平稳。');
 pushCup(b,'栌斗',0,0,0,{w:60,d:58,h:32});
 b.step('安放泥道栱','泥道栱沿檐口横向放入栌斗，再分别安放两端的散斗。','中央预留前后向华栱的位置。');
 b.part('泥道栱',arch(100,28,18,[0,33,0]),undefined,'沿 X 方向横置。'+scope);
 for(const s of [-1,1])pushCup(b,'泥道栱散斗 · '+(s<0?'左':'右'),s*37,47,0);
 const levels=n===5?2:3,baseY=58,jump=46,layer=37;
 const levelsData=[];
 for(let tier=1;tier<=levels;tier++){
  const z=tier*jump,top=baseY+(tier-1)*layer,length=z*2+34;
  b.step('第'+tier+'跳华栱落位',`第${tier}跳华栱沿前后方向放置，檐外端对准第${tier}层出跳位置，再安放端部的斗。`,tier===1?'华栱与泥道栱互相垂直。':'与前一跳保持同一中轴，比较伸出的长度。');
  b.part('第'+tier+'跳华栱',headBeam(length,26,18,[0,top-13,0],'z',tier===levels?'taper':'square',Math.min(tier+1,3)),undefined,'带槽侧面对准横向承托，沿前后方向。'+scope);
  pushCup(b,'第'+tier+'跳交互斗 · 檐外',0,top,z,{w:30,d:28,h:16});
  pushCup(b,'第'+tier+'跳华栱散斗 · 壁内',0,top,-z,{w:28,d:27,h:16});
  b.step('第'+tier+'层栱枋与散斗',`在第${tier}跳两端布置横向栱枋，逐件安放对应散斗。${n===5?'中央保留计心的横栱。':'留意栱件与平直柱头枋的区别。'}`,'按内外位置区分同层构件，斗口朝上。');
  const rowTop=top+28,L=132+tier*22;
  transverseRow(b,`第${tier}层${tier===levels?'令栱':'瓜子栱'} · 檐外`,z,top+9,rowTop,L);
  transverseRow(b,`第${tier}层${n===5?'壁内慢栱':'柱头枋'} · 壁内`,-z,top+9,rowTop,n===5?L:L+12,{straight:n!==5});
  if(n===5||tier===1||n===8&&tier===2)transverseRow(b,`第${tier}层${tier===1?'壁内慢栱':'慢栱'} · 中线`,0,tier===1?55:top-7,rowTop,L+12);
  if(tier>1){
   const q=(tier-1)*jump;
   transverseRow(b,`第${tier}层慢栱 · 前排`,q,top-7,rowTop,L-10);
   transverseRow(b,`第${tier}层柱头枋 · 后排`,-q,top-7,rowTop,L-2,{straight:n!==5});
  }
  levelsData.push({top,rowTop,z});
  // Seven-pu's first rising member belongs between lower and upper arm groups.
  if(n===7&&tier===2)addRising(b,1,rowTop-5,110,175);
 }
 const last=levelsData.at(-1),upperBase=last.rowTop+9,back=-(last.z+25),front=last.z;
 if(n!==7)addRising(b,1,last.rowTop-5,last.z*.8,last.z+72);
 if(n>=7)addRising(b,2,upperBase+24,last.z*.7,last.z+91);
 b.step('外、里耍头对位','把外耍头与里耍头沿出跳方向放好，核对两端与横向栱件的相接位置。','两件分别编号，勿将壁内端与檐外端反装。');
 b.part('外耍头',headBeam(last.z*2+50,25,18,[0,upperBase+12,0],'z','taper',3),undefined,scope);
 b.part('里耍头',headBeam(last.z*2+80,24,18,[0,upperBase+40,-18],'z','square',3),undefined,scope);
 pushCup(b,'耍头齐心斗 · 檐外',0,upperBase+24,front,{w:28,d:27,h:16});
 pushCup(b,'耍头齐心斗 · 壁内',0,upperBase+52,back,{w:28,d:27,h:16});
 const capLayers=n===5?1:n===6?2:n===7?3:4;
 let capBottom=upperBase+18;
 for(let i=0;i<capLayers;i++){
  const y=capBottom+i*25;
  b.step(i===0?'安放平棊枋与罗汉枋':i===capLayers-1?'收拢上层衬方头':'叠置第'+(i+1)+'层枋材',i===0?'把平棊枋放在内侧，罗汉枋与柱头枋对应各排承托。':'按层次布置横向枋材，再核对前后方向的衬方头。','关注缺口朝向，避免将不同层位的枋件互换。');
  const rows=n===5?[-last.z,0,last.z]:i%2===0?[-last.z,0,last.z]:[-last.z*.7,last.z*.7];
  for(const [k,z]of rows.entries())b.part((k===0?'平棊枋':k===rows.length-1?'柱头枋':'罗汉枋')+' · '+(i+1)+'层',notchedBeam(198+(i%2)*10,23,18,[0,y+11.5,z],'x',[{x:0,w:18,h:9}]),undefined,scope);
  if(i===capLayers-1||i===0)b.part(n===8&&i===1?'垫木':i===0?'外衬方头':'里衬方头',headBeam(last.z*2+72,24,18,[0,y+24,-8],'z','taper',rows.length),undefined,scope);
  if(n===8&&i===1)b.part('垫木',notchedBeam(last.z*2+46,18,20,[0,y+24,-4],'z',[{x:-last.z*.4,w:18,h:7},{x:last.z*.4,w:18,h:7}],true),undefined,scope);
 }
 if(n===5){
  const y=capBottom+47;
  b.step('安装压槽枋与替木','压槽枋横向收口，替木放在其上方，为圆槫留出承托面。','核对替木与压槽枋的轴线。');
  b.part('压槽枋',notchedBeam(204,27,20,[0,y+13.5,front],'x',[{x:0,w:18,h:12}],true));
  b.part('替木',box([214,14,28],[0,y+34,front]));
  b.step('安放牛脊槫','圆槫横向放到替木上，观察其与下方栱架的承托关系。','圆木轴线与替木长边保持一致。');
  b.part('牛脊槫',cylinder(226,15,[0,y+56,front]));
 }
 return await b.write();
}

function addRising(b,index,y,front,back){
 const length=front+back,mid=(front-back)/2,rise=index===1?56:68;
 b.step('定位上昂'+(index===1?'一':'二'),`上昂${index===1?'一':'二'}的高端朝壁内，以连珠斗和托昂斗辨认上下承托。动画先展示构件与邻件的关系。`,'昂尾朝向壁内上方；真实插入路径和隐蔽槽口需实物确认。');
 pushCup(b,`连珠斗下 · 上昂${index}`,0,y-4,-front*.55,{w:27,d:26,h:11});
 pushCup(b,`连珠斗上 · 上昂${index}`,0,y+3,-front*.55,{w:28,d:27,h:11});
 b.part('上昂'+(index===1?'一':'二'),upperAng(length,rise,17,[0,y+26,mid],3),undefined,'高端朝壁内，底部为比例化卷草轮廓。'+scope,[0,80,-30]);
 pushCup(b,`托昂斗 · 上昂${index}`,0,y+26+rise/2-3,-back+12,{w:29,d:28,h:15});
 b.step('骑昂栱承托 · '+index,'把骑昂栱横向放在上昂高端的托昂斗上，再核对两端散斗。','检查横栱与上昂互相垂直。');
 transverseRow(b,`骑昂${index===1?'瓜子栱':'慢栱'}`,-back+12,y+26+rise/2+5,y+26+rise/2+27,138+index*12);
}

function turnGeometries(gs,angle,origin){
 for(const g of Array.isArray(gs)?gs:[gs]){g.rotateY(angle);g.translate(...origin);}return gs;
}

async function makeCorner(){
 const b=new ModelBuilder({id:'wupu-zhuanjiao',title:'五铺转角斗拱',subtitle:'双向转折 · 斜向出跳',category:'转角',order:5,description:'三组承托沿直角转折展开，斜向构件连起转角两面。逐步观察下层栱架、三向出跳、上部枋材与两根圆槫。',orientation:'两面檐口分别沿 X、Z 方向，转角斜件位于 45° 角平分线上。'});
 const d=116,pods=[{label:'转角',p:[0,0,0],a:0},{label:'左翼',p:[d,0,0],a:0},{label:'右翼',p:[0,0,d],a:Math.PI/2}];
 b.step('合拢两向底枋','两向底枋组成直角，为转角与两翼的承托斗确定位置。','识别直角内外侧，保持两条檐口方向清楚。');
 b.part('底枋 · X 向',notchedBeam(190,15,24,[70,7.5,0],'x',[{x:-70,w:24,h:7}]));
 b.part('底枋 · Z 向',notchedBeam(190,15,24,[0,7.5,70],'z',[{x:-70,w:24,h:7}],true));
 b.step('布置三组栌斗','转角一组、两翼各一组，逐件把斗口朝上安放。','确认三个栌斗都落在对应底枋上。');
 for(const p of pods)pushCup(b,p.label+'栌斗',p.p[0],15,p.p[2],{w:45,d:45,h:27});
 b.step('交叉安放下层栱','先安放转角的正交栱，再放两翼的横栱。','转角交叉位置用于表现两面构架相接，隐藏搭接待核对。');
 for(const p of pods){
  b.part(p.label+'泥道栱',turnGeometries(arch(108,24,15,[0,40,0]),p.a,p.p));
  if(p.label==='转角')b.part('转角正交栱',arch(108,24,15,[0,47,0],'z'));
 }
 b.step('安放首层斗组','把散斗放在下层栱的端部，区分转角与两翼的对应位置。','逐个核对构件编号，斗口朝上。');
 for(const p of pods)for(const s of [-1,1]){const q=rotatePoint([s*39,52,0],p.a,p.p);pushCup(b,p.label+'首层散斗 · '+s,q[0],q[1],q[2],{w:24,d:24,h:14,rot:p.a});}
 b.step('两向华栱伸出','两翼华栱分别朝各自檐外方向出跳，中央转角保留两向交接。','不同朝向的华栱不能只凭长短互换。');
 for(const p of pods){
  b.part(p.label+'第一跳华栱',turnGeometries(headBeam(154,25,15,[0,68,-19],'z','square',2),p.a,p.p));
  if(p.label==='转角')b.part('转角第一跳华栱 · 正交',headBeam(154,25,15,[-19,74,0],'x','square',2));
 }
 b.step('转角斜栱落位','斜栱沿两面檐口之间的角平分线伸出，在转角中心与正交构件会合。','本件独立编号，用来识别斜向与正交方向。');
 const diagonal=-Math.PI/4;
 b.part('转角 45° 斜栱',turnGeometries(headBeam(192,25,15,[0,80,-31],'z','taper',2),diagonal,[0,0,0]),undefined,scope,[30,80,30]);
 b.step('搭起中层横栱','在各出跳端部安放横向栱，形成转角连续的承托面。','分别核对两面檐口的端部散斗。');
 const rowY=89;
 for(const p of pods){for(const z of [-75,0,46])transverseRow(b,p.label+'中层横栱 · '+z,z,rowY,rowY+24,z===0?128:108,{rotation:p.a,pos:p.p});}
 b.step('定位转角下昂','两翼下昂向檐外俯伸，转角下昂沿斜向补齐两面之间的出挑。','昂头向外下俯，昂尾留在构架内部。');
 const downAng=(pos,axis='z')=>profile([[-122,-29],[-111,-25],[-55,13],[-9,33],[67,33],[67,12],[-8,12],[-47,-8]],15,pos,axis);
 for(const p of pods)b.part(p.label+'下昂',turnGeometries(downAng([0,124,-15]),p.a,p.p),undefined,scope,[0,70,30]);
 b.part('转角斜向下昂',turnGeometries(downAng([0,130,-27]),diagonal,[0,0,0]),undefined,scope,[30,80,30]);
 b.step('形成上层栱架','上层栱沿两面檐口排列，中间保留给竖向销与斜件的位置。','核对转角两侧层高与散斗朝向。');
 for(const p of pods){for(const z of [-102,-42,28])transverseRow(b,p.label+'上层横栱 · '+z,z,141,166,z===-42?142:118,{rotation:p.a,pos:p.p});}
 b.step('安装两向耍头与定位销','在两向栱架上放置耍头，中央竖向定位件贯穿转角组合。','定位件的真实孔径与锁合方式需实物确认。');
 for(const p of pods)b.part(p.label+'耍头',turnGeometries(headBeam(217,25,15,[0,176,-24],'z','square',3),p.a,p.p));
 b.part('转角竖向定位件',box([12,110,12],[0,132,0]),undefined,'比例化定位件，真实销孔尺寸待核对。',[0,110,0]);
 b.step('合拢檐口枋材','两向檐口枋材以直角相接，向外侧连接各翼承托。','注意每件两端的接头方向，先认清 X、Z 两向。');
 for(const [i,z]of [-104,-43].entries()){
  b.part('X 向檐口枋 · '+(i+1),notchedBeam(300,28,18,[63,193+i*24,z],'x',[{x:-63,w:18,h:12},{x:53,w:18,h:12}],true));
  b.part('Z 向檐口枋 · '+(i+1),notchedBeam(300,28,18,[z,198+i*24,63],'z',[{x:-63,w:18,h:12},{x:53,w:18,h:12}],true));
 }
 b.step('安放两向替木','上部两根替木分别沿两面檐口，形成圆槫的连续承托。','替木与下层对应枋材保持同向。');
 b.part('X 向替木',box([308,16,28],[62,239,-43]));
 b.part('Z 向替木',box([28,16,308],[-43,244,62]));
 b.step('落下转角圆槫','两根圆槫在转角处正交，完成顶部轮廓。旋转观察两面与斜向构件的对应。','本模型的边界、细部暗榫与实际装配顺序仍需样件校核。');
 b.part('X 向圆槫',cylinder(318,15,[62,262,-43]));
 b.part('Z 向圆槫',cylinder(318,15,[-43,267,62],'z'));
 return await b.write();
}

function curvedAng(pos,length=182,depth=14){
 const l=length/2;
 return profile([[-l,30],[-l+35,28],[-l+62,18],[-l+93,0],[l,-37],[l,-45],[l-17,-41],[l-52,-18],[-l+66,-2],[-l+25,7],[-l,8]],depth,pos,'z');
}
function longSlopingBeam(pos,length=310,rise=95,depth=18,ornate=false){
 const l=length/2,h=rise/2;
 const pts=[[-l,h],[-l+12,h+4],[l,-h],[l,-h-16],[l-21,-h-14],[l-75,-h+3],[l-79,-h-2],[l-86,-h-3],[l-92,-h+2],[l-107,-h+12],[-l+18,h-26],[-l+9,h-23],[-l,h-17]];
 const g=profile(pts,depth,pos,'z');
 if(!ornate)return[g];
 const curls=[];
 for(const [z,y,rad]of [[-length*.32,rise*.24,10],[-length*.23,rise*.13,8],[-length*.15,rise*.04,6]]){
  const shape=new T.Shape();shape.absarc(0,0,rad,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,rad*.46,0,Math.PI*2,true);shape.holes.push(hole);
  const ring=new T.ExtrudeGeometry(shape,{depth:depth+2,bevelEnabled:false,curveSegments:16});ring.translate(0,0,-(depth+2)/2);ring.rotateY(Math.PI/2);ring.translate(pos[0],pos[1]+y-20,pos[2]+z);curls.push(ring);
 }
 return[g,...curls];
}
function cloudPanel(pos,scale=1){
 const pts=[[-21,1],[-24,6],[-23,13],[-19,17],[-13,18],[-9,23],[-3,23],[2,18],[9,21],[15,19],[18,14],[24,12],[26,5],[22,-1],[16,-3],[10,-8],[3,-10],[-4,-8],[-10,-12],[-17,-8],[-18,-3]].map(([x,y])=>[x*scale,y*scale]);
 return profile(pts,11*scale,pos,'z');
}

async function makeMing(){
 const b=new ModelBuilder({id:'qicai-liujin',title:'七踩鎏金斗拱',subtitle:'明清落金造 · 斜梁与金柱',category:'明清',order:null,description:'前端斗栱与后方金柱通过长斜梁相接，上部三道圆桁呈现落金造的高差。模型保留卷草头的轮廓化装饰，以原木材质展示构造。',orientation:'+Z 为檐外斗栱，-Z 为金柱方向。'});
 const front=112,back=-149;
 b.step('铺放底座','底座连接前端斗栱与后端金柱，先认清两端位置。','有圆柱的一端为壁内，前端为檐外斗栱。');
 b.part('前端座木',box([76,13,54],[0,6.5,front]));
 b.part('金柱座木',box([66,13,54],[0,6.5,back]));
 b.part('连接底枋',box([24,13,front-back],[0,6.5,(front+back)/2]));
 b.step('安放大斗与金柱','檐外大斗口朝上，壁内金柱竖立在座木上，核对柱帽和柱脚方向。','柱身与底座保持垂直；真实固定方式待确认。');
 pushCup(b,'檐外大斗',0,13,front,{w:52,d:50,h:28});
 const shaft=cylinder(193,17,[0,13+193/2,back],'y');
 b.part('金柱',shaft,undefined,'柱身竖直，顶端承托坐梁大斗。'+scope);
 b.part('金柱柱脚圈',cylinder(9,22,[0,18,back],'y'));
 b.part('金柱柱帽圈',cylinder(8,22,[0,203,back],'y'));
 pushCup(b,'坐梁大斗',0,207,back,{w:45,d:43,h:24});
 b.step('正心瓜栱与单翘','先放正心瓜栱，再沿出跳方向安放单翘，使前后与左右关系清楚。','单翘对准中心线，注意端部卷杀朝向。');
 b.part('正心瓜栱',arch(86,25,17,[0,42,front]));
 b.part('单翘',arch(141,27,17,[0,60,front],'z'));
 for(const z of [front-48,front+48])pushCup(b,'单翘十八斗 · '+(z<front?'里':'外'),0,74,z,{w:27,d:25,h:15});
 b.step('第一层瓜栱与万栱','在单翘两端和中心布置三道横向栱，并安放对应斗组。','逐排核对檐外、正心、壁内的位置。');
 for(const [i,z]of [front+48,front,front-48].entries())transverseRow(b,['外瓜栱','正心万栱','里瓜栱'][i],z,i===1?55:82,108,i===1?142:122);
 b.step('单昂与菊花头','单昂朝檐外下俯，菊花头一侧朝壁内上扬。动画展示其搭接高差。','区分短单昂与向金柱延伸的长斜件。');
 b.part('单昂',curvedAng([0,107,front+26],176),undefined,scope,[0,85,30]);
 b.part('菊花头斜件',longSlopingBeam([0,149,4],274,86,16,true),undefined,'侧面卷草为形态简化，真实雕刻与接头待核对。',[0,95,-30]);
 b.part('麻叶云',cloudPanel([0,115,42],.8),undefined,'轮廓化装饰承托。'+scope);
 b.step('第二层厢栱与正心枋','把厢栱及正心枋分别落在第二层承托位置，补上两端斗。','长短枋材按编号对位。');
 for(const [i,z]of [front+58,front+5,front-47].entries())transverseRow(b,['檐外厢栱','正心厢栱','壁内厢栱'][i],z,116,140,159+i*5);
 b.part('正心枋 · 下',notchedBeam(166,26,18,[0,149,front+5],'x',[{x:0,w:18,h:10}],true));
 b.step('后起斜梁与三福云','长斜梁由前端斗栱向后方金柱上升，放入对应云形承托。','两端高度不同；不得用本展示比例直接加工。');
 b.part('单昂后起六分头',longSlopingBeam([0,176,0],306,112,17,false),undefined,scope,[0,100,-35]);
 b.part('三福云 · 中层',cloudPanel([0,156,-58],.86),undefined,scope);
 b.step('安放蚂蚱头','短蚂蚱头横向收口，长蚂蚱头继续朝金柱上方伸展。','观察两件的上下顺序和方向。');
 b.part('蚂蚱头',headBeam(172,25,17,[0,168,front+19],'z','taper',2),undefined,scope);
 b.part('蚂蚱头后起六分头',longSlopingBeam([0,198,-6],321,114,17,true),undefined,scope,[0,100,-35]);
 b.part('三福云 · 金柱侧',cloudPanel([0,211,back+5],.9),undefined,scope);
 b.step('补齐上部慢栱与正心枋','在前端斗栱和金柱上方分别补齐横向慢栱、正心枋。','上部枋件的中心槽与纵向斜件对应。');
 transverseRow(b,'上层慢栱',front+45,160,183,184);
 transverseRow(b,'金柱正心瓜栱',back,220,246,104);
 b.part('正心枋 · 中',notchedBeam(184,25,18,[0,191,front],'x',[{x:0,w:18,h:10}],true));
 b.part('正心枋 · 上',notchedBeam(190,25,18,[0,224,25],'x',[{x:0,w:18,h:11}],true));
 b.step('布置撑头木与夔龙尾','把撑头木放在中上部，再安放向金柱延伸的长夔龙尾。','构件侧面的云纹仅表现轮廓，隐藏接头待核对。');
 b.part('撑头木',headBeam(180,24,18,[0,216,42],'z','taper',2));
 b.part('撑头木后起秤杆',longSlopingBeam([0,229,-4],326,106,16,true),undefined,scope,[0,100,-35]);
 b.part('夔龙尾',longSlopingBeam([0,258,-13],331,100,16,false),undefined,scope,[0,100,-35]);
 b.step('安放桁枋与槽桁碗','三组桁枋分别落在檐外、正心和金柱端，为上部圆桁确定高度。','分别核对三个层位，圆桁长轴沿檐口方向。');
 const caps=[{name:'挑檐',z:front+60,y:210,len:194},{name:'正心',z:30,y:250,len:200},{name:'老檐',z:back,y:307,len:155}];
 for(const c of caps){
  b.part(c.name+'枋',notchedBeam(c.len,23,20,[0,c.y,c.z],'x',[{x:0,w:18,h:10}],true));
  // Curved saddle is a visible profile, not a claim about the actual joinery.
  const rr=14,p=[[-c.len*.48,8],[-rr,8]];for(let a=Math.PI;a<=Math.PI*2+.001;a+=Math.PI/12)p.push([Math.cos(a)*rr,8+Math.sin(a)*rr*.7]);p.push([c.len*.48,8],[c.len*.48,-8],[-c.len*.48,-8]);
  b.part(c.name+'槽桁碗',profile(p,23,[0,c.y+19,c.z]));
 }
 b.step('安放三道圆桁','挑檐桁、正心桁与老檐桁依次落位。转动模型，观察前低后高的整体关系。','展示模型不包含真实鎏金工序；尺寸、配合和稳定性需样件核验。');
 for(const c of caps)b.part(c.name+'桁',cylinder(c.len+12,14,[0,c.y+38,c.z]));
 return await b.write();
}

function validate(model){
 assert(model.parts.length>20&&model.parts.length<220,model.id+' part count');
 const ids=new Set(model.parts.map(p=>p.id));assert.equal(ids.size,model.parts.length);
 for(const p of model.parts){assert(p.positions.length%9===0&&p.positions.length>0,p.id+' triangles');assert(p.positions.every(Number.isFinite));assert(p.size.every(n=>n>0));assert(model.steps[p.installStep]?.partIds.includes(p.id));}
 for(const step of model.steps){assert(step.partIds.length>0,model.id+' empty step');assert(step.partIds.every(id=>ids.has(id)));assert(step.title&&step.text&&step.check);}
 assert(model.size.every(n=>Number.isFinite(n)&&n>0&&n<650));
 assert(!/\.pdf|\/page-|[A-Z]:[\\/]/i.test(JSON.stringify(model)),'No source document paths in public model');
 return {id:model.id,parts:model.parts.length,steps:model.steps.length,size:model.size,triangles:model.parts.reduce((s,p)=>s+p.positions.length/9,0)};
}

const result=[];for(const n of [5,6,7,8])result.push(validate(await makeUpper(n)));
result.push(validate(await makeCorner()),validate(await makeMing()));
console.log(JSON.stringify({models:result,totalParts:result.reduce((n,m)=>n+m.parts,0),status:'validated'},null,2));
