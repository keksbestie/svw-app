// ══════════════════════════════════════════════════════════════════
// MODUL: SPORT-AUSWAHL
// ══════════════════════════════════════════════════════════════════
const SPORTS = [
  { id: 'fussball',  emoji: '⚽', label: 'Fußball' },
  { id: 'volleyball', emoji: '🏐', label: 'Volleyball' },
  { id: 'tennis',    emoji: '🎾', label: 'Tennis' },
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

  if (!grid || !cards) return;

  if (sport) {
    grid.style.display = 'none';
    cards.style.display = '';
    if (badge) {
      badge.style.display = 'flex';
      badge.innerHTML = `<span style="font-size:18px;">${sport.emoji}</span><span>${sport.label}</span><button onclick="changeSport()" style="background:none;border:none;color:rgba(255,255,255,.5);font-size:11px;cursor:pointer;padding:0;margin-left:4px;">ändern</button>`;
    }
    if (sub) sub.textContent = 'Was möchtest du tun?';
    window.currentSport = sport;
  } else {
    grid.style.display = 'grid';
    cards.style.display = 'none';
    if (badge) badge.style.display = 'none';
    if (sub) sub.textContent = 'Übungen planen, strukturieren und langfristig periodisieren – alles an einem Ort.';
    window.currentSport = null;
  }
}

function initSportSelection() {
  const saved = getSavedSport();
  if (saved) window.currentSport = saved;
  renderHomeSportState();
}
