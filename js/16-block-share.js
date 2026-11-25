// ══════════════════════════════════════════════════════════════════
// MODUL: BLÖCKE TEILEN – Kalender, Einreichen (anonymisiert), öffentliche Block-Bibliothek
// ══════════════════════════════════════════════════════════════════
const _BS_WD = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const _bsIco = t => t === 'training' ? _ballIcon() : t === 'game' ? '🏆' : '☕';
const _bsNorm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
function _bsDe(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
function _bsISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function _bsOverlay(id) {
  document.getElementById(id)?.remove();
  const m = document.createElement('div');
  m.id = id;
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  m.onclick = ev => { if (ev.target === m) m.remove(); };
  document.body.appendChild(m);
  return m;
}
const _BS_CARD = 'background:var(--surface);border-radius:16px;width:100%;max-height:90vh;overflow-y:auto;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.4);';

// ── Anonymisieren ────────────────────────────────────────────────
// Entfernt alles Individuelle: Notizen, Namen, Gegner, Trainer:innen-Zuordnungen, Daten. Übrig bleiben Aufbau, Zeitfenster und Pläne.
function _stripPlanLanes(lanes) {
  return (lanes || []).map(l => (l || []).map(r => {
    const it = typeof r === 'string' ? { id: r } : r; const o = { id: it.id };
    if (it.duration != null) o.duration = it.duration;
    if (it.players != null) o.players = it.players;
    if (it.difficulty != null) o.difficulty = it.difficulty;
    return o;
  }));
}
function _bsPlanSig(lanes) { return JSON.stringify(_stripPlanLanes(lanes)); }

function _anonymizeBlock(blk, title) {
  const plans = {}, refMap = {};
  const refFor = pid => {
    if (!pid) return '';
    if (refMap[pid]) return refMap[pid];
    const p = savedPlans.find(x => x.id === pid); if (!p) return '';
    const ref = 'p' + (Object.keys(plans).length + 1); refMap[pid] = ref;
    const exNames = {};
    (p.lanes || []).forEach(l => (l || []).forEach(r => { const id = typeof r === 'string' ? r : r.id; const ex = exercises.find(e => e.id === id); if (ex) exNames[id] = ex.name; }));
    plans[ref] = { name: p.name || 'Plan', lanes: _stripPlanLanes(p.lanes), exNames, sport: _planSport(p) };
    return ref;
  };
  const weeks = (blk.weeks || []).map((w, wi) => ({
    label: 'Woche ' + (wi + 1), focus: w.focus || '',
    days: (w.days || []).map(d => ({
      label: d.label,
      entries: (d.entries || []).map(e => {
        const o = { type: e.type, title: e.type === 'game' ? 'Spieltag' : (e.title || ''), startTime: e.startTime || '', endTime: e.endTime || '', color: e.color || '', tags: e.tags || [] };
        const ref = refFor(e.planId); if (ref) o.planRef = ref;
        return o;
      })
    }))
  }));
  return { data: { name: title, weeks }, plans };
}

// Gemeinsame Vorschau (Einreichen, Admin-Prüfung, öffentliche Bibliothek)
function _blockPreviewHTML(data, plans) {
  plans = plans || {};
  return (data.weeks || []).map(w => {
    const days = (w.days || []).map(d => {
      const items = [...(d.entries || [])].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00')).map(e => {
        const pl = e.planRef && plans[e.planRef];
        return '<div style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:12px;">'
          + '<div style="width:92px;flex-shrink:0;color:var(--text-3);">' + esc((e.startTime || '–') + (e.endTime ? ' – ' + e.endTime : '')) + '</div>'
          + '<div style="flex:1;min-width:0;">' + _bsIco(e.type) + ' ' + esc(e.title || '(ohne Titel)') + (pl ? '<div style="color:var(--accent);font-size:11px;margin-top:1px;">📋 ' + esc(pl.name) + '</div>' : '') + '</div></div>';
      }).join('') || '<div style="font-size:12px;color:var(--text-3);">Keine Einträge</div>';
      return '<div style="margin:6px 0 8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);"><div style="font-weight:800;font-size:12px;margin-bottom:2px;">' + esc(d.label) + '</div>' + items + '</div>';
    }).join('') || '<div style="font-size:12px;color:var(--text-3);">Keine Tage</div>';
    return '<div style="margin-bottom:10px;"><div style="font-family:Barlow Condensed,sans-serif;font-size:15px;font-weight:900;">' + esc(w.label) + (w.focus ? ' <span style="font-weight:600;font-size:12px;color:var(--text-3);">· ' + esc(w.focus) + '</span>' : '') + '</div>' + days + '</div>';
  }).join('');
}

