// ════════════════════════════════════════════════════════════
// MODUL: ONBOARDING (WILLKOMMENS-FOLIEN)
// (aus index.html ausgelagert, Inhalt unverändert)
// ════════════════════════════════════════════════════════════
(function(){
  var _obSlide=0;
  var _obFiltered=[];

  function _getFilteredSlides(){
    var sport=(window.currentSport&&window.currentSport.id)||'fussball';
    return Array.from(document.querySelectorAll('.ob-slide')).filter(function(s){
      var ds=s.getAttribute('data-sport')||'all';
      if(ds==='all') return true;
      return ds.split(' ').indexOf(sport)!==-1;
    });
  }

  function _updateUI(){
    _obFiltered=_getFilteredSlides();
    var total=_obFiltered.length;
    // Hide all slides, show active
    document.querySelectorAll('.ob-slide').forEach(function(s){ s.style.display='none'; });
    if(_obFiltered[_obSlide]) _obFiltered[_obSlide].style.display='block';
    // Rebuild dots dynamically
    var dotsEl=document.getElementById('obDots');
    if(dotsEl){
      dotsEl.innerHTML='';
      for(var i=0;i<total;i++){
        var d=document.createElement('span');
        d.className='ob-dot'+(i===_obSlide?' ob-dot-active':'');
        dotsEl.appendChild(d);
      }
    }
    var isLast=_obSlide===total-1;
    var nextBtn=document.getElementById('obNextBtn');
    if(nextBtn){
      nextBtn.textContent=isLast?'Loslegen ✓':'Weiter →';
      nextBtn.onclick=isLast?function(){closeOnboarding();}:function(){obNext();};
    }
    var leftBtn=document.getElementById('obLeftBtn');
    if(leftBtn) leftBtn.textContent=_obSlide===0?'Überspringen':'← Zurück';
    var tourBtn=document.getElementById('obTourBtn');
    if(tourBtn) tourBtn.style.display=isLast?'block':'none';
  }

  function showOnboarding(){
    _obSlide=0;
    var el=document.getElementById('onboardingOverlay');
    if(el) el.style.display='flex';
    _updateUI();
  }
  window._showOnboarding=showOnboarding;
  window.closeOnboarding=function(){
    var el=document.getElementById('onboardingOverlay');
    if(el) el.style.display='none';
    try{localStorage.setItem('ac_onboarded','1');}catch(e){}
  };
  window.obNext=function(){
    _obFiltered=_getFilteredSlides();
    _obSlide=Math.min(_obSlide+1,_obFiltered.length-1);
    _updateUI();
  };
  window.obLeft=function(){
    if(_obSlide===0){closeOnboarding();}
    else{_obSlide--;_updateUI();}
  };
  // Zeigen wenn noch nicht gesehen
  try{
    if(!localStorage.getItem('ac_onboarded'))showOnboarding();
  }catch(e){showOnboarding();}
})();
