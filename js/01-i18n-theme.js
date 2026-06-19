// ══════════════════════════════════════════════════════════════════
// MODUL: i18n & THEME
// ══════════════════════════════════════════════════════════════════
// Enthält: Sprachumschaltung (DE/EN/ES), Hell-/Dunkel-Theme,
// Vereinsfarben-Anpassung, Tag-Cluster-Konfiguration für Filter.
// Abhängig von: keine anderen Module (kann zuerst geladen werden)
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// I18N – Internationalisierung (DE / EN / ES)
// ══════════════════════════════════════════════════════════════════
const TRANSLATIONS = {
  de: {
    nav_home:'Start', nav_catalog:'Katalog', nav_plan:'Planer', nav_longterm:'Blöcke',
    home_eyebrow:'Nachwuchs · ',
    home_title:'Trainingskatalog',
    home_sub:'Übungen planen, strukturieren und langfristig periodisieren – alles an einem Ort.',
    home_card_catalog:'Übungskatalog', home_card_catalog_desc:'Alle Übungen nach Abschnitt, Thema und Schwierigkeitsgrad durchsuchen und filtern.',
    home_card_plan:'Trainingsplan', home_card_plan_desc:'Einzelne Trainingseinheiten zusammenstellen, speichern und ausdrucken.',
    home_card_blocks:'Langzeitplanung', home_card_blocks_desc:'Mehrwöchige Trainingsblöcke erstellen, verwalten und in die Saison einbinden.',
    home_card_templates:'Vorlagen', home_card_templates_desc:'Fertige Trainings- und Periodisierungsvorlagen direkt laden und anpassen.',
    search_placeholder:'Übung suchen…',
  },
  en: {
    nav_home:'Home', nav_catalog:'Catalog', nav_plan:'Planner', nav_longterm:'Blocks',
    home_eyebrow:'Youth · ',
    home_title:'Training Catalog',
    home_sub:'Plan, structure and periodise your sessions – all in one place.',
    home_card_catalog:'Exercise Catalog', home_card_catalog_desc:'Browse and filter all exercises by section, topic and difficulty.',
    home_card_plan:'Session Planner', home_card_plan_desc:'Build individual training sessions, save them and print them out.',
    home_card_blocks:'Long-Term Planning', home_card_blocks_desc:'Create and manage multi-week training blocks for your season.',
    home_card_templates:'Templates', home_card_templates_desc:'Load ready-made session and periodisation templates and adapt them.',
    search_placeholder:'Search exercise…',
  },
  es: {
    nav_home:'Inicio', nav_catalog:'Catálogo', nav_plan:'Planificador', nav_longterm:'Bloques',
    home_eyebrow:'Categorías inferiores · ',
    home_title:'Catálogo de Entrenamiento',
    home_sub:'Planifica, estructura y periodiza tus sesiones, todo en un solo lugar.',
    home_card_catalog:'Catálogo de ejercicios', home_card_catalog_desc:'Busca y filtra todos los ejercicios por sección, tema y dificultad.',
    home_card_plan:'Planificador de sesión', home_card_plan_desc:'Crea sesiones individuales, guárdalas e imprímelas.',
    home_card_blocks:'Planificación a largo plazo', home_card_blocks_desc:'Crea y gestiona bloques de entrenamiento de varias semanas para la temporada.',
    home_card_templates:'Plantillas', home_card_templates_desc:'Carga plantillas listas de sesión y periodización, y adáptalas.',
    search_placeholder:'Buscar ejercicio…',
  }
};

const LANG_META = {
  de: { flag: '🇩🇪', code: 'DE' },
  en: { flag: '🇬🇧', code: 'EN' },
  es: { flag: '🇪🇸', code: 'ES' }
};

let currentLang = localStorage.getItem('tb_lang') || localStorage.getItem('svw_lang') || 'de';

function applyI18n() {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.de;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });
  // search placeholder
  const si = document.querySelector('.gs-in');
  if (si && t.search_placeholder) si.placeholder = t.search_placeholder;
  // update lang button (both header and home topbar)
  const meta = LANG_META[currentLang];
  const flagEl = document.getElementById('langFlag');
  const codeEl = document.getElementById('langCode');
  if (flagEl) flagEl.textContent = meta.flag;
  if (codeEl) codeEl.textContent = meta.code;
  const homeFlagEl = document.getElementById('homeLangFlag');
  const homeCodeEl = document.getElementById('homeLangCode');
  if (homeFlagEl) homeFlagEl.textContent = meta.flag;
  if (homeCodeEl) homeCodeEl.textContent = meta.code;
  // mark active in dropdown
  document.querySelectorAll('.lang-opt').forEach(o => {
    o.classList.toggle('active', o.dataset.lang === currentLang);
  });
  document.documentElement.lang = currentLang;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('tb_lang', lang);
  applyI18n();
  closeLangDrop();
}

