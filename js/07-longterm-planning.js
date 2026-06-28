// ══════════════════════════════════════════════════════════════════
// MODUL: LANGZEITPLANUNG (PERIODISIERUNG)
// ══════════════════════════════════════════════════════════════════
// Enthält: Trainingsblöcke über mehrere Wochen, Block-Bibliothek,
// Wochen-/Tages-Editor, CSV Im-/Export, IT-Dokumentation-Download.
// ══════════════════════════════════════════════════════════════════
let blockLibrary = [];
let activeLtpTab = 0;
let currentBlockId = null; // which block's day editor is open
let currentWeekIdx = null;
let currentDayIdx = null;
let dayEditorEntries = []; // working copy of entries for day editor
let editingEntryIdx = null; // which entry in dayEditorEntries is being edited
let nbMode = 'weeks'; // 'weeks' or 'dates'
let editingBlockLibId = null;
let ltpEditWeekIdx = null;
let ltpEditBlockId = null;

// ── DATA MODEL ──
// ltpBlocks = array of blocks:
// { id, name, notes, startDate, endDate, weeks: [ { id, label, focus, notes, days: [ { id, date?, entries: [...] } ] } ] }
// entry: { id, type:'training'|'free'|'game', title, startTime, endTime, planId?, color?, notes?, tags? }

function defaultLtp(){ return []; }

function makeFreshBlock(name, numWeeks, notes, startDate){
  const weeks = [];
  for(let i=0;i<numWeeks;i++){
    let label = 'Woche '+(i+1);
    if(startDate){
      const d = new Date(startDate);
      d.setDate(d.getDate() + i*7);
      const kw = getISOWeek(d);
      label = 'KW '+kw;
    }
    weeks.push({id:uid(), label, focus:'', notes:'', days:[]});
  }
  return {id:uid(), name, notes, startDate, weeks, createdAt:new Date().toLocaleDateString('de-DE')};
}

function getISOWeek(d){
  const date = new Date(d);
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - (date.getDay()+6)%7);
  const week1 = new Date(date.getFullYear(),0,4);
  return 1 + Math.round(((date.getTime()-week1.getTime())/86400000 - 3 + (week1.getDay()+6)%7)/7);
}

// ── TABS ──
function switchLtpTab(idx){
  activeLtpTab=idx;
  document.getElementById('ltpView0').style.display=idx===0?'block':'none';
  document.getElementById('ltpView1').style.display=idx===1?'block':'none';
  document.querySelectorAll('#ltpTab0,#ltpTab1').forEach((b,i)=>b.classList.toggle('active',i===idx));
  if(idx===1) renderLibrary();
}

// ── RENDER ACTIVE BLOCKS ──
function renderLtp(){
  // Ensure active tab is shown
  const v0=document.getElementById('ltpView0');
  const v1=document.getElementById('ltpView1');
  if(v0) v0.style.display='block';
  if(v1) v1.style.display='none';
  document.getElementById('ltpTab0')?.classList.add('active');
  document.getElementById('ltpTab1')?.classList.remove('active');
  activeLtpTab=0;

  const el=document.getElementById('ltpBlockList'); if(!el)return;

  // Filter out old-format blocks (without .weeks array)
  if(ltpBlocks && ltpBlocks.length){
    ltpBlocks = ltpBlocks.filter(b=>b.weeks && Array.isArray(b.weeks));
  }

  if(!ltpBlocks||!ltpBlocks.length){
    el.innerHTML=`<div style="text-align:center;padding:60px 20px;color:var(--text-3);">
      <div style="font-size:48px;margin-bottom:12px;">📅</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900;margin-bottom:8px;">Noch kein Block erstellt</div>
      <div style="font-size:13px;margin-bottom:20px;">Klicke auf "+ Neuer Block" um zu starten.</div>
    </div>`;
    return;
  }
  el.innerHTML = ltpBlocks.map((blk,bi)=>renderBlockCard(blk,bi)).join('');
}

