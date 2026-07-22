// ══════════════════════════════════════════════════════════════════
// MODUL: FELDDIAGRAMM-EDITOR (HAUPT-CANVAS)
// ══════════════════════════════════════════════════════════════════
// Enthält: den Canvas-basierten Editor zum Zeichnen von taktischen
// Felddiagrammen (Spieler, Bälle, Pfeile, Tore, Material-Symbole) -
// genutzt im Übung-Anlegen-Modal.
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// FELD-EDITOR
// ══════════════════════════════════════════════════════
let currentTool='player', canvasObjects=[], undoStack=[];
let playerCounters={}, selectedObjIdx=null;
let isDraggingObj=false, dragOffX=0, dragOffY=0;
let isResizing=false, resizeObjIdx=null;
let linePhase=0, lineStart=null;
let dribblePoints=[], isDribbling=false;
let canvasEl=null, ctx=null, _cvInited=false;
let _cvMode='edit'; // 'edit' | 'submit' | 'catalog-edit'
// Multi-select & lasso
let selectedIndices=[], isLasso=false, lassoStart=null, lassoRect=null;
let dragAnchor=null;
// Copy/Paste
let clipboardObjects=[];
// Catalog-edit mode
let _catalogEditExId=null;

function switchImgTab(tab){
  const u=tab==='upload';
  document.getElementById('imgPanelUpload').style.display=u?'block':'none';
  document.getElementById('imgPanelDraw').style.display=u?'none':'block';
  document.getElementById('imgTabUpload').style.background=u?'var(--g)':'none';
  document.getElementById('imgTabUpload').style.color=u?'#fff':'var(--gd2)';
  document.getElementById('imgTabDraw').style.background=u?'none':'var(--g)';
  document.getElementById('imgTabDraw').style.color=u?'var(--gd2)':'#fff';
}

function openFieldOverlay(mode){
  _cvMode=mode||'edit';
  const ov=document.getElementById('fieldOverlay');
  if(ov) ov.style.display='flex';
  _cvInited=false;
  setTimeout(()=>initCanvas(false),80);
}

function closeFieldOverlay(){
  const ov=document.getElementById('fieldOverlay');
  if(ov) ov.style.display='none';
}

function initCanvas(reset){
  canvasEl=document.getElementById('fieldCanvas');
  if(!canvasEl) return;
  const dpr=window.devicePixelRatio||1;
  const W=canvasEl.offsetWidth||800;
  const H=canvasEl.offsetHeight||Math.round(W*0.6);
  canvasEl.width=W*dpr; canvasEl.height=H*dpr;
  ctx=canvasEl.getContext('2d');
  ctx.scale(dpr,dpr);
  if(reset){canvasObjects=[];playerCounters={};undoStack=[];selectedObjIdx=null;linePhase=0;lineStart=null;}
  redraw();
  if(!_cvInited){attachCvEvents();_cvInited=true;}
}

function cvPos(e){
  const r=canvasEl.getBoundingClientRect();
  return{x:(e.clientX-r.left),y:(e.clientY-r.top)};
}
function cvPosT(t){
  const r=canvasEl.getBoundingClientRect();
  return{x:(t.clientX-r.left),y:(t.clientY-r.top)};
}

function attachCvEvents(){
  ['mousedown','mousemove','mouseup','contextmenu','dblclick',
   'touchstart','touchmove','touchend'].forEach(ev=>{
    canvasEl.removeEventListener(ev,_cvH[ev]);
    canvasEl.addEventListener(ev,_cvH[ev],{passive:false});
  });
}
const _cvH={
  mousedown: e=>{e.preventDefault();cvDown(cvPos(e));},
  mousemove: e=>cvMove(cvPos(e)),
  mouseup:   e=>cvUp(cvPos(e)),
  contextmenu: e=>{e.preventDefault(); cvRightClick(cvPos(e));},
  dblclick: e=>{linePhase=0;lineStart=null;selectedObjIdx=null;isDribbling=false;dribblePoints=[];redraw();},
  touchstart: e=>{e.preventDefault();cvDown(cvPosT(e.touches[0]));},
  touchmove:  e=>{e.preventDefault();cvMove(cvPosT(e.touches[0]));},
  touchend:   e=>{e.preventDefault();cvUp(cvPosT(e.changedTouches[0]));}
};

// ── HIT TEST ──
function _baseR(o){
  if(o.type==='ball') return 13;
  if(o.type==='goal') return o.subtype==='full'?42:o.subtype==='youth'?28:18;
  return 14; // equip
}
function _objSc(o){return o.scale||1;}
function _resizeHandlePos(o){
  const sc=_objSc(o), br=_baseR(o);
  return {x:o.x+(br*sc+7), y:o.y};
}
function hitAt(x,y){
  for(let i=canvasObjects.length-1;i>=0;i--){
    const o=canvasObjects[i];
    if((o.type==='player'||o.type==='ball'||o.type==='equip'||o.type==='goal')&&Math.hypot(x-o.x,y-o.y)<22*_objSc(o)) return i;
    if((o.type==='pass'||o.type==='run'||o.type==='dribble')&&ptNearSeg(x,y,o.x1,o.y1,o.x2,o.y2,12)) return i;
  }
  return -1;
}
function objectsInRect(rx1,ry1,rx2,ry2){
  const minX=Math.min(rx1,rx2),maxX=Math.max(rx1,rx2);
  const minY=Math.min(ry1,ry2),maxY=Math.max(ry1,ry2);
  const result=[];
  canvasObjects.forEach((o,i)=>{
    if(o.x!==undefined){if(o.x>=minX&&o.x<=maxX&&o.y>=minY&&o.y<=maxY)result.push(i);}
    else if(o.x1!==undefined){const mx=(o.x1+o.x2)/2,my=(o.y1+o.y2)/2;if(mx>=minX&&mx<=maxX&&my>=minY&&my<=maxY)result.push(i);}
  });
  return result;
}
function ptNearSeg(px,py,x1,y1,x2,y2,t){
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  if(!l2) return Math.hypot(px-x1,py-y1)<t;
  const u=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l2));
  return Math.hypot(px-x1-u*dx,py-y1-u*dy)<t;
}

