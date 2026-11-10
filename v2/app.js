import {CASES, FIELD_NAMES, MATERIALS, defaults, validate, build, snapshot, csv} from './model.js';
import {Viewer} from './viewer.js';
import {readDraft, saveDraft, lastCase, listApplications, createApplication} from './storage.js';
import {escapeHtml as e, downloadFile, printDocument, partDiagram, featureNotes, sampleTasks} from './reports.js';

const el = id => document.getElementById(id);
let params, model, selectedId;
let stepIndex=0, completed=new Set(), mode='inspect', explosion=0;
let toastTimer;
const viewer=new Viewer(el('viewer'),{onSelect:selectPart,onPlayback:updatePlayback});
const compactScreen=window.matchMedia('(max-width: 840px)');
const desktopPlayer=el('player').parentElement;

function placePlayer() {
  const container=compactScreen.matches?el('compactPlayer'):desktopPlayer;
  container.append(el('player'));
}

function showCurrentMotion() {
  if(!compactScreen.matches)return;
  const top=document.querySelector('.stage').getBoundingClientRect().top;
  if(top<0 || el('player').getBoundingClientRect().bottom>window.innerHeight) {
    window.scrollTo({top:window.scrollY+top-8,behavior:'instant'});
  }
}

function notify(message) {
  const node=el('toast');
  node.textContent=message;
  node.hidden=false;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{node.hidden=true;node.classList.remove('visible');},3200);
}

function formHasUnappliedChanges() {
  return el('material').value!==params.material ||
    [...el('paramFields').querySelectorAll('input')].some(field=>field.valueAsNumber!==params[field.name]);
}

function persist() {
  try {
    saveDraft(params.caseId,{parameters:params,step:stepIndex,completed:[...completed]});
    el('draftStatus').textContent=formHasUnappliedChanges()?'当前参数待应用':'已保存到此浏览器';
  } catch {el('draftStatus').textContent='浏览器存储不可用，请导出方案备份';}
}

function switchCase(id) {
  if(!Object.hasOwn(CASES,id)) id='shelf';
  const draft=readDraft(id);
  const usable=draft?.parameters?.caseId===id && validate(draft.parameters).length===0;
  viewer.pause();
  params=usable?{...draft.parameters}:defaults(id);
  model=build(params);
  stepIndex=usable&&Number.isInteger(draft.step)?Math.max(0,Math.min(model.steps.length-1,draft.step)):0;
  completed=new Set(usable&&Array.isArray(draft.completed)?draft.completed.filter(n=>Number.isInteger(n)&&model.steps[n]):[]);
  selectedId=model.parts[0].id;
  mode='inspect';explosion=0;
  renderForm();
  renderCase();
  viewer.resetView();
  persist();
}

function renderForm() {
  const spec=CASES[params.caseId];
  el('caseSelect').value=params.caseId;
  el('requirement').value=params.requirement;
  el('material').value=params.material;
  el('preset').innerHTML='<option value="">自定义尺寸</option>'+spec.presets.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('');
  el('paramFields').innerHTML=Object.entries(spec.limits).map(([key,[min,max]])=>`<label class="param-field"><span>${e(FIELD_NAMES[key])}</span><input aria-label="${e(FIELD_NAMES[key])}（毫米）" name="${key}" type="number" step="1" min="${min}" max="${max}" value="${params[key]}" required><small>${min}–${max} mm</small></label>`).join('');
  reflectPreset();
  el('paramError').textContent='';
}

function reflectPreset() {
  const spec=CASES[params.caseId];
  const preset=spec.presets.find(p=>Object.keys(spec.limits).every(key=>p[key]===params[key]));
  el('preset').value=preset?.id??'';
}

function commitForm() {
  const next={...params,requirement:el('requirement').value,material:el('material').value};
  for(const input of el('paramFields').querySelectorAll('input')) next[input.name]=input.valueAsNumber;
  const errors=validate(next);
  el('paramError').textContent=errors.join('。');
  if(errors.length){el('paramError').scrollIntoView({block:'nearest'});return false;}
  const geometryChanged=Object.keys(CASES[next.caseId].limits).some(key=>params[key]!==next[key]);
  const changed=geometryChanged||next.material!==params.material||next.requirement!==params.requirement;
  if(changed){
    viewer.pause();
    if(geometryChanged)completed.clear();
    params=next;model=build(params);
    renderCase();reflectPreset();persist();
  } else {reflectPreset();persist();}
  return true;
}

