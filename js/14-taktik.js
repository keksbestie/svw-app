// ══════════════════════════════════════════════════════════════════
// MODUL: TAKTIKTAFEL
// ══════════════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────────────
let _tkTactics = [];
let _tkCurrent = null;   // { id, name, sport, fieldType, scenes }
let _tkSceneIdx = 0;
let _tkTool = 'select';  // 'select'|'home'|'away'|'ball'|'arrow'|'run'
let _tkSquadPick = null; // { id, label } — squad player to place
let _tkDrag = null;      // { elemIdx, startX, startY, origEl }
let _tkArrowStart = null;// { x, y } normalized for 2-tap arrow draw
let _tkSelected = null;  // index into current scene.elements
let _tkAnimating = false;
let _tkAnimFrame = null;
let _tkDirty = false;
let _tkView = 'list';    // 'list'|'edit'
let _tkCanvas = null;
let _tkCtx = null;
let _tkRO = null;        // ResizeObserver

// ── Constants ──────────────────────────────────────────────────────
const TK_FIELDS = {
  fussball: [
    { id: 'fb-11', label: '11er Feld', wm: 105, hm: 68 },
    { id: 'fb-9',  label: '9er Feld',  wm: 80,  hm: 55 },
    { id: 'fb-7',  label: '7er Feld',  wm: 60,  hm: 40 },
  ],
  volleyball: [
    { id: 'vb-full',  label: 'Großfeld',         wm: 18, hm: 9 },
    { id: 'vb-beach', label: 'Beach Volleyball',  wm: 16, hm: 8 },
  ],
};
const TK_SPORT_LABEL = { fussball: 'Fußball', volleyball: 'Volleyball' };

// ── Helpers ────────────────────────────────────────────────────────
function _tkId() { return 'e' + Math.random().toString(36).slice(2, 9); }
function _tkNewId() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function _tkFieldDef(ft) {
  return [...TK_FIELDS.fussball, ...TK_FIELDS.volleyball].find(f => f.id === ft) || TK_FIELDS.fussball[0];
}
function _tkFieldLabel(ft) { return _tkFieldDef(ft)?.label || ft; }
function _tkCurrentScene() { return _tkCurrent?.scenes[_tkSceneIdx] || null; }
function _tkCloneScene(s) { return { elements: s.elements.map(e => ({ ...e })) }; }

// ── Geometry ───────────────────────────────────────────────────────
function _tkRect(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const p = canvas.width > 200 ? 20 : 6; // less padding for thumbnails
  const fd = _tkFieldDef(_tkCurrent?.fieldType || 'fb-11');
  const aspect = fd.wm / fd.hm;
  let fw = W - p * 2, fh = fw / aspect;
  if (fh > H - p * 2) { fh = H - p * 2; fw = fh * aspect; }
  const ox = (W - fw) / 2, oy = (H - fh) / 2;
  return { ox, oy, fw, fh, W, H };
}

function _tkN2C(nx, ny, rect) {
  return { x: rect.ox + nx * rect.fw, y: rect.oy + ny * rect.fh };
}

function _tkC2N(cx, cy, rect) {
  return { x: (cx - rect.ox) / rect.fw, y: (cy - rect.oy) / rect.fh };
}

function _tkEventPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
}

function _tkTouch(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY };
}

// ── Supabase ────────────────────────────────────────────────────────
async function tkLoadTactics() {
  if (!_supabase || !currentUser) { _tkTactics = []; return; }
  try {
    const { data, error } = await _supabase
      .from('taktiken')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    _tkTactics = data || [];
  } catch (e) { console.warn('Taktiken laden:', e); _tkTactics = []; }
}

async function tkSaveTacticToDb() {
  if (!_tkCurrent) return;
  const payload = {
    name: _tkCurrent.name,
    sport: _tkCurrent.sport,
    field_type: _tkCurrent.fieldType,
    scenes: _tkCurrent.scenes,
    updated_at: new Date().toISOString(),
  };
  try {
    if (_tkCurrent._dbId) {
      await _supabase.from('taktiken').update(payload).eq('id', _tkCurrent._dbId);
    } else {
      const { data, error } = await _supabase.from('taktiken')
        .insert({ ...payload, user_id: currentUser.id })
        .select().single();
      if (error) throw error;
      _tkCurrent._dbId = data.id;
    }
    _tkDirty = false;
    showToast('Taktik gespeichert');
  } catch (e) {
    console.warn('Taktik speichern:', e);
    showToast('Fehler beim Speichern');
  }
}