function renderBlockCard(blk,bi){
  const totalDays = blk.weeks.reduce((a,w)=>a+w.days.length,0);
  const totalEntries = blk.weeks.reduce((a,w)=>a+w.days.reduce((b,d)=>b+(d.entries||[]).length,0),0);
  return `<div class="ltp-block-card" id="blkcard-${blk.id}">
    <div class="ltp-block-hdr">
      <div class="ltp-block-hdr-left">
        <div class="ltp-block-title">${blk.name}</div>
        <div class="ltp-block-meta">${blk.weeks.length} Wochen · ${totalDays} Tage · ${totalEntries} Einheiten${blk.startDate?' · ab '+new Date(blk.startDate).toLocaleDateString('de-DE'):''}</div>
        ${blk.notes?`<div class="ltp-block-notes">${blk.notes}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
        <button onclick="openSaveBlockLib('${blk.id}')" style="padding:5px 10px;font-size:10px;font-weight:800;border:1px solid var(--border);background:var(--surface-2);border-radius:6px;cursor:pointer;color:var(--text-2);">💾 Bibliothek</button>
        <button onclick="deleteActiveBlock('${blk.id}')" style="padding:5px 8px;font-size:10px;border:1px solid var(--border);background:none;border-radius:6px;cursor:pointer;color:#880e4f;">✕</button>
      </div>
    </div>
    <div class="ltp-weeks-wrap">
      ${blk.weeks.map((w,wi)=>renderWeekRow(blk.id,w,wi)).join('')}
      <button onclick="addWeekToBlock('${blk.id}')" class="ltp-add-week-btn">+ Woche hinzufügen</button>
    </div>
  </div>`;
}

function renderWeekRow(blockId, week, wi){
  const blk = ltpBlocks.find(b=>b.id===blockId);
  return `<div class="ltp-week-row">
    <div class="ltp-week-row-hdr">
      <div class="ltp-week-badge">${wi+1}</div>
      <div class="ltp-week-row-info">
        <span class="ltp-week-row-label">${week.label||'Woche '+(wi+1)}</span>
        ${week.focus?`<span class="ltp-week-row-focus">${week.focus}</span>`:''}
      </div>
      <div style="margin-left:auto;display:flex;gap:5px;">
        <button onclick="openWeekEdit('${blockId}',${wi})" style="padding:4px 8px;font-size:10px;font-weight:700;border:1px solid var(--border);background:var(--surface-2);border-radius:5px;cursor:pointer;color:var(--text-2);">✏️ Woche</button>
        <button onclick="printLtpWeek('${blockId}',${wi})" style="padding:4px 8px;font-size:10px;font-weight:700;border:none;background:#1565c0;color:#fff;border-radius:5px;cursor:pointer;">Woche drucken</button>
        <button onclick="addDayToWeek('${blockId}',${wi})" style="padding:4px 8px;font-size:10px;font-weight:800;border:none;background:var(--accent);color:#fff;border-radius:5px;cursor:pointer;">+ Tag</button>
        <button onclick="deleteWeek('${blockId}',${wi})" style="padding:4px 6px;font-size:10px;border:1px solid var(--border);background:none;border-radius:5px;cursor:pointer;color:var(--text-3);">✕</button>
      </div>
    </div>
    <div class="ltp-days-row">
      ${(week.days||[]).map((day,di)=>renderDayCard(blockId,wi,day,di)).join('')}
      ${!week.days.length?`<div style="font-size:11px;color:var(--text-3);padding:12px;font-style:italic;">Noch keine Tage — klicke "+ Tag"</div>`:''}
    </div>
  </div>`;
}

function renderDayCard(blockId,wi,day,di){
  const entries = day.entries||[];
  const entryColors = {training:'#1a7f4b',free:'#1565c0',game:'#e65100'};
  const entryIcos = {training:'⚽',free:'☕',game:'🏆'};
  return `<div class="ltp-day-card" onclick="openDayEditor('${blockId}',${wi},${di})">
    <div class="ltp-day-card-hdr">
      <span class="ltp-day-card-label">${day.label||'Tag '+(di+1)}</span>
      <div style="display:flex;gap:3px;">
        <button onclick="event.stopPropagation();printLtpDay('${blockId}',${wi},${di})" style="background:#1565c0;border:none;cursor:pointer;color:#fff;font-size:9px;padding:2px 6px;border-radius:4px;font-weight:800;">Drucken</button>
        <button onclick="event.stopPropagation();deleteDay('${blockId}',${wi},${di})" style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:11px;padding:0 2px;">✕</button>
      </div>
    </div>
    ${entries.length
      ? entries.slice(0,3).map(e=>`<div class="ltp-entry-pill" style="background:${entryColors[e.type]||'#666'}20;border-left:3px solid ${entryColors[e.type]||'#666'};">
          <span style="font-size:9px;">${entryIcos[e.type]||'•'}</span>
          <span class="ltp-entry-pill-title">${e.title||e.type}</span>
          ${e.startTime?`<span class="ltp-entry-pill-time">${e.startTime}</span>`:''}
        </div>`).join('')
      : `<div style="font-size:10px;color:var(--text-3);padding:6px 0;font-style:italic;">Tippen zum Füllen</div>`
    }
    ${entries.length>3?`<div style="font-size:9px;color:var(--text-3);">+${entries.length-3} weitere</div>`:''}
  </div>`;
}

// ── NEW BLOCK WIZARD ──
function openNewBlockWizard(){
  document.getElementById('nb-name').value='';
  document.getElementById('nb-notes').value='';
  document.getElementById('nb-weeks').value=4;
  setNbMode('weeks');
  openMod('newBlockMod');
  setTimeout(()=>document.getElementById('nb-name').focus(),100);
}

function setNbMode(mode){
  nbMode=mode;
  document.getElementById('nb-weeks-wrap').style.display=mode==='weeks'?'block':'none';
  document.getElementById('nb-dates-wrap').style.display=mode==='dates'?'block':'none';
  const wBtn=document.getElementById('nb-mode-weeks'), dBtn=document.getElementById('nb-mode-dates');
  wBtn.style.background=mode==='weeks'?'var(--accent)':'var(--surface-2)';
  wBtn.style.color=mode==='weeks'?'#fff':'var(--text-2)';
  wBtn.style.borderColor=mode==='weeks'?'var(--accent)':'var(--border)';
  dBtn.style.background=mode==='dates'?'var(--accent)':'var(--surface-2)';
  dBtn.style.color=mode==='dates'?'#fff':'var(--text-2)';
  dBtn.style.borderColor=mode==='dates'?'var(--accent)':'var(--border)';
}

function createNewBlock(){
  try {
  const name=(document.getElementById('nb-name').value||'').trim();
  if(!name){showToast('Bitte Namen eingeben','err');return;}
  let numWeeks=4, startDate='';
  if(nbMode==='weeks'){
    numWeeks=parseInt(document.getElementById('nb-weeks').value)||4;
  } else {
    const from=document.getElementById('nb-from').value;
    const to=document.getElementById('nb-to').value;
    if(!from||!to){showToast('Bitte Zeitraum angeben','err');return;}
    startDate=from;
    const diff=Math.ceil((new Date(to)-new Date(from))/(7*24*3600*1000));
    numWeeks=Math.max(1,diff);
  }
  const notes=(document.getElementById('nb-notes').value||'').trim();
  const block=makeFreshBlock(name,numWeeks,notes,startDate);
  if(!ltpBlocks) ltpBlocks=[];
  ltpBlocks.unshift(block);
  save();
  closeMod('newBlockMod');
  goPage('longterm');
  setTimeout(()=>{ renderLtp(); showToast('Block erstellt – Wochen und Tage jetzt füllen'); }, 50);
  } catch(err) {
    showToast('Fehler: '+err.message, 'err');
    console.error('createNewBlock error:', err);
    alert('Fehler beim Erstellen: ' + err.message + '\n\n' + err.stack);
  }
}

// ── WEEK MANAGEMENT ──
function openWeekEdit(blockId, wi){
  ltpEditBlockId=blockId; ltpEditWeekIdx=wi;
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  const week=blk.weeks[wi];
  document.getElementById('ltpWeekModTit').textContent='Woche '+(wi+1)+' bearbeiten';
  document.getElementById('ltpWLabel').value=week.label||'';
  document.getElementById('ltpWFocus').value=week.focus||'';
  document.getElementById('ltpWNotes').value=week.notes||'';
  // Copy from another week
  const otherWeeks=blk.weeks.map((w,i)=>i!==wi?`<option value="${i}">Woche ${i+1}: ${w.label||''}</option>`:'').filter(Boolean).join('');
  document.getElementById('ltpWeekCopyWrap').innerHTML=otherWeeks?`
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
      <select class="fc" id="copyWeekSrc" style="flex:1;font-size:12px;">${otherWeeks}</select>
      <button onclick="copyWeek()" style="padding:7px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:7px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;">Woche übernehmen</button>
    </div>`:'';
  openMod('ltpWeekMod');
}

function saveLtpWeek(){
  const blk=ltpBlocks.find(b=>b.id===ltpEditBlockId); if(!blk)return;
  blk.weeks[ltpEditWeekIdx].label=document.getElementById('ltpWLabel').value.trim();
  blk.weeks[ltpEditWeekIdx].focus=document.getElementById('ltpWFocus').value.trim();
  blk.weeks[ltpEditWeekIdx].notes=document.getElementById('ltpWNotes').value.trim();
  save(); renderLtp(); closeMod('ltpWeekMod'); showToast('Woche gespeichert');
}

function copyWeek(){
  const blk=ltpBlocks.find(b=>b.id===ltpEditBlockId); if(!blk)return;
  const srcIdx=parseInt(document.getElementById('copyWeekSrc').value);
  const src=blk.weeks[srcIdx];
  blk.weeks[ltpEditWeekIdx].days=JSON.parse(JSON.stringify(src.days));
  blk.weeks[ltpEditWeekIdx].focus=src.focus;
  blk.weeks[ltpEditWeekIdx].notes=src.notes;
  save(); renderLtp(); closeMod('ltpWeekMod'); showToast('Woche übernommen');
}

function addWeekToBlock(blockId){
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  blk.weeks.push({id:uid(),label:'Woche '+(blk.weeks.length+1),focus:'',notes:'',days:[]});
  save(); renderLtp();
}

function deleteWeek(blockId,wi){
  if(!confirm('Woche löschen?'))return;
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  blk.weeks.splice(wi,1); save(); renderLtp();
}

function deleteActiveBlock(blockId){
  if(!confirm('Block löschen?'))return;
  ltpBlocks=ltpBlocks.filter(b=>b.id!==blockId); save(); renderLtp();
}

// ── DAY MANAGEMENT ──
function addDayToWeek(blockId,wi){
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  const week=blk.weeks[wi];
  const dayNames=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
  // Show day picker inline
  const existing=week.days.map(d=>d.label);
  const available=dayNames.filter(d=>!existing.includes(d));
  // Build quick-picker
  const picker=document.createElement('div');
  picker.id='dayPicker-'+blockId+'-'+wi;
  picker.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.3);min-width:260px;';
  picker.innerHTML=`<div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;margin-bottom:12px;color:var(--text-1);">Tag auswählen</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">
      ${dayNames.map(d=>`<button onclick="pickDay('${blockId}',${wi},'${d}',this.closest('[id]'))" style="padding:9px;border-radius:7px;border:1px solid var(--border);background:${existing.includes(d)?'var(--surface-2)':'var(--surface)'};color:${existing.includes(d)?'var(--text-3)':'var(--text-1)'};font-weight:700;font-size:12px;cursor:pointer;">${d}</button>`).join('')}
    </div>
    <button onclick="this.parentElement.remove()" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:7px;background:none;cursor:pointer;font-size:12px;color:var(--text-2);">Abbrechen</button>`;
  // Add backdrop
  const bd=document.createElement('div');
  bd.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9998;';
  bd.onclick=()=>{picker.remove();bd.remove();};
  document.body.appendChild(bd);
  document.body.appendChild(picker);
}

