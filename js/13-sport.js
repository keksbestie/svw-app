// ══════════════════════════════════════════════════════════════════
// MODUL: SPORT-AUSWAHL
// ══════════════════════════════════════════════════════════════════
const SPORTS_ENABLED = ['fussball', 'volleyball', 'tennis'];
// Sportarten sind für normale Nutzer gesperrt und schalten sich automatisch frei, sobald JEDER Abschnitt
// (Open Field, Warm Up, …) mindestens SPORT_MIN_PER_SECTION freigegebene Übungen hat (Admins/Reviewer sehen sie immer).
// Fußball ist immer offen.
const SPORT_MIN_PER_SECTION = 8;

const SPORTS = [
  { id: 'fussball',   icon: 'icons/sport-fussball.png',   label: 'Fußball' },
  { id: 'volleyball', icon: 'icons/sport-volleyball.png', label: 'Volleyball' },
  { id: 'tennis',     icon: 'icons/sport-tennis.png',     label: 'Tennis' },
].filter(s => SPORTS_ENABLED.includes(s.id));

const SPORT_KEY = 'assistcoach_sport';

// Anzahl Abschnitte, die die Mindestmenge erreicht haben (z. B. 3 von 6)
function sportSectionStatus(id) {
  const total = (typeof SECS !== 'undefined') ? SECS.length : 6;
  const counts = new Array(total).fill(0);
  (typeof exercises !== 'undefined' ? exercises : []).forEach(e => {
    if ((e.sport || 'fussball') === id && e.section >= 0 && e.section < total) counts[e.section]++;
  });
  const full = counts.filter(c => c >= SPORT_MIN_PER_SECTION).length;
  return { full, total, counts, ready: full === total };
}

function isSportAvailable(id) {
  if (id === 'fussball') return true;
  if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) return true;
  if (typeof IS_REVIEWER !== 'undefined' && IS_REVIEWER && (REVIEWER_SPORTS || []).includes(id)) return true;
  return sportSectionStatus(id).ready;
}

function getSavedSport() {
  try {
    const s = JSON.parse(localStorage.getItem(SPORT_KEY));
    return (s && isSportAvailable(s.id)) ? s : null;
  } catch { return null; }
}

let _sportSig = '';
function _sportAvailSig() { return SPORTS.map(s => s.id + ':' + (isSportAvailable(s.id) ? 1 : 0)).join(','); }
function refreshSportAvailability() { if (_sportAvailSig() !== _sportSig) renderHomeSportState(); }

function _syncSportCards() {
  document.querySelectorAll('.home-sport-card[data-sport]').forEach(btn => {
    const id = btn.dataset.sport, avail = isSportAvailable(id);
    const st = sportSectionStatus(id);
    const notReady = id !== 'fussball' && !st.ready;
    btn.classList.toggle('home-sport-card--locked', !avail);
    btn.setAttribute('aria-disabled', avail ? 'false' : 'true');
    const soon = btn.querySelector('.home-sport-soon');
    if (soon) {
      soon.style.display = (!avail || notReady) ? '' : 'none';
      soon.textContent = !avail ? 'Bald verfügbar'
        : 'Nur Admin · ' + st.full + '/' + st.total + ' Bereiche mit ' + SPORT_MIN_PER_SECTION + '+ Übungen';
    }
  });
}

function saveSport(sport) {
  try { localStorage.setItem(SPORT_KEY, JSON.stringify(sport)); } catch {}
  window.currentSport = sport;
}

function selectSport(id) {
  const sport = SPORTS.find(s => s.id === id);
  if (!sport) return;
  if (!isSportAvailable(id)) {
    if (typeof showToast === 'function') showToast(sport.label + ' ist bald verfügbar', '');
    return;
  }
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
  _sportSig = _sportAvailSig();
  _syncSportCards();
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
    const sportName=sport?{fussball:'(Nachwuchs)Fußball',volleyball:'(Nachwuchs)Volleyball',tennis:'(Nachwuchs)Tennis'}[sport.id]||sport.label:'(Nachwuchs)Sport – Fußball, Volleyball und Tennis';
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
    if (typeof initClubLogoBg === 'function') initClubLogoBg(sport.id);
  } else {
    grid.style.display = 'grid';
    cards.style.display = 'none';
    if (badge) badge.style.display = 'none';
    if (sub) sub.textContent = 'Übungen planen, strukturieren und langfristig periodisieren – alles an einem Ort.';
    if (heroBtns) heroBtns.style.display = 'none';
    window.currentSport = null;
    if (typeof initClubLogoBg === 'function') initClubLogoBg(null);
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
      qhEditor.innerHTML = 'Spieler, Bälle, Material und Wege (Pass, Lauf, Angriff – auch geschwungen) auf dem Volleyballfeld platzieren. Kein Tor – dafür Vollfeld, Halbfeld und Beach. Raster (⛶) für gleichmäßige Abstände.';
    } else if (isTn) {
      qhEditor.innerHTML = 'Spieler, Bälle, Material und Wege (Lauf, Angriff – auch geschwungen) auf dem Tennisplatz platzieren. Raster (⛶) aktivieren für gleichmäßige Abstände.';
    } else {
      qhEditor.innerHTML = 'Spieler, Bälle, Tore, Material und Wege (Pass, Lauf, Dribbling, Schuss – auch geschwungen) auf dem Feld platzieren. Raster (⛶) für gleichmäßige Abstände. Strg+C/V kopieren, Strg+Z rückgängig.';
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
