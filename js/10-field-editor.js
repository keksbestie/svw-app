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
let linePhase=0, lineStart=null;
let dribblePoints=[], isDribbling=false;
let canvasEl=null, ctx=null, _cvInited=false;
let _cvMode='edit'; // 'edit' = Übung bearbeiten, 'submit' = Übung einreichen

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
function hitAt(x,y){
  for(let i=canvasObjects.length-1;i>=0;i--){
    const o=canvasObjects[i];
    if((o.type==='player'||o.type==='ball'||o.type==='equip'||o.type==='goal')&&Math.hypot(x-o.x,y-o.y)<22) return i;
    if((o.type==='pass'||o.type==='run'||o.type==='dribble')&&ptNearSeg(x,y,o.x1,o.y1,o.x2,o.y2,12)) return i;
  }
  return -1;
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
    const i=hitAt(x,y);
    if(i>=0){
      selectedObjIdx=i; isDraggingObj=true;
      const o=canvasObjects[i];
      dragOffX=x-(o.x??o.x1??o.pts?.[0]?.x??0);
      dragOffY=y-(o.y??o.y1??o.pts?.[0]?.y??0);
    } else {
      selectedObjIdx=null; // click empty = deselect
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
  if(isDraggingObj&&selectedObjIdx!==null){
    const o=canvasObjects[selectedObjIdx];
    if(o.x!==undefined){o.x=x-dragOffX;o.y=y-dragOffY;}
    else if(o.x1!==undefined&&o.x2!==undefined){const dx=x-dragOffX-o.x1,dy=y-dragOffY-o.y1;o.x1+=dx;o.y1+=dy;o.x2+=dx;o.y2+=dy;}
    else if(o.pts){const dx=x-dragOffX-(o.pts[0].x||0),dy=y-dragOffY-(o.pts[0].y||0);o.pts=o.pts.map(p=>({x:p.x+dx,y:p.y+dy}));}
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
    ctx.strokeStyle=currentTool==='pass'?'rgba(255,255,255,.5)':'rgba(255,224,130,.5)';
    ctx.lineWidth=2; ctx.setLineDash(currentTool==='run'?[7,5]:[]);
    ctx.beginPath();ctx.moveTo(lineStart.x,lineStart.y);ctx.lineTo(x,y);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
  }
}
function cvUp({x,y}){
  if(isDraggingObj){isDraggingObj=false;redraw();return;}
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
    canvasObjects.push({type:'ball',x,y});
  } else if(t==='equip'){
    canvasObjects.push({type:'equip',subtype:document.getElementById('equipType')?.value||'cone',x,y,angle:0});
  } else if(t==='goal'){
    canvasObjects.push({type:'goal',subtype:document.getElementById('goalType')?.value||'mini',x,y,angle:0});
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
  if(e.key === 'Delete' || e.key === 'Backspace'){
    // Only if canvas is active (not in an input/textarea)
    const tag = document.activeElement.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if(selectedObjIdx !== null && selectedObjIdx >= 0 && canvasObjects[selectedObjIdx]){
      pushUndo();
      canvasObjects.splice(selectedObjIdx, 1);
      selectedObjIdx = null;
      redraw();
      showToast('Objekt gelöscht');
    }
  }
});

