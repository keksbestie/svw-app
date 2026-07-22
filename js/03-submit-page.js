// ══════════════════════════════════════════════════════════════════
// MODUL: ÜBUNG EINREICHEN (SUBMIT-SEITE)
// ══════════════════════════════════════════════════════════════════
// Enthält: Login (Demo), Formular zum Einreichen neuer Übungen,
// Felddiagramm-Editor für die Submit-Seite, Admin-Prüf-Workflow
// (Freigeben / Zurückweisen / Löschen von Einreichungen).
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// SUBMIT PAGE — Übung einreichen
// ══════════════════════════════════════════════════════

let submitUser = null; // {name, isDemo}
let submitTags = [];
let submitCanvasData = null; // base64 from canvas
let submissions = []; // array of submission objects
let reviewingId = null;

async function loadSubmissions(){
  if(!currentUser){submissions=[];return;}
  let q=_supabase.from('exercises').select('*').neq('status','approved');
  if(!IS_ADMIN) q=q.eq('created_by',currentUser.id);
  const {data,error}=await q;
if(error){console.error('loadSubmissions error:',error);submissions=[];return;}
  submissions=(data||[]).map(e=>({
    id:e.id,name:e.name,desc:e.description,players:e.players,
    duration:e.duration,material:e.material,section:e.section,
    intensity:e.difficulty,tags:e.tags||[],diagram:e.image,
    author:e.created_by,status:e.status,
    submittedAt:new Date(e.created_at).toLocaleDateString('de-DE'),
    submittedTs:new Date(e.created_at).getTime()
  }));
}
function saveSubmissions(){}

async function renderSubmitPage(){
  // Restore submitUser from existing Supabase session if not set
  if(!submitUser && currentUser){
    const displayName=currentUser.user_metadata?.username||currentUser.email;
    submitUser={name:displayName,isDemo:false,id:currentUser.id};
  }
  await loadSubmissions();
  if(!submitUser){
    document.getElementById('submitLoginWrap').style.display='block';
    document.getElementById('submitLoggedWrap').style.display='none';
    document.getElementById('loginEmail').value='';
    document.getElementById('loginPass').value='';
  } else {
    document.getElementById('submitLoginWrap').style.display='none';
    document.getElementById('submitLoggedWrap').style.display='block';
    document.getElementById('submitUserTag').textContent = submitUser.name;
    document.getElementById('sAuthorPreview').textContent = submitUser.name;
    renderSubmitChecklist_init();
    _renderMySubmissionsFromCache();
    if(IS_ADMIN){ _renderAdminQueueFromCache(); renderUserList(); }
    document.getElementById('adminQueueWrap').style.display = IS_ADMIN ? 'block' : 'none';
    document.getElementById('adminUserWrap').style.display = IS_ADMIN ? 'block' : 'none';
    // Canvas wird per Button im fieldOverlay geöffnet
  }
}

async function doLogin(){
  const email=(document.getElementById('loginEmail').value||'').trim();
  const pass=document.getElementById('loginPass').value||'';
  if(!email||!pass){showToast('E-Mail und Passwort eingeben','err');return;}
  const btn=document.getElementById('loginBtn');
  if(btn){btn.disabled=true;btn.textContent='Anmelden…';}
  const {data,error}=await _supabase.auth.signInWithPassword({email,password:pass});
  if(error){
    if(btn){btn.disabled=false;btn.textContent='Anmelden';}
    showToast('Login fehlgeschlagen: '+error.message,'err');return;
  }
  currentUser=data.user;
  const {data:profile}=await _supabase.from('profiles').select('role').eq('id',data.user.id).single();
  IS_ADMIN=profile?.role==='admin';
  document.body.classList.toggle('admin',IS_ADMIN);
  const displayName=data.user.user_metadata?.username||data.user.email;
  submitUser={name:displayName,isDemo:false,id:data.user.id};
  renderSubmitPage(); // show page immediately
  silentSync();       // sync data in background
}

