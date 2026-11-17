import fs from 'node:fs';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import {Box3,Vector3} from 'three';
globalThis.window={URL:globalThis.URL};
const b=fs.readFileSync('../../work/v3-input/patterns.fbx');
const oldWarn=console.warn; let warnings=0;console.warn=()=>warnings++;
const group=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
console.warn=oldWarn;group.updateMatrixWorld(true);
function read(g,depth=0){const box=new Box3().setFromObject(g);return {name:g.name,type:g.type,children:g.children.length,box:box.isEmpty()?null:[box.min.toArray(),box.max.toArray()],position:g.position.toArray(),scale:g.scale.toArray(),items:depth<3?g.children.map(x=>read(x,depth+1)):[]};}
fs.writeFileSync('../../work/v3-input/scene-tree.json',JSON.stringify(read(group)));
console.log(JSON.stringify({children:group.children.map(g=>({name:g.name,type:g.type,count:g.children.length})),warnings}));
