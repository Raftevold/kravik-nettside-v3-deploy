/* Admin: stadfesting før sletting/import, mal-knappar, adresseforslag og
   «hugs kvar eg var»-oppførsel etter lagring. */
(function () {
  'use strict';
  var dirty=false;
  document.querySelectorAll('form[data-dirty-form],form.admin-skjema').forEach(function(form){
    form.addEventListener('input',function(){dirty=true;document.querySelectorAll('[data-save-state]').forEach(function(el){el.textContent='Du har endringar som ikkje er lagra.';});});
    form.addEventListener('change',function(){dirty=true;});
    form.addEventListener('submit',function(e){if(!e.defaultPrevented)dirty=false;});
  });
  window.addEventListener('beforeunload',function(e){if(dirty){e.preventDefault();e.returnValue='';}});
  document.querySelectorAll('.admin-biletveljar').forEach(function(select){
    select.addEventListener('change',function(){
      var field=select.closest('.felt');var preview=field&&field.querySelector('.admin-miniatyr');
      if(!preview){preview=document.createElement('img');preview.className='admin-miniatyr';preview.alt='Valt bilete';preview.width=120;field.appendChild(preview);}
      preview.hidden=!select.value;if(select.value)preview.src='/media/'+encodeURIComponent(select.value)+'-sm.webp';else preview.removeAttribute('src');
    });
  });
  document.querySelectorAll('form[data-stadfest]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-stadfest'))) e.preventDefault();
    });
  });

  /* Etter lagring blir sida lasta på nytt – hugs difor kva blokker som var
     opne og kor langt ned du var, og gjenopprett det (eingongs). */
  var tilstandsNokkel = 'kravik-admin-tilstand:' + location.pathname;
  try {
    var lagraTilstand = JSON.parse(sessionStorage.getItem(tilstandsNokkel) || 'null');
    if (lagraTilstand) {
      sessionStorage.removeItem(tilstandsNokkel);
      var alleDetaljar = document.querySelectorAll('details.admin-detalj');
      (lagraTilstand.opne || []).forEach(function (i) {
        if (alleDetaljar[i]) alleDetaljar[i].open = true;
      });
      if (typeof lagraTilstand.scroll === 'number') {
        window.scrollTo(0, lagraTilstand.scroll);
      }
    }
  } catch (e) { /* sessionStorage utilgjengeleg – heilt ok */ }

  document.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return; // avbroten stadfesting
    try {
      var opne = [];
      document.querySelectorAll('details.admin-detalj').forEach(function (d, i) {
        if (d.open) opne.push(i);
      });
      sessionStorage.setItem(tilstandsNokkel, JSON.stringify({ opne: opne, scroll: window.scrollY }));
    } catch (err) { /* ok */ }
  });

  var malFelt = document.getElementById('hurtig-text');
  document.querySelectorAll('[data-mal]').forEach(function (knapp) {
    knapp.addEventListener('click', function () {
      if (malFelt) {
        malFelt.value = knapp.getAttribute('data-mal');
        malFelt.focus();
      }
    });
  });

  /* Adresse-autoforslag frå Kartverket sitt opne API (ws.geonorge.no).
     Når brukaren vel eit forslag, blir koordinatane lagra i skjulte felt,
     slik at nettsida automatisk kan vise kart for adressa. */
  document.querySelectorAll('[data-adresse-sok]').forEach(function (input) {
    var datalist = document.getElementById(input.getAttribute('list'));
    var latFelt = document.getElementById(input.getAttribute('data-lat'));
    var lngFelt = document.getElementById(input.getAttribute('data-lng'));
    var status = document.getElementById(input.getAttribute('data-status'));
    if (!datalist || !latFelt || !lngFelt) return;
    var forslag = {};
    var timer;
    var sekvens = 0; // vern mot at eit TREGT svar overskriv forslaga frå eit nyare søk

    input.addEventListener('input', function () {
      var verdi = input.value;
      if (forslag[verdi]) {
        latFelt.value = forslag[verdi].lat;
        lngFelt.value = forslag[verdi].lon;
        if (status) status.textContent = '✓ Adresse funnen – kartet blir vist automatisk på sida';
        return;
      }
      latFelt.value = '';
      lngFelt.value = '';
      if (status) status.textContent = '';
      clearTimeout(timer);
      var q = verdi.trim();
      if (q.length < 4) return;
      timer = setTimeout(function () {
        var minSekvens = ++sekvens;
        fetch('https://ws.geonorge.no/adresser/v1/sok?treffPerSide=8&sok=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (json) {
            if (minSekvens !== sekvens) return; // eit nyare søk er alt sendt – forkast dette svaret
            datalist.textContent = '';
            forslag = {};
            (json.adresser || []).forEach(function (a) {
              if (!a.representasjonspunkt) return;
              var tekst = a.adressetekst + ', ' + a.postnummer + ' ' + a.poststed;
              forslag[tekst] = a.representasjonspunkt;
              var opt = document.createElement('option');
              opt.value = tekst;
              datalist.appendChild(opt);
            });
          })
          .catch(function () { /* nettverksfeil – forslaga uteblir, feltet verkar som vanleg */ });
      }, 250);
    });
  });
})();
