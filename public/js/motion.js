/* Kr. A. Vik – rørslelag (v3). Progressiv forbetring oppå site.js:
   scroll-avduking, teljarar, ambient canvas (vatn/lys), bølgje, dropeklikk,
   peikarglød og skrollmedviten header. Alt dekorativt, alt CSP-trygt (ingen
   inline-stilar – berre klassar og CSS-variablar via CSSOM), og alt av ved
   prefers-reduced-motion eller utan JS. */
(function () {
  'use strict';

  var redusert = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (redusert) return; // sida skal vere heilt i ro – v2-åtferd

  /* ---------- Rørsle-brytar (WCAG 2.2.2) ----------
     OS-innstillinga dekkjer ikkje alle: sida tilbyr sjølv ein synleg brytar
     i footeren. Valet ligg i localStorage og gjeld heile sida. */
  var RORSLE_NOKKEL = 'kravik_rorsle_v1';
  var rorsleAv = false;
  try {
    rorsleAv = localStorage.getItem(RORSLE_NOKKEL) === 'av';
  } catch (e) { /* privat modus o.l. */ }

  (function lagRorsleKnapp() {
    var liste = document.querySelector('.botn-juridisk ul');
    if (!liste) return;
    var li = document.createElement('li');
    var knapp = document.createElement('button');
    knapp.type = 'button';
    knapp.className = 'lenkeknapp';
    knapp.textContent = rorsleAv ? 'Slå på animasjonar' : 'Slå av animasjonar';
    knapp.addEventListener('click', function () {
      try {
        if (rorsleAv) localStorage.removeItem(RORSLE_NOKKEL);
        else localStorage.setItem(RORSLE_NOKKEL, 'av');
      } catch (e) { /* utan lagring gjeld valet berre til neste side */ }
      location.reload();
    });
    li.appendChild(knapp);
    liste.appendChild(li);
  })();

  if (rorsleAv) {
    document.documentElement.classList.add('rorsle-av');
    return; // CSS-en sikrar resten – ingenting meir skal initialiserast
  }

  var finPeikar = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var sparModus =
    (navigator.connection && navigator.connection.saveData) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  document.documentElement.classList.add('har-js');

  /* ---------- Scroll-avduking ----------
     Elementa blir merkte med data-avduk her (ikkje i malane), så innhaldet
     er urørt og fullt synleg utan JS. --avduk-i gjev bølgjevis stagger. */
  var AVDUK = [
    ['.seksjon-hovud', 'opp'],
    ['.kort-rutenett > li', 'opp'],
    ['.teneste-liste > li', 'opp'],
    ['.avdelingar > li', 'opp'],
    ['.team-rutenett > li', 'opp'],
    ['.eigedom-rutenett > li', 'zoom'],
    ['.prosjekt-rutenett > li', 'zoom'],
    ['.galleri-rutenett > li', 'klipp'],
    ['.referansar:not(.referansar-band) > li', 'opp'],
    ['.referansar-band', 'inn'],
    ['.partnar-liste > li', 'hogre'],
    ['.tal-rekke > div', 'opp'],
    ['.delt > *', 'opp'],
    ['.infoboks', 'opp'],
    ['.foretter', 'zoom'],
    ['.opningstider', 'opp'],
    ['.butikk-bilete', 'klipp'],
    ['.kart-holdar', 'inn'],
    ['.laerling-inner > *', 'opp'],
    ['.cta-band', 'inn'],
    ['.cta-band-inner > *', 'opp'],
    ['.botn-kolonnar > div', 'opp'],
  ];

  var observator = null;
  if ('IntersectionObserver' in window) {
    observator = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('vist');
          observator.unobserve(e.target);
          setTimeout(function () {
            // Ta òg bort data-avduk: avdukings-transition har høgare
            // spesifisitet enn hover-reglane til korta, og ville elles
            // overstyre mikrointeraksjonane deira for alltid.
            e.target.classList.add('ferdig');
            e.target.removeAttribute('data-avduk');
          }, 1700);
        });
      },
      { rootMargin: '0px 0px -9% 0px', threshold: 0.05 }
    );

    /* To pass: først berre lesing (geometri), så berre skriving – unngår
       vekselvis layout-tvang ved oppstart. Element med bilete i første
       viewport kan vere LCP-elementet og blir aldri gøymde. */
    var kandidatar = [];
    var merkte = new Set();
    AVDUK.forEach(function (par) {
      var i = 0;
      document.querySelectorAll(par[0]).forEach(function (el) {
        if (merkte.has(el)) return; // første treff vinn
        if (el.closest('.hero, .sidehovud, dialog')) return; // har eigen koreografi
        merkte.add(el);
        kandidatar.push({ el: el, variant: par[1], i: i });
        i += 1;
      });
    });

    var vh = window.innerHeight;
    kandidatar.forEach(function (k) {
      k.rekt = k.el.getBoundingClientRect();
    });
    kandidatar.forEach(function (k) {
      var forsteVindauge = k.rekt.top < vh && k.rekt.bottom > 0;
      if (forsteVindauge && k.el.querySelector('img')) return;
      k.el.setAttribute('data-avduk', k.variant);
      // Kort stagger i første viewport, så ingenting ventar unødig ved lasting
      k.el.style.setProperty('--avduk-i', String(forsteVindauge ? Math.min(k.i, 3) : k.i % 8));
      observator.observe(k.el);
    });

    /* Tryggingsnett: skulle noko aldri få .vist (t.d. observer-feil), blir
       alt synleg att etter kort tid på sida. */
    setTimeout(function () {
      document.querySelectorAll('[data-avduk]:not(.vist)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('vist');
      });
    }, 2500);

    /* H2-maskereveal: pakk teksten i ei «lomme». Ligg innanfor IO-sjekken
       med vilje – utan IntersectionObserver finst ingen .vist til å avduke. */
    document.querySelectorAll('.seksjon-hovud h2').forEach(function (h2) {
      if (!h2.closest('[data-avduk]')) return; // berre der avdukinga faktisk skjer
      var maske = document.createElement('span');
      maske.className = 'h-maske';
      while (h2.firstChild) maske.appendChild(h2.firstChild);
      h2.appendChild(maske);
    });
  }

  /* ---------- Hero-tittel: ord-for-ord-avduking ---------- */
  var heroTittel = document.querySelector('.hero h1');
  if (heroTittel && heroTittel.textContent.trim()) {
    var ord = heroTittel.textContent.trim().split(/\s+/);
    heroTittel.textContent = '';
    ord.forEach(function (o, i) {
      var ytre = document.createElement('span');
      ytre.className = 'ord';
      var indre = document.createElement('span');
      indre.className = 'ord-inner';
      indre.textContent = o;
      indre.style.setProperty('--ord-i', String(i));
      ytre.appendChild(indre);
      heroTittel.appendChild(ytre);
      if (i < ord.length - 1) heroTittel.appendChild(document.createTextNode(' '));
    });
    heroTittel.classList.add('h1-delt');
  }

  /* ---------- Varme-ikonet får damp-detaljen ---------- */
  document.querySelectorAll('.kort-ikon').forEach(function (brikke) {
    // Varme-ikonet kjenner ein att på flamme-pathen (startar med "M12 3s5 4.2")
    var path = brikke.querySelector('svg path');
    if (path && path.getAttribute('d') && path.getAttribute('d').indexOf('M12 3s5 4.2') === 0) {
      brikke.classList.add('kort-ikon-varme');
    }
  });

  /* ---------- Leseprogress + skrollmedviten topplinje ----------
     Headeren gøymer seg roleg når du les deg nedover (etter 400px) og kjem
     att ved første rørsle opp – meir skjerm til innhaldet, CTA alltid nær. */
  var progress = document.createElement('div');
  progress.className = 'les-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  var topp = document.querySelector('.topp');
  var nav = document.querySelector('.hovudnav');
  var skrollVenter = false;
  var sistY = window.scrollY || 0;

  function vedSkroll() {
    skrollVenter = false;
    var st = window.scrollY || document.documentElement.scrollTop;
    var maks = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--progress', String(maks > 0 ? Math.min(st / maks, 1) : 0));
    if (topp) {
      topp.classList.toggle('skrolla', st > 12);
      var delta = st - sistY;
      if (Math.abs(delta) > 8) { // dødsone mot skjelving
        var menyOpen = nav && nav.getAttribute('data-open') === 'true';
        var fokusInne = topp.contains(document.activeElement);
        if (delta > 0 && st > 400 && !menyOpen && !fokusInne) {
          topp.classList.add('topp-skjult');
        } else if (delta < 0 || st <= 400) {
          topp.classList.remove('topp-skjult');
        }
        sistY = st;
      }
    }
  }

  window.addEventListener(
    'scroll',
    function () {
      if (skrollVenter) return;
      skrollVenter = true;
      requestAnimationFrame(vedSkroll);
    },
    { passive: true }
  );
  vedSkroll();

  /* Tastaturnavigasjon inn i headeren skal alltid vise han */
  if (topp) {
    topp.addEventListener('focusin', function () {
      topp.classList.remove('topp-skjult');
    });
  }

  /* ---------- Footer-gardina: berre når footeren får plass i viewporten ---------- */
  var botn = document.querySelector('.botn');
  function sjekkGardin() {
    if (!botn) return;
    var passar = botn.offsetHeight <= window.innerHeight * 0.92;
    document.documentElement.classList.toggle('gardin', passar);
  }
  var gardinTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(gardinTimer);
    gardinTimer = setTimeout(sjekkGardin, 200);
  });
  sjekkGardin();

  /* ---------- Tal som tel seg opp (1933, 21, 2 …) ----------
     Malane server-rendrar det FERDIGE talet – teljinga er rein pynt og må
     aldri kunne etterlate feil tal («0 avdelingar»). Difor: same terskel som
     avdukinga (talet blir sett til startverdi medan elementet enno er
     usynleg, så ingen ser hoppet 2→0), hopp over når fana er i bakgrunnen
     (m.a. headless-rendrering/Googlebot), og eit tryggingsnett som alltid
     skriv sluttverdien inn att. */
  var telObs =
    'IntersectionObserver' in window &&
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          telObs.unobserve(e.target);
          telOpp(e.target);
        });
      },
      { rootMargin: '0px 0px -9% 0px', threshold: 0.05 }
    );

  function telOpp(dt) {
    var ferdigTekst = dt.textContent;
    var m = ferdigTekst.trim().match(/^(\d+)([\s\S]*)$/);
    if (!m) return;
    if (document.hidden) return; // la det ferdige talet stå urørt
    var mal = parseInt(m[1], 10);
    var suffiks = m[2] || '';
    // Årstal tel frå like under (1900 → 1933); små tal tel frå null
    var fra = mal >= 1000 ? mal - 33 : 0;
    var start = null;
    var TID = 1500;
    var ferdig = false;
    function steg(ts) {
      if (ferdig) return;
      if (document.hidden) {
        // Fana vart lagd i bakgrunnen midt i teljinga – skriv fasiten
        ferdig = true;
        dt.textContent = ferdigTekst;
        return;
      }
      if (start === null) start = ts;
      var t = Math.min((ts - start) / TID, 1);
      var eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); // easeOutExpo
      dt.textContent = String(Math.round(fra + (mal - fra) * eased)) + suffiks;
      if (t < 1) requestAnimationFrame(steg);
      else ferdig = true;
    }
    requestAnimationFrame(steg);
    // Tryggingsnett: uansett kva som skjer med rAF-kjeda står rett tal att
    setTimeout(function () {
      if (!ferdig) {
        ferdig = true;
        dt.textContent = ferdigTekst;
      }
    }, TID + 300);
  }

  if (telObs) {
    document.querySelectorAll('.tal-rekke dt').forEach(function (dt) {
      if (/^\d/.test(dt.textContent.trim())) telObs.observe(dt);
    });
  }

  /* ---------- Bølgje nedst i heroen (vatnet møter innhaldet) ---------- */
  var hero = document.querySelector('.hero');
  if (hero) {
    var NS = 'http://www.w3.org/2000/svg';
    var holdar = document.createElement('div');
    holdar.className = 'bolgje';
    holdar.setAttribute('aria-hidden', 'true');

    // To lag som driv kvar sin veg. Kvar path er to identiske bølgjelengder,
    // så -50 % translateX loopar saumlaust.
    [
      ['bolgje-lag-2', 'M0 34 C 120 10, 240 10, 360 34 S 600 58, 720 34 S 960 10, 1080 34 S 1320 58, 1440 34 L 1440 80 L 0 80 Z'],
      ['bolgje-lag-1', 'M0 44 C 180 20, 300 20, 420 44 S 660 68, 780 44 S 1020 20, 1140 44 S 1380 68, 1440 44 L 1440 80 L 0 80 Z'],
    ].forEach(function (lag) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 1440 80');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.classList.add(lag[0]);
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', lag[1]);
      path.setAttribute('fill', '#ffffff');
      svg.appendChild(path);
      holdar.appendChild(svg);
    });

    hero.appendChild(holdar);
    hero.classList.add('har-bolgje');
  }

  /* ---------- Ambient canvas ----------
     Rørleggar: luftbobler som stig roleg og vik unna peikaren (vatn).
     Eigedom: varme lyskorn og tynne, sakte diagonale linjer (kveldslys).
     Pausar når fana er gøymd eller flata er utanfor skjermen. */
  function ambient(vert, modus) {
    if (sparModus || !vert) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'ambient-lerret';
    canvas.setAttribute('aria-hidden', 'true');
    vert.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var B = { w: 0, h: 0 };
    var partiklar = [];
    var peikar = { x: -9999, y: -9999 };
    var aktiv = true;
    var synleg = true;
    var rafId = 0;

    // Mjuk sirkel-sprite teikna éin gong – langt billegare enn shadowBlur
    function lagSprite(farge) {
      var s = document.createElement('canvas');
      s.width = s.height = 64;
      var c = s.getContext('2d');
      var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, farge);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      return s;
    }

    var spriteKvit = lagSprite('rgba(255,255,255,0.85)');
    var spriteKoppar = lagSprite(modus === 'lys' ? 'rgba(255,214,170,0.9)' : 'rgba(232,155,99,0.8)');

    function nyPartikkel(startY) {
      var r = modus === 'lys' ? 2 + Math.random() * 5 : 1.2 + Math.random() * 3.2;
      return {
        x: Math.random() * B.w,
        y: startY !== undefined ? startY : Math.random() * B.h,
        r: r,
        fart: modus === 'lys' ? 0.08 + Math.random() * 0.2 : 0.25 + Math.random() * 0.75,
        drift: (Math.random() - 0.5) * (modus === 'lys' ? 0.14 : 0.3),
        fase: Math.random() * Math.PI * 2,
        puls: 0.5 + Math.random() * 1.2,
        alfa: modus === 'lys' ? 0.05 + Math.random() * 0.14 : 0.06 + Math.random() * 0.22,
        koppar: Math.random() < (modus === 'lys' ? 0.55 : 0.3),
        vx: 0,
      };
    }

    var sistBreidd = 0;

    function dimensjoner() {
      var rekt = vert.getBoundingClientRect();
      B.w = Math.max(1, Math.round(rekt.width));
      B.h = Math.max(1, Math.round(rekt.height));
      canvas.width = Math.round(B.w * dpr);
      canvas.height = Math.round(B.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (B.w === sistBreidd && partiklar.length) {
        // Berre høgda endra seg (typisk: mobil-URL-linja glid inn/ut under
        // skroll) – behald partiklane så boblene ikkje «hoppar».
        for (var j = 0; j < partiklar.length; j++) {
          if (partiklar[j].y > B.h + 12) partiklar[j].y = Math.random() * B.h;
        }
        return;
      }
      sistBreidd = B.w;
      var tal = Math.round(Math.min(Math.max((B.w * B.h) / 26000, 12), 44));
      partiklar = [];
      for (var i = 0; i < tal; i++) partiklar.push(nyPartikkel());
    }

    function teikn(ts) {
      rafId = 0;
      if (!aktiv || !synleg) return;
      ctx.clearRect(0, 0, B.w, B.h);
      var t = ts / 1000;

      // Eigedom: fire tynne diagonale linjer som driv umerkeleg
      if (modus === 'lys') {
        ctx.strokeStyle = 'rgba(234,241,243,0.06)';
        ctx.lineWidth = 1;
        var span = B.w + B.h;
        for (var L = 0; L < 4; L++) {
          var off = ((t * 6 + L * span / 4) % span) - B.h;
          ctx.beginPath();
          ctx.moveTo(off, 0);
          ctx.lineTo(off + B.h, B.h);
          ctx.stroke();
        }
      }

      for (var i = 0; i < partiklar.length; i++) {
        var p = partiklar[i];

        if (modus === 'lys') {
          p.x += p.drift + Math.sin(t * 0.3 + p.fase) * 0.08;
          p.y -= p.fart * 0.5;
          if (p.y < -12) { partiklar[i] = p = nyPartikkel(B.h + 10); }
        } else {
          // Luftbobler i vatn: stig, vinglar, og vik unna peikaren
          var dx = p.x - peikar.x;
          var dy = p.y - peikar.y;
          var avst2 = dx * dx + dy * dy;
          if (avst2 < 130 * 130) {
            p.vx += (dx / Math.sqrt(avst2 + 0.01)) * 0.25;
          }
          p.vx *= 0.94;
          p.x += p.drift + p.vx + Math.sin(t * p.puls + p.fase) * 0.35;
          p.y -= p.fart;
          if (p.y < -12) { partiklar[i] = p = nyPartikkel(B.h + 10); }
        }

        if (p.x < -20) p.x = B.w + 20;
        if (p.x > B.w + 20) p.x = -20;

        var pust = modus === 'lys' ? 0.75 + 0.25 * Math.sin(t * p.puls + p.fase) : 1;
        ctx.globalAlpha = p.alfa * pust;
        var sprite = p.koppar ? spriteKoppar : spriteKvit;
        var d = p.r * (modus === 'lys' ? 7 : 4.5);
        ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      neste();
    }

    function neste() {
      if (!rafId && aktiv && synleg) rafId = requestAnimationFrame(teikn);
    }

    if (finPeikar && modus !== 'lys') {
      vert.addEventListener(
        'pointermove',
        function (e) {
          var rekt = canvas.getBoundingClientRect();
          peikar.x = e.clientX - rekt.left;
          peikar.y = e.clientY - rekt.top;
        },
        { passive: true }
      );
      vert.addEventListener('pointerleave', function () {
        peikar.x = peikar.y = -9999;
      });
    }

    document.addEventListener('visibilitychange', function () {
      aktiv = !document.hidden;
      neste();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        synleg = entries[0].isIntersecting;
        neste();
      }).observe(canvas);
    }

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(dimensjoner, 200);
    });

    dimensjoner();
    neste();
  }

  var sti = location.pathname;
  ambient(hero, 'vatn');
  if (sti === '/tenester') {
    ambient(document.querySelector('.sidehovud'), 'vatn');
  } else if (sti === '/eigedom' || sti.indexOf('/eigedom/') === 0) {
    ambient(document.querySelector('.sidehovud'), 'lys');
  }

  /* ---------- CTA-bandet: glidande gradientlag (transform – ikkje repaint) ---------- */
  document.querySelectorAll('.cta-band').forEach(function (band) {
    var glid = document.createElement('span');
    glid.className = 'cta-gradient';
    glid.setAttribute('aria-hidden', 'true');
    band.insertBefore(glid, band.firstChild);
  });

  /* ---------- Dropeklikk: vassring der du trykkjer ---------- */
  document.addEventListener('pointerdown', function (e) {
    var mal = e.target.closest && e.target.closest('.knapp, .galleri-knapp');
    if (!mal) return;
    var gamle = mal.querySelectorAll('.dryp');
    if (gamle.length > 2) gamle[0].remove(); // maks tre samtidige ringar
    var rekt = mal.getBoundingClientRect();
    var dryp = document.createElement('span');
    dryp.className = 'dryp';
    dryp.setAttribute('aria-hidden', 'true');
    dryp.style.setProperty('--x', e.clientX - rekt.left + 'px');
    dryp.style.setProperty('--y', e.clientY - rekt.top + 'px');
    mal.appendChild(dryp);
    setTimeout(function () {
      dryp.remove();
    }, 700);
  });

  /* ---------- Koparglød som følgjer peikaren over kort ---------- */
  if (finPeikar) {
    document
      .querySelectorAll('.kort, .teneste, .referanse, .prosjekt-kort a')
      .forEach(function (kort) {
        kort.addEventListener(
          'pointermove',
          function (e) {
            var rekt = kort.getBoundingClientRect();
            kort.style.setProperty('--mx', ((e.clientX - rekt.left) / rekt.width) * 100 + '%');
            kort.style.setProperty('--my', ((e.clientY - rekt.top) / rekt.height) * 100 + '%');
          },
          { passive: true }
        );
      });
  }

  /* ---------- Før/etter: klippet «nudgar» éin gong (50→42→50) ----------
     Demonstrerer affordansen i staden for å forklare han. Avbryt momentant
     om brukaren tek i glidebrytaren. */
  document.querySelectorAll('[data-foretter]').forEach(function (boks) {
    var slider = boks.querySelector('.foretter-slider');
    if (!slider || !('IntersectionObserver' in window)) return;
    var rørt = false;
    slider.addEventListener('input', function () {
      rørt = true;
    });
    var io = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        setTimeout(function () {
          if (rørt) return;
          var start = null;
          var TID = 900;
          function steg(ts) {
            if (rørt) {
              boks.style.setProperty('--pos', slider.value + '%');
              return;
            }
            if (start === null) start = ts;
            var t = Math.min((ts - start) / TID, 1);
            var pos = 50 - 8 * Math.sin(t * Math.PI); // roleg ut og heim att
            boks.style.setProperty('--pos', pos.toFixed(1) + '%');
            if (t < 1) requestAnimationFrame(steg);
          }
          requestAnimationFrame(steg);
        }, 500);
      },
      { threshold: 0.5 }
    );
    io.observe(boks);
  });
})();
