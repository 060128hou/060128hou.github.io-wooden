import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(new URL('../../package.json',import.meta.url));
export const T=require('three');
const r=n=>Math.round(n*1000)/1000;
export const box=(size,pos=[0,0,0],rotation=0)=>{const g=new T.BoxGeometry(...size).toNonIndexed();g.rotateY(rotation);g.translate(...pos);return g;};
export function profile(points,depth,pos=[0,0,0],axis='x',rotation=0){
 const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:8,steps:1});g.translate(0,0,-depth/2);if(axis==='z')g.rotateY(-Math.PI/2);if(rotation)g.rotateY(rotation);g.translate(...pos);return g;
}
export function arch(length=140,height=25,depth=16,pos=[0,0,0],axis='x',notch=18,rotation=0){
 const l=length/2,b=-height/2,t=height/2,n=notch/2;
 const p=[[-l,t],[-n,t],[-n,t-height*.25],[n,t-height*.25],[n,t],[l,t],[l,t-height*.18],[l*.94,b+height*.62],[l*.87,b+height*.3],[l*.75,b+height*.05],[l*.62,b],[-l*.62,b],[-l*.75,b+height*.05],[-l*.87,b+height*.3],[-l*.94,b+height*.62],[-l,t-height*.18]];
 return profile(p,depth,pos,axis,rotation);
}
export function cup(width=32,depth=28,height=20,pos=[0,0,0],slot=16,rotation=0){
 const body=new T.CylinderGeometry(1,.72,height*.58,4,1,false).toNonIndexed();body.rotateY(Math.PI/4);body.scale(width/Math.SQRT2,1,depth/Math.SQRT2);body.translate(0,-height*.21,0);
 const gs=[body],ex=Math.max(3,(width-slot)/2),ez=Math.max(3,(depth-slot)/2);
 for(const x of [-1,1])for(const z of [-1,1])gs.push(box([ex,height*.42,ez],[x*(slot+ex)/2,height*.29,z*(slot+ez)/2]));
 for(const g of gs){g.rotateY(rotation);g.translate(...pos);}return gs;
}
export function cylinder(length,radius,pos=[0,0,0],axis='x'){
 const g=new T.CylinderGeometry(radius,radius,length,24).toNonIndexed();if(axis==='x')g.rotateZ(Math.PI/2);if(axis==='z')g.rotateX(Math.PI/2);g.translate(...pos);return g;
}
export function ang(length=200,height=65,depth=16,pos=[0,0,0],up=false,axis='z',rotation=0){
 const l=length/2,h=height/2;
 return profile(up?[[-l,-h],[-l+15,-h], [l,h-8],[l,h],[l-30,h-2],[-l,-h+17]]:[[-l,h],[-l+35,h],[l,-h+10],[l,-h], [l-20,-h+5],[-l,h-18]],depth,pos,axis,rotation);
}
export class ModelBuilder{
 constructor(meta){this.meta=meta;this.parts=[];this.steps=[];}
 step(title,text,check='按编号核对构件朝向与承托位置。'){this.steps.push({id:'step-'+(this.steps.length+1),title,text,check,partIds:[]});return this.steps.length-1;}
 part(name,geometries,step=this.steps.length-1,note='展示尺寸；隐藏配合与实物加工参数待确认。',travel=[0,65,0]){
  if(step<0||!this.steps[step])throw Error('Create an assembly step before parts');
  const gs=Array.isArray(geometries)?geometries:[geometries],positions=[];
  for(let g of gs){if(g.index)g=g.toNonIndexed();positions.push(...g.attributes.position.array);g.dispose();}
  if(!positions.length||positions.some(n=>!Number.isFinite(n)))throw Error('Invalid geometry '+name);
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i++){lo[i%3]=Math.min(lo[i%3],positions[i]);hi[i%3]=Math.max(hi[i%3],positions[i]);}
  const position=lo.map((n,k)=>(n+hi[k])/2),size=hi.map((n,k)=>n-lo[k]),id='P'+String(this.parts.length+1).padStart(3,'0');
  const part={id,name,position:position.map(r),size:size.map(r),positions:positions.map((n,i)=>r(n-position[i%3])),installStep:step,travel,note};
  this.parts.push(part);this.steps[step].partIds.push(id);return id;
 }
 finish(){
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const p of this.parts)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p.position[k]-p.size[k]/2);hi[k]=Math.max(hi[k],p.position[k]+p.size[k]/2);}
  const offset=[(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2];
  for(const p of this.parts)p.position=p.position.map((n,k)=>r(n-offset[k]));
  return {...this.meta,version:1,status:'display-reconstruction',size:hi.map((n,k)=>r(n-lo[k])),parts:this.parts,steps:this.steps};
 }
 async write(){const m=this.finish(),dir=fileURLToPath(new URL('../../.teaching-build/models/',import.meta.url));await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,m.id+'.json'),JSON.stringify(m));return m;}
}
