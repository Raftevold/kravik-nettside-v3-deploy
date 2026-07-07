const express = require('express');
const store = require('../lib/store');
const seo = require('../lib/seo');
const mail = require('../lib/mail');
const { formLimiter } = require('../lib/auth');

const router = express.Router();

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
      seoDescription: project.description
        ? project.description.slice(0, 155)
        : `${project.title} – prosjekt utført av ${content.site.name}.`,
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
  const name = String(body.navn || '').trim().slice(0, 200);
  const email = String(body.epost || '').trim().slice(0, 200);
  const phone = String(body.telefon || '').trim().slice(0, 50);
  const message = String(body.melding || '').trim().slice(0, 5000);
  if (!name) errors.push('Skriv inn namnet ditt.');
  if (!email && !phone) errors.push('Oppgi e-post eller telefon, slik at vi kan svare deg.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('E-postadressa ser ikkje gyldig ut.');
  if (!message) errors.push('Skriv ei melding.');
  return { errors, name, email, phone, message };
}

router.post('/kontakt', formLimiter, (req, res, next) => {
  try {
    const content = store.getContent();
    const url = seo.baseUrl(req);

    // Honningkrukke: robotar fyller ut det skjulte feltet
    if (req.body.nettstad) return res.redirect('/kontakt?sendt=1#kontaktskjema');

    const { errors, name, email, phone, message } = validateSubmission(req.body);
    const jobtype = String(req.body.jobbtype || '').trim().slice(0, 80);
    const address = String(req.body.adresse || '').trim().slice(0, 200);

    if (errors.length) {
      return res.status(422).render('pages/kontakt', {
        seoTitle: content.pages.kontakt.seoTitle,
        seoDescription: content.pages.kontakt.seoDescription,
        canonical: `${url}/kontakt`,
        jsonLd: seo.plumberJsonLd(content, url),
        sent: false,
        formError: errors.join(' '),
        formValues: { navn: name, epost: email, telefon: phone, melding: message, jobbtype: jobtype, adresse: address },
      });
    }

    const msg = {
      type: jobtype ? 'tilbod' : 'kontakt',
      name,
      email,
      phone,
      jobtype,
      address,
      message,
      sentAt: new Date().toISOString(),
      read: false,
    };
    store.addMessage(msg);
    mail.notifyNewMessage(msg, content.site.name); // asynkron, valfri

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

    const { errors, name, email, phone, message } = validateSubmission(req.body);

    if (errors.length) {
      return res.status(422).render('pages/opplaering', {
        seoTitle: content.pages.opplaering.seoTitle,
        seoDescription: content.pages.opplaering.seoDescription,
        canonical: `${url}/opplaeringsbedrift`,
        jsonLd: seo.plumberJsonLd(content, url),
        sent: false,
        formError: errors.join(' '),
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
    store.addMessage(msg);
    mail.notifyNewMessage(msg, content.site.name);

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
