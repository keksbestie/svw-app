// ══════════════════════════════════════════════════════════════════
// MODUL: VEREINS-ACCOUNTS
// ══════════════════════════════════════════════════════════════════
// Verwaltet Vereins-Login via Invite-Token, Logo-Anzeige, Club-Admin-Panel
// ══════════════════════════════════════════════════════════════════

let currentClub = null;      // { id, name, logo_url, slot_count }
let currentClubRole = null;  // 'club_admin' | 'club_trainer' | null
let clubLogoUrl = null;

// ══════════════════════════════════════════════════════
// INIT — wird nach Auth aufgerufen
// ══════════════════════════════════════════════════════
async function loadClubData(userId) {
  if (!_supabase || !userId) return;
  try {
    const { data: profile } = await _supabase
      .from('profiles')
      .select('club_id, club_role')
      .eq('id', userId)
      .single();

    if (!profile?.club_id) { currentClub = null; currentClubRole = null; clubLogoUrl = null; _renderClubLogo(); return; }

    currentClubRole = profile.club_role;
    const { data: club } = await _supabase
      .from('clubs')
      .select('id, name, logo_url, slot_count, logo_public_consent')
      .eq('id', profile.club_id)
      .single();

    currentClub = club || null;
    clubLogoUrl = club?.logo_url || null;
    _renderClubLogo();
  } catch(e) { console.warn('Club load error', e); }
}

function _renderClubLogo() {
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

// ══════════════════════════════════════════════════════
// INVITE-LINK HANDLING
// Beim App-Start prüfen ob ?token=... in der URL ist
// ══════════════════════════════════════════════════════
async function handleInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token || !_supabase) return;

  // Token validieren
  const { data: slot, error } = await _supabase
    .from('club_slots')
    .select('id, club_id, user_id, last_swapped_at')
    .eq('token', token)
    .single();

  if (error || !slot) { showToast('Einlade-Link ungültig oder abgelaufen.', 'err'); return; }
  if (slot.user_id) { showToast('Dieser Trainer-Slot ist bereits vergeben.', 'err'); return; }

  // User muss eingeloggt sein
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) {
    // Token im localStorage merken und nach Login weiterverarbeiten
    try { localStorage.setItem('ac_pending_token', token); } catch {}
    showToast('Bitte erst anmelden, dann wird der Zugang automatisch aktiviert.', '');
    return;
  }

  await _claimSlot(slot, user.id, token);
}

async function _claimSlot(slot, userId, token) {
  // Slot belegen
  const { error: slotErr } = await _supabase
    .from('club_slots')
    .update({ user_id: userId })
    .eq('id', slot.id);
  if (slotErr) { showToast('Aktivierung fehlgeschlagen.', 'err'); return; }

  // Profil verknüpfen
  await _supabase.from('profiles').update({ club_id: slot.club_id, club_role: 'club_trainer' }).eq('id', userId);

  // URL bereinigen
  try { window.history.replaceState({}, '', window.location.pathname); } catch {}
  try { localStorage.removeItem('ac_pending_token'); } catch {}

  showToast('Vereinszugang aktiviert! Willkommen.');
  await loadClubData(userId);
}

// Nach Login: pending token prüfen
async function checkPendingToken(userId) {
  let token;
  try { token = localStorage.getItem('ac_pending_token'); } catch {}
  if (!token || !_supabase) return;

  const { data: slot } = await _supabase
    .from('club_slots')
    .select('id, club_id, user_id')
    .eq('token', token)
    .single();

  if (slot && !slot.user_id) await _claimSlot(slot, userId, token);
  else { try { localStorage.removeItem('ac_pending_token'); } catch {} }
}