function toggleRegisterMode(){
  const usernameField=document.getElementById('loginUsername');
  const loginBtn=document.getElementById('loginBtn');
  const registerBtn=document.getElementById('registerBtn');
  const isRegMode=usernameField.style.display!=='none';
  if(isRegMode){
    usernameField.style.display='none';
    loginBtn.textContent='Anmelden';
    loginBtn.onclick=doLogin;
    registerBtn.textContent='Neu registrieren';
  } else {
    usernameField.style.display='block';
    loginBtn.textContent='Registrieren';
    loginBtn.onclick=doRegister;
    registerBtn.textContent='Zurück zum Login';
  }
}

async function doRegister(){
  const email=(document.getElementById('loginEmail').value||'').trim();
  const pass=document.getElementById('loginPass').value||'';
  const username=(document.getElementById('loginUsername').value||'').trim();
  if(!email||!pass||!username){showToast('Alle Felder ausfüllen','err');return;}
  const {error}=await _supabase.auth.signUp({email,password:pass,options:{data:{username}}});
  if(error){showToast('Registrierung fehlgeschlagen: '+error.message,'err');return;}
  // Show confirmation pending screen instead of toast
  document.getElementById('loginForm').style.display='none';
  document.getElementById('forgotForm').style.display='none';
  document.getElementById('confirmPendingMsg').style.display='block';
}

function showForgotPassword(){
  document.getElementById('loginForm').style.display='none';
  document.getElementById('forgotForm').style.display='block';
  document.getElementById('confirmPendingMsg').style.display='none';
  document.getElementById('resetEmail').value=document.getElementById('loginEmail').value||'';
}

function hideForgotPassword(){
  document.getElementById('forgotForm').style.display='none';
  document.getElementById('loginForm').style.display='block';
}

function backToLogin(){
  document.getElementById('confirmPendingMsg').style.display='none';
  document.getElementById('loginForm').style.display='block';
  // Reset to login mode (not register)
  document.getElementById('loginUsername').style.display='none';
  document.getElementById('loginBtn').textContent='Anmelden';
  document.getElementById('loginBtn').onclick=doLogin;
  document.getElementById('registerBtn').textContent='Neu registrieren';
}

async function doResetPassword(){
  const email=(document.getElementById('resetEmail').value||'').trim();
  if(!email){showToast('E-Mail-Adresse eingeben','err');return;}
  const redirectUrl=window.location.origin+window.location.pathname;
  const {error}=await _supabase.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl});
  if(error){showToast('Fehler: '+error.message,'err');return;}
  showToast('Reset-Link gesendet – bitte E-Mail prüfen');
  hideForgotPassword();
}

function showSetNewPasswordDialog(){
  // Navigate to submit page so the dialog is visible
  goPage('submit');
  document.getElementById('submitLoginWrap').style.display='block';
  document.getElementById('submitLoggedWrap').style.display='none';
  document.getElementById('loginForm').style.display='none';
  document.getElementById('forgotForm').style.display='none';
  document.getElementById('confirmPendingMsg').style.display='none';
  document.getElementById('setNewPasswordForm').style.display='block';
  document.getElementById('newPassword1').value='';
  document.getElementById('newPassword2').value='';
}

async function doSetNewPassword(){
  const p1=(document.getElementById('newPassword1').value||'');
  const p2=(document.getElementById('newPassword2').value||'');
  if(!p1||!p2){showToast('Beide Felder ausfüllen','err');return;}
  if(p1.length<6){showToast('Passwort muss mindestens 6 Zeichen haben','err');return;}
  if(p1!==p2){showToast('Passwörter stimmen nicht überein','err');return;}
  const {error}=await _supabase.auth.updateUser({password:p1});
  if(error){showToast('Fehler: '+error.message,'err');return;}
  showToast('Passwort erfolgreich gesetzt – du bist jetzt angemeldet');
  document.getElementById('setNewPasswordForm').style.display='none';
  // Session is now active — reload submit page
  const {data:{user}}=await _supabase.auth.getUser();
  if(user){
    currentUser=user;
    const {data:profile}=await _supabase.from('profiles').select('role').eq('id',user.id).single();
    IS_ADMIN=profile?.role==='admin';
    document.body.classList.toggle('admin',IS_ADMIN);
    const displayName=user.user_metadata?.username||user.email;
    submitUser={name:displayName,isDemo:false,id:user.id};
  }
  renderSubmitPage();
}