async function _tkDeleteFromDb(id) {
  try { await _supabase.from('taktiken').delete().eq('id', id); } catch (e) { console.warn(e); }
  _tkTactics = _tkTactics.filter(t => t.id !== id);
}

// ── Page Entry ─────────────────────────────────────────────────────
function renderTaktikPage() {
  if (_tkView === 'list') _tkShowList();
  else _tkShowEditor();
}

// ── List View ──────────────────────────────────────────────────────
function _tkShowList() {
  const pg = document.getElementById('page-taktik');
  if (!pg) return;
  pg.innerHTML = `
    <div class="page-header">
      <button class="icon-btn back-btn" onclick="goPage('home')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1 class="page-title">Taktiktafel</h1>
      <button class="btn-primary" onclick="_tkNewDialog()" style="margin-left:auto;white-space:nowrap;">+ Neue Taktik</button>
    </div>
    <div class="inner" style="max-width:720px;padding-bottom:80px;" id="tktListInner"></div>
  `;
  _tkRenderList();
}

function _tkRenderList() {
  const inner = document.getElementById('tktListInner');
  if (!inner) return;
  if (!_tkTactics.length) {
    inner.innerHTML = `<div class="tkt-empty">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.25"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
      <p style="color:var(--gd2);margin-top:12px;">Noch keine Taktiken gespeichert</p>
      <button class="btn-primary" onclick="_tkNewDialog()" style="margin-top:16px;">Erste Taktik erstellen</button>
    </div>`;
    return;
  }
  inner.innerHTML = _tkTactics.map(t => `
    <div class="tkt-list-card" onclick="_tkOpenById('${t.id}')">
      <div>
        <div class="tkt-list-name">${escH(t.name)}</div>
        <div class="tkt-list-meta">${TK_SPORT_LABEL[t.sport] || t.sport} · ${_tkFieldLabel(t.field_type)} · ${t.scenes.length} Szene${t.scenes.length !== 1 ? 'n' : ''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button class="icon-btn" onclick="event.stopPropagation();_tkAskDelete('${t.id}','${escH(t.name).replace(/'/g,"\\'")}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
        </button>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity:.4"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  `).join('');
}

function _tkAskDelete(id, name) {
  if (!confirm(`Taktik "${name}" löschen?`)) return;
  _tkDeleteFromDb(id).then(() => _tkRenderList());
}

