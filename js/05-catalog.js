// ══════════════════════════════════════════════════════════════════
// MODUL: ÜBUNGSKATALOG (HANDBOOK)
// ══════════════════════════════════════════════════════════════════
// Enthält: Katalog-Ansicht rendern, Übungen filtern/suchen nach Tag,
// Übungs-Detailansicht, Material-Baukasten, Übung anlegen/bearbeiten/
// löschen (Admin), Materialfeld-Builder.
// ══════════════════════════════════════════════════════════════════
function renderStbar(){
  document.getElementById('stbar').innerHTML=SECS.map((s,i)=>`
    <button class="st ${i===activeSec?'active':''}" style="--sc:${s.color}" onclick="switchSec(${i})">
      <span class="sn">${i+1}</span>${s.name}
    </button>`).join('');
}
function renderPlanCart(){
  const allItems = currentPlan.lanes.flat();
  const secNames = SECS.map(s=>s.name);
  const secColors = SECS.map(s=>s.color);

  if(!allItems.length){
    return`<div class="plan-cart">
      <div class="plan-cart-title">🛒 Trainingsplan</div>
      <div style="font-size:11px;color:var(--text-3);padding:12px 0;text-align:center;font-style:italic;">Noch keine Übungen im Plan.<br>Klicke "+ Plan" auf einer Übung.</div>
    </div>`;
  }

  // Build per-section summary
  const _li=raw=>typeof raw==='string'?{id:raw}:raw;
  const sections = currentPlan.lanes.map((lane, si)=>{
    const exs = lane.map(raw=>{const it=_li(raw);const e=exercises.find(x=>x.id===it.id);return e?{...e,players:it.players??e.players,duration:it.duration??e.duration,difficulty:it.difficulty??e.difficulty}:null;}).filter(Boolean);
    const totalMin = exs.reduce((a,e)=>a+(parseInt(e.duration)||0),0);
    return {si, exs, totalMin, name:secNames[si], color:secColors[si]};
  }).filter(s=>s.exs.length>0);

  const totalMin = sections.reduce((a,s)=>a+s.totalMin,0);

  // Intensity distribution
  const intens = {Leicht:0, Mittel:0, Schwer:0};
  allItems.forEach(raw=>{ const it=_li(raw); const e=exercises.find(x=>x.id===it.id); if(e){const diff=it.difficulty??e.difficulty;const dur=parseInt(it.duration??e.duration)||0;if(diff)intens[diff]=(intens[diff]||0)+dur;} });
  const intensColors = {Leicht:'#1a7f4b', Mittel:'#e65100', Schwer:'#880e4f'};

  const intensBars = Object.entries(intens).filter(([,m])=>m>0).map(([label,min])=>{
    const pct = totalMin>0 ? Math.round(min/totalMin*100) : 0;
    return`<div style="margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
        <span style="font-size:10px;font-weight:700;color:var(--text-2);">${label}</span>
        <span style="font-size:10px;color:var(--text-3);">${min} min · ${pct}%</span>
      </div>
      <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${intensColors[label]};border-radius:3px;transition:width .3s;"></div>
      </div>
    </div>`;
  }).join('');

  const sectionList = sections.map(s=>`
    <div style="margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0;"></div>
        <span style="font-size:10px;font-weight:800;color:var(--text-1);text-transform:uppercase;letter-spacing:.5px;">${s.name}</span>
        <span style="margin-left:auto;font-size:10px;color:var(--text-3);">${s.totalMin>0?s.totalMin+' min':s.exs.length+' Übg.'}</span>
      </div>
      ${s.exs.map(e=>`<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:6px;background:var(--surface-2);margin-bottom:3px;">
        <span style="font-size:10px;color:var(--text-1);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.name}</span>
        ${e.duration?`<span style="font-size:9px;color:var(--text-3);white-space:nowrap;">${e.duration}min</span>`:''}
        <button onclick="removePlanItem('${e.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:10px;padding:0;flex-shrink:0;">✕</button>
      </div>`).join('')}
    </div>`).join('');

  return`<div class="plan-cart">
    <div class="plan-cart-title">🛒 Trainingsplan <span style="font-size:11px;font-weight:600;color:var(--text-3);">(${allItems.length} Übungen${totalMin>0?' · '+totalMin+' min':''})</span></div>
    <div style="margin-bottom:12px;">${sectionList}</div>
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px;">
      <div style="font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--text-3);margin-bottom:8px;">Belastungsverteilung</div>
      ${totalMin>0?intensBars:`<div style="font-size:10px;color:var(--text-3);">Keine Zeitangaben vorhanden</div>`}
    </div>
    <button onclick="goPage('planner')" style="width:100%;margin-top:12px;padding:9px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;">Zum Trainingsplan →</button>
  </div>`;
}

