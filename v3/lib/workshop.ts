export type V3=[number,number,number];
export type Kind='base'|'column'|'beam'|'panel'|'board'|'bracket'|'roof';
export type Face='front'|'back'|'left'|'right'|'top';
export type Ornament={id:string;pattern:string;face:Face;size:number;rotation:number;u:number;v:number};
export type Piece={id:string;kind:Kind;name:string;position:V3;size:V3;rotation:number;patterns:Ornament[]};
export const partCode=(p:Piece)=>'M-'+p.id.replaceAll('-','').slice(0,6).toUpperCase();
export type Design={version:3;title:string;material:'oak'|'walnut'|'cedar';pieces:Piece[];notes:string;catalog?:string};
export type Pattern={id:string;name:string;category:string;url:string;thumbnail:string;width:number;height:number;depth:number};
export type CatalogModel={id:string;title:string;subtitle:string;type:string;compressedUrl:string;size:V3;triangleCount:number;groups:{id:string;name:string;node:string}[]};
export const MODULES:Record<Kind,{name:string;size:V3;description:string;mark:string}>={
 base:{name:'木台座',size:[320,16,240],description:'作品的起点，提供连续的承托面',mark:'▱'},
 column:{name:'方柱',size:[20,100,20],description:'垂直承托，可接斗拱或横梁',mark:'▥'},
 bracket:{name:'斗拱模块',size:[48,32,38],description:'取自原 OBJ；作为一组预装构件',mark:'♜'},
 beam:{name:'横梁',size:[244,18,24],description:'两端分别落在承托构件上',mark:'▬'},
 panel:{name:'装饰屏板',size:[180,80,10],description:'适合添加平面纹饰',mark:'▣'},
 board:{name:'层板',size:[240,12,170],description:'需要至少两处独立承托',mark:'▰'},
 roof:{name:'双坡顶模块',size:[290,45,220],description:'一组预装顶架，需两处承托',mark:'⌂'},
};
export const FACE_NAMES:Record<Face,string>={front:'正面',back:'背面',left:'左面',right:'右面',top:'顶面'};
export const MATERIALS={oak:{name:'原木 · 白蜡',color:'#c5a06b'},walnut:{name:'深色 · 胡桃',color:'#78503a'},cedar:{name:'暖色 · 杉木',color:'#ba7548'}};
export const uid=()=>crypto.randomUUID();
export const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
export function makePiece(kind:Kind,position?:V3):Piece{return {id:uid(),kind,name:MODULES[kind].name,size:[...MODULES[kind].size],position:position||[0,MODULES[kind].size[1]/2,0],rotation:0,patterns:[]};}
export function preset(type='pavilion'):Design{
 const d:Design={version:3,title:type==='empty'?'我的木作':type==='screen'?'一扇花窗':'四柱小亭',material:'oak',pieces:[],notes:''};
 if(type==='empty')return d;
 const base=makePiece('base');d.pieces.push(base);
 if(type==='screen'){const panel=makePiece('panel',[0,56,0]);panel.size=[210,80,12];d.pieces.push(panel);return d;}
 for(const x of [-110,110])for(const z of [-70,70]){d.pieces.push(makePiece('column',[x,66,z]),makePiece('bracket',[x,132,z]));}
 for(const z of [-70,70])d.pieces.push(makePiece('beam',[0,157,z]));
 const roof=makePiece('roof',[0,188.5,0]);d.pieces.push(roof);return d;
}
export function bounds(p:Piece){const r=((p.rotation%180)+180)%180;const s:V3=r===90?[p.size[2],p.size[1],p.size[0]]:[...p.size];return {min:p.position.map((x,k)=>x-s[k]/2)as V3,max:p.position.map((x,k)=>x+s[k]/2)as V3,size:s};}
function overlap(a:ReturnType<typeof bounds>,b:ReturnType<typeof bounds>,epsilon=.7){return [0,1,2].every(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k])>epsilon);}
function covers(box:ReturnType<typeof bounds>,x:number,z:number,margin=1){return x>=box.min[0]-margin&&x<=box.max[0]+margin&&z>=box.min[2]-margin&&z<=box.max[2]+margin;}
export type AssemblyStep={pieceId:string;label:string;supports:string[];direction:V3;from:V3;to:V3;check:string};
export type Assembly={valid:boolean;steps:AssemblyStep[];issues:{id:string;message:string}[];supportMap:Record<string,string[]>};
export function planAssembly(design:Design):Assembly{
 const pieces=design.pieces,issues:Assembly['issues']=[],supportMap:Record<string,string[]>={};
 if(!pieces.length)return {valid:false,steps:[],issues:[{id:'empty',message:'先放置一块木台座，再加入构件。'}],supportMap};
 if(pieces.length>80)issues.push({id:'limit',message:'单件作品最多支持 80 个模块，请拆分作品。'});
 const ids=new Set<string>();
 for(const p of pieces){
  if(ids.has(p.id))issues.push({id:p.id,message:'存在重复的构件编号，请重新导入方案。'});ids.add(p.id);
  if(!Object.hasOwn(MODULES,p.kind)||p.size.some(n=>!Number.isFinite(n)||n<6||n>800)||p.position.some(n=>!Number.isFinite(n)||Math.abs(n)>1500)||!Number.isFinite(p.rotation)||p.rotation%90!==0){issues.push({id:p.id,message:`${p.name} 的尺寸或朝向超出桌面模块范围。`});continue;}
  const box=bounds(p),foot=box.min[1];
  if(foot<-.7)issues.push({id:p.id,message:`${p.name} 低于台面，请上移。`});
  if(p.kind==='base'&&Math.abs(foot)<.7){supportMap[p.id]=[];continue;}
  const possible=pieces.filter(q=>q.id!==p.id&&Math.abs(bounds(q).max[1]-foot)<.8&&overlapXZ(box,bounds(q))).sort((a,b)=>a.id.localeCompare(b.id));
  let supports:Piece[]=[];
  if(p.kind==='beam'){
   const along=p.rotation%180===0?0:2;const a=[...p.position]as V3,b=[...p.position]as V3;a[along]-=p.size[0]/2-12;b[along]+=p.size[0]/2-12;
   const left=possible.find(q=>covers(bounds(q),a[0],a[2])),right=possible.find(q=>covers(bounds(q),b[0],b[2]));
   if(left&&right&&left.id!==right.id)supports=[left,right];
  }else if(p.kind==='roof'||p.kind==='board'){
   supports=possible.filter(q=>covers(box,q.position[0],q.position[2],-3));
   if(supports.length<2||!supports.some(q=>Math.hypot(q.position[0]-supports[0].position[0],q.position[2]-supports[0].position[2])>20))supports=[];
  }else supports=possible.filter(q=>covers(bounds(q),p.position[0],p.position[2])).slice(0,1);
  supportMap[p.id]=supports.map(q=>q.id);
  if(!supports.length)issues.push({id:p.id,message:`${p.name} ${p.kind==='beam'?'需要两端分别对准承托面':p.kind==='roof'||p.kind==='board'?'需要两处独立承托':'尚未对准下方承托面'}。`});
 }
 for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++)if(overlap(bounds(pieces[i]),bounds(pieces[j])))issues.push({id:pieces[i].id,message:`${pieces[i].name} 与 ${pieces[j].name} 重叠，请调整位置。`});
 const remaining=[...pieces].sort((a,b)=>bounds(a).min[1]-bounds(b).min[1]||a.id.localeCompare(b.id)),done=new Set<string>(),steps:AssemblyStep[]=[];
 while(remaining.length){const index=remaining.findIndex(p=>(supportMap[p.id]||[]).every(id=>done.has(id)));if(index<0){issues.push({id:remaining[0].id,message:'连接关系形成循环，无法确定装配顺序。'});break;}
  const p=remaining.splice(index,1)[0],box=bounds(p),from:[number,number,number]=[p.position[0],p.position[1]+Math.max(85,p.size[1]*.7),p.position[2]];
  const swept={...box,min:[...box.min]as V3,max:[box.max[0],from[1]+p.size[1]/2,box.max[2]]as V3};
  const blocker=pieces.find(q=>done.has(q.id)&&!(supportMap[p.id]||[]).includes(q.id)&&overlap(swept,bounds(q)));
  if(blocker)issues.push({id:p.id,message:`${p.name} 的向下装入路径受到 ${blocker.name} 阻挡。`});
  steps.push({pieceId:p.id,label:`${partCode(p)} · 放置${p.name}`,supports:supportMap[p.id]||[],direction:[0,-1,0],from,to:[...p.position],check:p.kind==='base'?'台座平放，核对方向与编号。':p.kind==='bracket'?'本步骤放置预装斗拱组；组内拼装请查看斗拱教程。':`对齐${(supportMap[p.id]||[]).length}处承托，沿箭头向下放置；复核平齐与稳定。`});done.add(p.id);
 }
 return {valid:issues.length===0,steps,issues,supportMap};
}
function overlapXZ(a:ReturnType<typeof bounds>,b:ReturnType<typeof bounds>){return [0,2].every(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k])>1);}
export function snapPiece(p:Piece,pieces:Piece[]):Piece{
 const next=clone(p);next.position=next.position.map(n=>Math.round(n/5)*5)as V3;
 const b=bounds(next),candidates=pieces.filter(q=>q.id!==p.id&&overlapXZ(b,bounds(q))&&Math.abs(bounds(q).max[1]-b.min[1])<18).sort((a,c)=>Math.abs(bounds(a).max[1]-b.min[1])-Math.abs(bounds(c).max[1]-b.min[1]));
 if(candidates[0])next.position[1]=bounds(candidates[0]).max[1]+next.size[1]/2;
 else if(Math.abs(b.min[1])<10)next.position[1]=next.size[1]/2;
 return next;
}
export function designSize(d:Design):V3{if(!d.pieces.length)return[0,0,0];return [0,1,2].map(k=>Math.round(Math.max(...d.pieces.map(p=>bounds(p).max[k]))-Math.min(...d.pieces.map(p=>bounds(p).min[k]))))as V3;}
export function validateDesign(value:unknown):Design{
 const d=value as Design;if(d?.catalog&&!['timber-hall','timber-pavilion','corner-bracket','layered-bracket','legacy-chinese','legacy-dougong','legacy-shelf','legacy-divider'].includes(d.catalog))throw new Error('模型标识无效');if(!d||d.version!==3||typeof d.title!=='string'||d.title.length>100||!['oak','walnut','cedar'].includes(d.material)||!Array.isArray(d.pieces)||d.pieces.length>80||typeof d.notes!=='string'||d.notes.length>3000)throw new Error('方案格式不正确或超出限制');
 const ids=new Set();for(const p of d.pieces){if(!p||typeof p.id!=='string'||p.id.length>80||ids.has(p.id)||!Object.hasOwn(MODULES,p.kind)||typeof p.name!=='string'||p.name.length>80||!Array.isArray(p.size)||p.size.length!==3||p.size.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<6||n>800)||!Array.isArray(p.position)||p.position.length!==3||p.position.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>1500)||!Number.isFinite(p.rotation)||p.rotation%90!==0||!Array.isArray(p.patterns)||p.patterns.length>8)throw new Error('构件参数无效');ids.add(p.id);
 for(const o of p.patterns)if(!o||typeof o.id!=='string'||!/^(pattern)-(0[1-9]|1[0-8])$/.test(o.pattern)||!Object.hasOwn(FACE_NAMES,o.face)||![o.size,o.rotation,o.u,o.v].every(Number.isFinite)||o.size<5||o.size>500||Math.abs(o.u)>400||Math.abs(o.v)>400)throw new Error('纹饰参数无效');}
 return {version:3,title:d.title,material:d.material,pieces:clone(d.pieces),notes:d.notes,...(typeof d.catalog==='string'&&d.catalog.length<100?{catalog:d.catalog}:{})};
}
export function csv(d:Design){const esc=(s:unknown)=>'"'+String(s).replace(/^[=+@\-]/,"'").replaceAll('"','""')+'"';return '\uFEFF'+[['编号','构件','长(mm)','高(mm)','深(mm)','X','Y','Z','朝向','纹饰'],...d.pieces.map((p,i)=>[partCode(p),p.name,...p.size,...p.position,p.rotation,p.patterns.map(o=>o.pattern+' / '+FACE_NAMES[o.face]).join(';')])].map(row=>row.map(esc).join(',')).join('\r\n');}
