// ══════════════════════════════════════════════════════════════════
// MODUL: KADER-VERWALTUNG + TRAININGSPLAN-KADER
// ══════════════════════════════════════════════════════════════════
let squad = [];        // [{id, name, number, position, ageGroup}]
let editPlayerId = null;
let coaches = [];       // Trainerteam: [{id, name, role}] – pro Übung im Plan einplanbar
let editCoachId = null;
const COACH_ROLES = ['Cheftrainer:in','Co-Trainer:in','Torwarttrainer:in','Athletiktrainer:in','Betreuer:in'];

// IDs der Spieler, die heute beim Training dabei sind (null = ganzer Kader)
let planSquadAbsent = new Set(); // IDs der Abwesenden

// ── Trainingsplan-Kader ───────────────────────────────────────────
function squadForPlan() {
  if (!squad.length) return [];
  return squad.filter(p => !planSquadAbsent.has(p.id));
}

function initPlanSquad() {
  const wrap = document.getElementById('planSquadWrap');
  if (wrap) wrap.style.display = squad.length ? '' : 'none';
  renderSquadDrop();
}

function renderSquadDrop() {
  const list = document.getElementById('squadPlayerList');
  if (!list) return;
  list.innerHTML = squad.map(p => `
    <label style="display:flex;align-items:center;gap:10px;padding:6px 14px;cursor:pointer;font-size:13px;" onclick="toggleSquadPlayer(event,'${escJs(p.id)}')">
      <input type="checkbox" data-pid="${esc(p.id)}" ${planSquadAbsent.has(p.id)?'':'checked'} style="accent-color:var(--accent);width:15px;height:15px;">
      <span>${escH(p.name)}${p.ageGroup?` <span style="font-size:10px;color:var(--gd2);">${esc(p.ageGroup)}</span>`:''}</span>
    </label>
  `).join('');
  updateSquadLabel();
}

function toggleSquadDrop() {
  const drop = document.getElementById('planSquadDrop');
  if (!drop) return;
  const open = drop.style.display !== 'none';
  drop.style.display = open ? 'none' : 'block';
  if (!open) renderSquadDrop();
}

function toggleAllSquad(e) {
  e.stopPropagation();
  const allChk = document.getElementById('squadAllChk');
  // Let the checkbox toggle first
  setTimeout(() => {
    if (allChk.checked) {
      planSquadAbsent.clear();
    } else {
      squad.forEach(p => planSquadAbsent.add(p.id));
    }
    renderSquadDrop();
    renderLanes();
  }, 0);
}

function toggleSquadPlayer(e, id) {
  e.stopPropagation();
  const chk = e.currentTarget.querySelector('input');
  setTimeout(() => {
    if (chk.checked) {
      planSquadAbsent.delete(id);
    } else {
      planSquadAbsent.add(id);
    }
    updateSquadLabel();
    const allChk = document.getElementById('squadAllChk');
    if (allChk) allChk.checked = planSquadAbsent.size === 0;
    renderLanes();
  }, 0);
}

function updateSquadLabel() {
  const label = document.getElementById('planSquadLabel');
  if (!label) return;
  const present = squad.length - planSquadAbsent.size;
  label.textContent = planSquadAbsent.size === 0
    ? 'Ganzer Kader'
    : `${present} von ${squad.length} Spielern`;
}

// Schließt Squad-Dropdown wenn außerhalb geklickt
document.addEventListener('click', e => {
  if (!e.target.closest('#planSquadWrap')) {
    const drop = document.getElementById('planSquadDrop');
    if (drop) drop.style.display = 'none';
  }
});

// ── Ausschluss-Dropdown pro Übung ────────────────────────────────
let _excDropTarget = null; // {exId, si}