function _tkNewDialog() {
  const sport = window.currentSport?.id === 'volleyball' ? 'volleyball' : 'fussball';
  const fields = TK_FIELDS[sport];

  const m = document.createElement('div');
  m.className = 'modal-overlay'; m.id = 'tktNewModal';
  m.innerHTML = `
    <div class="modal-box" style="max-width:340px;">
      <div class="modal-header"><h2 style="font-size:17px;">Neue Taktik</h2></div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">
        <label>
          <div class="form-label">Sportart</div>
          <select id="tktNSport" class="input-field" style="width:100%;" onchange="_tkNUpdateFields()">
            <option value="fussball" ${sport==='fussball'?'selected':''}>Fußball</option>
            <option value="volleyball" ${sport==='volleyball'?'selected':''}>Volleyball</option>
          </select>
        </label>
        <label>
          <div class="form-label">Feldtyp</div>
          <select id="tktNField" class="input-field" style="width:100%;"></select>
        </label>
        <label>
          <div class="form-label">Name</div>
          <input id="tktNName" class="input-field" style="width:100%;box-sizing:border-box;" placeholder="z.B. Pressing 4-3-3">
        </label>
        <div style="display:flex;gap:10px;margin-top:4px;">
          <button class="btn-secondary" style="flex:1;" onclick="document.getElementById('tktNewModal').remove()">Abbrechen</button>
          <button class="btn-primary" style="flex:1;" onclick="_tkCreateNew()">Erstellen</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  _tkNUpdateFields();
  document.getElementById('tktNName').focus();
}

function _tkNUpdateFields() {
  const sport = document.getElementById('tktNSport')?.value || 'fussball';
  const sel = document.getElementById('tktNField');
  if (!sel) return;
  sel.innerHTML = (TK_FIELDS[sport] || TK_FIELDS.fussball).map(f =>
    `<option value="${f.id}">${f.label}</option>`).join('');
}

function _tkCreateNew() {
  const sport = document.getElementById('tktNSport')?.value || 'fussball';
  const fieldType = document.getElementById('tktNField')?.value || 'fb-11';
  const name = document.getElementById('tktNName')?.value.trim() || 'Neue Taktik';
  document.getElementById('tktNewModal')?.remove();
  _tkCurrent = { _dbId: null, name, sport, fieldType, scenes: [{ elements: [] }] };
  _tkSceneIdx = 0; _tkSelected = null; _tkTool = 'select'; _tkDirty = true;
  _tkView = 'edit';
  _tkShowEditor();
}

function _tkOpenById(id) {
  const t = _tkTactics.find(x => x.id === id);
  if (!t) return;
  _tkCurrent = {
    _dbId: t.id,
    name: t.name,
    sport: t.sport,
    fieldType: t.field_type,
    scenes: JSON.parse(JSON.stringify(t.scenes)),
  };
  _tkSceneIdx = 0; _tkSelected = null; _tkTool = 'select'; _tkDirty = false;
  _tkView = 'edit';
  _tkShowEditor();
}

// ── Editor View ─────────────────────────────────────────────────────
function _tkShowEditor() {
  const pg = document.getElementById('page-taktik');
  if (!pg) return;

  if (_tkRO) { _tkRO.disconnect(); _tkRO = null; }
  if (_tkAnimating) _tkStopAnim();

  pg.innerHTML = `
    <div class="tkt-editor">
      <div class="tkt-header">
        <button class="icon-btn" onclick="_tkBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="tkt-title" id="tktTitle" onclick="_tkRename()">${escH(_tkCurrent.name)}</span>
        <button class="btn-primary tkt-save-btn" onclick="tkSaveTacticToDb()">Speichern</button>
      </div>
      <div class="tkt-canvas-area" id="tktCanvasArea">
        <canvas id="tktCanvas"></canvas>
      </div>
      <div class="tkt-toolbar" id="tktToolbar">
        <button class="tkt-tool" data-tool="select" onclick="_tkSetTool('select')" title="Auswählen">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 3l14 9-7 1-4 7z"/></svg>
        </button>
        <div class="tkt-sep"></div>
        <button class="tkt-tool" data-tool="home" onclick="_tkPlayerPick('home')" title="Heim">
          <span class="tkt-dot tkt-dot-home">H</span>
        </button>
        <button class="tkt-tool" data-tool="away" onclick="_tkPlayerPick('away')" title="Gast">
          <span class="tkt-dot tkt-dot-away">G</span>
        </button>
        <div class="tkt-sep"></div>
        <button class="tkt-tool" data-tool="ball" onclick="_tkSetTool('ball')" title="Ball">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10M2 12h20"/></svg>
        </button>
        <button class="tkt-tool" data-tool="arrow" onclick="_tkSetTool('arrow')" title="Passlinie">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
        </button>
        <button class="tkt-tool" data-tool="run" onclick="_tkSetTool('run')" title="Laufweg">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="19" x2="19" y2="5" stroke-dasharray="5 3"/><polyline points="13 2 19 5 16 11"/></svg>
        </button>
        <div class="tkt-sep"></div>
        <button class="tkt-tool" id="tktDelBtn" onclick="_tkDelSelected()" title="Löschen">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M9 6V4h6v2"/></svg>
        </button>
      </div>
      <div class="tkt-strip">
        <div class="tkt-thumbs" id="tktThumbs"></div>
        <div class="tkt-strip-btns">
          <button class="tkt-strip-btn" onclick="_tkAddScene()" title="Szene hinzufügen">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="tkt-strip-btn" id="tktPlayBtn" onclick="_tkPlay()" title="Animation abspielen">
            <svg id="tktPlayIcon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  _tkInitCanvas();
  _tkRefreshToolbar();
  _tkRebuildStrip();
}

// ── Canvas init ─────────────────────────────────────────────────────
function _tkInitCanvas() {
  const area = document.getElementById('tktCanvasArea');
  const canvas = document.getElementById('tktCanvas');
  if (!area || !canvas) return;
  _tkCanvas = canvas;
  _tkCtx = canvas.getContext('2d');

  function resize() {
    if (!area || !_tkCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    _tkCanvas.width = area.clientWidth * dpr;
    _tkCanvas.height = area.clientHeight * dpr;
    _tkCanvas.style.width = area.clientWidth + 'px';
    _tkCanvas.style.height = area.clientHeight + 'px';
    _tkDrawMain();
  }

  _tkRO = new ResizeObserver(resize);
  _tkRO.observe(area);
  resize();

  canvas.addEventListener('mousedown', _tkDown);
  canvas.addEventListener('mousemove', _tkMove);
  canvas.addEventListener('mouseup', _tkUp);
  canvas.addEventListener('mouseleave', _tkUp);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); _tkDown(_tkTouch(e)); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); _tkMove(_tkTouch(e)); }, { passive: false });
  canvas.addEventListener('touchend', e => { e.preventDefault(); _tkUp(_tkTouch(e)); }, { passive: false });
}

