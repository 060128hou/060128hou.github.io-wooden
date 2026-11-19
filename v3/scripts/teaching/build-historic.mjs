import {ModelBuilder,T,arch,cup,box,profile,cylinder} from './geometry.mjs';

// These are proportional display reconstructions of visible construction.
// Hidden mortises, joint clearances and insertion paths are not machining data.
const NOTE='比例展示分件。隐藏榫口、实际尺寸与装入路径需结合实体料包确认。';
const results=[];

function tapered(w,d,h,pos){
 const g=new T.CylinderGeometry(1,.76,h,4,1).toNonIndexed();
 g.rotateY(Math.PI/4);g.scale(w/Math.SQRT2,1,d/Math.SQRT2);g.translate(...pos);return g;
}
function uCup(w,d,h,pos,axis='x'){
 const [x,y,z]=pos,slot=Math.min(w,d)*.55,gs=[tapered(w,d,h*.58,[x,y-h*.21,z])];
 if(axis==='x')for(const sign of [-1,1])gs.push(box([w,h*.42,(d-slot)/2],[x,y+h*.29,z+sign*(d+slot)/4]));
 else for(const sign of [-1,1])gs.push(box([(w-slot)/2,h*.42,d],[x+sign*(w+slot)/4,y+h*.29,z]));
 return gs;
}
function plate(w,d,h,pos){return [tapered(w,d,h*.75,[pos[0],pos[1]-h*.125,pos[2]]),box([w,h*.25,d],[pos[0],pos[1]+h*.375,pos[2]])];}
function notchedBeam(w,h,d,pos,slot=20,notch=9,relief=true){
 const b=-h/2,t=h/2,l=w/2,n=slot/2;
 const gs=[profile([[-l,b],[-n,b],[-n,b+notch],[n,b+notch],[n,b],[l,b],[l,t],[-l,t]],d,pos,'x')];
 if(relief){
  // Shallow side profiles make the hidden-carved arch motif legible while the
  // core is still a continuous timber. These are display reliefs, not toolpaths.
  for(const side of [-1,1])gs.push(arch(w*.87,h*.77,1.5,[pos[0],pos[1]+h*.03,pos[2]+side*(d/2+.5)],'x',slot));
 }
 return gs;
}
function withPeg(gs,x,y,z){return [...gs,cylinder(6,2.1,[x,y,z],'y')];}
function purlinBearing(length,h,d,pos){
 const l=length/2;
 return profile([[-l,-h*.25],[-l*.92,-h/2],[-13,-h/2],[-13,-h*.18],[13,-h*.18],[13,-h/2],[l*.92,-h/2],[l,-h*.25],[l,h/2],[-l,h/2]],d,pos,'x');
}
function scaleHeight(m,factor){
 // Keep the historic low, broad silhouette rather than a tall generic tower.
 for(const p of m.parts){p.position[1]*=factor;p.size[1]*=factor;p.travel[1]*=factor;for(let i=1;i<p.positions.length;i+=3)p.positions[i]*=factor;}
}

