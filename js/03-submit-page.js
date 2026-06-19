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
  try{
    let q=_supabase.from('exercises').select('*').neq('status','approved');
    if(!IS_ADMIN) q=q.eq('created_by',currentUser.id);
    const {data}=await q;
    submissions=(data||[]).map(e=>({
      id:e.id,name:e.name,desc:e.description,players:e.players,
      duration:e.duration,material:e.material,section:e.section,
      intensity:e.difficulty,tags:e.tags||[],diagram:e.image,
      author:e.created_by,status:e.status,
      submittedAt:new Date(e.created_at).toLocaleDateString('de-DE'),
      submittedTs:new Date(e.created_at).getTime()
    }));
  }catch{submissions=[];}
}
function saveSubmissions(){}

async function renderSubmitPage(){
  await loadSubmissions();
  if(!submitUser){
    document.getElementById('submitLoginWrap').style.display='block';
    document.getElementById('submitLoggedWrap').style.display='none';
  } else {
    document.getElementById('submitLoginWrap').style.display='none';
    document.getElementById('submitLoggedWrap').style.display='block';
    document.getElementById('submitUserTag').textContent = submitUser.name;
    document.getElementById('sAuthorPreview').textContent = submitUser.name;
    renderSubmitChecklist_init();
    renderMySubmissions();
    if(IS_ADMIN){ renderAdminQueue(); renderUserList(); }
    document.getElementById('adminQueueWrap').style.display = IS_ADMIN ? 'block' : 'none';
    document.getElementById('adminUserWrap').style.display = IS_ADMIN ? 'block' : 'none';
    // Init canvas after DOM is visible
    setTimeout(()=>initSubmitCanvas(), 80);
  }
}

async function doLogin(){
  const email=(document.getElementById('loginEmail').value||'').trim();
  const pass=document.getElementById('loginPass').value||'';
  if(!email||!pass){showToast('E-Mail und Passwort eingeben','err');return;}
  const {data,error}=await _supabase.auth.signInWithPassword({email,password:pass});
  if(error){showToast('Login fehlgeschlagen: '+error.message,'err');return;}
  currentUser=data.user;
  const {data:profile}=await _supabase.from('profiles').select('role').eq('id',data.user.id).single();
  IS_ADMIN=profile?.role==='admin';
  document.body.classList.toggle('admin',IS_ADMIN);
  submitUser={name:data.user.email,isDemo:false,id:data.user.id};
  await silentSync();
  renderSubmitPage();
}