function toggleLangDrop(which) {
  const id = which==='home' ? 'homeLangDrop' : 'langDrop';
  const other = which==='home' ? 'langDrop' : 'homeLangDrop';
  document.getElementById(id).classList.toggle('open');
  document.getElementById(other)?.classList.remove('open');
}

function closeLangDrop() {
  document.getElementById('langDrop')?.classList.remove('open');
  document.getElementById('homeLangDrop')?.classList.remove('open');
}

document.addEventListener('click', e => {
  if (!document.getElementById('langSel').contains(e.target)) closeLangDrop();
});

// ══════════════════════════════════════════════════════════════════
// THEME – Light / Dark Mode
// ══════════════════════════════════════════════════════════════════
let currentTheme = localStorage.getItem('tb_theme') || localStorage.getItem('svw_theme') || 'light';

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
  const homeBtn = document.getElementById('homeThemeBtn');
  if (homeBtn) homeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('tb_theme', t);
  currentTheme = t;
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// ── Font Size ──────────────────────────────────────────
const FS_STEPS = [80, 90, 100, 110, 120, 135];
let currentFsIdx = parseInt(localStorage.getItem('tb_fs_idx') ?? localStorage.getItem('svw_fs_idx') ?? '2');

function applyFontSize(idx) {
  currentFsIdx = Math.max(0, Math.min(FS_STEPS.length - 1, idx));
  const pct = FS_STEPS[currentFsIdx];
  document.body.style.zoom = pct + '%';
  localStorage.setItem('tb_fs_idx', currentFsIdx);
  const el = document.getElementById('cfgFsVal');
  if (el) el.textContent = pct + '%';
}

function adjustFontSize(dir) {
  if (dir === 0) applyFontSize(2); // reset to 100%
  else applyFontSize(currentFsIdx + dir);
}



// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// CLUB THEME ENGINE (prepared for future use)
// ══════════════════════════════════════════════════════════════════
// To activate club colours, call: applyClubTheme('#HEX_PRIMARY', '#HEX_SECONDARY')
// This overrides --accent and --club-secondary globally.
// Club settings can be stored in localStorage under 'svw_club_theme'.
function applyClubTheme(primary, secondary) {
  const root = document.documentElement;
  root.style.setProperty('--accent', primary);
  root.style.setProperty('--accent-d', shadeColor(primary, -15));
  root.style.setProperty('--accent-l', shadeColor(primary, 90));
  root.style.setProperty('--club-secondary', secondary || '#3a3a3a');
  localStorage.setItem('tb_club_theme', JSON.stringify({ primary, secondary }));
}

function resetClubTheme() {
  const root = document.documentElement;
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-d');
  root.style.removeProperty('--accent-l');
  root.style.removeProperty('--club-secondary');
  localStorage.removeItem('tb_club_theme');
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent * 2.55));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent * 2.55));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent * 2.55));
  return '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}

function loadClubTheme() {
  const saved = localStorage.getItem('tb_club_theme') || localStorage.getItem('svw_club_theme');
  if (saved) {
    try { const c = JSON.parse(saved); applyClubTheme(c.primary, c.secondary); } catch(e){}
  }
}

// TAG CLUSTERS — editable at runtime
// ══════════════════════════════════════════════════════
const DEFAULT_CLUSTERS = {
  'ATHLETIK':  {color:'#c62828', bg:'#fdecea', tags:['SPRINT','KOORDINATION','MOBILITY','SPRUNGKRAFT','STABILITÄT','COD','KRAFT','REAKTION','AUSDAUER']},
  'TECHNIK':   {color:'#1565c0', bg:'#e3f0fd', tags:['BALLBEHANDLUNG','PASSSPIEL','DRIBBLING','TORABSCHLUSS','FLANKE','HEREINGABE','SCHUSSTECHNIK','PASSTECHNIK','FIRST-TOUCH','TWO-TOUCH','FUSSBALLTENNIS']},
  'TAKTIK':    {color:'#6a1b9a', bg:'#f3e5f5', tags:['1VS1','2VS2','ZWEIKAMPF','ÜBERZAHL','UMSCHALTEN','PRESSING','VORORIENTIERUNG','HINTERLAUFEN','BALLABSCHIRMEN']},
  'KOGNITION': {color:'#e65100', bg:'#fff3e0', tags:['KOGNITION','ENTSCHEIDUNG','ÜBERSICHT']},
  'POLYSPORT': {color:'#2e7d32', bg:'#e8f5e9', tags:['VOLLEYBALL','HANDBALL','HOCKEY','TCHOUKBALL','SPIKEBALL','POLYSPORT']},
  'SPIEL':     {color:'#ad1457', bg:'#fce4ec', tags:['SPIELFORM','FANGENSPIELE','KLEINFELD','FREIESPIEL','RONDO']},
  'SONSTIGE':  {color:'#455a64', bg:'#eceff1', tags:[]},
};