async function dule(){
 const m=new ModelBuilder({id:'dule-shanmen',title:'独乐寺山门檐侧斗拱',subtitle:'辽代山门 · 两跳华栱与两椽栿',category:'建筑节点',order:null,description:'从单个栌斗向上观察两跳华栱、隐刻柱头枋与两椽栿的组合，辨认外挑令栱、承椽枋和撩檐槫的位置。保留山门节点紧凑而厚重的形态。'});
 m.step('栌斗定向','栌斗十字口朝上，先辨认前后的出跳方向和左右的墙面方向。','底面平放，构件中线与后续栱件方向一致。');
 m.part('栌斗',cup(66,62,34,[0,17,0],22),undefined,NOTE);

 m.step('泥道栱落位','把泥道栱沿左右方向放入栌斗，中央缺口朝上。');
 m.part('泥道栱',arch(128,34,22,[0,37,0],'x',22),undefined,NOTE);
 m.step('泥道栱散斗','两只散斗分置泥道栱两端，斗口的通向与下一层柱头枋一致。');
 for(const x of [-48,48])m.part(`泥道栱散斗 · ${x<0?'左':'右'}`,uCup(30,28,18,[x,63,0],'x'),undefined,NOTE);

 m.step('第一跳华栱','第一跳华栱沿前后方向落位，与泥道栱正交。中央槽口对准中线。');
 m.part('第一跳华栱',arch(196,37,22,[0,65.5,0],'z',22),undefined,NOTE);
 m.step('第一跳外跳散斗','在第一跳华栱的两端安放散斗，为上层正交构件形成承托。');
 for(const z of [-78,78])m.part(`第一跳散斗 · ${z<0?'内':'外'}`,uCup(30,28,18,[0,93,z],'x'),undefined,NOTE);

 m.step('下层隐刻慢栱枋','落下带隐刻慢栱轮廓的柱头枋，平直枋身沿左右方向伸展。','这件是枋身上的隐刻轮廓，不要与独立慢栱混淆。');
 m.part('柱头枋隐刻慢栱 · 下层',notchedBeam(184,34,22,[0,88,0],24,11),undefined,NOTE);

 m.step('第二跳华栱','把更长的第二跳华栱沿前后方向放置，外端出挑距离大于第一跳。');
 m.part('第二跳华栱',arch(270,42,22,[0,111,0],'z',24),undefined,NOTE);
 m.step('平盘斗与交互斗','壁内端安放平盘斗，檐外端安放交互斗，按名称核对两端形状。');
 m.part('平盘斗 · 壁内',plate(34,30,9,[0,136.5,-118]),undefined,NOTE);
 m.part('交互斗 · 檐外',cup(34,32,18,[0,141,118],20),undefined,NOTE);

 m.step('隐刻瓜子栱枋','横向安放柱头枋隐刻瓜子栱，中央避让位置对准纵向华栱。');
 m.part('柱头枋隐刻瓜子栱',notchedBeam(212,40,24,[0,150,0],24,13),undefined,NOTE);

 m.step('檐外令栱','把令栱横放在檐外交互斗上，两端卷杀向上。');
 m.part('檐外令栱',arch(202,32,22,[0,166,118],'x',24),undefined,NOTE);
 m.step('令栱端部散斗','分别在令栱的左右两端放置散斗，对准顶部替木的承托方向。');
 for(const x of [-80,80])m.part(`令栱散斗 · ${x<0?'左':'右'}`,uCup(32,28,18,[x,191,118],'x'),undefined,NOTE);

 m.step('两椽栿与外耍头','两椽栿的厚实长身伸向壁内，外耍头朝檐口。沿中线落位，观察两侧枋身的避让。','隐藏榫口及实物的插入先后仍需核对。');
 m.part('两椽栿带外耍头',profile([[-170,163],[-170,216],[-25,216],[-25,210],[118,210],[137,204],[143,193],[138,183],[129,177],[-12,177],[-12,163]],34,[0,0,0],'z'),undefined,NOTE,[0,75,-24]);
 m.step('齐心鼓斗','在外耍头上安放齐心鼓斗，斗口对准上方替木。');
 m.part('齐心鼓斗',uCup(36,32,18,[0,219,118],'x'),undefined,NOTE);

 m.step('上层隐刻慢栱枋','上层柱头枋沿墙面方向落位，隐刻慢栱轮廓与下层相呼应。');
 m.part('柱头枋隐刻慢栱 · 上层',notchedBeam(232,39,24,[0,224.5,0],36,13),undefined,NOTE);
 m.step('承椽枋','将承椽枋放在墙中上层柱头枋上，保持左右方向水平。');
 m.part('承椽枋',box([240,30,24],[0,259,0]),undefined,NOTE);

 m.step('安放替木','替木长边与檐口平行，落在外侧散斗与齐心鼓斗形成的承托线上。');
 m.part('替木',purlinBearing(224,17,30,[0,236.5,118]),undefined,NOTE);
 m.step('落下撩檐槫','圆形撩檐槫沿左右方向放到替木上，核对圆木轴线。','圆木的实物止滚与固定连接需要结合料包确认。');
 m.part('撩檐槫',cylinder(244,15,[0,260,118],'x'),undefined,NOTE);

 m.step('整体核对','转动模型，比较两跳华栱的出挑、两椽栿的内外方向和顶部两道承托。','本模型展示可见形态；不作为古建结构设计或加工参数。');
 const out=await m.write();results.push(out);
}

