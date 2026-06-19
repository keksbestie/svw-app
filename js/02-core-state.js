// ══════════════════════════════════════════════════════════════════
// MODUL: CORE / STATE / API
// ══════════════════════════════════════════════════════════════════
// Enthält: globaler Anwendungs-State (exercises, savedPlans, ltpBlocks
// etc.), API-Anbindung (loadAPI/saveAPI), localStorage-Caching,
// Seitennavigation (goPage), Globale Suche.
// WICHTIG: Dieses Modul muss nach data/exercises.default.js und vor
// allen anderen js/-Modulen geladen werden (definiert globalen State).
// ══════════════════════════════════════════════════════════════════
let IS_ADMIN=false, apiOnline=false, syncTO=null;

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════
async function init(){
  applyTheme(localStorage.getItem('svw_theme')||'light'); applyI18n();
  setStat('loading');
  applyTheme(localStorage.getItem('svw_theme')||'light'); loadClubTheme();
  const ok=await loadAPI(); if(!ok)loadLocal();
  hideLS(); renderStbar(); renderSection(); renderSavedPlans(); renderLtp(); goPage('home');
  setupGS(); updateApiBar();
  setInterval(()=>{if(apiOnline)silentSync();},60000);
}
function hideLS(){const l=document.getElementById('ls');l.classList.add('fade');setTimeout(()=>l.style.display='none',400);}

// ══════════════════════════════════════════════════════
// SUPABASE API
// ══════════════════════════════════════════════════════
function mapExercise(e){
  return {id:e.id,name:e.name,players:e.players,material:e.material,section:e.section,
    difficulty:e.difficulty,desc:e.description,tags:e.tags||[],image:e.image,status:e.status};
}
async function loadAPI(){
  if(!_supabase)return false;
  try{
    const {data:{user}}=await _supabase.auth.getUser();
    currentUser=user; IS_ADMIN=false;
    if(user){
      const {data:profile}=await _supabase.from('profiles').select('role').eq('id',user.id).single();
      IS_ADMIN=profile?.role==='admin';
    }
    document.body.classList.toggle('admin',IS_ADMIN);
    const {data:exData,error:exErr}=await _supabase.from('exercises').select('*').eq('status','approved');
    if(exErr)throw exErr;
    exercises=exData.map(mapExercise);
    if(user){
      const {data:plansData}=await _supabase.from('plans').select('*').eq('owner_id',user.id);
      savedPlans=(plansData||[]).map(p=>p.lanes);
      const {data:ltpData}=await _supabase.from('ltp_blocks').select('*').eq('owner_id',user.id);
      ltpBlocks=(ltpData||[]).map(b=>b.weeks);
    }
    apiOnline=true; setStat('ok'); cacheLocal(); return true;
  }catch{apiOnline=false; setStat('err'); return false;}
}
async function silentSync(){
  if(!_supabase)return;
  try{
    const {data:exData}=await _supabase.from('exercises').select('*').eq('status','approved');
    exercises=exData.map(mapExercise);
    if(currentUser){
      const {data:plansData}=await _supabase.from('plans').select('*').eq('owner_id',currentUser.id);
      savedPlans=(plansData||[]).map(p=>p.lanes);
      const {data:ltpData}=await _supabase.from('ltp_blocks').select('*').eq('owner_id',currentUser.id);
      ltpBlocks=(ltpData||[]).map(b=>b.weeks);
    }
    apiOnline=true; setStat('ok'); updateCnt(); renderSection(); cacheLocal();
  }catch{apiOnline=false; setStat('err');}
}
async function saveAPI(){
  if(!_supabase||!currentUser||!apiOnline)return;
  setStat('sync');
  try{
    await _supabase.from('plans').delete().eq('owner_id',currentUser.id);
    if(savedPlans.length>0)
      await _supabase.from('plans').insert(savedPlans.map(p=>({owner_id:currentUser.id,name:p.name||'Plan',lanes:p})));
    await _supabase.from('ltp_blocks').delete().eq('owner_id',currentUser.id);
    if(ltpBlocks.length>0)
      await _supabase.from('ltp_blocks').insert(ltpBlocks.map(b=>({owner_id:currentUser.id,name:b.name||'Block',weeks:b})));
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
function cacheLocal(){localStorage.setItem(SK,JSON.stringify({exercises,sectionDescs,sectionCustomTags,savedPlans,ltpBlocks,blockLibrary,sectionClusters:SECTION_CLUSTERS}));}
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

// ══════════════════════════════════════════════════════
// PAGE NAV
// ══════════════════════════════════════════════════════
function goPage(name,btn){
  const homeEl=document.getElementById('page-home');
  const isOnHome=document.body.classList.contains('on-home');

  if(name==='home'){
    document.querySelectorAll('.mb,.bnav-item').forEach(b=>b.classList.remove('active'));
    const b=btn||document.querySelector('.mb[data-page="home"]');if(b)b.classList.add('active');
    homeEl.classList.remove('hidden','fading-out');
    document.querySelectorAll('.home-card').forEach(c=>c.classList.remove('flying'));
    document.querySelector('.home-hero')?.classList.remove('flying');
    document.body.classList.add('on-home');
    return;
  }

  if(isOnHome){
    // Step 1: render the target page fully while overlay still covers it
    _prepPage(name,btn);

    // Step 2: wait 2 frames so browser finishes layout/paint, THEN animate
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      // Start card + hero fly-up
      document.querySelectorAll('.home-card').forEach(c=>c.classList.add('flying'));
      document.querySelector('.home-hero')?.classList.add('flying');

      // After cards are mostly airborne, start overlay fade
      setTimeout(()=>{
        document.body.classList.remove('on-home');
        homeEl.classList.add('fading-out');
      }, 200);

      // After fade completes — page already fully rendered, no animation needed
      setTimeout(()=>{
        homeEl.classList.add('hidden');
        homeEl.classList.remove('fading-out');
      }, 950);
    }));

  } else {
    _prepPage(name,btn);
    const pg=document.getElementById('page-'+name);
    if(pg){ pg.classList.add('page-enter'); setTimeout(()=>pg.classList.remove('page-enter'),420); }
  }
}

function _prepPage(name,btn){
  document.querySelectorAll('.page').forEach(p=>{ if(p!==document.getElementById('page-home')) p.classList.remove('active'); });
  document.querySelectorAll('.mb,.bnav-item').forEach(b=>b.classList.remove('active'));
  const pg=document.getElementById('page-'+name);
  if(pg) pg.classList.add('active');
  const b=btn||document.querySelector(`.mb[data-page="${name}"]`);if(b)b.classList.add('active');
  const bn=document.querySelector(`.bnav-item[data-page="${name}"]`);if(bn)bn.classList.add('active');
  if(name==='planner')renderPlanner();
  if(name==='handbook')renderSection();
  if(name==='longterm')renderLtp();
  if(name==='submit')renderSubmitPage();
  if(name==='account')renderAccountPage();
  // Scroll instantly while overlay still covers — no visible jump when revealed
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
  if(name==='handbook'){
    requestAnimationFrame(()=>{
      const stbar=document.getElementById('stbar');
      if(stbar){ document.documentElement.scrollTop=stbar.offsetTop+stbar.offsetHeight; document.body.scrollTop=stbar.offsetTop+stbar.offsetHeight; }
    });
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
  const res=exercises.filter(e=>[e.name,e.desc||'',...(e.tags||[]),SECS[e.section]?.name||''].join(' ').toLowerCase().includes(ql));
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