// ── Input ──────────────────────────────────────────────────────────
function _tkDown(e) {
  if (_tkAnimating) return;
  const pos = _tkEventPos(e, _tkCanvas);
  const rect = _tkRect(_tkCanvas);
  const norm = _tkC2N(pos.x, pos.y, rect);
  const scene = _tkCurrentScene();
  if (!scene) return;
  const inField = norm.x >= 0 && norm.x <= 1 && norm.y >= 0 && norm.y <= 1;

  if (_tkTool === 'select') {
    const hit = _tkHit(pos, rect, scene);
    _tkSelected = hit;
    if (hit >= 0) {
      _tkDrag = { elemIdx: hit, startX: pos.x, startY: pos.y, origEl: { ...scene.elements[hit] } };
    }
    _tkDrawMain();
    return;
  }

  if (!inField) return;

  if (_tkTool === 'ball') {
    scene.elements.push({ id: _tkId(), type: 'ball', x: norm.x, y: norm.y });
    _tkDirty = true;
    _tkDrawMain(); _tkThumb(_tkSceneIdx);
    return;
  }

  if (_tkTool === 'home' || _tkTool === 'away') {
    const lbl = _tkSquadPick?.label || (_tkTool === 'home' ? 'H' : 'G');
    scene.elements.push({ id: _tkId(), type: 'player', team: _tkTool, x: norm.x, y: norm.y, label: lbl, squadId: _tkSquadPick?.id || null });
    _tkDirty = true;
    _tkDrawMain(); _tkThumb(_tkSceneIdx);
    return;
  }

  if (_tkTool === 'arrow' || _tkTool === 'run') {
    if (!_tkArrowStart) {
      _tkArrowStart = { x: norm.x, y: norm.y };
    } else {
      scene.elements.push({ id: _tkId(), type: _tkTool, x: _tkArrowStart.x, y: _tkArrowStart.y, x2: norm.x, y2: norm.y });
      _tkArrowStart = null;
      _tkDirty = true;
      _tkThumb(_tkSceneIdx);
    }
    _tkDrawMain();
    return;
  }
}

function _tkMove(e) {
  if (_tkAnimating || !_tkDrag) return;
  const pos = _tkEventPos(e, _tkCanvas);
  const rect = _tkRect(_tkCanvas);
  const scene = _tkCurrentScene();
  if (!scene) return;
  const el = scene.elements[_tkDrag.elemIdx];
  if (!el) return;
  const dx = pos.x - _tkDrag.startX, dy = pos.y - _tkDrag.startY;
  const o = _tkDrag.origEl;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  if (el.type === 'arrow' || el.type === 'run') {
    el.x = clamp(o.x + dx / rect.fw); el.y = clamp(o.y + dy / rect.fh);
    el.x2 = clamp(o.x2 + dx / rect.fw); el.y2 = clamp(o.y2 + dy / rect.fh);
  } else {
    el.x = clamp(o.x + dx / rect.fw); el.y = clamp(o.y + dy / rect.fh);
  }
  _tkDirty = true;
  _tkDrawMain();
}

function _tkUp() {
  if (_tkDrag) { _tkDrag = null; _tkThumb(_tkSceneIdx); }
}

function _tkHit(pos, rect, scene) {
  const dpr = window.devicePixelRatio || 1;
  const R = 18 * dpr;
  for (let i = scene.elements.length - 1; i >= 0; i--) {
    const el = scene.elements[i];
    if (el.type === 'arrow' || el.type === 'run') {
      const m = _tkN2C((el.x + el.x2) / 2, (el.y + el.y2) / 2, rect);
      if (Math.hypot(pos.x - m.x, pos.y - m.y) < R) return i;
    } else {
      const p = _tkN2C(el.x, el.y, rect);
      if (Math.hypot(pos.x - p.x, pos.y - p.y) < R) return i;
    }
  }
  return -1;
}