function addCrossBeam(m,name,z,y,w=132,h=26){m.part(name,notchedBeam(w,h,18,[0,y,z],20,9),undefined,NOTE);}
function addEndCups(m,name,positions,y,width=26){for(const [i,[x,z]]of positions.entries())m.part(`${name} · ${i+1}`,uCup(width,24,16,[x,y,z],'x'),undefined,NOTE);}
function curvedBridge(z0,z1,bottom,top,depth=23){
 const a=z0,b=z1,span=b-a;
 return profile([[a,bottom+6],[a+span*.06,bottom],[a+span*.17,bottom+2],[a+span*.29,top-18],[b-span*.29,top-18],[b-span*.17,bottom+2],[b-span*.06,bottom],[b,bottom+6],[b,top-14],[b-span*.17,top-9],[b-span*.28,top],[a+span*.28,top],[a+span*.17,top-9],[a,top-14]],depth,[0,0,0],'z');
}
function humpBeam(a,b,bottom,h,{hump='outer'}={}){
 // A half-camel-back support and an arch end, with the raised shoulder facing
 // the connecting clear span. Shape differs from a plain rectangular beam.
 const p=hump==='outer'?[[a,bottom],[a+22,bottom+9],[b-29,bottom+9],[b-12,bottom+6],[b,bottom+10],[b-5,bottom+17],[b-22,bottom+23],[b-22,bottom+h],[a+34,bottom+h],[a,bottom+5]]:
 [[a,bottom+10],[a+12,bottom+6],[a+29,bottom+9],[b-22,bottom+9],[b,bottom],[b,bottom+5],[b-34,bottom+h],[a+22,bottom+h],[a+22,bottom+23],[a+5,bottom+17]];
 return profile(p,20,[0,0,0],'z');
}
function longPointBeam(a,b,y,h,depth=20){
 return profile([[a,y-h/2],[a+20,y-h/2],[a+30,y-h/2+5],[b-28,y-h/2+5],[b-18,y-h/2],[b,y-h/2+7],[b-21,y+h/2],[a+30,y+h/2],[a,y-h/2+4]],depth,[0,0,0],'z');
}
function downAng(m,name,a,b,tailY,tipY){
 m.part(name,profile([[a,tailY],[a+14,tailY],[b,tipY+7],[b-3,tipY],[b-16,tipY+4],[a,tailY-18]],17,[0,0,0],'z'),undefined,NOTE,[0,60,30]);
 return z=>tailY+(tipY+7-tailY)*(z-a)/(b-a);
}

