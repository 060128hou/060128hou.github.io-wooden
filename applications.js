import {validate,snapshot} from './model.js';
const key='wood-pages-applications-v1';
export function readApplications(){
 const rows=JSON.parse(localStorage.getItem(key)||'[]');
 if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.id!=='string'||!r.plan?.parameters||validate(r.plan.parameters).length))throw new Error('本地记录格式异常，请保留数据并联系维护者');
 return rows;
}
export function saveApplication(parameters,note){
 const errors=validate(parameters);
 if(errors.length)throw new Error(errors.join('；'));
 if(typeof note!=='string'||note.length>1000)throw new Error('备注最多 1000 字');
 const rows=readApplications();
 const record={id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'待人工确认',note,plan:snapshot(parameters)};
 // Only report success after storage accepts the write (quota/privacy errors propagate).
 localStorage.setItem(key,JSON.stringify([record,...rows]));
 return record;
}
