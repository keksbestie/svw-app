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
    sport:window.currentSport?.id||'fussball',
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
  if(!_supabase||(!IS_ADMIN&&!IS_REVIEWER))return;
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
        <button onclick="previewSubmittedPlan('${p.id}')" style="padding:4px 10px;background:var(--surface-2,#2a2a2a);color:var(--text-1);border:1px solid var(--border);border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">👁 Anzeigen</button>
        <button onclick="approvePlan('${p.id}')" style="padding:4px 10px;background:#1a7f4b;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">✓ Freigeben</button>
        <button onclick="rejectPlan('${p.id}')" style="padding:4px 10px;background:#c62828;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">✕ Ablehnen</button>
      </div>
    </div>`).join('');
}

let _adminPlanCache=[];
async function previewSubmittedPlan(id){
  if(!_adminPlanCache.length){
    const {data}=await _supabase.from('submitted_plans').select('*').eq('status','pending').order('submitted_at',{ascending:true});
    _adminPlanCache=data||[];
  }
  const plan=_adminPlanCache.find(p=>p.id===id);
  if(!plan)return;

  const planLanes=plan.lanes||[];
  // Collect all exercise IDs across all sections
  const allIds=[];
  planLanes.forEach(section=>{
    (section||[]).forEach(raw=>{
      const item=typeof raw==='string'?{id:raw}:raw;
      if(item.id) allIds.push(item.id);
    });
  });

  // Fetch exercise data from Supabase (includes pending/unapproved)
  let exMap={};
  if(allIds.length){
    const {data:exData}=await _supabase.from('exercises').select('id,name,image,duration,players,difficulty,section').in('id',allIds);
    (exData||[]).forEach(e=>{exMap[e.id]=e;});
  }

  const totalCount=allIds.length;
  const secColors=['#e53935','#1e88e5','#43a047','#fb8c00','#8e24aa'];
  const secHtml=planLanes.map((section,si)=>{
    const items=(section||[]).map(raw=>{
      const item=typeof raw==='string'?{id:raw}:raw;
      const ex=exMap[item.id]||{name:'Unbekannte Übung',image:'',duration:'',players:'',difficulty:''};
      const players=item.players!=null?item.players:(ex.players||'');
      const duration=item.duration!=null?item.duration:(ex.duration||'');
      return`<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border);">
        ${ex.image?`<img src="${ex.image}" style="width:56px;height:42px;object-fit:cover;border-radius:6px;flex-shrink:0;">`:`<div style="width:56px;height:42px;background:var(--border);border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;">📋</div>`}
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;line-height:1.3;">${ex.name}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px;">
            ${duration?`<span style="margin-right:8px;">⏱ ${duration}</span>`:''}
            ${players?`<span>👥 ${players}</span>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
    if(!items) return '';
    const sec=SECS&&SECS[si]?SECS[si]:{name:`Abschnitt ${si+1}`,color:secColors[si]||'#888'};
    return`<div style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:${sec.color}18;margin-bottom:4px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${sec.color};flex-shrink:0;"></div>
        <div style="font-size:11px;font-weight:800;color:${sec.color};letter-spacing:.5px;text-transform:uppercase;">${sec.name}</div>
        <div style="font-size:10px;color:var(--text-3);margin-left:auto;">${(section||[]).length} Übung${(section||[]).length!==1?'en':''}</div>
      </div>
      ${items}
    </div>`;
  }).join('');

  // Modal öffnen
  let modal=document.getElementById('adminPlanPreviewModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='adminPlanPreviewModal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    document.body.appendChild(modal);
  }
  modal.innerHTML=`
    <div style="background:var(--bg);border-radius:16px;max-width:560px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.5);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;">${plan.name}</div>
        <button onclick="document.getElementById('adminPlanPreviewModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-3);">✕</button>
      </div>
      <div style="font-size:11px;color:var(--text-3);margin-bottom:16px;">von ${plan.author_name||'Unbekannt'} · ${plan.date||''} · ${totalCount} Übung${totalCount!==1?'en':''}</div>
      <div>${secHtml||'<div style="color:var(--text-3);font-size:13px;">Keine Übungen im Plan.</div>'}</div>
      <div style="display:flex;gap:8px;margin-top:20px;">
        <button onclick="approvePlan('${plan.id}');document.getElementById('adminPlanPreviewModal').remove()" style="flex:1;padding:10px;background:#1a7f4b;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer;">✓ Freigeben</button>
        <button onclick="rejectPlan('${plan.id}');document.getElementById('adminPlanPreviewModal').remove()" style="flex:1;padding:10px;background:#c62828;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer;">✕ Ablehnen</button>
      </div>
    </div>`;
}

async function approvePlan(id){
  await _supabase.from('submitted_plans').update({status:'approved'}).eq('id',id);
  _adminPlanCache=[];
  showToast('Plan freigegeben');
  loadAdminPlanQueue();
}
async function rejectPlan(id){
  if(!confirm('Plan ablehnen?'))return;
  await _supabase.from('submitted_plans').update({status:'rejected'}).eq('id',id);
  _adminPlanCache=[];
  showToast('Plan abgelehnt');
  loadAdminPlanQueue();
}

// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// LANGZEIT-PLANER — Neu
// ══════════════════════════════════════════════════════

