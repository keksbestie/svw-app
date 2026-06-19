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
  // Strafraum: 40.32m breit, 16.5m tief (PA-Linie)
  // Sichtbarer Bereich: Torlinie oben + 16.5m PA + Bogenlücke bis 20.15m → ~21m Tiefe
  // Einheitlicher Maßstab, zentriert
  const fieldW=40.32, fieldH=21; // m
  const s=Math.min((W-p*2)/fieldW,(H-p*2)/fieldH);
  const fw=fieldW*s, fh=fieldH*s;
  const ox=(W-fw)/2, oy=p+(H-p*2-fh)/2;
  // Strafraum-Außenlinien (Torlinie oben, PA-Linie bei 16.5m)
  const paH=16.5*s;
  sr(ox, oy, fw, paH);
  // Torraum (18.32m × 5.5m)
  const gaW=18.32*s, gaH=5.5*s;
  sr(ox+(fw-gaW)/2, oy, gaW, gaH);
  // Elfmeterpunkt (11m von Torlinie)
  const ps=11*s;
  dot(ox+fw/2, oy+ps, 3.5);
  // Elfmeterbogen — nur unterhalb der PA-Linie sichtbar
  ctx.save();
  ctx.beginPath();ctx.rect(0, oy+paH, W, H);ctx.clip();
  ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.72)';
  sc(ox+fw/2, oy+ps, 9.15*s, 0, Math.PI*2);
  ctx.restore();
  // Tor hinter der Torlinie
  drawGoal(ox+fw/2, oy, 'full', false, 0);
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
  _drawSine(x1,y1,x2,y2,sel?'#c8e6c9':'#81c784',1);
}
function drawSinePreview(x1,y1,x2,y2,col){
  _drawSine(x1,y1,x2,y2,col,0);
}
function _drawSine(x1,y1,x2,y2,col,solid){
  const len=Math.hypot(x2-x1,y2-y1); if(len<4) return;
  const ang=Math.atan2(y2-y1,x2-x1);
  const waves=Math.max(2,Math.round(len/30));
  const amp=6; // schmaler
  const steps=120;
  const aw=15, ah=0.38; // größere Pfeilspitze
  ctx.save();
  ctx.translate(x1,y1); ctx.rotate(ang);
  ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=3; ctx.shadowOffsetY=1;
  ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.lineCap='round'; ctx.lineJoin='round';
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