// ── ROTATION CONTROLS ────────────────────────────────
function updateRotCtrl(){
  const ctrl = document.getElementById('rotCtrl');
  const slider = document.getElementById('angleSlider');
  const valEl = document.getElementById('angleVal');
  if(!ctrl) return;
  if(selectedObjIdx !== null && selectedObjIdx >= 0 && canvasObjects[selectedObjIdx]){
    const o = canvasObjects[selectedObjIdx];
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
  canvasObjects.forEach((o,i)=>drawObj(o,i===selectedObjIdx));
  // line start indicator
  if(linePhase&&lineStart){
    ctx.save();ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(lineStart.x,lineStart.y,5,0,Math.PI*2);ctx.fill();ctx.restore();
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
  // Mowing stripes — alternating light/dark bands
  const stripeCount=10;
  for(let i=0;i<stripeCount;i++){
    const sy=i*(H/stripeCount);
    ctx.fillStyle=i%2===0?'rgba(0,0,0,.06)':'rgba(255,255,255,.045)';
    ctx.fillRect(0,sy,W,H/stripeCount);
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
  // Penalty arcs: r=9.15m, show only part outside PA
  ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.72)';
  const arcR=9.15*sy;
  // Left arc: opens to the right (toward center)
  sc(p+ps,H/2,arcR,-0.93,0.93);
  // Right arc: opens to the left
  sc(W-p-ps,H/2,arcR,Math.PI-0.93,Math.PI+0.93);
  ctx.restore();
  // Goals (FIFA 7.32m × 2.44m)
  drawGoal(p, H/2, 'full', false, Math.PI/2);
  drawGoal(W-p, H/2, 'full', false, -Math.PI/2);
  // Corner arcs r=1m
  const ca=1*Math.min(sx,sy);
  sc(p,p,ca,0,Math.PI/2);
  sc(W-p,p,ca,Math.PI/2,Math.PI);
  sc(p,H-p,ca,-Math.PI/2,0);
  sc(W-p,H-p,ca,Math.PI,Math.PI*1.5);
}

function drawHalf(W,H,p){
  // Half field landscape: 68m(horiz=W) × 52.5m(vert=H)
  // Halfway line at top, goal line at bottom
  const fw=W-p*2, fh=H-p*2;
  const sx=fw/68;   // px per meter horizontal (along 68m touchline)
  const sy=fh/52.5; // px per meter vertical   (along 52.5m length)
  // Border
  sr(p,p,fw,fh);
  // Halfway line at top
  sl(p,p,W-p,p);
  dot(W/2,p,3.5);
  // Centre circle arc (only half visible at top)
  sc(W/2,p,9.15*sx,0,Math.PI);
  // Penalty area: 40.32m wide (horiz), 16.5m deep (vert from bottom)
  const paW=40.32*sx, paH=16.5*sy;
  sr((W-paW)/2, H-p-paH, paW, paH);
  // Goal area: 18.32m wide (horiz), 5.5m deep (vert)
  const gaW=18.32*sx, gaH=5.5*sy;
  sr((W-gaW)/2, H-p-gaH, gaW, gaH);
  // Penalty spot: 11m from goal line (vert)
  const ps=11*sy;
  dot(W/2, H-p-ps, 3);
  // Penalty arc: r=9.15m, clipped so it never crosses the PA line
  ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.72)';
  // Clip to area ABOVE the PA top edge (i.e. exclude everything below H-p-paH)
  ctx.beginPath();
  ctx.rect(0, 0, W, H-p-paH);
  ctx.clip();
  sc(W/2, H-p-ps, 9.15*sx, 0, Math.PI*2);
  ctx.restore();
  // Goal (FIFA 7.32m × 2.44m)
  drawGoal(W/2, H-p, 'full', false, Math.PI);
}

function drawSmall(W,H,p){
  // Kleinfeld: typical 30×20m, mini goals
  const fw=W-p*2,fh=H-p*2;
  sr(p,p,fw,fh); sl(W/2,p,W/2,H-p); dot(W/2,H/2,4);
  // Small goal areas (3m wide each side)
  const sx=fw/30,sy=fh/20;
  const gaW=3*sx,gaH=8*sy;
  sr(p,(H-gaH)/2,gaW,gaH); sr(W-p-gaW,(H-gaH)/2,gaW,gaH);
  // Mini goals
  drawGoal(p, H/2, 'mini', false, Math.PI/2);
  drawGoal(W-p, H/2, 'mini', false, -Math.PI/2);
}

function drawNeutral(W,H,p){
  const fw=W-p*2,fh=H-p*2;
  sr(p,p,fw,fh); sl(W/2,p,W/2,H-p); sl(p,H/2,W-p,H/2); dot(W/2,H/2,4);
}

// Nur Strafraum — FIFA: 40.32m breit × 16.5m tief
// Canvas: W-Achse=40.32m, H-Achse=16.5m + Tor-Tiefe
function drawPenaltyBox(W,H,p){
  const fw=W-p*2, fh=H-p*2;
  // Strafraum füllt die ganze Zeichenfläche
  // sx: px pro Meter entlang 40.32m, sy: px pro Meter entlang ~20m (PA+goal)
  const totalM=20; // ~16.5m PA + 2.44m Tor + ~1m Abstand
  const sx=fw/40.32, sy=fh/totalM;
  // Außenlinie (Torauslinie oben, Seitenlinien, PA-Linie unten)
  sr(p,p,fw,fh);
  // Torraum (FIFA: 18.32m × 5.5m)
  const gaW=18.32*sx, gaH=5.5*sy;
  sr(p+(fw-gaW)/2, p, gaW, gaH);
  // Elfmeterpunkt (11m von Torlinie)
  const ps=11*sy;
  dot(W/2, p+ps, 3.5);
  // Elfmeterbogen (r=9.15m) — nur Teil außerhalb des PA
  ctx.save();
  ctx.beginPath();ctx.rect(0,p+16.5*sy,W,H);ctx.clip(); // nur unterhalb der PA-Linie
  ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.72)';
  sc(W/2, p+ps, 9.15*sy, 0, Math.PI*2);
  ctx.restore();
  // Tor (FIFA: 7.32m × 2.44m) — Pfosten oberhalb der Torlinie (Netz geht nach oben weg)
  const gW=7.32*sx, gD=2.44*sy;
  const gx=(W-gW)/2, gy=p;
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx,gy-gD);ctx.lineTo(gx+gW,gy-gD);ctx.lineTo(gx+gW,gy);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=.6;
  for(let i=1;i<5;i++){const nx=gx+i*(gW/5);ctx.beginPath();ctx.moveTo(nx,gy);ctx.lineTo(nx,gy-gD);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(gx,gy-gD/2);ctx.lineTo(gx+gW,gy-gD/2);ctx.stroke();
  ctx.restore();
  // Label
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.font='bold 10px "Barlow Condensed",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='bottom';
  ctx.fillText('STRAFRAUM  40.32m × 16.5m', W/2, H-4);
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
  else if(o.type==='ball')    drawBall(o.x,o.y,sel);
  else if(o.type==='equip')   drawEquip(o.x,o.y,o.subtype,sel,o.angle||0);
  else if(o.type==='goal')    drawGoal(o.x,o.y,o.subtype,sel,o.angle||0);
}

