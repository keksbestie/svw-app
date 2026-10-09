// ══════════════════════════════════════════════════════════════════
// MODUL: TRAININGSPLANER (DRAG & DROP)
// ══════════════════════════════════════════════════════════════════
// Enthält: Übungen per Drag&Drop in Trainingsabschnitte (Lanes)
// ziehen, Plan speichern/laden/löschen, Trainings-Vorlagen.
// ══════════════════════════════════════════════════════════════════
function renderPlanner(){
  renderLanes();renderSavedPlans();
  const d=document.getElementById('planDate');
  if(d&&!d.value) d.value=new Date().toISOString().slice(0,10);
  if(typeof initPlanSquad==='function') initPlanSquad();
}

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
          ⏱
          <button class="pi-dur-step" onclick="stepPlanDur('${ex.id}',${si},-1);event.stopPropagation()" title="−1 min">−</button>
          <input class="pi-ovr-in pi-dur-in" value="${duration}" style="width:${Math.max(24,(String(duration).length)*9)}px;color:#1a56c4;"
            type="number" min="1" max="120"
            onchange="setPlanOverride('${ex.id}',${si},'duration',parseInt(this.value)||null)"
            onclick="event.stopPropagation()" title="Leer lassen für Standardwert">
          <button class="pi-dur-step" onclick="stepPlanDur('${ex.id}',${si},1);event.stopPropagation()" title="+1 min">+</button>
          min
          ${hasDurOvr?`<button class="pi-ovr-rst" onclick="resetPlanOverride('${ex.id}',${si},'duration');event.stopPropagation()" title="Zurücksetzen">↺</button>`:''}
        </span>`:''}
      </div>
    </div>
    <button class="pi-rm" onclick="removePlanLane('${ex.id}',${si})">✕</button>
    ${squadForPlan().length>0?`<div class="pi-squad-wrap" style="position:relative;">
      <button class="pi-squad-btn" onclick="toggleExcludeDrop('${ex.id}',${si},this);event.stopPropagation()" title="Spieler ausschließen" style="background:none;border:none;cursor:pointer;padding:2px 5px;color:${(item.excludedIds||[]).length>0?'#e53935':'var(--gd2)'};font-size:11px;font-weight:700;border-radius:5px;" onmouseenter="this.style.background='var(--off)'" onmouseleave="this.style.background='none'">
        👥${(item.excludedIds||[]).length>0?` −${item.excludedIds.length}`:''}
      </button>
    </div>`:''}
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

function stepPlanDur(id,si,delta){
  const lane=currentPlan.lanes[si]||[];
  const idx=lane.findIndex(raw=>_laneItem(raw).id===id);
  if(idx<0)return;
  const item=_laneItem(lane[idx]);
  const ex=exercises.find(e=>e.id===id)||{};
  const cur=parseInt(item.duration??ex.duration??0)||0;
  const next=Math.max(1,cur+delta);
  item.duration=next; lane[idx]=item;
  currentPlan.lanes[si]=lane;
  save();updatePlanCart();renderLanes();
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
function clearPlan(){
  if(!confirm('Trainingsplan leeren? Alle Übungen werden entfernt.')) return;
  currentPlan.lanes=[[],[],[],[],[]];
  if(typeof planSquadAbsent!=='undefined') planSquadAbsent.clear();
  save();
  renderPlanner();
  updatePlanCart();
}

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

  // Aggregate materials: take the maximum simultaneous quantity needed.
  // Parse "2x Hütchen" / "2× Hütchen" / "Hütchen" into {qty, name}.
  // For sequential exercises the max across exercises suffices;
  // parallel exercises (marked in _cartParallel) count on top of the rest.
  function parseMat(str){
    const m=str.match(/^(\d+)\s*[x×]\s*(.+)$/i);
    return m?{qty:parseInt(m[1]),name:m[2].trim()}:{qty:1,name:str.trim()};
  }
  // Build max-qty map for non-parallel items, then add parallel on top
  const matMax={};  // name → max qty among sequential exercises
  const matPar={};  // name → sum of parallel quantities
  items.forEach(({item,ex})=>{
    const isParallel=typeof _cartParallel!=='undefined'&&_cartParallel.has(ex.id);
    (ex.material||'').split(',').map(m=>m.trim()).filter(Boolean).forEach(raw=>{
      const {qty,name}=parseMat(raw);
      if(isParallel){
        matPar[name]=(matPar[name]||0)+qty;
      } else {
        matMax[name]=Math.max(matMax[name]||0,qty);
      }
    });
  });
  // Combine: sequential max + parallel sum
  const matAll={...matMax};
  Object.entries(matPar).forEach(([name,qty])=>{ matAll[name]=(matAll[name]||0)+qty; });
  const materials=Object.entries(matAll).map(([name,qty])=>qty>1?`${qty}× ${name}`:name);

  // Total load by difficulty
  const byDiff={Leicht:0,Mittel:0,Schwer:0,'':0};
  items.forEach(({item,ex})=>{
    const d=parseInt(item.duration??ex.duration??0)||0;
    const diff=item.difficulty??ex.difficulty??'';
    byDiff[diff in byDiff?diff:'']+=d;
  });
  const totalMin=Object.values(byDiff).reduce((a,b)=>a+b,0);

  const planName=document.getElementById('planName').value.trim()||'Trainingsplan';
  const dateVal=document.getElementById('planDate')?.value;
  const printDate=dateVal?new Date(dateVal).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';

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
.doc-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5mm;}
.brand{display:flex;align-items:center;gap:7px;}
.brand-logo{width:40px;height:40px;border-radius:27%;display:block;flex-shrink:0;}
.brand-text{display:flex;flex-direction:column;}
.brand-name{font-size:14pt;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#1a7f4b;line-height:1.1;}
.brand-sub{font-size:6pt;letter-spacing:2px;text-transform:uppercase;color:#888;margin-top:1px;}
.club-logo{max-height:40px;max-width:110px;object-fit:contain;}
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
<div class="doc-top">
  <div class="brand">
    <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" class="brand-logo" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pr1a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f5c33"/><stop offset="1" stop-color="#0a3d22"/></linearGradient>
    <linearGradient id="pr1b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d2e1a"/><stop offset="1" stop-color="#061209"/></linearGradient>
    <clipPath id="prclip"><rect width="256" height="256" rx="90"/></clipPath>
    <filter id="prglow"><feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/><feFlood flood-color="#22c55e" flood-opacity="0.7" result="color"/><feComposite in="color" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="256" height="256" rx="90" fill="url(#pr1b)"/>
  <g clip-path="url(#prclip)">
    <polygon points="0,0 256,0 256,256" fill="url(#pr1a)"/>
    <image href="data:image/png;base64,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" x="0" y="0" width="78" height="78" opacity="0.3"/>
    <image href="data:image/png;base64,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" x="178" y="0" width="78" height="78" opacity="0.3"/>
    <image href="data:image/png;base64,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" x="0" y="178" width="78" height="78" opacity="0.3"/>
    <image href="data:image/png;base64,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" x="178" y="178" width="78" height="78" opacity="0.3"/>
    <text x="128" y="175" font-family="Arial Black,Helvetica,sans-serif" font-size="145" text-anchor="middle" fill="white" font-weight="900" filter="url(#prglow)">A</text>
  </g>
</svg>
    <div class="brand-text">
      <div class="brand-name">AssistCoach</div>
      <div class="brand-sub">Trainingsplanung</div>
    </div>
  </div>
  ${typeof clubLogoUrl!=='undefined'&&clubLogoUrl?`<img class="club-logo" src="${clubLogoUrl}" alt="Vereinslogo">`:''}
</div>
<div class="print-header">
  <div class="print-title">${planName}</div>
  ${printDate?`<div class="print-date">${printDate}</div>`:''}
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
