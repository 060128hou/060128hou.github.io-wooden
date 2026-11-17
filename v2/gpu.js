// A depth-buffered renderer for the supplied OBJ. SVG retains the shared controls,
// labels and animation arrows; triangle geometry is never converted into boxes.
const cache=new Map();
async function loadMesh(spec){
 if(!cache.has(spec.asset))cache.set(spec.asset,(async()=>{
  const response=await fetch(new URL(spec.asset,import.meta.url));
  if(!response.ok)throw Error('模型文件下载失败');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength!==spec.byteLength)throw Error('模型文件不完整');
  return new Float32Array(buffer);
 })().catch(error=>{cache.delete(spec.asset);throw error;}));
 return cache.get(spec.asset);
}
const vertex=`attribute vec3 position;attribute vec3 normal;
uniform mat4 projection;uniform vec3 offset;uniform float factor;
varying vec3 n;varying vec3 p;
void main(){p=position;n=normal;gl_Position=projection*vec4(position*factor+offset,1.0);}`;
const fragment=`precision mediump float;
uniform vec3 color;uniform vec3 pickColor;uniform float highlight;uniform bool picking;
varying vec3 n;varying vec3 p;
void main(){if(picking){gl_FragColor=vec4(pickColor,1.0);return;}
 float light=.65+.32*abs(dot(normalize(n),normalize(vec3(-.38,.77,.5))));
 float grain=sin(p.y*23.0+sin(p.x*.4)*1.3+p.z*.7)*.018+sin(p.y*51.0+p.z*.4)*.009;
 vec3 wood=color*(light+grain);wood=mix(wood,vec3(1.0,.73,.3),highlight);
 gl_FragColor=vec4(wood,1.0);}`;

export class MeshRenderer{
 constructor(svg,onReady,onLost){
  this.canvas=document.createElement('canvas');this.canvas.className='mesh-canvas';this.canvas.setAttribute('aria-hidden','true');
  this.status=document.createElement('div');this.status.className='mesh-status';this.status.setAttribute('role','status');
  svg.before(this.canvas,this.status);this.onReady=onReady;this.onLost=onLost;this.sequence=0;
  this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;this.onLost();this.message('三维显示暂时中断，正在恢复…');});
  this.canvas.addEventListener('webglcontextrestored',()=>{this.init();this.setModel(this.model);});
 }
 message(text,retry=false){
  this.status.hidden=false;this.status.replaceChildren(document.createTextNode(text));
  if(retry){const button=document.createElement('button');button.type='button';button.textContent='重试加载';button.onclick=()=>this.setModel(this.model);this.status.append(button);}
 }
 init(){
  const gl=this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false});
  if(!gl)throw Error('此浏览器未启用 WebGL，请使用支持三维显示的浏览器打开');
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('三维着色器初始化失败');return shader;};
  const program=this.program=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('三维显示初始化失败');
  this.buffer=gl.createBuffer();this.locations={};
  for(const name of ['projection','offset','factor','color','pickColor','highlight','picking'])this.locations[name]=gl.getUniformLocation(program,name);
  this.attributes=['position','normal'].map(name=>gl.getAttribLocation(program,name));
  this.fbo=gl.createFramebuffer();this.texture=gl.createTexture();this.depth=gl.createRenderbuffer();this.pickSize='';
  gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.DITHER);
 }
 async setModel(model){
  const sequence=++this.sequence;this.model=model;this.ready=false;this.canvas.hidden=!model?.gpu;this.status.hidden=true;
  if(!model?.gpu)return;
  this.message('正在加载中式斗拱…');
  try{
   if(!this.gl)this.init();
   const vertices=await loadMesh(model.gpu);if(sequence!==this.sequence)return;
   this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,vertices,this.gl.STATIC_DRAW);
   this.status.hidden=true;this.ready=true;this.onReady();
  }catch(error){if(sequence===this.sequence)this.message(error.message,true);}
 }
 draw(model,arrangement,projection,w,h,selected,picking=false){
  if(!this.ready||this.model!==model)return;
  this.last={model,arrangement,projection,w,h,selected};
  const gl=this.gl,dpr=Math.min(window.devicePixelRatio||1,2);
  const width=Math.round(w*dpr),height=Math.round(h*dpr);
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,picking?this.fbo:null);gl.viewport(0,0,width,height);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  this.attributes.forEach((location,i)=>{gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,24,i*12);});
  const u=this.locations;gl.uniformMatrix4fv(u.projection,false,projection);gl.uniform1f(u.factor,model.gpu.factor);gl.uniform1i(u.picking,picking?1:0);
  gl.uniform3fv(u.color,model.parameters.material==='黑胡桃木'?[.63,.42,.28]:[.87,.68,.44]);
  let visible=0;
  model.parts.forEach((part,i)=>{
   const state=arrangement.parts[part.id];if(!state?.visible)return;visible++;
   gl.uniform3fv(u.offset,state.offset);gl.uniform1f(u.highlight,part.id===selected?.65:arrangement.activeIds.includes(part.id)?.24:0);
   const n=i+1;gl.uniform3fv(u.pickColor,[(n&255)/255,((n>>8)&255)/255,((n>>16)&255)/255]);
   gl.drawArrays(gl.TRIANGLES,part.range.start,part.range.count);
  });
  this.canvas.dataset.visibleParts=visible;this.canvas.dataset.ready='true';
 }
 pick(clientX,clientY){
  if(!this.ready||!this.last)return null;
  const {model,arrangement,projection,w,h,selected}=this.last,gl=this.gl;
  const width=this.canvas.width,height=this.canvas.height,size=width+'x'+height;
  if(size!==this.pickSize){
   gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.bindRenderbuffer(gl.RENDERBUFFER,this.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);
   gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.depth);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.bindFramebuffer(gl.FRAMEBUFFER,null);return null;}
   this.pickSize=size;
  }
  this.draw(model,arrangement,projection,w,h,selected,true);
  const rect=this.canvas.getBoundingClientRect(),pixel=new Uint8Array(4);
  const x=Math.min(width-1,Math.max(0,Math.floor((clientX-rect.left)*width/rect.width)));
  const y=Math.min(height-1,Math.max(0,height-1-Math.floor((clientY-rect.top)*height/rect.height)));
  gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  return model.parts[(pixel[0]+(pixel[1]<<8)+(pixel[2]<<16))-1]?.id||null;
 }
 destroy(){this.sequence++;this.canvas.remove();this.status.remove();this.gl?.getExtension('WEBGL_lose_context')?.loseContext();}
}
