const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const store = require('../lib/store');
const seo = require('../lib/seo');
const mail = require('../lib/mail');
const images = require('../lib/images');
const { formLimiter } = require('../lib/auth');

const router = express.Router();

// Kundebilete i tilbodsskjemaet: maks 4 filer à 8 MB. Kvar fil blir
// validert og re-koda gjennom sharp før ho blir brukt til noko som helst.
const kontaktUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 4 },
});

function kontaktUploadMedFeil(req, res, next) {
  kontaktUpload.array('bilete', 4)(req, res, (err) => {
    if (!err) return next();
    const content = store.getContent();
    const url = seo.baseUrl(req);
    const tekst =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Eitt av bileta er for stort (maks 8 MB per bilete). Prøv med færre eller mindre bilete.'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Du kan leggje ved inntil 4 bilete.'
          : 'Opplastinga av bileta feila. Prøv gjerne utan vedlegg.';
    return res.status(422).render('pages/kontakt', {
      seoTitle: content.pages.kontakt.seoTitle,
      seoDescription: content.pages.kontakt.seoDescription,
      canonical: `${url}/kontakt`,
      jsonLd: seo.plumberJsonLd(content, url),
      sent: false,
      formError: tekst,
      formFieldErrors: {},
      formValues: {},
    });
  });
}

function page(view, build) {
  return (req, res, next) => {
    try {
      const content = store.getContent();
      const url = seo.baseUrl(req);
      const extra = build ? build(content, req) : {};
      res.render(`pages/${view}`, {
        jsonLd: seo.plumberJsonLd(content, url),
        canonical: `${url}${req.path === '/' ? '/' : req.path}`,
        ...extra,
      });
    } catch (err) {
      next(err);
    }
  };
}

// --- Kanonisering: éi adresse per side ---
// 1) Feil host (t.d. onrender-adressa etter domenebyte): 301 til SITE_URL.
// 2) Skråstrek på slutten og store bokstavar: 301 til normalisert sti.
//    (Alle ruter, slugs og filnamn her er små bokstavar, så dette er trygt.)
router.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const configured = process.env.SITE_URL;
  if (configured) {
    try {
      const target = new URL(configured);
      if (req.hostname && req.hostname !== target.hostname) {
        return res.redirect(301, `${configured.replace(/\/$/, '')}${req.originalUrl}`);
      }
    } catch {
      /* ugyldig SITE_URL skal aldri velte sida */
    }
  }

  let sti = req.path;
  if (sti.length > 1 && sti.endsWith('/')) sti = sti.replace(/\/+$/, '') || '/';
  sti = sti.toLowerCase();
  if (sti !== req.path) {
    const query = req.originalUrl.slice(req.path.length);
    return res.redirect(301, sti + query);
  }
  next();
});

// --- 301-redirects frå gamle URL-ar (beheld SEO-verdi) ---
const REDIRECTS = new Map([
  ['/index', '/'],
  ['/default.aspx', '/'],
  ['/om-informasjonskapsler', '/informasjonskapslar'],
  ['/comfortavisa', '/tenester'],
  ['/kr-a-vik-eigedom-as', '/eigedom'],
  ['/opplæringsbedrift', '/opplaeringsbedrift'],
  ['/miljø-og-bærekraft', '/miljo-og-berekraft'],
  ['/miljo-og-baerekraft', '/miljo-og-berekraft'],
  ['/galleri', '/prosjekt'],
]);
router.use((req, res, next) => {
  let decoded;
  try {
    decoded = decodeURIComponent(req.path);
  } catch {
    decoded = req.path;
  }
  const target = REDIRECTS.get(decoded.replace(/\/$/, '') || '/');
  if (target && target !== decoded) return res.redirect(301, target);
  next();
});

router.get(
  '/',
  page('home', (content) => ({
    seoTitle: content.pages.home.seoTitle,
    seoDescription: content.pages.home.seoDescription,
    galleryPreview: (content.gallery || []).slice(0, 8),
  }))
);

router.get(
  '/tenester',
  page('tenester', (content) => ({
    seoTitle: content.pages.tenester.seoTitle,
    seoDescription: content.pages.tenester.seoDescription,
  }))
);

router.get(
  '/om-oss',
  page('om-oss', (content) => ({
    seoTitle: content.pages.omOss.seoTitle,
    seoDescription: content.pages.omOss.seoDescription,
  }))
);

router.get(
  '/butikk-og-landbruk',
  page('butikk', (content) => ({
    seoTitle: content.pages.butikk.seoTitle,
    seoDescription: content.pages.butikk.seoDescription,
  }))
);

