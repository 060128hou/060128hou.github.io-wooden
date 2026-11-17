import {CASES} from './model.js?v=obj-1';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function downloadFile(name, content, type='application/json;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a');
  link.href=url;
  link.download=name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}

export function sampleTasks(model,params) {
  if(model.gpu)return [model.engineeringNote,
    '逐件核对 Z01–Z52 与实体构件的对应关系；网格对象不一定等于一件加工件。',
    '确认 OBJ 到实物毫米的换算比例，量取榫头、槽口和曲线轮廓。',
    '逐步试装，核对插入方向、空间避让与辅助支撑；据此修订演示顺序。',
    '复核构件名称、节点做法、配合公差及稳固措施。',CASES[params.caseId].review];
  if(model.engineeringNote)return [
    model.engineeringNote,
    '对照实体料包核对 27 个展示分件及其名称，记录乳栿、耍头与平棊枋的实际分件方式。',
    '逐件量取长度、截面、曲线和销孔，记录本模型比例与实测尺寸的差异。',
    '核对昂尾的实际位置、避让关系与插入路径，确认每一步需临时支撑的部位。',
    '复核斗口、交叉槽、暗榫及枋材先后顺序，按实际料包修订教学动作。',
    CASES[params.caseId].review
  ];
  return [
    '按构件编号测量实际板长、板宽、板厚，标明内外面与上下方向。',
    `用同批${params.material}余料试切配合，记录刀具、实际槽宽、槽深、含水率和插合感受。`,
    ...model.joints.map(j=>`${j.id} ${j.name}：核对 ${j.partIds.join(' / ')} 的定位，记录卡滞、松动和缺口。`),
    '按动画顺序试装，记录需要辅助支撑、调整顺序或补充标注的位置。',
    CASES[params.caseId].review,
    '由加工方复核实测偏差，由传承人或工艺顾问确认工艺称谓和教学表述。'
  ];
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map(v=>`<th>${escapeHtml(v)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

// The drawing uses the same nominal millimetres as the solid and its joints.
// x/y in the drawing originate at the lower left of the indicated timber face.
export function partDiagram(part) {
  const e=escapeHtml;
  const drawing=part.drawing;
  const scale=Math.min(244/drawing.width,127/drawing.height);
  const width=drawing.width*scale,height=drawing.height*scale;
  const left=(312-width)/2,top=29+(127-height)/2;
  const right=left+width,bottom=top+height;
  const features=drawing.features.map(feature=>{
    const x=left+feature.x*scale;
    const y=bottom-(feature.y+feature.height)*scale;
    const w=feature.width*scale,h=feature.height*scale;
    const color=feature.kind==='notch'?'#faf5eb':feature.kind==='groove'?'#bc925d':'#e9c086';
    const labelX=x+w/2;
    const atRight=labelX>left+width/2;
    const tagX=feature.kind==='engagement'?labelX:(atRight?right+17:left-17);
    const tagY=feature.kind==='engagement'?top-10:y+h/2;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="#714c25" stroke-width="1"/><path d="M${labelX} ${y+h/2} L${tagX} ${tagY}" fill="none" stroke="#7c5835" stroke-width=".8"/><rect x="${tagX-9.5}" y="${tagY-6}" width="19" height="12" rx="2" fill="#523d28"/><text x="${tagX}" y="${tagY+3.5}" font-size="9" text-anchor="middle" fill="#fff5e7">${e(feature.jointId)}</text>`;
  }).join('');
  const description=drawing.features.map(f=>`${f.jointId} ${f.description}`).join(' ');
  const body=drawing.outlines?drawing.outlines.map(poly=>`<path d="M${poly.map(([x,y])=>`${left+x*scale},${bottom-y*scale}`).join('L')}Z" fill="#e2cca9" stroke="#6f573b"/>`).join(''):
    `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#e2cca9" stroke="#6f573b"/>`;
  return `<svg class="part-drawing" viewBox="0 0 320 192" role="img" aria-label="${e(part.id+' '+drawing.face+'，'+description)}" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="192" rx="5" fill="#faf5eb"/>
    <text x="10" y="16" fill="#594d3e" font-size="10">${e(part.id)} · ${e(drawing.face)}</text>
    ${body}
    ${features}
    <path d="M${left} 165 v8 m0 -4 H${right} m0 -4 v8 M294 ${top} h8 m-4 0 V${bottom} m-4 0 h8" fill="none" stroke="#75654e" stroke-width=".8"/>
    <text x="${(left+right)/2}" y="184" font-size="11" fill="#443421" text-anchor="middle">${drawing.width} ${e(drawing.unit||'mm')}</text>
    <text transform="translate(311 ${(top+bottom)/2}) rotate(-90)" font-size="10" fill="#443421" text-anchor="middle">${drawing.height} ${e(drawing.unit||'mm')}</text>
  </svg>`;
}