function _tkDelSelected() {
  const scene = _tkCurrentScene();
  if (!scene || _tkSelected === null || _tkSelected < 0) return;
  scene.elements.splice(_tkSelected, 1);
  _tkSelected = null; _tkDirty = true;
  _tkDrawMain(); _tkThumb(_tkSceneIdx);
}

// ── Drawing ─────────────────────────────────────────────────────────
function _tkDrawAll(ctx, canvas, scene, selIdx, alpha) {
  if (!ctx || !canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = _tkRect(canvas);
  const { ox, oy, fw, fh, W, H } = rect;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const ft = _tkCurrent?.fieldType || 'fb-11';
  const isVb = ft.startsWith('vb');
  const isBeach = ft === 'vb-beach';

  // Background
  if (isBeach) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#c4a265'); g.addColorStop(.5, '#d6b878'); g.addColorStop(1, '#c4a265');
    ctx.fillStyle = g;
  } else if (isVb) {
    ctx.fillStyle = '#1a3860';
  } else {
    // Grass checkerboard effect
    ctx.fillStyle = '#2d5a1b'; ctx.fillRect(0, 0, W, H);
    const stripeW = fw / 10;
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = '#2a5518';
        ctx.fillRect(ox + i * stripeW, oy, stripeW, fh);
      }
    }
  }
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.lineWidth = canvas.width > 200 ? 2.5 : 1.5;
  ctx.strokeStyle = isBeach ? '#e53935' : 'rgba(255,255,255,.9)';
  ctx.setLineDash([]);

  if (ft === 'fb-11') _tkFb(ctx, rect, 105, 68, true);
  else if (ft === 'fb-9') _tkFb(ctx, rect, 80, 55, false);
  else if (ft === 'fb-7') _tkFb(ctx, rect, 60, 40, false);
  else if (ft === 'vb-full') _tkVbFull(ctx, rect);
  else if (ft === 'vb-beach') _tkVbBeach(ctx, rect);
  ctx.restore();

  if (scene) {
    scene.elements.forEach((el, i) => {
      _tkEl(ctx, el, rect, i === selIdx, alpha ?? 1);
    });
  }
}

function _tkDrawMain() {
  if (!_tkCanvas || !_tkCtx) return;
  _tkDrawAll(_tkCtx, _tkCanvas, _tkCurrentScene(), _tkSelected);
  // Arrow preview indicator
  if (_tkArrowStart && (_tkTool === 'arrow' || _tkTool === 'run')) {
    const rect = _tkRect(_tkCanvas);
    const p = _tkN2C(_tkArrowStart.x, _tkArrowStart.y, rect);
    const dpr = window.devicePixelRatio || 1;
    _tkCtx.save();
    _tkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    _tkCtx.beginPath();
    _tkCtx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    _tkCtx.strokeStyle = '#f39c12';
    _tkCtx.lineWidth = 2.5;
    _tkCtx.setLineDash([4, 3]);
    _tkCtx.stroke();
    _tkCtx.restore();
  }
}

// ── Field shapes ────────────────────────────────────────────────────
function _tkR(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.stroke(); }
function _tkL(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function _tkC(ctx, cx, cy, r, a0, a1) { ctx.beginPath(); ctx.arc(cx, cy, r, a0 ?? 0, a1 ?? Math.PI * 2); ctx.stroke(); }
function _tkDot(ctx, cx, cy, r) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); }

