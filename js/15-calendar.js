// ══════════════════════════════════════════════════════════════════
// MODUL: TRAINER-KALENDER
// Gespeicherte Trainingseinheiten pro Tag nachschlagen, ansehen und als Kopie auf einen neuen Tag legen.
// Jeder Eintrag ist eine eigene Kopie (Snapshot) des Plans zum Zeitpunkt des Speicherns.
// Liegt nur in der Datenbank (Tabelle calendar_entries, nur für das eigene Konto lesbar), nie im lokalen Speicher.
// ══════════════════════════════════════════════════════════════════
let calEntries = [];          // alle Einträge des Kontos
let calMonth = new Date();    // angezeigter Monat
let calSelDay = null;         // gewählter Tag (YYYY-MM-DD)
const CAL_MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function _calISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function _calDe(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
function _calSportEntries() { const s = _curSportId(); return calEntries.filter(e => (e.sport || 'fussball') === s); }
function _calDeepCopy(o) { return JSON.parse(JSON.stringify(o)); }

async function loadCalendarEntries() {
  if (!currentUser || !_supabase) { calEntries = []; return false; }
  const { data, error } = await _supabase.from('calendar_entries')
    .select('id,entry_date,name,sport,plan,source_plan_id,created_at')
    .eq('owner_id', currentUser.id).order('entry_date', { ascending: true });
  if (error) { console.warn('Kalender laden fehlgeschlagen', error); calEntries = []; return false; }
  calEntries = data || [];
  return true;
}

async function renderCalendar() {
  const root = document.getElementById('calendarRoot'); if (!root) return;
  if (!currentUser) {
    root.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-3);">'
      + '<div style="font-size:40px;margin-bottom:10px;">🔒</div>'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:900;margin-bottom:8px;">Den Kalender gibt es mit Konto</div>'
      + '<div style="font-size:13px;margin-bottom:16px;">Melde dich kostenlos an, um deine durchgeführten Trainingseinheiten im Kalender zu speichern.</div>'
      + '<button class="bpr" onclick="openLoginMod()">Anmelden oder registrieren</button></div>';
    return;
  }
  root.innerHTML = '<div style="font-size:13px;color:var(--text-3);padding:30px 0;text-align:center;">Lädt …</div>';
  const ok = await loadCalendarEntries();
  if (!ok) {
    root.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-3);font-size:13px;">Der Kalender ist noch nicht verfügbar. Bitte später erneut versuchen.</div>';
    return;
  }
  if (!calSelDay) calSelDay = _calISO(new Date());
  paintCalendar();
}