function updatePlanCart(){
  const el=document.getElementById('planCartSidebar');
  if(el) el.innerHTML=renderPlanCart();
}

function removePlanItem(exId){
  const _li=raw=>typeof raw==='string'?{id:raw}:raw;
  currentPlan.lanes=currentPlan.lanes.map(lane=>lane.filter(raw=>_li(raw).id!==exId));
  updatePlanCart();
  renderPlanner();
}

// ── Exercise detail view ──────────────────────────────
function openExDetail(id){
  const e=exercises.find(x=>x.id===id); if(!e)return;
  const s=SECS[e.section]||SECS[0];
  const dc=e.difficulty==='Leicht'?'#1a7f4b':e.difficulty==='Mittel'?'#e65100':'#880e4f';
  const tags=(e.tags||[]).map(t=>`<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;${tagStyle(t)};display:inline-block;margin:2px;">${t}</span>`).join('');
  const matPills=(e.material||'').split(',').filter(Boolean).map(m=>`<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border);display:inline-block;margin:2px;">${m.trim()}</span>`).join('');

  document.getElementById('exDetailBody').innerHTML=`
    <div style="background:linear-gradient(135deg,${s.color}e0,${s.color});padding:16px 20px;margin:-20px -20px 20px;border-radius:8px 8px 0 0;">
      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:4px;">${s.name}</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:900;color:#fff;letter-spacing:.5px;">${e.name}</div>
      ${e.author?`<div style="font-size:10px;color:rgba(255,255,255,.6);margin-top:4px;font-style:italic;">erstellt von ${e.author}</div>`:''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
      ${e.players?`<span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;background:#e8f5e9;color:#1a7f4b;">👥 ${e.players} Spieler</span>`:''}
      ${e.duration?`<span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;background:#e8f0fe;color:#1a56c4;">⏱ ${e.duration} min</span>`:''}
      ${e.difficulty?`<span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;background:${dc}20;color:${dc};">◉ ${e.difficulty}</span>`:''}
    </div>
    ${e.image?`<div style="margin-bottom:16px;border-radius:10px;overflow:hidden;border:1px solid var(--border);cursor:zoom-in;" onclick="openImgLightbox('${e.image}')"><img src="${e.image}" style="width:100%;display:block;max-height:320px;object-fit:cover;"></div>`:''}
    ${e.desc?`<div style="margin-bottom:16px;">
      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--text-3);margin-bottom:6px;">Beschreibung</div>
      <div style="font-size:13px;color:var(--text-1);line-height:1.7;white-space:pre-wrap;">${e.desc}</div>
    </div>`:''}
    ${e.material?`<div style="margin-bottom:16px;">
      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--text-3);margin-bottom:6px;">Material</div>
      <div>${matPills}</div>
    </div>`:''}
    ${tags?`<div style="margin-bottom:16px;">
      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--text-3);margin-bottom:6px;">Tags</div>
      <div>${tags}</div>
    </div>`:''}
    <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border);">
      <button onclick="addToPlanOrPick('${e.id}',${e.section},true)" style="flex:1;padding:12px;background:${s.color};color:#fff;border:none;border-radius:9px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;">+ Zum Plan hinzufügen</button>
      ${IS_ADMIN?`<button onclick="closeMod('exDetailMod');openCatalogFieldEdit('${e.id}')" title="Felddiagramm bearbeiten" style="padding:12px 14px;border:1px solid var(--border);background:none;border-radius:9px;font-size:15px;cursor:pointer;color:var(--text-2);">🎨</button><button onclick="closeMod('exDetailMod');editEx('${e.id}')" title="Übung bearbeiten" style="padding:12px 14px;border:1px solid var(--border);background:none;border-radius:9px;font-size:13px;cursor:pointer;color:var(--text-2);">✏️</button>`:''}
    </div>`;
  openMod('exDetailMod');
}

function switchSec(idx){activeSec=idx;selectedTags=[];activeCluster=null;clusterFilterTags=[];TAG_CLUSTERS=SECTION_CLUSTERS[idx]||SECTION_CLUSTERS[0];document.querySelectorAll('.st').forEach((b,i)=>b.classList.toggle('active',i===idx));renderSection();}

function openDescMod(si){
  descIdx=si;
  document.getElementById('descModTit').textContent='Beschreibung – '+SECS[si].name;
  document.getElementById('descTa').value=sectionDescs[si]||'';
  openMod('descMod');
}
function saveDesc(){
  if(descIdx==null)return;
  sectionDescs[descIdx]=document.getElementById('descTa').value.trim();
  closeMod('descMod');
  save();
  renderSection();
}

function renderSection(){
  const s=SECS[activeSec];const col=s.color;
  const sEx=exercises.filter(e=>e.section===activeSec);
  const q=(document.getElementById(`ss${activeSec}`)||{value:''}).value||'';

  // ── FILTER: cluster (OR) + individual tags (AND) + text ──
  const filtered=sEx.filter(e=>{
    const exTags=(e.tags||[]).map(t=>t.toUpperCase());
    const tm=!q||[e.name,e.desc||'',...exTags].join(' ').toLowerCase().includes(q.toLowerCase());
    // cluster filter: OR — exercise must have AT LEAST ONE tag from cluster
    const cf=clusterFilterTags.length===0||clusterFilterTags.some(t=>exTags.includes(t.toUpperCase()));
    // individual tag filter: AND — exercise must have ALL selected tags
    const tg=selectedTags.length===0||selectedTags.every(t=>exTags.includes(t.toUpperCase()));
    return tm&&cf&&tg;
  });

  // ── BUILD CLUSTER LEGEND from tags that actually exist on exercises in this section ──
  const allTagsInSec=new Set();
  sEx.forEach(e=>(e.tags||[]).forEach(t=>allTagsInSec.add(t.toUpperCase())));
  (sectionCustomTags[activeSec]||[]).forEach(t=>allTagsInSec.add(t.toUpperCase()));

  const clusterCounts={};
  allTagsInSec.forEach(t=>{const cl=getCluster(t,activeSec).name;clusterCounts[cl]=(clusterCounts[cl]||0)+1;});

  const clusterLegend=Object.entries(clusterCounts).filter(([,c])=>c>0).map(([name])=>{
    const cl=(SECTION_CLUSTERS[activeSec]||SECTION_CLUSTERS[0])[name]||(SECTION_CLUSTERS[activeSec]||SECTION_CLUSTERS[0])['SONSTIGE'];
    const isAct=activeCluster===name;
    return`<span class="cpill ${isAct?'act':''}" style="background:${cl.bg};color:${cl.color};" onclick="toggleCluster('${name}')">
      <span class="cd"></span>${name}<span class="cnt">(${clusterCounts[name]})</span>
    </span>`;
  }).join('');

  const desc=sectionDescs[activeSec]||'';
  const allTags=getSecTags(activeSec);

  document.getElementById('scontent').innerHTML=`
  <div style="--sc:${col}">
    <div class="hero" style="background:linear-gradient(135deg,${col}f0,${col})">
      <div class="hero-in">
        <div class="hero-num">${activeSec+1}</div>
        <div class="hero-body">
          <div class="hero-lbl">Abschnitt ${activeSec+1}</div>
          <div class="hero-title">${s.name}</div>
          <div class="hero-desc" id="heroDesc">${desc||'<em style="opacity:.45">Noch kein Text. Admins können diesen über „Bearbeiten" hinzufügen.</em>'}</div>
          <button class="hero-tog" id="heroTog" onclick="toggleDesc()" style="display:none;">▼ Mehr</button>
        </div>
        <button class="hero-edit-btn" onclick="openDescMod(${activeSec})">✏️ Bearbeiten</button>
      </div>
    </div>
    <div class="inner" style="padding-top:0;">
      ${clusterLegend?`<div class="cleg">
        <span class="cleg-t">Kategorien:</span>
        ${clusterLegend}
        ${activeCluster?`<span onclick="toggleCluster(null)" style="font-size:10px;font-weight:700;color:var(--gm);cursor:pointer;margin-left:2px;">✕ Alle</span>`:''}
        ${IS_ADMIN?`<button class="cpill-edit" onclick="openTagMod(${activeSec})">+ Verwalten</button>`:''}
      </div>`:''}
      <div id="catalogLayout" style="display:grid;grid-template-columns:${window.innerWidth<=767?'1fr':'1fr 280px'};gap:16px;align-items:start;">
        <div>
          <div class="fbar">
            <div class="ftop">
              <input class="fin" id="ss${activeSec}" type="text" placeholder="In ${s.name} suchen…" value="${q}" oninput="renderSection()">
              <button class="gbtn" onclick="selectedTags=[];activeCluster=null;clusterFilterTags=[];renderSection()">✕ Reset</button>
              ${IS_ADMIN?`<button class="gbtn" onclick="openNewEx(${activeSec})">+ Übung</button><button class="gbtn" onclick="openTagMod(${activeSec})">Tags</button>`:''}
            </div>
            <div class="tagrow">
              <span class="tlbl">Tags:</span>
              ${allTags.map(t=>{const sel=selectedTags.map(x=>x.toUpperCase()).includes(t.toUpperCase());
                return`<span class="tchip ${sel?'sel':''}" style="${tagStyle(t,sel)}" onclick="toggleTag('${t}')">${t}</span>`;
              }).join('')}
              ${!allTags.length?'<span style="font-size:10px;color:var(--gm);">Noch keine Tags</span>':''}
            </div>
          </div>
          <div style="font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--gm);margin-bottom:11px;">${filtered.length} von ${sEx.length} Übungen</div>
          <div class="exgrid">
            ${filtered.length===0
              ?`<div class="empty-grid"><div class="ei">⚽</div><h3>Keine Übungen gefunden</h3><p>${IS_ADMIN?'Über „+ Übung" hinzufügen.':'Filter anpassen.'}</p></div>`
              :filtered.map(e=>cardHTML(e,col)).join('')
            }
          </div>
        </div>
        <div id="planCartSidebar" style="position:sticky;top:calc(var(--header-h) + var(--nav-h) + 52px);">
          ${renderPlanCart()}
        </div>
      </div>
    </div>
  </div>`;

  document.querySelectorAll('.card[data-id]').forEach(c=>{
    c.setAttribute('draggable','true');
    c.addEventListener('dragstart',e=>{dragItem={exerciseId:c.dataset.id};c.classList.add('dragging');e.dataTransfer.effectAllowed='copy';});
    c.addEventListener('dragend',()=>c.classList.remove('dragging'));
  });
  requestAnimationFrame(()=>{ checkHeroDesc(); document.fonts.ready.then(checkHeroDesc); });
  save();
}

function checkHeroDesc(){
  const d=document.getElementById('heroDesc');
  const btn=document.getElementById('heroTog');
  if(!d||!btn) return;
  // Temporarily remove collapse to measure true height
  d.classList.remove('collapsed','expanded');
  d.style.maxHeight='';
  const fullH=d.scrollHeight;
  if(fullH>66){
    d.classList.add('collapsed');
    btn.style.display='inline-flex';
  } else {
    btn.style.display='none';
  }
}

function toggleDesc(){
  const d=document.getElementById('heroDesc');const t=document.getElementById('heroTog');
  if(!d||!t)return;
  const exp=d.classList.contains('expanded');
  d.classList.toggle('collapsed',exp);d.classList.toggle('expanded',!exp);
  t.textContent=exp?'▼ Mehr':'▲ Weniger';
}

// ── CLUSTER TOGGLE — filter by tags that exist on exercises ──
function toggleCluster(name){
  if(activeCluster===name){activeCluster=null;clusterFilterTags=[];}
  else{
    activeCluster=name;
    if(name){
      const sc=SECTION_CLUSTERS[activeSec]||SECTION_CLUSTERS[0];
      const cl=sc[name]||sc['SONSTIGE'];
      const clTagsUpper=cl.tags.map(t=>t.toUpperCase());
      const secTags=getSecTags(activeSec);
      if(name==='SONSTIGE'){
        const allClusterTags=new Set();
        Object.entries(sc).forEach(([n,c])=>{if(n!=='SONSTIGE')c.tags.forEach(t=>allClusterTags.add(t.toUpperCase()));});
        clusterFilterTags=secTags.filter(t=>!allClusterTags.has(t.toUpperCase()));
      } else {
        clusterFilterTags=secTags.filter(t=>clTagsUpper.includes(t.toUpperCase()));
      }
    } else {clusterFilterTags=[];}
  }
  renderSection();
}

function getSecTags(idx){
  const s=new Set();
  exercises.filter(e=>e.section===idx).forEach(e=>(e.tags||[]).forEach(t=>s.add(t.toUpperCase())));
  (sectionCustomTags[idx]||[]).forEach(t=>s.add(t.toUpperCase()));
  return[...s].sort();
}
function toggleTag(tag){
  const tu=tag.toUpperCase();
  const existing=selectedTags.map(t=>t.toUpperCase());
  if(existing.includes(tu)){selectedTags=selectedTags.filter(t=>t.toUpperCase()!==tu);}
  else{selectedTags=[...selectedTags,tu];}
  activeCluster=null;clusterFilterTags=[];renderSection();
}
function filterByTag(tag){if(!selectedTags.map(t=>t.toUpperCase()).includes(tag.toUpperCase()))selectedTags=[...selectedTags,tag.toUpperCase()];renderSection();}

function cardHTML(e,col){
  const dc=e.difficulty==='Leicht'?'dl':e.difficulty==='Mittel'?'dm':e.difficulty==='Schwer'?'ds':'';
  const mats=e.material?e.material.split(',').map(m=>`<span class="matpill">${m.trim()}</span>`).join(''):'';
  const tags=(e.tags||[]).map(t=>`<span class="ctag" style="${tagStyle(t)}" onclick="event.stopPropagation();filterByTag('${t}')">${t}</span>`).join('');
  const authorLine = e.author ? `<div class="card-author">erstellt von ${e.author}</div>` : '';
  const imgHtml = e.image
    ? `<img src="${e.image}" alt="${e.name}">`
    : `<div class="cimg-field"><div class="cimg-field-lines"></div><div class="cimg-ico">⚽</div></div>`;
  return`<div class="card" data-id="${e.id}" onclick="openExDetail('${e.id}')">
    <div class="dh" onclick="event.stopPropagation()">⠿</div>
    <div class="cimg">${imgHtml}</div>
    <div class="cbody">
      ${authorLine}
      <div class="cname">${e.name}</div>
      <div class="cmeta">
        ${e.players?`<span class="mbadge p">👥 ${e.players}</span>`:''}
        ${e.difficulty?`<span class="mbadge ${dc}">${e.difficulty}</span>`:''}
        ${e.duration?`<span class="mbadge" style="background:#e8f0fe;color:#1a56c4;">⏱ ${e.duration} min</span>`:''}
      </div>
      ${mats?`<div class="matlist">${mats}</div>`:''}
      ${e.desc?`<div class="cdesc">${e.desc.length>110?e.desc.slice(0,110)+'…':e.desc}</div>`:''}
      <div class="ctags">${tags}</div>
      <div class="cfoot" onclick="event.stopPropagation()">
        <button class="bcrd ap" style="background:${col}" onclick="addToPlanOrPick('${e.id}',${e.section},false)">+ Plan</button>
        ${IS_ADMIN?`<button class="bcrd" onclick="editEx('${e.id}')">✏️</button><button class="bcrd rd" onclick="delEx('${e.id}')">🗑</button>`:''}
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
// MATERIAL BUILDER
// ══════════════════════════════════════════════════════
function updateMatField(){
  const sels=document.querySelectorAll('.mat-sel');
  const counted=[];
  sels.forEach(s=>{const v=parseInt(s.value)||0;if(v>0)counted.push(v+'x '+s.dataset.mat);});
  const free=(document.getElementById('mMatFree')||{value:''}).value.trim();
  const parts=[...counted];
  if(free)parts.push(...free.split(',').map(x=>x.trim()).filter(Boolean));
  const f=document.getElementById('mMat');if(f)f.value=parts.join(', ');
}
function loadMatIntoBuilder(matStr){
  // reset all selects
  document.querySelectorAll('.mat-sel').forEach(s=>{s.value='0';});
  if(!matStr){if(document.getElementById('mMatFree'))document.getElementById('mMatFree').value='';return;}
  const COUNTED_MATS=['Minitore','Stangen','Jugendtore','Rebounder','Hürden','Ringe','Koordinationsleiter'];
  const parts=matStr.split(',').map(x=>x.trim()).filter(Boolean);
  const freeItems=[];
  parts.forEach(p=>{
    // match "Nx Name" pattern
    const m=p.match(/^(\d+)x?\s+(.+)$/i);
    if(m){const num=m[1];const name=m[2].trim();
      const sel=document.querySelector(`.mat-sel[data-mat="${name}"]`);
      if(sel){sel.value=num;return;}
    }
    // check if it's a counted mat without number
    const sel=COUNTED_MATS.find(cm=>p.toLowerCase().includes(cm.toLowerCase()));
    if(sel){const s=document.querySelector(`.mat-sel[data-mat="${sel}"]`);if(s&&s.value==='0')s.value='1';return;}
    freeItems.push(p);
  });
  if(document.getElementById('mMatFree'))document.getElementById('mMatFree').value=freeItems.join(', ');
}

