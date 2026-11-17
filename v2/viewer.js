import { pose } from './model.js?v=obj-1';
import {MeshRenderer} from './gpu.js';

const SVG = 'http://www.w3.org/2000/svg';
const zero = [0, 0, 0];
const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const epsilon = 0.0001;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const add = (a, b) => a.map((n, i) => n + b[i]);
const scale = (a, factor) => a.map(n => n * factor);
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const xy = p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
const pathOf = pts => `M${pts.map(xy).join('L')}`;

function node(name, attributes = {}, children = []) {
  const element = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.append(...children);
  return element;
}

function corners(center, size) {
  return Array.from({ length: 8 }, (_, bits) => center.map((n, axis) =>
    n + ((bits >> axis) & 1 ? 0.5 : -0.5) * size[axis]));
}

function rotateZ([x, y, z], angle) {
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle), z];
}

function world(p, arrangement) {
  const transformed = rotateZ(p, arrangement.roll);
  transformed[1] += arrangement.lift;
  return transformed;
}

function placeTag(anchor, size, width, height, occupied, offsets) {
  const [halfWidth,halfHeight]=size.map(value=>value/2);
  let position;
  for (const [dx,dy] of offsets) {
    position=[clamp(anchor[0]+dx,halfWidth+3,width-halfWidth-3),clamp(anchor[1]+dy,halfHeight+3,height-halfHeight-3)];
    if (!occupied.some(tag=>Math.abs(position[0]-tag.x)<halfWidth+tag.halfWidth+3 &&
                            Math.abs(position[1]-tag.y)<halfHeight+tag.halfHeight+3)) break;
  }
  occupied.push({x:position[0],y:position[1],halfWidth,halfHeight});
  return position;
}

// Resolve each timber into its exposed rectangular faces once per parameter change.
// The inner faces of adjacent solids must never cover a groove or form a visible seam.
function surface(part) {
  if(!part.solids.length)return part.meshFaces;
  const boxes = part.solids.map(s => ({
    low: s.pos.map((n,i) => n - s.size[i] / 2),
    high: s.pos.map((n,i) => n + s.size[i] / 2)
  }));
  const ticks = axes.map((_, i) => [...new Set(boxes.flatMap(b => [b.low[i], b.high[i]])
    .map(n => Number(n.toFixed(6))))].sort((a,b) => a-b));
  const faces = [];
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    const point = (plane, x, y) => {
      const result = [0,0,0];
      result[axis] = plane; result[u] = x; result[v] = y;
      return result;
    };
    for (const plane of ticks[axis]) {
      const inside = p => boxes.some(b => p.every((n,i) => n > b.low[i] && n < b.high[i]));
      for (let i = 1; i < ticks[u].length; i++) {
        for (let j = 1; j < ticks[v].length; j++) {
          const [left,right] = ticks[u].slice(i-1,i+1);
          const [low,high] = ticks[v].slice(j-1,j+1);
          const x = (left+right)/2, y = (low+high)/2;
          const a = inside(point(plane-epsilon,x,y)), b = inside(point(plane+epsilon,x,y));
          if (a === b) continue;
          const sign = a ? 1 : -1;
          const vertices = [[left,low],[right,low],[right,high],[left,high]].map(([i,j]) => point(plane,i,j));
          const borders = [[x,low-epsilon],[right+epsilon,y],[x,high+epsilon],[left-epsilon,y]].map(([i,j]) => {
            const here = inside(point(plane-sign*epsilon,i,j));
            const beyond = inside(point(plane+sign*epsilon,i,j));
            return !here || beyond;
          });
          faces.push({axis,sign,vertices,borders,normal:scale(axes[axis],sign)});
        }
      }
    }
  }
  return [...faces,...(part.meshFaces||[])];
}