function _tkFb(ctx, rect, wm, hm, full) {
  const { ox, oy, fw, fh } = rect;
  const sx = fw / wm, sy = fh / hm;
  _tkR(ctx, ox, oy, fw, fh);
  _tkL(ctx, ox + fw / 2, oy, ox + fw / 2, oy + fh);
  _tkDot(ctx, ox + fw / 2, oy + fh / 2, full ? 3 : 2.5);
  if (full) _tkC(ctx, ox + fw / 2, oy + fh / 2, 9.15 * sy);

  const paH = (full ? 40.32 : hm === 55 ? 32 : 24) * sy;
  const paW = (full ? 16.5 : hm === 55 ? 13 : 10) * sx;
  _tkR(ctx, ox, oy + (fh - paH) / 2, paW, paH);
  _tkR(ctx, ox + fw - paW, oy + (fh - paH) / 2, paW, paH);

  const gaH = (full ? 18.32 : hm === 55 ? 14 : 11) * sy;
  const gaW = (full ? 5.5 : 4) * sx;
  _tkR(ctx, ox, oy + (fh - gaH) / 2, gaW, gaH);
  _tkR(ctx, ox + fw - gaW, oy + (fh - gaH) / 2, gaW, gaH);

  const ps = (full ? 11 : 9) * sx;
  _tkDot(ctx, ox + ps, oy + fh / 2, 2.5);
  _tkDot(ctx, ox + fw - ps, oy + fh / 2, 2.5);

  const gw = (full ? 7.32 : hm === 55 ? 6 : 5) * sy;
  const gd = 2.5 * sx;
  ctx.save(); ctx.lineWidth = ctx.lineWidth * 1.1;
  _tkR(ctx, ox - gd, oy + (fh - gw) / 2, gd, gw);
  _tkR(ctx, ox + fw, oy + (fh - gw) / 2, gd, gw);
  ctx.restore();

  const ca = Math.min(sx, sy);
  [[ox, oy, 0, Math.PI / 2], [ox + fw, oy, Math.PI / 2, Math.PI],
    [ox, oy + fh, -Math.PI / 2, 0], [ox + fw, oy + fh, Math.PI, Math.PI * 1.5]
  ].forEach(([x, y, a, b]) => { ctx.beginPath(); ctx.arc(x, y, ca, a, b); ctx.stroke(); });
}

function _tkVbFull(ctx, rect) {
  const { ox, oy, fw, fh } = rect;
  const s = fw / 18;
  _tkR(ctx, ox, oy, fw, fh);
  ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.6)';
  const atk = 3 * s;
  _tkL(ctx, ox + fw / 2 - atk, oy, ox + fw / 2 - atk, oy + fh);
  _tkL(ctx, ox + fw / 2 + atk, oy, ox + fw / 2 + atk, oy + fh);
  ctx.restore();
  ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.95)';
  _tkL(ctx, ox + fw / 2, oy - 6, ox + fw / 2, oy + fh + 6);
  ctx.restore();
}

function _tkVbBeach(ctx, rect) {
  const { ox, oy, fw, fh } = rect;
  _tkR(ctx, ox, oy, fw, fh);
  ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = '#e53935';
  _tkL(ctx, ox + fw / 2, oy - 6, ox + fw / 2, oy + fh + 6);
  ctx.restore();
}

// ── Element drawing ─────────────────────────────────────────────────
function _tkEl(ctx, el, rect, sel, alpha) {
  ctx.save(); ctx.globalAlpha = alpha ?? 1;
  const dpr = window.devicePixelRatio || 1;
  const R = (rect.fw < 100 ? 7 : 13) * (dpr > 1 ? 1 : 1); // smaller in thumbs
  const fontSize = R > 10 ? (el.label?.length > 2 ? 9 : 11) : 7;

  if (el.type === 'player') {
    const p = _tkN2C(el.x, el.y, rect);
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
    ctx.fillStyle = el.team === 'away' ? '#c0392b' : '#1a6ca8';
    ctx.fill();
    if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px "Barlow Condensed",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(el.label || '', p.x, p.y + 0.5);

  } else if (el.type === 'ball') {
    const p = _tkN2C(el.x, el.y, rect);
    const br = R * 0.65;
    ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
    if (sel) { ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2; ctx.stroke(); }

  } else if (el.type === 'arrow' || el.type === 'run') {
    const p1 = _tkN2C(el.x, el.y, rect);
    const p2 = _tkN2C(el.x2, el.y2, rect);
    const isDash = el.type === 'run';
    ctx.strokeStyle = isDash ? '#f1c40f' : 'rgba(255,255,255,.95)';
    ctx.lineWidth = sel ? 2.5 : 1.8;
    if (isDash) ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const hs = Math.max(rect.fw * 0.04, 8);
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x - hs * Math.cos(ang - 0.42), p2.y - hs * Math.sin(ang - 0.42));
    ctx.lineTo(p2.x - hs * Math.cos(ang + 0.42), p2.y - hs * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fillStyle = isDash ? '#f1c40f' : 'rgba(255,255,255,.95)';
    ctx.fill();
  }
  ctx.restore();
}

