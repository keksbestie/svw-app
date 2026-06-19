// ══════════════════════════════════════════════════════════════════
// MODUL: TRAININGSPLAN SPEICHERN / LADEN
// ══════════════════════════════════════════════════════════════════
// Enthält: Gespeicherte Pläne verwalten (Liste, Laden, Löschen,
// Umbenennen-Konflikt-Dialog).
// ══════════════════════════════════════════════════════════════════
function savePlan(){
  const name=document.getElementById('planName').value.trim()||'Unbenannter Plan';
  const tot=currentPlan.lanes.reduce((a,l)=>a+l.length,0);
  if(!tot){showToast('Plan ist leer','err');return;}
  const existing=savedPlans.find(p=>p.name===name);
  if(existing){
    document.getElementById('dupPlanNameDisplay').textContent='"'+name+'"';
    document.getElementById('dupPlanNewName').value=name+' (Kopie)';
    openMod('dupPlanMod');
    return;
  }
  commitSavePlan(name);
}

function dupPlanOverwrite(){
  const name=document.getElementById('planName').value.trim()||'Unbenannter Plan';
  closeMod('dupPlanMod');
  savedPlans=savedPlans.filter(p=>p.name!==name);
  commitSavePlan(name);
}

function dupPlanRename(){
  const newName=document.getElementById('dupPlanNewName').value.trim();
  if(!newName){showToast('Bitte neuen Titel eingeben','err');return;}
  if(savedPlans.find(p=>p.name===newName)){showToast('Dieser Name existiert bereits','err');return;}
  closeMod('dupPlanMod');
  document.getElementById('planName').value=newName;
  commitSavePlan(newName);
}

function commitSavePlan(name){
  const plan={
    id:uid(), name,
    date:new Date().toLocaleDateString('de-DE'),
    lanes:currentPlan.lanes.map(l=>[...l]),
    totals:SECS.map((s,i)=>({name:s.name,count:(currentPlan.lanes[i]||[]).length}))
  };
  savedPlans.unshift(plan);
  if(savedPlans.length>30) savedPlans.pop();
  try{
    localStorage.setItem(SK, JSON.stringify({exercises,sectionDescs,sectionCustomTags,savedPlans,ltpBlocks,blockLibrary,sectionClusters:SECTION_CLUSTERS}));
    showToast('✓ Plan gespeichert');
  } catch(e){
    showToast('Speichern fehlgeschlagen','err');
    console.error('savePlan localStorage error:', e);
    return;
  }
  renderSavedPlans();
  renderLtpDayPlanSelect();
  save();
}
function loadPlan(p){currentPlan={name:p.name,lanes:p.lanes.map(l=>[...l])};document.getElementById('planName').value=p.name;renderPlanner();showToast('Plan geladen');}
function delPlan(id){if(!confirm('Plan löschen?'))return;savedPlans=savedPlans.filter(p=>p.id!==id);save();renderSavedPlans();}
function renderSavedPlans(){
  const el=document.getElementById('splist');if(!el)return;
  if(!savedPlans.length){
    el.innerHTML='<div style="font-size:11px;color:var(--text-3);padding:6px 2px;">Noch keine gespeicherten Pläne.</div>';
    return;
  }
  el.innerHTML=savedPlans.map(p=>`
    <div class="tpl-item" style="flex-direction:column;align-items:flex-start;gap:4px;" onclick='loadPlan(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
      <div style="display:flex;align-items:center;gap:8px;width:100%;">
        <div class="tpl-ico">📄</div>
        <div style="flex:1;min-width:0;">
          <div class="tpl-name">${p.name}</div>
          <div class="tpl-desc">${p.date} · ${p.totals.filter(t=>t.count>0).map(t=>t.count+' '+t.name).join(', ')}</div>
        </div>
        <button onclick="event.stopPropagation();delPlan('${p.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:13px;padding:2px 4px;border-radius:4px;flex-shrink:0;" title="Löschen">🗑</button>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// LANGZEIT-PLANER — Neu
// ══════════════════════════════════════════════════════