function paintCalendar() {
  const root = document.getElementById('calendarRoot'); if (!root) return;
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // Montag zuerst
  const days = new Date(y, m + 1, 0).getDate();
  const byDay = {};
  _calSportEntries().forEach(e => { (byDay[e.entry_date] = byDay[e.entry_date] || []).push(e); });
  const today = _calISO(new Date());
  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<div class="cal-cell cal-empty"></div>';
  for (let d = 1; d <= days; d++) {
    const iso = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const n = (byDay[iso] || []).length;
    cells += '<button type="button" class="cal-cell cal-day' + (iso === today ? ' cal-today' : '') + (iso === calSelDay ? ' cal-sel' : '') + '" onclick="calSelect(\'' + iso + '\')" aria-label="' + _calDe(iso) + (n ? ', ' + n + ' Einheit' + (n > 1 ? 'en' : '') : '') + '">'
      + '<span class="cal-num">' + d + '</span>' + (n ? '<span class="cal-dot">' + (n > 1 ? n : '') + '</span>' : '') + '</button>';
  }
  const dayList = (byDay[calSelDay] || []);
  const listHTML = dayList.length
    ? dayList.map(e => {
      const p = e.plan || {}; const mins = _calTotalMin(p);
      const cnt = (p.lanes || []).reduce((a, l) => a + (l || []).length, 0);
      return '<div class="cal-entry" onclick="openCalEntry(\'' + escJs(e.id) + '\')">'
        + '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;">' + esc(e.name || p.name || 'Trainingseinheit') + '</div>'
        + '<div style="font-size:11px;color:var(--text-3);margin-top:2px;">' + cnt + ' Übung' + (cnt !== 1 ? 'en' : '') + (mins ? ' · ca. ' + mins + ' min' : '') + '</div></div>'
        + '<div style="color:var(--text-3);">›</div></div>';
    }).join('')
    : '<div style="font-size:13px;color:var(--text-3);padding:10px 0;">Keine Einheit an diesem Tag.</div>';
  root.innerHTML = '<div class="cal-head">'
    + '<button type="button" class="cal-nav" onclick="calShift(-1)" aria-label="Vorheriger Monat">‹</button>'
    + '<div class="cal-title">' + CAL_MONTHS[m] + ' ' + y + '</div>'
    + '<button type="button" class="cal-nav" onclick="calShift(1)" aria-label="Nächster Monat">›</button>'
    + '<button type="button" class="bsc cal-todaybtn" onclick="calToday()">Heute</button></div>'
    + '<div class="cal-grid">' + ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => '<div class="cal-wd">' + d + '</div>').join('') + cells + '</div>'
    + '<div class="cal-daypanel"><div class="cal-daytitle">' + _calDe(calSelDay) + '</div>' + listHTML + '</div>';
}

function calShift(delta) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1); paintCalendar(); }
function calToday() { calMonth = new Date(); calSelDay = _calISO(new Date()); paintCalendar(); }
function calSelect(iso) { calSelDay = iso; paintCalendar(); }

function _calTotalMin(p) {
  let t = 0;
  (p.lanes || []).forEach(l => (l || []).forEach(raw => {
    const it = typeof raw === 'string' ? { id: raw } : raw;
    const ex = exercises.find(e => e.id === it.id) || {};
    const d = parseInt(it.duration != null ? it.duration : ex.duration) || 0; t += d;
  }));
  return t;
}