// A plane can cut a long shelf face in two. Average-depth sorting alone draws it
// over a nearer side panel at certain camera angles. Partition before painting.
function splitFace(face, normal, position) {
  const left = [], right = [];
  for (let i = 0; i < face.vertices.length; i++) {
    const a = face.vertices[i], b = face.vertices[(i+1) % face.vertices.length];
    const da = dot(a,normal)-position, db = dot(b,normal)-position;
    if (da <= epsilon) left.push(a);
    if (da >= -epsilon) right.push(a);
    if ((da < -epsilon && db > epsilon) || (da > epsilon && db < -epsilon)) {
      const t = da/(da-db);
      const p = a.map((value,i) => value+(b[i]-value)*t);
      left.push(p); right.push(p);
    }
  }
  return [{...face,vertices:left},{...face,vertices:right}];
}

function sortedFaces(faces, camera, result = []) {
  if (faces.length <= 1) { result.push(...faces); return result; }
  const pivot = faces[faces.length >> 1];
  const normal = pivot.normal, at = dot(pivot.vertices[0],normal);
  const less=[], more=[], same=[];
  for (const f of faces) {
    if(f===pivot){same.push(f);continue;}
    const distances=f.vertices.map(p=>dot(p,normal));
    const low = Math.min(...distances);
    const high = Math.max(...distances);
    if (low < at-epsilon && high > at+epsilon) {
      const [a,b] = splitFace(f,normal,at); less.push(a); more.push(b);
    } else if (low < at-epsilon) less.push(f);
    else if (high > at+epsilon) more.push(f);
    else same.push(f);
  }
  sortedFaces(dot(camera,normal) >= 0 ? less : more,camera,result);
  result.push(...same);
  sortedFaces(dot(camera,normal) >= 0 ? more : less,camera,result);
  return result;
}

function shade(material, normal) {
  const dark = material === '黑胡桃木';
  const lighting = 0.84 + dot(normal,[-0.38,0.77,0.50]) * 0.23;
  return `rgb(${(dark ? [157,104,70] : [213,167,112]).map(n => Math.round(n*lighting)).join(',')})`;
}

function grain(id, transform, end) {
  const pattern=node('pattern',{id,width:168,height:44,patternUnits:'userSpaceOnUse',patternTransform:transform});
  const color='#533119';
  for(let i=0;i<9;i++) {
    const y=i*5+1, sway=end?4:1.8;
    pattern.append(node('path',{d:`M0 ${y} Q23 ${y+sway} 48 ${y+.2} T99 ${y-.6} T168 ${y}`,
      stroke:color,'stroke-width':i%3===0?.95:.55,opacity:i%3===0?.20:.11,fill:'none'}));
  }
  if(!end)pattern.append(node('path',{d:'M0 18 C25 17 40 12 57 13 C85 12 99 19 118 18 S147 18 168 18 M40 15 Q57 10 74 15 Q57 18 40 15',
    stroke:color,'stroke-width':.8,opacity:.18,fill:'none'}));
  return pattern;
}

