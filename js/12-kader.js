// ══════════════════════════════════════════════════════════════════
// MODUL: KADER-VERWALTUNG
// ══════════════════════════════════════════════════════════════════
let squad = [];        // [{id, name, number, position, ageGroup}]
let editPlayerId = null;

// ── Init ──────────────────────────────────────────────────────────
async function loadSquad() {
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

  // Show menu entry only when logged in
  if (menuBtn) menuBtn.style.display = currentUser ? '' : 'none';

  if (!currentUser) {
    list.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--gd2);"><div style="font-size:13px;">Bitte melde dich an, um deinen Kader zu verwalten.</div></div>';
    if (empty) empty.style.display = 'none';
    return;
  }

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
      <div class="fsec" style="margin-top:0;">${g} &mdash; ${groups[g].length} Spieler</div>
      <div style="display:grid;gap:8px;">
        ${groups[g].map(p => `
          <div style="background:var(--surface);border-radius:10px;padding:12px 16px;box-shadow:var(--sh);display:flex;align-items:center;gap:14px;cursor:pointer;" onclick="openPlayerModal('${p.id}')">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-l);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:900;flex-shrink:0;">
              ${p.number || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'}
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

function escH(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('pName').focus(), 50);
}

function closePlayerModal() {
  document.getElementById('playerModal').style.display = 'none';
  editPlayerId = null;
}

async function savePlayer() {
  const name = document.getElementById('pName').value.trim();
  if (!name) { showToast('Bitte einen Namen eingeben', 'err'); return; }

  const data = {
    name,
    number: document.getElementById('pNumber').value.trim(),
    ageGroup: document.getElementById('pAge').value,
    position: document.getElementById('pPosition').value
  };

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
