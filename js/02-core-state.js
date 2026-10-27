// ══════════════════════════════════════════════════════════════════
// MODUL: CORE / STATE / API
// ══════════════════════════════════════════════════════════════════
// Enthält: globaler Anwendungs-State (exercises, savedPlans, ltpBlocks
// etc.), API-Anbindung (loadAPI/saveAPI), localStorage-Caching,
// Seitennavigation (goPage), Globale Suche.
// WICHTIG: Dieses Modul muss nach data/exercises.default.js und vor
// allen anderen js/-Modulen geladen werden (definiert globalen State).
// ══════════════════════════════════════════════════════════════════
let IS_ADMIN=false, IS_REVIEWER=false, REVIEWER_SPORTS=[], apiOnline=false, syncTO=null;

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════
async function init(){
  applyTheme(localStorage.getItem('tb_theme') || localStorage.getItem('svw_theme')||'light'); applyI18n(); applyFontSize(currentFsIdx);
  applyTheme(localStorage.getItem('tb_theme') || localStorage.getItem('svw_theme')||'light'); loadClubTheme();
  if(typeof handleInviteToken==='function') handleInviteToken();
  // Show app instantly from local cache
  loadLocal();
  hideLS(); renderStbar(); renderSection(); renderSavedPlans(); renderLtp(); goPage('home');
  setupGS();
  // Sync with API in background — no blocking, no re-navigating
  setStat('loading');
  const ok=await loadAPI();
  if(ok){ renderStbar(); renderSection(); renderSavedPlans(); renderLtp(); }
  updateApiBar();
  if(typeof updateSignInBtn==='function') updateSignInBtn();
  if(typeof loadSquad==='function') loadSquad();
  setInterval(()=>{if(apiOnline)silentSync();},60000);
}
function hideLS(){const l=document.getElementById('ls');l.classList.add('fade');setTimeout(()=>l.style.display='none',400);}

// ══════════════════════════════════════════════════════
// SUPABASE API
// ══════════════════════════════════════════════════════
function mapExercise(e){
  return {id:e.id,name:e.name,players:e.players,material:e.material,section:e.section,
    difficulty:e.difficulty,desc:e.description,tags:e.tags||[],image:e.image,status:e.status,duration:e.duration,
    canvasObjects:e.canvas_objects||[],fieldType:e.field_type||'small',sport:e.sport||'fussball',ageGroups:e.age_groups||[]};
}
// Sportartfilter: Übungen ohne sport-Angabe gelten als Fußball
function _curSportId(){return (window.currentSport&&window.currentSport.id)||'fussball';}
function sportExercises(){const s=_curSportId();return exercises.filter(e=>(e.sport||'fussball')===s);}