// ── Einreichen ───────────────────────────────────────────────────
function openBlockSubmit(blockId) {
  if (!currentUser) { showLoginRequired('Blöcke einreichen'); return; }
  const blk = ltpBlocks.find(b => b.id === blockId); if (!blk) return;
  const m = _bsOverlay('blockSubmitModal');
  m.innerHTML = '<div style="' + _BS_CARD + 'max-width:640px;">'
    + '<div style="font-family:Barlow Condensed,sans-serif;font-size:22px;font-weight:900;margin-bottom:2px;">Block einreichen</div>'
    + '<div style="font-size:12px;color:var(--text-2);line-height:1.5;margin-bottom:12px;">Eingereicht wird nur der Aufbau: Wochen, Tage, Zeitfenster und Trainingspläne. <strong>Notizen, Namen, Gegner, Trainer:innen und Daten werden entfernt.</strong> Die Vorschau zeigt genau, was andere sehen. Nach der Prüfung erscheint der Block in der Block-Bibliothek.</div>'
    + '<label style="font-size:11px;font-weight:800;color:var(--text-3);">TITEL</label>'
    + '<input id="bsTitle" class="fc" type="text" maxlength="80" style="width:100%;box-sizing:border-box;margin:4px 0 10px;">'
    + '<div id="bsChecks" style="display:grid;gap:4px;margin-bottom:12px;font-size:13px;"></div>'
    + '<div style="font-size:11px;font-weight:800;color:var(--text-3);margin-bottom:4px;">VORSCHAU – SO SEHEN ANDERE DEN BLOCK</div>'
    + '<div id="bsPreview" style="max-height:38vh;overflow-y:auto;border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:14px;"></div>'
    + '<div style="display:flex;gap:8px;"><button type="button" class="bsc" data-act="cancel" style="flex:1;">Abbrechen</button><button type="button" class="bpr" data-act="send" style="flex:2;" disabled>Einreichen</button></div></div>';
  const inp = m.querySelector('#bsTitle'), send = m.querySelector('[data-act=send]');
  inp.value = blk.name || '';
  const src = blk.copiedFrom;
  const refresh = () => {
    const title = inp.value.trim();
    const { data, plans } = _anonymizeBlock(blk, title);
    const days = data.weeks.reduce((a, w) => a + w.days.length, 0);
    const checks = [['Titel angegeben (mind. 2 Zeichen)', title.length >= 2], ['Block enthält mindestens einen Tag', days > 0]];
    if (src) {
      const known = new Set(src.planSigs || []);
      const hasNew = Object.values(plans).some(p => !known.has(_bsPlanSig(p.lanes)));
      checks.push(['Titel gegenüber dem Original angepasst', _bsNorm(title) !== _bsNorm(src.name)]);
      checks.push(['Mindestens ein neuer Trainingsplan eingebaut', hasNew]);
    }
    m.querySelector('#bsChecks').innerHTML = checks.map(([t, ok]) => '<div style="color:' + (ok ? 'var(--accent)' : 'var(--text-3)') + ';">' + (ok ? '✓' : '○') + ' ' + esc(t) + '</div>').join('');
    m.querySelector('#bsPreview').innerHTML = _blockPreviewHTML(data, plans);
    send.disabled = !checks.every(c => c[1]);
    return { title, data, plans };
  };
  inp.oninput = refresh; refresh();
  m.querySelector('[data-act=cancel]').onclick = () => m.remove();
  send.onclick = async () => {
    const { title, data, plans } = refresh(); if (send.disabled) return;
    send.disabled = true;
    const { data: ins, error } = await _supabase.from('submitted_blocks')
      .insert({ owner_id: currentUser.id, author_name: _publicAuthorName(null), name: title, sport: _blockSport(blk), data, plans, status: 'pending' })
      .select('id,data').single();
    if (error || !ins || !ins.data) { send.disabled = false; showToast('Block konnte nicht eingereicht werden', 'err'); console.warn(error); return; }
    m.remove(); showToast('✓ Block eingereicht – das Team prüft ihn.');
  };
}