function pickDay(blockId,wi,dayName,pickerEl){
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  // Remove picker+backdrop
  document.querySelectorAll('[style*="z-index:9999"],[style*="z-index:9998"]').forEach(e=>e.remove());
  // Check copy from other day
  const allDays=blk.weeks.flatMap((w,wi2)=>w.days.map((d,di)=>({...d,_wi:wi2,_di:di})));
  if(allDays.length>0){
    // Offer to copy
    const copy=confirm(`Tag "${dayName}" hinzufügen.\n\nEinen bestehenden Tag als Vorlage übernehmen?\n(OK = Auswahl, Abbrechen = leerer Tag)`);
    if(copy){
      const opts=allDays.map((d,i)=>`${i}: ${d.label} (Woche ${d._wi+1})`).join('\n');
      const sel=prompt('Welchen Tag übernehmen?\n'+opts+'\n\nNummer eingeben:');
      const idx=parseInt(sel);
      if(!isNaN(idx)&&allDays[idx]){
        const src=JSON.parse(JSON.stringify(allDays[idx]));
        src.id=uid(); src.label=dayName;
        blk.weeks[wi].days.push(src);
        save(); renderLtp(); return;
      }
    }
  }
  blk.weeks[wi].days.push({id:uid(),label:dayName,entries:[]});
  save(); renderLtp();
}