// ── EVENTS ──
function cvDown({x,y}){
  const t=currentTool;
  if(t==='select'){
    // Check resize handle first (only for single selection)
    if(selectedIndices.length===1){
      const o=canvasObjects[selectedIndices[0]];
      if(o&&(o.type==='ball'||o.type==='equip'||o.type==='goal')){
        const h=_resizeHandlePos(o);
        if(Math.hypot(x-h.x,y-h.y)<10){
          pushUndo();isResizing=true;resizeObjIdx=selectedIndices[0];selectedObjIdx=selectedIndices[0];return;
        }
      }
    }
    const i=hitAt(x,y);
    if(i>=0){
      // Click on already-selected group → drag whole group
      if(!selectedIndices.includes(i)){
        selectedIndices=[i]; selectedObjIdx=i;
      }
      isDraggingObj=true;
      dragAnchor={x,y};
      const o=canvasObjects[i];
      dragOffX=x-(o.x??o.x1??o.pts?.[0]?.x??0);
      dragOffY=y-(o.y??o.y1??o.pts?.[0]?.y??0);
    } else {
      // Start lasso
      selectedObjIdx=null; selectedIndices=[];
      isLasso=true; lassoStart={x,y}; lassoRect=null;
    }
    redraw(); return;
  }
  if(t==='erase'){pushUndo();const i=hitAt(x,y);if(i>=0){canvasObjects.splice(i,1);redraw();} return;}
  if(t==='dribble'){
    if(!linePhase){pushUndo();linePhase=1;lineStart={x,y};}
    else{canvasObjects.push({type:'dribble',x1:lineStart.x,y1:lineStart.y,x2:x,y2:y});linePhase=0;lineStart=null;redraw();}
    return;
  }
  if(t==='pass'||t==='run'){
    if(!linePhase){pushUndo();linePhase=1;lineStart={x,y};}
    else{canvasObjects.push({type:t,x1:lineStart.x,y1:lineStart.y,x2:x,y2:y});linePhase=0;lineStart=null;redraw();}
    return;
  }
  pushUndo(); placeObj(t,x,y);
}
function cvMove({x,y}){
  if(isResizing&&resizeObjIdx!==null){
    const o=canvasObjects[resizeObjIdx];
    const d=Math.hypot(x-o.x,y-o.y);
    o.scale=Math.max(0.2,Math.min(6,d/_baseR(o)));
    redraw();return;
  }
  // Lasso: update rect
  if(isLasso&&lassoStart){
    lassoRect={x1:Math.min(lassoStart.x,x),y1:Math.min(lassoStart.y,y),x2:Math.max(lassoStart.x,x),y2:Math.max(lassoStart.y,y)};
    redraw(); return;
  }
  if(isDraggingObj&&selectedIndices.length>0&&dragAnchor){
    if(selectedIndices.length>1){
      // Delta-based multi-drag
      const dX=x-dragAnchor.x, dY=y-dragAnchor.y;
      selectedIndices.forEach(i=>{
        const o=canvasObjects[i]; if(!o)return;
        if(o.x!==undefined){o.x+=dX;o.y+=dY;}
        else if(o.x1!==undefined){o.x1+=dX;o.y1+=dY;o.x2+=dX;o.y2+=dY;}
        else if(o.pts){o.pts=o.pts.map(p=>({x:p.x+dX,y:p.y+dY}));}
      });
      dragAnchor={x,y};
    } else if(selectedObjIdx!==null){
      // Single-object absolute drag (existing behavior)
      const o=canvasObjects[selectedObjIdx];
      if(o.x!==undefined){o.x=x-dragOffX;o.y=y-dragOffY;}
      else if(o.x1!==undefined&&o.x2!==undefined){const dx=x-dragOffX-o.x1,dy=y-dragOffY-o.y1;o.x1+=dx;o.y1+=dy;o.x2+=dx;o.y2+=dy;}
      else if(o.pts){const dx=x-dragOffX-(o.pts[0].x||0),dy=y-dragOffY-(o.pts[0].y||0);o.pts=o.pts.map(p=>({x:p.x+dx,y:p.y+dy}));}
    }
    redraw(); return;
  }
  if(currentTool==='dribble'&&linePhase&&lineStart){
    redraw();
    drawSinePreview(lineStart.x,lineStart.y,x,y,'rgba(129,199,132,.5)');
    return;
  }
  if((currentTool==='pass'||currentTool==='run')&&linePhase&&lineStart){
    redraw();
    ctx.save();
    ctx.strokeStyle='rgba(0,0,0,.45)';
    ctx.lineWidth=2; ctx.setLineDash(currentTool==='run'?[7,5]:[]);
    ctx.beginPath();ctx.moveTo(lineStart.x,lineStart.y);ctx.lineTo(x,y);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
  }
}
function cvUp({x,y}){
  if(isResizing){isResizing=false;resizeObjIdx=null;redraw();return;}
  if(isDraggingObj){isDraggingObj=false;dragAnchor=null;redraw();return;}
  if(isLasso){
    isLasso=false;
    if(lassoRect&&(lassoRect.x2-lassoRect.x1>5||lassoRect.y2-lassoRect.y1>5)){
      selectedIndices=objectsInRect(lassoRect.x1,lassoRect.y1,lassoRect.x2,lassoRect.y2);
      selectedObjIdx=selectedIndices.length===1?selectedIndices[0]:null;
      if(selectedIndices.length>0) showToast(selectedIndices.length+' Objekt'+( selectedIndices.length>1?'e':'')+' ausgewählt');
    }
    lassoRect=null; lassoStart=null;
    redraw(); return;
  }
}
function cvRightClick({x,y}){
  // Right-click: rotate hit object 22.5° (or currently selected)
  let i=hitAt(x,y);
  if(i<0) i=selectedObjIdx;
  if(i!==null&&i>=0&&canvasObjects[i]){
    const o=canvasObjects[i];
    if(o.angle!==undefined){
      pushUndo();
      o.angle=(o.angle||0)+Math.PI/8; // 22.5°
      selectedObjIdx=i;
      redraw(); updateRotCtrl();
    }
  }
}

// ── PLACE ──
function placeObj(t,x,y){
  if(t==='player'){
    const col=document.getElementById('playerColor')?.value||'#1565c0';
    if(!playerCounters[col])playerCounters[col]=1;
    const lbl=col==='#f9a825'?'TW':String(playerCounters[col]++);
    canvasObjects.push({type:'player',x,y,color:col,label:lbl,angle:0});
  } else if(t==='ball'){
    canvasObjects.push({type:'ball',x,y,scale:0.5});
  } else if(t==='equip'){
    canvasObjects.push({type:'equip',subtype:document.getElementById('equipType')?.value||'cone',x,y,angle:0,scale:1});
  } else if(t==='goal'){
    canvasObjects.push({type:'goal',subtype:document.getElementById('goalType')?.value||'mini',x,y,angle:0,scale:1});
  }
  redraw();
}

// ── TOOLS ──
function setTool(t){
  currentTool=t; linePhase=0; lineStart=null; isDribbling=false; dribblePoints=[];
  document.querySelectorAll('.tb').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('tb_'+t); if(btn)btn.classList.add('active');
  updatePlayerColorBtn();
  if(canvasEl)canvasEl.style.cursor=t==='select'?'default':t==='erase'?'cell':'crosshair';
}

function updatePlayerColorBtn(){
  const col=document.getElementById('playerColor')?.value||'#1565c0';
  const pc=document.getElementById('tb_player');
  if(pc){
    pc.style.background=col;
    // Textfarbe anpassen für helle Hintergründe
    const bright=['#f9a825','#ffffff','#fff176','#e0e0e0'].includes(col);
    pc.style.color=bright?'#1a1a1a':'#ffffff';
  }
}

// ── RESAMPLE dribble path ──
function resample(pts,step){
  const out=[pts[0]]; let acc=0;
  for(let i=1;i<pts.length;i++){
    const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y); acc+=d;
    while(acc>=step){acc-=step;const t=acc/d;out.push({x:pts[i].x-t*(pts[i].x-pts[i-1].x),y:pts[i].y-t*(pts[i].y-pts[i-1].y)});}
  }
  return out;
}

// ── REDRAW ──