function toggleExcludeDrop(exId, si, btn) {
  // Altes Dropdown entfernen
  const existing = document.getElementById('excDrop');
  if (existing) {
    const same = _excDropTarget && _excDropTarget.exId === exId && _excDropTarget.si === si;
    existing.remove();
    _excDropTarget = null;
    if (same) return;
  }

  _excDropTarget = {exId, si};
  const lane = currentPlan.lanes[si] || [];
  const item = lane.map(r => typeof r === 'string' ? {id:r} : r).find(r => r.id === exId);
  const excluded = new Set(item?.excludedIds || []);
  const present = squadForPlan();

  const drop = document.createElement('div');
  drop.id = 'excDrop';
  drop.style.cssText = 'position:fixed;min-width:200px;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;box-shadow:var(--shadow-lg);z-index:500;padding:8px 0;max-height:280px;overflow-y:auto;';

  const rect = btn.getBoundingClientRect();
  drop.style.top = (rect.bottom + 6) + 'px';
  drop.style.left = Math.max(8, rect.left - 120) + 'px';

  drop.innerHTML = `<div style="padding:5px 12px 4px;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--gd2);">Nicht dabei bei dieser Übung</div>` +
    present.map(p => `
      <label style="display:flex;align-items:center;gap:9px;padding:6px 12px;cursor:pointer;font-size:12px;" onclick="event.stopPropagation()">
        <input type="checkbox" data-pid="${esc(p.id)}" ${excluded.has(p.id)?'checked':''} style="accent-color:#e53935;width:14px;height:14px;"
          onchange="setExclude('${escJs(exId)}',${Number(si)||0},'${escJs(p.id)}',this.checked)">
        ${escH(p.name)}
      </label>
    `).join('');

  document.body.appendChild(drop);
}

function setExclude(exId, si, pid, excluded) {
  const lane = currentPlan.lanes[si] || [];
  const idx = lane.findIndex(r => (typeof r === 'string' ? r : r.id) === exId);
  if (idx < 0) return;
  const item = typeof lane[idx] === 'string' ? {id: lane[idx]} : {...lane[idx]};
  const set = new Set(item.excludedIds || []);
  excluded ? set.add(pid) : set.delete(pid);
  item.excludedIds = [...set];
  lane[idx] = item;
  currentPlan.lanes[si] = lane;
  save();
  renderLanes();
}

document.addEventListener('click', e => {
  if (!e.target.closest('#excDrop') && !e.target.closest('.pi-squad-btn')) {
    const drop = document.getElementById('excDrop');
    if (drop) { drop.remove(); _excDropTarget = null; }
  }
});

// ── Init ──────────────────────────────────────────────────────────
async function loadSquad() {
  const menuBtn = document.getElementById('menuKaderBtn');
  if (menuBtn) menuBtn.style.display = currentUser ? '' : 'none';
  const navBtn = document.getElementById('navKaderBtn');
  if (navBtn) navBtn.style.display = currentUser ? '' : 'none';

  if (!_supabase || !currentUser) { loadSquadLocal(); return; }
  try {
    const { data, error } = await _supabase
      .from('players')
      .select('*')
      .eq('owner_id', currentUser.id)
      .order('name');
    if (error) throw error;
    squad = (data || []).map(r => ({
      id: r.id, name: r.name,
      number: r.number || '', position: r.position || '', ageGroup: r.age_group || ''
    }));
    cacheSquadLocal();
  } catch (e) {
    console.warn('Kader laden fehlgeschlagen, nutze Cache:', e);
    loadSquadLocal();
  }
  await loadCoaches();
}

async function loadCoaches() {
  loadCoachesLocal();
  if (!_supabase || !currentUser) return;
  try {
    const { data, error } = await _supabase.from('coaches').select('*').eq('owner_id', currentUser.id).order('name');
    if (error) throw error;
    if (data && data.length) {
      coaches = data.map(r => ({ id: r.id, name: r.name, role: r.role || '' }));
      cacheCoachesLocal();
    } else if (coaches.length) {
      // Nur lokal vorhandene Einträge (Tabelle war noch nicht da) einmalig sichern
      await _supabase.from('coaches').insert(coaches.map(c => ({ id: c.id, owner_id: currentUser.id, name: c.name, role: c.role || null })));
    }
  } catch (e) {
    console.warn('Trainerteam laden fehlgeschlagen, nutze lokalen Stand:', e);
  }
}
function loadCoachesLocal() {
  try { const raw = localStorage.getItem('ac_coaches'); coaches = raw ? JSON.parse(raw) : []; } catch { coaches = []; }
}
function cacheCoachesLocal() {
  try { localStorage.setItem('ac_coaches', JSON.stringify(coaches)); } catch {}
}

function loadSquadLocal() {
  try {
    const raw = localStorage.getItem('ac_squad');
    if (raw) squad = JSON.parse(raw);
  } catch {}
}