// ── Arrow lines (pass / run) ──
function drawArrowLine(x1,y1,x2,y2,kind,sel){
  const isRun=kind==='run';
  const col=sel?'#ffe082':isRun?'#ffd740':'rgba(255,255,255,.95)';
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
  const aw=isRun?10:12, ah=isRun?0.42:0.38;
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
  _drawSine(x1,y1,x2,y2,sel?'#c8e6c9':'#81c784',1);
}
function drawSinePreview(x1,y1,x2,y2,col){
  _drawSine(x1,y1,x2,y2,col,0);
}
function _drawSine(x1,y1,x2,y2,col,solid){
  const len=Math.hypot(x2-x1,y2-y1); if(len<4) return;
  const ang=Math.atan2(y2-y1,x2-x1);
  const waves=Math.max(2,Math.round(len/28)); // eine Welle pro ~28px
  const amp=10; // Amplitude in px
  const steps=120;
  ctx.save();
  ctx.translate(x1,y1); ctx.rotate(ang);
  ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=3; ctx.shadowOffsetY=1;
  ctx.strokeStyle=col; ctx.lineWidth=2.2; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const px=t*len;
    const py=amp*Math.sin(t*waves*Math.PI*2);
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.stroke();
  ctx.shadowBlur=0;
  // Start dot
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
  // Arrowhead at end (along travel direction, adjusted for sine exit angle)
  const tEnd=(steps-1)/steps, tPrev=(steps-2)/steps;
  const ex=len, ey=amp*Math.sin(tEnd*waves*Math.PI*2);
  const px2=tPrev*len, py2=amp*Math.sin(tPrev*waves*Math.PI*2);
  const a2=Math.atan2(ey-py2,ex-px2);
  const aw=11, ah=0.42;
  ctx.fillStyle=col;
  ctx.beginPath();
  ctx.moveTo(ex,ey);
  ctx.lineTo(ex-aw*Math.cos(a2-ah),ey-aw*Math.sin(a2-ah));
  ctx.lineTo(ex-aw*0.4*Math.cos(a2),ey-aw*0.4*Math.sin(a2));
  ctx.lineTo(ex-aw*Math.cos(a2+ah),ey-aw*Math.sin(a2+ah));
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

  // Viewing-direction wedge — solid black sector (top quarter: -135° → -45°)
  ctx.fillStyle='#111';
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.arc(0,0,R,-Math.PI*3/4,-Math.PI/4);
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
function drawBall(x,y,sel){
  const R=11;
  ctx.save();
  ctx.translate(x,y);
  ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowBlur=10; ctx.shadowOffsetY=5;
  // Weißer Basiskörper mit Glanzgradient
  const grad=ctx.createRadialGradient(-R*.3,-R*.38,R*.08,0,0,R);
  grad.addColorStop(0,'#ffffff');
  grad.addColorStop(0.55,'#e8e8e8');
  grad.addColorStop(1,'#aaaaaa');
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;
  // Klassisches Fußball-Muster: 1 zentrales Pentagon + 5 außen
  // Zentrales Pentagon oben
  const drawPenta=(cx,cy,r)=>{
    ctx.beginPath();
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5-Math.PI/2;
      i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a))
           :ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
    }
    ctx.closePath();
  };
  ctx.fillStyle='#1a1a1a';
  // Mittleres Pentagon
  drawPenta(0,-R*.12,R*.32); ctx.fill();
  // 5 außenliegende Pentagone
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5-Math.PI/2;
    const d=R*.66;
    drawPenta(d*Math.cos(a),d*Math.sin(a),R*.22); ctx.fill();
  }
  // Feine Nähte zwischen den Pentagonen
  ctx.strokeStyle='rgba(80,80,80,.5)'; ctx.lineWidth=.6;
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5-Math.PI/2;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(R*.55*Math.cos(a),R*.55*Math.sin(a));
    ctx.stroke();
  }
  // Außenring
  ctx.strokeStyle='#555'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.stroke();
  // Glanzfleck oben links
  ctx.fillStyle='rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(-R*.28,-R*.33,R*.2,R*.13,-0.5,0,Math.PI*2); ctx.fill();
  // Selektion
  if(sel){
    ctx.strokeStyle='#ffe082'; ctx.lineWidth=2;
    ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.arc(0,0,R+5,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// ── Equipment ──
function drawEquip(x,y,sub,sel,ang){
  ctx.save();
  ctx.translate(x,y); ctx.rotate(ang||0);
  ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=6; ctx.shadowOffsetY=2;

  if(sub==='cone'){
    // 3D cone: body + ellipse base + highlight stripe
    const cg=ctx.createLinearGradient(-9,7,9,7);
    cg.addColorStop(0,'#e65100'); cg.addColorStop(.4,'#ff6f00'); cg.addColorStop(1,'#e65100');
    ctx.fillStyle=cg;
    ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(-9,7); ctx.lineTo(9,7); ctx.closePath(); ctx.fill();
    // White stripe
    ctx.save(); ctx.clip();
    ctx.fillStyle='rgba(255,255,255,.6)';
    ctx.fillRect(-9,0,18,3);
    ctx.restore();
    // Ellipse base
    ctx.fillStyle='#bf360c';
    ctx.beginPath(); ctx.ellipse(0,7,9,3.5,0,0,Math.PI*2); ctx.fill();
    // Highlight
    ctx.fillStyle='rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.moveTo(-1,-14); ctx.lineTo(-6,4); ctx.lineTo(-2,4); ctx.closePath(); ctx.fill();

  } else if(sub==='pole'){
    // Realistic slalom pole: gradient + flag-like top
    const pg=ctx.createLinearGradient(-2,0,2,0);
    pg.addColorStop(0,'#fff176'); pg.addColorStop(.5,'#ffd600'); pg.addColorStop(1,'#f9a825');
    ctx.strokeStyle=pg; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,-22); ctx.lineTo(0,20); ctx.stroke();
    // Base plate
    ctx.fillStyle='#f57f17';
    ctx.beginPath(); ctx.ellipse(0,20,5,2,0,0,Math.PI*2); ctx.fill();
    // Highlight on pole
    ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-1,-22); ctx.lineTo(-1,20); ctx.stroke();

  } else if(sub==='hurdle'){
    // Hurdle: red crossbar + dark legs + base plates
    // Legs
    ctx.fillStyle='#37474f';
    ctx.fillRect(-13,-5,3,13); ctx.fillRect(10,-5,3,13);
    // Base plates
    ctx.fillStyle='#263238';
    ctx.fillRect(-15,8,7,3); ctx.fillRect(8,8,7,3);
    // Crossbar gradient
    const hg=ctx.createLinearGradient(0,-6,0,-1);
    hg.addColorStop(0,'#ff1744'); hg.addColorStop(.5,'#ff5252'); hg.addColorStop(1,'#d50000');
    ctx.fillStyle=hg;
    ctx.beginPath(); ctx.rect(-13,-6,26,5); ctx.fill();
    // Highlight on crossbar
    ctx.fillStyle='rgba(255,255,255,.25)';
    ctx.fillRect(-12,-5.5,24,2);

  } else if(sub==='ladder'){
    // Coordination ladder: rails + colored rungs
    const lw=12, lh=48, rc=8;
    // Shadow base
    ctx.fillStyle='rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.ellipse(0,lh/2+2,8,3,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Rails
    const rg=ctx.createLinearGradient(-lw/2,0,lw/2,0);
    rg.addColorStop(0,'#f57f17'); rg.addColorStop(.5,'#ffd600'); rg.addColorStop(1,'#f57f17');
    ctx.strokeStyle=rg; ctx.lineWidth=2.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-lw/2,-lh/2); ctx.lineTo(-lw/2,lh/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lw/2,-lh/2); ctx.lineTo(lw/2,lh/2); ctx.stroke();
    // Rungs alternating
    for(let i=0;i<=rc;i++){
      const ry=-lh/2+i*(lh/rc);
      ctx.strokeStyle=i%2===0?'rgba(255,255,255,.9)':'rgba(255,214,0,.7)';
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-lw/2,ry); ctx.lineTo(lw/2,ry); ctx.stroke();
    }

  } else if(sub==='ring'){
    // Coordination ring: 3D look
    ctx.shadowBlur=4;
    const rog=ctx.createRadialGradient(0,0,6,0,0,13);
    rog.addColorStop(0,'#4fc3f7'); rog.addColorStop(1,'#0288d1');
    ctx.strokeStyle=rog; ctx.lineWidth=4.5;
    ctx.beginPath(); ctx.ellipse(0,3,12,5,0,0,Math.PI*2); ctx.stroke();
    // Inner highlight
    ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(-2,1,9,3.5,-.15,Math.PI*.9,Math.PI*1.6); ctx.stroke();
  }

  if(sel){
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,224,130,.6)'; ctx.lineWidth=1.2; ctx.setLineDash([3,3]);
    ctx.strokeRect(-18,-26,36,52); ctx.setLineDash([]);
  }
  ctx.restore();
}

// ── Goal with realistic net ──
function drawGoal(x,y,sub,sel,ang){
  ctx.save();
  ctx.translate(x,y); ctx.rotate(ang);
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
function exportCanvas(){
  if(!canvasEl){showToast('Kein Feld','err');return;}
  selectedObjIdx=null;redraw();
  const dataUrl=canvasEl.toDataURL('image/png');
  if(_cvMode==='submit'){
    submitCanvasData=dataUrl;
    const wrap=document.getElementById('sPreviewWrap');
    const img=document.getElementById('sPreviewImg');
    if(wrap&&img){img.src=dataUrl;wrap.style.display='block';}
    if(typeof updateSubmitChecklist==='function') updateSubmitChecklist();
  } else {
    formImg=dataUrl;
    const prev=document.getElementById('cvPreview');
    const prevImg=document.getElementById('cvPreviewImg');
    if(prev&&prevImg){prevImg.src=formImg;prev.style.display='block';}
  }
  showToast('Felddiagramm übernommen');
  closeFieldOverlay();
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