// Per-section clusters — each section has its own independent cluster config
let SECTION_CLUSTERS = Array.from({length:6}, ()=>JSON.parse(JSON.stringify(DEFAULT_CLUSTERS)));
// Keep TAG_CLUSTERS as alias for global tagStyle lookups (uses active section)
let TAG_CLUSTERS = SECTION_CLUSTERS[0];

function getSecClusters(secIdx){ return SECTION_CLUSTERS[secIdx]||SECTION_CLUSTERS[0]; }

function getCluster(tag, secIdx){
  const clusters = secIdx!=null ? getSecClusters(secIdx) : getSecClusters(activeSec);
  const t=tag.toUpperCase();
  for(const [name,cl] of Object.entries(clusters)){
    if(cl.tags.map(x=>x.toUpperCase()).includes(t)) return{name,...cl};
  }
  // Fallback: check all sections
  for(const sc of SECTION_CLUSTERS){
    for(const [name,cl] of Object.entries(sc)){
      if(cl.tags.map(x=>x.toUpperCase()).includes(t)) return{name,...cl};
    }
  }
  return{name:'SONSTIGE',...clusters['SONSTIGE']};
}

function tagStyle(tag,sel=false){
  const cl=getCluster(tag);
  return`background:${cl.bg};color:${cl.color};${sel?`outline:2px solid ${cl.color};outline-offset:1px;`:''}`;
}

// ══════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════
const SECS=[
  {id:0,name:'Open Field',color:'#008149'},
  {id:1,name:'Warm Up',color:'#1565c0'},
  {id:2,name:'Hinführung',color:'#e65100'},
  {id:3,name:'Hauptteil',color:'#6a1b9a'},
  {id:4,name:'Abschlussspiel',color:'#ad1457'},
  {id:5,name:'Sondertraining',color:'#00695c'},
];
const SK='tb_12';
const ALL_PREV_KEYS=['svw_tb11','svw_tb10','svw_tb9','svw_tb8','svw_tb7','svw_tb6','svw_tb5','svw_tb4','svw_tb_local','svw_tb3','svw_tb2'];

// ── MIGRATION: load from old key if new key is empty ──
function migrateFromOldKeys(){
  // Already have data under current key? nothing to do
  if(localStorage.getItem(SK)) return false;
  // Try each old key newest-first
  for(const oldKey of ALL_PREV_KEYS){
    const raw=localStorage.getItem(oldKey);
    if(!raw) continue;
    try{
      const old=JSON.parse(raw);
      // Migrate: copy exercises, plans, descs, tags, blocks
      exercises=old.exercises||[];
      sectionDescs=old.sectionDescs||['','','','','',''];
      sectionCustomTags=old.sectionCustomTags||[[],[],[],[],[],[]];
      savedPlans=old.savedPlans||[];
      ltpBlocks=old.ltpBlocks||[];
      blockLibrary=old.blockLibrary||[];
      if(old.sectionClusters)SECTION_CLUSTERS=old.sectionClusters;
      else if(old.tagClusters)SECTION_CLUSTERS=Array.from({length:6},()=>JSON.parse(JSON.stringify(old.tagClusters)));
      TAG_CLUSTERS=SECTION_CLUSTERS[activeSec]||SECTION_CLUSTERS[0];
      console.log('Migrated from '+oldKey+': '+exercises.length+' exercises, '+savedPlans.length+' plans');
      return true;
    }catch(e){continue;}
  }
  return false;
}

// ── MERGE: add new default exercises that don't exist yet ──
function mergeNewDefaultExercises(){
  const defaults=defaultData();
  const existingNames=new Set(exercises.map(e=>e.name.toLowerCase().trim()));
  let added=0;
  defaults.forEach(def=>{
    if(!existingNames.has(def.name.toLowerCase().trim())){
      exercises.push(def);
      added++;
    }
  });
  if(added>0) console.log('Added '+added+' new default exercises');
  return added;
}
const DEFAULT_API='https://EURE-IT-URL-HIER/api/trainingsbuch';

let exercises=[], sectionDescs=['','','','','',''], sectionCustomTags=[[],[],[],[],[],[]];
let savedPlans=[], currentPlan={name:'',lanes:[[],[],[],[],[]]};
let ltpBlocks=[];
let activeSec=0, selectedTags=[], activeCluster=null, clusterFilterTags=[];
let formTags=[], formImg=null, editingId=null, descIdx=null, tagIdx=null, dragItem=null;
