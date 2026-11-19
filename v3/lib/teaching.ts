import catalog from './teaching.catalog.json' with {type:'json'};
import type {V3} from './workshop';
export type TeachingPart={id:string;name:string;position:V3;size:V3;positions:number[];installStep:number;travel:V3;note:string};
export type TeachingStep={id:string;title:string;text:string;check:string;partIds:string[]};
export type TeachingModel={id:string;title:string;subtitle:string;category:string;order:number|null;description:string;version:1;status:'display-reconstruction';size:V3;parts:TeachingPart[];steps:TeachingStep[]};
export type TeachingEntry={id:string;title:string;subtitle:string;category:string;order:number|null;description:string;partCount:number;stepCount:number;tags:string[];thumbnail:string;url:string};
export const TEACHING=catalog as TeachingEntry[];
export const TEACHING_CATEGORIES=['全部','柱头','补间','上昂','转角','建筑节点','明清'];
export const teachingCatalog=(id:string)=>'teaching-'+id;
export const findTeaching=(catalogId?:string)=>TEACHING.find(m=>teachingCatalog(m.id)===catalogId);
export const teachingURL=(id:string,step=-1)=>'/?model='+teachingCatalog(id)+(step>=0?'&step='+(step+1):'');
const requests=new Map<string,Promise<TeachingModel>>();
export function loadTeaching(entry:TeachingEntry):Promise<TeachingModel>{
 if(!requests.has(entry.id))requests.set(entry.id,(async()=>{
  const res=await fetch(entry.url);if(!res.ok)throw new Error('三维模型暂未加载，请重试。');let bytes=await res.arrayBuffer();
  if(new Uint8Array(bytes)[0]===31)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const m=JSON.parse(new TextDecoder().decode(bytes)) as TeachingModel;
  if(m.id!==entry.id||!m.parts?.length||!m.steps?.length)throw new Error('模型数据不完整，请重试。');return m;
 })().catch(e=>{requests.delete(entry.id);throw e;}));
 return requests.get(entry.id)!;
}