// ══════════════════════════════════════════════════════
// CLUB ADMIN PANEL
// ══════════════════════════════════════════════════════
async function renderClubAdminPanel() {
  const wrap = document.getElementById('clubAdminWrap');
  if (!wrap) return;

  // AssistCoach-Admin: Verein-Erstell-UI anzeigen
  if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
    _renderSuperAdminPanel(wrap);
    return;
  }

  if (!currentClub || currentClubRole !== 'club_admin') { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  const { data: slots } = await _supabase
    .from('club_slots')
    .select('id, slot_index, token, user_id, last_swapped_at, profiles(email)')
    .eq('club_id', currentClub.id)
    .order('slot_index');

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;

  let rows = (slots || []).map(s => {
    const swappedMonth = s.last_swapped_at ? (() => { const d = new Date(s.last_swapped_at); return `${d.getFullYear()}-${d.getMonth()}`; })() : null;
    const canSwap = swappedMonth !== thisMonth;
    const email = s.profiles?.email || null;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?token=${s.token}`;
    return `
      <div class="club-slot-row">
        <span class="slot-idx">Slot ${s.slot_index}</span>
        ${email
          ? `<span class="slot-email">${email}</span>
             ${canSwap
               ? `<button class="slot-btn slot-btn-remove" onclick="removeTrainerFromSlot('${s.id}')">Entfernen</button>`
               : `<span class="slot-locked" title="Bereits diesen Monat getauscht">🔒 gesperrt bis nächsten Monat</span>`
             }`
          : `<span class="slot-free">frei</span>
             <button class="slot-btn slot-btn-copy" onclick="copyInviteLink('${inviteUrl}')">Link kopieren</button>`
        }
      </div>`;
  }).join('');

  // Logo-Upload
  const consentChecked = currentClub?.logo_public_consent ? 'checked' : '';
  const logoSection = `
    <div class="club-logo-section">
      <label class="club-section-label">Vereinslogo</label>
      ${clubLogoUrl ? `<img src="${clubLogoUrl}" class="club-logo-preview" alt="Logo">` : '<span class="slot-free">Kein Logo hinterlegt</span>'}
      <input type="file" id="clubLogoInput" accept="image/*" style="display:none" onchange="uploadClubLogo(this)">
      <button class="slot-btn" onclick="document.getElementById('clubLogoInput').click()">Logo hochladen</button>
    </div>
    <label class="club-consent-label">
      <input type="checkbox" id="clubLogoConsent" ${consentChecked} onchange="saveLogoConsent(this.checked)">
      <span>Als autorisierte:r Vertreter:in meines Vereins erkläre ich mich damit einverstanden, dass AssistCoach das Vereinslogo unentgeltlich und nicht-kommerziell auf der Webseite assistcoach.app zur Darstellung teilnehmender Vereine verwenden darf. Diese Einwilligung kann jederzeit durch Entfernen des Hakens widerrufen werden.</span>
    </label>`;

  wrap.innerHTML = `
    <div class="club-admin-header">
      <span class="club-admin-title">Vereinsverwaltung — ${currentClub.name}</span>
    </div>
    ${logoSection}
    <div class="club-section-label" style="margin-top:16px;">Trainer-Slots (${(slots||[]).filter(s=>s.user_id).length}/${currentClub.slot_count} belegt)</div>
    <div class="club-slots-list">${rows}</div>`;
}

async function _renderSuperAdminPanel(wrap) {
  wrap.style.display = '';

  // Alle Vereine laden
  const { data: clubs } = await _supabase.from('clubs').select('id, name, slot_count, logo_url, created_at').order('created_at', { ascending: false });

  const clubRows = (clubs || []).map(c => `
    <div class="club-slot-row">
      ${c.logo_url ? `<img src="${c.logo_url}" style="height:24px;max-width:40px;object-fit:contain;border-radius:3px;">` : '<span style="width:40px;display:inline-block;"></span>'}
      <span style="flex:1;font-size:13px;font-weight:600;">${c.name}</span>
      <span class="slot-idx">${c.slot_count} Slots</span>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="club-admin-header"><span class="club-admin-title">🏢 Vereinsverwaltung (Admin)</span></div>

    <label class="club-section-label">Neuen Verein anlegen</label>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
      <input type="text" id="newClubName" class="fc" placeholder="Vereinsname" style="margin:0;">
      <input type="number" id="newClubSlots" class="fc" placeholder="Anzahl Trainer-Slots" min="1" max="100" style="margin:0;">
      <input type="email" id="newClubAdminEmail" class="fc" placeholder="E-Mail des Vereins-Admins (optional)" style="margin:0;">
      <button class="bpr" onclick="createClubFromUI()">Verein anlegen</button>
    </div>

    <label class="club-section-label">Bestehende Vereine (${(clubs||[]).length})</label>
    <div class="club-slots-list">${clubRows || '<span class="slot-free">Noch keine Vereine angelegt.</span>'}</div>`;
}

async function createClubFromUI() {
  const name = document.getElementById('newClubName')?.value.trim();
  const slots = parseInt(document.getElementById('newClubSlots')?.value);
  const email = document.getElementById('newClubAdminEmail')?.value.trim();
  if (!name || !slots || slots < 1) { showToast('Name und Slot-Anzahl erforderlich', 'err'); return; }

  let adminUserId = null;
  if (email) {
    const { data: profile } = await _supabase.from('profiles').select('id').eq('email', email).single();
    if (!profile) { showToast(`Kein Account mit E-Mail "${email}" gefunden`, 'err'); return; }
    adminUserId = profile.id;
  }

  const club = await createClub(name, slots, adminUserId);
  if (club) renderClubAdminPanel();
}

async function removeTrainerFromSlot(slotId) {
  if (!_supabase || !currentClub) return;
  const { data: slot } = await _supabase.from('club_slots').select('user_id').eq('id', slotId).single();
  if (!slot?.user_id) return;

  // Profil-Verknüpfung aufheben
  await _supabase.from('profiles').update({ club_id: null, club_role: null }).eq('id', slot.user_id);
  // Neuen Token generieren + last_swapped_at setzen
  const newToken = crypto.randomUUID();
  await _supabase.from('club_slots').update({ user_id: null, token: newToken, last_swapped_at: new Date().toISOString() }).eq('id', slotId);
  showToast('Trainer entfernt. Neuer Invite-Link generiert.');
  renderClubAdminPanel();
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
  _renderClubLogo();
  showToast('Logo gespeichert.');
  renderClubAdminPanel();
}

async function saveLogoConsent(checked) {
  if (!_supabase || !currentClub) return;
  await _supabase.from('clubs').update({ logo_public_consent: checked }).eq('id', currentClub.id);
  if (currentClub) currentClub.logo_public_consent = checked;
  showToast(checked ? 'Einverständnis gespeichert.' : 'Einverständnis zurückgezogen.');
}

function copyInviteLink(url) {
  navigator.clipboard.writeText(url).then(() => showToast('Invite-Link kopiert!')).catch(() => {
    // Fallback: temp input
    const inp = document.createElement('input');
    inp.value = url; document.body.appendChild(inp); inp.select();
    document.execCommand('copy'); document.body.removeChild(inp);
    showToast('Invite-Link kopiert!');
  });
}

// ══════════════════════════════════════════════════════
// ADMIN: NEUEN VEREIN ANLEGEN (nur AssistCoach-Admin)
// ══════════════════════════════════════════════════════
async function createClub(name, slotCount, adminUserId) {
  if (!_supabase || !IS_ADMIN) return;

  // Verein anlegen
  const { data: club, error: clubErr } = await _supabase
    .from('clubs')
    .insert({ name, slot_count: slotCount })
    .select()
    .single();
  if (clubErr) { showToast('Verein anlegen fehlgeschlagen', 'err'); return; }

  // Slots anlegen
  const slotsToInsert = Array.from({ length: slotCount }, (_, i) => ({
    club_id: club.id,
    slot_index: i + 1,
    token: crypto.randomUUID()
  }));
  await _supabase.from('club_slots').insert(slotsToInsert);

  // Admin-Profil verknüpfen (wenn angegeben)
  if (adminUserId) {
    await _supabase.from('profiles').update({ club_id: club.id, club_role: 'club_admin' }).eq('id', adminUserId);
  }

  showToast(`Verein "${name}" mit ${slotCount} Slots angelegt.`);
  return club;
}