// ── Detailansicht einer Einheit ─────────────────────────────────
function openCalEntry(id) {
  const e = calEntries.find(x => x.id === id); if (!e) return;
  const p = e.plan || {};
  const names = p.exNames || {};
  const sections = (p.lanes || []).map((lane, si) => {
    const items = (lane || []).map(raw => {
      const it = typeof raw === 'string' ? { id: raw } : raw;
      const ex = exercises.find(x => x.id === it.id);
      const name = ex ? ex.name : (names[it.id] || 'Übung nicht mehr verfügbar');
      const dur = it.duration != null ? it.duration : (ex && ex.duration) || '';
      const pl = it.players != null ? it.players : (ex && ex.players) || '';
      const tr = (typeof coachNames === 'function') ? coachNames(it.coachIds) : [];
      return '<div style="padding:8px 0;border-bottom:1px solid var(--border);">'
        + '<div style="font-size:13px;font-weight:700;">' + esc(name) + '</div>'
        + '<div style="font-size:11px;color:var(--text-3);margin-top:2px;">' + (dur ? '⏱ ' + esc(dur) + ' min ' : '') + (pl ? '· 👥 ' + esc(pl) + ' ' : '') + (tr.length ? '· 🧑‍🏫 ' + esc(tr.join(', ')) : '') + '</div>'
        + (it.notes ? '<div class="pi-note-prev" style="max-height:none;">' + esc(it.notes) + '</div>' : '') + '</div>';
    }).join('');
    if (!items) return '';
    const sec = (typeof SECS !== 'undefined' && SECS[si]) || { name: 'Abschnitt ' + (si + 1), color: '#888' };
    return '<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:8px;background:' + sec.color + '18;margin-bottom:4px;">'
      + '<div style="width:9px;height:9px;border-radius:50%;background:' + sec.color + ';flex-shrink:0;"></div>'
      + '<div style="font-size:11px;font-weight:800;color:' + sec.color + ';text-transform:uppercase;letter-spacing:.5px;">' + esc(sec.name) + '</div></div>' + items + '</div>';
  }).join('');
  const mins = _calTotalMin(p);
  document.getElementById('calEntryModal')?.remove();
  const m = document.createElement('div');
  m.id = 'calEntryModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  m.onclick = ev => { if (ev.target === m) m.remove(); };
  m.innerHTML = '<div style="background:var(--surface);border-radius:16px;max-width:560px;width:100%;max-height:88vh;overflow-y:auto;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.5);">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;"><div>'
    + '<div style="font-family:Barlow Condensed,sans-serif;font-size:22px;font-weight:900;">' + esc(e.name || p.name || 'Trainingseinheit') + '</div>'
    + '<div style="font-size:12px;color:var(--text-3);margin:2px 0 12px;">' + _calDe(e.entry_date) + (mins ? ' · ca. ' + mins + ' min' : '') + '</div></div>'
    + '<button type="button" data-act="close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-3);">✕</button></div>'
    + (sections || '<div style="color:var(--text-3);font-size:13px;">Keine Übungen.</div>')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">'
    + '<button type="button" class="bpr" data-act="open" style="flex:1 1 100%;">Im Trainingsplan öffnen</button>'
    + '<button type="button" class="bsc" data-act="copy" style="flex:1;">Kopie für neuen Tag</button>'
    + '<button type="button" data-act="del" style="flex:1;padding:8px;background:none;border:1.5px solid #e53935;color:#e53935;border-radius:8px;cursor:pointer;font-weight:700;">Löschen</button></div>'
    + '<div id="calCopyBox" style="display:none;margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);">'
    + '<div style="font-size:12px;color:var(--text-2);margin-bottom:8px;">Neuer Tag für die Kopie:</div>'
    + '<div style="display:flex;gap:8px;"><input type="date" id="calCopyDate" class="fc" style="flex:1;"><button type="button" class="bpr" data-act="copysave">Kopie speichern</button></div></div>'
    + '</div>';
  document.body.appendChild(m);
  m.querySelector('[data-act=close]').onclick = () => m.remove();
  m.querySelector('[data-act=open]').onclick = () => { m.remove(); openCalEntryInPlanner(id); };
  m.querySelector('[data-act=copy]').onclick = () => { const b = m.querySelector('#calCopyBox'); b.style.display = ''; m.querySelector('#calCopyDate').value = _calISO(new Date()); };
  m.querySelector('[data-act=copysave]').onclick = () => copyCalEntry(id, m.querySelector('#calCopyDate').value, m);
  m.querySelector('[data-act=del]').onclick = () => deleteCalEntry(id, m);
}

function openCalEntryInPlanner(id) {
  const e = calEntries.find(x => x.id === id); if (!e) return;
  const p = e.plan || {};
  currentPlan = { name: e.name || p.name || '', lanes: _calDeepCopy(p.lanes || [[], [], [], [], [], []]) };
  const n = document.getElementById('planName'); if (n) n.value = currentPlan.name;
  goPage('planner');
  setTimeout(() => { const d = document.getElementById('planDate'); if (d) d.value = e.entry_date; }, 50);
  showToast('Einheit im Trainingsplan geöffnet');
}

async function copyCalEntry(id, dateISO, modal) {
  const e = calEntries.find(x => x.id === id); if (!e) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO || '')) { showToast('Bitte ein Datum wählen', 'err'); return; }
  const { error } = await _supabase.from('calendar_entries').insert({
    owner_id: currentUser.id, entry_date: dateISO, name: e.name, sport: e.sport || _curSportId(), plan: _calDeepCopy(e.plan || {}), source_plan_id: null
  });
  if (error) { showToast('Kopie konnte nicht gespeichert werden', 'err'); console.warn(error); return; }
  modal.remove();
  calSelDay = dateISO; calMonth = new Date(dateISO + 'T12:00:00');
  await loadCalendarEntries(); paintCalendar();
  showToast('Kopie am ' + _calDe(dateISO) + ' gespeichert');
}