function deleteDay(blockId,wi,di){
  if(!confirm('Tag löschen?'))return;
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  blk.weeks[wi].days.splice(di,1); save(); renderLtp();
}

// ── DAY EDITOR (calendar view) ──
function openDayEditor(blockId,wi,di){
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  const day=blk.weeks[wi].days[di]; if(!day)return;
  currentBlockId=blockId; currentWeekIdx=wi; currentDayIdx=di;
  dayEditorEntries=JSON.parse(JSON.stringify(day.entries||[]));
  document.getElementById('dayEditorTitle').textContent=day.label+' – '+blk.weeks[wi].label;
  document.getElementById('dayShowTime').checked=false;
  renderDayEditor();
  openMod('dayEditorMod');
}

function renderDayEditor(){
  const el=document.getElementById('dayEditorBody'); if(!el)return;
  const showTime=document.getElementById('dayShowTime')?.checked;
  if(!dayEditorEntries.length){
    el.innerHTML=`<div style="text-align:center;padding:40px 20px;color:var(--text-3);">
      <div style="font-size:36px;margin-bottom:8px;">🗓</div>
      <div style="font-size:13px;">Noch keine Einträge. Oben hinzufügen.</div>
    </div>`; return;
  }
  if(showTime){
    renderTimeGrid(el);
  } else {
    renderEntryList(el);
  }
}