function renderCase() {
  const spec=CASES[params.caseId];
  el('caseTitle').textContent=spec.name;
  el('caseDescription').textContent=spec.subtitle;
  el('caseType').textContent=spec.connection;
  el('partCount').textContent=model.parts.length;
  el('stepCount').textContent=model.steps.length;
  el('viewDimensions').textContent=`宽 ${params.w} × 高 ${params.h} × 深 ${params.d} mm`;
  el('stockVolume').textContent=`开槽前名义材积 ${model.volume.toFixed(4)} m³（不含开料余量）`;
  viewer.setModel(model);
  if(mode==='tutorial')viewer.setStep(stepIndex);
  else viewer.setExplosion(explosion);
  selectPart(selectedId);
  renderStep();renderChecks();renderViewState();
}

function renderViewState() {
  const exploded=mode==='inspect'&&explosion>0;
  el('viewTitle').textContent=mode==='tutorial'?'装配演示':exploded?'爆炸图':'整体结构';
  for(const [id,active] of [['modeAssembly',mode==='inspect'&&!exploded],['modeExplode',exploded]]){
    el(id).classList.toggle('active',active);el(id).setAttribute('aria-pressed',active);
  }
  el('explosion').value=Math.round(explosion*100);
  el('explosionValue').textContent=`${Math.round(explosion*100)}%`;
}

function inspect(fraction) {
  mode='inspect';explosion=fraction;
  viewer.setExplosion(fraction);
  el('pause').disabled=true;
  el('play').disabled=false;
  renderViewState();
}

function selectPart(id) {
  if(!model)return;
  const part=model.parts.find(item=>item.id===id);
  if(!part)return;
  selectedId=id;viewer.select(id);
  const connections=model.joints.filter(j=>j.partIds.includes(id)).map(j=>j.id).join(' · ');
  const detail=el('partDetail');
  const drawingOpen=Boolean(detail.querySelector('details')?.open);
  detail.innerHTML=`<strong>${e(part.id)}　${e(part.name)}</strong><p>${e(part.size.join(' × '))} mm　·　${e(part.material)}</p><p>${e(part.orientation)}　${e(part.note)}</p><small>连接位置　${e(connections)}</small>
    <details class="part-sheet" ${drawingOpen?'open':''}><summary>查看构件尺寸图</summary>${partDiagram(part)}${featureNotes(part)}</details>`;
  el('bomBody').innerHTML=model.parts.map(p=>`<tr class="${p.id===id?'selected':''}"><td><button type="button" class="part-link" data-part="${e(p.id)}" aria-pressed="${p.id===id}">${e(p.id)}</button></td><td>${e(p.name)}</td><td>${p.quantity}</td><td>${e(p.size.join(' × '))}</td><td>${e(p.note)}</td></tr>`).join('');
}

function renderChecks() {
  const passed=model.checks.filter(c=>c.ok).length;
  el('validationStatus').textContent=`名义几何 ${passed}/${model.checks.length} 项通过`;
  el('rulesList').innerHTML=model.checks.map(c=>`<li><strong>${e(c.label)}</strong><span>${e(c.detail)}</span></li>`).join('');
  el('reviewList').innerHTML=sampleTasks(model,params).map(text=>`<li>${e(text)}</li>`).join('');
}

function renderStep() {
  const step=model.steps[stepIndex];
  el('stepList').innerHTML=model.steps.map((s,i)=>`<button type="button" data-step="${i}" aria-current="${i===stepIndex?'step':'false'}" class="step-chip ${i===stepIndex?'active':''} ${completed.has(i)?'done':''}"><span>${completed.has(i)?'✓':i+1}</span> ${e(s.title)}</button>`).join('');
  el('stepPosition').textContent=`第 ${stepIndex+1} / ${model.steps.length} 步`;
  el('compactStep').textContent=`第 ${stepIndex+1} / ${model.steps.length} 步 · ${step.title}`;
  el('stepTitle').textContent=step.title;
  el('stepInstruction').textContent=step.text;
  el('stepCheck').textContent=step.check;
  el('stepParts').innerHTML=step.ids.map(id=>`<button class="chip" type="button" data-part="${id}">${id} ${e(model.parts.find(p=>p.id===id)?.name)}</button>`).join('');
  el('prevStep').disabled=stepIndex===0;
  el('nextStep').disabled=stepIndex===model.steps.length-1;
}

function activateStep(index,play=true) {
  if(!model.steps[index])return;
  viewer.pause();stepIndex=index;mode='tutorial';explosion=0;
  viewer.setStep(index);
  selectPart(model.steps[index].movingIds[0]||model.steps[index].ids[0]);
  renderStep();renderViewState();persist();
  showCurrentMotion();
  if(play)viewer.play();
}

function updatePlayback(state) {
  el('stepProgress').value=state.progress;
  el('play').disabled=Boolean(state.playing);
  el('pause').disabled=!state.playing;
  if(mode==='tutorial'&&state.progress>=1&&state.step===stepIndex&&!completed.has(stepIndex)){
    completed.add(stepIndex);renderStep();persist();
  }
}