async function deleteCalEntry(id, modal) {
  if (!confirm('Diese Einheit aus dem Kalender löschen?')) return;
  const { error } = await _supabase.from('calendar_entries').delete().eq('id', id).eq('owner_id', currentUser.id);
  if (error) { showToast('Löschen fehlgeschlagen', 'err'); return; }
  calEntries = calEntries.filter(x => x.id !== id);
  modal.remove(); paintCalendar(); showToast('Einheit gelöscht');
}

// ── Beim Speichern eines Plans: im Kalender speichern? ───────────
function askSaveToCalendar(plan) {
  if (!currentUser || !plan) return;
  const raw = document.getElementById('planDate')?.value;
  const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(raw || '') ? raw : _calISO(new Date());
  document.getElementById('calAskModal')?.remove();
  const m = document.createElement('div');
  m.id = 'calAskModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  m.innerHTML = '<div style="background:var(--surface);border-radius:16px;max-width:380px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center;">'
    + '<div style="font-size:34px;margin-bottom:8px;">📅</div>'
    + '<div style="font-family:Barlow Condensed,sans-serif;font-size:21px;font-weight:900;margin-bottom:8px;">Im Kalender speichern?</div>'
    + '<div id="calAskText" style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:18px;"></div>'
    + '<div style="display:flex;gap:8px;"><button type="button" class="bsc" data-act="no" style="flex:1;">Nein</button><button type="button" class="bpr" data-act="yes" style="flex:2;">Ja, speichern</button></div></div>';
  document.body.appendChild(m);
  m.querySelector('#calAskText').textContent = 'Soll die Einheit „' + (plan.name || 'Trainingseinheit') + '“ am ' + _calDe(dateISO) + ' im Kalender gespeichert werden?';
  m.querySelector('[data-act=no]').onclick = () => m.remove();
  m.querySelector('[data-act=yes]').onclick = async () => { m.remove(); await saveCalendarEntry(plan, dateISO); };
}

async function saveCalendarEntry(plan, dateISO) {
  if (!currentUser || !_supabase) return;
  const exNames = {};
  (plan.lanes || []).forEach(l => (l || []).forEach(raw => { const id = typeof raw === 'string' ? raw : raw.id; const ex = exercises.find(e => e.id === id); if (ex) exNames[id] = ex.name; }));
  const snapshot = { name: plan.name, lanes: _calDeepCopy(plan.lanes || []), totals: plan.totals || [], exNames };
  const sport = plan.sport || _curSportId();
  // Gleicher Plan am gleichen Tag: vorhandenen Eintrag aktualisieren statt doppelt anzulegen
  const found = await _supabase.from('calendar_entries').select('id').eq('owner_id', currentUser.id).eq('source_plan_id', plan.id).eq('entry_date', dateISO);
  if (found.error) { showToast('Kalender noch nicht verfügbar', 'err'); console.warn(found.error); return; }
  let error;
  if (found.data && found.data.length) {
    ({ error } = await _supabase.from('calendar_entries').update({ name: plan.name, plan: snapshot, sport }).eq('id', found.data[0].id).eq('owner_id', currentUser.id));
  } else {
    ({ error } = await _supabase.from('calendar_entries').insert({ owner_id: currentUser.id, entry_date: dateISO, name: plan.name, sport, plan: snapshot, source_plan_id: plan.id }));
  }
  if (error) { showToast('Im Kalender speichern fehlgeschlagen', 'err'); console.warn(error); return; }
  showToast('✓ Im Kalender am ' + _calDe(dateISO) + ' gespeichert');
}