async function doLogout(){
  await _supabase.auth.signOut();
  currentUser=null; IS_ADMIN=false;
  document.body.classList.remove('admin');
  submitUser=null; submitTags=[]; submitCanvasData=null;
  renderSubmitPage();
}

// ── Material builder for submit form ────────────────
function updateSMatField(){
  const sels = document.querySelectorAll('.mat-sel[data-smat]');
  const counted = [];
  sels.forEach(s=>{ const v=parseInt(s.value)||0; if(v>0) counted.push(v+'× '+s.dataset.smat); });
  const free = (document.getElementById('sMatFree')||{value:''}).value.trim();
  const parts = [...counted];
  if(free) parts.push(...free.split(',').map(x=>x.trim()).filter(Boolean));
  const f = document.getElementById('sMat'); if(f) f.value = parts.join(', ');
}

// ── Checklist logic ──────────────────────────────────
function renderSubmitChecklist_init(){
  submitTags = [];
  renderSTagDisplay();
  document.getElementById('sName').value='';
  document.getElementById('sDesc').value='';
  document.getElementById('sPlayers').value='';
  document.getElementById('sDuration').value='';
  document.getElementById('sSec').value='';
  document.getElementById('sIntensity').value='';
  document.getElementById('sMat').value='';
  document.getElementById('sDescCount').textContent='0 Zeichen';
  updateSubmitChecklist();
}

function updateSubmitChecklist(){
  const name = (document.getElementById('sName')||{value:''}).value.trim();
  const desc = (document.getElementById('sDesc')||{value:''}).value.trim();
  const players = (document.getElementById('sPlayers')||{value:''}).value.trim();
  const duration = (document.getElementById('sDuration')||{value:''}).value.trim();
  const sec = (document.getElementById('sSec')||{value:''}).value;
  const intensity = (document.getElementById('sIntensity')||{value:''}).value;
  const dc = document.getElementById('sDescCount');
  if(dc) dc.textContent = desc.length + ' Zeichen';

  const checks = {
    'chk-name': name.length >= 2,
    'chk-desc': desc.length >= 20,
    'chk-players': players.length > 0,
    'chk-duration': duration.length > 0 && parseInt(duration) > 0,
    'chk-intensity': intensity !== '',
    'chk-section': sec !== '',
    'chk-tags': submitTags.length >= 3,
    'chk-canvas': !!submitCanvasData,
  };

  let allOk = true;
  Object.entries(checks).forEach(([id,ok])=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(!ok) allOk = false;
    el.classList.toggle('ok', ok);
    const dot = el.querySelector('.chk-dot');
    if(dot) dot.textContent = ok ? '✓' : '';
  });

  const btn = document.getElementById('submitBtn');
  if(btn) btn.disabled = !allOk;
}

// ── Tags for submit form ─────────────────────────────
function addSTag(){
  const inp = document.getElementById('sTagIn');
  if(!inp) return;
  const v = inp.value.trim().toUpperCase();
  if(v && !submitTags.includes(v)){ submitTags.push(v); inp.value=''; renderSTagDisplay(); updateSubmitChecklist(); }
  else inp.value='';
}
function removeSTag(t){ submitTags = submitTags.filter(x=>x!==t); renderSTagDisplay(); updateSubmitChecklist(); }
function renderSTagDisplay(){
  const el = document.getElementById('sAtags'); if(!el) return;
  el.innerHTML = submitTags.map(t=>`<span class="atag" style="${tagStyle(t)}">${t}<button onclick="removeSTag('${t}')" style="color:inherit;background:none;border:none;cursor:pointer;margin-left:3px;font-size:11px;">×</button></span>`).join('');
}

