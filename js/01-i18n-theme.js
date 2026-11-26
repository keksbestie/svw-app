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
    home_eyebrow:'Nachwuchs',
    home_title:'AssistCoach',
    home_sub:'Übungen planen, strukturieren und langfristig periodisieren – alles an einem Ort.',
    home_card_catalog:'Übungskatalog', home_card_catalog_desc:'Alle Übungen nach Abschnitt, Thema und Schwierigkeitsgrad durchsuchen und filtern.',
    home_card_plan:'Trainingsplan', home_card_plan_desc:'Einzelne Trainingseinheiten zusammenstellen, speichern und ausdrucken.',
    home_card_blocks:'Langzeitplanung', home_card_blocks_desc:'Mehrwöchige Trainingsblöcke erstellen, verwalten und in die Saison einbinden.',
    home_card_templates:'Vorlagen', home_card_templates_desc:'Fertige Trainings- und Periodisierungsvorlagen direkt laden und anpassen.',
    search_placeholder:'Übung suchen…',
    reviewer_flag:'Reviewer',
    rev_title:'Du bist Reviewer',
    rev_intro:'Das Admin-Team hat dir Reviewer-Rechte gegeben. Du hilfst mit, eingereichte Inhalte zu prüfen, bevor sie für alle sichtbar werden.',
    rev_sports_label:'Deine Sportarten',
    rev_can_label:'Das kannst du',
    rev_can_1:'Eingereichte Übungen deiner Sportarten ansehen: Auf der Seite „Übung einreichen“ erscheint dafür die Prüf-Warteschlange, sortiert nach Abschnitt.',
    rev_can_2:'Jede Einreichung vor der Entscheidung bearbeiten, dann freigeben (sie kommt in den Katalog), als „In Review“ markieren oder ablehnen (sie wird gelöscht).',
    rev_can_3:'Eingereichte Trainingspläne und Langzeitplanungs-Blöcke ansehen und freigeben oder ablehnen.',
    rev_can_4:'Deine Sportarten nutzen, auch wenn sie für andere noch gesperrt sind, weil im Katalog noch Übungen fehlen.',
    rev_cant_label:'Das gehört nicht dazu',
    rev_cant:'Übungen direkt im Katalog anlegen, ändern oder löschen sowie Rollen vergeben können nur Admins.',
    rev_none:'Dir ist noch keine Sportart zugewiesen. Bitte das Admin-Team, dir Sportarten zu geben – ohne Sportart siehst du keine fremden Einreichungen.',

    cc_gruen:'Grün (Standard)',
    cc_rot:'Rot',
    cc_blau:'Blau',
    cc_lila:'Lila',
    cc_orange:'Orange',
    cc_gelb:'Gelb',
    cc_tuerkis:'Türkis',
    cc_pink:'Pink',
    cc_schwarz:'Schwarz',
    club_color_title:'Vereinsfarbe',
    club_color_hint:'Alle Trainer:innen deines Vereins sehen die App in dieser Akzentfarbe.',
    club_color_saved:'Vereinsfarbe gespeichert.',
    club_focus_title:'Vereins-Schwerpunkte',
    club_focus_intro_admin:'Lege fest, worauf dein Verein im Training Wert legt. Alle angebundenen Trainer:innen sehen diese Punkte.',
    club_focus_intro_trainer:'Darauf legt dein Verein im Training Wert:',
    club_focus_add:'Schwerpunkt hinzufügen',
    club_focus_name_ph:'Titel, z. B. Defensivverhalten',
    club_focus_text_ph:'Beschreibung…',
    club_focus_save:'Schwerpunkte speichern',
    club_focus_remove:'Entfernen',
    club_focus_empty:'Dein Verein hat noch keine Schwerpunkte festgelegt.',
    club_focus_saved:'Schwerpunkte gespeichert.',
    club_db_missing:'Speichern nicht möglich: Die Datenbank wurde noch nicht aktualisiert.',
    club_focus_planner:'Schwerpunkte deines Vereins',
  },
  en: {
    nav_home:'Home', nav_catalog:'Catalog', nav_plan:'Planner', nav_longterm:'Blocks',
    home_eyebrow:'Youth',
    home_title:'AssistCoach',
    home_sub:'Plan, structure and periodise your sessions – all in one place.',
    home_card_catalog:'Exercise Catalog', home_card_catalog_desc:'Browse and filter all exercises by section, topic and difficulty.',
    home_card_plan:'Session Planner', home_card_plan_desc:'Build individual training sessions, save them and print them out.',
    home_card_blocks:'Long-Term Planning', home_card_blocks_desc:'Create and manage multi-week training blocks for your season.',
    home_card_templates:'Templates', home_card_templates_desc:'Load ready-made session and periodisation templates and adapt them.',
    search_placeholder:'Search exercise…',
    reviewer_flag:'Reviewer',
    rev_title:'You are a reviewer',
    rev_intro:'The admin team has given you reviewer rights. You help check submitted content before it becomes visible to everyone.',
    rev_sports_label:'Your sports',
    rev_can_label:'What you can do',
    rev_can_1:'See submitted exercises for your sports: the review queue appears on the “Submit exercise” page, sorted by section.',
    rev_can_2:'Edit each submission before deciding, then approve it (it goes into the catalog), mark it “In review” or reject it (it is deleted).',
    rev_can_3:'See submitted training plans and long-term planning blocks and approve or reject them.',
    rev_can_4:'Use your sports even if they are still locked for others because the catalog lacks exercises.',
    rev_cant_label:'What is not included',
    rev_cant:'Creating, changing or deleting exercises directly in the catalog and assigning roles are for admins only.',
    rev_none:'No sport is assigned to you yet. Ask the admin team to assign sports – without a sport you do not see other people’s submissions.',

    cc_gruen:'Green (default)',
    cc_rot:'Red',
    cc_blau:'Blue',
    cc_lila:'Purple',
    cc_orange:'Orange',
    cc_gelb:'Yellow',
    cc_tuerkis:'Teal',
    cc_pink:'Pink',
    cc_schwarz:'Black',
    club_color_title:'Club colour',
    club_color_hint:'All coaches of your club see the app in this accent colour.',
    club_color_saved:'Club colour saved.',
    club_focus_title:'Club focus points',
    club_focus_intro_admin:'Define what your club values in training. All linked coaches see these points.',
    club_focus_intro_trainer:'This is what your club values in training:',
    club_focus_add:'Add focus point',
    club_focus_name_ph:'Title, e.g. Defensive behaviour',
    club_focus_text_ph:'Description…',
    club_focus_save:'Save focus points',
    club_focus_remove:'Remove',
    club_focus_empty:'Your club has not set any focus points yet.',
    club_focus_saved:'Focus points saved.',
    club_db_missing:'Cannot save: the database has not been updated yet.',
    club_focus_planner:'Your club’s focus points',
  },
  es: {
    nav_home:'Inicio', nav_catalog:'Catálogo', nav_plan:'Planificador', nav_longterm:'Bloques',
    home_eyebrow:'Categorías inferiores',
    home_title:'AssistCoach',
    home_sub:'Planifica, estructura y periodiza tus sesiones, todo en un solo lugar.',
    home_card_catalog:'Catálogo de ejercicios', home_card_catalog_desc:'Busca y filtra todos los ejercicios por sección, tema y dificultad.',
    home_card_plan:'Planificador de sesión', home_card_plan_desc:'Crea sesiones individuales, guárdalas e imprímelas.',
    home_card_blocks:'Planificación a largo plazo', home_card_blocks_desc:'Crea y gestiona bloques de entrenamiento de varias semanas para la temporada.',
    home_card_templates:'Plantillas', home_card_templates_desc:'Carga plantillas listas de sesión y periodización, y adáptalas.',
    search_placeholder:'Buscar ejercicio…',
    reviewer_flag:'Reviewer',
    rev_title:'Eres reviewer',
    rev_intro:'El equipo de administración te ha dado derechos de reviewer. Ayudas a revisar el contenido enviado antes de que sea visible para todos.',
    rev_sports_label:'Tus deportes',
    rev_can_label:'Lo que puedes hacer',
    rev_can_1:'Ver los ejercicios enviados de tus deportes: la cola de revisión aparece en la página «Enviar ejercicio», ordenada por sección.',
    rev_can_2:'Editar cada envío antes de decidir; luego aprobarlo (pasa al catálogo), marcarlo «En revisión» o rechazarlo (se elimina).',
    rev_can_3:'Ver los planes de entrenamiento y bloques de planificación a largo plazo enviados, y aprobarlos o rechazarlos.',
    rev_can_4:'Usar tus deportes aunque aún estén bloqueados para otros porque faltan ejercicios en el catálogo.',
    rev_cant_label:'Lo que no incluye',
    rev_cant:'Crear, cambiar o borrar ejercicios directamente en el catálogo y asignar roles solo pueden hacerlo los administradores.',
    rev_none:'Aún no tienes ningún deporte asignado. Pide al equipo de administración que te asigne deportes; sin deporte no ves los envíos de otros.',

    cc_gruen:'Verde (estándar)',
    cc_rot:'Rojo',
    cc_blau:'Azul',
    cc_lila:'Morado',
    cc_orange:'Naranja',
    cc_gelb:'Amarillo',
    cc_tuerkis:'Turquesa',
    cc_pink:'Rosa',
    cc_schwarz:'Negro',
    club_color_title:'Color del club',
    club_color_hint:'Todos los entrenadores de tu club ven la app con este color de acento.',
    club_color_saved:'Color del club guardado.',
    club_focus_title:'Prioridades del club',
    club_focus_intro_admin:'Define en qué pone el acento tu club en el entrenamiento. Todos los entrenadores vinculados ven estos puntos.',
    club_focus_intro_trainer:'En esto pone el acento tu club en el entrenamiento:',
    club_focus_add:'Añadir prioridad',
    club_focus_name_ph:'Título, p. ej. Comportamiento defensivo',
    club_focus_text_ph:'Descripción…',
    club_focus_save:'Guardar prioridades',
    club_focus_remove:'Quitar',
    club_focus_empty:'Tu club aún no ha definido prioridades.',
    club_focus_saved:'Prioridades guardadas.',
    club_db_missing:'No se puede guardar: la base de datos aún no está actualizada.',
    club_focus_planner:'Prioridades de tu club',
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
  // zoom breaks mobile viewport — only apply on desktop
  if (window.innerWidth > 767) {
    document.documentElement.style.fontSize = pct + '%';
  } else {
    document.documentElement.style.fontSize = '';
    document.body.style.zoom = '';
  }
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
// VEREINSFARBE (Akzentfarbe der App je Verein)
// ══════════════════════════════════════════════════════════════════
// Kuratierte Palette, keine freie Farbwahl. Je Farbe zwei Töne:
//   light  = Füllfarbe im hellen Design (weiße Schrift darauf, Farbe selbst als Text auf Weiß lesbar)
//   dark   = hellerer Ton für den dunklen Glas-Look (Farbe als Text auf Dunkel lesbar, dunkle Schrift darauf)
// 'gruen' ist der Standard und ändert nichts. Schwarz bekommt im dunklen Design einen hellen Ton.
const CLUB_COLORS = [
  { id:'gruen',   key:'cc_gruen',   light:'#1a7f4b', dark:'#22d38c' },
  { id:'rot',     key:'cc_rot',     light:'#c62828', dark:'#ff6b6b' },
  { id:'blau',    key:'cc_blau',    light:'#1565c0', dark:'#6aa9ff' },
  { id:'lila',    key:'cc_lila',    light:'#7b1fa2', dark:'#c58bff' },
  { id:'orange',  key:'cc_orange',  light:'#c2410c', dark:'#ff9d4d' },
  { id:'gelb',    key:'cc_gelb',    light:'#965a06', dark:'#facc15' },
  { id:'tuerkis', key:'cc_tuerkis', light:'#00796b', dark:'#2dd4bf' },
  { id:'pink',    key:'cc_pink',    light:'#c2185b', dark:'#ff7eb0' },
  { id:'schwarz', key:'cc_schwarz', light:'#1a1a1a', dark:'#e5e7eb' },
];
const CLUB_COLOR_ON_DARK = '#0b0f0c'; // Schrift auf den hellen Tönen
let currentClubColor = null;

function clubColorById(id) { return CLUB_COLORS.find(c => c.id === id && c.id !== 'gruen') || null; }

function _mixHex(a, b, p) { // p = Anteil von a (0..1)
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((x >> s) & 255) * p + ((y >> s) & 255) * (1 - p));
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
}

