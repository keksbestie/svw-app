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
  cacheLocal();
  showToast('✓ Plan gespeichert');
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
  const statusBadge=s=>s==='pending'?'<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:10px;background:#fff8e1;color:#f57f17;border:1px solid #ffe082;">In Prüfung</span>':s==='approved'?'<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:10px;background:#e8f5e9;color:#1a7f4b;border:1px solid #a5d6a7;">Veröffentlicht</span>':'';
  el.innerHTML=savedPlans.map(p=>`
    <div class="tpl-item" style="flex-direction:column;align-items:flex-start;gap:4px;" onclick='loadPlan(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
      <div style="display:flex;align-items:center;gap:8px;width:100%;">
        <div class="tpl-ico">📄</div>
        <div style="flex:1;min-width:0;">
          <div class="tpl-name" style="display:flex;align-items:center;gap:6px;">${p.name} ${statusBadge(p.status||'private')}</div>
          <div class="tpl-desc">${p.date} · ${(p.totals||[]).filter(t=>t.count>0).map(t=>t.count+' '+t.name).join(', ')}</div>
        </div>
        ${(!p.status||p.status==='private')?`<button onclick="event.stopPropagation();submitPlanForReview('${p.id}')" style="background:none;border:1px solid var(--accent);color:var(--accent);border-radius:5px;cursor:pointer;font-size:9px;font-weight:800;padding:2px 6px;white-space:nowrap;flex-shrink:0;" title="Plan zur Veröffentlichung einreichen">↑ Veröffentlichen</button>`:''}
        <button onclick="event.stopPropagation();delPlan('${p.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:13px;padding:2px 4px;border-radius:4px;flex-shrink:0;" title="Löschen">🗑</button>
      </div>
    </div>`).join('');
}

async function submitPlanForReview(id){
  if(!currentUser){showToast('Bitte zuerst anmelden','err');return;}
  const plan=savedPlans.find(p=>p.id===id);
  if(!plan){showToast('Plan nicht gefunden','err');return;}
  if(plan.status==='pending'){showToast('Plan befindet sich bereits in der Prüfung');return;}
  if(!confirm(`Plan "${plan.name}" zur Veröffentlichung einreichen?`)) return;
  // Write to submitted_plans table
  const {error}=await _supabase.from('submitted_plans').upsert({
    id:plan.id,
    owner_id:currentUser.id,
    author_name:currentUser.user_metadata?.name||currentUser.email||'',
    name:plan.name,
    date:plan.date,
    lanes:plan.lanes,
    totals:plan.totals,
    status:'pending',
    submitted_at:new Date().toISOString()
  },{onConflict:'id'});
  if(error){showToast('Fehler beim Einreichen: '+error.message,'err');console.error(error);return;}
  plan.status='pending';
  save();
  renderSavedPlans();
  showToast('✓ Plan eingereicht – das Admin-Team prüft ihn.');
}

async function loadMySubmittedPlans(){
  if(!_supabase||!currentUser) return;
  const {data}=await _supabase.from('submitted_plans').select('*').eq('owner_id',currentUser.id).order('submitted_at',{ascending:false});
  renderMyPlans(data||[]);
}

function renderMyPlans(plans){
  const el=document.getElementById('myPlanList');if(!el)return;
  if(!plans.length){el.innerHTML='<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Noch keine eingereichten Pläne.</div>';return;}
  const statusLabel={pending:'In Prüfung',approved:'Veröffentlicht',rejected:'Abgelehnt'};
  const statusColor={pending:'#f57f17',approved:'#1a7f4b',rejected:'#c62828'};
  el.innerHTML=plans.map(p=>`
    <div class="sub-item">
      <div class="sub-item-name">📋 ${p.name}</div>
      <div class="sub-item-meta">
        <span class="sub-status" style="background:${statusColor[p.status]||'#888'}20;color:${statusColor[p.status]||'#888'};border:1px solid ${statusColor[p.status]||'#888'}40;">${statusLabel[p.status]||p.status}</span>
        <span class="sub-date">${p.date||''}</span>
        ${p.status==='pending'?`<button class="sub-action-btn sub-withdraw-btn" onclick="withdrawSubmittedPlan('${p.id}')">Zurückziehen</button>`:''}
      </div>
    </div>`).join('');
}

async function withdrawSubmittedPlan(id){
  if(!confirm('Einreichung zurückziehen?'))return;
  await _supabase.from('submitted_plans').delete().eq('id',id).eq('owner_id',currentUser.id);
  const plan=savedPlans.find(p=>p.id===id);
  if(plan){plan.status='private';save();renderSavedPlans();}
  loadMySubmittedPlans();
  showToast('Einreichung zurückgezogen.');
}

// ── Admin: Plan review queue ────────────────────────
async function loadAdminPlanQueue(){
  if(!_supabase||!IS_ADMIN)return;
  const {data}=await _supabase.from('submitted_plans').select('*').eq('status','pending').order('submitted_at',{ascending:true});
  renderAdminPlanQueue(data||[]);
}

function renderAdminPlanQueue(plans){
  const el=document.getElementById('adminPlanQueue');if(!el)return;
  if(!plans.length){el.innerHTML='<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Keine Pläne in der Warteschlange.</div>';return;}
  el.innerHTML=plans.map(p=>`
    <div class="sub-item">
      <div class="sub-item-name">📋 ${p.name} <span style="font-size:10px;color:var(--text-3);font-weight:400;">von ${p.author_name||'Unbekannt'} · ${p.date||''}</span></div>
      <div class="sub-item-meta" style="gap:6px;">
        <button onclick="approvePlan('${p.id}')" style="padding:4px 10px;background:#1a7f4b;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">✓ Freigeben</button>
        <button onclick="rejectPlan('${p.id}')" style="padding:4px 10px;background:#c62828;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">✕ Ablehnen</button>
      </div>
    </div>`).join('');
}

async function approvePlan(id){
  await _supabase.from('submitted_plans').update({status:'approved'}).eq('id',id);
  showToast('Plan freigegeben');
  loadAdminPlanQueue();
}
async function rejectPlan(id){
  if(!confirm('Plan ablehnen?'))return;
  await _supabase.from('submitted_plans').update({status:'rejected'}).eq('id',id);
  showToast('Plan abgelehnt');
  loadAdminPlanQueue();
}

// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// LANGZEIT-PLANER — Neu
// ══════════════════════════════════════════════════════