function usePreset(id) {
  const preset=CASES[params.caseId].presets.find(p=>p.id===id);
  if(!preset)return;
  for(const input of el('paramFields').querySelectorAll('input'))input.value=preset[input.name];
  commitForm();
}

function makePlan() {
  return {...snapshot(params),sampleChecklist:sampleTasks(model,params),verificationStatus:{geometry:'名义几何已检查',physicalSample:'待试制',craftReview:'待人工复核'}};
}

function renderApplications() {
  try {
    const records=listApplications();
    el('requestList').innerHTML=records.length?records.map(record=>{
      const p=record.plan.parameters;
      return `<article class="request-record"><div><strong>${e(CASES[p.caseId||'shelf']?.name||'木作方案')} · ${e(record.status)}</strong><p>${e(p.w)} × ${e(p.h)} × ${e(p.d)} mm　${e(new Date(record.createdAt).toLocaleString('zh-CN'))}</p>${record.note?`<p>${e(record.note)}</p>`:''}</div><button type="button" data-record="${e(record.id)}">导出申请</button></article>`;
    }).join(''):'<p>此浏览器暂无申请记录。</p>';
  } catch {el('requestList').textContent='申请记录读取失败。请保留现有浏览器数据。';}
}

el('caseSelect').onchange=event=>switchCase(event.target.value);
el('preset').onchange=event=>usePreset(event.target.value);
el('paramForm').onsubmit=event=>{event.preventDefault();if(commitForm())notify('方案已更新');};
el('paramFields').oninput=()=>{el('preset').value='';el('draftStatus').textContent='尺寸待应用';};
el('material').onchange=()=>{el('draftStatus').textContent='材质待应用';};
el('requirement').oninput=()=>{params={...params,requirement:el('requirement').value};persist();};
el('modeAssembly').onclick=()=>inspect(0);
el('modeExplode').onclick=()=>inspect(.85);
el('explosion').oninput=event=>inspect(Number(event.target.value)/100);
el('resetView').onclick=()=>viewer.resetView();
el('stepList').onclick=event=>{const button=event.target.closest('[data-step]');if(button)activateStep(+button.dataset.step);};
el('prevStep').onclick=()=>activateStep(stepIndex-1);
el('nextStep').onclick=()=>activateStep(stepIndex+1);
el('play').onclick=()=>{if(mode!=='tutorial')activateStep(stepIndex,false);showCurrentMotion();viewer.play();};
el('pause').onclick=()=>viewer.pause();
el('replay').onclick=()=>{if(mode!=='tutorial')activateStep(stepIndex,false);showCurrentMotion();viewer.replay();};
for(const id of ['stepParts','bomBody'])el(id).onclick=event=>{const button=event.target.closest('[data-part]');if(button)selectPart(button.dataset.part);};
el('exportJson').onclick=()=>{if(commitForm())downloadFile(`${CASES[params.caseId].name}-方案.json`,JSON.stringify(makePlan(),null,2));};
el('exportCsv').onclick=()=>{if(commitForm())downloadFile(`${CASES[params.caseId].name}-构件清单.csv`,csv(params),'text/csv;charset=utf-8');};
for(const [id,kind] of [['printLabels','labels'],['printSample','sample'],['printPlan','plan']])el(id).onclick=()=>{
  if(commitForm())printDocument(kind,CASES[params.caseId].name,model,params);
};
el('requestForm').onsubmit=event=>{
  event.preventDefault();el('requestError').textContent='';
  if(!el('requestConsent').checked||!commitForm())return;
  try {
    createApplication(makePlan(),el('requestNote').value.trim());
    el('requestForm').reset();renderApplications();notify('申请快照已保存，可以导出交给审核人');
  } catch {el('requestError').textContent='保存失败，请先导出方案备份并检查浏览器存储空间。';}
};
el('requestList').onclick=event=>{
  const button=event.target.closest('[data-record]');if(!button)return;
  try {const record=listApplications().find(r=>r.id===button.dataset.record);if(record)downloadFile(`加工申请-${record.id}.json`,JSON.stringify(record,null,2));}catch {notify('申请读取失败');}
};
window.addEventListener('storage',event=>{if(!event.key||event.key.includes('application'))renderApplications();});
el('caseSelect').innerHTML=Object.values(CASES).map(c=>`<option value="${e(c.id)}">${e(c.name)}</option>`).join('');
el('material').innerHTML=MATERIALS.map(name=>`<option>${e(name)}</option>`).join('');
placePlayer();
compactScreen.addEventListener('change',placePlayer);
switchCase(lastCase()||'shelf');renderApplications();
