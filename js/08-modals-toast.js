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

// ══════════════════════════════════════════════════════
// DEFAULT DATA
// ══════════════════════════════════════════════════════
