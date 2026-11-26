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

// ── Sportarten pro Konto ──
// PRIMARY_SPORT: bei der Anmeldung gewählt (spätere Pakete hängen daran). USER_SPORTS: freigeschaltete Sportarten.
// USER_SPORTS = null bedeutet „unbekannt / nicht angemeldet“ – dann gibt es keine Einschränkung.
let PRIMARY_SPORT = null, USER_SPORTS = null;
let _sportPicking = false;   // Nutzer:in hat „ändern“ gedrückt → nicht automatisch die Primärsportart wählen
let _regSport = null;        // bei der Registrierung gewählte Sportart
const _sportKnown = id => !!SPORTS.find(s => s.id === id);
const _sportCacheKey = uid => 'assistcoach_sports_' + uid;

function isSportUnlocked(id) {
  if (typeof currentUser === 'undefined' || !currentUser || USER_SPORTS === null) return true;
  if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) return true;
  if (typeof IS_REVIEWER !== 'undefined' && IS_REVIEWER && (REVIEWER_SPORTS || []).includes(id)) return true;
  return USER_SPORTS.includes(id);
}

function _restoreCachedSports(uid) {
  try {
    const c = JSON.parse(localStorage.getItem(_sportCacheKey(uid)));
    if (c && Array.isArray(c.list)) { PRIMARY_SPORT = c.primary || null; USER_SPORTS = c.list; }
  } catch {}
}

async function loadUserSports(userId) {
  if (!_supabase || !userId) return;
  try {
    const { data, error } = await _supabase.from('profiles').select('primary_sport,unlocked_sports').eq('id', userId).single();
    if (error || !data) { _restoreCachedSports(userId); return; }
    let prim = _sportKnown(data.primary_sport) ? data.primary_sport : null;
    const list = (Array.isArray(data.unlocked_sports) ? data.unlocked_sports : []).filter(_sportKnown);
    if (!prim) {
      const m = currentUser && currentUser.user_metadata && currentUser.user_metadata.primary_sport;
      if (_sportKnown(m)) prim = m;
    }
    if (prim && !list.includes(prim)) list.push(prim);
    PRIMARY_SPORT = prim; USER_SPORTS = list;
    try { localStorage.setItem(_sportCacheKey(userId), JSON.stringify({ primary: prim, list })); } catch {}
    if (prim && prim !== data.primary_sport) {
      await _supabase.from('profiles').update({ primary_sport: prim, unlocked_sports: list }).eq('id', userId);
    }
    _enforceSport();
    if (!prim) showSportChooser();
  } catch (e) { _restoreCachedSports(userId); }
}

function clearUserSports() {
  PRIMARY_SPORT = null; USER_SPORTS = null; _sportPicking = false;
  const m = document.getElementById('sportChooser'); if (m) m.remove();
}

// Gewählte Sportart muss zum Konto passen
function _enforceSport() {
  if (window.currentSport && !isSportUnlocked(window.currentSport.id)) {
    try { localStorage.removeItem(SPORT_KEY); } catch {}
    window.currentSport = null;
  }
  renderHomeSportState();
  renderAccountSports();
}

// Auswahl bei der Registrierung (nur Text, ohne Symbole)
function renderRegSportPicks() {
  document.querySelectorAll('.reg-sport-pick').forEach(box => {
    box.innerHTML = '<div class="sport-pick-lbl">Für welche Sportart meldest du dich an?</div><div class="sport-pick-row">' +
      SPORTS.map(s => {
        const ok = isSportAvailable(s.id);
        return `<button type="button" class="sport-pick-btn${_regSport === s.id ? ' on' : ''}" ${ok ? '' : 'disabled'} onclick="selectRegSport('${s.id}')">${esc(s.label)}${ok ? '' : '<small>bald</small>'}</button>`;
      }).join('') + '</div>';
  });
}
function selectRegSport(id) { if (_sportKnown(id) && isSportAvailable(id)) { _regSport = id; renderRegSportPicks(); } }