function renderEntryList(el){
  const typeColors={training:'#1a7f4b',free:'#1565c0',game:'#e65100'};
  const typeIcos={training:'⚽',free:'☕',game:'🏆'};
  const typeLabels={training:'Trainingseinheit',free:'Freier Block',game:'Spieltag'};
  // Sort by start time
  const sorted=[...dayEditorEntries].sort((a,b)=>(a.startTime||'00:00').localeCompare(b.startTime||'00:00'));
  el.innerHTML=sorted.map((e,i)=>{
    const realIdx=dayEditorEntries.indexOf(e);
    const plan=savedPlans.find(p=>p.id===e.planId);
    return`<div style="display:flex;gap:10px;padding:10px 12px;border-radius:10px;border:1.5px solid ${typeColors[e.type]||'#666'}30;background:${typeColors[e.type]||'#666'}10;margin-bottom:8px;align-items:flex-start;">
      <div style="font-size:20px;flex-shrink:0;">${typeIcos[e.type]||'•'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;color:var(--text-1);">${e.title||typeLabels[e.type]}</div>
        ${e.startTime||e.endTime?`<div style="font-size:11px;color:var(--text-3);margin-top:2px;">⏱ ${e.startTime||'?'}${e.endTime?' – '+e.endTime:''}</div>`:''}
        ${plan?`<div style="font-size:11px;color:var(--accent);margin-top:2px;">📋 ${plan.name}</div>`:''}
        ${e.notes?`<div style="font-size:11px;color:var(--text-2);margin-top:3px;font-style:italic;">${e.notes}</div>`:''}
        ${(e.tags||[]).length?`<div style="margin-top:4px;">${e.tags.map(t=>`<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:5px;${tagStyle(t)};display:inline-block;margin:1px;">${t}</span>`).join('')}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
        <button onclick="editEntry(${realIdx})" style="padding:4px 8px;font-size:10px;border:1px solid var(--border);background:var(--surface);border-radius:5px;cursor:pointer;">✏️</button>
        <button onclick="deleteEntry(${realIdx})" style="padding:4px 8px;font-size:10px;border:none;background:none;cursor:pointer;color:#880e4f;">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderTimeGrid(el){
  // Collect hour range
  const times=dayEditorEntries.filter(e=>e.startTime).map(e=>parseInt(e.startTime.split(':')[0]));
  const minH=times.length?Math.min(...times):6;
  const maxH=times.length?Math.max(...times)+2:22;
  const typeColors={training:'#1a7f4b',free:'#1565c0',game:'#e65100'};
  const typeIcos={training:'⚽',free:'☕',game:'🏆'};
  const hourH=60; // px per hour
  const totalH=(maxH-minH)*hourH;

  let html=`<div style="position:relative;min-height:${totalH}px;margin-left:48px;">`;
  // Hour lines
  for(let h=minH;h<=maxH;h++){
    const top=(h-minH)*hourH;
    html+=`<div style="position:absolute;top:${top}px;left:0;right:0;border-top:1px solid var(--border);opacity:.5;"></div>
      <div style="position:absolute;top:${top-8}px;left:-44px;font-size:10px;color:var(--text-3);font-weight:700;">${String(h).padStart(2,'0')}:00</div>`;
  }
  // Entry blocks
  dayEditorEntries.filter(e=>e.startTime).forEach((e,i)=>{
    const [sh,sm]=e.startTime.split(':').map(Number);
    const startMin=(sh-minH)*60+sm;
    const endMin=e.endTime?((e=>{const[eh,em]=e.endTime.split(':').map(Number);return(eh-minH)*60+em;})(e)):startMin+60;
    const dur=Math.max(30,endMin-startMin);
    const topPx=startMin*(hourH/60);
    const heightPx=dur*(hourH/60);
    const realIdx=dayEditorEntries.indexOf(e);
    html+=`<div onclick="editEntry(${realIdx})" style="position:absolute;top:${topPx}px;height:${heightPx}px;left:4px;right:4px;background:${typeColors[e.type]||'#666'};border-radius:6px;padding:4px 7px;cursor:pointer;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.2);">
      <div style="font-size:10px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${typeIcos[e.type]||''} ${e.title||e.type}</div>
      <div style="font-size:9px;color:rgba(255,255,255,.8);">${e.startTime}${e.endTime?' – '+e.endTime:''}</div>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;
}

// ── ENTRY EDITING ──
function openEntryEdit(type, editIdx){
  editingEntryIdx = (editIdx!==undefined) ? editIdx : null;
  const isEdit = editIdx!==undefined;
  const e = isEdit ? dayEditorEntries[editIdx] : {type, title:'', startTime:'', endTime:'', planId:'', notes:'', tags:[], color:'#1565c0'};
  const typeLabels={training:'Trainingseinheit',free:'Freier Block',game:'Spieltag'};
  const typeColors={training:'#1a7f4b',free:'#1565c0',game:'#e65100'};
  document.getElementById('entryEditIco').textContent=type==='training'?'⚽':type==='game'?'🏆':'☕';
  document.getElementById('entryEditTitle').textContent=(isEdit?'Bearbeiten: ':'')+typeLabels[type||e.type];

  const planOpts='<option value="">– Kein Plan –</option>'+savedPlans.map(p=>`<option value="${p.id}" ${e.planId===p.id?'selected':''}>${p.name}</option>`).join('');
  const freeColors=['#1565c0','#6d28d9','#b71c1c','#e65100','#1a7f4b','#37474f'];

  let bodyHtml='';
  const t=e.type||type;
  if(t==='training'){
    bodyHtml=`
      <div class="fg"><label>Titel</label><input class="fc" id="ee-title" value="${e.title||''}" placeholder="z.B. Haupttraining"></div>
      <div class="fr">
        <div class="fg"><label>Von</label><input class="fc" id="ee-start" type="time" value="${e.startTime||''}"></div>
        <div class="fg"><label>Bis</label><input class="fc" id="ee-end" type="time" value="${e.endTime||''}"></div>
      </div>
      <div class="fg"><label>Trainingsplan verknüpfen</label><select class="fc" id="ee-plan">${planOpts}</select></div>
      <div style="margin-bottom:12px;">
        <button onclick="openNewPlanFromBlock()" style="padding:7px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text-2);">+ Neue Trainingseinheit erstellen</button>
      </div>
      <div class="fg"><label>Tags (kommagetrennt)</label><input class="fc" id="ee-tags" value="${(e.tags||[]).join(', ')}" placeholder="z.B. PRESSING, PASSSPIEL"></div>
      <div class="fg"><label>Notizen</label><textarea class="fc dta" id="ee-notes" rows="2" style="resize:vertical;">${e.notes||''}</textarea></div>`;
  } else if(t==='free'){
    bodyHtml=`
      <div class="fg"><label>Titel *</label><input class="fc" id="ee-title" value="${e.title||''}" placeholder="z.B. Frühstück, Freizeit, Schlafen…"></div>
      <div class="fr">
        <div class="fg"><label>Von</label><input class="fc" id="ee-start" type="time" value="${e.startTime||''}"></div>
        <div class="fg"><label>Bis</label><input class="fc" id="ee-end" type="time" value="${e.endTime||''}"></div>
      </div>
      <div class="fg"><label>Farbe</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;" id="ee-colors">
          ${freeColors.map(c=>`<div onclick="document.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('sel'));this.classList.add('sel')" class="color-dot ${(e.color||'#1565c0')===c?'sel':''}" data-color="${c}" style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${(e.color||'#1565c0')===c?'#fff':'transparent'};transition:border .15s;"></div>`).join('')}
        </div>
      </div>
      <div class="fg"><label>Notizen</label><textarea class="fc dta" id="ee-notes" rows="2" style="resize:vertical;">${e.notes||''}</textarea></div>`;
  } else if(t==='game'){
    bodyHtml=`
      <div class="fg"><label>Titel / Gegner</label><input class="fc" id="ee-title" value="${e.title||''}" placeholder="z.B. Funino vs. Bremen West"></div>
      <div class="fr">
        <div class="fg"><label>Von</label><input class="fc" id="ee-start" type="time" value="${e.startTime||''}"></div>
        <div class="fg"><label>Bis</label><input class="fc" id="ee-end" type="time" value="${e.endTime||''}"></div>
      </div>
      <div class="fg"><label>Spielformat</label><input class="fc" id="ee-format" value="${e.gameFormat||''}" placeholder="z.B. Funino, 4vs4, 7vs7"></div>
      <div class="fg"><label>Notizen</label><textarea class="fc dta" id="ee-notes" rows="2" style="resize:vertical;">${e.notes||''}</textarea></div>`;
  }

  bodyHtml+=`<div class="macts">
    <button class="bpr" onclick="saveEntry('${t}')">Speichern</button>
    <button class="bsc" onclick="closeMod('entryEditMod')">Abbrechen</button>
    ${isEdit?`<button onclick="deleteEntry(${editIdx});closeMod('entryEditMod')" style="padding:9px 14px;border:1px solid #880e4f;color:#880e4f;background:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:12px;">Löschen</button>`:''}
  </div>`;

  document.getElementById('entryEditBody').innerHTML=bodyHtml;
  openMod('entryEditMod');
}

function saveEntry(type){
  const title=(document.getElementById('ee-title')?.value||'').trim();
  const startTime=document.getElementById('ee-start')?.value||'';
  const endTime=document.getElementById('ee-end')?.value||'';
  const notes=document.getElementById('ee-notes')?.value||'';
  const planId=document.getElementById('ee-plan')?.value||'';
  const tagsRaw=document.getElementById('ee-tags')?.value||'';
  const tags=tagsRaw.split(',').map(t=>t.trim().toUpperCase()).filter(Boolean);
  const colorDot=document.querySelector('.color-dot.sel');
  const color=colorDot?colorDot.dataset.color:'#1565c0';
  const gameFormat=document.getElementById('ee-format')?.value||'';
  const entry={id:uid(),type,title,startTime,endTime,notes,planId,tags,color,gameFormat};
  if(editingEntryIdx!==null){
    entry.id=dayEditorEntries[editingEntryIdx].id;
    dayEditorEntries[editingEntryIdx]=entry;
  } else {
    dayEditorEntries.push(entry);
  }
  editingEntryIdx=null;
  closeMod('entryEditMod');
  renderDayEditor();
}

function editEntry(idx){ openEntryEdit(dayEditorEntries[idx].type, idx); }
function deleteEntry(idx){ dayEditorEntries.splice(idx,1); renderDayEditor(); }

function saveDayEditor(){
  const blk=ltpBlocks.find(b=>b.id===currentBlockId); if(!blk)return;
  blk.weeks[currentWeekIdx].days[currentDayIdx].entries=[...dayEditorEntries];
  save(); renderLtp(); closeMod('dayEditorMod'); showToast('Tag gespeichert');
}

// ── NEW PLAN FROM BLOCK ──
function openNewPlanFromBlock(){
  closeMod('entryEditMod');
  closeMod('dayEditorMod');
  goPage('planner');
  showToast('Trainingseinheit erstellen, dann Blockplanung zurückkehren');
}

// ── BLOCK LIBRARY ──
function openSaveBlockLib(blockId){
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  editingBlockLibId=blockId;
  document.getElementById('sbl-name').value=blk.name;
  document.getElementById('sbl-desc').value=blk.notes||'';
  openMod('saveBlockLibMod');
}

function commitSaveBlockLib(){
  const name=(document.getElementById('sbl-name').value||'').trim();
  if(!name){showToast('Bitte Namen eingeben','err');return;}
  const blk=ltpBlocks.find(b=>b.id===editingBlockLibId); if(!blk)return;
  const libEntry=JSON.parse(JSON.stringify(blk));
  libEntry.id=uid();
  libEntry.name=name;
  libEntry.notes=document.getElementById('sbl-desc').value||'';
  libEntry.savedAt=new Date().toLocaleDateString('de-DE');
  if(!blockLibrary) blockLibrary=[];
  blockLibrary.unshift(libEntry);
  save(); closeMod('saveBlockLibMod');
  showToast('Block in Bibliothek gespeichert');
  if(activeLtpTab===1) renderLibrary();
}

function renderLibrary(){
  const el=document.getElementById('ltpLibGrid'); if(!el)return;
  if(!blockLibrary||!blockLibrary.length){
    el.innerHTML=`<div style="text-align:center;padding:40px 20px;color:var(--text-3);">
      <div style="font-size:36px;margin-bottom:8px;">📚</div>
      <div style="font-size:13px;">Noch keine Blöcke in der Bibliothek.<br>Speichere einen aktiven Block mit "💾 Bibliothek".</div>
    </div>`; return;
  }
  el.innerHTML=blockLibrary.map((blk,i)=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px;">
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:900;color:var(--text-1);">${blk.name}</div>
        ${blk.notes?`<div style="font-size:11px;color:var(--text-2);margin-top:2px;">${blk.notes}</div>`:''}
        <div style="font-size:10px;color:var(--text-3);margin-top:4px;">${blk.weeks?.length||0} Wochen · Gespeichert ${blk.savedAt||blk.createdAt||''}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="loadBlockFromLib(${i})" style="padding:7px 12px;background:var(--accent);color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:800;cursor:pointer;">Laden</button>
        <button onclick="deleteBlockLib(${i})" style="padding:7px 8px;border:1px solid var(--border);background:none;border-radius:7px;font-size:11px;cursor:pointer;color:var(--text-3);">✕</button>
      </div>
    </div>`).join('');
}

function loadBlockFromLib(idx){
  const blk=JSON.parse(JSON.stringify(blockLibrary[idx]));
  blk.id=uid(); blk.createdAt=new Date().toLocaleDateString('de-DE');
  if(!ltpBlocks) ltpBlocks=[];
  ltpBlocks.unshift(blk);
  save(); switchLtpTab(0); renderLtp();
  showToast('Block geladen');
}

function deleteBlockLib(idx){
  if(!confirm('Aus Bibliothek löschen?'))return;
  blockLibrary.splice(idx,1); save(); renderLibrary();
}

function saveLibrary(){save();}
function renderLtpDayPlanSelect(){} // kept for compat
function printLtp(){window.print();}

// ── PRINT HELPERS ──────────────────────────────────────
function _ltpPrintCSS(){
  return`*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;background:#fff;padding:14mm 16mm;}
.brand{text-align:center;margin-bottom:5mm;}
.brand-name{font-size:18pt;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#1a7f4b;}
.brand-sub{font-size:7pt;letter-spacing:3px;text-transform:uppercase;color:#888;margin-top:1px;}
.doc-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:5mm;padding-bottom:3mm;border-bottom:2px solid #111;}
.doc-title{font-size:15pt;font-weight:900;}
.doc-sub{font-size:9pt;color:#666;text-align:right;}
.day-section{margin-bottom:8mm;page-break-before:auto;}
.day-section+.day-section{page-break-before:always;}
.day-hdr{font-size:13pt;font-weight:900;margin-bottom:4mm;padding-bottom:2mm;border-bottom:2px solid #111;}
.entry-block{margin-bottom:5mm;padding:8px 10px;border-radius:6px;border-left:4px solid #ccc;}
.entry-block.training{border-left-color:#1a7f4b;background:#f0faf4;}
.entry-block.game{border-left-color:#e65100;background:#fff8f5;}
.entry-block.free{border-left-color:#1565c0;background:#f0f4ff;}
.entry-title{font-size:11pt;font-weight:900;margin-bottom:3px;}
.entry-meta{font-size:8.5pt;color:#555;margin-bottom:4px;}
.entry-notes{font-size:8.5pt;color:#333;line-height:1.5;}
.mat-box{background:#f5f5f5;border-radius:5px;padding:5px 10px;margin-bottom:5mm;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.mat-box-title{font-size:7pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#666;white-space:nowrap;}
.mat-pill{font-size:8pt;padding:2px 9px;border-radius:20px;background:#fff;border:1px solid #ccc;font-weight:600;}
.ex-card{display:flex;gap:12px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #e8e8e8;page-break-inside:avoid;}
.ex-num{flex-shrink:0;width:18px;height:18px;border-radius:50%;color:#fff;font-size:7pt;font-weight:900;display:flex;align-items:center;justify-content:center;margin-top:2px;}
.ex-img{flex-shrink:0;width:200px;height:140px;border-radius:5px;overflow:hidden;border:1px solid #e0e0e0;}
.ex-img img{width:100%;height:100%;object-fit:contain;background:#f0f4f0;}
.ex-sec{font-size:7pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;}
.ex-name{font-size:11pt;font-weight:900;margin-bottom:3px;}
.ex-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:8pt;color:#444;font-weight:600;margin-bottom:4px;}
.ex-desc{font-size:8.5pt;color:#333;line-height:1.55;white-space:pre-wrap;}
.total-box{margin-top:5mm;padding:7px 0;border-top:2px solid #111;display:flex;justify-content:space-between;align-items:center;gap:12px;}
.total-label{font-size:9pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:3px;}
.total-breakdown{display:flex;flex-wrap:wrap;gap:5px;}
.diff-pill{font-size:8pt;font-weight:700;padding:2px 8px;border-radius:20px;}
.total-val{font-size:15pt;font-weight:900;white-space:nowrap;}
.plan-label{font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a7f4b;margin:4mm 0 2mm;}
@media print{body{padding:0;}@page{margin:14mm;}}`;
}

function _ltpPlanHTML(plan){
  if(!plan) return '';
  const items=[];
  (plan.lanes||[]).forEach((lane,si)=>{
    (lane||[]).forEach(raw=>{
      const item=typeof raw==='string'?{id:raw}:raw;
      const ex=exercises.find(e=>e.id===item.id);
      if(ex) items.push({item,ex,si});
    });
  });
  if(!items.length) return '';
  const SECS_=typeof SECS!=='undefined'?SECS:[];
  const secColor=si=>SECS_[si]?.color||'#333';
  const secName=si=>SECS_[si]?.name||'';
  const matSet=new Set();
  items.forEach(({ex})=>(ex.material||'').split(',').map(m=>m.trim()).filter(Boolean).forEach(m=>matSet.add(m)));
  const byDiff={Leicht:0,Mittel:0,Schwer:0,'':0};
  items.forEach(({item,ex})=>{const d=parseInt(item.duration??ex.duration??0)||0;const diff=item.difficulty??ex.difficulty??'';byDiff[diff in byDiff?diff:'']+=d;});
  const totalMin=Object.values(byDiff).reduce((a,b)=>a+b,0);
  const matHTML=[...matSet].length?`<div class="mat-box"><div class="mat-box-title">Material</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${[...matSet].map(m=>`<span class="mat-pill">${m}</span>`).join('')}</div></div>`:'';
  const diffRows=[{label:'Leicht',color:'#1a7f4b',min:byDiff['Leicht']},{label:'Mittel',color:'#e65100',min:byDiff['Mittel']},{label:'Schwer',color:'#880e4f',min:byDiff['Schwer']}].filter(r=>r.min>0);
  const totalHTML=totalMin?`<div class="total-box"><div><div class="total-label">Gesamtbelastung</div><div class="total-breakdown">${diffRows.map(r=>`<span class="diff-pill" style="background:${r.color}18;color:${r.color};border:1px solid ${r.color}40;">${r.label}: ${r.min} min</span>`).join('')}${byDiff['']>0?`<span class="diff-pill" style="background:#f5f5f5;color:#555;border:1px solid #ccc;">Ohne Angabe: ${byDiff['']} min</span>`:''}</div></div><span class="total-val">${totalMin} min</span></div>`:'';
  const cardsHTML=items.map(({item,ex,si},idx)=>{
    const players=item.players??ex.players??'';const duration=item.duration??ex.duration??'';const difficulty=item.difficulty??ex.difficulty??'';const col=secColor(si);
    return`<div class="ex-card"><div class="ex-num" style="background:${col}">${idx+1}</div><div class="ex-img">${ex.image?`<img src="${ex.image}" alt="${ex.name}">`:'<div style="width:200px;height:140px;background:#f0f4f0;border-radius:5px;"></div>'}</div><div style="flex:1;min-width:0;"><div class="ex-sec" style="color:${col}">${secName(si)}</div><div class="ex-name">${ex.name}</div><div class="ex-meta">${players?`<span>👥 ${players}</span>`:''}${duration?`<span>⏱ ${duration} min</span>`:''}${difficulty?`<span>◉ ${difficulty}</span>`:''}</div>${ex.desc?`<div class="ex-desc">${ex.desc}</div>`:''}</div></div>`;
  }).join('');
  return matHTML+cardsHTML+totalHTML;
}

function _ltpDayHTML(blk, week, day){
  const typeColors={training:'#1a7f4b',free:'#1565c0',game:'#e65100'};
  const typeLabels={training:'Trainingseinheit',free:'Freier Block',game:'Spieltag'};
  const typeIcos={training:'⚽',free:'☕',game:'🏆'};
  const entries=day.entries||[];
  let html=`<div class="day-hdr">${day.label||'Tag'}</div>`;
  if(!entries.length){html+=`<div style="color:#999;font-size:9pt;font-style:italic;">Keine Einträge</div>`;return html;}
  entries.forEach(e=>{
    const col=typeColors[e.type]||'#666';
    html+=`<div class="entry-block ${e.type}">
      <div class="entry-title">${typeIcos[e.type]||'•'} ${e.title||typeLabels[e.type]||e.type}</div>
      <div class="entry-meta">${e.startTime||e.endTime?`⏱ ${e.startTime||'?'}${e.endTime?' – '+e.endTime:''} &nbsp;`:''}${e.gameFormat?`📋 ${e.gameFormat} &nbsp;`:''}</div>
      ${e.notes?`<div class="entry-notes">${e.notes}</div>`:''}
    </div>`;
    if(e.type==='training'&&e.planId){
      const plan=savedPlans.find(p=>p.id===e.planId);
      if(plan){
        html+=`<div class="plan-label">📋 ${plan.name}</div>`;
        html+=_ltpPlanHTML(plan);
      }
    }
  });
  return html;
}

function printLtpDay(blockId,wi,di){
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  const week=blk.weeks[wi]; const day=week.days[di];
  const today=new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
  const html=`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${day.label}</title>
<style>${_ltpPrintCSS()}</style></head><body>
<div class="brand"><div class="brand-name">AssistCoach</div><div class="brand-sub">Trainingsplanung</div></div>
<div class="doc-header">
  <div class="doc-title">${blk.name}</div>
  <div class="doc-sub">${week.label||'Woche '+(wi+1)}<br>${today}</div>
</div>
<div class="day-section">${_ltpDayHTML(blk,week,day)}</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close();
}

function printLtpWeek(blockId,wi){
  const blk=ltpBlocks.find(b=>b.id===blockId); if(!blk)return;
  const week=blk.weeks[wi];
  if(!week.days.length){showToast('Woche hat keine Tage','err');return;}
  const today=new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
  const daysHTML=week.days.map(day=>`<div class="day-section">${_ltpDayHTML(blk,week,day)}</div>`).join('');
  const html=`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${week.label||'Woche '+(wi+1)}</title>
<style>${_ltpPrintCSS()}</style></head><body>
<div class="brand"><div class="brand-name">AssistCoach</div><div class="brand-sub">Trainingsplanung</div></div>
<div class="doc-header">
  <div class="doc-title">${blk.name} – ${week.label||'Woche '+(wi+1)}</div>
  <div class="doc-sub">${week.focus?week.focus+'<br>':''}${today}</div>
</div>
${daysHTML}
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close();
}
function addLtpBlock(){openNewBlockWizard();}

function exportCSV(){const h='Name,Spieleranzahl,Material,Abschnitt,Schwierigkeit,Beschreibung,Tags';const rows=exercises.map(e=>[e.name,e.players||'',e.material||'',e.section,e.difficulty||'',e.desc||'',(e.tags||[]).join('|')].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));dl('trainingsbuch.csv',[h,...rows].join('\n'),'text/csv');showToast('CSV exportiert');}
function downloadTemplate(){dl('vorlage.csv','Name,Spieleranzahl,Material,Abschnitt,Schwierigkeit,Beschreibung,Tags\n"Beispiel",6,"Hütchen, Bälle",1,"Mittel","Beschreibung.","TAG1|TAG2"','text/csv');}
function importCSV(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const ls=e.target.result.split('\n').filter(l=>l.trim());let c=0;ls.slice(1).forEach(line=>{const cols=parseCSV(line);if(!cols[0])return;exercises.push({id:uid(),name:cols[0],players:cols[1]||'',material:cols[2]||'',section:Math.min(4,Math.max(0,parseInt(cols[3])||0)),difficulty:cols[4]||'',desc:cols[5]||'',tags:cols[6]?cols[6].split('|').map(t=>t.trim().toUpperCase()).filter(Boolean):[],image:null});c++;});save();renderSection();showToast(`${c} Übungen importiert`);}catch{showToast('Import-Fehler','err');}};r.readAsText(f);inp.value='';}
function parseCSV(l){const r=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){c+='"';i++;}else q=!q;}else if(ch===','&&!q){r.push(c.trim());c='';}else c+=ch;}r.push(c.trim());return r;}
function dl(n,cnt,t){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+cnt],{type:t}));a.download=n;a.click();}
function downloadITDoc(){dl('SVW_IT.txt','SVW Trainingsbuch — IT\n\nGET /data → JSON zurückgeben\nPOST /data → JSON speichern\nCORS: Access-Control-Allow-Origin: *\nHeader: Content-Type, X-API-Key\n\nNode.js:\nconst e=require("express"),f=require("fs"),a=e();a.use(e.json({limit:"20mb"}));a.use((q,r,n)=>{r.header("Access-Control-Allow-Origin","*");r.header("Access-Control-Allow-Headers","Content-Type,X-API-Key");r.header("Access-Control-Allow-Methods","GET,POST,OPTIONS");n();});a.get("/api/trainingsbuch/data",(q,r)=>r.json(JSON.parse(f.existsSync("data.json")?f.readFileSync("data.json"):"{}")));a.post("/api/trainingsbuch/data",(q,r)=>{f.writeFileSync("data.json",JSON.stringify(q.body));r.sendStatus(200);});a.listen(3000);','text/plain');showToast('IT-Dokument heruntergeladen');}