// ── Altersstufen ──
const AGE_GROUPS=['U7','U9','U11','U13','U15','U17','U19','Erwachsene'];
let ageFilter=null;
const _agePickState={};
function ageLabel(arr){
  if(!arr||!arr.length) return '';
  const idx=arr.map(a=>AGE_GROUPS.indexOf(a)).filter(i=>i>=0).sort((a,b)=>a-b);
  if(!idx.length) return arr.join(', ');
  const contiguous=idx.every((v,i)=>i===0||v===idx[i-1]+1);
  if(contiguous){const a=AGE_GROUPS[idx[0]],b=AGE_GROUPS[idx[idx.length-1]];return a===b?a:a+'–'+b;}
  return idx.map(i=>AGE_GROUPS[i]).join(', ');
}
function _ageChip(label,on,fn,small){
  const pad=small?'4px 10px':'6px 12px', fs=small?'11px':'12px';
  return '<button type="button" class="age-chip" onclick="'+fn+'" style="padding:'+pad+';border-radius:16px;border:1.5px solid '+(on?'var(--accent)':'var(--border)')+';background:'+(on?'var(--accent)':'var(--surface-2)')+';color:'+(on?'#fff':'var(--text-2)')+';font-size:'+fs+';font-weight:700;cursor:pointer;">'+label+'</button>';
}
function renderAgePicker(id,sel,opts){
  const el=document.getElementById(id);if(!el)return;
  _agePickState[id]={sel:AGE_GROUPS.filter(a=>(sel||[]).includes(a)),anchor:null,required:!!(opts&&opts.required),onChange:(opts&&opts.onChange)||null};
  _paintAgePicker(id);
}
function getAgeSel(id){return (_agePickState[id]&&_agePickState[id].sel)||[];}
function _paintAgePicker(id){
  const el=document.getElementById(id),st=_agePickState[id];if(!el||!st)return;
  let hint;
  if(st.anchor) hint='Jetzt den zweiten Jahrgang antippen – alles dazwischen wird mitgewählt.';
  else if(st.required) hint='Pflichtfeld: Mindestens einen Jahrgang wählen. Zwei Jahrgänge antippen wählt alles dazwischen.';
  else hint='Tipp: Zwei Jahrgänge antippen wählt alles dazwischen. Ohne Auswahl gilt „Alle Altersstufen“.';
  const first=st.required
    ?_ageChip('Alle auswählen',st.sel.length===AGE_GROUPS.length,"selectAllAges('"+id+"')")
    :_ageChip('Alle',!st.sel.length,"clearAgePicker('"+id+"')");
  el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:6px;">'
    +first
    +AGE_GROUPS.map(a=>_ageChip(a,st.sel.includes(a),"toggleAgeChip('"+id+"','"+a+"')")).join('')
    +'</div><div style="font-size:11px;color:var(--text-3);margin-top:6px;">'+hint+'</div>';
}
function _ageChanged(id){const st=_agePickState[id];_paintAgePicker(id);if(st&&st.onChange)st.onChange();}
function clearAgePicker(id){const st=_agePickState[id];if(!st)return;st.sel=[];st.anchor=null;_ageChanged(id);}
function selectAllAges(id){const st=_agePickState[id];if(!st)return;st.sel=AGE_GROUPS.slice();st.anchor=null;_ageChanged(id);}
function toggleAgeChip(id,a){
  const st=_agePickState[id];if(!st)return;
  if(st.anchor&&st.anchor!==a){
    const i1=AGE_GROUPS.indexOf(st.anchor),i2=AGE_GROUPS.indexOf(a);
    const lo=Math.min(i1,i2),hi=Math.max(i1,i2);
    AGE_GROUPS.slice(lo,hi+1).forEach(x=>{if(!st.sel.includes(x))st.sel.push(x);});
    st.anchor=null;
  } else if(st.sel.includes(a)){
    st.sel=st.sel.filter(x=>x!==a);st.anchor=null;
  } else {st.sel.push(a);st.anchor=a;}
  st.sel=AGE_GROUPS.filter(x=>st.sel.includes(x));
  _ageChanged(id);
}
function setAgeFilter(a){ageFilter=(ageFilter===a)?null:a;renderSection();}
function ageFilterHTML(){
  return _ageChip('Alle',!ageFilter,"setAgeFilter(ageFilter)",true)
    +AGE_GROUPS.map(a=>_ageChip(a,ageFilter===a,"setAgeFilter('"+a+"')",true)).join('');
}
async function loadAPI(){
  if(!_supabase)return false;
  try{
    const {data:{user}}=await _supabase.auth.getUser();
    currentUser=user; IS_ADMIN=false;
    if(user){
      const {data:profile}=await _supabase.from('profiles').select('role,reviewer_sports,club_id,club_role').eq('id',user.id).single();
      IS_ADMIN=profile?.role==='admin';
      IS_REVIEWER=profile?.role==='reviewer';
      REVIEWER_SPORTS=profile?.reviewer_sports||[];
      if(typeof loadClubData==='function') await loadClubData(user.id);
      if(typeof checkPendingToken==='function') await checkPendingToken(user.id);
    }
    document.body.classList.toggle('admin',IS_ADMIN);
    document.body.classList.toggle('reviewer',IS_REVIEWER);
    const {data:exData,error:exErr}=await _supabase.from('exercises').select('*').eq('status','approved');
    if(exErr)throw exErr;
    // Only overwrite local exercises if Supabase actually has data
    if(exData&&exData.length>0) exercises=exData.map(mapExercise);
    const {data:descData}=await _supabase.from('section_descs').select('*');
    if(descData&&descData.length>0){
      descData.forEach(r=>{if(r.section_idx>=0&&r.section_idx<6)sectionDescs[r.section_idx]=r.description||'';});
    }
    if(user){
      const {data:plansData}=await _supabase.from('plans').select('*').eq('owner_id',user.id);
      const localPlans=(plansData||[]).map(p=>({id:p.id||uid(),name:p.name||'Plan',date:p.date||'',lanes:p.lanes,totals:p.totals||[]}));
      const {data:subPlans}=await _supabase.from('submitted_plans').select('*').eq('owner_id',user.id);
      const submittedMapped=(subPlans||[]).map(p=>({id:p.id,name:p.name||'Plan',date:p.date||'',lanes:p.lanes,totals:p.totals||[],status:p.status}));
      // Merge: submitted plans that aren't already in local plans
      const localIds=new Set(localPlans.map(p=>p.id));
      const merged=[...localPlans,...submittedMapped.filter(p=>!localIds.has(p.id))];
      savedPlans=merged.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      const {data:ltpData}=await _supabase.from('ltp_blocks').select('*').eq('owner_id',user.id);
      ltpBlocks=(ltpData||[]).map(b=>b.weeks);
    }
    if(typeof loadRatings==='function') await loadRatings();
    apiOnline=true; setStat('ok'); cacheLocal(); return true;
  }catch(e){apiOnline=false; setStat('err'); return false;}
}
async function silentSync(){
  if(!_supabase)return;
  try{
    const {data:exData}=await _supabase.from('exercises').select('*').eq('status','approved');
    if(exData&&exData.length>0) exercises=exData.map(mapExercise);
    const {data:descData}=await _supabase.from('section_descs').select('*');
    if(descData&&descData.length>0){
      descData.forEach(r=>{if(r.section_idx>=0&&r.section_idx<6)sectionDescs[r.section_idx]=r.description||'';});
    }
    if(currentUser){
      const {data:plansData}=await _supabase.from('plans').select('*').eq('owner_id',currentUser.id);
      savedPlans=(plansData||[]).map(p=>({id:p.id||uid(),name:p.name||'Plan',date:p.date||'',lanes:p.lanes,totals:p.totals||[]}));
      const {data:ltpData}=await _supabase.from('ltp_blocks').select('*').eq('owner_id',currentUser.id);
      ltpBlocks=(ltpData||[]).map(b=>b.weeks);
    }
    if(typeof loadRatings==='function') await loadRatings();
    apiOnline=true; setStat('ok'); updateCnt(); renderSection(); cacheLocal();
    if(typeof refreshSportAvailability==='function') refreshSportAvailability();
  }catch{apiOnline=false; setStat('err');}
}
async function saveAPI(){
  if(!_supabase||!currentUser||!apiOnline)return;
  setStat('sync');
  try{
    await _supabase.from('plans').delete().eq('owner_id',currentUser.id);
    if(savedPlans.length>0)
      await _supabase.from('plans').insert(savedPlans.map(p=>({owner_id:currentUser.id,name:p.name||'Plan',date:p.date||'',lanes:p.lanes,totals:p.totals||[]})));
    await _supabase.from('ltp_blocks').delete().eq('owner_id',currentUser.id);
    if(ltpBlocks.length>0)
      await _supabase.from('ltp_blocks').insert(ltpBlocks.map(b=>({owner_id:currentUser.id,name:b.name||'Block',weeks:b})));
    if(IS_ADMIN){
      const rows=sectionDescs.map((description,section_idx)=>({section_idx,description:description||''}));
      await _supabase.from('section_descs').upsert(rows,{onConflict:'section_idx'});
    }
    apiOnline=true; setStat('ok'); cacheLocal();
  }catch{apiOnline=false; setStat('err'); showToast('Speichern fehlgeschlagen','warn');}
}
async function retryConn(){const ok=await loadAPI();if(ok){showToast('Verbunden');renderSection();renderSavedPlans();renderLtp();}else showToast('Verbindung fehlgeschlagen','err');updateApiBar();}
function applyData(d){
  exercises=d.exercises||[];sectionDescs=d.sectionDescs||defaultDescs();
  sectionCustomTags=d.sectionCustomTags||[[],[],[],[],[],[]];savedPlans=d.savedPlans||[];
  ltpBlocks=d.ltpBlocks||defaultLtp();
  if(d.sectionClusters)SECTION_CLUSTERS=d.sectionClusters;
  else if(d.tagClusters)SECTION_CLUSTERS=Array.from({length:6},()=>JSON.parse(JSON.stringify(d.tagClusters)));
  TAG_CLUSTERS=SECTION_CLUSTERS[activeSec]||SECTION_CLUSTERS[0];
  if(d.blockLibrary)blockLibrary=d.blockLibrary;
}
function cacheLocal(){
  try{
    // Strip large image data from exercises to keep cache small (images load from Supabase)
    const exLean=exercises.map(({image,...rest})=>rest);
    localStorage.setItem(SK,JSON.stringify({exercises:exLean,sectionDescs,sectionCustomTags,savedPlans,ltpBlocks,blockLibrary,sectionClusters:SECTION_CLUSTERS}));
  }catch(e){console.warn('localStorage voll – Cache übersprungen:',e);}
}
function loadLocal(){
  try{
    const r=localStorage.getItem(SK);
    if(r){
      // Current key exists — load normally
      const d=JSON.parse(r);
      applyData(d);
      // Still merge any new default exercises silently
      const added=mergeNewDefaultExercises();
      if(added>0) save();
    } else {
      // Try to migrate from older versions
      const migrated=migrateFromOldKeys();
      if(migrated){
        // Migrated old data — now merge new exercises on top
        const added=mergeNewDefaultExercises();
        // Ensure desc/ltp defaults if empty
        if(!sectionDescs.filter(Boolean).length) sectionDescs=defaultDescs();
        if(!ltpBlocks.length) ltpBlocks=defaultLtp();
        save();
        console.log('Migration complete. Added '+added+' new exercises.');
      } else {
        // Fresh install — load all defaults
        exercises=defaultData();
        sectionDescs=defaultDescs();
        ltpBlocks=defaultLtp();
        save();
      }
    }
  }catch(e){
    console.warn('Load error, using defaults:',e);
    exercises=defaultData();
    sectionDescs=defaultDescs();
    ltpBlocks=defaultLtp();
  }
}
function save(){updateCnt();cacheLocal();if(syncTO)clearTimeout(syncTO);syncTO=setTimeout(()=>saveAPI(),800);}
function updateCnt(){
  // exercise count handled in header badge
}
function setStat(s){const d=document.getElementById('sdot');if(d)d.className='sdot '+(s==='ok'?'ok':s==='err'?'err':s==='sync'?'sync':'');}
function updateApiBar(){
  const b=document.getElementById('apibar');const m=document.getElementById('apibarMsg');if(!b||!m)return;
  if(apiOnline){b.className='apibar h';}
  else{b.className='apibar err';m.textContent='Server nicht erreichbar – Offline-Modus.';b.classList.remove('h');}
}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5);}

