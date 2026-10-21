// ══════════════════════════════════════════════════════════════════
// MODUL: VEREINS-ACCOUNTS
// ══════════════════════════════════════════════════════════════════

let currentClub = null;      // { id, name, logo_url, slot_count, logo_public_consent }
let currentClubRole = null;  // 'club_admin' | 'club_trainer' | null
let clubLogoUrl = null;

// ── Init nach Auth ────────────────────────────────────────────────
async function loadClubData(userId) {
  if (!_supabase || !userId) return;
  try {
    const { data: profile } = await _supabase
      .from('profiles').select('club_id, club_role').eq('id', userId).single();
    if (!profile?.club_id) { currentClub = null; currentClubRole = null; clubLogoUrl = null; _renderClubBtn(); return; }
    currentClubRole = profile.club_role;
    const { data: club } = await _supabase
      .from('clubs').select('id, name, logo_url, slot_count, logo_public_consent').eq('id', profile.club_id).single();
    currentClub = club || null;
    clubLogoUrl = club?.logo_url || null;
    _renderClubBtn();
  } catch(e) { console.warn('Club load error', e); }
}

function _renderClubBtn() {
  const btn = document.getElementById('navClubBtn');
  if (!btn) return;
  if (currentClub) {
    const logoHtml = clubLogoUrl
      ? `<img src="${clubLogoUrl}" alt="" style="height:20px;max-width:48px;object-fit:contain;border-radius:3px;vertical-align:middle;margin-right:5px;">`
      : '';
    btn.innerHTML = `${logoHtml}Mein Verein`;
    btn.style.display = 'inline-flex';
  } else {
    btn.style.display = 'none';
  }
}

// ── Invite-Token-Flow ─────────────────────────────────────────────
async function handleInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token || !_supabase) return;
  const { data: slot } = await _supabase.from('club_slots').select('id, club_id, user_id').eq('token', token).single();
  if (!slot || slot.user_id) { showToast(slot ? 'Dieser Slot ist bereits vergeben.' : 'Einlade-Link ungültig.', 'err'); return; }
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) {
    try { localStorage.setItem('ac_pending_token', token); } catch {}
    showToast('Bitte erst anmelden – Zugang wird dann automatisch aktiviert.');
    return;
  }
  await _claimSlot(slot, user.id);
}

async function _claimSlot(slot, userId) {
  await _supabase.from('club_slots').update({ user_id: userId }).eq('id', slot.id);
  await _supabase.from('profiles').update({ club_id: slot.club_id, club_role: 'club_trainer' }).eq('id', userId);
  try { window.history.replaceState({}, '', window.location.pathname); } catch {}
  try { localStorage.removeItem('ac_pending_token'); } catch {}
  showToast('Vereinszugang aktiviert! Willkommen.');
  await loadClubData(userId);
}

async function checkPendingToken(userId) {
  let token; try { token = localStorage.getItem('ac_pending_token'); } catch {}
  if (!token || !_supabase) return;
  const { data: slot } = await _supabase.from('club_slots').select('id, club_id, user_id').eq('token', token).single();
  if (slot && !slot.user_id) await _claimSlot(slot, userId);
  else { try { localStorage.removeItem('ac_pending_token'); } catch {} }
}

// ══════════════════════════════════════════════════════════════════
// ACCOUNT-TAB: MEIN VEREIN
// ══════════════════════════════════════════════════════════════════
async function renderClubTab() {
  const wrap = document.getElementById('accPanelClub');
  if (!wrap) return;

  // Kein Verein → Optionen anzeigen
  if (!currentClub) {
    wrap.innerHTML = `
      <div class="club-no-club">
        <div class="club-section-label">Du bist noch keinem Verein zugeordnet.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;">
          <button class="bpr" style="flex:1;min-width:160px;" onclick="showCreateClub()">＋ Verein anlegen</button>
          <button class="bsec" style="flex:1;min-width:160px;" onclick="showSearchClub()">🔍 Verein suchen</button>
        </div>
        <div id="clubFormArea"></div>
      </div>`;
    return;
  }

  // Verein vorhanden
  if (currentClubRole === 'club_admin') {
    await _renderAdminView(wrap);
  } else {
    await _renderTrainerView(wrap);
  }
}

