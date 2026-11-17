import {extrude,taperedBlock,roundBeam} from './mesh.js';

export const DOUGONG_NOTE='依据用户提供的拼装说明图作比例复原。尺寸为展示设定，隐藏榫口、分件和局部前后关系待实物核对。';
const round=n=>Math.round(n*10)/10;
const groups=[
  {title:'第一图 · 底座、华栱与昂',ids:['D01','G01','G02','D02','D03','D04','A01','D05']},
  {title:'第二图 · 上层栱架',ids:['G03','G04','G05','D06','D07','D08','D09','D10','D11','L01','A02','D12']},
  {title:'第三图 · 枋材与槫木',ids:['F01','F02','F03','F04','F05','T01','P01']}
];

export const dougongCase = {
  id:'dougong',name:'宋式四铺作斗拱',subtitle:'重栱出单抄插昂 · 柱头铺作',
  connection:'图示复原',limits:{s:[60,140]},fieldUnit:'%',fieldLabels:{s:'整体显示比例'},
  presets:[{id:'illustrated',name:'标准展示 · 100%',s:100},{id:'small',name:'缩小展示 · 75%',s:75}],
  requirement:'参考拼装说明图，逐件认识宋式四铺作插昂柱头铺作。',
  engineeringNote:DOUGONG_NOTE,
  review:'请结合实体料包核对 27 个展示分件、暗榫、昂尾位置与枋材先后顺序，再审定实际拼装步骤和尺寸。',
  checkRelations:p=>[
    {label:'等比例显示',detail:`显示比例 ${p.s}%。构件、接口标记和动画行程同步缩放。`,ok:true},
    {label:'图示分件',detail:'按三幅说明组织 27 个展示分件，逐件编号对应模型、教程及清单。',ok:true},
    {label:'数据范围',detail:'当前校验覆盖展示数据及动画落位。实物公差、暗榫与尺寸待核对。',ok:true}
  ],
  geometry:dougongGeometry,tableLift:()=>0,pose:dougongPose,
  camera:{yaw:.66,pitch:.38,zoom:1.05},
  reference:{url:new URL('./assets/dougong-reference.jpg',import.meta.url).href,
    title:'宋式斗栱四铺作重栱出单抄插昂柱头铺作拼装说明书',
    credit:'用户提供的原始说明图，图示署名为天津嘉信诚品科技有限公司。'}
};

function bracketProfile(length,bottom,top,{topNotch,bottomNotch}={}) {
  const h=length/2,depth=top-bottom;
  const points=[[-h,top]];
  if(topNotch)points.push([-topNotch.width/2,top],[-topNotch.width/2,topNotch.y],[topNotch.width/2,topNotch.y],[topNotch.width/2,top]);
  points.push([h,top],[h,top-7],[h*.94,top-9],[h*.88,bottom+depth*.55],
    [h*.8,bottom+depth*.23],[h*.7,bottom+depth*.06],[h*.65,bottom]);
  if(bottomNotch)points.push([bottomNotch.width/2,bottom],[bottomNotch.width/2,bottomNotch.y],[-bottomNotch.width/2,bottomNotch.y],[-bottomNotch.width/2,bottom]);
  points.push([-h*.65,bottom],[-h*.7,bottom+depth*.06],[-h*.8,bottom+depth*.23],
    [-h*.88,bottom+depth*.55],[-h*.94,top-9],[-h,top-7]);
  return points;
}

