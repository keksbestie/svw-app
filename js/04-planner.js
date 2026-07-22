// ══════════════════════════════════════════════════════════════════
// MODUL: TRAININGSPLANER (DRAG & DROP)
// ══════════════════════════════════════════════════════════════════
// Enthält: Übungen per Drag&Drop in Trainingsabschnitte (Lanes)
// ziehen, Plan speichern/laden/löschen, Trainings-Vorlagen.
// ══════════════════════════════════════════════════════════════════
function renderPlanner(){renderLanes();renderSavedPlans();}

// Normalize lane items: support old format (string id) and new format ({id,...})
function _laneItem(raw){ return typeof raw==='string'?{id:raw}:raw; }

function renderLanes(){
  const el=document.getElementById('lanes');if(!el)return;
  const planSecs=SECS.slice(0,5);
  el.innerHTML=planSecs.map((s,i)=>{
    const items=(currentPlan.lanes[i]||[]).map(raw=>{
      const item=_laneItem(raw);
      const ex=exercises.find(e=>e.id===item.id);
      return ex?{item,ex}:null;
    }).filter(Boolean);
    return`<div class="lane">
      <div class="lhdr" style="--lc:${s.color}" onclick="toggleLane(${i})">
        <div class="lnum" style="background:${s.color}">${i+1}</div>
        <div class="lname">${s.name}</div>
        <div class="lcnt">${items.length} Übung${items.length!==1?'en':''}</div>
        <div class="ltog" id="ltog${i}">▼</div>
      </div>
      <div class="lbody" id="lb${i}">
        <div class="ldz" id="lane${i}" ondragover="pdov(event,${i})" ondragleave="pdol(${i})" ondrop="pdrop(event,${i})">
          ${items.length===0
            ?`<div class="lhint"><button onclick="goPage('handbook');switchSec(${i})" class="lane-to-catalog">→ Zum Katalog: ${s.name}</button></div>`
            :items.map(({item,ex})=>piHTML(item,ex,i,s.color)).join('')}
        </div>
        <div class="lane-add-bar">
          <button class="lane-browse-btn" onclick="openLanePicker(${i})" style="background:${s.color}20;border:1.5px dashed ${s.color};color:${s.color};">
            + Übung aus ${s.name} wählen
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function piHTML(item,ex,si,col){
  const players = item.players ?? ex.players ?? '';
  const duration = item.duration ?? ex.duration ?? '';
  const difficulty = item.difficulty ?? ex.difficulty ?? '';
  const hasPlayerOvr = item.players!=null;
  const hasDurOvr = item.duration!=null;
  const dc=difficulty==='Leicht'?'dl':difficulty==='Mittel'?'dm':'ds';
  return`<div class="pi" data-id="${ex.id}" draggable="true">
    <div class="pi-dh">⠿</div>
    <div class="pi-body">
      <div class="pi-name">${ex.name}</div>
      <div class="pi-meta">
        ${players?`<span class="mbadge p pi-ovr-wrap" title="Klicken zum Anpassen">
          👥 <input class="pi-ovr-in" value="${players}" style="width:${Math.max(30,players.length*8)}px"
            onchange="setPlanOverride('${ex.id}',${si},'players',this.value)"
            onclick="event.stopPropagation()" title="Leer lassen für Standardwert">
          ${hasPlayerOvr?`<button class="pi-ovr-rst" onclick="resetPlanOverride('${ex.id}',${si},'players');event.stopPropagation()" title="Zurücksetzen">↺</button>`:''}
        </span>`:''}
        ${difficulty?`<span class="mbadge ${dc}">${difficulty}</span>`:''}
        ${duration?`<span class="mbadge pi-ovr-wrap" style="background:#e8f0fe;color:#1a56c4;" title="Klicken zum Anpassen">
          ⏱ <input class="pi-ovr-in" value="${duration}" style="width:${Math.max(24,(String(duration).length)*9)}px;color:#1a56c4;"
            type="number" min="1" max="120"
            onchange="setPlanOverride('${ex.id}',${si},'duration',parseInt(this.value)||null)"
            onclick="event.stopPropagation()" title="Leer lassen für Standardwert"> min
          ${hasDurOvr?`<button class="pi-ovr-rst" onclick="resetPlanOverride('${ex.id}',${si},'duration');event.stopPropagation()" title="Zurücksetzen">↺</button>`:''}
        </span>`:''}
      </div>
    </div>
    <button class="pi-rm" onclick="removePlanLane('${ex.id}',${si})">✕</button>
  </div>`;
}

function setPlanOverride(id,si,field,val){
  const lane=currentPlan.lanes[si]||[];
  const idx=lane.findIndex(raw=>_laneItem(raw).id===id);
  if(idx<0)return;
  const item=_laneItem(lane[idx]);
  if(val==null||val===''){delete item[field];}else{item[field]=val;}
  lane[idx]=item;
  currentPlan.lanes[si]=lane;
  save();updatePlanCart();
}

function resetPlanOverride(id,si,field){
  setPlanOverride(id,si,field,null);
  renderLanes();
}

function removePlanLane(id,si){
  currentPlan.lanes[si]=(currentPlan.lanes[si]||[]).filter(raw=>_laneItem(raw).id!==id);
  renderLanes();updatePlanCart();
}

function addToPlan(id,si){
  if(!currentPlan.lanes[si]) currentPlan.lanes[si]=[];
  const already=currentPlan.lanes[si].some(raw=>_laneItem(raw).id===id);
  if(!already){
    currentPlan.lanes[si].push({id});
    renderLanes();updatePlanCart();
    showToast('Übung hinzugefügt');
  } else showToast('Bereits im Plan','err');
}

function toggleLane(i){
  const b=document.getElementById('lb'+i);
  const t=document.getElementById('ltog'+i);
  if(!b)return;
  const collapsed=b.style.display==='none';
  b.style.display=collapsed?'':'none';
  if(t)t.textContent=collapsed?'▼':'▶';
}

// Drag & Drop
function pdov(e,i){e.preventDefault();document.getElementById('lane'+i)?.classList.add('dz-over');}
function pdol(i){document.getElementById('lane'+i)?.classList.remove('dz-over');}
function pdrop(e,i){
  e.preventDefault();pdol(i);
  if(dragItem?.exerciseId) addToPlan(dragItem.exerciseId,i);
  dragItem=null;
}

// Lane picker — inline exercise chooser
let _lanePickerSec=-1;
function openLanePicker(si){
  _lanePickerSec=si;
  const modal=document.getElementById('lanePickerMod');
  if(!modal)return;
  document.getElementById('lanePickerTitle').textContent='Übung hinzufügen – '+SECS[si].name;
  document.getElementById('lanePickerSearch').value='';
  renderLanePickerList('');
  openMod('lanePickerMod');
}
function renderLanePickerList(q){
  const si=_lanePickerSec;
  const el=document.getElementById('lanePickerList');if(!el)return;
  const secEx=exercises.filter(e=>e.section===si);
  const filtered=q?secEx.filter(e=>e.name.toLowerCase().includes(q.toLowerCase())||
    (e.tags||[]).some(t=>t.toLowerCase().includes(q.toLowerCase()))):secEx;
  if(!filtered.length){el.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">Keine Übungen gefunden</div>';return;}
  el.innerHTML=filtered.map(e=>{
    const inPlan=(currentPlan.lanes[si]||[]).some(raw=>_laneItem(raw).id===e.id);
    return`<div class="lp-item ${inPlan?'lp-inplan':''}">
      <div class="lp-img">${e.image?`<img src="${e.image}" style="width:100%;height:100%;object-fit:cover;">`:'⚽'}</div>
      <div class="lp-info">
        <div class="lp-name">${e.name}</div>
        <div class="lp-meta">
          ${e.players?`<span class="mbadge p">👥 ${e.players}</span>`:''}
          ${e.difficulty?`<span class="mbadge">${e.difficulty}</span>`:''}
          ${e.duration?`<span class="mbadge">⏱ ${e.duration} min</span>`:''}
        </div>
        ${(e.tags||[]).slice(0,3).map(t=>`<span class="ctag" style="${tagStyle(t)};font-size:9px;">${t}</span>`).join('')}
      </div>
      <button onclick="${inPlan?`removePlanLane('${e.id}',${si})`:`addToPlan('${e.id}',${si})`};renderLanePickerList(document.getElementById('lanePickerSearch').value)"
        style="flex-shrink:0;padding:7px 14px;border:none;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer;
        background:${inPlan?'#fce4ec':'var(--accent)'};color:${inPlan?'#880e4f':'#fff'};">
        ${inPlan?'✕ Entfernen':'+ Plan'}
      </button>
    </div>`;
  }).join('');
}

function renderMatSummary(){} // kept for compat
function initSCanvas(reset){ // alias for submit canvas init
  if(reset){ sCanvasObjects=[]; sUndoStack=[]; sLinePhase=0; sLineStart=null; sIsDribbling=false; sDribblePoints=[]; sSelectedObjIdx=null; }
  sRedraw();
}

function loadTemplate(tpl){
  const templates = {
    vorbereitung: {
      name: '4-Wochen Vorbereitung',
      lanes: [[],[],[],[],[]]
    },
    standard: {
      name: 'Standard Di/Do – Technik',
      lanes: [[],[],[],[],[]]
    },
    schnelligkeit: {
      name: '6-Wochen Inseason · Schnelligkeit',
      lanes: [[],[],[],[],[]]
    }
  };
  const t = templates[tpl];
  if(!t) return;
  if(!confirm(`Vorlage "${t.name}" laden? Der aktuelle Plan wird überschrieben.`)) return;
  currentPlan = {lanes: t.lanes.map(l=>[...l])};
  document.getElementById('planName').value = t.name;
  renderPlanner();
  showToast('Vorlage geladen');
}

// ══════════════════════════════════════════════════════
// DRUCKEN
// ══════════════════════════════════════════════════════
function printPlan(){
  // Collect all exercises in plan order
  const items=[];
  currentPlan.lanes.forEach((lane,si)=>{
    (lane||[]).forEach(raw=>{
      const item=_laneItem(raw);
      const ex=exercises.find(e=>e.id===item.id);
      if(ex) items.push({item,ex,si});
    });
  });
  if(!items.length){showToast('Plan ist leer','err');return;}

  // Aggregate materials (unique)
  const matSet=new Set();
  items.forEach(({item,ex})=>{
    const mat=ex.material||'';
    mat.split(',').map(m=>m.trim()).filter(Boolean).forEach(m=>matSet.add(m));
  });
  const materials=[...matSet];

  // Total load by difficulty
  const byDiff={Leicht:0,Mittel:0,Schwer:0,'':0};
  items.forEach(({item,ex})=>{
    const d=parseInt(item.duration??ex.duration??0)||0;
    const diff=item.difficulty??ex.difficulty??'';
    byDiff[diff in byDiff?diff:'']+=d;
  });
  const totalMin=Object.values(byDiff).reduce((a,b)=>a+b,0);

  const planName=document.getElementById('planName').value.trim()||'Trainingsplan';
  const today=new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});

  // Section color lookup
  const secColor=si=>SECS[si]?.color||'#333';
  const secName=si=>SECS[si]?.name||'';

  const cardsHTML=items.map(({item,ex,si},idx)=>{
    const players=item.players??ex.players??'';
    const duration=item.duration??ex.duration??'';
    const difficulty=item.difficulty??ex.difficulty??'';
    const col=secColor(si);
    return`<div class="ex-card">
      <div class="ex-num" style="background:${col}">${idx+1}</div>
      <div class="ex-img">${ex.image?`<img src="${ex.image}" alt="${ex.name}">`:'<div class="ex-img-empty"></div>'}</div>
      <div class="ex-info">
        <div class="ex-sec" style="color:${col}">${secName(si)}</div>
        <div class="ex-name">${ex.name}</div>
        <div class="ex-meta">
          ${players?`<span>👥 ${players}</span>`:''}
          ${duration?`<span>⏱ ${duration} min</span>`:''}
          ${difficulty?`<span>◉ ${difficulty}</span>`:''}
        </div>
        ${ex.desc?`<div class="ex-desc">${ex.desc}</div>`:''}
      </div>
    </div>`;
  }).join('');

  const matHTML=materials.length?`<div class="mat-box">
    <div class="mat-box-title">Material</div>
    <div class="mat-box-items">${materials.map(m=>`<span class="mat-pill">${m}</span>`).join('')}</div>
  </div>`:'';

  const diffRows=[
    {label:'Leicht',color:'#1a7f4b',min:byDiff['Leicht']},
    {label:'Mittel',color:'#e65100',min:byDiff['Mittel']},
    {label:'Hoch',color:'#880e4f',min:byDiff['Schwer']},
  ].filter(r=>r.min>0);
  const totalHTML=totalMin?`<div class="total-box">
    <div>
      <div class="total-label">Gesamtbelastung</div>
      <div class="total-breakdown">
        ${diffRows.map(r=>`<span class="diff-pill" style="background:${r.color}18;color:${r.color};border:1px solid ${r.color}40;">${r.label}: ${r.min} min</span>`).join('')}
        ${byDiff['']>0?`<span class="diff-pill" style="background:#f5f5f5;color:#555;border:1px solid #ccc;">Ohne Angabe: ${byDiff['']} min</span>`:''}
      </div>
    </div>
    <span class="total-val">${totalMin} min</span>
  </div>`:'';

  const html=`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>${planName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;background:#fff;padding:14mm 16mm;}
.brand{text-align:center;margin-bottom:5mm;}
.brand-name{font-size:18pt;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#1a7f4b;}
.brand-sub{font-size:7pt;letter-spacing:3px;text-transform:uppercase;color:#888;margin-top:1px;}
.print-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:5mm;padding-bottom:3mm;border-bottom:2px solid #111;}
.print-title{font-size:16pt;font-weight:900;}
.print-date{font-size:9pt;color:#666;}
.mat-box{background:#f5f5f5;border-radius:5px;padding:5px 10px;margin-bottom:5mm;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.mat-box-title{font-size:7pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#666;white-space:nowrap;}
.mat-box-items{display:flex;flex-wrap:wrap;gap:5px;}
.mat-pill{font-size:8pt;padding:2px 9px;border-radius:20px;background:#fff;border:1px solid #ccc;font-weight:600;}
.ex-card{display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #e8e8e8;page-break-inside:avoid;position:relative;}
.ex-num{flex-shrink:0;width:20px;height:20px;border-radius:50%;color:#fff;font-size:7pt;font-weight:900;display:flex;align-items:center;justify-content:center;margin-top:2px;}
.ex-img{flex-shrink:0;width:200px;height:140px;border-radius:5px;overflow:hidden;border:1px solid #e0e0e0;}
.ex-img img{width:100%;height:100%;object-fit:contain;background:#f0f4f0;}
.ex-img-empty{width:200px;height:140px;background:#f0f4f0;border-radius:5px;}
.ex-info{flex:1;min-width:0;}
.ex-sec{font-size:7pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;}
.ex-name{font-size:12pt;font-weight:900;margin-bottom:4px;}
.ex-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:8pt;color:#444;font-weight:600;margin-bottom:5px;}
.ex-desc{font-size:8.5pt;color:#333;line-height:1.55;white-space:pre-wrap;}
.total-box{margin-top:6mm;padding:8px 0;border-top:2px solid #111;display:flex;justify-content:space-between;align-items:center;gap:12px;}
.total-label{font-size:9pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:4px;}
.total-breakdown{display:flex;flex-wrap:wrap;gap:5px;}
.diff-pill{font-size:8pt;font-weight:700;padding:2px 9px;border-radius:20px;}
.total-val{font-size:16pt;font-weight:900;white-space:nowrap;}
@media print{body{padding:0;}@page{margin:14mm;}}
</style></head><body>
<div class="brand">
  <div class="brand-name">AssistCoach</div>
  <div class="brand-sub">Trainingsplanung</div>
</div>
<div class="print-header">
  <div class="print-title">${planName}</div>
  <div class="print-date">${today}</div>
</div>
${matHTML}
${cardsHTML}
${totalHTML}
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  const w=window.open('','_blank');
  w.document.write(html);
  w.document.close();
}

// SECTION RENDER
// ══════════════════════════════════════════════════════