async function uploadImageToStorage(dataUrl){
  if(!_supabase||!dataUrl||!dataUrl.startsWith('data:'))return null;
  try{
    const res=await fetch(dataUrl);
    const blob=await res.blob();
    const filename=uid()+'.png';
    const {error}=await _supabase.storage.from('exercise-images').upload(filename,blob,{contentType:'image/png'});
    if(error)throw error;
    const {data:{publicUrl}}=_supabase.storage.from('exercise-images').getPublicUrl(filename);
    return publicUrl;
  }catch(e){console.warn('Bild-Upload fehlgeschlagen:',e);return null;}
}

async function migrateImagesToStorage(){
  if(!_supabase||!IS_ADMIN){showToast('Nur für Admins','err');return;}
  const {data:exData}=await _supabase.from('exercises').select('id,image').neq('status','deleted');
  if(!exData){showToast('Keine Übungen gefunden','err');return;}
  const toMigrate=exData.filter(e=>e.image&&e.image.startsWith('data:'));
  if(!toMigrate.length){showToast('Nichts zu migrieren');return;}
  showToast(`Migriere ${toMigrate.length} Bilder…`,'');
  let done=0,failed=0;
  for(const ex of toMigrate){
    const url=await uploadImageToStorage(ex.image);
    if(url){
      await _supabase.from('exercises').update({image:url}).eq('id',ex.id);
      done++;
    } else failed++;
  }
  showToast(`Migration abgeschlossen: ${done} ✓, ${failed} fehlgeschlagen`);
  silentSync();
}