// ── Verein anlegen ────────────────────────────────────────────────
function showCreateClub() {
  const area = document.getElementById('clubFormArea');
  if (!area) return;
  area.innerHTML = `
    <div style="background:var(--surface);border-radius:12px;padding:20px;box-shadow:var(--sh);">
      <div class="fsec" style="margin-top:0;">Neuen Verein anlegen</div>
      <label class="club-section-label">Vereinsname</label>
      <input type="text" id="createClubName" class="fc" placeholder="z.B. FC Beispielhausen 09" style="margin-bottom:12px;">
      <label class="club-section-label">Logo (optional)</label>
      <input type="file" id="createClubLogo" accept="image/*" style="margin-bottom:16px;font-size:13px;">
      <button class="bpr" style="width:100%;" onclick="submitCreateClub()">Verein anlegen</button>
    </div>`;
}

async function submitCreateClub() {
  const name = document.getElementById('createClubName')?.value.trim();
  if (!name) { showToast('Bitte einen Vereinsnamen eingeben.', 'err'); return; }
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) { showToast('Nicht eingeloggt.', 'err'); return; }

  // Verein anlegen
  const { data: club, error } = await _supabase.from('clubs').insert({ name, slot_count: 0 }).select().single();
  if (error) { showToast('Fehler beim Anlegen.', 'err'); return; }

  // Logo hochladen falls vorhanden
  const logoInput = document.getElementById('createClubLogo');
  if (logoInput?.files?.[0]) {
    const file = logoInput.files[0];
    const ext = file.name.split('.').pop();
    const path = `club-logos/${club.id}.${ext}`;
    const { error: upErr } = await _supabase.storage.from('exercise-images').upload(path, file, { upsert: true, contentType: file.type });
    if (!upErr) {
      const { data: { publicUrl } } = _supabase.storage.from('exercise-images').getPublicUrl(path);
      await _supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', club.id);
      club.logo_url = publicUrl;
    }
  }

  // Profil als club_admin verknüpfen
  await _supabase.from('profiles').update({ club_id: club.id, club_role: 'club_admin' }).eq('id', user.id);

  currentClub = club;
  currentClubRole = 'club_admin';
  clubLogoUrl = club.logo_url || null;
  _renderClubBtn();
  showToast(`Verein „${name}" angelegt!`);
  renderClubTab();
}

// ── Verein suchen ─────────────────────────────────────────────────
function showSearchClub() {
  const area = document.getElementById('clubFormArea');
  if (!area) return;
  area.innerHTML = `
    <div style="background:var(--surface);border-radius:12px;padding:20px;box-shadow:var(--sh);">
      <div class="fsec" style="margin-top:0;">Verein suchen</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <input type="text" id="clubSearchIn" class="fc" placeholder="Vereinsname eingeben…" style="margin:0;flex:1;" oninput="searchClubs()">
      </div>
      <div id="clubSearchResults"></div>
    </div>`;
}

async function searchClubs() {
  const q = document.getElementById('clubSearchIn')?.value.trim();
  const res = document.getElementById('clubSearchResults');
  if (!res) return;
  if (!q || q.length < 2) { res.innerHTML = ''; return; }

  const { data: clubs } = await _supabase.from('clubs').select('id, name, logo_url').ilike('name', `%${q}%`).limit(10);
  if (!clubs?.length) { res.innerHTML = '<div class="slot-free" style="padding:8px 0;">Kein Verein gefunden.</div>'; return; }

  res.innerHTML = clubs.map(c => `
    <div class="club-slot-row" style="margin-bottom:6px;">
      ${c.logo_url ? `<img src="${c.logo_url}" style="height:24px;max-width:40px;object-fit:contain;border-radius:3px;">` : '<span style="width:40px;display:inline-block;"></span>'}
      <span style="flex:1;font-size:13px;font-weight:600;">${c.name}</span>
      <button class="slot-btn slot-btn-copy" onclick="requestJoinClub('${c.id}','${c.name.replace(/'/g,"\\'")}')">Anfragen</button>
    </div>`).join('');
}