// ── Submit exercise ──────────────────────────────────
async function submitExercise(){
  if(!submitUser||!currentUser)return;
  const sec=parseInt(document.getElementById('sSec').value);
  // Upload image to Storage (avoid storing large base64 in DB)
  let imageUrl=submitCanvasData||null;
  if(submitCanvasData){
    showToast('Bild wird hochgeladen…','');
    const uploaded=await uploadImageToStorage(submitCanvasData);
    if(uploaded)imageUrl=uploaded;
  }
  const {error}=await _supabase.from('exercises').insert({
    name:document.getElementById('sName').value.trim(),
    description:document.getElementById('sDesc').value.trim(),
    players:document.getElementById('sPlayers').value.trim(),
    material:document.getElementById('sMat').value.trim(),
    section:sec,
    difficulty:document.getElementById('sIntensity').value,
    tags:submitTags,
    image:imageUrl,
    canvas_objects:canvasObjects.length?canvasObjects:null,
    created_by:currentUser.id,
    status:'pending'
  });
  if(error){showToast('Fehler beim Einreichen','err');return;}
  showToast('✓ Übung eingereicht! Das Admin-Team prüft sie.');
  renderSubmitChecklist_init();
  submitCanvasData=null;
  const sPreview=document.getElementById('sPreviewWrap');
  if(sPreview) sPreview.style.display='none';
  canvasObjects=[];playerCounters={};undoStack=[];selectedObjIdx=null;linePhase=0;lineStart=null;
  await loadSubmissions();
  _renderMySubmissionsFromCache();
  if(IS_ADMIN) _renderAdminQueueFromCache();
}

// ── My Submissions ───────────────────────────────────
function _renderMySubmissionsFromCache(){
  if(!submitUser) return;
  const el = document.getElementById('mySubList'); if(!el) return;
  const mine = submissions.filter(s => s.author === currentUser?.id && (s.status==='pending'||s.status==='review'))
                          .sort((a,b)=>b.submittedTs-a.submittedTs);
  if(!mine.length){ el.innerHTML='<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Noch keine Einreichungen.</div>'; return; }
  const statusLabel = {pending:'Ausstehend', review:'In Review', approved:'Freigegeben', rejected:'Abgelehnt'};
  el.innerHTML = mine.map(s=>`
    <div class="sub-item">
      <div class="sub-item-name">${s.name}</div>
      <div class="sub-item-meta">
        <span class="sub-status ${s.status}">${statusLabel[s.status]||s.status}</span>
        <span class="sub-date">${s.submittedAt}</span>
        ${s.status==='pending'?`
          <button class="sub-action-btn sub-edit-btn" onclick="editSubmission('${s.id}')">Bearbeiten</button>
          <button class="sub-action-btn sub-withdraw-btn" onclick="withdrawSubmission('${s.id}')">Zurückziehen</button>
        `:''}
      </div>
    </div>`).join('');
}
async function withdrawSubmission(id){
  if(!confirm('Einreichung wirklich zurückziehen?')) return;
  const {error}=await _supabase.from('exercises').delete().eq('id',id).eq('created_by',currentUser.id);
  if(error){showToast('Fehler beim Zurückziehen','err');return;}
  showToast('Einreichung zurückgezogen.');
  await loadSubmissions();
  _renderMySubmissionsFromCache();
  if(IS_ADMIN) _renderAdminQueueFromCache();
}
async function editSubmission(id){
  const s=submissions.find(x=>x.id===id); if(!s) return;
  // Zurückziehen und Formular vorausfüllen
  const {error}=await _supabase.from('exercises').delete().eq('id',id).eq('created_by',currentUser.id);
  if(error){showToast('Fehler','err');return;}
  // Formular befüllen
  document.getElementById('sName').value=s.name||'';
  document.getElementById('sDesc').value=s.desc||'';
  document.getElementById('sPlayers').value=s.players||'';
  document.getElementById('sDuration').value=s.duration||'';
  document.getElementById('sIntensity').value=s.intensity||'';
  document.getElementById('sSec').value=s.section??'';
  submitTags=s.tags||[];
  renderSTagDisplay();
  if(s.diagram){submitCanvasData=s.diagram;const p=document.getElementById('sPreviewWrap');const img=document.getElementById('sPreviewImg');if(p&&img){img.src=s.diagram;p.style.display='block';}}
  updateSubmitChecklist();
  await loadSubmissions();
  _renderMySubmissionsFromCache();
  document.querySelector('.submit-form-wrap')?.scrollIntoView({behavior:'smooth',block:'start'});
  showToast('Übung zum Bearbeiten geladen – nach Änderung erneut einreichen.');
}
async function renderMySubmissions(){
  await loadSubmissions();
  _renderMySubmissionsFromCache();
}

