import fs from 'node:fs';
let file='components/WorkshopApp.tsx',s=fs.readFileSync(file,'utf8');s=s.replaceAll('.then(r=>r.json())','.then(r=>r.json() as Promise<any>)');fs.writeFileSync(file,s);
file='components/Scene.tsx';s=fs.readFileSync(file,'utf8').replace('host.prepend(this.renderer.domElement)','host.insertBefore(this.renderer.domElement,host.firstChild)');fs.writeFileSync(file,s);
