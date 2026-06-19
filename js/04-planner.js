// ══════════════════════════════════════════════════════════════════
// MODUL: TRAININGSPLANER (DRAG & DROP)
// ══════════════════════════════════════════════════════════════════
// Enthält: Übungen per Drag&Drop in Trainingsabschnitte (Lanes)
// ziehen, Plan speichern/laden/löschen, Trainings-Vorlagen.
// ══════════════════════════════════════════════════════════════════
function renderPlanner(){renderLanes();renderSavedPlans();}

function renderLanes(){
  const el=document.getElementById('lanes');if(!el)return;
  const planSecs=SECS.slice(0,5);
  el.innerHTML=planSecs.map((s,i)=>{
    const items=(currentPlan.lanes[i]||[]).map(id=>exercises.find(e=>e.id===id)).filter(Boolean);
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
            :items.map(e=>piHTML(e,i,s.color)).join('')}
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

function piHTML(e,si,col){
  const dc=e.difficulty==='Leicht'?'dl':e.difficulty==='Mittel'?'dm':'ds';
  return`<div class="pi" data-id="${e.id}" draggable="true">
    <div class="pi-dh">⠿</div>
    <div class="pi-body">
      <div class="pi-name">${e.name}</div>
      <div class="pi-meta">
        ${e.players?`<span class="mbadge p">👥 ${e.players}</span>`:''}
        ${e.difficulty?`<span class="mbadge ${dc}">${e.difficulty}</span>`:''}
        ${e.duration?`<span class="mbadge" style="background:#e8f0fe;color:#1a56c4;">⏱ ${e.duration} min</span>`:''}
      </div>
    </div>
    <button class="pi-rm" onclick="removePlanLane('${e.id}',${si})">✕</button>
  </div>`;
}

function removePlanLane(id,si){
  currentPlan.lanes[si]=(currentPlan.lanes[si]||[]).filter(x=>x!==id);
  renderLanes();updatePlanCart();
}

function addToPlan(id,si){
  if(!currentPlan.lanes[si]) currentPlan.lanes[si]=[];
  if(!currentPlan.lanes[si].includes(id)){
    currentPlan.lanes[si].push(id);
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
    const inPlan=(currentPlan.lanes[si]||[]).includes(e.id);
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

// SECTION RENDER
// ══════════════════════════════════════════════════════
