import fs from 'node:fs/promises';
import {ModelBuilder,T,arch,cup,box,profile,cylinder} from './geometry.mjs';
import {dougongCase} from '../../public/legacy/dougong.js';

// Display reconstruction of the visible component relationships. Coordinates
// are proportional display units, not measurements or joinery tolerances.
const cn=['','','','','四','五','六','七','八'];
const ord=['','第一','第二','第三','第四','第五'];
const note='展示分件。实际尺寸、暗榫、公差和装入路径需结合实物确认。';
const results=[];
const meta=(id,n,pillar)=>({id,title:`${cn[n]}铺作${pillar?'柱头':'补间'}斗拱`,subtitle:`${n===4?'重栱出单抄插昂':n===5?'重栱出单抄单下昂':n===6?'重栱出单抄双下昂':n===7?'重栱出双抄双下昂':'重栱出双抄三下昂'} · ${pillar?'柱头':'补间'}铺作`,category:pillar?'柱头':'补间',order:n,description:`观察${cn[n]}铺作${pillar?'柱头乳栿与':'补间'}栱架、出跳与上部梁枋的层次。构件可分别选择，并按展示顺序逐层组合。模型为比例形态复原，隐藏连接与实物装配需工坊确认。`});

function facesGeometry(faces){
 const positions=[];
 for(const f of faces)for(let i=1;i<f.vertices.length-1;i++)positions.push(...f.vertices[0],...f.vertices[i],...f.vertices[i+1]);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));return g;
}

async function buildFour(pillar){
 const id='sipu-'+(pillar?'zhutou':'bujian'),m=new ModelBuilder(meta(id,4,pillar));
 const source=dougongCase.geometry({s:100}),idMap={};
 for(const s of source.steps)m.step(s.title,s.text,s.check);
 if(!pillar){
  m.steps[8].title='对位内外要头';
  m.steps[8].text='将要头沿出跳方向定位，檐外端朝向外令栱，内端与壁内栱架相接。';
  m.steps[8].check='补间铺作不设柱头款的大乳栿；核对中线和前后方向。';
  m.steps[10].title='平棊枋与柱头枋';
  m.steps[10].text='在内侧放置平棊枋，中间横向落下柱头枋，端部对准承托斗。';
  m.steps[10].check='核对横向枋材与三排栱架的位置。';
  m.steps[14].text='旋转模型检查栌斗、华栱、插昂、内外令栱和上部枋材的组合。点击构件核对名称和编号。';
 }
 for(const p of source.parts){
  if(!pillar&&p.id==='L01')continue;
  let name=p.name,geoms=[...p.solids.map(s=>box(s.size,s.pos))];
  if(p.meshFaces.length)geoms.push(facesGeometry(p.meshFaces));
  if(!pillar&&p.id==='A02'){
   name='要头';geoms=[profile([[-98,203],[104,203],[137,198],[146,190],[137,177],[123,171],[-98,171]],20,[0,0,0],'z')];
  }
  if(!pillar&&p.id==='F03')name='柱头枋';
  if(!pillar&&p.id==='G05')name='内令栱';
  idMap[p.id]=m.part(name,geoms,p.installStep,note,p.travel);
 }
 for(const s of m.steps){for(const key of ['text','check'])s[key]=s[key].replace(/\b(?:D|G|A|F|L|T|P)\d\d\b/g,old=>idMap[old]||old).replaceAll('说明图','展示分件').replaceAll('原说明','展示顺序').replaceAll('第一图','下层').replaceAll('第二图','上层');}
 const out=await m.write();results.push(out);return out;
}

function buildPedestal(m){
 m.step('栌斗就位','把栌斗放在水平承托面，十字斗口朝上，先确认墙内、檐外两个方向。','斗口向上，基准中线与模型出跳方向一致。');
 m.part('栌斗',cup(64,60,32,[0,16,0],20));
 m.step('安置泥道栱','泥道栱沿墙面左右方向放入栌斗，中央缺口保留给华栱。');
 m.part('泥道栱',arch(116,28,18,[0,32,0],'x',20));
 m.step('安放泥道栱散斗','在泥道栱两端安放成对散斗，斗口保持朝上。');
 for(const x of [-45,45])m.part(`泥道栱散斗 · ${x<0?'左':'右'}`,cup(28,26,18,[x,55,0],18));
}