// Nach der Anmeldung ohne Primärsportart (z. B. alte Konten ohne Migration)
function showSportChooser() {
  if (document.getElementById('sportChooser')) return;
  const m = document.createElement('div');
  m.id = 'sportChooser'; m.className = 'mbg';
  m.innerHTML = '<div class="md sm"><div class="mhdr"><div class="mhdr-t">Deine Sportart</div></div><div class="mbd"><p class="sport-chooser-txt">Für welche Sportart meldest du dich an? Weitere Sportarten kannst du später in deinem Konto freischalten.</p><div class="sport-pick-row sport-pick-col" id="sportChooserList"></div></div></div>';
  document.body.appendChild(m);
  renderSportChooser();
}
function renderSportChooser() {
  const l = document.getElementById('sportChooserList'); if (!l) return;
  l.innerHTML = SPORTS.map(s => {
    const ok = isSportAvailable(s.id);
    return `<button type="button" class="sport-pick-btn" ${ok ? '' : 'disabled'} onclick="choosePrimarySport('${s.id}')">${esc(s.label)}${ok ? '' : '<small>bald verfügbar</small>'}</button>`;
  }).join('');
}
async function choosePrimarySport(id) {
  if (!_sportKnown(id) || !currentUser) return;
  const list = [id];
  const { error } = await _supabase.from('profiles').update({ primary_sport: id, unlocked_sports: list }).eq('id', currentUser.id);
  if (error) { if (typeof showToast === 'function') showToast('Speichern fehlgeschlagen: ' + error.message, 'err'); return; }
  PRIMARY_SPORT = id; USER_SPORTS = list;
  try { localStorage.setItem(_sportCacheKey(currentUser.id), JSON.stringify({ primary: id, list })); } catch {}
  const m = document.getElementById('sportChooser'); if (m) m.remove();
  _sportPicking = false;
  _enforceSport();
}

// Konto: weitere Sportarten freischalten
function renderAccountSports() {
  const box = document.getElementById('accSportsList'); if (!box) return;
  if (USER_SPORTS === null) { box.innerHTML = '<div class="acc-sport-note">Sportarten werden geladen, sobald du online bist.</div>'; return; }
  box.innerHTML = SPORTS.map(s => {
    const un = isSportUnlocked(s.id), ok = isSportAvailable(s.id);
    const state = s.id === PRIMARY_SPORT ? 'Primärsportart' : un ? 'Freigeschaltet' : ok ? '' : 'Bald verfügbar';
    const btn = (!un && ok) ? `<button class="acc-sport-btn" onclick="unlockSport('${s.id}')">Freischalten</button>` : '';
    return `<div class="acc-sport-row"><span class="acc-sport-name">${esc(s.label)}</span><span class="acc-sport-state">${state}</span>${btn}</div>`;
  }).join('');
}
async function unlockSport(id) {
  if (!currentUser || USER_SPORTS === null || !_sportKnown(id) || !isSportAvailable(id) || USER_SPORTS.includes(id)) return;
  const list = USER_SPORTS.concat(id);
  const { error } = await _supabase.from('profiles').update({ unlocked_sports: list }).eq('id', currentUser.id);
  if (error) { if (typeof showToast === 'function') showToast('Freischalten fehlgeschlagen: ' + error.message, 'err'); return; }
  USER_SPORTS = list;
  try { localStorage.setItem(_sportCacheKey(currentUser.id), JSON.stringify({ primary: PRIMARY_SPORT, list })); } catch {}
  renderAccountSports(); renderHomeSportState();
  if (typeof showToast === 'function') showToast((SPORTS.find(s => s.id === id) || {}).label + ' freigeschaltet');
}