// ── Scene strip ─────────────────────────────────────────────────────
function _tkRebuildStrip() {
  const thumbs = document.getElementById('tktThumbs');
  if (!thumbs || !_tkCurrent) return;
  thumbs.innerHTML = _tkCurrent.scenes.map((_, i) => `
    <div class="tkt-thumb ${i === _tkSceneIdx ? 'active' : ''}" id="tktThumbWrap${i}" onclick="_tkGoScene(${i})">
      <canvas id="tktThumb${i}" width="72" height="46"></canvas>
      <span class="tkt-thumb-num">${i + 1}</span>
      ${_tkCurrent.scenes.length > 1 ? `<button class="tkt-thumb-del" onclick="event.stopPropagation();_tkDelScene(${i})">×</button>` : ''}
    </div>
  `).join('');
  _tkCurrent.scenes.forEach((_, i) => _tkThumb(i));
}

function _tkThumb(idx) {
  const canvas = document.getElementById('tktThumb' + idx);
  if (!canvas || !_tkCurrent) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 72 * dpr; canvas.height = 46 * dpr;
  canvas.style.width = '72px'; canvas.style.height = '46px';
  const ctx = canvas.getContext('2d');
  _tkDrawAll(ctx, canvas, _tkCurrent.scenes[idx], null, 1);
}

function _tkGoScene(idx) {
  if (!_tkCurrent || idx < 0 || idx >= _tkCurrent.scenes.length) return;
  _tkSceneIdx = idx; _tkSelected = null; _tkArrowStart = null;
  _tkDrawMain();
  document.querySelectorAll('.tkt-thumb').forEach((el, i) => el.classList.toggle('active', i === idx));
}

function _tkAddScene() {
  if (!_tkCurrent) return;
  if (_tkCurrent.scenes.length >= 8) { showToast('Maximal 8 Szenen'); return; }
  const copy = _tkCloneScene(_tkCurrentScene());
  _tkCurrent.scenes.splice(_tkSceneIdx + 1, 0, copy);
  _tkDirty = true;
  _tkSceneIdx++;
  _tkRebuildStrip(); _tkDrawMain();
}

function _tkDelScene(idx) {
  if (!_tkCurrent || _tkCurrent.scenes.length <= 1) return;
  _tkCurrent.scenes.splice(idx, 1);
  _tkDirty = true;
  if (_tkSceneIdx >= _tkCurrent.scenes.length) _tkSceneIdx = _tkCurrent.scenes.length - 1;
  _tkRebuildStrip(); _tkDrawMain();
}