async function doRegister(){
  const email=(document.getElementById('loginEmail').value||'').trim();
  const pass=document.getElementById('loginPass').value||'';
  if(!email||!pass){showToast('E-Mail und Passwort eingeben','err');return;}
  const {error}=await _supabase.auth.signUp({email,password:pass});
  if(error){showToast('Registrierung fehlgeschlagen: '+error.message,'err');return;}
  showToast('Bestätigungs-E-Mail gesendet – bitte E-Mail prüfen');
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

// ── Full canvas engine for submit form ──────────────
let sCurTool='player', sCanvasObjects=[], sUndoStack=[];
let sLinePhase=0, sLineStart=null, sIsDribbling=false, sDribblePoints=[];
let sSelectedObjIdx=null, sCanvasInited=false;

function initSubmitCanvas(){
  if(sCanvasInited) return;
  const c = document.getElementById('sCanvas'); if(!c) return;
  sCanvasInited = true;
  const dpr = window.devicePixelRatio||1;
  const cssW = c.parentElement.clientWidth || 800;
  const cssH = Math.round(cssW * 0.63);
  c.width = cssW * dpr; c.height = cssH * dpr;
  c.style.width = cssW+'px'; c.style.height = cssH+'px';
  const sctx = c.getContext('2d');
  sctx.scale(dpr, dpr);
  c.addEventListener('click', sScanvasClick);
  c.addEventListener('mousemove', sScanvasMove);
  c.addEventListener('contextmenu', e=>{ e.preventDefault(); sHandleRightClick(e); });
  c.addEventListener('touchstart', e=>{
    e.preventDefault();
    const t=e.touches[0], r=c.getBoundingClientRect();
    sScanvasClick({clientX:t.clientX, clientY:t.clientY});
  },{passive:false});
  sRedraw();
}

function sGetXY(e){
  const c=document.getElementById('sCanvas'); if(!c) return {x:0,y:0};
  const r=c.getBoundingClientRect();
  // Always return CSS-pixel coords — ctx is already scaled by dpr
  const cx = e.clientX!==undefined ? e.clientX : (e.offsetX||0)+r.left;
  const cy = e.clientY!==undefined ? e.clientY : (e.offsetY||0)+r.top;
  return {x: cx - r.left, y: cy - r.top};
}

function sHandleRightClick(e){
  const {x,y}=sGetXY(e);
  const found=[...sCanvasObjects.entries()].reverse().find(([,o])=>
    o.type!=='line'&&o.type!=='dribble'&&Math.hypot((o.x||0)-x,(o.y||0)-y)<24
  );
  if(found){
    const [idx,o]=found;
    if(o.angle!==undefined){
      sPushUndo();
      o.angle=(o.angle||0)+Math.PI/8; // 22.5°
      sSelectedObjIdx=idx;
      sRedraw(); sExportCanvas();
    }
  }
}

function sScanvasClick(e){
  const {x,y}=sGetXY(e);
  sPushUndo();
  if(sCurTool==='select'){
    const found=[...sCanvasObjects.entries()].reverse().find(([,o])=>Math.hypot((o.x||o.x1)-x,(o.y||o.y1)-y)<16);
    sSelectedObjIdx=found?found[0]:null; sRedraw(); return;
  }
  if(sCurTool==='erase'){
    const idx=[...sCanvasObjects.entries()].reverse().find(([,o])=>Math.hypot((o.x||o.x1)-x,(o.y||o.y1)-y)<16);
    if(idx!==undefined){ sCanvasObjects.splice(idx[0],1); }
    sRedraw(); sExportCanvas(); return;
  }
  if(sCurTool==='pass'||sCurTool==='run'){
    if(!sLinePhase){ sLineStart={x,y}; sLinePhase=1; }
    else{ sCanvasObjects.push({type:'line',kind:sCurTool,x1:sLineStart.x,y1:sLineStart.y,x2:x,y2:y}); sLinePhase=0; sLineStart=null; }
    sRedraw(); sExportCanvas(); return;
  }
  if(sCurTool==='dribble'){
    if(!sIsDribbling){ sIsDribbling=true; sDribblePoints=[{x,y}]; }
    else{ sDribblePoints.push({x,y}); if(sDribblePoints.length>1){ sCanvasObjects.push({type:'dribble',points:[...sDribblePoints]}); sIsDribbling=false; sDribblePoints=[]; } }
    sRedraw(); sExportCanvas(); return;
  }
  if(sCurTool==='player'){
    const col=document.getElementById('sPlayerColor')?.value||'#1565c0';
    const cnt=sCanvasObjects.filter(o=>o.type==='player'&&o.color===col).length;
    sCanvasObjects.push({type:'player',x,y,color:col,label:String.fromCharCode(65+cnt),angle:0});
  } else if(sCurTool==='ball'){
    sCanvasObjects.push({type:'ball',x,y});
  } else if(sCurTool==='equip'){
    sCanvasObjects.push({type:'equip',x,y,equip:document.getElementById('sEquipType')?.value||'cone',angle:0});
  } else if(sCurTool==='goal'){
    sCanvasObjects.push({type:'goal',x,y,goalType:document.getElementById('sGoalType')?.value||'mini',angle:0});
  }
  sRedraw(); sExportCanvas();
}

function sScanvasMove(e){
  if(!sLinePhase||!sLineStart) return;
  sRedraw();
  const {x,y}=sGetXY(e);
  const c=document.getElementById('sCanvas'); if(!c) return;
  const ctx=c.getContext('2d');
  ctx.save();
  ctx.strokeStyle=sCurTool==='run'?'rgba(255,224,130,.6)':'rgba(255,255,255,.5)';
  ctx.lineWidth=2; ctx.setLineDash(sCurTool==='run'?[7,5]:[]);
  ctx.beginPath(); ctx.moveTo(sLineStart.x,sLineStart.y); ctx.lineTo(x,y); ctx.stroke();
  ctx.restore();
}

function sRotateSelected(deg){
  if(sSelectedObjIdx===null) return;
  const o=sCanvasObjects[sSelectedObjIdx]; if(!o) return;
  o.angle=((o.angle||0)+deg)%360; sRedraw(); sExportCanvas();
}

function sPushUndo(){ sUndoStack.push(JSON.stringify(sCanvasObjects)); if(sUndoStack.length>30)sUndoStack.shift(); }
function sUndoDraw(){ if(!sUndoStack.length){showToast('Nichts rückgängig');return;} sCanvasObjects=JSON.parse(sUndoStack.pop()); sRedraw(); sExportCanvas(); }
function sClearCanvas(){ if(!confirm('Diagramm leeren?'))return; sPushUndo(); sCanvasObjects=[]; sLinePhase=0; sLineStart=null; sIsDribbling=false; sDribblePoints=[]; sSelectedObjIdx=null; sRedraw(); submitCanvasData=null; updateSubmitChecklist(); }
function setSTool(t){ sCurTool=t; sLinePhase=0; sLineStart=null; sIsDribbling=false; sDribblePoints=[]; document.querySelectorAll('[id^="stb_"]').forEach(b=>b.classList.remove('active')); const el=document.getElementById('stb_'+t); if(el)el.classList.add('active'); }

function sExportCanvas(){
  const c=document.getElementById('sCanvas'); if(!c) return;
  submitCanvasData = sCanvasObjects.length>0 ? c.toDataURL('image/png') : null;
  updateSubmitChecklist();
}

function sRedraw(){
  const c=document.getElementById('sCanvas'); if(!c) return;
  const ctx=c.getContext('2d');
  // Use CSS dimensions — ctx is already scaled by dpr
  const w=parseFloat(c.style.width)||c.width;
  const h=parseFloat(c.style.height)||c.height;
  sDrawField(ctx,w,h,document.getElementById('sFieldType')?.value||'small');
  sCanvasObjects.forEach((o,i)=>sDrawObj(ctx,o,i===sSelectedObjIdx));
  if(sIsDribbling&&sDribblePoints.length>0){
    ctx.save(); ctx.strokeStyle='rgba(165,214,167,.7)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(sDribblePoints[0].x,sDribblePoints[0].y);
    sDribblePoints.forEach(p=>ctx.lineTo(p.x,p.y)); ctx.stroke(); ctx.restore();
  }
}

// Submit canvas uses same draw logic as main canvas
// by temporarily swapping global ctx/canvasEl and passing field type directly
function sWithCtx(sctx, cssW, cssH, fn){
  const _ctx=ctx, _cv=canvasEl;
  ctx=sctx;
  canvasEl={style:{width:cssW+'px',height:cssH+'px'},width:cssW,height:cssH};
  fn();
  ctx=_ctx; canvasEl=_cv;
}

function sDrawField(sctx,w,h,type){
  sWithCtx(sctx,w,h,()=>{
    ctx.fillStyle='#2d8a4e';ctx.fillRect(0,0,w,h);
    for(let i=0;i<8;i++){ctx.fillStyle=i%2===0?'rgba(0,0,0,.05)':'rgba(255,255,255,.04)';ctx.fillRect(0,i*(h/8),w,h/8);}
    ctx.strokeStyle='rgba(255,255,255,.88)';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);
    const p=Math.round(Math.min(w,h)*0.04);
    if(type==='full')drawFull(w,h,p);
    else if(type==='half')drawHalf(w,h,p);
    else if(type==='small')drawSmall(w,h,p);
    else drawNeutral(w,h,p);
  });
}

