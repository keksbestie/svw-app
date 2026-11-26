// ════════════════════════════════════════════════════════════
// MODUL: GEFÜHRTE TOUR
// (aus index.html ausgelagert, Inhalt unverändert)
// ════════════════════════════════════════════════════════════
(function(){
  const STEPS=[
    {
      page:null,target:null,
      title:'Geführte Tour',
      text:'Wir gehen jetzt die wichtigsten Bereiche gemeinsam durch. Du kannst jederzeit mit ✕ abbrechen.'
    },
    {
      page:'handbook',target:'[data-page="handbook"]',pos:'top',
      mob:{target:'.bnav-item[data-page="handbook"]'},
      title:'Übungskatalog',
      text:'Nutze Filter, Tags und die Suche, um schnell die passende Übung zu finden.'
    },
    {
      page:'handbook',target:'[onclick*="addToPlanOrPick"]',pos:'top',
      title:'Übung zum Plan hinzufügen',
      text:'Mit dem <strong>+ Plan</strong>-Button auf jeder Übungskarte fügst du sie direkt deinem Trainingsplan hinzu.',
      fallbackTarget:'.card-collapsed, .card',
      mob:{text:'Mit dem <strong>+ Plan</strong>-Button auf jeder Übungskarte fügst du sie direkt deinem Trainingsplan hinzu. Tippe auf eine Karte, um die Details zu sehen.'}
    },
    {
      page:'planner',target:'[data-page="planner"]',pos:'top',
      mob:{target:'.bnav-item[data-page="planner"]',text:'Alle hinzugefügten Übungen erscheinen hier. Reihenfolge per Ziehen ändern, Zeit mit − / + anpassen und eine Zieldauer setzen.'},
      title:'Trainingsplan',
      text:'Alle hinzugefügten Übungen erscheinen hier. Reihenfolge per Drag & Drop ändern, Zeit mit − / + anpassen und eine Zieldauer setzen.'
    },
    {
      page:'planner',target:'#planSaveBtn, .plan-save, [onclick*="savePlan"]',pos:'bottom',
      title:'Plan speichern & drucken',
      text:'Gespeicherte Pläne bleiben in deinem Konto. Das Drucksymbol exportiert den fertigen Plan als PDF – inklusive Materialliste.',
      fallbackTarget:'.plan-toolbar, #plannerToolbar, .planner-header',
      mob:{target:'#page-planner .bpl.gr, #page-planner .bpl'}
    },
    {
      page:'planner',target:'.mb[data-page="calendar"]',pos:'bottom',
      title:'Kalender',
      text:'Beim Speichern eines Plans kannst du die Einheit im <strong>Kalender</strong> ablegen. Dort siehst du später, was du an welchem Tag trainiert hast, öffnest den ganzen Plan und kopierst ihn auf einen neuen Tag.',
      mob:{target:'#bnavMore',pos:'top',text:'Beim Speichern eines Plans kannst du die Einheit im <strong>Kalender</strong> ablegen (unter <strong>Mehr</strong>). Dort siehst du später, was du an welchem Tag trainiert hast, öffnest den ganzen Plan und kopierst ihn auf einen neuen Tag.'}
    },
    {
      page:'handbook',target:'#navKaderBtn',pos:'bottom',
      title:'Mein Kader',
      text:'Mit Konto findest du <strong>Mein Kader</strong> oben bzw. im Einstellungsmenü: Dort legst du Spieler:innen (mit Notizen in einer eigenen Kartei) und dein Trainerteam an und wählst vor dem Training aus, wer heute dabei ist.',
      fallbackTarget:'#cfgBtn, .topbar .cfg-row',
      mob:{target:'#bnavMore',pos:'top',text:'Unter <strong>Mehr</strong> findest du <strong>Mein Kader</strong>: Dort legst du Spieler:innen (mit Notizen in einer eigenen Kartei) und dein Trainerteam an und wählst vor dem Training aus, wer heute dabei ist.'}
    },
    {
      page:'home',target:'#offersBtn, .home-card--offers',pos:'bottom',
      title:'Angebote',
      text:'Hier findest du die <strong>Angebote</strong> (auch über das Zahnrad oben rechts): Gäste, Basic, Basic +, Advanced, Pro und Verein. Gäste und Basic sind immer kostenlos, Basic +, Advanced und Verein bis 30.06.2027.',
      fallbackTarget:'#cfgBtn',
      mob:{target:'#offersBtn, .home-card--offers',fallbackTarget:'#bnavMore',text:'Hier findest du die <strong>Angebote</strong> (auch unter <strong>Mehr</strong>): Gäste, Basic, Basic +, Advanced, Pro und Verein. Gäste und Basic sind immer kostenlos, Basic +, Advanced und Verein bis 30.06.2027.'}
    },
    {
      page:'handbook',target:'button[onclick*="toggleHelpPanel"], .cfg-btn[title*="Hilfe"]',pos:'bottom',
      title:'Hilfe jederzeit abrufbar',
      text:'Das <strong>?</strong>-Symbol öffnet das Hilfe-Center mit Detailanleitung zu allen Funktionen – jederzeit erreichbar.',
      fallbackTarget:'.cfg-row',
      mob:{target:'#bnavMore',pos:'top',text:'Unter <strong>Mehr</strong> öffnet <strong>Hilfe</strong> das Hilfe-Center mit Detailanleitungen zu allen Funktionen – jederzeit erreichbar.'}
    }
  ];

  function _mobile(){return window.innerWidth<768;}
  // Nur sichtbare Elemente zählen (versteckte Desktop-Elemente würden sonst oben links hervorgehoben)
  function _visible(el){
    if(!el||!el.getClientRects().length)return false;
    const r=el.getBoundingClientRect(), cs=getComputedStyle(el);
    return r.width>0&&r.height>0&&cs.visibility!=='hidden';
  }
  function _eff(s){return (_mobile()&&s.mob)?Object.assign({},s,s.mob):s;}

  let _step=0;

  function _firstVisible(list){
    for(const sel of list.split(',')){
      const els=document.querySelectorAll(sel.trim());
      for(const el of els) if(_visible(el)) return el;
    }
    return null;
  }
  function _getTarget(s){
    s=_eff(s);
    if(!s.target)return null;
    return _firstVisible(s.target)||(s.fallbackTarget?_firstVisible(s.fallbackTarget):null);
  }

  function _positionBubble(target, onDone){
    const bubble=document.getElementById('tourBubble');
    const hl=document.getElementById('tourHighlight');
    const arrow=document.getElementById('tourArrow');
    if(!bubble)return;
    if(!target){
      hl.style.display='none';
      bubble.style.left='50%'; bubble.style.top='50%';
      bubble.style.bottom='auto'; bubble.style.transform='translate(-50%,-50%)';
      if(arrow)arrow.style.display='none';
      if(onDone)onDone();
      return;
    }
    // Hohe Ziele (z. B. Angebotskarten am Handy) oben ausrichten, damit die Sprechblase darunter Platz hat
    const _tall=target.getBoundingClientRect().height>window.innerHeight*0.4;
    target.scrollIntoView({behavior:'auto',block:_tall?'start':'center'});
    if(_tall) window.scrollBy(0,-(_mobile()?72:110));
    setTimeout(function(){
      const r=target.getBoundingClientRect();
      const vw=window.innerWidth, vh=window.innerHeight;
      const pad=8;
      hl.style.display='block';
      hl.style.left=(r.left-pad)+'px'; hl.style.top=(r.top-pad)+'px';
      hl.style.width=(r.width+pad*2)+'px'; hl.style.height=(r.height+pad*2)+'px';
      bubble.style.transform='none';
      const bw=Math.min(bubble.offsetWidth||300,vw-24);
      const spaceBelow=vh-r.bottom, spaceAbove=r.top;
      const bh=bubble.offsetHeight||200;
      let left=Math.max(12,Math.min(r.left,vw-bw-12));
      bubble.style.bottom='auto'; bubble.style.left=left+'px';
      if(spaceBelow>bh+30||spaceBelow>spaceAbove){
        bubble.style.top=Math.max(8,Math.min(r.bottom+14,vh-bh-8))+'px';
        if(arrow){arrow.style.display='block';arrow.style.top='-6px';arrow.style.left=(r.left+r.width/2-left-6)+'px';arrow.style.bottom='auto';}
      } else {
        bubble.style.top=Math.max(8,r.top-14-bh)+'px';
        if(arrow){arrow.style.display='block';arrow.style.bottom='-6px';arrow.style.top='auto';arrow.style.left=(r.left+r.width/2-left-6)+'px';}
      }
      // Passt die Sprechblase nicht neben das Ziel (z. B. sehr hohes Ziel), sitzt sie am unteren Bildschirmrand
      const br0=bubble.getBoundingClientRect();
      if(br0.bottom>vh-8&&spaceBelow<=bh+30&&spaceAbove<=bh+30){
        bubble.style.left=Math.max(12,(vw-bw)/2)+'px';
        bubble.style.top=Math.max(8,vh-bh-(_mobile()?76:16))+'px';
        if(arrow)arrow.style.display='none';
      }
      if(onDone)onDone();
    },300);
  }

  function _updateContent(){
    const s=STEPS[_step];
    document.getElementById('tourStepLabel').textContent='Schritt '+(_step+1)+' / '+STEPS.length;
    const es=_eff(s);
    document.getElementById('tourTitle').textContent=es.title;
    document.getElementById('tourText').innerHTML=es.text;
    const dc=document.getElementById('tourDots');
    if(dc)dc.innerHTML=STEPS.map(function(_,i){return '<span style="width:'+(i===_step?'16':'7')+'px;height:7px;border-radius:4px;background:'+(i===_step?'var(--accent)':'var(--border)')+';display:inline-block;transition:all .2s;"></span>';}).join('');
    const prev=document.getElementById('tourPrevBtn');
    const next=document.getElementById('tourNextBtn');
    if(prev)prev.style.visibility=_step===0?'hidden':'visible';
    if(next)next.textContent=_step===STEPS.length-1?'Fertig ✓':'Weiter →';
  }

  function _renderStep(){
    const s=STEPS[_step];
    const bubble=document.getElementById('tourBubble');
    const inner=bubble.firstElementChild;
    // Inhalt kurz ausblenden, Blase und Hervorhebung gleiten danach gemeinsam zum neuen Ziel
    if(inner){inner.style.transition='opacity .16s ease';inner.style.opacity='0';}
    setTimeout(function(){
      _updateContent();
      if(s.page&&typeof goPage==='function') goPage(s.page);
      const _ring=(s.page==='home'&&window._ringFocus&&window._ringFocus('.home-card--offers'));
      const t0=Date.now();
      (function wait(){
        const ready=_ring?(window._ringSettled&&window._ringSettled()||Date.now()-t0>5000):Date.now()-t0>(s.page?500:0);
        if(!ready){setTimeout(wait,80);return;}
        _positionBubble(_getTarget(s), function(){ if(inner)inner.style.opacity='1'; });
      })();
    },170);
  }

  window.startTour=function(){
    document.body.style.overflow='hidden';
    _step=0;
    const bubble=document.getElementById('tourBubble');
    const hl=document.getElementById('tourHighlight');
    bubble.style.transition='none';
    bubble.style.display='block'; bubble.style.opacity='1';
    hl.style.display='block';
    _updateContent();
    _positionBubble(_getTarget(STEPS[0]), function(){
      requestAnimationFrame(function(){ bubble.style.transition='opacity .25s ease'; });
    });
  };
  window.tourStep=function(dir){
    const next=_step+dir;
    if(next>=STEPS.length){endTour();return;}
    if(next<0)return;
    _step=next;
    _renderStep();
  };
  window.addEventListener('resize',function(){
    const b=document.getElementById('tourBubble');
    if(b&&b.style.display==='block') _positionBubble(_getTarget(STEPS[_step]),function(){});
  });
  window.endTour=function(){
    document.body.style.overflow='';
    document.getElementById('tourBubble').style.display='none';
    document.getElementById('tourHighlight').style.display='none';
  };
})();