// ══════════════════════════════════════════════════════
// EXERCISE CRUD
// ══════════════════════════════════════════════════════
function openImgLightbox(src){const lb=document.getElementById('imgLightbox');const img=document.getElementById('imgLightboxImg');if(!lb||!img)return;img.src=src;lb.style.display='flex';}
function closeImgLightbox(){const lb=document.getElementById('imgLightbox');if(lb)lb.style.display='none';}
function openNewEx(si){if(!IS_ADMIN)return;editingId=null;formTags=[];formImg=null;canvasObjects=[];playerCounters={};undoStack=[];selectedObjIdx=null;selectedIndices=[];['mName','mPl','mMat','mTagIn','mMatFree'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.querySelectorAll('.mat-sel').forEach(s=>s.value='0');document.getElementById('mDesc').value='';document.getElementById('mDif').value='';if(document.getElementById('mDur'))document.getElementById('mDur').value='';document.getElementById('mSec').value=si||activeSec;document.getElementById('mId').value='';document.getElementById('mTit').textContent='Neue Übung';document.getElementById('mIco').style.background=SECS[si||activeSec].color+'22';renderIZ();renderMTags();openMod('exMod');}
function editEx(id){if(!IS_ADMIN)return;const e=exercises.find(x=>x.id===id);if(!e)return;editingId=e.id;formTags=[...(e.tags||[]).map(t=>t.toUpperCase())];formImg=e.image||null;document.getElementById('mName').value=e.name;document.getElementById('mPl').value=e.players||'';document.getElementById('mDesc').value=e.desc||'';document.getElementById('mDif').value=e.difficulty||'';if(document.getElementById('mDur'))document.getElementById('mDur').value=e.duration||'';loadMatIntoBuilder(e.material||'');document.getElementById('mSec').value=e.section||0;document.getElementById('mId').value=e.id;document.getElementById('mTit').textContent='Übung bearbeiten';renderIZ();renderMTags();openMod('exMod');
  // Restore canvas objects if saved
  if(e.canvasObjects&&e.canvasObjects.length){
    setTimeout(()=>{canvasObjects=JSON.parse(JSON.stringify(e.canvasObjects));redraw();},120);
  }
}
function saveEx(){
  const name=document.getElementById('mName').value.trim();if(!name){showToast('Bitte Name eingeben','err');return;}
  const si=parseInt(document.getElementById('mSec').value);
  // Auto-export canvas diagram as PNG if canvas has objects and no manual image
  if(!formImg && canvasObjects.length>0){
    const c=document.getElementById('feldCanvas');
    if(c) formImg=c.toDataURL('image/png');
  }
  updateMatField();const ex={id:editingId||uid(),name,players:document.getElementById('mPl').value.trim(),material:document.getElementById('mMat').value.trim(),section:si,difficulty:document.getElementById('mDif').value,duration:document.getElementById('mDur')?parseInt(document.getElementById('mDur').value)||null:null,desc:document.getElementById('mDesc').value.trim(),tags:[...formTags],image:formImg,canvasObjects:[...canvasObjects]};
  if(editingId)exercises=exercises.map(e=>e.id===editingId?ex:e);else exercises.push(ex);
  save();activeSec=si;renderStbar();renderSection();closeMod('exMod');showToast(editingId?'Übung aktualisiert':'Übung gespeichert');
  // Persist changes to Supabase so they survive a reload
  if(editingId&&_supabase&&apiOnline){
    _supabase.from('exercises').update({
      name:ex.name,players:ex.players,material:ex.material,section:ex.section,
      difficulty:ex.difficulty,duration:ex.duration,description:ex.desc,tags:ex.tags
    }).eq('id',editingId);
  }
}
async function delEx(id){
  if(!IS_ADMIN||!confirm('Übung in den Papierkorb verschieben?'))return;
  if(_supabase&&apiOnline){
    const{error}=await _supabase.from('exercises').update({status:'deleted'}).eq('id',id);
    if(error){showToast('Löschen fehlgeschlagen','err');return;}
  }
  exercises=exercises.filter(e=>e.id!==id);
  const _li=raw=>typeof raw==='string'?{id:raw}:raw;
  currentPlan.lanes=currentPlan.lanes.map(l=>l.filter(raw=>_li(raw).id!==id));
  save();renderSection();showToast('In Papierkorb verschoben');
}
async function restoreEx(id){
  const{error}=await _supabase.from('exercises').update({status:'approved'}).eq('id',id);
  if(error){showToast('Fehler beim Wiederherstellen','err');return;}
  showToast('Übung wiederhergestellt');
  await loadTrash();renderTrash();
  const ok=await loadAPI();if(ok)renderSection();
}
async function permDeleteEx(id){
  if(!confirm('Übung endgültig löschen? Das kann nicht rückgängig gemacht werden.'))return;
  const{error}=await _supabase.from('exercises').delete().eq('id',id);
  if(error){showToast('Fehler','err');return;}
  showToast('Endgültig gelöscht');
  await loadTrash();renderTrash();
}
let trashItems=[];
async function loadTrash(){
  if(!_supabase||!IS_ADMIN){trashItems=[];return;}
  const{data}=await _supabase.from('exercises').select('*').eq('status','deleted');
  trashItems=(data||[]).map(e=>({id:e.id,name:e.name,section:e.section,players:e.players,difficulty:e.difficulty,image:e.image}));
}
async function openTrash(){
  await loadTrash();renderTrash();openMod('trashMod');
}
function renderTrash(){
  const el=document.getElementById('trashList');if(!el)return;
  if(!trashItems.length){el.innerHTML='<div style="font-size:13px;color:var(--text-3);padding:16px 0;text-align:center;">Papierkorb ist leer.</div>';return;}
  el.innerHTML=trashItems.map(e=>`
    <div class="trash-item">
      <div class="trash-thumb">${e.image?`<img src="${e.image}" style="width:100%;height:100%;object-fit:cover;">`:'⚽'}</div>
      <div class="trash-info">
        <div class="trash-name">${e.name}</div>
        <div class="trash-meta">${SECS[e.section]?.name||''} · ${e.players||''} · ${e.difficulty||''}</div>
      </div>
      <div class="trash-actions">
        <button class="trash-btn restore" onclick="restoreEx('${e.id}')">↩ Wiederherstellen</button>
        <button class="trash-btn perm" onclick="permDeleteEx('${e.id}')">🗑 Endgültig löschen</button>
      </div>
    </div>`).join('');
}
function addMTag(){const v=document.getElementById('mTagIn').value.trim().toUpperCase();if(v&&!formTags.includes(v)){formTags.push(v);renderMTags();}document.getElementById('mTagIn').value='';}
function removeMTag(t){formTags=formTags.filter(x=>x!==t);renderMTags();}
function renderMTags(){
  document.getElementById('mAtags').innerHTML=formTags.map(t=>`<span class="atag" style="${tagStyle(t)}">${t}<button onclick="removeMTag('${t}')" style="color:inherit;">×</button></span>`).join('');
  const si=parseInt(document.getElementById('mSec').value||activeSec);
  const sug=getSecTags(si).filter(t=>!formTags.includes(t));
  document.getElementById('mStags').innerHTML=sug.length?'<span style="font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--gm);margin-right:3px;">Vorhandene:</span>'+sug.map(t=>`<span class="ctag" style="${tagStyle(t)};cursor:pointer" onclick="addSugTag('${t}')">${t}</span>`).join(''):'';
}
function addSugTag(t){if(!formTags.includes(t)){formTags.push(t);renderMTags();}}
function handleImg(){} // removed
function renderIZ(){} // no image upload
// iz removed
// iz listeners removed

// ── Sondertraining: Abschnitt wählen beim Hinzufügen zum Plan ──
let _pendingSonderExId = null;

function addToPlanOrPick(id, fromSec, closeDetailFirst) {
  if (fromSec === 5) {
    _pendingSonderExId = id;
    if (closeDetailFirst) closeMod('exDetailMod');
    // Render section buttons (only sections 0–4)
    document.getElementById('sectionPickBtns').innerHTML = SECS.slice(0,5).map((s,i) =>
      `<button onclick="confirmSectionPick(${i})" style="display:flex;align-items:center;gap:12px;padding:13px 16px;background:var(--surface-2);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--text-1);text-align:left;">
        <span style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0;display:inline-block;"></span>
        ${i+1}. ${s.name}
      </button>`
    ).join('');
    openMod('sectionPickMod');
  } else {
    addToPlan(id, fromSec);
    updatePlanCart();
  }
}

function confirmSectionPick(targetSec) {
  if (_pendingSonderExId !== null) {
    addToPlan(_pendingSonderExId, targetSec);
    updatePlanCart();
    _pendingSonderExId = null;
  }
  closeMod('sectionPickMod');
}

function openCatalogFieldEdit(id){
  if(!IS_ADMIN) return;
  const e=exercises.find(x=>x.id===id); if(!e) return;
  _catalogEditExId=id;
  // Load existing canvas objects if present
  if(e.canvasObjects&&e.canvasObjects.length){
    canvasObjects=JSON.parse(JSON.stringify(e.canvasObjects));
  } else {
    canvasObjects=[];
  }
  playerCounters={}; undoStack=[]; selectedObjIdx=null; selectedIndices=[];
  openFieldOverlay('catalog-edit');
}