// ── Animation ──────────────────────────────────────────────────────
function _tkPlay() {
  if (_tkAnimating) { _tkStopAnim(); return; }
  if (!_tkCurrent || _tkCurrent.scenes.length < 2) { showToast('Mindestens 2 Szenen nötig'); return; }
  _tkAnimating = true;
  const playIcon = document.getElementById('tktPlayIcon');
  if (playIcon) playIcon.outerHTML = `<svg id="tktPlayIcon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

  const MORPH = 1000, HOLD = 700;
  let sceneA = _tkSceneIdx, t = 0, phase = 'hold';
  let last = null;

  const tick = (ts) => {
    if (!_tkAnimating) return;
    if (!last) last = ts;
    const dt = ts - last; last = ts;
    t += dt;

    const sceneB = (sceneA + 1) % _tkCurrent.scenes.length;

    if (phase === 'hold') {
      _tkDrawAll(_tkCtx, _tkCanvas, _tkCurrent.scenes[sceneA], null, 1);
      if (t >= HOLD) { t = 0; phase = 'morph'; }
    } else {
      const prog = Math.min(t / MORPH, 1);
      const ease = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
      _tkMorph(sceneA, sceneB, ease);
      if (prog >= 1) {
        sceneA = sceneB; t = 0; phase = 'hold';
        _tkSceneIdx = sceneA;
        document.querySelectorAll('.tkt-thumb').forEach((el, i) => el.classList.toggle('active', i === sceneA));
        if (sceneA === 0) { _tkStopAnim(); return; }
      }
    }
    _tkAnimFrame = requestAnimationFrame(tick);
  };
  _tkAnimFrame = requestAnimationFrame(tick);
}

function _tkStopAnim() {
  _tkAnimating = false;
  if (_tkAnimFrame) { cancelAnimationFrame(_tkAnimFrame); _tkAnimFrame = null; }
  const btn = document.getElementById('tktPlayBtn');
  if (btn) btn.innerHTML = `<svg id="tktPlayIcon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21"/></svg>`;
  _tkDrawMain();
}

function _tkMorph(idxA, idxB, t) {
  if (!_tkCtx || !_tkCanvas || !_tkCurrent) return;
  const sA = _tkCurrent.scenes[idxA], sB = _tkCurrent.scenes[idxB];
  _tkDrawAll(_tkCtx, _tkCanvas, { elements: [] }, null, 1);
  const mapA = Object.fromEntries(sA.elements.map(e => [e.id, e]));
  const mapB = Object.fromEntries(sB.elements.map(e => [e.id, e]));
  const ids = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
  const rect = _tkRect(_tkCanvas);
  ids.forEach(id => {
    const a = mapA[id], b = mapB[id];
    if (a && b) {
      const el = { ...a };
      if (el.type !== 'arrow' && el.type !== 'run') {
        el.x = a.x + (b.x - a.x) * t; el.y = a.y + (b.y - a.y) * t;
      } else {
        el.x = a.x + (b.x - a.x) * t; el.y = a.y + (b.y - a.y) * t;
        el.x2 = a.x2 + (b.x2 - a.x2) * t; el.y2 = a.y2 + (b.y2 - a.y2) * t;
      }
      _tkEl(_tkCtx, el, rect, false, 1);
    } else if (a) {
      _tkEl(_tkCtx, a, rect, false, 1 - t);
    } else {
      _tkEl(_tkCtx, b, rect, false, t);
    }
  });
}

// ── Toolbar & misc ─────────────────────────────────────────────────
function _tkSetTool(tool) {
  _tkTool = tool; _tkSquadPick = null; _tkArrowStart = null;
  _tkRefreshToolbar(); _tkDrawMain();
}

function _tkRefreshToolbar() {
  document.querySelectorAll('.tkt-tool').forEach(b => {
    b.classList.toggle('active', (b.dataset.tool || '') === _tkTool);
  });
}

function _tkPlayerPick(team) {
  _tkTool = team; _tkArrowStart = null;
  _tkRefreshToolbar();
  document.getElementById('tktSquadPick')?.remove();
  if (!squad.length) { _tkSquadPick = { id: null, label: team === 'home' ? 'H' : 'G' }; return; }

  const wrap = document.getElementById('tktToolbar');
  if (!wrap) return;
  const pick = document.createElement('div');
  pick.id = 'tktSquadPick'; pick.className = 'tkt-squad-pick';
  pick.innerHTML = `
    <div class="tkt-squad-hd">Spieler</div>
    ${squad.map(p => `
      <div class="tkt-squad-row" onclick="_tkPickPlayer('${p.id}','${escH(String(p.number || '')).replace(/'/g,"\\'")}','${team}')">
        <span class="tkt-squad-no">${p.number || '—'}</span>
        <span>${escH(p.name)}</span>
      </div>`).join('')}
    <div class="tkt-squad-row tkt-squad-gen" onclick="_tkPickGeneric('${team}')">
      <span class="tkt-squad-no">?</span><span>Generisch</span>
    </div>
  `;
  wrap.appendChild(pick);
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!document.getElementById('tktSquadPick')?.contains(e.target) && !e.target.closest('[data-tool]')) {
        document.getElementById('tktSquadPick')?.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 80);
}

function _tkPickPlayer(id, num, team) {
  const p = squad.find(x => x.id === id);
  _tkSquadPick = { id, label: num || (p ? p.name.slice(0, 3) : team[0].toUpperCase()) };
  _tkTool = team;
  document.getElementById('tktSquadPick')?.remove();
}

function _tkPickGeneric(team) {
  const lbl = prompt('Kürzel oder Nummer (max. 3 Zeichen):', team === 'home' ? 'H' : 'G');
  if (!lbl) return;
  _tkSquadPick = { id: null, label: lbl.trim().slice(0, 3) };
  _tkTool = team;
  document.getElementById('tktSquadPick')?.remove();
}

function _tkRename() {
  const name = prompt('Taktik umbenennen:', _tkCurrent?.name || '');
  if (!name?.trim()) return;
  _tkCurrent.name = name.trim(); _tkDirty = true;
  const el = document.getElementById('tktTitle');
  if (el) el.textContent = _tkCurrent.name;
}

function _tkBack() {
  if (_tkAnimating) _tkStopAnim();
  if (_tkDirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
  if (_tkRO) { _tkRO.disconnect(); _tkRO = null; }
  _tkCanvas = null; _tkCtx = null; _tkCurrent = null; _tkDirty = false;
  _tkView = 'list';
  tkLoadTactics().then(() => renderTaktikPage());
}
