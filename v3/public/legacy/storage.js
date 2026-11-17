const storagePrefix = 'wood-studio-v2/';

export function readDraft(caseId) {
  try {
    const current = JSON.parse(localStorage.getItem(`${storagePrefix}draft/${caseId}`));
    if (current || caseId !== 'shelf') return current;
    const previous = JSON.parse(localStorage.getItem('wood-studio-v1'));
    if (!previous?.parameters) return null;
    const {w,h,d,t,material,requirement} = previous.parameters;
    return {parameters:{caseId,w,h,d,t,m:60,material,requirement},step:0,completed:[]};
  } catch { return null; }
}

export function saveDraft(caseId, data) {
  localStorage.setItem(`${storagePrefix}draft/${caseId}`, JSON.stringify(data));
  localStorage.setItem(`${storagePrefix}case`,caseId);
}

export function lastCase() {
  try {return localStorage.getItem(`${storagePrefix}case`);} catch {return null;}
}

export function createApplication(plan, note) {
  const record = {id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'待人工确认',plan,note};
  localStorage.setItem(`${storagePrefix}application/${record.id}`,JSON.stringify(record));
  return record;
}

export function listApplications() {
  const previous = JSON.parse(localStorage.getItem('wood-pages-applications-v1') || '[]');
  const records = Array.isArray(previous) ? [...previous] : [];
  for (let i=0;i<localStorage.length;i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${storagePrefix}application/`)) records.push(JSON.parse(localStorage.getItem(key)));
  }
  return records.filter(row=>row?.id && row.plan?.parameters).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}