// ── KEYBOARD DELETE ──────────────────────────────────
document.addEventListener('keydown', function(e){
  const tag = document.activeElement.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  // Delete / Backspace
  if(e.key === 'Delete' || e.key === 'Backspace'){
    const toDelete = selectedIndices.length > 0 ? [...selectedIndices] : (selectedObjIdx !== null && selectedObjIdx >= 0 ? [selectedObjIdx] : []);
    if(toDelete.length){
      pushUndo();
      // Remove highest index first to not shift lower indices
      toDelete.sort((a,b)=>b-a).forEach(i=>canvasObjects.splice(i,1));
      selectedObjIdx=null; selectedIndices=[];
      redraw();
      showToast(toDelete.length>1?toDelete.length+' Objekte gelöscht':'Objekt gelöscht');
    }
  }
  // Ctrl/Cmd + C — Copy
  if((e.ctrlKey||e.metaKey)&&e.key==='c'){
    const indices=selectedIndices.length>0?selectedIndices:(selectedObjIdx!==null&&selectedObjIdx>=0?[selectedObjIdx]:[]);
    if(indices.length){
      clipboardObjects=indices.map(i=>JSON.parse(JSON.stringify(canvasObjects[i]))).filter(Boolean);
      showToast(clipboardObjects.length+' Objekt'+(clipboardObjects.length>1?'e':'')+' kopiert');
    }
  }
  // Ctrl/Cmd + V — Paste
  if((e.ctrlKey||e.metaKey)&&e.key==='v'){
    if(!clipboardObjects.length) return;
    pushUndo();
    const off=20;
    const pasted=clipboardObjects.map(o=>{const c=JSON.parse(JSON.stringify(o));
      if(c.x!==undefined){c.x+=off;c.y+=off;}
      else if(c.x1!==undefined){c.x1+=off;c.y1+=off;c.x2+=off;c.y2+=off;}
      return c;
    });
    const startIdx=canvasObjects.length;
    pasted.forEach(o=>canvasObjects.push(o));
    selectedIndices=pasted.map((_,i)=>startIdx+i);
    selectedObjIdx=selectedIndices.length===1?selectedIndices[0]:null;
    redraw();
    showToast(pasted.length+' Objekt'+(pasted.length>1?'e':'')+' eingefügt');
  }
  // Escape — deselect
  if(e.key==='Escape'){
    selectedIndices=[]; selectedObjIdx=null; isLasso=false; lassoRect=null; redraw();
  }
});

// ── ROTATION CONTROLS ────────────────────────────────
function updateRotCtrl(){
  const ctrl = document.getElementById('rotCtrl');
  const slider = document.getElementById('angleSlider');
  const valEl = document.getElementById('angleVal');
  if(!ctrl) return;
  const singleIdx = selectedIndices.length===1 ? selectedIndices[0] : selectedObjIdx;
  if(singleIdx !== null && singleIdx >= 0 && canvasObjects[singleIdx] && selectedIndices.length<=1){
    const o = canvasObjects[singleIdx];
    if(o.angle !== undefined){
      const deg = Math.round(((o.angle || 0) * 180 / Math.PI) % 360 + 360) % 360;
      ctrl.style.display = 'flex';
      if(slider) slider.value = deg;
      if(valEl) valEl.textContent = deg + '°';
      return;
    }
  }
  ctrl.style.display = 'none';
}

function setSelAngle(deg){
  if(selectedObjIdx === null || selectedObjIdx < 0) return;
  const o = canvasObjects[selectedObjIdx];
  if(!o || o.angle === undefined) return;
  pushUndo();
  const step = 45;
  const snapped = Math.round(parseFloat(deg) / step) * step;
  o.angle = snapped * Math.PI / 180;
  const valEl = document.getElementById('angleVal');
  if(valEl) valEl.textContent = snapped + '°';
  const slider = document.getElementById('angleSlider');
  if(slider) slider.value = snapped;
  redraw();
}

function rotateSel(deltaDeg){
  if(selectedObjIdx === null || selectedObjIdx < 0) return;
  const o = canvasObjects[selectedObjIdx];
  if(!o || o.angle === undefined) return;
  pushUndo();
  const step = 45 * Math.PI / 180;
  const raw = (o.angle || 0) + deltaDeg * Math.PI / 180;
  o.angle = Math.round(raw / step) * step;
  updateRotCtrl();
  redraw();
}