export function featureNotes(part) {
  return part.drawing.features.map(f=>`<p><b>${escapeHtml(f.jointId)}</b>　${escapeHtml(f.description)}</p>`).join('')+
    (part.drawing.note?`<p>${escapeHtml(part.drawing.note)}</p>`:'');
}

export function printDocument(kind,name,model,params) {
  const e=escapeHtml,unit=model.unitLabel||'mm';
  const size=`${model.dimensions.w} × ${model.dimensions.h} × ${model.dimensions.d} ${e(unit)}`;
  const heading=`${name} · ${size} · ${params.material}`;
  const labels=model.parts.map(part=>`<article class="part-label"><small>千年木艺 / ${e(name)}</small><h2>${e(part.id)}　${e(part.name)}</h2><b>${e(part.size.join(' × '))} ${e(unit)}</b><p>${e(part.material)} · ${part.quantity} 件</p><p>${e(part.orientation)}</p><p>配合 ${e(model.joints.filter(j=>j.partIds.includes(part.id)).map(j=>j.id).join(' / '))}</p></article>`).join('');
  let body;
  if (kind==='labels') {
    body=`<h1>料包构件标签</h1><p>${e(heading)}</p><div class="labels-grid">${labels}</div>`;
  } else if (kind==='sample') {
    const cards=model.parts.map(p=>`<article class="sample-part"><h3>${e(p.id)}　${e(p.name)}</h3>${partDiagram(p)}${featureNotes(p)}</article>`).join('');
    body=`<h1>样件试制与复核记录</h1><p>${e(heading)} · 名义尺寸，以标注值核对</p><p>样件批次 __________　日期 __________　复核人 __________</p>
    ${table(['编号','构件',`设计外廓 (${unit})`,'实测长 × 宽 × 厚 (mm)'],model.parts.map(p=>[p.id,p.name,p.size.join(' × '),'　　×　　 ×　　']))}
    <h2>接口与构件方向</h2><div class="sample-parts">${cards}</div>
    <h2>试装检查</h2>${sampleTasks(model,params).map(task=>`<article><p>□ ${e(task)}</p><p>实测 / 处理 __________________________________________</p></article>`).join('')}
    <p>加工方意见 ____________________　复核签字 ____________________</p>`;
  } else {
    body=`<h1>${e(name)} · 设计方案</h1><p>${e(heading)}${params.t?` · 板厚 ${params.t} ${e(unit)}`:''}</p><p>使用需求：${e(params.requirement||'未填写')}</p>${table(['构件','名称',`外廓尺寸 (${unit})`,'件数','方向'],model.parts.map(p=>[p.id,p.name,p.size.join(' × '),p.quantity,p.orientation]))}<h2>连接关系</h2>${table(['接口','构件','位置',`接口标记坐标 x / y / z (${unit})`],model.joints.map(j=>[j.id,j.partIds.join(' / '),j.name,j.point.join(' / ')]))}<h2>教学装配顺序</h2>${model.steps.map((s,i)=>`<article><h3>${i+1}. ${e(s.title)}</h3><p>${e(s.text)}</p><p>复核：${e(s.check)}</p></article>`).join('')}<p>设计草案。样件、承载、配合公差与工艺审核均待完成。</p>`;
  }
  document.getElementById('printReport').innerHTML=(model.engineeringNote?`<p class="print-caveat">${e(model.engineeringNote)}</p>`:'')+body;
  window.print();
}