// ── Admin Queue ──────────────────────────────────────
function _renderAdminQueueFromCache(){
  const el = document.getElementById('queueCards'); if(!el) return;
  const pending = submissions.filter(s=>s.status==='pending'||s.status==='review');
  el.innerHTML = SECS.map((s,i)=>{
    const count = pending.filter(sub=>sub.section===i).length;
    return `<div class="queue-card" onclick="openQueueSection(${i})" style="--sc:${s.color}">
      <div class="queue-card-top">
        <div class="queue-card-dot" style="background:${s.color}"></div>
        <span class="queue-badge ${count===0?'zero':''}">${count}</span>
      </div>
      <div class="queue-card-name">${s.name}</div>
      <div class="queue-card-desc">${count===0?'Keine offenen Einreichungen':count+' Übung'+(count!==1?'en':'')+' warten auf Prüfung'}</div>
    </div>`;
  }).join('');
}
async function renderAdminQueue(){
  await loadSubmissions();
  _renderAdminQueueFromCache();
}

async function openQueueSection(secIdx){
  await loadSubmissions();
  const subs = submissions.filter(s=>(s.status==='pending'||s.status==='review') && s.section===secIdx)
                          .sort((a,b)=>a.submittedTs-b.submittedTs); // älteste zuerst
  const el = document.getElementById('subListContent'); if(!el) return;
  document.getElementById('subListModTit').textContent = SECS[secIdx].name + ' – Einreichungen';
  if(!subs.length){
    el.innerHTML='<div style="font-size:13px;color:var(--text-3);padding:12px;">Keine offenen Einreichungen für diesen Abschnitt.</div>';
  } else {
    el.innerHTML = subs.map(s=>`
      <div class="sub-list-item" onclick="openReviewMod('${s.id}')">
        <div class="sub-list-thumb">${s.diagram?`<img src="${s.diagram}" style="width:100%;height:100%;object-fit:cover;">`:'⚽'}</div>
        <div class="sub-list-info">
          <div class="sub-list-name">${s.name}</div>
          <div class="sub-list-meta">👤 ${s.author} · ${SECS[s.section].name} · ${s.tags.slice(0,3).join(', ')}</div>
        </div>
        <div class="sub-list-date">${s.submittedAt}</div>
      </div>`).join('');
  }
  openMod('subListMod');
}

function openReviewMod(id){
  const s = submissions.find(x=>x.id===id); if(!s) return;
  reviewingId = id;
  document.getElementById('reviewModTit').textContent = s.name;
  document.getElementById('reviewAuthorName').textContent = s.author;
  document.getElementById('reviewDate').textContent = 'Eingereicht: ' + s.submittedAt;
  document.getElementById('rv-name').value = s.name;
  document.getElementById('rv-desc').value = s.desc;
  document.getElementById('rv-players').value = s.players||'';
  document.getElementById('rv-duration').value = s.duration||'';
  document.getElementById('rv-mat').value = s.material||'';
  document.getElementById('rv-sec').value = s.section;
  document.getElementById('rv-intensity').value = s.intensity||'Leicht';
  document.getElementById('rv-tags').value = (s.tags||[]).join(', ');
  // Show diagram
  const cw = document.getElementById('rv-canvas-wrap');
  if(s.diagram){ cw.innerHTML=`<img src="${s.diagram}" style="width:100%;display:block;border-radius:6px;">`; }
  else { cw.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-3);">Kein Diagramm</div>'; }
  closeMod('subListMod');
  openMod('reviewMod');
}