let nextViewer = 0;
export class Viewer {
  constructor(svg, {onSelect=()=>{},onPlayback=()=>{}} = {}) {
    this.svg=svg; this.onSelect=onSelect; this.onPlayback=onPlayback;
    this.id=`wood-view-${++nextViewer}`;
    this.model=null; this.selected=null; this.mode='inspect'; this.step=0; this.progress=0;
    this.playing=false; this.explosion=0; this.yaw=-0.57; this.pitch=0.40; this.zoom=1;
    this.showLabels=true;
    this.animation=0; this.pendingDraw=0; this.gestures=new Map();
    this.events=new AbortController();
    svg.setAttribute('role','group'); svg.setAttribute('tabindex','0');
    svg.setAttribute('aria-label','三维构件模型，可拖动旋转；方向键旋转，加减键缩放。选择构件标签可查看详情。');
    svg.style.touchAction='none';
    this.bindControls();
    this.observer=new ResizeObserver(()=>this.requestDraw());
    this.observer.observe(svg);
  }
  on(target,event,handler,options={}) {
    target.addEventListener(event,handler,{...options,signal:this.events.signal});
  }
  bindControls(){
    const svg=this.svg;
    this.on(svg,'pointerdown',e=>{
      if(e.button!==0)return;
      const point={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false};
      this.gestures.set(e.pointerId,point);
      if(this.gestures.size>1)for(const p of this.gestures.values())p.drag=true;
      svg.setPointerCapture(e.pointerId);
    });
    this.on(svg,'pointermove',e=>{
      const p=this.gestures.get(e.pointerId); if(!p)return;
      const other=[...this.gestures].find(([id])=>id!==e.pointerId)?.[1];
      if(other){
        const previous=Math.hypot(p.x-other.x,p.y-other.y),current=Math.hypot(e.clientX-other.x,e.clientY-other.y);
        if(previous>2)this.zoomBy(current/previous);
      }else{
        p.drag ||= Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>4;
        if(p.drag){this.yaw+=(e.clientX-p.x)*.009;this.pitch=clamp(this.pitch+(e.clientY-p.y)*.008,-.75,1.35);this.requestDraw();}
      }
      p.x=e.clientX; p.y=e.clientY;
    });
    this.on(svg,'pointerup',e=>{
      const p=this.gestures.get(e.pointerId);this.gestures.delete(e.pointerId);
      if(p&&!p.drag){const id=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-id]')?.dataset.id || (this.model?.gpu&&this.gpu?.pick(e.clientX,e.clientY));if(id)this.pick(id);}
    });
    this.on(svg,'lostpointercapture',e=>this.gestures.delete(e.pointerId));
    this.on(svg,'pointercancel',e=>this.gestures.delete(e.pointerId));
    this.on(svg,'wheel',e=>{e.preventDefault();this.zoomBy(Math.exp(-clamp(e.deltaY,-200,200)*.0017));},{passive:false});
    this.on(svg,'keydown',e=>{
      const id=e.target.closest('[data-id]')?.dataset.id;
      if(id && (e.key==='Enter'||e.key===' ')){e.preventDefault();this.pick(id);return;}
      switch(e.key){
        case 'ArrowLeft':this.yaw-=.12;break;
        case 'ArrowRight':this.yaw+=.12;break;
        case 'ArrowUp':this.pitch=clamp(this.pitch+.1,-.75,1.35);break;
        case 'ArrowDown':this.pitch=clamp(this.pitch-.1,-.75,1.35);break;
        case '+': case '=':this.zoomBy(1.1);break;
        case '-':this.zoomBy(1/1.1);break;
        case 'Home':this.resetView();break;
        default:return;
      }
      e.preventDefault();this.requestDraw();
    });
    this.on(document,'visibilitychange',()=>{if(document.hidden)this.pause();});
  }
  setModel(model){
    this.pause(); this.model=model; this.mode='inspect'; this.step=0; this.progress=0;
    if(model.gpu&&!this.gpu)this.gpu=new MeshRenderer(this.svg,()=>this.requestDraw(),()=>this.pause());
    this.gpu?.setModel(model);
    this.surfaces=new Map(model.parts.map(part=>[part.id,surface(part)]));
    if(!model.parts.some(p=>p.id===this.selected))this.selected=null;
    this.updateFrame(); this.draw(); this.notify();
  }
  select(id){if(this.selected!==id){this.selected=id;this.requestDraw();}}
  pick(id){this.select(id);this.onSelect(id);}
  resetView(){
    const camera=this.model?.camera||{yaw:-.57,pitch:.40,zoom:1};
    this.yaw=camera.yaw;this.pitch=camera.pitch;this.zoom=camera.zoom;this.requestDraw();
  }
  setLabels(show){this.showLabels=show;this.requestDraw();}
  zoomBy(factor){this.zoom=clamp(this.zoom*factor,.65,2.35);this.requestDraw();}
  inspect(){this.pause();this.mode='inspect';this.progress=0;this.updateFrame();this.draw();this.notify();}
  setExplosion(fraction){this.explosion=clamp(fraction,0,1);this.inspect();}
  setStep(index){
    if(!this.model)return;
    this.pause();this.step=clamp(Math.trunc(index),0,this.model.steps.length-1);
    this.mode='assembly';this.progress=0;this.updateFrame();this.draw();this.notify();
  }
  seek(fraction){
    if(!this.model)return;
    if(this.mode!=='assembly')this.setStep(this.step);
    this.pause();this.progress=clamp(fraction,0,1);this.draw();this.notify();
  }
  replay(){this.seek(0);this.play();}
  play(){
    if(!this.model||this.playing)return;
    if(this.mode!=='assembly')this.setStep(this.step);
    if(this.progress>=1)this.progress=0;
    const duration=Math.max(1,this.model.steps[this.step].duration||2200);
    const start=performance.now()-this.progress*duration;
    this.playing=true;
    const tick=now=>{
      this.progress=clamp((now-start)/duration,0,1);
      if(this.progress===1)this.playing=false;
      this.draw();this.notify();
      if(this.playing)this.animation=requestAnimationFrame(tick);
    };
    this.animation=requestAnimationFrame(tick);this.notify();
  }
  pause(){
    cancelAnimationFrame(this.animation);
    if(this.playing){this.playing=false;this.notify();}
  }
  notify(){this.onPlayback({playing:this.playing,progress:this.progress,step:this.step,mode:this.mode});}
  arrangement(t){
    if(this.mode==='assembly')return pose(this.model,this.step,t);
    return {parts:Object.fromEntries(this.model.parts.map(part=>[part.id,{visible:true,offset:scale(part.offset,this.explosion)}])),roll:0,lift:0,activeIds:[],jointIds:[]};
  }
  // Fit the entire motion path so that playing a step never shifts the camera underneath it.
  updateFrame(){
    if(!this.model)return;
    this.frame=[];
    const samples=this.mode==='assembly'?8:1;
    for(let i=0;i<=samples;i++){
      const a=this.arrangement(i/samples);
      for(const p of this.model.parts){
        const state=a.parts[p.id];if(!state?.visible)continue;
        this.frame.push(...corners(add(p.pos,state.offset),p.box).map(v=>world(v,a)));
      }
    }
  }
  projector(w,h){
    const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
    const horiz=[cy,0,sy],vert=[sy*sp,cp,-cy*sp],camera=[-sy*cp,sp,cy*cp];
    const xs=this.frame.map(v=>dot(v,horiz)),ys=this.frame.map(v=>dot(v,vert));
    const xMin=Math.min(...xs),xMax=Math.max(...xs),yMin=Math.min(...ys),yMax=Math.max(...ys);
    const s=this.zoom*Math.min((w-70)/Math.max(1,xMax-xMin),(h-87)/Math.max(1,yMax-yMin));
    const x0=w/2-s*(xMin+xMax)/2,y0=h/2+s*(yMin+yMax)/2+4;
    const zs=this.frame.map(v=>dot(v,camera)),low=Math.min(...zs)-100,high=Math.max(...zs)+100;
    const kx=2*s/w,ky=2*s/h,kz=2/(high-low);
    const matrix=new Float32Array([
      horiz[0]*kx,vert[0]*ky,-camera[0]*kz,0,
      horiz[1]*kx,vert[1]*ky,-camera[1]*kz,0,
      horiz[2]*kx,vert[2]*ky,-camera[2]*kz,0,
      2*x0/w-1,1-2*y0/h,(high+low)/(high-low),1
    ]);
    return {camera,s,matrix,project:p=>[x0+s*dot(p,horiz),y0-s*dot(p,vert)]};
  }
  requestDraw(){
    if(!this.pendingDraw)this.pendingDraw=requestAnimationFrame(()=>{this.pendingDraw=0;this.draw();});
  }
  draw(){
    if(!this.model || !this.frame?.length)return;
    const bounds=this.svg.getBoundingClientRect(),w=bounds.width,h=bounds.height;
    if(w<90||h<90)return;
    this.svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const {camera,s,project,matrix}=this.projector(w,h), arrangement=this.arrangement(this.progress);
    const localCamera=rotateZ(camera,-arrangement.roll);
    const localToScreen=p=>project(world(p,arrangement));
    const defs=node('defs'), result=document.createDocumentFragment();result.append(defs);
    if(this.model.gpu)this.gpu.draw(this.model,arrangement,matrix,w,h,this.selected);
    else this.drawGround(result,defs,w,h,s,project);
    const faces=[];
    for(const part of this.model.parts){
      const state=arrangement.parts[part.id]; if(!state?.visible)continue;
      const patterns=new Map();
      for(const f of this.surfaces.get(part.id)){
        if(dot(f.normal,localCamera)<epsilon)continue;
        if(!patterns.has(f.axis)){
          const onFace=[0,1,2].filter(i=>i!==f.axis).sort((i,j)=>part.box[j]-part.box[i]);
          const origin=localToScreen(add(part.pos,state.offset));
          const a=localToScreen(add(add(part.pos,state.offset),axes[onFace[0]]));
          const b=localToScreen(add(add(part.pos,state.offset),axes[onFace[1]]));
          const transform=`matrix(${a[0]-origin[0]} ${a[1]-origin[1]} ${b[0]-origin[0]} ${b[1]-origin[1]} ${origin[0]} ${origin[1]})`;
          const id=`${this.id}-${part.id}-${f.axis}`; defs.append(grain(id,transform,part.box[f.axis]>part.box[onFace[0]]));patterns.set(f.axis,id);
        }
        const vertices=f.vertices.map(v=>add(v,state.offset));
        const normal=rotateZ(f.normal,arrangement.roll);
        faces.push({...f,part,vertices,original:vertices,fill:shade(part.material,normal),pattern:patterns.get(f.axis)});
      }
    }
    for(const f of sortedFaces(faces,localCamera)){
      const vertices=f.vertices.map(localToScreen), d=pathOf(vertices)+'Z';
      const active=arrangement.activeIds.includes(f.part.id)&&this.mode==='assembly';
      const selected=this.selected===f.part.id;
      const group=node('g',{'data-id':f.part.id,style:'cursor:pointer'});
      group.append(node('path',{d,fill:f.fill,stroke:f.fill,'stroke-width':.55}));
      group.append(node('path',{d,fill:`url(#${f.pattern})`,'pointer-events':'none'}));
      const edgeColor=selected?'#ffcf75':active?'#efbd72':'#573e28';
      for(let i=0;i<f.vertices.length;i++){
        const a=f.vertices[i], b=f.vertices[(i+1)%f.vertices.length];
        const edge=f.original.findIndex((v,index)=>{
          const u=f.original[(index+1)%f.original.length];
          const line=add(u,scale(v,-1)),length=dot(line,line);
          if(length<epsilon)return false;
          return [a,b].every(point=>{
            const delta=add(point,scale(v,-1)),t=dot(delta,line)/length;
            return Math.hypot(...add(delta,scale(line,-t)))<epsilon&&t>=-epsilon&&t<=1+epsilon;
          });
        });
        if(edge>=0 && f.borders[edge])group.append(node('path',{d:pathOf([vertices[i],vertices[(i+1)%vertices.length]]),fill:'none',stroke:edgeColor,'stroke-width':selected?1.8:active?1.4:.75,'stroke-opacity':selected||active?.95:.6,'pointer-events':'none'}));
      }
      result.append(group);
    }
    const occupied=[];
    if(this.mode==='assembly')this.drawGuides(result,arrangement,project,w,h,occupied);
    this.drawLabels(result,arrangement,localToScreen,w,h,occupied);
    const focused=this.svg.contains(document.activeElement)?document.activeElement.dataset?.id:null;
    this.svg.replaceChildren(result);
    if(focused)this.svg.querySelector(`g[tabindex][data-id="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  }
  drawGround(layer,defs,w,h,s,project){
    const floorId=`${this.id}-fade`,maskId=`${this.id}-grid`;
    defs.append(node('radialGradient',{id:floorId,cx:'50%',cy:'60%',r:'65%'},[
      node('stop',{offset:'0%','stop-color':'white'}),
      node('stop',{offset:'100%','stop-color':'black'})]));
    defs.append(node('mask',{id:maskId,x:0,y:0,width:w,height:h,maskUnits:'userSpaceOnUse'},[node('rect',{width:w,height:h,fill:`url(#${floorId})`})]));
    const group=node('g',{'pointer-events':'none',mask:`url(#${maskId})`});
    const spacing=Math.max(25,Math.round(35/s/25)*25);
    const extent=spacing*24;let path='';
    for(let i=-24;i<=24;i++){
      const p=i*spacing;
      path+=pathOf([project([p,0,-extent]),project([p,0,extent])]);
      path+=pathOf([project([-extent,0,p]),project([extent,0,p])]);
    }
    group.append(node('path',{d:path,fill:'none',stroke:'#c9c0b1','stroke-opacity':.17,'stroke-width':.65}));
    layer.append(group);
  }
  drawGuides(layer,arrangement,project,w,h,occupied){
    const start=this.arrangement(0),end=this.arrangement(1);
    const current=this.model.steps[this.step];
    const guides=node('g',{'pointer-events':'none'});
    const annotation=(anchor,label,preferred,group=guides)=>{
      const width=label.length*12+8;
      const [x,y]=placeTag(anchor,[width,18],w,h,occupied,[preferred,[25,-20],[-28,20],[26,22],[-25,-22],[0,-34]]);
      group.append(node('path',{d:pathOf([anchor,[x,y]]),stroke:'#f2d797','stroke-width':1,fill:'none'}));
      group.append(node('rect',{x:x-width/2,y:y-9,width,height:18,rx:3,fill:'#302b23',stroke:'#c0a570','stroke-width':.8}));
      const text=node('text',{x,y:y+3.5,fill:'#ffedc3','font-size':10.5,'text-anchor':'middle'});
      text.textContent=label;
      group.append(text);
    };
    const rotating=start.roll!==end.roll;
    for(const id of current.movingIds??arrangement.activeIds){
      const part=this.model.parts.find(p=>p.id===id);
      if(!part||!arrangement.parts[id].visible||!start.parts[id]?.visible||!end.parts[id]?.visible)continue;
      // One arc is sufficient to describe a change in workstation orientation.
      if(rotating&&id!==this.selected)continue;
      const samples=rotating?12:1;
      const path=Array.from({length:samples+1},(_,index)=>{
        const frame=this.arrangement(index/samples);
        return project(world(add(part.pos,frame.parts[id].offset),frame));
      });
      const tip=path.at(-1),previous=path.at(-2);
      const length=Math.hypot(tip[0]-path[0][0],tip[1]-path[0][1]);
      const tangent=Math.hypot(tip[0]-previous[0],tip[1]-previous[1]);
      if(length<9||tangent<epsilon)continue;
      const direction=[(tip[0]-previous[0])/tangent,(tip[1]-previous[1])/tangent];
      const normal=[-direction[1],direction[0]];
      const trail=path.map(point=>add(point,scale(normal,15)));
      const endpoint=trail.at(-1),back=add(endpoint,scale(direction,-8));
      guides.append(node('path',{d:pathOf(trail),stroke:'#fff0be','stroke-width':2,'stroke-dasharray':'5 4',fill:'none'}));
      guides.append(node('path',{d:pathOf([add(back,scale(normal,4)),endpoint,add(back,scale(normal,-4))])+'Z',fill:'#ffe09c',stroke:'#83602a','stroke-width':.8}));
    }
    if(!arrangement.jointIds.length){
      const part=this.model.parts.find(item=>item.id===this.selected);
      for(const mark of part?.marks||[]){
        const point=add(mark.point,arrangement.parts[part.id].offset);
        const anchor=project(world(point,arrangement));
        const out=project(world(add(point,scale(mark.direction,35)),arrangement));
        annotation(anchor,mark.label,[out[0]-anchor[0],out[1]-anchor[1]]);
      }
    }
    for(const j of this.model.joints){
      if(!arrangement.jointIds.includes(j.id))continue;
      const receiver=arrangement.parts[j.receiverId??j.partIds[0]];
      if(!receiver?.visible)continue;
      const p=project(world(add(j.point,receiver.offset),arrangement));
      const q=project(world(add(j.point,arrangement.parts[j.moverId].offset),arrangement));
      const marker=node('g',{'data-joint':j.id,'aria-label':j.id+' '+j.name});
      if(Math.hypot(p[0]-q[0],p[1]-q[1])>5){
        marker.append(node('path',{d:pathOf([q,p]),stroke:'#f1d5a5','stroke-width':1.4,'stroke-dasharray':'3 4',fill:'none'}));
        marker.append(node('path',{d:pathOf([[q[0],q[1]-4],[q[0]+4,q[1]],[q[0],q[1]+4],[q[0]-4,q[1]]])+'Z',fill:'#fff3cc',stroke:'#725333'}));
      }
      marker.append(node('circle',{cx:p[0],cy:p[1],r:7,fill:'none',stroke:'#302418','stroke-width':3.5}));
      marker.append(node('circle',{cx:p[0],cy:p[1],r:7,fill:'none',stroke:'#ffe4a3','stroke-width':1.5,'stroke-dasharray':'4 2'}));
      annotation(p,j.id,[22,-14],marker);
      guides.append(marker);
    }
    layer.append(guides);
  }
  drawLabels(layer,arrangement,project,w,h,occupied){
    for(const part of this.model.parts){
      const state=arrangement.parts[part.id];if(!state?.visible)continue;
      if(!this.showLabels&&part.id!==this.selected&&!arrangement.activeIds.includes(part.id))continue;
      const anchor=project(add(part.labelPoint||part.pos,state.offset));
      const [x,y]=placeTag(anchor,[36,22],w,h,occupied,[[0,0],[0,26],[0,-26],[40,0],[-40,0],[0,52],[0,-52]]);
      const selected=part.id===this.selected, active=arrangement.activeIds.includes(part.id);
      const g=node('g',{'data-id':part.id,role:'button',tabindex:0,'aria-label':`${part.id} ${part.name}`,'aria-pressed':selected,style:'cursor:pointer'});
      if(Math.hypot(anchor[0]-x,anchor[1]-y)>12)g.append(node('path',{d:pathOf([anchor,[x,y]]),stroke:'#f8ce89','stroke-width':1,fill:'none'}));
      g.append(node('rect',{x:x-18,y:y-11,width:36,height:22,rx:4,fill:selected?'#f0ba66':'#28241f',stroke:active||selected?'#ffd58a':'#b59364','stroke-width':active?1.65:.85}));
      const label=node('text',{x,y:y+4,fill:selected?'#211a11':'#f4d9ae','font-size':11,'font-weight':600,'font-family':'ui-monospace,monospace','text-anchor':'middle'});
      label.textContent=part.id;g.append(label);layer.append(g);
    }
  }
  destroy(){this.pause();cancelAnimationFrame(this.pendingDraw);this.observer.disconnect();this.events.abort();this.gpu?.destroy();}
}