async function requestJoinClub(clubId, clubName) {
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) { showToast('Nicht eingeloggt.', 'err'); return; }

  const { error } = await _supabase.from('club_join_requests').insert({ club_id: clubId, user_id: user.id });
  if (error) {
    if (error.code === '23505') showToast('Du hast bereits eine Anfrage gestellt.', 'err');
    else showToast('Fehler beim Anfragen.', 'err');
    return;
  }
  showToast(`Anfrage an „${clubName}" gesendet!`);
  document.getElementById('clubFormArea').innerHTML = `<div style="padding:12px 0;font-size:13px;color:var(--gd2);">✓ Deine Anfrage wurde gesendet. Der Vereins-Admin muss sie bestätigen.</div>`;
}

// ── Admin-Ansicht ─────────────────────────────────────────────────
async function _renderAdminView(wrap) {
  const [slotsRes, requestsRes] = await Promise.all([
    _supabase.from('club_slots').select('id, slot_index, token, user_id, last_swapped_at, profiles(email)').eq('club_id', currentClub.id).order('slot_index'),
    _supabase.from('club_join_requests').select('id, user_id, profiles(email)').eq('club_id', currentClub.id).eq('status', 'pending')
  ]);

  const slots = slotsRes.data || [];
  const requests = requestsRes.data || [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;

  const slotRows = slots.map(s => {
    const swappedMonth = s.last_swapped_at ? (() => { const d = new Date(s.last_swapped_at); return `${d.getFullYear()}-${d.getMonth()}`; })() : null;
    const canSwap = swappedMonth !== thisMonth;
    const email = s.profiles?.email || null;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?token=${s.token}`;
    return `<div class="club-slot-row">
      <span class="slot-idx">Slot ${s.slot_index}</span>
      ${email
        ? `<span class="slot-email">${email}</span>
           ${canSwap ? `<button class="slot-btn slot-btn-remove" onclick="removeTrainerFromSlot('${s.id}')">Entfernen</button>` : `<span class="slot-locked">🔒 bis nächsten Monat</span>`}`
        : `<span class="slot-free">frei</span><button class="slot-btn slot-btn-copy" onclick="copyInviteLink('${inviteUrl}')">Link kopieren</button>`}
    </div>`;
  }).join('');

  const requestRows = requests.length ? requests.map(r => `
    <div class="club-slot-row">
      <span class="slot-email" style="flex:1;">${r.profiles?.email || '–'}</span>
      <button class="slot-btn slot-btn-copy" onclick="approveJoinRequest('${r.id}','${r.user_id}')">Annehmen</button>
      <button class="slot-btn slot-btn-remove" onclick="rejectJoinRequest('${r.id}')">Ablehnen</button>
    </div>`).join('') : '<div class="slot-free">Keine offenen Anfragen.</div>';

  const consentChecked = currentClub?.logo_public_consent ? 'checked' : '';

  // Mitglieder für Admin-Übergabe
  const { data: members } = await _supabase.from('profiles').select('id, email').eq('club_id', currentClub.id).eq('club_role', 'club_trainer');
  const memberOpts = (members || []).map(m => `<option value="${m.id}">${m.email}</option>`).join('');

  wrap.innerHTML = `
    <div style="background:var(--surface);border-radius:12px;padding:20px;box-shadow:var(--sh);margin-bottom:14px;">
      <div class="club-admin-header">
        <span class="club-admin-title">${currentClub.name}</span>
        <span style="font-size:11px;color:var(--gd2);font-weight:600;">Club-Admin</span>
      </div>

      <div class="club-logo-section">
        <label class="club-section-label">Vereinslogo</label>
        ${clubLogoUrl ? `<img src="${clubLogoUrl}" class="club-logo-preview" alt="Logo">` : '<span class="slot-free">Kein Logo</span>'}
        <input type="file" id="clubLogoInput" accept="image/*" style="display:none" onchange="uploadClubLogo(this)">
        <button class="slot-btn" onclick="document.getElementById('clubLogoInput').click()">Logo hochladen</button>
      </div>
      <div style="font-size:11px;color:var(--gd2);margin-top:4px;">PNG mit transparentem Hintergrund, min. 300×300 px empfohlen.</div>
      <label class="club-consent-label">
        <input type="checkbox" id="clubLogoConsent" ${consentChecked} onchange="saveLogoConsent(this.checked)">
        <span>Als autorisierte:r Vertreter:in meines Vereins erkläre ich mich damit einverstanden, dass AssistCoach das Vereinslogo unentgeltlich und nicht-kommerziell auf der Webseite assistcoach.app zur Darstellung teilnehmender Vereine verwenden darf. Diese Einwilligung kann jederzeit durch Entfernen des Hakens widerrufen werden.</span>
      </label>
    </div>

    <div style="background:var(--surface);border-radius:12px;padding:20px;box-shadow:var(--sh);margin-bottom:14px;">
      <div class="club-section-label">Beitrittsanfragen (${requests.length})</div>
      <div class="club-slots-list">${requestRows}</div>
    </div>

    <div style="background:var(--surface);border-radius:12px;padding:20px;box-shadow:var(--sh);margin-bottom:14px;">
      <div class="club-section-label">Trainer-Slots (${slots.filter(s=>s.user_id).length}/${currentClub.slot_count} belegt)</div>
      <div class="club-slots-list">${slotRows || '<div class="slot-free">In der aktuellen Version noch nicht verfügbar.</div>'}</div>
    </div>

    ${memberOpts ? `
    <div style="background:var(--surface);border-radius:12px;padding:20px;box-shadow:var(--sh);margin-bottom:14px;">
      <div class="club-section-label">Admin-Rolle übergeben</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <select id="transferAdminSel" class="fc" style="margin:0;flex:1;">${memberOpts}</select>
        <button class="slot-btn slot-btn-remove" onclick="transferAdminRole()">Übergeben</button>
      </div>
    </div>` : ''}

    <div style="background:var(--surface);border-radius:12px;padding:20px;box-shadow:var(--sh);border:1px solid rgba(229,57,53,.25);">
      <div class="club-section-label" style="color:#e53935;">Verein löschen</div>
      <div style="font-size:12px;color:var(--gd2);margin-bottom:12px;">Löscht den Verein dauerhaft. Alle Mitglieder werden automatisch ausgetragen.</div>
      <button class="slot-btn slot-btn-remove" style="width:100%;" onclick="deleteClub()">🗑 Verein dauerhaft löschen</button>
    </div>`;
}

// ── Trainer-Ansicht ───────────────────────────────────────────────
async function _renderTrainerView(wrap) {
  wrap.innerHTML = `
    <div style="background:var(--surface);border-radius:12px;padding:20px;box-shadow:var(--sh);">
      <div class="club-admin-header">
        ${clubLogoUrl ? `<img src="${clubLogoUrl}" style="height:36px;max-width:80px;object-fit:contain;border-radius:4px;">` : ''}
        <span class="club-admin-title">${currentClub.name}</span>
      </div>
      <div style="font-size:13px;color:var(--gd2);">Du bist Trainer in diesem Verein.</div>
      <button class="slot-btn slot-btn-remove" style="margin-top:16px;" onclick="leaveClub()">Verein verlassen</button>
    </div>`;
}

// ── Aktionen ──────────────────────────────────────────────────────
async function approveJoinRequest(requestId, userId) {
  if (!currentClub) return;
  // Slot anlegen
  const nextIndex = (currentClub.slot_count || 0) + 1;
  await _supabase.from('club_slots').insert({ club_id: currentClub.id, slot_index: nextIndex, token: crypto.randomUUID(), user_id: userId });
  await _supabase.from('clubs').update({ slot_count: nextIndex }).eq('id', currentClub.id);
  await _supabase.from('profiles').update({ club_id: currentClub.id, club_role: 'club_trainer' }).eq('id', userId);
  await _supabase.from('club_join_requests').update({ status: 'approved' }).eq('id', requestId);
  currentClub.slot_count = nextIndex;
  showToast('Mitglied aufgenommen.');
  renderClubTab();
}

async function rejectJoinRequest(requestId) {
  await _supabase.from('club_join_requests').update({ status: 'rejected' }).eq('id', requestId);
  showToast('Anfrage abgelehnt.');
  renderClubTab();
}

async function removeTrainerFromSlot(slotId) {
  const { data: slot } = await _supabase.from('club_slots').select('user_id').eq('id', slotId).single();
  if (!slot?.user_id) return;
  await _supabase.from('profiles').update({ club_id: null, club_role: null }).eq('id', slot.user_id);
  await _supabase.from('club_slots').update({ user_id: null, token: crypto.randomUUID(), last_swapped_at: new Date().toISOString() }).eq('id', slotId);
  showToast('Trainer entfernt.');
  renderClubTab();
}

async function transferAdminRole() {
  const sel = document.getElementById('transferAdminSel');
  if (!sel?.value || !currentClub) return;
  const { data: { user } } = await _supabase.auth.getUser();
  // Neuer Admin
  await _supabase.from('profiles').update({ club_role: 'club_admin' }).eq('id', sel.value);
  // Alter Admin wird Trainer
  await _supabase.from('profiles').update({ club_role: 'club_trainer' }).eq('id', user.id);
  currentClubRole = 'club_trainer';
  showToast('Admin-Rolle übergeben.');
  renderClubTab();
}

function deleteClub() {
  if (!currentClub) return;
  _showDeleteClubModal(currentClub.id, currentClub.name, false);
}

async function _executeDeleteClub(clubId, clubName) {
  await _supabase.from('profiles').update({ club_id: null, club_role: null }).eq('club_id', clubId);
  await _supabase.from('club_slots').delete().eq('club_id', clubId);
  await _supabase.from('club_join_requests').delete().eq('club_id', clubId);
  const { error } = await _supabase.from('clubs').delete().eq('id', clubId);
  if (error) { showToast('Fehler beim Löschen: ' + error.message, 'err'); return; }
  if (currentClub?.id === clubId) { currentClub = null; currentClubRole = null; clubLogoUrl = null; _renderClubBtn(); }
  document.getElementById('deleteClubModal')?.remove();
  showToast(`Verein „${clubName}" wurde gelöscht.`);
  if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) { renderClubAdminPanel(); renderClubTab(); }
  else renderClubTab();
}

function _showDeleteClubModal(clubId, clubName, isAdmin) {
  let modal = document.getElementById('deleteClubModal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'deleteClubModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:var(--bg);border-radius:16px;max-width:500px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.6);border:1px solid rgba(229,57,53,.4);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
        <span style="font-size:26px;">⚠️</span>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;color:#e53935;">Verein löschen – bitte lies das sorgfältig</div>
      </div>
      <div style="background:rgba(229,57,53,.08);border:1px solid rgba(229,57,53,.3);border-radius:10px;padding:16px;margin-bottom:20px;font-size:13px;line-height:1.7;color:var(--text-1);">
        <div>Du bist dabei, <strong>${clubName}</strong> dauerhaft zu löschen. Diese Aktion <strong>kann nicht rückgängig gemacht werden</strong> – auch nicht durch den Support.</div>
        <div style="margin-top:12px;font-weight:700;font-size:12px;color:#e53935;text-transform:uppercase;letter-spacing:.5px;">Folgendes wird unwiderruflich gelöscht:</div>
        <ul style="margin:6px 0 0 16px;padding:0;">
          <li>Alle Vereinsinformationen (Name, Logo, Einstellungen)</li>
          <li>Alle Vereinsdaten und Mitgliederlisten</li>
          <li>Alle offenen Beitrittsanfragen</li>
        </ul>
        <div style="margin-top:12px;font-weight:700;font-size:12px;color:#e53935;text-transform:uppercase;letter-spacing:.5px;">Für alle Vereinsmitglieder gilt:</div>
        <ul style="margin:6px 0 0 16px;padding:0;">
          <li>Trainer:innen ohne eigenen Account verlieren ihren Zugang vollständig</li>
          <li>Trainer:innen mit eigenem Account werden automatisch auf ihren persönlich gebuchten Plan zurückgestuft</li>
        </ul>
      </div>
      <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:14px;border:2px solid rgba(229,57,53,.3);border-radius:10px;background:rgba(229,57,53,.05);transition:border-color .2s;" id="deleteClubConsentLabel">
        <input type="checkbox" id="deleteClubConsent" onchange="
          const btn=document.getElementById('deleteClubConfirmBtn');
          btn.style.display=this.checked?'inline-flex':'none';
        " style="width:18px;height:18px;margin-top:2px;flex-shrink:0;accent-color:#e53935;cursor:pointer;">
        <span style="font-size:13px;font-weight:700;line-height:1.5;">Ich verstehe, dass der Verein und alle zugehörigen Daten <span style="color:#e53935;">dauerhaft und unwiderruflich gelöscht</span> werden und diese Daten auch durch den Support nicht wiederhergestellt werden können.</span>
      </label>
      <div style="display:flex;gap:10px;margin-top:18px;align-items:center;">
        <button onclick="document.getElementById('deleteClubModal').remove()" style="flex:1;padding:11px;background:var(--surface-2);color:var(--text-1);border:1px solid var(--border);border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;cursor:pointer;">Abbrechen</button>
        <button id="deleteClubConfirmBtn" onclick="_executeDeleteClub('${clubId}','${clubName.replace(/'/g,"\\'")}')" style="display:none;flex:1;padding:11px;background:#c62828;color:#ffffff !important;border:none;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;cursor:pointer;letter-spacing:.3px;">🗑 Verein final löschen</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function leaveClub() {
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;
  await _supabase.from('profiles').update({ club_id: null, club_role: null }).eq('id', user.id);
  // Slot freigeben
  await _supabase.from('club_slots').update({ user_id: null, token: crypto.randomUUID(), last_swapped_at: new Date().toISOString() }).eq('user_id', user.id);
  currentClub = null; currentClubRole = null; clubLogoUrl = null;
  _renderClubBtn();
  showToast('Du hast den Verein verlassen.');
  renderClubTab();
}

async function uploadClubLogo(input) {
  if (!input.files?.[0] || !_supabase || !currentClub) return;
  const file = input.files[0];
  if (file.size > 2 * 1024 * 1024) { showToast('Logo zu groß (max. 2 MB)', 'err'); return; }
  const ext = file.name.split('.').pop();
  const path = `club-logos/${currentClub.id}.${ext}`;
  const { error } = await _supabase.storage.from('exercise-images').upload(path, file, { upsert: true, contentType: file.type });
  if (error) { showToast('Upload fehlgeschlagen', 'err'); return; }
  const { data: { publicUrl } } = _supabase.storage.from('exercise-images').getPublicUrl(path);
  await _supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', currentClub.id);
  clubLogoUrl = publicUrl;
  if (currentClub) currentClub.logo_url = publicUrl;
  _renderClubBtn();
  showToast('Logo gespeichert.');
  renderClubTab();
}

async function saveLogoConsent(checked) {
  if (!_supabase || !currentClub) return;
  await _supabase.from('clubs').update({ logo_public_consent: checked }).eq('id', currentClub.id);
  if (currentClub) currentClub.logo_public_consent = checked;
  showToast(checked ? 'Einverständnis gespeichert.' : 'Einverständnis zurückgezogen.');
}

function copyInviteLink(url) {
  navigator.clipboard.writeText(url).then(() => showToast('Invite-Link kopiert!')).catch(() => {
    const inp = document.createElement('input');
    inp.value = url; document.body.appendChild(inp); inp.select();
    document.execCommand('copy'); document.body.removeChild(inp);
    showToast('Invite-Link kopiert!');
  });
}

function adminDeleteClub(clubId, clubName) {
  if (!IS_ADMIN) return;
  _showDeleteClubModal(clubId, clubName, true);
}

// ── AssistCoach-Admin: alle Vereine ──────────────────────────────
async function renderClubAdminPanel() {
  const wrap = document.getElementById('clubAdminWrap');
  if (!wrap) return;
  if (typeof IS_ADMIN === 'undefined' || !IS_ADMIN) { wrap.style.display = 'none'; return; }

  const { data: clubs } = await _supabase.from('clubs').select('id, name, slot_count, logo_url, created_at').order('created_at', { ascending: false });
  wrap.style.display = '';
  wrap.innerHTML = `
    <div class="club-admin-header"><span class="club-admin-title">🏢 Alle Vereine (${(clubs||[]).length})</span></div>
    <div class="club-slots-list">
      ${(clubs||[]).map(c => `
        <div class="club-slot-row">
          ${c.logo_url ? `<img src="${c.logo_url}" style="height:24px;max-width:40px;object-fit:contain;border-radius:3px;">` : '<span style="width:40px;display:inline-block;"></span>'}
          <span style="flex:1;font-size:13px;font-weight:600;">${c.name}</span>
          <span class="slot-idx">${c.slot_count} Slots</span>
          <button class="slot-btn slot-btn-remove" onclick="adminDeleteClub('${c.id}','${c.name.replace(/'/g,"\\'")}')">Löschen</button>
        </div>`).join('') || '<div class="slot-free">Noch keine Vereine.</div>'}
    </div>`;
}
