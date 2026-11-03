import http from 'node:http';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {validate,snapshot} from './public/model.js';
const base=path.dirname(fileURLToPath(import.meta.url));
export function createServer(dataDir=path.join(base,'data','applications')){
 return http.createServer(async(req,res)=>{
  const send=(s,obj)=>{res.writeHead(s,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/applications'){
    if(req.method==='GET'){
     await mkdir(dataDir,{recursive:true});const files=await readdir(dataDir);const records=await Promise.all(files.filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(path.join(dataDir,f),'utf8'))));return send(200,records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
    }
    if(req.method!=='POST')return send(405,{error:'方法不支持'});
    const origin=req.headers.origin;
    if(origin&&origin!==`http://${req.headers.host}`)return send(403,{error:'来源不允许'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>20000)return send(413,{error:'内容过长'});}
    let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'请求格式错误'});}
    const errors=validate(body.parameters||{});if(errors.length)return send(400,{error:errors.join('；')});
    if(typeof body.note!=='string'||body.note.length>1000)return send(400,{error:'备注最多 1000 字'});
    const record={id:randomUUID(),createdAt:new Date().toISOString(),status:'待人工确认',note:body.note,plan:snapshot(body.parameters)};
    await mkdir(dataDir,{recursive:true});await writeFile(path.join(dataDir,record.id+'.json'),JSON.stringify(record,null,2),{flag:'wx'});return send(201,record);
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'方法不支持'});
   const allowed={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/model.js':'model.js','/viewer.js':'viewer.js','/style.css':'style.css'};
   const file=allowed[url.pathname];if(!file)return send(404,{error:'未找到'});
   const bytes=await readFile(path.join(base,'public',file));
   res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"});res.end(req.method==='HEAD'?undefined:bytes);
  }catch(e){console.error(e.message);sendSafe(res);}
 });
}
function sendSafe(res){if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'保存或读取失败，请检查本地目录权限后重试'}));}else res.end();}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const firstPort=Number(process.env.PORT||4173);
 const hosted=process.env.NODE_ENV==='production';
 const listen=async port=>{
  const server=createServer();
  server.once('error',async e=>{
   if(hosted){console.error(e.message);process.exitCode=1;return;}
   if(e.code!=='EADDRINUSE'){console.error(e.message);process.exitCode=1;return;}
   try{
    const response=await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(1200)});
    const page=await response.text();
    if(response.ok&&page.includes('<title>千年木艺 · 方案工坊</title>')){
     const url=`http://127.0.0.1:${port}`;console.log(`千年木艺预览已在运行：${url}`);
     if(process.platform==='win32')spawn('cmd',['/c','start','',url],{stdio:'ignore',windowsHide:true});
     return;
    }
   }catch{}
   if(port-firstPort>=20){console.error(`端口 ${firstPort}–${port} 均不可用，请关闭占用端口的程序后重试。`);process.exitCode=1;return;}
   listen(port+1);
  });
  server.listen(port,hosted?'0.0.0.0':'127.0.0.1',()=>{
   if(hosted){console.log(`千年木艺服务已启动，监听端口 ${port}`);return;}
   const url=`http://127.0.0.1:${port}`;console.log(`千年木艺本地预览：${url}\n保持此窗口开启；关闭窗口将停止服务。`);
   if(process.platform==='win32')spawn('cmd',['/c','start','',url],{stdio:'ignore',windowsHide:true});
  });
 };
 listen(firstPort);
}