function sDrawObj(sctx,o,sel){
  const c=document.getElementById('sCanvas');
  const w=parseFloat(c?.style.width)||800, h=parseFloat(c?.style.height)||504;
  sWithCtx(sctx,w,h,()=>drawObj(o,sel));
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
  const {error}=await _supabase.from('exercises').insert({
    name:document.getElementById('sName').value.trim(),
    description:document.getElementById('sDesc').value.trim(),
    players:document.getElementById('sPlayers').value.trim(),
    material:document.getElementById('sMat').value.trim(),
    section:sec,
    difficulty:document.getElementById('sIntensity').value,
    tags:submitTags,
    image:submitCanvasData,
    created_by:currentUser.id,
    status:'pending'
  });
  if(error){showToast('Fehler beim Einreichen','err');return;}
  showToast('✓ Übung eingereicht! Das Admin-Team prüft sie.');
  renderSubmitChecklist_init();
  submitCanvasData=null;
  sCanvasObjects=[];sUndoStack=[];sLinePhase=0;sLineStart=null;
  sIsDribbling=false;sDribblePoints=[];sSelectedObjIdx=null;
  sCanvasInited=false;
  setTimeout(()=>initSubmitCanvas(),80);
  await loadSubmissions();
  renderMySubmissions();
  if(IS_ADMIN)renderAdminQueue();
}

// ── My Submissions ───────────────────────────────────
function renderMySubmissions(){
  if(!submitUser) return;
  const el = document.getElementById('mySubList'); if(!el) return;
  loadSubmissions();
  const mine = submissions.filter(s => s.author === submitUser.name);
  if(!mine.length){ el.innerHTML='<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Noch keine Einreichungen.</div>'; return; }
  const statusLabel = {pending:'Ausstehend', review:'In Review', approved:'Freigegeben', rejected:'Abgelehnt'};
  el.innerHTML = mine.map(s=>`
    <div class="sub-item">
      <div class="sub-item-name">${s.name}</div>
      <div class="sub-item-meta">
        <span class="sub-status ${s.status}">${statusLabel[s.status]||s.status}</span>
        <span class="sub-date">${s.submittedAt}</span>
      </div>
    </div>`).join('');
}

// ── Admin Queue ──────────────────────────────────────
function renderAdminQueue(){
  const el = document.getElementById('queueCards'); if(!el) return;
  loadSubmissions();
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

function openQueueSection(secIdx){
  loadSubmissions();
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
  loadSubmissions();
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

