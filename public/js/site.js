/* Kr. A. Vik – klientskript: meny, samtykke, kart og biletvising. */
(function () {
  'use strict';

  /* ---------- Mobilmeny ---------- */
  var nav = document.querySelector('.hovudnav');
  var navKnapp = document.querySelector('.nav-knapp');
  if (nav && navKnapp) {
    navKnapp.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      navKnapp.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
        nav.setAttribute('data-open', 'false');
        navKnapp.setAttribute('aria-expanded', 'false');
        navKnapp.focus();
      }
    });
  }

  /* ---------- Samtykke ----------
     Nettsida set ingen sporingskapslar. Samtykket gjeld berre eksternt
     innhald (Google Maps) og blir lagra i localStorage – aldri sendt til oss. */
  var NOKKEL = 'kravik_samtykke_v1';
  var panel = document.getElementById('samtykke');

  function lesSamtykke() {
    try {
      return JSON.parse(localStorage.getItem(NOKKEL));
    } catch (e) {
      return null;
    }
  }

  function lagreSamtykke(eksternt) {
    try {
      localStorage.setItem(NOKKEL, JSON.stringify({ eksternt: eksternt, tid: new Date().toISOString() }));
    } catch (e) { /* private mode o.l. */ }
  }

  function lastKart(holdar) {
    var src = holdar.getAttribute('data-kart-src');
    if (!src || holdar.querySelector('iframe')) return;
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = 'Kart som viser kvar du finn oss (Google Maps)';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allowFullscreen = true;
    holdar.textContent = '';
    holdar.appendChild(iframe);
  }

  function lastAlleKart() {
    document.querySelectorAll('.kart-holdar[data-kart-src]').forEach(lastKart);
  }

  function visPanel() {
    if (panel) panel.hidden = false;
  }

  function gohymPanel() {
    if (panel) panel.hidden = true;
  }

  var samtykke = lesSamtykke();
  if (!samtykke) {
    visPanel();
  } else if (samtykke.eksternt) {
    lastAlleKart();
  }

  document.querySelectorAll('[data-samtykke]').forEach(function (knapp) {
    knapp.addEventListener('click', function () {
      var alle = knapp.getAttribute('data-samtykke') === 'alle';
      lagreSamtykke(alle);
      gohymPanel();
      if (alle) lastAlleKart();
    });
  });

  document.querySelectorAll('[data-opne-samtykke]').forEach(function (knapp) {
    knapp.addEventListener('click', function () {
      visPanel();
      var forste = panel && panel.querySelector('button');
      if (forste) forste.focus();
    });
  });

  /* «Vis kart»-knappen gjeld som samtykke til eksternt innhald */
  document.querySelectorAll('[data-last-kart]').forEach(function (knapp) {
    knapp.addEventListener('click', function () {
      lagreSamtykke(true);
      gohymPanel();
      lastAlleKart();
    });
  });

  /* ---------- Før/etter-glidar (prosjektsider) ---------- */
  document.querySelectorAll('[data-foretter]').forEach(function (boks) {
    var slider = boks.querySelector('.foretter-slider');
    if (!slider) return;
    var oppdater = function () {
      boks.style.setProperty('--pos', slider.value + '%');
    };
    slider.addEventListener('input', oppdater);
    oppdater();
  });

  /* ---------- Omtale-karusell (5+ omtalar) ----------
     Blar automatisk til neste kort kvart 4,5 sekund. Stoppar når brukaren
     held peikaren over, tek på skjermen eller fokuserer – og heilt av ved
     prefers-reduced-motion. */
  var band = document.querySelector('[data-karusell]');
  if (band && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var pause = false;
    ['pointerenter', 'touchstart', 'focusin'].forEach(function (ev) {
      band.addEventListener(ev, function () { pause = true; }, { passive: true });
    });
    ['pointerleave', 'focusout'].forEach(function (ev) {
      band.addEventListener(ev, function () { pause = false; });
    });
    setInterval(function () {
      if (pause || document.hidden) return;
      var kort = band.querySelector('.referanse');
      if (!kort) return;
      var steg = kort.offsetWidth + 18; // kortbreidd + gap
      if (band.scrollLeft + band.clientWidth >= band.scrollWidth - 10) {
        band.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        band.scrollBy({ left: steg, behavior: 'smooth' });
      }
    }, 4500);
  }

  /* ---------- Biletvising (lysbilete) med blaing ----------
     Alle bilete med .galleri-knapp på sida utgjer eitt «album»: bla med
     pilknappane, piltastane (←/→, Home/End) eller sveip på mobil. */
  var dialog = document.querySelector('.lysbilete');
  if (dialog && typeof dialog.showModal === 'function') {
    var bilete = dialog.querySelector('img');
    var lukk = dialog.querySelector('.lysbilete-lukk');
    var teljar = dialog.querySelector('.lysbilete-teljar');
    var forrige = dialog.querySelector('.lysbilete-forrige');
    var neste = dialog.querySelector('.lysbilete-neste');
    var knappar = Array.prototype.slice.call(document.querySelectorAll('.galleri-knapp'));
    var index = 0;

    dialog.classList.toggle('lysbilete-aaleine', knappar.length < 2);

    function vis(i) {
      if (!knappar.length) return;
      index = ((i % knappar.length) + knappar.length) % knappar.length;
      var k = knappar[index];
      bilete.src = k.getAttribute('data-lysbilete');
      bilete.alt = k.getAttribute('data-alt') || '';
      if (teljar) teljar.textContent = knappar.length > 1 ? (index + 1) + ' / ' + knappar.length : '';
      // Last naboane i bakgrunnen, så blainga kjennest augneblikkeleg
      if (knappar.length > 1) {
        [index + 1, index - 1].forEach(function (j) {
          var n = knappar[((j % knappar.length) + knappar.length) % knappar.length];
          new Image().src = n.getAttribute('data-lysbilete');
        });
      }
    }

    knappar.forEach(function (knapp, i) {
      knapp.addEventListener('click', function () {
        vis(i);
        dialog.showModal();
      });
    });

    if (forrige) forrige.addEventListener('click', function () { vis(index - 1); });
    if (neste) neste.addEventListener('click', function () { vis(index + 1); });

    dialog.addEventListener('keydown', function (e) {
      if (knappar.length < 2) return;
      if (e.key === 'ArrowRight') { vis(index + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { vis(index - 1); e.preventDefault(); }
      else if (e.key === 'Home') { vis(0); e.preventDefault(); }
      else if (e.key === 'End') { vis(knappar.length - 1); e.preventDefault(); }
    });

    /* Sveip på mobil */
    var sveipStart = null;
    var sveipte = false;
    dialog.addEventListener('pointerdown', function (e) { sveipStart = e.clientX; });
    dialog.addEventListener('pointerup', function (e) {
      if (sveipStart === null) return;
      var dx = e.clientX - sveipStart;
      sveipStart = null;
      if (Math.abs(dx) > 48 && knappar.length > 1) {
        sveipte = true;
        vis(index + (dx < 0 ? 1 : -1));
      }
    });

    lukk.addEventListener('click', function () {
      dialog.close();
    });

    dialog.addEventListener('click', function (e) {
      if (sveipte) { sveipte = false; return; }
      if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', function () {
      bilete.src = '';
    });
  }
})();