function redraw(){
  if(!ctx||!canvasEl) return;
  drawField();
  canvasObjects.forEach((o,i)=>drawObj(o,selectedIndices.includes(i)||i===selectedObjIdx));
  // Resize handle only for single selection
  if(selectedIndices.length===1){
    const o=canvasObjects[selectedIndices[0]];
    if(o&&(o.type==='ball'||o.type==='equip'||o.type==='goal')) _drawResizeHandle(o);
  } else if(selectedIndices.length===0&&selectedObjIdx!==null&&selectedObjIdx>=0){
    const o=canvasObjects[selectedObjIdx];
    if(o&&(o.type==='ball'||o.type==='equip'||o.type==='goal')) _drawResizeHandle(o);
  }
  if(linePhase&&lineStart){
    ctx.save();ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(lineStart.x,lineStart.y,5,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  // Draw lasso rectangle
  if(isLasso&&lassoRect){
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
    ctx.fillStyle='rgba(255,255,255,.06)';
    const r=lassoRect;
    ctx.fillRect(r.x1,r.y1,r.x2-r.x1,r.y2-r.y1);
    ctx.strokeRect(r.x1,r.y1,r.x2-r.x1,r.y2-r.y1);
    ctx.setLineDash([]); ctx.restore();
  }
}

// ── FIELD ──
function drawField(){
  const W=canvasEl.offsetWidth||800;
  const H=canvasEl.offsetHeight||Math.round(W*0.6);
  const ft=document.getElementById('fieldType')?.value||'small';
  // Base grass gradient
  const grassGrad=ctx.createLinearGradient(0,0,0,H);
  grassGrad.addColorStop(0,'#2e7d32');
  grassGrad.addColorStop(.5,'#388e3c');
  grassGrad.addColorStop(1,'#2e7d32');
  ctx.fillStyle=grassGrad; ctx.fillRect(0,0,W,H);
  // Mowing stripes — quer zur Spielrichtung
  // Halbfeld + Strafraum: Spielrichtung vertikal → horizontale Streifen
  // alle anderen: Spielrichtung horizontal → vertikale Streifen
  const stripeCount=12;
  const stripeVert=(ft==='half'||ft==='penalty');
  for(let i=0;i<stripeCount;i++){
    ctx.fillStyle=i%2===0?'rgba(0,0,0,.06)':'rgba(255,255,255,.045)';
    if(stripeVert){
      ctx.fillRect(0,i*(H/stripeCount),W,H/stripeCount);
    } else {
      ctx.fillRect(i*(W/stripeCount),0,W/stripeCount,H);
    }
  }
  // Subtle vignette around edges
  const vig=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(0,0,0,.18)');
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
  // Lines
  ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);
  const p=Math.round(Math.min(W,H)*0.04);
  if(ft==='full')drawFull(W,H,p);
  else if(ft==='half')drawHalf(W,H,p);
  else if(ft==='small')drawSmall(W,H,p);
  else if(ft==='penalty')drawPenaltyBox(W,H,p);
  else if(ft==='sprint')drawSprintLane(W,H,p);
  else drawNeutral(W,H,p);
}

function sr(x,y,w,h){ctx.strokeRect(x,y,w,h);}
function sl(x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function sc(cx,cy,r,a1=0,a2=Math.PI*2){ctx.beginPath();ctx.arc(cx,cy,r,a1,a2);ctx.stroke();}
function dot(x,y,r=3){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.88)';ctx.fill();}

function drawFull(W,H,p){
  // FIFA 105m(horiz) × 68m(vert). Canvas W=105m axis, H=68m axis.
  const fw=W-p*2,fh=H-p*2;
  const sx=fw/105; // px per meter horizontally
  const sy=fh/68;  // px per meter vertically
  // Border + halfway line
  sr(p,p,fw,fh);
  sl(W/2,p,W/2,H-p);
  dot(W/2,H/2,3.5);
  // Centre circle r=9.15m (same scale in both dirs, use sy for radius)
  sc(W/2,H/2,9.15*sy);
  // Penalty areas: 40.32m wide (vertical) × 16.5m deep (horizontal)
  const paH=40.32*sy, paW=16.5*sx;
  sr(p,(H-paH)/2,paW,paH);           // left PA
  sr(W-p-paW,(H-paH)/2,paW,paH);     // right PA
  // Goal areas: 18.32m wide (vertical) × 5.5m deep (horizontal)
  const gaH=18.32*sy, gaW=5.5*sx;
  sr(p,(H-gaH)/2,gaW,gaH);
  sr(W-p-gaW,(H-gaH)/2,gaW,gaH);
  // Penalty spots: 11m from goal line (horizontal)
  const ps=11*sx;
  dot(p+ps,H/2,3); dot(W-p-ps,H/2,3);
  // Penalty arcs: r=9.15m — use sx so the arc is correctly sized relative to the 105m axis
  ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.72)';
  const arcR=9.15*sx;
  // Left arc — clip to right of PA line
  ctx.save();ctx.beginPath();ctx.rect(p+paW,0,W,H);ctx.clip();
  sc(p+ps,H/2,arcR);ctx.restore();
  // Right arc — clip to left of PA line
  ctx.save();ctx.beginPath();ctx.rect(0,0,W-p-paW,H);ctx.clip();
  sc(W-p-ps,H/2,arcR);ctx.restore();
  ctx.restore();
  // Goals BEHIND goal line (FIFA 7.32m × 2.44m)
  drawGoal(p, H/2, 'full', false, -Math.PI/2);
  drawGoal(W-p, H/2, 'full', false, Math.PI/2);
  // Corner arcs r=1m
  const ca=1*Math.min(sx,sy);
  sc(p,p,ca,0,Math.PI/2);
  sc(W-p,p,ca,Math.PI/2,Math.PI);
  sc(p,H-p,ca,-Math.PI/2,0);
  sc(W-p,H-p,ca,Math.PI,Math.PI*1.5);
}

function drawHalf(W,H,p){
  // Halbfeld FIFA: 68m breit × 52.5m tief — einheitlicher Maßstab, zentriert
  const s=Math.min((W-p*2)/68,(H-p*2)/52.5); // px pro Meter, uniform
  const fw=68*s, fh=52.5*s;
  const ox=(W-fw)/2, oy=(H-fh)/2; // Zentrierung
  // Außenlinien
  sr(ox,oy,fw,fh);
  // Mittellinie (oben)
  sl(ox,oy,ox+fw,oy);
  dot(ox+fw/2,oy,3.5);
  // Mittelkreis-Halbkreis (nur untere Hälfte sichtbar)
  sc(ox+fw/2,oy,9.15*s,0,Math.PI);
  // Strafraum: 40.32m × 16.5m
  const paW=40.32*s, paH=16.5*s;
  sr(ox+(fw-paW)/2, oy+fh-paH, paW, paH);
  // Torraum: 18.32m × 5.5m
  const gaW=18.32*s, gaH=5.5*s;
  sr(ox+(fw-gaW)/2, oy+fh-gaH, gaW, gaH);
  // Elfmeterpunkt
  const ps=11*s;
  dot(ox+fw/2, oy+fh-ps, 3);
  // Elfmeterbogen — nur außerhalb des Strafraums
  ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.72)';
  ctx.beginPath();ctx.rect(0,0,W,oy+fh-paH);ctx.clip();
  sc(ox+fw/2, oy+fh-ps, 9.15*s, 0, Math.PI*2);
  ctx.restore();
  // Tor hinter der Torlinie
  drawGoal(ox+fw/2, oy+fh, 'full', false, Math.PI);
}

function drawSmall(W,H,p){
  const fw=W-p*2,fh=H-p*2;
  sr(p,p,fw,fh); sl(W/2,p,W/2,H-p); dot(W/2,H/2,4);
  const sx=fw/30,sy=fh/20;
  const gaW=3*sx,gaH=8*sy;
  sr(p,(H-gaH)/2,gaW,gaH); sr(W-p-gaW,(H-gaH)/2,gaW,gaH);
}

function drawNeutral(W,H,p){
  const fw=W-p*2,fh=H-p*2;
  sr(p,p,fw,fh); sl(W/2,p,W/2,H-p); sl(p,H/2,W-p,H/2); dot(W/2,H/2,4);
}

// Nur Strafraum — FIFA: 40.32m breit × 16.5m tief
// Canvas: W-Achse=40.32m, H-Achse=16.5m + Tor-Tiefe
function drawPenaltyBox(W,H,p){
  // Strafraum: 40.32m breit, 16.5m tief + Bogen bis 20.15m → 21m Tiefe
  const fieldW=40.32, fieldH=21;
  const s=Math.min((W-p*2)/fieldW,(H-p*2)/fieldH);
  const fw=fieldW*s, fh=fieldH*s;
  const ox=(W-fw)/2, oy=p+(H-p*2-fh)/2;
  const paH=16.5*s;
  // Grundlinie über volle Canvas-Breite
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(p,oy);ctx.lineTo(W-p,oy);ctx.stroke();ctx.restore();
  // Strafraum-Seitenlinien + PA-Linie (ohne Torlinie — schon gezeichnet)
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(ox,oy);ctx.lineTo(ox,oy+paH);ctx.lineTo(ox+fw,oy+paH);ctx.lineTo(ox+fw,oy);
  ctx.stroke();ctx.restore();
  // Torraum (18.32m × 5.5m)
  const gaW=18.32*s, gaH=5.5*s;
  sr(ox+(fw-gaW)/2, oy, gaW, gaH);
  // Elfmeterpunkt (11m von Torlinie)
  const ps=11*s;
  dot(ox+fw/2, oy+ps, 3.5);
  // Elfmeterbogen — nur unterhalb der PA-Linie sichtbar
  ctx.save();
  ctx.beginPath();ctx.rect(0,oy+paH,W,H);ctx.clip();
  ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.72)';
  sc(ox+fw/2, oy+ps, 9.15*s, 0, Math.PI*2);
  ctx.restore();
  // Tor proportional zum Maßstab (7.32m × 2.44m)
  const gw=7.32*s, gh=2.44*s, postR=Math.max(1.5,s*0.12);
  const gx=ox+fw/2, gy=oy;
  ctx.save();ctx.translate(gx,gy);
  // Netz-Fill
  ctx.fillStyle='rgba(255,255,255,.06)';
  ctx.fillRect(-gw/2,-gh,gw,gh);
  // Netz-Linien
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=.6;
  for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(-gw/2+i*gw/8,-gh);ctx.lineTo(-gw/2+i*gw/8,0);ctx.stroke();}
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(-gw/2,-i*gh/4);ctx.lineTo(gw/2,-i*gh/4);ctx.stroke();}
  // Pfosten & Querlatte
  const pg=ctx.createLinearGradient(-postR,0,postR,0);
  pg.addColorStop(0,'#bdbdbd');pg.addColorStop(.35,'#fff');pg.addColorStop(1,'#9e9e9e');
  ctx.strokeStyle=pg;ctx.lineWidth=postR*2;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(-gw/2,-gh);ctx.lineTo(-gw/2,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(gw/2,-gh);ctx.lineTo(gw/2,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-gw/2,-gh);ctx.lineTo(gw/2,-gh);ctx.stroke();
  ctx.restore();
}