// Setzt die Vereinsfarbe (id aus der Palette) oder entfernt sie (null / 'gruen' / unbekannt = Standard-Grün)
function applyClubColor(id, remember = true) {
  const c = clubColorById(id);
  const root = document.documentElement;
  let st = document.getElementById('clubColorStyle');
  if (!c) {
    if (st) st.remove();
    root.removeAttribute('data-club-color');
    currentClubColor = null;
    if (remember) { try { localStorage.removeItem('tb_club_color'); } catch (e) {} }
    return;
  }
  if (!st) { st = document.createElement('style'); st.id = 'clubColorStyle'; document.head.appendChild(st); }
  const soft = _mixHex(c.dark, '#ffffff', .55);
  st.textContent =
    'html[data-club-color]:root{--accent:' + c.light + ';--accent-d:' + _mixHex(c.light, '#000000', .8) + ';--accent-mid:' + _mixHex(c.light, '#ffffff', .85) + ';--accent-l:' + _mixHex(c.light, '#ffffff', .1) + ';--accent-on:#ffffff;--ac-lt:' + c.light + ';--ac-glow:' + c.dark + ';--ac-soft:' + soft + ';}' +
    'html[data-club-color][data-theme="dark"]{--accent:' + c.dark + ';--accent-d:' + _mixHex(c.dark, '#ffffff', .82) + ';--accent-mid:' + _mixHex(c.dark, '#000000', .9) + ';--accent-l:' + _mixHex(c.dark, '#1c221c', .16) + ';--accent-on:' + CLUB_COLOR_ON_DARK + ';}';
  root.setAttribute('data-club-color', c.id);
  currentClubColor = c.id;
  if (remember) { try { localStorage.setItem('tb_club_color', c.id); } catch (e) {} }
}

function resetClubTheme() { applyClubColor(null); }

// Beim Start: zuletzt bekannte Vereinsfarbe sofort anwenden (kein Aufblitzen), wird nach dem Login geprüft
function loadClubTheme() {
  try { localStorage.removeItem('tb_club_theme'); localStorage.removeItem('svw_club_theme'); } catch (e) {}
  let id = null; try { id = localStorage.getItem('tb_club_color'); } catch (e) {}
  if (id) applyClubColor(id, false);
}

// Übersetzung für Texte, die per JavaScript erzeugt werden
function tt(key) { const t = TRANSLATIONS[currentLang] || TRANSLATIONS.de; return t[key] || TRANSLATIONS.de[key] || key; }

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
