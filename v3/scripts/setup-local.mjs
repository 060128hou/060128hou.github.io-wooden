import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
fs.mkdirSync('.sites-runtime',{recursive:true});
fs.writeFileSync('.sites-runtime/local-db.json',JSON.stringify({name:'wood-local',compatibility_date:'2026-05-15',d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'}]}));
const args=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','.sites-runtime/local-db.json','--persist-to','.wrangler/state'];
const check=spawnSync(process.execPath,[...args,'--command',"SELECT name FROM sqlite_master WHERE type='table' AND name='plans';",'--json'],{encoding:'utf8'});
if(check.status!==0){process.stderr.write(check.stderr||check.stdout);process.exit(check.status||1);}
if(!check.stdout.includes('"plans"')){for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){const r=spawnSync(process.execPath,[...args,'--file','drizzle/'+name],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}}
if(!fs.existsSync('.dev.vars'))fs.writeFileSync('.dev.vars','ADMIN_EMAILS="seedy@sites.test"\n');
console.log('本地数据库已准备好。npm run dev -- --port 4193 --hostname 127.0.0.1');
