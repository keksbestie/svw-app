// ══════════════════════════════════════════════════════════════════
// MODUL: SPORT-AUSWAHL
// ══════════════════════════════════════════════════════════════════
const SPORTS = [
  { id: 'fussball',   icon: 'icons/sport-fussball.png',   label: 'Fußball' },
  { id: 'volleyball', icon: 'icons/sport-volleyball.png', label: 'Volleyball' },
  { id: 'tennis',     icon: 'icons/sport-tennis.png',     label: 'Tennis' },
];

const SPORT_KEY = 'assistcoach_sport';

function getSavedSport() {
  try { return JSON.parse(localStorage.getItem(SPORT_KEY)); } catch { return null; }
}

function saveSport(sport) {
  try { localStorage.setItem(SPORT_KEY, JSON.stringify(sport)); } catch {}
  window.currentSport = sport;
}

function selectSport(id) {
  const sport = SPORTS.find(s => s.id === id);
  if (!sport) return;
  saveSport(sport);
  renderHomeSportState();
}

function changeSport() {
  saveSport(null);
  try { localStorage.removeItem(SPORT_KEY); } catch {}
  window.currentSport = null;
  renderHomeSportState();
}

function renderHomeSportState() {
  const sport = getSavedSport();
  const grid = document.getElementById('homeSportGrid');
  const cards = document.getElementById('homeCards');
  const badge = document.getElementById('homeSportBadge');
  const sub = document.getElementById('homeHeroSub');
  const heroBtns = document.getElementById('homeHeroBtns');

  if (!grid || !cards) return;

  if(typeof _updateFieldTypeOptions==='function') _updateFieldTypeOptions();
  _updateHelpSport();
  const onbSub=document.getElementById('onboardingSubtitle');
  if(onbSub){
    const sportName=sport?{fussball:'(Nachwuchs)fußball',volleyball:'(Nachwuchs)Volleyball',tennis:'(Nachwuchs)Tennis'}[sport.id]||sport.label:'(Nachwuchs)fußball';
    onbSub.textContent=`Dein Trainingsassistent für den ${sportName}. Plane Einheiten, verwalte deinen Kader und strukturiere die ganze Saison – alles an einem Ort.`;
  }

  if (sport) {
    grid.style.display = 'none';
    cards.style.display = '';
    if (badge) {
      badge.style.display = 'flex';
      badge.innerHTML = `<img src="${sport.icon}" style="width:20px;height:20px;object-fit:contain;opacity:.7;"><span>${sport.label}</span><button onclick="changeSport()" style="background:none;border:none;font-size:11px;cursor:pointer;padding:0;margin-left:4px;">ändern</button>`;
    }
    if (sub) sub.textContent = 'Was möchtest du tun?';
    if (heroBtns) heroBtns.style.display = 'flex';
    window.currentSport = sport;
  } else {
    grid.style.display = 'grid';
    cards.style.display = 'none';
    if (badge) badge.style.display = 'none';
    if (sub) sub.textContent = 'Übungen planen, strukturieren und langfristig periodisieren – alles an einem Ort.';
    if (heroBtns) heroBtns.style.display = 'none';
    window.currentSport = null;
  }
}

function _updateHelpSport() {
  const sport = window.currentSport && window.currentSport.id;
  const isVb = sport === 'volleyball';
  const isTn = sport === 'tennis';
  const ballIcon = isVb ? '🏐' : isTn ? '🎾' : '⚽';

  // Suchleiste Icon
  const gsIco = document.getElementById('gsIco');
  if (gsIco) gsIco.textContent = ballIcon;

  // Filter button label
  const editorBtn = document.querySelector('.haf-btn[onclick*="editor"]');
  if (editorBtn) editorBtn.textContent = ballIcon + ' Feldeditor';

  // Quick overview card
  const qhEditor = document.getElementById('qhEditor');
  if (qhEditor) {
    if (isVb) {
      qhEditor.innerHTML = 'Spieler, Bälle, Hütchen und Laufwege auf dem Volleyballfeld platzieren. Kein Tor – dafür Vollfeld, Halbfeld und Beach. Raster (⛶) für gleichmäßige Abstände.';
    } else if (isTn) {
      qhEditor.innerHTML = 'Spieler, Bälle und Laufwege auf dem Tennisplatz platzieren. Raster (⛶) aktivieren für gleichmäßige Abstände.';
    } else {
      qhEditor.innerHTML = 'Spieler, Bälle, Tore, Hütchen und Laufwege auf dem Feld platzieren. Raster (⛶) aktivieren für gleichmäßige Abstände. Strg+C/V kopieren, Strg+Z rückgängig.';
    }
  }
  const qhEditorIcon = document.getElementById('qhEditorIcon');
  if (qhEditorIcon) qhEditorIcon.textContent = ballIcon;

  // Sport-specific help cards
  document.querySelectorAll('.help-sport-fussball').forEach(el => el.style.display = (isVb || isTn) ? 'none' : '');
  document.querySelectorAll('.help-sport-volleyball').forEach(el => el.style.display = isVb ? '' : 'none');
  document.querySelectorAll('.help-sport-tennis').forEach(el => el.style.display = isTn ? '' : 'none');

  // Sport-specific material rows
  const isFb = !isVb && !isTn;
  document.querySelectorAll('.mat-sport-fussball').forEach(el => el.style.display = isFb ? '' : 'none');
  document.querySelectorAll('.mat-sport-volleyball').forEach(el => el.style.display = isVb ? '' : 'none');
  document.querySelectorAll('.mat-not-fussball').forEach(el => el.style.display = isFb ? 'none' : '');
}

function initSportSelection() {
  const saved = getSavedSport();
  if (saved) window.currentSport = saved;
  renderHomeSportState();
}

// Direkt beim Laden ausführen (goPage('home') läuft vor diesem Script)
initSportSelection();