function dougongGeometry(p) {
  const parts=[],joints=[],byId=new Map(),factor=p.s/100;
  const square=(pos,size)=>({pos,size});
  function addPart(id,name,solids,meshFaces,orientation,note,drawing) {
    const points=[...solids.flatMap(s=>[-1,1].flatMap(a=>[-1,1].flatMap(b=>[-1,1].map(c=>
      s.pos.map((v,i)=>v+[a,b,c][i]*s.size[i]/2))))),...meshFaces.flatMap(f=>f.vertices)];
    const low=[0,1,2].map(i=>Math.min(...points.map(v=>v[i])));
    const high=[0,1,2].map(i=>Math.max(...points.map(v=>v[i])));
    const pos=low.map((v,i)=>(v+high[i])/2),box=low.map((v,i)=>high[i]-v);
    const group=groups.findIndex(g=>g.ids.includes(id));
    const part={id,name,solids,meshFaces,pos,box,size:[...box].sort((a,b)=>b-a),
      orientation,note,drawing,group,
      labelPoint:[pos[0],high[1],pos[2]],
      offset:[pos[0]*.7,(group+1)*72,Math.abs(pos[2])>25?pos[2]*.75:0]};
    parts.push(part);byId.set(id,part);return part;
  }
  function timber(id,name,profile,thickness,axis,x,z,orientation,note) {
    const minX=Math.min(...profile.map(v=>v[0])),minY=Math.min(...profile.map(v=>v[1]));
    const maxX=Math.max(...profile.map(v=>v[0])),maxY=Math.max(...profile.map(v=>v[1]));
    const drawing={face:'图示侧面 · 比例尺寸',width:maxX-minX,height:maxY-minY,
      outlines:[profile.map(([u,v])=>[u-minX,v-minY])],features:[]};
    return addPart(id,name,[],extrude(profile,thickness,axis,[x,0,z]),orientation,note,drawing);
  }
  function cup(id,name,x,z,bottom,width=36,depth=32,height=22,slot=20,slope=0) {
    const floor=bottom+height*.56;
    const mesh=taperedBlock(x,z,bottom,floor,width,depth,.72,slope),solids=[];
    const earX=(width-slot)/2,earZ=(depth-slot)/2;
    for(const a of [-1,1])for(const b of [-1,1])solids.push(square(
      [x+a*(slot+earX)/2,(floor+bottom+height)/2,z+b*(slot+earZ)/2],[earX,height*.44,earZ]));
    const drawing={face:'斗身正视 · 比例尺寸',width,height,
      outlines:[[[width*.14,0],[width*.86,0],[width,height*.56],[0,height*.56]],
        [[0,height*.56],[earX,height*.56],[earX,height],[0,height]],
        [[width-earX,height*.56],[width,height*.56],[width,height],[width-earX,height]]],features:[]};
    return addPart(id,name,solids,mesh,'斗口向上，按编号对准承托位置。','斗身、斗耳与承托口按图示表现，实际槽口与销位待核对。',drawing);
  }
  function connect(id,name,receiverId,moverId,point) {
    joints.push({id,name,receiverId,moverId,partIds:[receiverId,moverId],point,direction:[0,-1,0]});
  }
  cup('D01','栌斗',0,0,0,78,74,40,22);
  timber('G01','泥道栱',bracketProfile(180,22.4,70,{topNotch:{width:22,y:55}}),20,'x',0,0,
    '沿左右方向，卷杀端向上。','横向置于栌斗，中央留出华栱交接位置。');
  timber('G02','华栱',bracketProfile(220,55,95),20,'z',0,0,
    '沿前后方向，与泥道栱交叉。','展示出跳方向；交叠部位的暗榫待实物复核。');
  cup('D02','下层散斗 · 左',-60,0,70);
  cup('D03','下层散斗 · 右',60,0,70);
  cup('D04','交互斗',0,94,95,38,36);
  const ang=[[-135,205.25],[-70,182.5],[115,117.75],[170,83.5],[170,80.5],[-135,187.25]];
  timber('A01','昂',ang,18,'z',0,0,'昂头向檐外下斜，昂尾向内上挑。','按说明图复原斜置外形；昂尾与乳栿的隐藏配合待核对。');
  cup('D05','骑昂斗',0,72,132.8,38,34,22,22,-.35);
  timber('G03','壁内慢栱',bracketProfile(240,82.32,185,{topNotch:{width:48,y:138},bottomNotch:{width:22,y:95}}),20,'x',0,0,
    '位于墙身中线，与泥道栱平行。','中央缺口为图示避让，承托与隐藏节点待实物核对。');
  timber('G04','外令栱',bracketProfile(220,145.12,185,{topNotch:{width:22,y:171}}),20,'x',0,72,
    '横向放在骑昂斗上，位于檐外。','中央预留耍头位置，两端承托上层散斗。');
  timber('G05','里令栱',bracketProfile(220,140,185,{topNotch:{width:48,y:168}}),20,'x',0,-88,
    '与外令栱平行，位于壁内。','内侧承托位置依据轴测图推定，试装时需辅助扶稳。');
  for(const [row,z] of [72,0,-88].entries())for(const [side,x] of [-84,84].entries()){
    const n=6+row*2+side;
    cup('D'+String(n).padStart(2,'0'),`上层散斗 · ${['檐外','墙中','壁内'][row]}${side?'右':'左'}`,x,z,185);
  }
  timber('L01','乳栿',[[-180,260],[-130,260],[-90,251],[-58,234],[-36,215],[-14,203],
    [-14,164.9],[-180,223]],44,'z',0,0,'长尾朝壁内，端部朝耍头。','按图示独立展示乳栿，底部避让昂尾；原件暗榫和截面待测绘。');
  timber('A02','耍头',[[-14,203],[104,203],[137,198],[146,190],[137,177],[123,171],[-14,171]],20,'z',0,0,
    '尾部对准乳栿，外端出挑。','与乳栿分件展示，实际连接方式及边界待料包核对。');
  cup('D12','齐心斗',0,72,203,34,32,22,20);
  timber('F01','平棊枋 · 左',[[-132,197.32],[-25,197.32],[-25,228],[-132,228]],18,'x',0,-88,
    '位于壁内左侧，留出乳栿位置。','按图中左右分件展示。');
  timber('F02','平棊枋 · 右',[[25,197.32],[132,197.32],[132,228],[25,228]],18,'x',0,-88,
    '位于壁内右侧，留出乳栿位置。','与左侧平棊枋配对核对。');
  timber('F03','罗汉枋',[[-118,197.32],[-13,197.32],[-13,205],[13,205],[13,197.32],
    [118,197.32],[118,231],[-118,231]],20,'x',0,0,
    '沿墙身中线，位于壁内慢栱上方。','两端对准墙中散斗，中央缺口避让耍头。');
  timber('F04','撩檐枋',[[-124,197.32],[-20,197.32],[-20,225],[20,225],[20,197.32],[124,197.32],
    [124,237],[13,237],[13,231],[-13,231],[-13,237],[-124,237]],20,'x',0,72,
    '沿檐口左右方向，跨过齐心斗。','按图示中央缺口与两端承托关系定位。');
  timber('F05','衬枋头',[[-8,231],[95,231],[108,235],[118,244],[138,250],[138,253],[-8,253]],24,'z',0,0,
    '端头朝檐外，沿前后方向放置。','底部轮廓按图示复原，坐落在罗汉枋与撩檐枋交接处。');
  timber('T01','替木',[[-98,253],[98,253],[98,268],[-98,268]],24,'x',0,72,
    '沿左右方向，承托顶部槫木。','图中的定位销暂以承托标记表达，销孔尺寸待确认。');
  const beamProfile=[[-110,0],[110,0],[110,34],[-110,34]];
  addPart('P01','牛脊槫',[],roundBeam(0,285,72,220,17),'圆木轴线沿左右方向。',
    '圆截面按图示比例表现，实际直径、承托方式与开口待实物核对。',
    {face:'圆木侧视 · 比例尺寸',width:220,height:34,outlines:[beamProfile.map(([x,y])=>[x+110,y])],features:[]});

  connect('J01','栌斗承泥道栱','D01','G01',[0,22.4,0]);
  connect('J02','华栱交接','G01','G02',[0,55,0]);
  connect('J03','左散斗定位','G01','D02',[-60,70,0]);
  connect('J04','右散斗定位','G01','D03',[60,70,0]);
  connect('J05','交互斗定位','G02','D04',[0,95,94]);
  connect('J06','昂的图示落位','D04','A01',[0,107.32,94]);
  connect('J07','骑昂斗定位','A01','D05',[0,132.8,72]);
  connect('J08','慢栱定位','D02','G03',[-60,82.32,0]);
  connect('J09','外令栱定位','D05','G04',[0,145.12,72]);
  connect('J10','里令栱图示定位','G02','G05',[0,140,-88]);
  for(let i=0;i<6;i++) {
    const receiver=['G04','G03','G05'][Math.floor(i/2)],mover='D'+String(6+i).padStart(2,'0');
    connect('J'+(11+i),'散斗承托',receiver,mover,[i%2?84:-84,185,[72,0,-88][Math.floor(i/2)]]);
  }
  connect('J17','乳栿图示定位','G05','L01',[0,190,-88]);
  connect('J18','耍头接乳栿','L01','A02',[0,185,-14]);
  connect('J19','齐心斗定位','A02','D12',[0,203,72]);
  connect('J20','左平棊枋定位','D10','F01',[-84,197.32,-88]);
  connect('J21','右平棊枋定位','D11','F02',[84,197.32,-88]);
  connect('J22','罗汉枋定位','D08','F03',[-84,197.32,0]);
  connect('J23','撩檐枋定位','D06','F04',[-84,197.32,72]);
  connect('J24','衬枋头定位','F03','F05',[0,231,0]);
  connect('J25','替木定位','F05','T01',[0,253,72]);
  connect('J26','槫木承托','T01','P01',[0,268,72]);
  const specs=[
    ['栌斗就位',['D01'],'把栌斗放稳，十字口朝上。先以昂头的方向辨认檐外，昂尾朝向壁内。','确认底面和前后方向。'],
    ['落下泥道栱',['G01'],'泥道栱沿左右方向落入栌斗口，中央缺口朝上。','中央交接位置留给下一件华栱。'],
    ['交叉装入华栱',['G02'],'华栱沿前后方向与泥道栱交叉，竖直落到中心交接处。','核对左右与出跳两个方向。'],
    ['安放散斗、交互斗',['D02','D03','D04'],'把两只散斗放在泥道栱两侧，交互斗放在华栱的出跳位置。','按 D02、D03、D04 区分位置，斗口向上。'],
    ['定位斜昂',['A01'],'昂头向檐外下斜，昂尾向壁内上挑。动画沿说明图的拆分方向落位，实物暗榫插入路径待确认。','核对昂头、昂尾方向和交互斗位置。'],
    ['安装骑昂斗',['D05'],'将骑昂斗放到昂上，预留外令栱的承托口。','完成第一图的底层组合。'],
    ['布置上层三栱',['G03','G04','G05'],'中间放壁内慢栱，前后分别放外令栱和里令栱。尚未锁固的部件需要辅助扶稳。','按檐外、墙中、壁内辨认三个位置。'],
    ['安放上层六斗',['D06','D07','D08','D09','D10','D11'],'沿三道栱的两端逐对安放散斗，对照编号核对前、中、后三排。','六只散斗均为斗口朝上。'],
    ['对位乳栿与耍头',['L01','A02'],'乳栿长尾朝壁内，耍头朝檐外。这里按图示关系分件落位，需用实物确认隐藏连接。','昂尾的避让关系与分件边界待核对。'],
    ['安放齐心斗',['D12'],'在耍头上方安放齐心斗，保留顶部枋材的位置。','完成第二图的栱架组合。'],
    ['平棊枋与罗汉枋',['F01','F02','F03'],'壁内两侧放平棊枋，中间一排放罗汉枋。中央给乳栿和耍头留出空间。','核对枋材端部与对应散斗。'],
    ['撩檐枋与衬枋头',['F04','F05'],'檐外横向放撩檐枋，再沿前后方向放衬枋头。动画展示轴测图推定的相对位置。','中央缺口和承托关系需结合料包复核。'],
    ['放置替木',['T01'],'将替木横向放在衬枋头上方，为顶部圆木提供承托。','图中的定位销和销孔需在实体上确认。'],
    ['落下牛脊槫',['P01'],'让圆木轴线与替木的长边一致，平缓放到顶部承托位置。','核对轴线、滚动约束与实际连接。'],
    ['整体核对',[],'旋转模型对照原说明图，检查栌斗、栱架、昂、枋材和槫木的上下关系。点选任一构件可查看编号与档案。','展示分件与动作已适配。尺寸、暗榫及实际插入路径待实物验证。']
  ];
  const steps=specs.map(([title,ids,text,check],i)=>({
    id:'dougong-'+(i+1),title,ids:ids.length?ids:parts.map(v=>v.id),movingIds:ids,
    jointIds:joints.filter(j=>ids.includes(j.moverId)).map(j=>j.id),
    group:i<6?0:i<10?1:2,groupTitle:groups[i<6?0:i<10?1:2].title,
    text,check,duration:i===4?3400:2400
  }));
  for(const part of parts) {
    part.installStep=steps.findIndex(s=>s.movingIds.includes(part.id));
    part.offset[1]=part.installStep*22;
    part.travel=[0,75,0];
    if(part.id==='A01')part.travel=[0,75,35];
    for(const key of ['pos','box','size','offset','labelPoint','travel'])part[key]=part[key].map(n=>round(n*factor));
    part.solids=part.solids.map(s=>({pos:s.pos.map(n=>n*factor),size:s.size.map(n=>n*factor)}));
    part.meshFaces=part.meshFaces.map(f=>({...f,vertices:f.vertices.map(v=>v.map(n=>n*factor))}));
    part.drawing.width=round(part.drawing.width*factor);
    part.drawing.height=round(part.drawing.height*factor);
    part.drawing.outlines=part.drawing.outlines.map(poly=>poly.map(v=>v.map(n=>round(n*factor))));
    part.drawing.note=DOUGONG_NOTE;
  }
  for(const j of joints)j.point=j.point.map(n=>round(n*factor));
  return {parts,joints,steps,groups,dimensions:{w:round(264*factor),h:round(302*factor),d:round(350*factor)},
    dimensionLabel:'比例模型外廓',engineeringNote:DOUGONG_NOTE};
}

function dougongPose(model,index,progress) {
  const t=progress*progress*(3-2*progress),active=model.steps[index];
  return {roll:0,lift:0,activeIds:active.movingIds,jointIds:active.jointIds,
    parts:Object.fromEntries(model.parts.map(part=>[part.id,{
      visible:part.installStep<=index,
      offset:part.travel.map(n=>part.installStep===index?n*(1-t):0)
    }]))};
}