router.get(
  '/opplaeringsbedrift',
  page('opplaering', (content, req) => ({
    seoTitle: content.pages.opplaering.seoTitle,
    seoDescription: content.pages.opplaering.seoDescription,
    sent: req.query.sendt === '1',
    formError: null,
    formValues: {},
  }))
);

router.get('/eigedom', (req, res, next) => {
  try {
    const content = store.getContent();
    const url = seo.baseUrl(req);
    res.render('pages/eigedom', {
      seoTitle: content.pages.eigedom.seoTitle,
      seoDescription: content.pages.eigedom.seoDescription,
      canonical: `${url}/eigedom`,
      jsonLd: seo.eigedomJsonLd(content, url),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/eigedom/:slug', (req, res, next) => {
  try {
    const content = store.getContent();
    const property = (content.properties || []).find((p) => p.slug === req.params.slug);
    if (!property) return next();
    const url = seo.baseUrl(req);
    res.render('pages/eigedom-detalj', {
      property,
      seoTitle: `${property.title} – Kr. A. Vik Eigedom AS`,
      seoDescription: property.description
        ? property.description.slice(0, 155)
        : `${property.title} – utleigeleilegheit frå Kr. A. Vik Eigedom AS. Kontakt oss for leige.`,
      canonical: `${url}/eigedom/${property.slug}`,
      jsonLd: seo.eigedomJsonLd(content, url),
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/prosjekt',
  page('prosjekt', (content) => ({
    seoTitle: content.pages.prosjekt.seoTitle,
    seoDescription: content.pages.prosjekt.seoDescription,
  }))
);

router.get('/prosjekt/:id', (req, res, next) => {
  try {
    const content = store.getContent();
    const project = (content.projects || []).find((p) => p.id === req.params.id);
    if (!project) return next();
    const url = seo.baseUrl(req);
    res.render('pages/prosjekt-detalj', {
      project,
      seoTitle: `${project.title} – prosjekt | ${content.site.name}`,
      seoDescription:
        project.description && project.description.length >= 50
          ? project.description.slice(0, 155)
          : `${project.title}${project.place ? ` i ${project.place}` : ''}${project.year ? `, ${project.year}` : ''} – prosjekt utført av ${content.site.name}, rørleggar i Stryn og på Nordfjordeid.`,
      canonical: `${url}/prosjekt/${project.id}`,
      jsonLd: seo.plumberJsonLd(content, url),
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/miljo-og-berekraft',
  page('miljo', (content) => ({
    seoTitle: content.pages.miljo.seoTitle,
    seoDescription: content.pages.miljo.seoDescription,
  }))
);

router.get(
  '/kontakt',
  page('kontakt', (content, req) => ({
    seoTitle: content.pages.kontakt.seoTitle,
    seoDescription: content.pages.kontakt.seoDescription,
    sent: req.query.sendt === '1',
    formError: null,
    formValues: { jobbtype: String(req.query.jobbtype || '').slice(0, 80) },
  }))
);

// Felles validering for skjema som skal til meldingsinnboksen
function validateSubmission(body) {
  const errors = [];
  const fieldErrors = {}; // felt → true, for aria-invalid i malane
  const name = String(body.navn || '').trim().slice(0, 200);
  const email = String(body.epost || '').trim().slice(0, 200);
  const phone = String(body.telefon || '').trim().slice(0, 50);
  const message = String(body.melding || '').trim().slice(0, 5000);
  if (!name) {
    errors.push('Skriv inn namnet ditt.');
    fieldErrors.navn = true;
  }
  if (!email && !phone) {
    errors.push('Oppgi e-post eller telefon, slik at vi kan svare deg.');
    fieldErrors.epost = true;
    fieldErrors.telefon = true;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('E-postadressa ser ikkje gyldig ut.');
    fieldErrors.epost = true;
  }
  if (!message) {
    errors.push('Skriv ei melding.');
    fieldErrors.melding = true;
  }
  return { errors, fieldErrors, name, email, phone, message };
}

router.post('/kontakt', formLimiter, kontaktUploadMedFeil, async (req, res, next) => {
  try {
    const content = store.getContent();
    const url = seo.baseUrl(req);

    // Honningkrukke: robotar fyller ut det skjulte feltet
    if (req.body.nettstad) return res.redirect('/kontakt?sendt=1#kontaktskjema');

    const { errors, fieldErrors, name, email, phone, message } = validateSubmission(req.body);
    const jobtype = String(req.body.jobbtype || '').trim().slice(0, 80);
    const address = String(req.body.adresse || '').trim().slice(0, 200);

    if (errors.length) {
      return res.status(422).render('pages/kontakt', {
        seoTitle: content.pages.kontakt.seoTitle,
        seoDescription: content.pages.kontakt.seoDescription,
        canonical: `${url}/kontakt`,
        jsonLd: seo.plumberJsonLd(content, url),
        sent: false,
        formError: errors.join(' ') + ((req.files || []).length ? ' (Hugs å velje bileta på nytt.)' : ''),
        formFieldErrors: fieldErrors,
        formValues: { navn: name, epost: email, telefon: phone, melding: message, jobbtype: jobtype, adresse: address },
      });
    }

    // Kundebilete: valider + krymp via sharp, lagra flyktig for innboksen,
    // og legg ved e-posten (det varige arkivet). Ei øydelagd fil skal aldri
    // velte innsendinga – ho blir berre hoppa over.
    const vedlegg = [];
    const bileteFiler = [];
    for (const fil of (req.files || []).slice(0, 4)) {
      if (!/^image\/(jpeg|png|webp|avif|gif|heic|heif)$/.test(fil.mimetype)) continue;
      try {
        const jpeg = await images.prepareInboxImage(fil.buffer);
        const filnamn = `${crypto.randomBytes(8).toString('hex')}.jpg`;
        store.saveInboxImage(filnamn, jpeg);
        bileteFiler.push(filnamn);
        vedlegg.push({ filename: `bilete-${vedlegg.length + 1}.jpg`, content: jpeg });
      } catch (err) {
        console.error('[kontakt] Hoppa over ugyldig biletfil:', err.message);
      }
    }

    const msg = {
      type: jobtype ? 'tilbod' : 'kontakt',
      name,
      email,
      phone,
      jobtype,
      address,
      message,
      images: bileteFiler,
      sentAt: new Date().toISOString(),
      read: false,
    };
    const rec = store.addMessage(msg);
    // Asynkron, valfri – utfallet blir notert på meldinga så admin ser om
    // e-postvarslinga faktisk gjekk ut (viktig på gratisplanen, der
    // innboksen kan bli tømd ved omstart).
    mail.notifyNewMessage(msg, content.site.name, vedlegg).then((ok) => {
      rec.mailSent = ok;
      store.touchMessages().catch(() => {});
    });

    return res.redirect('/kontakt?sendt=1#kontaktskjema');
  } catch (err) {
    next(err);
  }
});

// Lærling-søknad frå opplæringssida – hamnar i same innboks, merkt «lærling»
router.post('/opplaeringsbedrift', formLimiter, (req, res, next) => {
  try {
    const content = store.getContent();
    const url = seo.baseUrl(req);

    if (req.body.nettstad) return res.redirect('/opplaeringsbedrift?sendt=1#soknad');

    const { errors, fieldErrors, name, email, phone, message } = validateSubmission(req.body);

    if (errors.length) {
      return res.status(422).render('pages/opplaering', {
        seoTitle: content.pages.opplaering.seoTitle,
        seoDescription: content.pages.opplaering.seoDescription,
        canonical: `${url}/opplaeringsbedrift`,
        jsonLd: seo.plumberJsonLd(content, url),
        sent: false,
        formError: errors.join(' '),
        formFieldErrors: fieldErrors,
        formValues: { navn: name, epost: email, telefon: phone, melding: message },
      });
    }

    const msg = {
      type: 'laerling',
      name,
      email,
      phone,
      message,
      sentAt: new Date().toISOString(),
      read: false,
    };
    const rec = store.addMessage(msg);
    mail.notifyNewMessage(msg, content.site.name).then((ok) => {
      rec.mailSent = ok;
      store.touchMessages().catch(() => {});
    });

    return res.redirect('/opplaeringsbedrift?sendt=1#soknad');
  } catch (err) {
    next(err);
  }
});

router.get('/personvern', page('personvern', (content) => ({
  seoTitle: 'Personvernerklæring – Kr. A. Vik AS',
  seoDescription: 'Personvernerklæring for kravik.no – korleis vi behandlar personopplysningar.',
})));

router.get('/informasjonskapslar', page('informasjonskapslar', () => ({
  seoTitle: 'Informasjonskapslar (cookies) – Kr. A. Vik AS',
  seoDescription: 'Om informasjonskapslar på kravik.no og korleis du styrer samtykket ditt.',
})));

router.get('/sitemap.xml', (req, res) => {
  const url = seo.baseUrl(req);
  res.type('application/xml').send(seo.sitemapXml(store.getContent(), url));
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(seo.robotsTxt(seo.baseUrl(req)));
});

module.exports = router;