function cacheSquadLocal() {
  try { localStorage.setItem('ac_squad', JSON.stringify(squad)); } catch {}
}

// ── Render ────────────────────────────────────────────────────────
function renderKaderPage() {
  const list = document.getElementById('kaderList');
  const empty = document.getElementById('kaderEmpty');
  const menuBtn = document.getElementById('menuKaderBtn');
  const navBtn2 = document.getElementById('navKaderBtn');

  // Show menu/nav entry only when logged in
  if (menuBtn) menuBtn.style.display = currentUser ? '' : 'none';
  if (navBtn2) navBtn2.style.display = currentUser ? '' : 'none';

  if (!currentUser) {
    list.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--gd2);"><div style="font-size:13px;">Bitte melde dich an, um deinen Kader zu verwalten.</div></div>';
    if (empty) empty.style.display = 'none';
    return;
  }

  renderCoachList();
  if (!squad.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  // Group by ageGroup
  const groups = {};
  squad.forEach(p => {
    const g = p.ageGroup || 'Ohne Jahrgang';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });

  const AGE_ORDER = ['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','U19','U20','U21','U23','Senioren','Seniorinnen','Ohne Jahrgang'];
  const sortedGroups = Object.keys(groups).sort((a, b) => {
    const ai = AGE_ORDER.indexOf(a), bi = AGE_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  list.innerHTML = sortedGroups.map(g => `
    <div style="margin-bottom:24px;">
      <div class="fsec" style="margin-top:0;">${esc(g)} &mdash; ${groups[g].length} Spieler</div>
      <div style="display:grid;gap:8px;">
        ${groups[g].map(p => `
          <div style="background:var(--surface);border-radius:10px;padding:12px 16px;box-shadow:var(--sh);display:flex;align-items:center;gap:14px;cursor:pointer;" onclick="openPlayerModal('${escJs(p.id)}')">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-l);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:900;flex-shrink:0;">
              ${p.number ? esc(p.number) : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escH(p.name)}</div>
              ${p.position ? `<div style="font-size:11px;color:var(--gd2);">${escH(p.position)}</div>` : ''}
            </div>
            <div style="font-size:11px;color:var(--gd2);flex-shrink:0;">&#9998;</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderCoachList() {
  const el = document.getElementById('coachList'); if (!el) return;
  if (!coaches.length) { el.innerHTML = '<div style="font-size:13px;color:var(--gd2);padding:6px 0;">Noch keine Trainer:innen angelegt.</div>'; return; }
  el.innerHTML = coaches.map(c => `
    <div style="background:var(--surface);border-radius:10px;padding:12px 16px;box-shadow:var(--sh);display:flex;align-items:center;gap:14px;cursor:pointer;" onclick="openCoachModal('${escJs(c.id)}')">
      <div style="width:36px;height:36px;border-radius:50%;background:#e8f0fe;color:#1a56c4;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🧑‍🏫</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.name)}</div>
        ${c.role ? `<div style="font-size:11px;color:var(--gd2);">${esc(c.role)}</div>` : ''}
      </div>
      <div style="font-size:11px;color:var(--gd2);flex-shrink:0;">&#9998;</div>
    </div>`).join('');
}

// ── Trainerteam: Modal + Speichern ───────────────────────────────
function openCoachModal(id) {
  editCoachId = id || null;
  const c = id ? coaches.find(x => x.id === id) : null;
  if (id && !c) return;
  document.getElementById('cName').value = c ? c.name : '';
  document.getElementById('cRole').value = c ? (c.role || '') : '';
  document.getElementById('coachModalTitle').textContent = c ? 'Trainer:in bearbeiten' : 'Trainer:in anlegen';
  document.getElementById('coachDeleteBtn').style.display = c ? '' : 'none';
  document.getElementById('coachModal').classList.remove('h');
  setTimeout(() => document.getElementById('cName').focus(), 50);
}
function closeCoachModal() { document.getElementById('coachModal').classList.add('h'); editCoachId = null; }

async function saveCoach() {
  if (!currentUser) { showToast('Bitte zuerst anmelden', 'err'); return; }
  const name = document.getElementById('cName').value.trim();
  const role = document.getElementById('cRole').value;
  if (!name) { showToast('Bitte einen Namen eingeben', 'err'); return; }
  if (coaches.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== editCoachId)) { showToast(`„${name}" ist bereits im Trainerteam`, 'err'); return; }
  const btn = document.getElementById('coachSaveBtn'); btn.disabled = true;
  let dbErr = null;
  try {
    if (editCoachId) {
      const i = coaches.findIndex(c => c.id === editCoachId);
      if (i !== -1) coaches[i] = { ...coaches[i], name, role };
      if (_supabase) { const r = await _supabase.from('coaches').update({ name, role: role || null }).eq('id', editCoachId).eq('owner_id', currentUser.id); dbErr = r.error; }
    } else {
      const c = { id: uid(), name, role };
      coaches.push(c);
      if (_supabase) { const r = await _supabase.from('coaches').insert({ id: c.id, owner_id: currentUser.id, name, role: role || null }); dbErr = r.error; }
    }
    coaches.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    cacheCoachesLocal();
    showToast(dbErr ? 'Nur auf diesem Gerät gespeichert' : (editCoachId ? 'Trainer:in aktualisiert' : 'Trainer:in angelegt'), dbErr ? 'err' : '');
    closeCoachModal();
    renderKaderPage();
    if (typeof renderLanes === 'function') renderLanes();
  } finally { btn.disabled = false; }
}

async function deleteCoach() {
  if (!editCoachId) return;
  if (!confirm('Trainer:in wirklich löschen? Sie wird auch aus den Übungen im aktuellen Plan entfernt.')) return;
  const id = editCoachId;
  coaches = coaches.filter(c => c.id !== id);
  // aus dem aktuellen Plan entfernen
  try {
    (currentPlan.lanes || []).forEach((lane, si) => {
      currentPlan.lanes[si] = (lane || []).map(r => (typeof r === 'object' && r.coachIds) ? { ...r, coachIds: r.coachIds.filter(x => x !== id) } : r);
    });
    save();
  } catch (e) {}
  if (_supabase && currentUser) await _supabase.from('coaches').delete().eq('id', id).eq('owner_id', currentUser.id);
  cacheCoachesLocal();
  showToast('Trainer:in gelöscht');
  closeCoachModal();
  renderKaderPage();
  if (typeof renderLanes === 'function') renderLanes();
}

// ── Trainer:in pro Übung im Plan einplanen ───────────────────────
function coachNames(ids) {
  const set = new Set(ids || []);
  return coaches.filter(c => set.has(c.id)).map(c => c.name);
}
function toggleCoachDrop(exId, si, btn) {
  const existing = document.getElementById('coachDrop');
  if (existing) { existing.remove(); if (existing.dataset.key === exId + '|' + si) return; }
  const lane = currentPlan.lanes[si] || [];
  const item = lane.map(r => typeof r === 'string' ? { id: r } : r).find(r => r.id === exId);
  const chosen = new Set(item?.coachIds || []);
  const drop = document.createElement('div');
  drop.id = 'coachDrop'; drop.dataset.key = exId + '|' + si;
  drop.style.cssText = 'position:fixed;min-width:210px;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;box-shadow:var(--shadow-lg);z-index:500;padding:8px 0;max-height:280px;overflow-y:auto;';
  const rect = btn.getBoundingClientRect();
  drop.style.top = (rect.bottom + 6) + 'px';
  drop.style.left = Math.max(8, Math.min(rect.left - 120, window.innerWidth - 226)) + 'px';
  drop.innerHTML = '<div style="padding:5px 12px 4px;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--gd2);">Trainer:in bei dieser Übung</div>'
    + coaches.map(c => `
      <label style="display:flex;align-items:center;gap:9px;padding:6px 12px;cursor:pointer;font-size:12px;" onclick="event.stopPropagation()">
        <input type="checkbox" ${chosen.has(c.id) ? 'checked' : ''} style="accent-color:#1a56c4;width:14px;height:14px;"
          onchange="setLaneCoach('${escJs(exId)}',${Number(si) || 0},'${escJs(c.id)}',this.checked)">
        ${esc(c.name)}${c.role ? ` <span style="font-size:10px;color:var(--gd2);">${esc(c.role)}</span>` : ''}
      </label>`).join('');
  document.body.appendChild(drop);
}
function setLaneCoach(exId, si, cid, on) {
  const lane = currentPlan.lanes[si] || [];
  const idx = lane.findIndex(r => (typeof r === 'string' ? r : r.id) === exId);
  if (idx < 0) return;
  const item = typeof lane[idx] === 'string' ? { id: lane[idx] } : { ...lane[idx] };
  const set = new Set(item.coachIds || []);
  on ? set.add(cid) : set.delete(cid);
  item.coachIds = [...set];
  lane[idx] = item; currentPlan.lanes[si] = lane;
  save();
  renderLanes();
}
document.addEventListener('click', e => {
  if (!e.target.closest('#coachDrop') && !e.target.closest('.pi-coach-btn')) { const d = document.getElementById('coachDrop'); if (d) d.remove(); }
});

function escH(s) {
  return esc(s);
}

// ── Modal ─────────────────────────────────────────────────────────
function openPlayerModal(id) {
  editPlayerId = id || null;
  const modal = document.getElementById('playerModal');
  const title = document.getElementById('playerModalTitle');
  const delBtn = document.getElementById('playerDeleteBtn');

  if (id) {
    const p = squad.find(x => x.id === id);
    if (!p) return;
    document.getElementById('pName').value = p.name;
    document.getElementById('pNumber').value = p.number || '';
    document.getElementById('pAge').value = p.ageGroup || '';
    document.getElementById('pPosition').value = p.position || '';
    title.textContent = 'Spieler bearbeiten';
    delBtn.style.display = '';
  } else {
    document.getElementById('pName').value = '';
    document.getElementById('pNumber').value = '';
    document.getElementById('pAge').value = '';
    document.getElementById('pPosition').value = '';
    title.textContent = 'Spieler anlegen';
    delBtn.style.display = 'none';
  }

  modal.classList.remove('h');
  setTimeout(() => document.getElementById('pName').focus(), 50);
}

function closePlayerModal() {
  document.getElementById('playerModal').classList.add('h');
  editPlayerId = null;
}

async function savePlayer() {
  if (!currentUser) { showToast('Bitte zuerst anmelden', 'err'); return; }
  const name = document.getElementById('pName').value.trim();
  if (!name) { showToast('Bitte einen Namen eingeben', 'err'); return; }

  const data = {
    name,
    number: document.getElementById('pNumber').value.trim(),
    ageGroup: document.getElementById('pAge').value,
    position: document.getElementById('pPosition').value
  };

  // Duplikatsprüfung: gleicher Name (case-insensitiv), anderer Eintrag
  const nameLower = name.toLowerCase();
  const duplicate = squad.find(p => p.name.toLowerCase() === nameLower && p.id !== editPlayerId);
  if (duplicate) {
    showToast(`„${duplicate.name}" ist bereits im Kader`, 'err');
    return;
  }

  const btn = document.getElementById('playerSaveBtn');
  btn.disabled = true;

  try {
    if (editPlayerId) {
      // Update
      const idx = squad.findIndex(p => p.id === editPlayerId);
      if (idx !== -1) squad[idx] = { ...squad[idx], ...data };
      if (_supabase && currentUser) {
        await _supabase.from('players').update({
          name: data.name, number: data.number || null,
          age_group: data.ageGroup || null, position: data.position || null
        }).eq('id', editPlayerId).eq('owner_id', currentUser.id);
      }
    } else {
      // Insert
      const newPlayer = { id: uid(), ...data };
      squad.push(newPlayer);
      if (_supabase && currentUser) {
        await _supabase.from('players').insert({
          id: newPlayer.id, owner_id: currentUser.id,
          name: data.name, number: data.number || null,
          age_group: data.ageGroup || null, position: data.position || null
        });
      }
    }
    cacheSquadLocal();
    showToast(editPlayerId ? 'Spieler aktualisiert' : 'Spieler angelegt');
    closePlayerModal();
    renderKaderPage();
  } catch (e) {
    console.error(e);
    showToast('Fehler beim Speichern', 'err');
  } finally {
    btn.disabled = false;
  }
}

async function deletePlayer() {
  if (!editPlayerId) return;
  if (!confirm('Spieler wirklich löschen?')) return;

  squad = squad.filter(p => p.id !== editPlayerId);
  if (_supabase && currentUser) {
    await _supabase.from('players').delete()
      .eq('id', editPlayerId).eq('owner_id', currentUser.id);
  }
  cacheSquadLocal();
  showToast('Spieler gelöscht');
  closePlayerModal();
  renderKaderPage();
}