// ── Kalender ─────────────────────────────────────────────────────
function _bsDayDate(startISO, wi, dayLabel) {
  const s = new Date(startISO + 'T12:00:00');
  const monday0 = new Date(s); monday0.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  const d = new Date(monday0); d.setDate(monday0.getDate() + wi * 7 + Math.max(0, _BS_WD.indexOf(dayLabel)));
  return _bsISO(d);
}
function openBlockCalendar(blockId) {
  if (!currentUser) { showLoginRequired('Den Kalender'); return; }
  const blk = ltpBlocks.find(b => b.id === blockId); if (!blk) return;
  const m = _bsOverlay('blockCalModal');
  m.innerHTML = '<div style="' + _BS_CARD + 'max-width:440px;">'
    + '<div style="font-size:30px;text-align:center;margin-bottom:4px;">📅</div>'
    + '<div style="font-family:Barlow Condensed,sans-serif;font-size:22px;font-weight:900;text-align:center;margin-bottom:6px;">Block im Kalender speichern</div>'
    + '<div style="font-size:13px;color:var(--text-2);line-height:1.5;margin-bottom:12px;text-align:center;">Wähle, wann der Block beginnt. Die Tage werden entsprechend ihrer Wochentage in den Kalender eingetragen.</div>'
    + '<label style="font-size:11px;font-weight:800;color:var(--text-3);">STARTDATUM</label>'
    + '<input id="bcStart" class="fc" type="date" style="width:100%;box-sizing:border-box;margin:4px 0 10px;">'
    + '<div id="bcInfo" style="font-size:13px;line-height:1.5;margin-bottom:6px;padding:10px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);"></div>'
    + '<div style="font-size:11px;color:var(--text-3);margin-bottom:14px;">Vorhandene Kalendereinträge dieses Blocks werden ersetzt. Einträge, die du im Kalender einzeln geändert hast, gehen dabei verloren.</div>'
    + '<div style="display:flex;gap:8px;"><button type="button" class="bsc" data-act="cancel" style="flex:1;">Abbrechen</button><button type="button" class="bpr" data-act="save" style="flex:2;">Im Kalender speichern</button></div></div>';
  const inp = m.querySelector('#bcStart'), info = m.querySelector('#bcInfo');
  inp.value = blk.calendarStart || (blk.startDate ? String(blk.startDate).slice(0, 10) : _bsISO(new Date()));
  const days = () => { const out = []; (blk.weeks || []).forEach((w, wi) => (w.days || []).forEach(d => { if ((d.entries || []).length) out.push({ w, wi, d }); })); return out; };
  const paint = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inp.value)) { info.textContent = 'Bitte ein Startdatum wählen.'; return; }
    const list = days(); const wk = (blk.weeks || []).length;
    const s = new Date(inp.value + 'T12:00:00'); const monday0 = new Date(s); monday0.setDate(s.getDate() - ((s.getDay() + 6) % 7));
    const end = new Date(monday0); end.setDate(monday0.getDate() + wk * 7 - 1);
    info.innerHTML = '<strong>' + wk + ' Woche' + (wk !== 1 ? 'n' : '') + '</strong> · ' + list.length + ' Tag' + (list.length !== 1 ? 'e' : '') + ' mit Einträgen<br>Zeitraum: <strong>' + _bsDe(_bsISO(monday0)) + ' – ' + _bsDe(_bsISO(end)) + '</strong> (Montag der Startwoche bis Sonntag der letzten Woche)';
  };
  inp.oninput = paint; paint();
  m.querySelector('[data-act=cancel]').onclick = () => m.remove();
  m.querySelector('[data-act=save]').onclick = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inp.value)) { showToast('Bitte ein Startdatum wählen', 'err'); return; }
    const list = days(); if (!list.length) { showToast('Der Block hat noch keine Tage mit Einträgen', 'err'); return; }
    const btn = m.querySelector('[data-act=save]'); btn.disabled = true;
    const sport = _blockSport(blk);
    const rows = list.map(({ w, wi, d }) => {
      const used = {}; (d.entries || []).forEach(e => { if (e.planId) { const p = savedPlans.find(x => x.id === e.planId); if (p) { const exNames = {}; (p.lanes || []).forEach(l => (l || []).forEach(r => { const id = typeof r === 'string' ? r : r.id; const ex = exercises.find(x => x.id === id); if (ex) exNames[id] = ex.name; })); used[e.planId] = { name: p.name, lanes: JSON.parse(JSON.stringify(p.lanes || [])), exNames }; } } });
      return {
        owner_id: currentUser.id, entry_date: _bsDayDate(inp.value, wi, d.label), name: d.label + ' · ' + (blk.name || 'Block'), sport,
        plan: { kind: 'day', label: d.label, blockName: blk.name || '', weekLabel: w.label || ('Woche ' + (wi + 1)), entries: JSON.parse(JSON.stringify(d.entries)), plans: used },
        source_plan_id: 'blk:' + blk.id + ':' + d.id
      };
    });
    const del = await _supabase.from('calendar_entries').delete().eq('owner_id', currentUser.id).like('source_plan_id', 'blk:' + blk.id + ':%');
    if (del.error) { btn.disabled = false; showToast('Kalender noch nicht verfügbar', 'err'); console.warn(del.error); return; }
    const ins = await _supabase.from('calendar_entries').insert(rows);
    if (ins.error) { btn.disabled = false; showToast('Im Kalender speichern fehlgeschlagen', 'err'); console.warn(ins.error); return; }
    blk.calendarStart = inp.value; save();
    m.remove(); showToast('✓ ' + rows.length + ' Tage im Kalender gespeichert');
    if (typeof calEntries !== 'undefined') { calSelDay = rows[0].entry_date; calMonth = new Date(rows[0].entry_date + 'T12:00:00'); }
  };
}

