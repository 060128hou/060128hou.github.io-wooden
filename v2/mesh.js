// Closed profile extrusions used by the illustrated timber case.
const subtract = (a,b) => a.map((v,i)=>v-b[i]);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a,b) => a.reduce((n,v,i)=>n+v*b[i],0);
const turn = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);

function face(vertices, desired, borders) {
  let normal=cross(subtract(vertices[1],vertices[0]),subtract(vertices[2],vertices[0]));
  if(dot(normal,desired)<0) {
    vertices=[...vertices].reverse();
    normal=normal.map(v=>-v);
    if(borders) borders=borders.map((_,i)=>borders[(borders.length-2-i+borders.length)%borders.length]);
  }
  const length=Math.hypot(...normal);
  if(length<1e-8) throw new Error('Degenerate timber face');
  normal=normal.map(v=>v/length);
  const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
  return {vertices,normal,axis,sign:Math.sign(normal[axis]),borders:borders||vertices.map(()=>true)};
}

function triangulate(profile) {
  const remaining=profile.map((_,i)=>i), triangles=[];
  while(remaining.length>3) {
    let found=false;
    for(let i=0;i<remaining.length;i++) {
      const a=remaining[(i+remaining.length-1)%remaining.length],b=remaining[i],c=remaining[(i+1)%remaining.length];
      if(turn(profile[a],profile[b],profile[c])<=1e-8)continue;
      const inside=remaining.some(j=>j!==a&&j!==b&&j!==c&&
        turn(profile[a],profile[b],profile[j])>=-1e-8&&
        turn(profile[b],profile[c],profile[j])>=-1e-8&&
        turn(profile[c],profile[a],profile[j])>=-1e-8);
      if(inside)continue;
      triangles.push([a,b,c]);remaining.splice(i,1);found=true;break;
    }
    if(!found)throw new Error('Timber profile must be simple and have nonzero area');
  }
  triangles.push(remaining);
  return triangles;
}

export function extrude(profile, thickness, axis, origin=[0,0,0]) {
  const area=profile.reduce((n,p,i)=>n+p[0]*profile[(i+1)%profile.length][1]-p[1]*profile[(i+1)%profile.length][0],0);
  const outline=area>0?[...profile]:[...profile].reverse();
  const point=([u,v],depth) => (axis==='x'?[u,v,depth]:[depth,v,u]).map((n,i)=>n+origin[i]);
  const normal=([u,v],depth) => axis==='x'?[u,v,depth]:[depth,v,u];
  const faces=[], triangles=triangulate(outline);
  for(const sign of [-1,1]) {
    for(const tri of triangles) {
      const borders=tri.map((a,i)=> {
        const b=tri[(i+1)%3];
        return Math.abs(a-b)===1||Math.abs(a-b)===outline.length-1;
      });
      faces.push(face(tri.map(i=>point(outline[i],sign*thickness/2)),normal([0,0],sign),borders));
    }
  }
  for(let i=0;i<outline.length;i++) {
    const a=outline[i],b=outline[(i+1)%outline.length];
    faces.push(face([point(a,-thickness/2),point(b,-thickness/2),point(b,thickness/2),point(a,thickness/2)],
      normal([b[1]-a[1],a[0]-b[0]],0)));
  }
  return faces;
}

export function taperedBlock(x,z,bottom,top,width,depth,ratio=.74,slope=0) {
  const ring=(y,r,slanted)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>
    [x+a*width*r/2,y+(slanted?b*depth*r/2*slope:0),z+b*depth*r/2]);
  const low=ring(bottom,ratio,true),high=ring(top,1,false);
  const faces=[face(low,[0,-1,0]),face(high,[0,1,0])];
  for(let i=0;i<4;i++) {
    const j=(i+1)%4,mid=[(low[i][0]+low[j][0])/2-x,0,(low[i][2]+low[j][2])/2-z];
    if(slope){
      faces.push(face([low[i],low[j],high[j]],mid,[true,true,false]));
      faces.push(face([low[i],high[j],high[i]],mid,[false,true,true]));
    }else faces.push(face([low[i],low[j],high[j],high[i]],mid));
  }
  return faces;
}

export function roundBeam(x,y,z,length,radius) {
  const profile=Array.from({length:24},(_,i)=>{
    const a=i*Math.PI/12;
    return [Math.cos(a)*radius,Math.sin(a)*radius];
  });
  // A circle in Z/Y, extruded along X.
  const faces=extrude(profile,length,'z',[x,y,z]);
  for(const f of faces)f.borders=f.borders.map((border,i)=>{
    const a=f.vertices[i],b=f.vertices[(i+1)%f.vertices.length];
    const alongAxis=Math.abs(a[0]-b[0])>1e-8&&Math.abs(a[1]-b[1])<1e-8&&Math.abs(a[2]-b[2])<1e-8;
    return border&&!alongAxis;
  });
  return faces;
}