// Sprintbahn — 30m × 5m mit Abstandsmarkierungen alle 5m
function drawSprintLane(W,H,p){
  const fw=W-p*2, fh=H-p*2;
  const sx=fw/30; // px pro Meter entlang 30m
  // Rahmen
  sr(p,p,fw,fh);
  // Abstandsmarkierungen alle 5m
  for(let m=5;m<30;m+=5){
    const x=p+m*sx;
    ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.5;
    ctx.setLineDash([4,4]);
    sl(x,p,x,H-p);
    ctx.setLineDash([]);
    // Meter-Beschriftung
    ctx.fillStyle='rgba(255,255,255,.85)';
    ctx.font='bold 11px "Barlow Condensed",sans-serif';
    ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText(m+'m', x, p+4);
    ctx.textBaseline='bottom';
    ctx.fillText(m+'m', x, H-p-4);
  }
  // Start- und Endmarkierungen
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2.5;ctx.setLineDash([]);
  sl(p,p,p,H-p);sl(W-p,p,W-p,H-p);
  // Labels
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='bold 11px "Barlow Condensed",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText('0m', p, p+4);
  ctx.fillText('30m', W-p, p+4);
  ctx.textBaseline='bottom';
  ctx.fillText('0m', p, H-p-4);
  ctx.fillText('30m', W-p, H-p-4);
  // Feldbreite-Label
  ctx.fillStyle='rgba(255,255,255,.3)';ctx.font='bold 10px "Barlow Condensed",sans-serif';
  ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillText('5m', W-p-4, H/2);
  ctx.textAlign='left';
  ctx.fillText('SPRINTBAHN  30m × 5m', p+4, H/2);
}

// ── DRAW OBJECTS ──
function drawObj(o,sel){
  if(o.type==='pass')     drawArrowLine(o.x1,o.y1,o.x2,o.y2,'pass',sel);
  else if(o.type==='run') drawArrowLine(o.x1,o.y1,o.x2,o.y2,'run',sel);
  else if(o.type==='dribble') drawSnakeLine(o.x1,o.y1,o.x2,o.y2,sel);
  else if(o.type==='player')  drawPlayer(o.x,o.y,o.label,o.color,sel,o.angle||0);
  else if(o.type==='ball')    drawBall(o.x,o.y,sel,_objSc(o));
  else if(o.type==='equip')   drawEquip(o.x,o.y,o.subtype,sel,o.angle||0,_objSc(o));
  else if(o.type==='goal')    drawGoal(o.x,o.y,o.subtype,sel,o.angle||0,_objSc(o));
}
function _drawResizeHandle(o){
  const h=_resizeHandlePos(o);
  ctx.save();
  ctx.fillStyle='#fff'; ctx.strokeStyle='#333'; ctx.lineWidth=1.5;
  ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=3;
  ctx.beginPath();
  // Kleines Quadrat als Resize-Handle
  ctx.rect(h.x-4,h.y-4,8,8);
  ctx.fill(); ctx.stroke();
  // Diagonaler Pfeil-Hinweis
  ctx.shadowBlur=0; ctx.strokeStyle='#555'; ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(h.x-2,h.y+2);ctx.lineTo(h.x+2,h.y-2);ctx.stroke();
  ctx.restore();
}