// ══════════════════════════════════════════════════════
// PAGE NAV
// ══════════════════════════════════════════════════════
function goPage(name,btn){
  const homeEl=document.getElementById('page-home');

  // ── Go Home ──────────────────────────────────────────
  if(name==='home'){
    document.body.classList.add('on-home');
    homeEl.classList.remove('hidden','fading-out');
    document.querySelectorAll('.home-card').forEach(c=>c.classList.remove('flying'));
    document.querySelector('.home-hero')?.classList.remove('flying');
    document.querySelectorAll('.mb,.bnav-item').forEach(b=>b.classList.remove('active'));
    const hb=btn||document.querySelector('.mb[data-page="home"]');if(hb)hb.classList.add('active');
    if(typeof initSportSelection==='function') initSportSelection();
    return;
  }

  // ── Navigate to any other page ────────────────────────
  const fromHome=document.body.classList.contains('on-home');

  // 1. Update state immediately — no waiting for animation
  document.body.classList.remove('on-home');
  document.querySelectorAll('.page').forEach(p=>{if(p!==homeEl)p.classList.remove('active');});
  const pg=document.getElementById('page-'+name);
  if(pg)pg.classList.add('active');
  document.querySelectorAll('.mb,.bnav-item').forEach(b=>b.classList.remove('active'));
  const nb=btn||document.querySelector(`.mb[data-page="${name}"]`);if(nb)nb.classList.add('active');
  const bb=document.querySelector(`.bnav-item[data-page="${name}"]`);if(bb)bb.classList.add('active');

  // 2. Render page content
  if(name==='planner')renderPlanner();
  if(name==='handbook')renderSection();
  if(name==='longterm')renderLtp();
  if(name==='submit')renderSubmitPage();
  if(name==='account')renderAccountPage();
  if(name==='kader'&&typeof renderKaderPage==='function')renderKaderPage();

  // 3. Scroll to top
  document.documentElement.scrollTop=0; document.body.scrollTop=0;

  // 4. Animate home overlay out (purely visual — state already updated above)
  if(fromHome){
    document.querySelectorAll('.home-card').forEach(c=>c.classList.add('flying'));
    document.querySelector('.home-hero')?.classList.add('flying');
    setTimeout(()=>homeEl.classList.add('fading-out'),200);
    setTimeout(()=>{homeEl.classList.add('hidden');homeEl.classList.remove('fading-out');},950);
  } else {
    homeEl.classList.add('hidden');
    if(pg){pg.classList.add('page-enter');setTimeout(()=>pg.classList.remove('page-enter'),420);}
  }
}

