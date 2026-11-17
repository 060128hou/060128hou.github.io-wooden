import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Box3,Vector3,Matrix4} from 'three';
globalThis.window={URL:globalThis.URL};
const b=fs.readFileSync('../../work/v3-input/patterns.fbx');
const source=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');source.updateMatrixWorld(true);
const select=[...source.children[2].children,...source.children[1].children.filter(x=>x.name.startsWith('huawen_')).slice(0,18)];
const out='public/assets/patterns';fs.mkdirSync(out,{recursive:true});
const catalog=[];
for(const [i,object]of select.entries()){
 const geos=[];object.traverse(m=>{if(!m.isMesh)return;let g=m.geometry.clone().applyMatrix4(m.matrixWorld);if(g.index)g=g.toNonIndexed();for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);if(!g.attributes.normal)g.computeVertexNormals();geos.push(g);});
 const geo=mergeGeometries(geos,false);if(!geo)continue;geo.rotateX(Math.PI/2);geo.computeBoundingBox();const size=geo.boundingBox.getSize(new Vector3()),center=geo.boundingBox.getCenter(new Vector3()),s=1/Math.max(size.x,size.y);geo.translate(-center.x,-center.y,-geo.boundingBox.min.z);geo.scale(s,s,s);geo.computeBoundingBox();
 const pos=geo.attributes.position.array,norm=geo.attributes.normal.array;const p=Buffer.from(pos.buffer,pos.byteOffset,pos.byteLength),n=Buffer.from(norm.buffer,norm.byteOffset,norm.byteLength),bin=Buffer.concat([p,n]);
 const doc={asset:{version:'2.0',generator:'Wood workshop FBX world-transform extraction'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:object.name}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[.52,.29,.13,1],metallicFactor:0,roughnessFactor:.75},doubleSided:true}],buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:p.length,target:34962},{buffer:0,byteOffset:p.length,byteLength:n.length,target:34962}],accessors:[{bufferView:0,componentType:5126,count:pos.length/3,type:'VEC3',min:geo.boundingBox.min.toArray(),max:geo.boundingBox.max.toArray()},{bufferView:1,componentType:5126,count:norm.length/3,type:'VEC3'}]};
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 const id='pattern-'+String(i+1).padStart(2,'0'),compressed=gzipSync(Buffer.concat([header,jh,json,bh,bin]),{level:9});fs.writeFileSync(`${out}/${id}.glb.gz`,compressed);
 catalog.push({id,name:(i<6?'团纹':'装饰纹')+' '+String(i+1).padStart(2,'0'),category:i<6?'团纹':'装饰纹',url:`/assets/patterns/${id}.glb.gz`,thumbnail:`/assets/patterns/${id}.png`,width:size.x*s,height:size.y*s,depth:size.z*s,triangles:pos.length/9,bytes:compressed.length,source:{file:'花纹.FBX',object:object.name,parent:object.parent.name},note:'从原 FBX 独立对象提取；仅用于表面纹饰视觉预览。'});
}
fs.writeFileSync(`${out}/catalog.json`,JSON.stringify(catalog));console.log(JSON.stringify({count:catalog.length,bytes:catalog.reduce((s,p)=>s+p.bytes,0),patterns:catalog.map(p=>({id:p.id,source:p.source.object,triangles:p.triangles,bytes:p.bytes}))}));
