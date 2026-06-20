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

// ══════════════════════════════════════════════════════
// DEFAULT DATA
// ══════════════════════════════════════════════════════
