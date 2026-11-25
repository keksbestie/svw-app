// ════════════════════════════════════════════════════════════
// MODUL: HILFECENTER
// (aus index.html ausgelagert, Inhalt unverändert)
// ════════════════════════════════════════════════════════════
let _helpCurrentTab='quick';
let _helpCurrentArea='all';

function switchHelpTab(tab){
  _helpCurrentTab=tab;
  document.getElementById('helpTabQuick').style.display=tab==='quick'?'flex':'none';
  document.getElementById('helpTabDetail').style.display=tab==='detail'?'flex':'none';
  document.getElementById('helpAreaFilter').style.display=tab==='detail'?'flex':'none';
  document.getElementById('helpSearchWrap').style.display=tab==='detail'?'block':'none';
  document.getElementById('helpTab-quick').style.background=tab==='quick'?'var(--accent)':'none';
  document.getElementById('helpTab-quick').style.color=tab==='quick'?'#fff':'var(--text-2)';
  document.getElementById('helpTab-quick').style.borderColor=tab==='quick'?'var(--accent)':'var(--border)';
  document.getElementById('helpTab-detail').style.background=tab==='detail'?'var(--accent)':'none';
  document.getElementById('helpTab-detail').style.color=tab==='detail'?'#fff':'var(--text-2)';
  document.getElementById('helpTab-detail').style.borderColor=tab==='detail'?'var(--accent)':'var(--border)';
  if(tab==='detail') filterHelpArea(_helpCurrentArea);
  const p=document.getElementById('helpPanel');if(p)p.scrollTop=0;
}

function filterHelpArea(area){
  _helpCurrentArea=area;
  document.querySelectorAll('.haf-btn').forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase().includes(area)||area==='all'&&b.textContent==='Alle'));
  filterHelpCards((document.getElementById('helpSearch')||{value:''}).value);
}

function filterHelpCards(q){
  const cards=document.querySelectorAll('#helpTabDetail .help-card');
  const ql=q.trim().toLowerCase();
  const sportId=window.currentSport&&window.currentSport.id;
  let visible=0;
  cards.forEach(c=>{
    const areaMatch=_helpCurrentArea==='all'||(c.dataset.area||'')=== _helpCurrentArea;
    const tags=(c.dataset.tags||'').toLowerCase();
    const text=c.textContent.toLowerCase();
    const textMatch=!ql||tags.includes(ql)||text.includes(ql);
    const sportOk=(!c.classList.contains('help-sport-fussball')||sportId==='fussball'||!sportId)
                &&(!c.classList.contains('help-sport-volleyball')||sportId==='volleyball')
                &&(!c.classList.contains('help-sport-tennis')||sportId==='tennis');
    const show=areaMatch&&textMatch&&sportOk;
    c.style.display=show?'':'none';
    if(show)visible++;
  });
  document.getElementById('helpNoResult').style.display=(visible===0&&(ql||_helpCurrentArea!=='all'))?'block':'none';
}