// Anzahl Abschnitte, die die Mindestmenge erreicht haben (z. B. 3 von 6)
function sportSectionStatus(id) {
  const total = (typeof SECS !== 'undefined') ? SECS.length : 6;
  const counts = new Array(total).fill(0);
  (typeof exercises !== 'undefined' ? exercises : []).forEach(e => {
    if (e.status !== 'pending' && e.status !== 'review' && (e.sport || 'fussball') === id && e.section >= 0 && e.section < total) counts[e.section]++;
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
    // Beschriftung/Symbol immer aus der Konstante nehmen, nie aus dem lokalen Speicher
    const known = s && SPORTS.find(x => x.id === s.id);
    return (known && isSportAvailable(known.id) && isSportUnlocked(known.id)) ? known : null;
  } catch { return null; }
}

let _sportSig = '';
function _sportAvailSig() { return SPORTS.map(s => s.id + ':' + (isSportAvailable(s.id) ? 1 : 0) + (isSportUnlocked(s.id) ? 1 : 0)).join(','); }
function refreshSportAvailability() { if (_sportAvailSig() !== _sportSig) renderHomeSportState(); renderRegSportPicks(); renderSportChooser(); renderAccountSports(); }

function _syncSportCards() {
  document.querySelectorAll('.home-sport-card[data-sport]').forEach(btn => {
    const id = btn.dataset.sport, rel = isSportAvailable(id), unl = isSportUnlocked(id), avail = rel && unl;
    const st = sportSectionStatus(id);
    const notReady = id !== 'fussball' && !st.ready;
    btn.classList.toggle('home-sport-card--locked', !avail);
    btn.setAttribute('aria-disabled', avail ? 'false' : 'true');
    const soon = btn.querySelector('.home-sport-soon');
    if (soon) {
      soon.style.display = (!avail || notReady) ? '' : 'none';
      soon.textContent = !rel ? 'Bald verfügbar' : !unl ? 'Im Konto freischalten'
        : 'Nur Admin · ' + st.full + '/' + st.total + ' Bereiche mit ' + SPORT_MIN_PER_SECTION + '+ Übungen';
    }
  });
}

// Beim Wechsel der Sportart nichts aus der vorherigen Sportart mitnehmen: Tag-Filter und Tag-Entwürfe zurücksetzen
function _resetSportScopedState() {
  try {
    if (typeof ageFilter !== 'undefined') ageFilter = null; // Jahrgänge unterscheiden sich je Sportart
    // Der aktuelle Trainingsplan gehört zur Sportart: beim Wechsel komplett leeren, damit nie Übungen verschiedener Sportarten vermischt werden
    if (typeof currentPlan !== 'undefined') {
      const hadItems = (currentPlan.lanes || []).some(l => (l || []).length);
      currentPlan = { name: '', lanes: [[], [], [], [], [], []] };
      if (typeof _cartParallel !== 'undefined') _cartParallel.clear();
      if (typeof planSquadAbsent !== 'undefined') planSquadAbsent.clear();
      if (typeof resetPlanPlayerNames === 'function') resetPlanPlayerNames();
      const pn = document.getElementById('planName'); if (pn) pn.value = '';
      if (typeof renderLanes === 'function') renderLanes();
      if (typeof updatePlanCart === 'function') updatePlanCart();
      if (hadItems && typeof showToast === 'function') showToast('Trainingsplan geleert – Sportart gewechselt');
    }
    if (typeof selectedTags !== 'undefined') selectedTags = [];
    if (typeof activeCluster !== 'undefined') activeCluster = null;
    if (typeof clusterFilterTags !== 'undefined') clusterFilterTags = [];
    if (typeof formTags !== 'undefined') formTags = [];
    if (typeof submitTags !== 'undefined') {
      submitTags = [];
      if (typeof renderSTagDisplay === 'function') renderSTagDisplay();
      if (typeof renderSTagSuggestions === 'function') renderSTagSuggestions();
      if (typeof updateSubmitChecklist === 'function') updateSubmitChecklist();
    }
  } catch (e) {}
}

function saveSport(sport) {
  const prevId = window.currentSport && window.currentSport.id;
  try { localStorage.setItem(SPORT_KEY, JSON.stringify(sport)); } catch {}
  window.currentSport = sport;
  if (prevId !== (sport && sport.id)) { _resetSportScopedState(); if (typeof refreshSquad === 'function') { refreshSquad(); if (typeof renderKaderPage === 'function') renderKaderPage(); } if (typeof renderSavedPlans === 'function') renderSavedPlans(); }
}

function selectSport(id) {
  const sport = SPORTS.find(s => s.id === id);
  if (!sport) return;
  if (!isSportAvailable(id)) {
    if (typeof showToast === 'function') showToast(sport.label + ' ist bald verfügbar', '');
    return;
  }
  if (!isSportUnlocked(id)) {
    if (typeof showToast === 'function') showToast(sport.label + ' kannst du im Konto freischalten', '');
    if (typeof goPage === 'function') goPage('account');
    return;
  }
  _sportPicking = false;
  saveSport(sport);
  renderHomeSportState();
}

function changeSport() {
  _sportPicking = true;
  saveSport(null);
  try { localStorage.removeItem(SPORT_KEY); } catch {}
  window.currentSport = null;
  renderHomeSportState();
}

function renderHomeSportState() {
  _sportSig = _sportAvailSig();
  _syncSportCards();
  let sport = getSavedSport();
  // Angemeldet: ohne eigene Wahl gilt die Primärsportart
  if (!sport && !_sportPicking && typeof currentUser !== 'undefined' && currentUser && PRIMARY_SPORT) {
    const p = SPORTS.find(x => x.id === PRIMARY_SPORT);
    if (p && isSportAvailable(p.id) && isSportUnlocked(p.id)) { try { localStorage.setItem(SPORT_KEY, JSON.stringify(p)); } catch {} sport = p; }
  }
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
      badge.innerHTML = `<img src="${esc(sport.icon)}" style="width:20px;height:20px;object-fit:contain;opacity:.7;"><span>${esc(sport.label)}</span><button onclick="changeSport()" style="background:none;border:none;font-size:11px;cursor:pointer;padding:0;margin-left:4px;">ändern</button>`;
    }
    if (sub) sub.textContent = 'Was möchtest du tun?';
    if (heroBtns) heroBtns.style.display = 'flex';
    window.currentSport = sport;
    if (typeof refreshSquad === 'function') refreshSquad();
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

  // Platzhalter-Symbole in Fenstern
  document.querySelectorAll('.sport-ico').forEach(el => el.textContent = ballIcon);

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
  renderRegSportPicks();
}

// Direkt beim Laden ausführen (goPage('home') läuft vor diesem Script)
initSportSelection();