async function renderUserList(){
  const el=document.getElementById('userList');if(!el)return;
  const {data:users}=await _supabase.from('profiles').select('id,email,role');
  if(!users||!users.length){el.innerHTML='<div style="font-size:13px;color:var(--text-3);">Keine Trainer gefunden.</div>';return;}
  el.innerHTML=users.map(u=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface-2);border-radius:9px;border:1px solid var(--border);">
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--text-1);">${u.email||u.id}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px;">${u.role==='admin'?'Admin':'Trainer'}</div>
      </div>
      ${u.id===currentUser?.id?'<span style="font-size:11px;color:var(--text-3);">Du</span>':
        u.role==='admin'
          ?`<button onclick="setUserRole('${u.id}','trainer')" style="padding:6px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text-1);">Admin entziehen</button>`
          :`<button onclick="setUserRole('${u.id}','admin')" style="padding:6px 12px;background:var(--g);color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">Admin machen</button>`
      }
    </div>`).join('');
}

async function setUserRole(userId,role){
  await _supabase.from('profiles').update({role}).eq('id',userId);
  renderUserList();
  showToast(role==='admin'?'Admin-Rechte vergeben':'Admin-Rechte entzogen');
}

async function reviewAction(action){
  const updates={
    name:document.getElementById('rv-name').value.trim(),
    description:document.getElementById('rv-desc').value.trim(),
    players:document.getElementById('rv-players').value.trim(),
    material:document.getElementById('rv-mat').value.trim(),
    section:parseInt(document.getElementById('rv-sec').value),
    difficulty:document.getElementById('rv-intensity').value,
    tags:document.getElementById('rv-tags').value.split(',').map(t=>t.trim().toUpperCase()).filter(Boolean)
  };
  if(action==='delete'){
    await _supabase.from('exercises').delete().eq('id',reviewingId);
    showToast('Übung abgelehnt');
  } else if(action==='review'){
    await _supabase.from('exercises').update({...updates,status:'review'}).eq('id',reviewingId);
    showToast('In Review markiert');
  } else if(action==='approve'){
    await _supabase.from('exercises').update({...updates,status:'approved'}).eq('id',reviewingId);
    const {data}=await _supabase.from('exercises').select('*').eq('id',reviewingId);
    if(data&&data[0])exercises.push(mapExercise(data[0]));
    showToast('✓ Übung in den Katalog übernommen!');
  }
  await loadSubmissions();
  closeMod('reviewMod');
  renderAdminQueue();
  renderMySubmissions();
}


// ══════════════════════════════════════════════════════
// GEAR DROPDOWN (Einstellungen-Menü oben rechts)
// ══════════════════════════════════════════════════════

function toggleCfgDrop(){
  const drop=document.getElementById('cfgDrop');
  const isOpen=drop.classList.contains('open');
  if(!isOpen) updateCfgDropHeader();
  drop.classList.toggle('open',!isOpen);
}

function closeCfgDrop(){
  document.getElementById('cfgDrop')?.classList.remove('open');
}

function updateCfgDropHeader(){
  const uname=document.getElementById('cfgUname');
  const email=document.getElementById('cfgEmail');
  const avatar=document.getElementById('cfgAvatar');
  if(currentUser){
    const name=currentUser.user_metadata?.username||currentUser.email;
    uname.textContent=name;
    email.textContent=currentUser.email;
    avatar.textContent=(name[0]||'?').toUpperCase();
  } else {
    uname.textContent='Nicht angemeldet';
    email.textContent='';
    avatar.textContent='?';
  }
}

document.addEventListener('click',e=>{
  const sel=document.getElementById('cfgSel');
  if(sel&&!sel.contains(e.target)) closeCfgDrop();
});

// ══════════════════════════════════════════════════════
// ACCOUNT PAGE
// ══════════════════════════════════════════════════════

function switchAccTab(tab){
  document.getElementById('accPanelProfile').style.display=tab==='profile'?'':'none';
  document.getElementById('accPanelPlans').style.display=tab==='plans'?'':'none';
  document.getElementById('accTabProfile').classList.toggle('acc-tab--active',tab==='profile');
  document.getElementById('accTabPlans').classList.toggle('acc-tab--active',tab==='plans');
  if(tab==='plans') renderMyAccPlans();
}

function renderAccountPage(){
  if(!currentUser) return;
  const name=currentUser.user_metadata?.username||'';
  document.getElementById('accUsernameIn').value=name;
  document.getElementById('accEmailIn').value=currentUser.email||'';
  document.getElementById('accDisplayName').textContent=name||currentUser.email;
  document.getElementById('accDisplayEmail').textContent=currentUser.email;
  const avatar=document.getElementById('accAvatarBig');
  if(avatar) avatar.textContent=(name[0]||currentUser.email[0]||'?').toUpperCase();
  // public flag from metadata
  const pub=currentUser.user_metadata?.publicName===true;
  document.getElementById('accPublicName').checked=pub;
}

async function saveAccountProfile(){
  if(!currentUser){showToast('Nicht angemeldet','err');return;}
  const username=document.getElementById('accUsernameIn').value.trim();
  const email=document.getElementById('accEmailIn').value.trim();
  if(!username){showToast('Benutzername darf nicht leer sein','err');return;}
  const updates={data:{...currentUser.user_metadata,username}};
  if(email&&email!==currentUser.email) updates.email=email;
  const {data,error}=await _supabase.auth.updateUser(updates);
  if(error){showToast('Fehler: '+error.message,'err');return;}
  currentUser=data.user;
  if(submitUser) submitUser.name=username;
  renderAccountPage();
  updateCfgDropHeader();
  showToast('Profil gespeichert ✓');
}

async function saveAccountVisibility(){
  if(!currentUser){showToast('Nicht angemeldet','err');return;}
  const pub=document.getElementById('accPublicName').checked;
  const {data,error}=await _supabase.auth.updateUser({data:{...currentUser.user_metadata,publicName:pub}});
  if(error){showToast('Fehler: '+error.message,'err');return;}
  currentUser=data.user;
  showToast('Einstellung gespeichert ✓');
}

function renderMyAccPlans(){
  const list=document.getElementById('accPlansList');
  if(!list) return;
  const saved=JSON.parse(localStorage.getItem('savedPlans')||'[]');
  if(!saved.length){
    list.innerHTML='<div style="text-align:center;color:var(--gd2);font-size:14px;padding:40px 0;">Keine gespeicherten Pläne vorhanden.</div>';
    return;
  }
  list.innerHTML=saved.map((p,i)=>`
    <div style="background:var(--surface);border-radius:10px;padding:14px 18px;box-shadow:var(--sh);display:flex;align-items:center;gap:12px;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:15px;">${p.name||'Plan '+(i+1)}</div>
        <div style="font-size:11px;color:var(--gd2);margin-top:2px;">${p.date||''}</div>
      </div>
      <button onclick="goPage('planner')" style="padding:7px 14px;background:var(--accent);color:#fff;border:none;border-radius:7px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;cursor:pointer;">Öffnen</button>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════
// HELP PANEL
// ══════════════════════════════════════════════════════

function toggleHelpPanel(){
  const panel=document.getElementById('helpPanel');
  const overlay=document.getElementById('helpOverlay');
  const isOpen=panel.classList.contains('open');
  if(isOpen){ closeHelpPanel(); } else { openHelpPanel(); }
}

function openHelpPanel(){
  const panel=document.getElementById('helpPanel');
  const overlay=document.getElementById('helpOverlay');
  panel.style.display='flex';
  overlay.style.display='block';
  requestAnimationFrame(()=>panel.classList.add('open'));
  closeCfgDrop();
}

function closeHelpPanel(){
  const panel=document.getElementById('helpPanel');
  const overlay=document.getElementById('helpOverlay');
  panel.classList.remove('open');
  overlay.style.display='none';
  setTimeout(()=>{ if(!panel.classList.contains('open')) panel.style.display='none'; },300);
}
