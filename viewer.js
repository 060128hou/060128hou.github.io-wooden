import {build} from './model.js';
const NS='http://www.w3.org/2000/svg';
function el(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
// Orthographic 3D projection with depth-sorted faces. No remote rendering dependency.
export class Viewer{
 constructor(svg,onSelect){this.svg=svg;this.onSelect=onSelect;this.yaw=-.58;this.pitch=.39;this.zoom=1;this.explosion=.25;this.selected='A1';this.highlight=[];
 let drag=null;
 svg.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,moved:false};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(e.clientX-drag.ox,e.clientY-drag.oy)>5;this.yaw+=dx*.008;this.pitch=Math.max(-.5,Math.min(1.25,this.pitch+dy*.008));drag.x=e.clientX;drag.y=e.clientY;if(drag.moved)this.draw();});
 svg.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-id]');if(target){this.onSelect(target.dataset.id);}}drag=null;});
 svg.addEventListener('pointercancel',()=>drag=null);
 svg.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.6,Math.min(1.8,this.zoom-e.deltaY*.001));this.draw();},{passive:false});
 svg.addEventListener('keydown',e=>{const id=e.target.closest('[data-id]')?.dataset.id;if((e.key==='Enter'||e.key===' ')&&id){e.preventDefault();this.onSelect(id);}});
 }
 update(p){this.p=p;this.draw();}
 reset(){this.yaw=-.58;this.pitch=.39;this.zoom=1;this.draw();}
 project(v){let[x,y,z]=v;y-=this.p.h/2;const a=x*Math.cos(this.yaw)+z*Math.sin(this.yaw),b=-x*Math.sin(this.yaw)+z*Math.cos(this.yaw);const yy=y*Math.cos(this.pitch)-b*Math.sin(this.pitch),zz=y*Math.sin(this.pitch)+b*Math.cos(this.pitch);const s=Math.min(580/(this.p.w+220),385/(this.p.h+180))*this.zoom;return [400+a*s,310-yy*s,zz];}
 draw(){if(!this.p)return;const svg=this.svg,{parts,g,ys}=build(this.p),{w,h,d,t}=this.p;svg.replaceChildren();
 const defs=el('defs');const pat=el('pattern',{id:'grain',width:18,height:70,patternUnits:'userSpaceOnUse',patternTransform:'rotate(9)'});pat.append(el('path',{d:'M2 0 Q 12 25 2 70 M9 0 Q 18 40 9 70',fill:'none',stroke:'#442915','stroke-opacity':'.15','stroke-width':'.6'}));defs.append(pat);svg.append(defs);
 for(let x=-800;x<=800;x+=80){for(const v of [[[x,0,-700],[x,0,700]],[[-800,0,x],[800,0,x]]]){const a=this.project(v[0]),b=this.project(v[1]);svg.append(el('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#85828e','stroke-opacity':'.11','stroke-width':'.7'}));}}
 const faces=[];
 const addBox=(part,size,pos)=>{const verts=[];for(let i=0;i<8;i++)verts.push(this.project([pos[0]+(i&1?1:-1)*size[0]/2+part.offset[0]*this.explosion,pos[1]+(i&2?1:-1)*size[1]/2+part.offset[1]*this.explosion,pos[2]+(i&4?1:-1)*size[2]/2+part.offset[2]*this.explosion]));
 const indices=[[0,4,6,2],[1,3,7,5],[0,1,5,4],[2,6,7,3],[0,2,3,1],[4,5,7,6]];
 indices.forEach((ids,i)=>{const vs=ids.map(n=>verts[n]);faces.push({part,vs,depth:vs.reduce((s,v)=>s+v[2],0)/4,shade:i});});};
 for(const part of parts){
 if(part.id[0]==='A'){
  const left=part.id==='A1',sign=left?-1:1;
  // Split the inside face into three solids, leaving two true full-depth dado slots.
  addBox(part,[t-g,h,d],[sign*(w/2-(t-g)/2),h/2,0]);
  const segments=[[0,ys[0]-t/2],[ys[0]+t/2,ys[1]-t/2],[ys[1]+t/2,h]];
  for(const[lo,hi]of segments)addBox(part,[g,hi-lo,d],[sign*(w/2-t+g/2),(lo+hi)/2,0]);
 }else addBox(part,part.box,part.pos);
 }
 faces.sort((a,b)=>a.depth-b.depth);
 const colors=this.p.material==='白蜡木'?['#ad7946','#b98a54','#966338','#d9b47e','#bd905e','#c49b65']:['#63432f','#755038','#503524','#976d4b','#745039','#805b40'];
 for(const f of faces){const points=f.vs.map(v=>`${v[0]},${v[1]}`).join(' '),active=f.part.id===this.selected,teach=this.highlight.includes(f.part.id);const group=el('g',{'data-id':f.part.id,class:'part-shape'});group.append(el('polygon',{points,fill:colors[f.shade],stroke:active?'#ffca69':teach?'#dfb67a':'#3e2b1d','stroke-width':active?1.8:.7,'stroke-linejoin':'round'}));group.append(el('polygon',{points,fill:'url(#grain)','pointer-events':'none'}));svg.append(group);}
 // Accessible labels double as keyboard and pointer selection targets.
 for(const part of parts){const p=this.project(part.pos.map((v,i)=>v+part.offset[i]*this.explosion));const tag=el('g',{'data-id':part.id,tabindex:0,role:'button','aria-label':`${part.id} ${part.name}`,transform:`translate(${p[0]},${p[1]})`});tag.append(el('rect',{x:-18,y:-12,width:36,height:24,rx:5,fill:part.id===this.selected?'#edb349':'#211c18',stroke:'#c49455','stroke-width':.8}));const label=el('text',{x:0,y:4,'text-anchor':'middle',fill:part.id===this.selected?'#21180a':'#ead2ac','font-size':11,'font-family':'sans-serif'});label.textContent=part.id;tag.append(label);svg.append(tag);}
 }
}