// ── Arrow lines (pass / run) ──
function drawArrowLine(x1,y1,x2,y2,kind,sel){
  const isRun=kind==='run';
  const col=sel?'#555':'#111';
  const len=Math.hypot(x2-x1,y2-y1);
  if(len<4) return;
  ctx.save();
  // Shadow for depth
  ctx.shadowColor='rgba(0,0,0,.35)'; ctx.shadowBlur=3; ctx.shadowOffsetY=1;
  // Line
  ctx.strokeStyle=col; ctx.lineWidth=isRun?2:2.2;
  ctx.setLineDash(isRun?[9,5]:[]);
  ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.setLineDash([]);
  // Arrowhead — solid filled triangle
  const a=Math.atan2(y2-y1,x2-x1);
  const aw=isRun?15:12, ah=isRun?0.38:0.38;
  ctx.shadowBlur=0;
  ctx.fillStyle=col;
  ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-aw*Math.cos(a-ah), y2-aw*Math.sin(a-ah));
  ctx.lineTo(x2-aw*0.4*Math.cos(a), y2-aw*0.4*Math.sin(a));
  ctx.lineTo(x2-aw*Math.cos(a+ah), y2-aw*Math.sin(a+ah));
  ctx.closePath(); ctx.fill();
  // Start dot
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x1,y1,2.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Dribble / sine wave line ──
function drawSnakeLine(x1,y1,x2,y2,sel){
  _drawSine(x1,y1,x2,y2,sel?'#555':'#111',1);
}
function drawSinePreview(x1,y1,x2,y2,col){
  _drawSine(x1,y1,x2,y2,'#111',0);
}
function _drawSine(x1,y1,x2,y2,col,solid){
  const len=Math.hypot(x2-x1,y2-y1); if(len<4) return;
  const ang=Math.atan2(y2-y1,x2-x1);
  const waves=Math.max(2,Math.round(len/28));
  const amp=4;
  const steps=150;
  const aw=13, ah=0.35;
  ctx.save();
  ctx.translate(x1,y1); ctx.rotate(ang);
  ctx.shadowColor='rgba(0,0,0,.2)'; ctx.shadowBlur=2; ctx.shadowOffsetY=1;
  ctx.strokeStyle=col; ctx.lineWidth=1.2; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const px=t*(len-aw*0.6); // Welle endet vor Pfeilspitze
    const py=amp*Math.sin(t*waves*Math.PI*2);
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.stroke();
  ctx.shadowBlur=0;
  // Start dot
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
  // Pfeilspitze immer in Reiserichtung (+x lokal = ang in Weltkoordinaten)
  ctx.fillStyle=col;
  ctx.beginPath();
  ctx.moveTo(len,0);
  ctx.lineTo(len-aw*Math.cos(-ah), -aw*Math.sin(-ah));
  ctx.lineTo(len-aw*0.4, 0);
  ctx.lineTo(len-aw*Math.cos(ah), -aw*Math.sin(ah));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawRawPath(pts,col){
  if(pts.length<2) return;
  ctx.save();ctx.strokeStyle=col;ctx.lineWidth=2;
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();
}

// ── Player ──
function drawPlayer(x,y,lbl,col,sel,ang){
  const R=15;
  ctx.save();
  ctx.translate(x,y); ctx.rotate(ang);

  // Drop shadow
  ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowBlur=9; ctx.shadowOffsetY=3;
  ctx.fillStyle=col;
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;

  // Viewing-direction crescent — ring segment at outer edge only (center stays clear)
  const Ri=R*0.62; // inner radius: center bleibt frei, Ring dicker
  const a1=-Math.PI*0.85, a2=-Math.PI*0.15;
  ctx.fillStyle='#111';
  ctx.beginPath();
  ctx.arc(0,0,R,a1,a2);       // äußerer Bogen vorwärts
  ctx.arc(0,0,Ri,a2,a1,true); // innerer Bogen rückwärts
  ctx.closePath();
  ctx.fill();

  // Clean outer border
  ctx.strokeStyle=sel?'#ffe082':'rgba(255,255,255,.92)';
  ctx.lineWidth=sel?2.8:2;
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.stroke();

  // Label — shifted slightly toward the colored half (downward in local space)
  const bright=['#f9a825','#fff176','#ffffff','#e0e0e0'].includes(col);
  ctx.fillStyle=bright?'#111':'#fff';
  ctx.font=`bold ${lbl&&lbl.length>2?8:11}px "Barlow Condensed",sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(lbl||'',0,4);

  // Selection halo
  if(sel){
    ctx.strokeStyle='rgba(255,224,130,.55)'; ctx.lineWidth=1.5;
    ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.arc(0,0,R+5,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// ── Ball ──
function drawBall(x,y,sel,sc){
  const R=13;
  const pr=R*0.306, dr=R*0.620;
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(sc||1,sc||1);
  ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=7; ctx.shadowOffsetY=3;
  ctx.fillStyle='#f4f4f4';
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;
  const bVerts=(px,py,r,rot)=>{const v=[];for(let i=0;i<5;i++){const a=i*Math.PI*2/5+rot;v.push([px+r*Math.cos(a),py+r*Math.sin(a)]);}return v;};
  const fillP=v=>{ctx.beginPath();v.forEach(([vx,vy],i)=>i?ctx.lineTo(vx,vy):ctx.moveTo(vx,vy));ctx.closePath();ctx.fill();};
  const strokeP=v=>{ctx.beginPath();v.forEach(([vx,vy],i)=>i?ctx.lineTo(vx,vy):ctx.moveTo(vx,vy));ctx.closePath();ctx.stroke();};
  const near=(vArr,t)=>vArr.reduce((b,v)=>Math.hypot(v[0]-t[0],v[1]-t[1])<Math.hypot(b[0]-t[0],b[1]-t[1])?v:b);
  const cRot=-Math.PI/2;
  const cV=bVerts(0,0,pr,cRot);
  const ring=[];
  for(let i=0;i<5;i++){
    const ang=cRot+(2*i+1)*Math.PI/5;
    const rot=ang+Math.PI-Math.PI/5;
    ring.push({px:dr*Math.cos(ang),py:dr*Math.sin(ang),v:bVerts(dr*Math.cos(ang),dr*Math.sin(ang),pr,rot)});
  }
  ctx.save();
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.clip();
  ctx.fillStyle='#111';
  fillP(cV); ring.forEach(r=>fillP(r.v));
  ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=1.2; ctx.lineJoin='round'; ctx.lineCap='round';
  strokeP(cV); ring.forEach(r=>strokeP(r.v));
  cV.forEach((cv0,i)=>{
    const nA=near(ring[(i+4)%5].v,cv0), nB=near(ring[i].v,cv0);
    ctx.beginPath();ctx.moveTo(cv0[0],cv0[1]);ctx.lineTo(nA[0],nA[1]);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cv0[0],cv0[1]);ctx.lineTo(nB[0],nB[1]);ctx.stroke();
  });
  for(let i=0;i<5;i++){
    const rA=ring[i],rB=ring[(i+1)%5];
    const nA=near(rA.v,[rB.px,rB.py]), nB=near(rB.v,[rA.px,rA.py]);
    ctx.beginPath();ctx.moveTo(nA[0],nA[1]);ctx.lineTo(nB[0],nB[1]);ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle='#222'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.stroke();
  if(sel){
    ctx.strokeStyle='#ffe082'; ctx.lineWidth=2; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.arc(0,0,R+4,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// ── Equipment ──
function drawEquip(x,y,sub,sel,ang,sc){
  ctx.save();
  ctx.translate(x,y); ctx.rotate(ang||0); ctx.scale(sc||1,sc||1);
  ctx.shadowColor='rgba(0,0,0,.35)'; ctx.shadowBlur=5; ctx.shadowOffsetY=2;

  if(sub==='cone'||sub==='cone-orange'||sub==='cone-yellow'||sub==='cone-blue'||sub==='cone-red'){
    const cols={'cone':'#e65100','cone-orange':'#e65100','cone-yellow':'#f9a825','cone-blue':'#1565c0','cone-red':'#c62828'};
    const cc=cols[sub]||'#e65100';
    // Flatter cone — top cut off (trapezoid, no sharp tip)
    ctx.fillStyle=cc;
    ctx.beginPath();
    ctx.moveTo(-3,-9); ctx.lineTo(3,-9); // flat top
    ctx.lineTo(8,5); ctx.lineTo(-8,5); ctx.closePath(); ctx.fill();
    // Flat base
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.ellipse(0,7,10,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=cc;
    ctx.beginPath(); ctx.ellipse(0,6.5,9,2.5,0,0,Math.PI*2); ctx.fill();

  } else if(sub==='pole'){
    ctx.strokeStyle='#fdd835'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,-22); ctx.lineTo(0,20); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#f9a825';
    ctx.beginPath(); ctx.ellipse(0,20,5,2,0,0,Math.PI*2); ctx.fill();

  } else if(sub==='hurdle'){
    ctx.shadowBlur=0;
    ctx.shadowBlur=0;
    ctx.fillStyle='#111';
    ctx.fillRect(-12,-3,2.5,11); ctx.fillRect(9.5,-3,2.5,11);
    ctx.fillRect(-14,8,6,2); ctx.fillRect(8,8,6,2);
    ctx.fillStyle='#fdd835';
    ctx.fillRect(-12,-5,24,4.5);

  } else if(sub==='ladder'){
    const lw=11, lh=52, rungs=7;
    ctx.shadowBlur=0;
    // Rails — uniform color
    ctx.strokeStyle='#fdd835'; ctx.lineWidth=2.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-lw/2,-lh/2); ctx.lineTo(-lw/2,lh/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lw/2,-lh/2); ctx.lineTo(lw/2,lh/2); ctx.stroke();
    ctx.lineWidth=2;
    const gap=lh/rungs;
    for(let i=0;i<=rungs;i++){
      const ry=Math.round(-lh/2+i*gap);
      ctx.beginPath(); ctx.moveTo(-lw/2,ry); ctx.lineTo(lw/2,ry); ctx.stroke();
    }

  } else if(sub==='ring'){
    ctx.shadowBlur=0;
    // Flat ring — simple thick circle, no 3D ellipse
    ctx.strokeStyle='#fdd835'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.stroke();
  }

  if(sel){
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,224,130,.6)'; ctx.lineWidth=1.2; ctx.setLineDash([3,3]);
    ctx.strokeRect(-18,-26,36,52); ctx.setLineDash([]);
  }
  ctx.restore();
}

// ── Goal with realistic net ──
function drawGoal(x,y,sub,sel,ang,sc){
  ctx.save();
  ctx.translate(x,y); ctx.rotate(ang); ctx.scale(sc||1,sc||1);
  // FIFA-Proportionen: Grosstor 7.32m, Jugendtor 5m, Minitor 3m
  const [gw,gh]=sub==='mini'?[28,20]:sub==='youth'?[48,28]:[76,36];
  const postR=sub==='full'?3:2;

  // Drop shadow
  ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=10; ctx.shadowOffsetY=4;
  ctx.fillStyle='rgba(0,0,0,.01)'; // trigger shadow
  ctx.fillRect(-gw/2-postR,-gh-postR,gw+postR*2,gh+postR);

  ctx.shadowBlur=0; ctx.shadowOffsetY=0;

  // Net fill
  ctx.fillStyle=sel?'rgba(255,224,130,.07)':'rgba(255,255,255,.06)';
  ctx.beginPath();
  ctx.moveTo(-gw/2+postR,0);
  ctx.lineTo(-gw/2+postR,-gh+postR);
  ctx.lineTo(gw/2-postR,-gh+postR);
  ctx.lineTo(gw/2-postR,0);
  ctx.closePath(); ctx.fill();

  // Net lines — fine grid
  const nc=sel?'rgba(255,224,130,.3)':'rgba(255,255,255,.25)';
  ctx.strokeStyle=nc; ctx.lineWidth=.7; ctx.setLineDash([]);
  const vn=sub==='mini'?5:sub==='youth'?8:12;
  const hn=sub==='mini'?4:sub==='youth'?5:7;
  for(let i=1;i<vn;i++){
    const nx=-gw/2+postR+i*((gw-postR*2)/vn);
    ctx.beginPath(); ctx.moveTo(nx,0); ctx.lineTo(nx,-gh+postR); ctx.stroke();
  }
  for(let i=1;i<hn;i++){
    const ny=-i*((gh-postR)/hn);
    ctx.beginPath(); ctx.moveTo(-gw/2+postR,ny); ctx.lineTo(gw/2-postR,ny); ctx.stroke();
  }
  // Diagonal depth lines
  ctx.strokeStyle=sel?'rgba(255,224,130,.1)':'rgba(255,255,255,.08)';
  ctx.lineWidth=.5;
  ctx.beginPath(); ctx.moveTo(-gw/2+postR,0); ctx.lineTo(0,-gh*.55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gw/2-postR,0); ctx.lineTo(0,-gh*.55); ctx.stroke();

  // Posts and crossbar — rounded, with gradient
  const pg=ctx.createLinearGradient(-postR,0,postR,0);
  pg.addColorStop(0,'#bdbdbd'); pg.addColorStop(.35,'#ffffff'); pg.addColorStop(1,'#9e9e9e');
  ctx.strokeStyle=sel?'#ffe082':pg;
  ctx.lineWidth=postR*2; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=4; ctx.shadowOffsetY=2;
  // Left post
  ctx.beginPath(); ctx.moveTo(-gw/2,-gh); ctx.lineTo(-gw/2,0); ctx.stroke();
  // Right post
  ctx.beginPath(); ctx.moveTo(gw/2,-gh); ctx.lineTo(gw/2,0); ctx.stroke();
  // Crossbar
  ctx.beginPath(); ctx.moveTo(-gw/2,-gh); ctx.lineTo(gw/2,-gh); ctx.stroke();

  // Post end caps
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;
  ctx.fillStyle=sel?'#ffe082':'#e0e0e0';
  ctx.beginPath(); ctx.arc(-gw/2,-gh,postR,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(gw/2,-gh,postR,0,Math.PI*2); ctx.fill();

  // Ground line
  ctx.strokeStyle=sel?'rgba(255,224,130,.7)':'rgba(255,255,255,.6)';
  ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-gw/2,0); ctx.lineTo(gw/2,0); ctx.stroke();

  // Selection halo
  if(sel){
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,224,130,.45)'; ctx.lineWidth=1.2; ctx.setLineDash([4,4]);
    ctx.strokeRect(-gw/2-8,-gh-8,gw+16,gh+16); ctx.setLineDash([]);
  }
  ctx.restore();
}

// ── UNDO/CLEAR/EXPORT ──
function pushUndo(){undoStack.push(JSON.stringify(canvasObjects));if(undoStack.length>40)undoStack.shift();}
function undoDraw(){if(!undoStack.length){showToast('Nichts rückgängig');return;}canvasObjects=JSON.parse(undoStack.pop());redraw();}
function clearCanvas(){if(!confirm('Diagramm leeren?'))return;pushUndo();canvasObjects=[];playerCounters={};linePhase=0;lineStart=null;isDribbling=false;dribblePoints=[];selectedObjIdx=null;redraw();}
// ── CROP DIALOG ──────────────────────────────────────
let _cropImg=null, _cropRect={x:0,y:0,w:0,h:0};
let _cropHandle=null, _cropDragStart=null, _cropRectStart=null;
let _cropCallback=null, _cropCvEl=null, _cropCtx2=null;
const _HSIZE=12;

function _getCropBounds(){
  if(!canvasEl||!canvasObjects.length)return null;
  const W=canvasEl.offsetWidth, H=canvasEl.offsetHeight;
  let x0=W,y0=H,x1=0,y1=0;
  canvasObjects.forEach(o=>{
    if(o.type==='pass'||o.type==='run'||o.type==='dribble'){
      x0=Math.min(x0,o.x1,o.x2);y0=Math.min(y0,o.y1,o.y2);
      x1=Math.max(x1,o.x1,o.x2);y1=Math.max(y1,o.y1,o.y2);
    } else if(o.x!==undefined){
      const r=_baseR(o)*_objSc(o)+8;
      x0=Math.min(x0,o.x-r);y0=Math.min(y0,o.y-r);
      x1=Math.max(x1,o.x+r);y1=Math.max(y1,o.y+r);
    }
  });
  const pad=48;
  return{
    x:Math.max(0,x0-pad), y:Math.max(0,y0-pad),
    w:Math.min(W,x1+pad)-Math.max(0,x0-pad),
    h:Math.min(H,y1+pad)-Math.max(0,y0-pad),
    origW:W, origH:H
  };
}

function _drawCropOverlay(){
  if(!_cropCtx2||!_cropImg)return;
  const dW=_cropCvEl.offsetWidth, dH=_cropCvEl.offsetHeight;
  _cropCtx2.clearRect(0,0,dW,dH);
  _cropCtx2.drawImage(_cropImg,0,0,dW,dH);
  const{x,y,w,h}=_cropRect;
  _cropCtx2.fillStyle='rgba(0,0,0,.55)';
  _cropCtx2.fillRect(0,0,dW,dH);
  // punch out crop area
  _cropCtx2.save();
  _cropCtx2.globalCompositeOperation='destination-out';
  _cropCtx2.fillStyle='rgba(0,0,0,1)';
  _cropCtx2.fillRect(x,y,w,h);
  _cropCtx2.restore();
  // redraw image in crop area on top
  _cropCtx2.drawImage(_cropImg,
    x/_cropCvEl.offsetWidth*_cropImg.width,
    y/_cropCvEl.offsetHeight*_cropImg.height,
    w/_cropCvEl.offsetWidth*_cropImg.width,
    h/_cropCvEl.offsetHeight*_cropImg.height,
    x,y,w,h);
  // border
  _cropCtx2.strokeStyle='#fff';
  _cropCtx2.lineWidth=2;
  _cropCtx2.strokeRect(x,y,w,h);
  // corner handles
  [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([hx,hy])=>{
    _cropCtx2.fillStyle='#fff';
    _cropCtx2.beginPath();
    _cropCtx2.arc(hx,hy,_HSIZE/2,0,Math.PI*2);
    _cropCtx2.fill();
  });
}

function _cropPos(e){
  const r=_cropCvEl.getBoundingClientRect();
  const sx=_cropCvEl.offsetWidth/r.width;
  return{x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sx};
}

function _cropHit(px,py){
  const{x,y,w,h}=_cropRect, t=_HSIZE;
  if(Math.hypot(px-x,py-y)<t)return'nw';
  if(Math.hypot(px-(x+w),py-y)<t)return'ne';
  if(Math.hypot(px-x,py-(y+h))<t)return'sw';
  if(Math.hypot(px-(x+w),py-(y+h))<t)return'se';
  if(px>x&&px<x+w&&py>y&&py<y+h)return'move';
  return null;
}

function _openCropDialog(fullDataUrl, autoBounds, callback){
  _cropCallback=callback;
  openMod('cropMod');
  setTimeout(()=>{
    _cropCvEl=document.getElementById('cropCanvas');
    const img=new Image();
    img.onload=()=>{
      _cropImg=img;
      const dpr=window.devicePixelRatio||1;
      const dW=_cropCvEl.offsetWidth;
      const dH=Math.round(dW*(img.height/img.width));
      _cropCvEl.width=dW*dpr; _cropCvEl.height=dH*dpr;
      _cropCvEl.style.height=dH+'px';
      _cropCtx2=_cropCvEl.getContext('2d');
      _cropCtx2.scale(dpr,dpr);
      if(autoBounds){
        const sx=dW/autoBounds.origW, sy=dH/autoBounds.origH;
        _cropRect={x:autoBounds.x*sx,y:autoBounds.y*sy,w:autoBounds.w*sx,h:autoBounds.h*sy};
      } else {
        _cropRect={x:0,y:0,w:dW,h:dH};
      }
      _drawCropOverlay();
      _cropCvEl.onmousedown=e=>{
        const p=_cropPos(e);
        _cropHandle=_cropHit(p.x,p.y);
        _cropDragStart=p; _cropRectStart={..._cropRect};
      };
      _cropCvEl.onmousemove=e=>{
        const p=_cropPos(e);
        if(!_cropHandle){
          const h=_cropHit(p.x,p.y);
          _cropCvEl.style.cursor=h==='move'?'grab':h?'nwse-resize':'crosshair';
          return;
        }
        const dx=p.x-_cropDragStart.x, dy=p.y-_cropDragStart.y;
        const r={..._cropRectStart};
        const dW2=_cropCvEl.offsetWidth, dH2=_cropCvEl.offsetHeight, MIN=40;
        if(_cropHandle==='move'){
          r.x=Math.max(0,Math.min(dW2-r.w,r.x+dx));
          r.y=Math.max(0,Math.min(dH2-r.h,r.y+dy));
        } else {
          if(_cropHandle==='nw'){r.x+=dx;r.y+=dy;r.w-=dx;r.h-=dy;}
          else if(_cropHandle==='ne'){r.w+=dx;r.y+=dy;r.h-=dy;}
          else if(_cropHandle==='sw'){r.x+=dx;r.w-=dx;r.h+=dy;}
          else if(_cropHandle==='se'){r.w+=dx;r.h+=dy;}
          if(r.w<MIN){r.w=MIN;if(_cropHandle.includes('w'))r.x=_cropRectStart.x+_cropRectStart.w-MIN;}
          if(r.h<MIN){r.h=MIN;if(_cropHandle.includes('n'))r.y=_cropRectStart.y+_cropRectStart.h-MIN;}
          r.x=Math.max(0,r.x); r.y=Math.max(0,r.y);
          if(r.x+r.w>dW2)r.w=dW2-r.x;
          if(r.y+r.h>dH2)r.h=dH2-r.y;
        }
        _cropRect=r; _drawCropOverlay();
      };
      _cropCvEl.onmouseup=()=>{_cropHandle=null;};
      _cropCvEl.ontouchstart=e=>{e.preventDefault();const t=e.touches[0];_cropCvEl.onmousedown({clientX:t.clientX,clientY:t.clientY});};
      _cropCvEl.ontouchmove=e=>{e.preventDefault();const t=e.touches[0];_cropCvEl.onmousemove({clientX:t.clientX,clientY:t.clientY});};
      _cropCvEl.ontouchend=()=>{_cropHandle=null;};
    };
    img.src=fullDataUrl;
  },80);
}

function confirmCrop(){
  if(!_cropImg||!_cropCallback)return;
  const dW=_cropCvEl.offsetWidth, dH=_cropCvEl.offsetHeight;
  const sx=_cropImg.width/dW, sy=_cropImg.height/dH;
  const srcX=Math.round(_cropRect.x*sx), srcY=Math.round(_cropRect.y*sy);
  const srcW=Math.round(_cropRect.w*sx), srcH=Math.round(_cropRect.h*sy);
  const off=document.createElement('canvas');
  off.width=srcW; off.height=srcH;
  off.getContext('2d').drawImage(_cropImg,srcX,srcY,srcW,srcH,0,0,srcW,srcH);
  const croppedUrl=off.toDataURL('image/png');
  closeMod('cropMod');
  _cropCallback(croppedUrl);
}

function exportCanvas(){
  if(!canvasEl){showToast('Kein Feld','err');return;}
  selectedObjIdx=null; selectedIndices=[]; redraw();
  const fullDataUrl=canvasEl.toDataURL('image/png');
  const autoBounds=canvasObjects.length?_getCropBounds():null;

  _openCropDialog(fullDataUrl, autoBounds, (croppedUrl)=>{
    if(_cvMode==='submit'){
      submitCanvasData=croppedUrl;
      const wrap=document.getElementById('sPreviewWrap');
      const img=document.getElementById('sPreviewImg');
      if(wrap&&img){img.src=croppedUrl;wrap.style.display='block';}
      if(typeof updateSubmitChecklist==='function') updateSubmitChecklist();
      showToast('Felddiagramm übernommen');
      closeFieldOverlay();
    } else if(_cvMode==='catalog-edit'){
      const e=exercises.find(x=>x.id===_catalogEditExId);
      if(e){
        e.canvasObjects=[...canvasObjects];
        e.image=croppedUrl;
        save();
        renderSection();
        // Persist image + canvas_objects to Supabase
        if(_supabase&&apiOnline){
          uploadImageToStorage(croppedUrl).then(url=>{
            const imgUrl=url||croppedUrl;
            e.image=imgUrl;
            _supabase.from('exercises').update({image:imgUrl,canvas_objects:canvasObjects}).eq('id',_catalogEditExId);
            renderSection();
          });
        }
        showToast('Felddiagramm gespeichert');
      }
      closeFieldOverlay();
    } else {
      formImg=croppedUrl;
      const prev=document.getElementById('cvPreview');
      const prevImg=document.getElementById('cvPreviewImg');
      if(prev&&prevImg){prevImg.src=formImg;prev.style.display='block';}
      showToast('Felddiagramm übernommen');
      closeFieldOverlay();
    }
  });
}

// DeepL integration placeholder:
// async function translateWithDeepL(text, targetLang) {
//   const API_KEY = 'YOUR_DEEPL_API_KEY';
//   const res = await fetch('https://api-free.deepl.com/v2/translate', {
//     method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'},
//     body: new URLSearchParams({ auth_key: API_KEY, text, target_lang: targetLang.toUpperCase() })
//   });
//   const data = await res.json();
//   return data.translations?.[0]?.text || text;