// ── Prüfung (Admin/Reviewer) ─────────────────────────────────────
async function loadAdminBlockQueue() {
  const el = document.getElementById('adminBlockQueue'); if (!el || !_supabase || (!IS_ADMIN && !IS_REVIEWER)) return;
  const { data, error } = await _supabase.from('submitted_blocks').select('*').eq('status', 'pending').order('submitted_at', { ascending: true });
  if (error) { el.innerHTML = '<div style="font-size:12px;color:var(--text-3);">Block-Warteschlange nicht verfügbar.</div>'; return; }
  window._adminBlockCache = data || [];
  if (!data.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Keine Blöcke in der Warteschlange.</div>'; return; }
  el.innerHTML = '';
  data.forEach(b => {
    const row = document.createElement('div'); row.className = 'sub-item';
    const wk = (b.data.weeks || []).length, dy = (b.data.weeks || []).reduce((a, w) => a + (w.days || []).length, 0);
    row.innerHTML = '<div class="sub-item-name">🗓 <span class="bs-name"></span> <span style="font-size:10px;color:var(--text-3);font-weight:400;" class="bs-meta"></span></div><div class="sub-item-meta" style="gap:6px;"></div>';
    row.querySelector('.bs-name').textContent = b.name;
    row.querySelector('.bs-meta').textContent = 'von ' + _safeAuthor(b.author_name, 'Unbekannt') + ' · ' + wk + ' Wochen · ' + dy + ' Tage · ' + (b.sport || '');
    const bar = row.querySelector('.sub-item-meta');
    const mk = (txt, bg, fn) => { const x = document.createElement('button'); x.textContent = txt; x.style.cssText = 'padding:4px 10px;background:' + bg + ';color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;'; x.onclick = fn; bar.appendChild(x); };
    mk('Vorschau', '#455a64', () => previewBlock(b, true));
    mk('✓ Freigeben', '#1a7f4b', () => reviewBlock(b.id, 'approved'));
    mk('✕ Ablehnen', '#c62828', () => reviewBlock(b.id, 'rejected'));
    el.appendChild(row);
  });
}
async function reviewBlock(id, status) {
  if (status === 'rejected' && !confirm('Block ablehnen?')) return;
  const { error } = await _supabase.from('submitted_blocks').update({ status }).eq('id', id);
  if (error) { showToast('Aktion fehlgeschlagen', 'err'); return; }
  showToast(status === 'approved' ? 'Block freigegeben' : 'Block abgelehnt');
  document.getElementById('blockPreviewModal')?.remove(); loadAdminBlockQueue();
}
function previewBlock(b, review) {
  const m = _bsOverlay('blockPreviewModal');
  m.innerHTML = '<div style="' + _BS_CARD + 'max-width:620px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;"><div>'
    + '<div id="bpTitle" style="font-family:Barlow Condensed,sans-serif;font-size:22px;font-weight:900;"></div><div id="bpMeta" style="font-size:12px;color:var(--text-3);margin:2px 0 12px;"></div></div>'
    + '<button type="button" data-act="close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-3);">✕</button></div>'
    + '<div id="bpBody"></div><div id="bpBtns" style="display:flex;gap:8px;margin-top:16px;"></div></div>';
  m.querySelector('#bpTitle').textContent = b.name;
  m.querySelector('#bpMeta').textContent = 'von ' + _safeAuthor(b.author_name, 'Unbekannt') + ' · ' + (b.data.weeks || []).length + ' Wochen';
  m.querySelector('#bpBody').innerHTML = _blockPreviewHTML(b.data, b.plans);
  m.querySelector('[data-act=close]').onclick = () => m.remove();
  const bar = m.querySelector('#bpBtns');
  const mk = (txt, cls, fn) => { const x = document.createElement('button'); x.type = 'button'; x.className = cls; x.textContent = txt; x.style.flex = '1'; x.onclick = fn; bar.appendChild(x); };
  if (review) { mk('✓ Freigeben', 'bpr', () => reviewBlock(b.id, 'approved')); mk('✕ Ablehnen', 'bsc', () => reviewBlock(b.id, 'rejected')); }
  else mk('In meine Planung kopieren', 'bpr', () => { m.remove(); copyPublicBlock(b.id); });
}

// ── Öffentliche Block-Bibliothek ─────────────────────────────────
let _pubBlocks = [];
async function renderPublicBlocks() {
  const el = document.getElementById('ltpPublicBlocks'); if (!el) return;
  if (!currentUser || !_supabase) { el.innerHTML = ''; return; }
  el.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Lädt …</div>';
  const { data, error } = await _supabase.from('submitted_blocks').select('id,name,author_name,sport,data,plans,submitted_at').eq('status', 'approved').eq('sport', _curSportId()).order('submitted_at', { ascending: false });
  if (error) { el.innerHTML = ''; console.warn('Block-Bibliothek nicht verfügbar', error); return; }
  _pubBlocks = data || [];
  el.innerHTML = '<div style="font-family:Barlow Condensed,sans-serif;font-size:16px;font-weight:900;margin:0 0 8px;">Von anderen Trainer:innen</div>';
  if (!_pubBlocks.length) { el.innerHTML += '<div style="font-size:12px;color:var(--text-3);margin-bottom:18px;">Noch keine geprüften Blöcke für diese Sportart.</div>'; return; }
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:grid;gap:10px;margin-bottom:22px;';
  _pubBlocks.forEach(b => {
    const wk = (b.data.weeks || []).length, dy = (b.data.weeks || []).reduce((a, w) => a + (w.days || []).length, 0), np = Object.keys(b.plans || {}).length;
    const card = document.createElement('div'); card.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;';
    card.innerHTML = '<div style="flex:1;min-width:180px;"><div class="pb-n" style="font-family:Barlow Condensed,sans-serif;font-size:16px;font-weight:900;"></div><div class="pb-m" style="font-size:11px;color:var(--text-3);margin-top:2px;"></div></div><div class="pb-b" style="display:flex;gap:6px;"></div>';
    card.querySelector('.pb-n').textContent = b.name;
    card.querySelector('.pb-m').textContent = 'von ' + _safeAuthor(b.author_name, 'Trainer:in') + ' · ' + wk + ' Wochen · ' + dy + ' Tage · ' + np + ' Trainingsplan' + (np !== 1 ? 'pläne' : '');
    const bar = card.querySelector('.pb-b');
    const mk = (t, cls, fn) => { const x = document.createElement('button'); x.type = 'button'; x.className = cls; x.textContent = t; x.onclick = fn; bar.appendChild(x); };
    mk('Vorschau', 'bsc', () => previewBlock(b, false));
    mk('Kopieren', 'bpr', () => copyPublicBlock(b.id));
    wrap.appendChild(card);
  });
  el.appendChild(wrap);
  const h = document.createElement('div'); h.style.cssText = 'font-family:Barlow Condensed,sans-serif;font-size:16px;font-weight:900;margin:0 0 8px;'; h.textContent = 'Meine gespeicherten Blöcke'; el.appendChild(h);
}

// Kopie anlegen: eingebettete Pläne werden als eigene Pläne gespeichert, der Block verweist auf sie
function copyPublicBlock(id) {
  if (!currentUser) { showLoginRequired('Die Block-Bibliothek'); return; }
  const b = _pubBlocks.find(x => x.id === id); if (!b) return;
  const idMap = {}, sigs = [];
  Object.entries(b.plans || {}).forEach(([ref, p]) => {
    const lanes = _stripPlanLanes(p.lanes);
    sigs.push(_bsPlanSig(lanes));
    const plan = { id: newUuid(), name: p.name || 'Plan', sport: p.sport || b.sport || _curSportId(), date: new Date().toLocaleDateString('de-DE'), lanes,
      totals: SECS.map((s, i) => ({ name: s.name, count: (lanes[i] || []).length })) };
    savedPlans.unshift(plan); idMap[ref] = plan.id;
  });
  const blk = {
    id: uid(), name: b.name, notes: '', startDate: '', sport: b.sport || _curSportId(), createdAt: new Date().toLocaleDateString('de-DE'),
    copiedFrom: { name: b.name, planSigs: sigs },
    weeks: (b.data.weeks || []).map(w => ({ id: uid(), label: w.label, focus: w.focus || '', notes: '',
      days: (w.days || []).map(d => ({ id: uid(), label: d.label, entries: (d.entries || []).map(e => ({ id: uid(), type: e.type, title: e.title || '', startTime: e.startTime || '', endTime: e.endTime || '', notes: '', planId: e.planRef ? (idMap[e.planRef] || '') : '', tags: e.tags || [], color: e.color || '#1565c0', gameFormat: '' })) })) }))
  };
  if (!ltpBlocks) ltpBlocks = [];
  ltpBlocks.unshift(blk); save();
  switchLtpTab(0); renderLtp();
  showToast('Block kopiert – du kannst ihn jetzt anpassen');
}
