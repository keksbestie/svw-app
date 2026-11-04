// ══════════════════════════════════════════════════════════════════
// MODUL: MODALS & TOAST-BENACHRICHTIGUNGEN
// ══════════════════════════════════════════════════════════════════
// Kleine Helfer zum Öffnen/Schließen von Dialogen und Toast-Meldungen.
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════
function openMod(id){document.getElementById(id).classList.remove('h');}
function closeMod(id){document.getElementById(id).classList.add('h');}
document.querySelectorAll('.mbg').forEach(b=>b.addEventListener('click',e=>{if(e.target===b)b.classList.add('h');}));

// ══════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════
function showToast(msg,type=''){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(type?' '+type:'');setTimeout(()=>t.className='toast',3200);}

async function sendFeedback(){
  const name=(document.getElementById('fbName').value||'').trim();
  const email=(document.getElementById('fbEmail').value||'').trim();
  const message=(document.getElementById('fbMessage').value||'').trim();
  if(!name){showToast('Bitte Namen eingeben','err');return;}
  if(!message){showToast('Bitte Nachricht eingeben','err');return;}
  const btn=document.querySelector('#feedbackMod .bpr');
  btn.textContent='Wird gesendet…';btn.disabled=true;
  try{
    await emailjs.send('service_7flvj0n','zadbnkd',{name,email:email||'Keine Angabe',message});
    showToast('Feedback gesendet – danke!');
    closeMod('feedbackMod');
    document.getElementById('fbName').value='';
    document.getElementById('fbEmail').value='';
    document.getElementById('fbMessage').value='';
  }catch(e){
    showToast('Fehler beim Senden – bitte nochmal versuchen','err');
  }finally{
    btn.textContent='Feedback absenden';btn.disabled=false;
  }
}

// ── Mobiles „Mehr“-Menü (Header-Menüs sind auf dem Handy ausgeblendet) ──
// Hinweis für Gäste: Funktion erst nach Anmeldung nutzbar, mit Verweis auf die Angebote
function showLoginRequired(what){
  document.getElementById('loginRequiredModal')?.remove();
  const m=document.createElement('div');
  m.id='loginRequiredModal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML='<div style="background:var(--surface);border-radius:16px;max-width:380px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center;">'
    +'<div style="font-size:34px;margin-bottom:8px;">🔒</div>'
    +'<div style="font-family:Barlow Condensed,sans-serif;font-size:21px;font-weight:900;margin-bottom:8px;">Bitte zuerst anmelden</div>'
    +'<div style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:18px;">'+esc(what||'Diese Funktion')+' kannst du nach der kostenlosen Anmeldung nutzen. Was dich sonst noch erwartet, findest du bei den Angeboten.</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px;">'
    +'<button class="bpr" data-act="login">Anmelden oder registrieren</button>'
    +'<button class="bsc" data-act="offers">Zu den Angeboten</button>'
    +'</div></div>';
  m.querySelector('[data-act=login]').onclick=()=>{m.remove();openLoginMod();};
  m.querySelector('[data-act=offers]').onclick=()=>{m.remove();goPage('angebote');};
  document.body.appendChild(m);
}
function closeMoreSheet(){document.getElementById('moreSheet')?.remove();}
function openMoreSheet(){
  closeMoreSheet();
  const loggedIn=!!(typeof currentUser!=='undefined'&&currentUser);
  const items=[['✏️','Übung einreichen',"goPage('submit')"]];
  if(loggedIn){
    items.push(['👤','Mein Account',"goPage('account')"]);
    items.push(['👥','Mein Kader',"goPage('kader')"]);
    if(typeof currentClub!=='undefined'&&currentClub) items.push(['🏟️','Mein Verein',"goPage('account');setTimeout(()=>switchAccTab('club'),50)"]);
  } else items.push(['🔑','Anmelden',"openLoginMod()"]);
  items.push(['🏷️','Angebote',"goPage('angebote')"]);
  items.push(['❓','Hilfe',"toggleHelpPanel()"]);
  items.push(['💬','Feedback senden',"openMod('feedbackMod')"]);
  const sheet=document.createElement('div');
  sheet.id='moreSheet';
  sheet.className='more-sheet';
  sheet.innerHTML='<div class="more-panel">'
    +items.map(i=>'<button class="more-item" onclick="closeMoreSheet();'+i[2]+'"><span class="more-ico">'+i[0]+'</span>'+i[1]+'</button>').join('')
    +'<div class="more-links"><a onclick="closeMoreSheet();goPage(\'impressum\')">Impressum</a><a onclick="closeMoreSheet();goPage(\'datenschutz\')">Datenschutz</a><a onclick="closeMoreSheet();goPage(\'agb\')">AGB</a></div>'
    +'</div>';
  sheet.addEventListener('click',e=>{if(e.target===sheet)closeMoreSheet();});
  document.body.appendChild(sheet);
}

// ══════════════════════════════════════════════════════
// DEFAULT DATA
// ══════════════════════════════════════════════════════