async function foguang(variant=false){
 const id=variant?'foguang-yan':'foguang-shan';
 const m=new ModelBuilder({id,title:variant?'佛光寺山侧斗拱 · 梁枋异版':'佛光寺东大殿山侧斗拱',subtitle:variant?'唐代木构 · 山侧梁枋布置异版':'唐代木构 · 山侧内外槽柱头铺作',category:'建筑节点',order:null,description:variant?'同一山侧节点的梁枋资料异版。沿内外槽双承托观察上部梁枋与枋头的分件关系；以可见形态重建，尚未核定两个资料版本的实体差异。':'由内外槽两组柱头铺作和横跨其间的乳栿组成。观察下层承托、双下昂、长梁与上部平棊枋的关系，体会唐代木构横向舒展的层次。'});
 const inner=-140,outer=140;
 m.step('确定内外槽基准','把承托底木横放，辨认壁内与檐外两组栌斗的基准位置。','底木作为资料中的展示承托，不能代替真实建筑柱网。');
 m.part('展示承托底木',box([53,10,333],[0,5,0]),undefined,'展示承托底木，用于保持内外槽位置。');
 m.step('内外槽栌斗','两只栌斗口向上，分别落在内槽与外槽位置，保持同一出跳轴线。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])m.part(`${name}栌斗`,cup(53,49,25,[0,22.5,z],18),undefined,NOTE);
 m.step('两组泥道栱','在内外槽栌斗上分别横放泥道栱，方向均与乳栿的长轴正交。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])m.part(`${name}泥道栱`,arch(86,23,18,[0,39,z],'x',18),undefined,NOTE);
 m.step('泥道栱散斗','在两组泥道栱的端部成对安放散斗，核对内外槽各自的左右方向。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])addEndCups(m,`${name}泥道散斗`,[[-31,z],[31,z]],58.5);
 m.step('内外槽第一跳华栱','各自安放第一跳华栱，沿纵向伸展；两组华栱共同指向出檐方向。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])m.part(`${name}第一跳华栱`,arch(122,27,18,[0,65,z],'z',18),undefined,NOTE);
 m.step('第一跳华栱散斗','在第一跳华栱两端安放散斗，形成乳栿和后续枋材的承托。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])addEndCups(m,`${name}华栱散斗`,[[0,z-49],[0,z+49]],86.5);
 m.step('三铺隐刻慢栱枋','两道三铺柱头枋横向就位，隐刻慢栱的一面朝向外侧。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])addCrossBeam(m,`${name}慢栱隐刻柱头枋 · 三铺`,z,84,132,28);

 m.step('明乳栿横跨内外槽','长明乳栿连系内外槽两组铺作，中央抬高的梁身跨过两组承托间的空隙。','两端先对位；动画为展示落位，隐藏接头需实物确认。');
 m.part('明乳栿带华头子',curvedBridge(-211,211,93,130,25),undefined,NOTE,[0,75,0]);
 m.step('明乳栿端部斗','在明乳栿两端安放相应斗口，分别辨认交互斗和华栱散斗。');
 m.part('明乳栿外端交互斗',cup(28,25,16,[0,124,195],16),undefined,NOTE);
 m.part('明乳栿内端华栱散斗',uCup(27,24,16,[0,124,-195],'x'),undefined,NOTE);

 m.step('四铺隐刻瓜栱枋','四铺柱头枋沿横向落位，继续保持两组内外槽承托的对应关系。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])addCrossBeam(m,`${name}瓜栱隐刻柱头枋 · 四铺`,z,118,135,27);
 m.step('半驼峰与第三跳华栱','外槽安放素枋带半驼峰，内槽安放当驼峰带第三跳华栱，两个隆起肩部朝向梁间。');
 m.part('素枋带半驼峰 · 外槽',humpBeam(62,213,128,31,{hump:'outer'}),undefined,NOTE);
 m.part('当驼峰带第三跳华栱 · 内槽',humpBeam(-216,-52,128,31,{hump:'inner'}),undefined,NOTE);
 m.part('外槽半驼峰交互斗',cup(28,25,16,[0,165,190],16),undefined,NOTE);
 m.part('内槽第三跳华栱散斗',uCup(27,24,16,[0,165,-192],'x'),undefined,NOTE);

 m.step('五铺柱头枋','两道五铺枋横向落位，观察慢栱隐刻轮廓与下层叠合的关系。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])addCrossBeam(m,`${name}慢栱隐刻柱头枋 · 五铺`,z,154,140,27);
 m.step('中层挑尖华栱','把长素枋沿内外槽轴线定位，挑尖华栱伸出外端，梁身横跨两组铺作。');
 m.part('素枋隐刻华头子带挑尖华栱',longPointBeam(-224,237,179,26,22),undefined,NOTE);
 m.step('瓜子栱与令栱','在本层纵向构件的两端设置正交栱件，外侧放瓜子栱，内侧放令栱。');
 m.part('中层外瓜子栱',arch(125,26,18,[0,183,205],'x',18),undefined,NOTE);
 m.part('中层内令栱',arch(126,26,18,[0,183,-194],'x',18),undefined,NOTE);
 m.step('中层栱端散斗','在中层横栱端部放置散斗，分别核对两端斗口的方向。');
 addEndCups(m,'中层外散斗',[[-46,205],[46,205]],204);
 addEndCups(m,'中层内散斗',[[-47,-194],[47,-194]],204);

 m.step('第一下昂','下昂沿出跳方向斜置，昂头向檐外下垂、昂尾指向壁内上方。','真实插入轨迹与暗榫避让未由此展示模型求解。');
 const firstY=downAng(m,'第一下昂',-52,274,232,116);
 m.step('第一骑昂斜斗','骑昂斜斗坐在第一下昂外侧，斗口留给横向慢栱。');
 const y1=firstY(236);
 m.part('第一骑昂斜斗',cup(29,27,16,[0,y1+8,236],17),undefined,NOTE);
 m.step('第一昂层慢栱','横向放置慢栱，两端将承托该层向外的枋材。');
 const g1=y1+28;
 m.part('第一昂层慢栱',arch(134,25,18,[0,g1,236],'x',18),undefined,NOTE);
 m.step('第一昂层散斗','慢栱两端安放散斗，再次核对出跳距离。');
 addEndCups(m,'第一昂层散斗',[[-49,236],[49,236]],g1+20.5);

 m.step('六铺柱头枋与平棊枋','内外槽的六铺柱头枋横向就位，平棊枋沿纵向组合，保留两道正交关系。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])addCrossBeam(m,`${name}瓜栱隐刻柱头枋 · 六铺`,z,190,145,27);
 m.part('平棊枋带枇竹',profile([[-230,204],[-194,204],[-194,209],[66,209],[85,215],[-52,225],[-183,225]],19,[0,0,0],'z'),undefined,NOTE);
 m.part('平棊枋 · 中段',box([128,18,16],[0,210,22]),undefined,NOTE);

 m.step('第二下昂','在更高一层定位第二下昂，比较两根昂的出跳长度和高度差。');
 const secondY=downAng(m,'第二下昂',-77,299,266,150);
 m.step('第二骑昂斗','第二骑昂斗位于上层下昂的外侧，沿斜面定位后检查斗口水平。');
 const y2=secondY(260);
 m.part('第二骑昂斗',cup(29,27,16,[0,y2+8,260],17),undefined,NOTE);
 m.step('上层令栱与散斗','上层令栱与下层慢栱平行，斗口和左右端部对应高亮位置。');
 const g2=y2+28;
 m.part('上层外令栱',arch(142,25,18,[0,g2,260],'x',18),undefined,NOTE);
 addEndCups(m,'上层令栱散斗',[[-53,260],[53,260]],g2+20.5);

 m.step('外耍头与齐心斗','外耍头沿出跳方向落在上层昂前端，外端略向下卷杀；齐心斗在其上承托。');
 m.part('外耍头',profile([[181,g2+14],[277,g2+14],[288,g2+6],[289,g2-3],[282,g2-9],[259,g2-7],[181,g2-7]],19,[0,0,0],'z'),undefined,NOTE);
 m.part('外耍头齐心斗',cup(29,27,16,[0,g2+22,260],17),undefined,NOTE);

 m.step('七铺柱头枋与翼型栱','两道七铺枋横向落位，在内槽中心放置短翼型栱，连接上部里耍头。');
 for(const [name,z]of [['内槽',inner],['外槽',outer]])addCrossBeam(m,`${name}柱头枋 · 七铺`,z,225,149,25);
 m.part('翼型栱',arch(47,24,22,[0,243,inner],'x',17),undefined,NOTE);
 m.step('里耍头与交互斗','里耍头沿内槽纵向放置，内端卷杀朝壁内，交互斗在内端定位。');
 m.part('里耍头',profile([[-233,238],[-219,230],[-195,231],[-69,231],[-69,257],[-207,257],[-219,251],[-229,247]],22,[0,0,0],'z'),undefined,NOTE);
 m.part('里耍头交互斗',cup(30,27,16,[0,264,-207],18),undefined,NOTE);

 m.step('外罗汉枋与替木','将两段外罗汉枋横向落在外跳斗口上，再安放替木，形成撩檐槫承托。');
 const bearingY=g2+43;
 for(const sign of [-1,1])m.part(`外罗汉枋 · ${sign<0?'左':'右'}`,box([59,19,17],[sign*41,bearingY-7,260]),undefined,NOTE);
 m.part('撩檐槫替木',purlinBearing(156,13,24,[0,bearingY+8,260]),undefined,NOTE);
 m.step('撩檐槫','圆木轴线与横向替木一致，落位后观察其与内槽顶层梁枋的高差。');
 m.part('撩檐槫',cylinder(173,12,[0,bearingY+26.5,260],'x'),undefined,NOTE);

 m.step('衬枋头与外承椽枋','在外槽前方放置衬枋头及横向承椽枋，连接向外挑出的上部梁枋。');
 const capZ=variant?189:195,capY=variant?257:251;
 m.part('外衬枋头',profile([[136,capY-11],[capZ+31,capY-11],[capZ+46,capY-5],[capZ+57,capY+7],[136,capY+7]],21,[0,0,0],'z'),undefined,NOTE);
 m.part('外承椽枋',notchedBeam(147,21,18,[0,capY+17.5,capZ],18,8,false),undefined,NOTE);

 m.step('草乳栿横跨双承托','将上层草乳栿横跨内外槽，核对两端落点。草乳栿与下层明乳栿的高度及轮廓不同。');
 const topY=variant?280:276;
 m.part('草乳栿',profile([[-174,topY-13],[164,topY-13],[164,topY+8],[103,topY+8],[103,topY+14],[-174,topY+14]],22,[0,0,0],'z'),undefined,NOTE,[0,75,0]);
 m.step('八铺华头子','内槽八铺华头子沿纵向伸出，内端平盘承托上部平棊枋。');
 m.part('八铺华头子',profile([[-228,topY-12],[-207,topY-19],[-194,topY-19],[-172,topY-15],[-68,topY-15],[-68,topY+9],[-203,topY+9],[-203,topY+2],[-228,topY+2]],21,[0,0,0],'z'),undefined,NOTE);
 m.part('八铺华头子平盘斗',plate(31,28,8,[0,topY+13,-207]),undefined,NOTE);

 m.step('顶层承椽枋与平棊枋','外槽的承椽枋横向落位，内槽依次组合横向与纵向平棊枋。','此处保留本资料版本的梁枋分组，不推定两个资料版本的实体差异。');
 m.part('八铺承椽枋',notchedBeam(152,22,18,[0,topY+21,outer],19,9,false),undefined,NOTE);
 m.part('平棊枋 · 横向',notchedBeam(149,21,18,[0,topY+21,inner],20,9,false),undefined,NOTE);
 const a=variant?-232:-221,b=variant?-60:-68;
 const teeth=[];for(let z=a+22;z<b-14;z+=19)teeth.push([z,topY+51],[z,topY+47],[z+5,topY+47],[z+5,topY+51]);
 const topPoints=[[a,topY+51],...teeth,[b,topY+51],[b,topY+32],[-130,topY+32],[-130,topY+39],[-151,topY+39],[-151,topY+32],[a,topY+32]];
 m.part('平棊枋 · 纵向',profile(topPoints,18,[0,0,0],'z'),undefined,NOTE);
 m.step('整体核对','转动模型，检查内外槽双承托、明乳栿与草乳栿、两根下昂及上部梁枋之间的关系。','模型为可见形态复原。公差、隐藏分件和实物装配仍需工坊核对。');
 scaleHeight(m,.79);
 const out=await m.write();results.push(out);
}

await dule();await foguang(false);await foguang(true);
for(const m of results){
 const ids=new Set(m.parts.map(p=>p.id));if(ids.size!==m.parts.length)throw Error('Duplicate part IDs: '+m.id);
 const assigned=[];
 for(const [i,s]of m.steps.entries())for(const id of s.partIds){if(!ids.has(id)||m.parts.find(p=>p.id===id).installStep!==i)throw Error('Step mismatch: '+m.id+'/'+id);assigned.push(id);}
 if(assigned.length!==m.parts.length||new Set(assigned).size!==m.parts.length)throw Error('Part assignment mismatch');
 for(const p of m.parts){if(!p.positions.length||p.positions.length%9||p.positions.some(n=>!Number.isFinite(n))||p.position.some(n=>!Number.isFinite(n))||p.size.some(n=>!Number.isFinite(n)||n<=0)||p.travel.some(n=>!Number.isFinite(n)))throw Error('Invalid geometry: '+m.id+'/'+p.id);}
 console.log(JSON.stringify({id:m.id,parts:m.parts.length,steps:m.steps.length,size:m.size,triangles:m.parts.reduce((n,p)=>n+p.positions.length/9,0)}));
}