function stageArch(m,name,length,bottom,top,z,depth=18,notch=18){
 return m.part(name,arch(length,top-bottom,depth,[0,(top+bottom)/2,z],'x',notch));
}
function endCups(m,name,length,bottom,z,width=28){
 const ids=[];
 for(const side of [-1,1])ids.push(m.part(`${name} · ${side<0?'左':'右'}`,cup(width,26,18,[side*(length/2-15),bottom+9,z],18)));
 return ids;
}

async function buildHigher(n,pillar){
 const prefix=['','','','','','wupu','liupu','qipu','bapu'][n],id=prefix+'-'+(pillar?'zhutou':'bujian');
 const m=new ModelBuilder(meta(id,n,pillar));
 const huaCount=n<=6?2:3,angCount=n===5?1:n===8?3:2;
 let rowTop=46,front=0,inner=0,rowLength=116;
 buildPedestal(m);
 for(let i=0;i<huaCount;i++){
  const huaBottom=i===0?39:rowTop+9,huaTop=huaBottom+26;
  const length=148+i*58,cz=5+i*10;
  front=cz+length/2-12;inner=cz-length/2+12;
  const level=ord[i+1];
  m.step(`${level}跳华栱`,`将${level}跳华栱沿前后出跳方向落位，与横向栱件正交，长端朝檐外。`,`辨认${level}跳，核对前后两端与中线。`);
  m.part(`${level}跳华栱`,arch(length,26,18,[0,(huaBottom+huaTop)/2,cz],'z',20));
  m.step(`${level}跳交互斗`,`在本跳华栱的内、外端分别安放交互斗，为横向栱件预留承托口。`);
  m.part(`${level}跳交互斗 · 檐外`,cup(30,28,18,[0,huaTop+9,front],18));
  m.part(`${level}跳交互斗 · 壁内`,cup(30,28,18,[0,huaTop+9,inner],18));
  const newTop=huaTop+38;
  rowLength=138+i*36;
  m.step(`${level}层横栱`,`横向安放${i===0?'瓜子栱与壁内慢栱':'本层瓜子栱、慢栱'}。檐外、墙中、壁内三排各自对准下方承托。`);
  stageArch(m,`${level}层外瓜子栱`,rowLength,huaTop+10,newTop,front);
  stageArch(m,`${level}层壁内慢栱`,rowLength+16,rowTop+10,newTop,0);
  stageArch(m,`${level}层内瓜子栱`,rowLength,huaTop+10,newTop,inner);
  m.step(`${level}层散斗`,`沿三排横栱的两端安放散斗，按左右、内外方向逐对核对。`);
  endCups(m,`${level}层檐外散斗`,rowLength,newTop,front);
  endCups(m,`${level}层墙中散斗`,rowLength+16,newTop,0);
  endCups(m,`${level}层壁内散斗`,rowLength,newTop,inner);
  rowTop=newTop;
 }

 if(pillar){
  m.step('定位乳栿','乳栿大端伸向壁内，曲线下缘与墙中栱架相接。先辨认昂尾的避让位置，再按动画定位。','乳栿与昂尾的隐藏连接尚待实物校核。');
  const top=rowTop+66,rear=inner-85;
  m.part('乳栿',profile([[rear,top],[rear+42,top],[rear+78,top-8],[rear+110,top-24],[-8,rowTop+26],[-8,rowTop-2],[rear,top-35]],40,[0,0,0],'z'),undefined,note,[0,85,-20]);
 }else{
  m.step('安放里耍头','将里耍头沿墙中前后方向定位，核对内端与内排栱架的对应位置。');
  m.part('里耍头',profile([[inner-28,rowTop+22],[front-8,rowTop+22],[front+9,rowTop+15],[front+16,rowTop+7],[front+2,rowTop-1],[inner-28,rowTop-1]],18,[0,0,0],'z'));
 }

 for(let i=0;i<angCount;i++){
  const number=angCount===1?'':ord[i+1],oldFront=front;
  front+=34;
  const tip=front+24,rear=inner-65-i*12,at=rowTop+10,slope=.30;
  const tailY=at+slope*(tip-rear),tipY=at;
  const points=[[rear,tailY],[rear+18,tailY-3],[tip-8,tipY+10],[tip,tipY+2],[tip-6,tipY-4],[rear,tailY-18]];
  m.step(`定位${number}下昂`,`把${number}下昂的昂头朝檐外下斜、昂尾向壁内上挑。按当前高亮位置定位，避免与已装枋件混淆。`,'动画展示相对落位；真实暗榫插入方向和干涉需实物确认。');
  m.part(`${number}下昂`,profile(points,18,[0,0,0],'z'),undefined,note,[0,85,30]);
  const riderBottom=at+slope*(tip-front)+5;
  m.step(`安放${number}骑昂斗`,`将骑昂斗安放在本层昂头后方的承托位置，斗口向上，为外横栱留出方向。`);
  m.part(`${number}骑昂斗`,cup(32,30,18,[0,riderBottom+9,front],18));
  const newTop=rowTop+58;
  rowLength+=22;
  m.step(`${number}昂层横栱`,`${i===angCount-1?'外侧安放令栱':'外侧安放瓜子栱'}，墙中与内侧安放相应慢栱。三排横栱构成继续向上承托的层次。`);
  stageArch(m,i===angCount-1?'外令栱':`${number}昂层外瓜子栱`,rowLength,riderBottom+10,newTop,front);
  stageArch(m,`${number}昂层墙中慢栱`,rowLength+14,rowTop+10,newTop,0);
  stageArch(m,`${number}昂层内慢栱`,rowLength,rowTop+10,newTop,inner);
  // The next outward course rests on a projected diagonal; the previous
  // projecting row remains visible below it as in the layered source model.
  m.step(`${number}昂层散斗`,`在当前三排栱件的两端配对安放散斗；核对新一层的出跳距离与下层不同。`);
  endCups(m,`${number}昂层檐外散斗`,rowLength,newTop,front);
  endCups(m,`${number}昂层墙中散斗`,rowLength+14,newTop,0);
  endCups(m,`${number}昂层壁内散斗`,rowLength,newTop,inner);
  rowTop=newTop;
 }

 m.step('外耍头与齐心斗','外耍头沿前后方向安放，外端朝檐口；在高亮处安放齐心斗。');
 m.part('外耍头',profile([[inner-12,rowTop+30],[front+14,rowTop+30],[front+32,rowTop+23],[front+40,rowTop+13],[front+28,rowTop+5],[inner-12,rowTop+5]],18,[0,0,0],'z'));
 m.part('齐心斗',cup(30,28,18,[0,rowTop+39,front-4],18));

 m.step('内侧平棊枋','在壁内一排散斗上安放平棊枋；柱头款在中间给乳栿与昂尾预留空间。');
 const capW=rowLength+30,capBottom=rowTop+10;
 for(const side of [-1,1])m.part(`平棊枋 · ${side<0?'左':'右'}`,box([capW/2-17,30,18],[side*(capW/4+8.5),capBottom+15,inner]));

 m.step('柱头枋与罗汉枋','横向安放墙中柱头枋与外侧罗汉枋，端部落在成对散斗上。中央缺口对准纵向构件。');
 m.part('柱头枋',profile([[-capW/2,capBottom],[-13,capBottom],[-13,capBottom+9],[13,capBottom+9],[13,capBottom],[capW/2,capBottom],[capW/2,capBottom+34],[-capW/2,capBottom+34]],18,[0,0,0],'x'));
 m.part('外罗汉枋',profile([[-capW/2,capBottom],[-15,capBottom],[-15,capBottom+24],[15,capBottom+24],[15,capBottom],[capW/2,capBottom],[capW/2,capBottom+40],[-capW/2,capBottom+40]],18,[0,0,front],'x'));

 m.step('撩檐枋与衬枋头','沿檐口落下撩檐枋，再把衬枋头沿出跳方向安放。核对两种正交方向。');
 m.part('撩檐枋',box([capW,22,18],[0,rowTop+61,front]));
 m.part('衬枋头',profile([[inner-15,rowTop+44],[front+15,rowTop+44],[front+28,rowTop+50],[front+39,rowTop+62],[front+47,rowTop+66],[front+47,rowTop+70],[inner-15,rowTop+70]],24,[0,0,0],'z'));
 m.step('替木承托','替木沿左右方向放置，中心对准衬枋头，为顶部圆木提供连续承托。');
 m.part('替木',box([Math.min(220,rowLength),14,26],[0,rowTop+77,front]));
 m.step('落下牛脊槫','让牛脊槫的圆木轴线与替木长边保持一致，缓缓落到承托位置。','复核圆木的轴向、滚动约束和实际接头。');
 m.part('牛脊槫',cylinder(Math.min(250,rowLength+28),13,[0,rowTop+97,front],'x'));

 if(n===6&&!pillar){
  m.step('挑斡令栱外伸','在檐外继续伸出挑斡构件，横向安放挑斡令栱，形成独立的外挑承托。');
  m.part('挑斡枋头',profile([[front-8,rowTop+52],[front+68,rowTop+69],[front+78,rowTop+86],[front+78,rowTop+91],[front-8,rowTop+72]],18,[0,0,0],'z'));
  m.part('挑斡令栱',arch(160,23,18,[0,rowTop+91,front+65],'x',18));
  m.step('挑斡散斗与替木','在挑斡令栱两端安放散斗，再落下外挑替木。');
  endCups(m,'挑斡散斗',160,rowTop+102.5,front+65);
  m.part('挑斡替木',box([160,14,24],[0,rowTop+119.5,front+65]));
  m.step('外挑槫木','让外挑槫木与主槫平行，落在外挑替木上，核对两道圆木的高差。');
  m.part('外挑槫木',cylinder(184,12,[0,rowTop+138.5,front+65],'x'));
 }else if(n===8){
  m.step('承橼枋与第二道槫','在内侧安放承橼枋与第二道替木，形成双槫承托关系。');
  const z=front-70;
  m.part('承橼枋',profile([[inner-10,rowTop+44],[z+12,rowTop+44],[z+12,rowTop+78],[z-8,rowTop+78],[z-15,rowTop+60],[inner-10,rowTop+60]],28,[0,0,0],'z'));
  m.part('内侧替木',box([Math.min(220,rowLength-10),14,26],[0,rowTop+85,z]));
  m.step('安放第二道槫木','安放内侧槫木，比较两道槫木的位置和高度，再检查整个铺作层次。');
  m.part('内侧槫木',cylinder(Math.min(240,rowLength+10),13,[0,rowTop+105,z],'x'));
 }
 m.step('整体核对','旋转模型，核对栌斗、华栱、下昂、内外栱架和梁枋的层次。点选构件可查看名称、编号与安装步骤。','本模型用于形态与顺序展示，实际制作需校核隐藏配合和尺寸。');
 const out=await m.write();results.push(out);return out;
}

await buildFour(false);await buildFour(true);
for(const n of [5,6,7,8])for(const pillar of [false,true])await buildHigher(n,pillar);
for(const m of results){
 const ids=new Set(m.parts.map(p=>p.id));if(ids.size!==m.parts.length)throw Error('Duplicate IDs '+m.id);
 for(const p of m.parts){if(!p.positions.length||p.positions.length%9||p.positions.some(n=>!Number.isFinite(n))||p.size.some(n=>n<=0)||!m.steps[p.installStep]?.partIds.includes(p.id))throw Error('Invalid part '+m.id+'/'+p.id);}
 for(const step of m.steps)for(const id of step.partIds)if(!ids.has(id))throw Error('Unknown step member '+id);
 const counts={id:m.id,parts:m.parts.length,steps:m.steps.length,size:m.size,triangles:m.parts.reduce((n,p)=>n+p.positions.length/9,0)};
 console.log(JSON.stringify(counts));
}