// ══════════════════════════════════════════════════════
// GLOBAL SEARCH
// ══════════════════════════════════════════════════════
function setupGS(){document.addEventListener('click',e=>{if(!e.target.closest('.gs-wrap'))closeGS();});}
function onGS(){
  const q=document.getElementById('gsIn').value.trim();
  document.getElementById('gsX').style.display=q?'block':'none';
  if(!q){closeGS();return;}
  const ql=q.toLowerCase();
  const res=sportExercises().filter(e=>[e.name,e.desc||'',...(e.tags||[]),SECS[e.section]?.name||''].join(' ').toLowerCase().includes(ql));
  const el=document.getElementById('gsRes');
  if(!res.length){el.innerHTML=`<div class="gs-empty">Keine Treffer für „${q}"</div>`;el.classList.add('open');return;}
  const byS={};res.forEach(e=>{if(!byS[e.section])byS[e.section]=[];byS[e.section].push(e);});
  let html='';
  Object.keys(byS).sort().forEach(si=>{
    const s=SECS[si];
    html+=`<div class="grl"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${s.color};margin-right:5px;vertical-align:middle;"></span>${s.name}</div>`;
    byS[si].forEach(e=>{html+=`<div class="gri" onclick="jumpTo(${e.section},'${e.id}')">
      <div class="gri-th">${e.image?`<img src="${e.image}" alt="">`:'⚽'}</div>
      <div><div class="gri-n">${e.name}</div><div class="gri-m">${e.players?'👥 '+e.players:''}</div></div>
    </div>`;});
  });
  el.innerHTML=html;el.classList.add('open');
}
function closeGS(){document.getElementById('gsRes').classList.remove('open');}
function clearGS(){document.getElementById('gsIn').value='';document.getElementById('gsX').style.display='none';closeGS();}
function jumpTo(si,id){clearGS();activeSec=si;selectedTags=[];activeCluster=null;clusterFilterTags=[];goPage('handbook');renderStbar();renderSection();setTimeout(()=>{const c=document.querySelector(`.card[data-id="${id}"]`);if(c){c.scrollIntoView({behavior:'smooth',block:'center'});c.classList.add('hi');setTimeout(()=>c.classList.remove('hi'),2000);}},150);}

// ══════════════════════════════════════════════════════
