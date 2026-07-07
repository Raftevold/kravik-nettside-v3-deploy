const crypto = require('crypto');
const express = require('express');
const cookieSession = require('cookie-session');
const multer = require('multer');
const store = require('../lib/store');
const auth = require('../lib/auth');
const images = require('../lib/images');
const mail = require('../lib/mail');
const stats = require('../lib/stats');

const router = express.Router();

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('[admin] SESSION_SECRET er ikkje sett – innlogging blir nullstilt ved omstart.');
}

router.use(
  cookieSession({
    name: 'kravik_admin',
    keys: [SESSION_SECRET],
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 20 },
});

// Ikkje indekser admin
router.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.locals.admin = true;
  res.locals.csrf = (req.session && req.session.csrf) || '';
  res.locals.flash = req.session ? req.session.flash : null;
  res.locals.syncStatus = store.syncStatus();
  if (req.session) req.session.flash = null;
  next();
});

function flash(req, text, type = 'ok') {
  if (req.session) req.session.flash = { text, type };
}

function str(v, max = 2000) {
  return String(v ?? '').trim().slice(0, max);
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[æå]/g, 'a')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'oppforing';
}

function uniqueSlug(base, existing) {
  let slug = base;
  let i = 2;
  while (existing.includes(slug)) slug = `${base}-${i++}`;
  return slug;
}

// ---------- Innlogging ----------
router.get('/logg-inn', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/admin');
  res.render('admin/login', { error: null, hasPassword: auth.hasPassword() });
});

router.post('/logg-inn', auth.loginLimiter, (req, res) => {
  const { brukar, passord } = req.body;
  if (auth.verifyLogin(str(brukar, 100), String(passord || ''))) {
    auth.startSession(req);
    return res.redirect('/admin');
  }
  res.status(401).render('admin/login', { error: 'Feil brukarnamn eller passord.', hasPassword: auth.hasPassword() });
});

router.post('/logg-ut', (req, res) => {
  req.session = null;
  res.redirect('/admin/logg-inn');
});

// Alt under her krev innlogging
router.use(auth.requireAuth);
router.get('/', (req, res) => res.redirect('/admin/oversikt'));

// Alle POST krev gyldig CSRF-token. Multipart-skjema blir parsa av multer
// inne i sjølve ruta – req.body finst ikkje før det – så der skjer
// CSRF-sjekken ETTER multer (sjå /bilete/last-opp, /import, /prosjekt/last-opp).
router.post('*', (req, res, next) => {
  if (req.is('multipart/form-data')) return next();
  return auth.verifyCsrf(req, res, next);
});

// Ventar på GitHub-synken og varslar brukaren om han feilar (utan synk
// overlever ikkje endringa ein omstart på Render).
async function persist(req, savePromise, okMsg) {
  try {
    await savePromise;
    flash(req, okMsg);
  } catch (err) {
    flash(req, `Lagra lokalt – men synk til GitHub FEILA (${err.message}). Endringa kan gå tapt ved omstart.`, 'feil');
  }
}

// ---------- Handbok ----------
router.get('/handbok', (req, res) => res.render('admin/handbok', {}));

// ---------- Oversikt ----------
router.get('/oversikt', (req, res) => {
  const messages = store.getMessages();
  res.render('admin/oversikt', {
    unread: messages.filter((m) => !m.read).length,
    total: messages.length,
    sync: store.syncStatus(),
    mailConfigured: mail.configured,
    statDays: stats.lastDays(14),
    statTotal30: stats.totals(30),
    statTop: stats.topPages(30, 6),
    plausibleDomain: process.env.PLAUSIBLE_DOMAIN || '',
  });
});

// ---------- Generelt (kontaktinfo m.m.) ----------
router.get('/generelt', (req, res) => {
  res.render('admin/generelt', {});
});

router.post('/generelt', async (req, res) => {
  const c = store.getContent();
  const b = req.body;
  c.site.name = str(b.name, 100) || c.site.name;
  c.site.tagline = str(b.tagline, 200);
  c.site.orgnr = str(b.orgnr, 20);
  c.site.phone = str(b.phone, 30);
  c.site.email = str(b.email, 100);
  c.site.address = { street: str(b.street, 100), zip: str(b.zip, 10), city: str(b.city, 60) };
  c.site.mapEmbed = str(b.mapEmbed, 2000);
  c.site.openingHoursNote = str(b.openingHoursNote, 300);
  c.site.openingHours = str(b.openingHours, 2000)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, ...rest] = l.split('|');
      return { label: str(label, 60), value: str(rest.join('|'), 60) };
    })
    .filter((o) => o.label && o.value);
  c.site.social = str(b.social, 2000)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [type, ...rest] = l.split('|');
      return { type: str(type, 30).toLowerCase(), url: str(rest.join('|'), 300) };
    })
    .filter((s) => s.type && /^https?:\/\//.test(s.url));
  c.site.departments = [];
  for (let i = 0; i < 4; i++) {
    const name = str(b[`dep_name_${i}`], 100);
    if (!name) continue;
    c.site.departments.push({
      name,
      address: str(b[`dep_address_${i}`], 150),
      phone: str(b[`dep_phone_${i}`], 30),
      note: str(b[`dep_note_${i}`], 150),
    });
  }
  await persist(req, store.saveContent(c, 'kontaktinfo og generelt'), 'Lagra!');
  res.redirect('/admin/generelt');
});

// ---------- Varsellinje ----------
router.get('/varsellinje', (req, res) => res.render('admin/varsellinje', {}));

router.post('/varsellinje', async (req, res) => {
  const c = store.getContent();
  c.alert = {
    enabled: req.body.enabled === 'on',
    text: str(req.body.text, 300),
    link: str(req.body.link, 300),
  };
  await persist(req, store.saveContent(c, 'varsellinje'), c.alert.enabled ? 'Varsellinja er PÅ.' : 'Varsellinja er AV.');
  // Snarvegen på dashbordet sender med kvar ho vil tilbake
  const tilbake = req.body.tilbake === 'oversikt' ? '/admin/oversikt' : '/admin/varsellinje';
  res.redirect(tilbake);
});

// ---------- Sider (tekst + SEO) ----------
const PAGE_DEFS = {
  home: {
    label: 'Framsida',
    fields: [
      ['heroTitle', 'Hovudoverskrift (hero)', 'text'],
      ['heroLead', 'Ingress (hero)', 'textarea'],
      ['heroImage', 'Hero-bilete', 'image'],
      ['ctaPrimaryText', 'Primærknapp-tekst', 'text'],
      ['ctaSecondaryText', 'Sekundærknapp-tekst', 'text'],
    ],
  },
  tenester: {
    label: 'Tenester',
    fields: [
      ['intro', 'Introtekst', 'textarea'],
      ['headerImage', 'Toppbilete', 'image'],
    ],
  },
  prosjekt: {
    label: 'Prosjekt og galleri (intro/SEO)',
    fields: [
      ['intro', 'Introtekst', 'textarea'],
      ['headerImage', 'Toppbilete', 'image'],
    ],
  },
  omOss: {
    label: 'Om oss',
    fields: [
      ['body', 'Brødtekst', 'textarea'],
      ['headerImage', 'Toppbilete', 'image'],
    ],
  },
  butikk: {
    label: 'Butikk og landbruk',
    fields: [
      ['intro', 'Introtekst', 'textarea'],
      ['comfortText', 'Tekst om Comfort-butikken', 'textarea'],
      ['landbrukText', 'Tekst om landbruksavdelinga', 'textarea'],
      ['image', 'Bilete av butikken (valfritt – vist på framsida og butikksida)', 'image'],
      ['headerImage', 'Toppbilete', 'image'],
    ],
  },
  opplaering: {
    label: 'Opplæringsbedrift',
    fields: [
      ['body', 'Brødtekst', 'textarea'],
      ['headerImage', 'Toppbilete', 'image'],
    ],
  },
  eigedom: {
    label: 'Eigedom',
    fields: [
      ['body', 'Brødtekst', 'textarea'],
      ['orgnr', 'Org.nr (eigedomsselskapet)', 'text'],
      ['contactName', 'Kontaktperson', 'text'],
      ['contactRole', 'Rolle', 'text'],
      ['contactPhone', 'Telefon', 'text'],
      ['contactEmail', 'E-post', 'text'],
      ['contactImage', 'Bilete av kontaktperson', 'image'],
      ['headerImage', 'Toppbilete', 'image'],
    ],
  },
  miljo: {
    label: 'Miljø og berekraft',
    fields: [
      ['body', 'Brødtekst', 'textarea'],
      ['docsRaw', 'Dokument (éi linje per dokument: Tittel|URL)', 'textarea'],
      ['headerImage', 'Toppbilete', 'image'],
    ],
  },
  kontakt: {
    label: 'Kontakt',
    fields: [
      ['intro', 'Introtekst', 'textarea'],
      ['headerImage', 'Toppbilete', 'image'],
    ],
  },
};

router.get('/sider', (req, res) => res.render('admin/sider', { PAGE_DEFS }));

router.get('/sider/:key', (req, res) => {
  const def = PAGE_DEFS[req.params.key];
  if (!def) return res.redirect('/admin/sider');
  const c = store.getContent();
  const pageData = { ...c.pages[req.params.key] };
  if (req.params.key === 'miljo') {
    pageData.docsRaw = (pageData.docs || []).map((d) => `${d.title}|${d.url}`).join('\n');
  }
  res.render('admin/side-edit', { def, key: req.params.key, pageData });
});

router.post('/sider/:key', async (req, res) => {
  const def = PAGE_DEFS[req.params.key];
  if (!def) return res.redirect('/admin/sider');
  const c = store.getContent();
  const p = c.pages[req.params.key];
  p.seoTitle = str(req.body.seoTitle, 70);
  p.seoDescription = str(req.body.seoDescription, 170);
  for (const [name, , type] of def.fields) {
    if (name === 'docsRaw') {
      p.docs = str(req.body.docsRaw, 5000)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [title, ...rest] = l.split('|');
          return { title: str(title, 120), url: str(rest.join('|'), 500) };
        })
        .filter((d) => d.title && /^https?:\/\//.test(d.url));
    } else if (type === 'textarea') {
      p[name] = str(req.body[name], 10000);
    } else {
      p[name] = str(req.body[name], 300);
    }
  }
  await persist(req, store.saveContent(c, `sida «${def.label}»`), 'Lagra!');
  res.redirect(`/admin/sider/${req.params.key}`);
});

// ---------- Tenester ----------
const ICONS = ['bad', 'kran', 'varme', 'sprinkler', 'va', 'sveis', 'kamera', 'bor', 'verktoy'];

router.get('/tenester', (req, res) => res.render('admin/tenester', { ICONS }));

router.post('/tenester/lagre', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  const item = {
    id: str(req.body.id, 40) || `teneste-${Date.now().toString(36)}`,
    title: str(req.body.title, 100),
    icon: ICONS.includes(req.body.icon) ? req.body.icon : 'verktoy',
    text: str(req.body.text, 1000),
  };
  if (!item.title) {
    flash(req, 'Tittel manglar.', 'feil');
    return res.redirect('/admin/tenester');
  }
  if (Number.isInteger(idx) && idx >= 0 && idx < c.services.length) c.services[idx] = item;
  else c.services.push(item);
  await persist(req, store.saveContent(c, 'tenester'), 'Lagra!');
  res.redirect('/admin/tenester');
});

router.post('/tenester/slett', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  if (Number.isInteger(idx) && idx >= 0 && idx < c.services.length) c.services.splice(idx, 1);
  await persist(req, store.saveContent(c, 'tenester'), 'Sletta.');
  res.redirect('/admin/tenester');
});

router.post('/tenester/flytt', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  const dir = req.body.dir === 'opp' ? -1 : 1;
  const j = idx + dir;
  if (idx >= 0 && idx < c.services.length && j >= 0 && j < c.services.length) {
    [c.services[idx], c.services[j]] = [c.services[j], c.services[idx]];
    await store.saveContent(c, 'tenester (rekkjefølgje)').catch(() => {});
  }
  res.redirect('/admin/tenester');
});

// ---------- Team ----------
router.get('/team', (req, res) => res.render('admin/team', {}));

router.post('/team/lagre', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  const item = {
    name: str(req.body.name, 100),
    role: str(req.body.role, 120),
    phone: str(req.body.phone, 30),
    email: str(req.body.email, 100),
    image: str(req.body.image, 60),
  };
  if (!item.name) {
    flash(req, 'Namn manglar.', 'feil');
    return res.redirect('/admin/team');
  }
  if (Number.isInteger(idx) && idx >= 0 && idx < c.team.length) c.team[idx] = item;
  else c.team.push(item);
  await persist(req, store.saveContent(c, 'kontaktpersonar'), 'Lagra!');
  res.redirect('/admin/team');
});

router.post('/team/slett', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  if (Number.isInteger(idx) && idx >= 0 && idx < c.team.length) c.team.splice(idx, 1);
  await persist(req, store.saveContent(c, 'kontaktpersonar'), 'Sletta.');
  res.redirect('/admin/team');
});

// ---------- Referansar ----------
router.get('/referansar', (req, res) => res.render('admin/referansar', {}));

router.post('/referansar/lagre', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  const rating = Number.parseInt(req.body.rating, 10);
  const item = {
    quote: str(req.body.quote, 800),
    author: str(req.body.author, 100),
    context: str(req.body.context, 120),
    rating: rating >= 1 && rating <= 5 ? rating : undefined,
  };
  if (!item.quote || !item.author) {
    flash(req, 'Både sitat og namn må fyllast ut.', 'feil');
    return res.redirect('/admin/referansar');
  }
  if (Number.isInteger(idx) && idx >= 0 && idx < c.testimonials.length) c.testimonials[idx] = item;
  else c.testimonials.push(item);
  await persist(req, store.saveContent(c, 'referansar'), 'Lagra!');
  res.redirect('/admin/referansar');
});

router.post('/referansar/slett', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  if (Number.isInteger(idx) && idx >= 0 && idx < c.testimonials.length) c.testimonials.splice(idx, 1);
  await persist(req, store.saveContent(c, 'referansar'), 'Sletta.');
  res.redirect('/admin/referansar');
});

// ---------- Prosjekt ----------
router.get('/prosjekt', (req, res) => res.render('admin/prosjekt', {}));

function readProjectFields(body, existing = {}) {
  return {
    ...existing,
    title: str(body.title, 150) || existing.title || '',
    category: str(body.category, 80),
    place: str(body.place, 100),
    year: str(body.year, 10),
    description: str(body.description, 5000),
    cover: str(body.cover, 60),
    before: str(body.before, 60),
    after: str(body.after, 60),
    images: existing.images || [],
  };
}

router.post('/prosjekt/lagre', async (req, res) => {
  const c = store.getContent();
  c.projects = c.projects || [];
  const idx = Number(req.body.index);
  if (Number.isInteger(idx) && idx >= 0 && idx < c.projects.length) {
    c.projects[idx] = readProjectFields(req.body, c.projects[idx]);
  } else {
    const item = readProjectFields(req.body);
    if (!item.title) {
      flash(req, 'Tittel manglar.', 'feil');
      return res.redirect('/admin/prosjekt');
    }
    item.id = uniqueSlug(slugify(item.title), c.projects.map((p) => p.id));
    c.projects.unshift(item);
  }
  await persist(req, store.saveContent(c, 'prosjekt'), 'Lagra!');
  res.redirect('/admin/prosjekt');
});

router.post('/prosjekt/slett', async (req, res) => {
  const c = store.getContent();
  c.projects = c.projects || [];
  const idx = Number(req.body.index);
  if (Number.isInteger(idx) && idx >= 0 && idx < c.projects.length) c.projects.splice(idx, 1);
  await persist(req, store.saveContent(c, 'prosjekt'), 'Prosjektet er sletta (bileta ligg framleis i biblioteket).');
  res.redirect('/admin/prosjekt');
});

router.post('/prosjekt/last-opp', upload.array('bilete', 20), auth.verifyCsrf, async (req, res) => {
  const c = store.getContent();
  c.projects = c.projects || [];
  c.media = c.media || [];
  const idx = Number(req.body.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= c.projects.length) return res.redirect('/admin/prosjekt');
  const project = c.projects[idx];
  let count = 0;
  for (const file of req.files || []) {
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) continue;
    try {
      const entry = await images.processUpload(file.buffer, file.originalname, c.media.map((m) => m.id));
      c.media.push(entry);
      project.images.push(entry.id);
      if (!project.cover) project.cover = entry.id;
      count++;
    } catch (err) {
      console.error('[opplasting]', err.message);
    }
  }
  await persist(req, store.saveContent(c, `prosjektbilete (${count} opplasta)`), count ? `${count} bilete lasta opp.` : 'Ingen bilete vart lasta opp – sjekk filformatet.');
  res.redirect('/admin/prosjekt');
});

router.post('/prosjekt/fjern-bilete', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  const id = str(req.body.id, 60);
  if (Number.isInteger(idx) && idx >= 0 && idx < (c.projects || []).length) {
    const p = c.projects[idx];
    p.images = (p.images || []).filter((x) => x !== id);
    if (p.cover === id) p.cover = p.images[0] || '';
    if (p.before === id) p.before = '';
    if (p.after === id) p.after = '';
    await persist(req, store.saveContent(c, 'prosjektbilete'), 'Biletet er teke ut av prosjektet (ligg framleis i biblioteket).');
  }
  res.redirect('/admin/prosjekt');
});

// ---------- Eigedom (leilegheiter) ----------
// Fasilitetar ein kan krysse av for (inspirert av finn.no sine filter)
const FASILITETAR = [
  'Balkong/terrasse',
  'Garasje/P-plass',
  'Heis',
  'Lademoglegheit',
  'Peis/eldstad',
  'Utsikt',
  'Turterreng',
  'Fellesvaskeri',
  'Breiband',
  'Aircondition',
  'Alarm',
  'Vaktmeisterteneste',
];

router.get('/eigedom', (req, res) => res.render('admin/eigedom', { FASILITETAR }));

router.post('/eigedom/lagre', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  const existing = Number.isInteger(idx) && idx >= 0 && idx < c.properties.length ? c.properties[idx] : {};
  const lat = Number.parseFloat(String(req.body.lat || '').replace(',', '.'));
  const lng = Number.parseFloat(String(req.body.lng || '').replace(',', '.'));
  const areal = Number.parseInt(req.body.areal, 10);
  const leige = Number.parseInt(String(req.body.leige || '').replace(/[\s.]/g, ''), 10);
  const valgteFasilitetar = [].concat(req.body.fasilitetar || []).filter((f) => FASILITETAR.includes(f));
  const item = {
    ...existing,
    title: str(req.body.title, 150),
    status: ['', 'ledig', 'utleigd'].includes(req.body.status) ? req.body.status : '',
    description: str(req.body.description, 5000),
    // Strukturert nøkkelinfo – alt valfritt
    soverom: ['', '1', '2', '3', '4', '5', '6', '7+'].includes(req.body.soverom) && req.body.soverom ? req.body.soverom : undefined,
    areal: Number.isFinite(areal) && areal > 0 ? areal : undefined,
    leige: Number.isFinite(leige) && leige > 0 ? leige : undefined,
    moblert: ['moblert', 'delvis', 'umoblert'].includes(req.body.moblert) ? req.body.moblert : undefined,
    dyrehold: ['ja', 'nei'].includes(req.body.dyrehold) ? req.body.dyrehold : undefined,
    ledigFra: str(req.body.ledigFra, 60) || undefined,
    fasilitetar: valgteFasilitetar.length ? valgteFasilitetar : undefined,
    facts: str(req.body.facts, 2000)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [label, ...rest] = l.split('|');
        return { label: str(label, 60), value: str(rest.join('|'), 120) };
      })
      .filter((f) => f.label && f.value),
    mapEmbed: str(req.body.mapEmbed, 2000),
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    images: existing.images || [],
  };
  if (!item.title) {
    flash(req, 'Adresse/tittel manglar.', 'feil');
    return res.redirect('/admin/eigedom');
  }
  if (!item.slug) {
    item.slug = uniqueSlug(slugify(item.title), c.properties.map((p) => p.slug).filter(Boolean));
  }
  if (Number.isInteger(idx) && idx >= 0 && idx < c.properties.length) c.properties[idx] = item;
  else c.properties.push(item);
  await persist(req, store.saveContent(c, 'leilegheiter'), 'Lagra!');
  res.redirect('/admin/eigedom');
});

router.post('/eigedom/slett', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  if (Number.isInteger(idx) && idx >= 0 && idx < c.properties.length) c.properties.splice(idx, 1);
  await persist(req, store.saveContent(c, 'leilegheiter'), 'Sletta.');
  res.redirect('/admin/eigedom');
});

router.post('/eigedom/last-opp', upload.array('bilete', 20), auth.verifyCsrf, async (req, res) => {
  const c = store.getContent();
  c.media = c.media || [];
  const idx = Number(req.body.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= c.properties.length) return res.redirect('/admin/eigedom');
  const property = c.properties[idx];
  property.images = property.images || [];
  let count = 0;
  for (const file of req.files || []) {
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) continue;
    try {
      const entry = await images.processUpload(file.buffer, file.originalname, c.media.map((m) => m.id));
      c.media.push(entry);
      property.images.push(entry.id);
      if (!property.cover && !property.image) property.cover = entry.id;
      count++;
    } catch (err) {
      console.error('[opplasting]', err.message);
    }
  }
  await persist(req, store.saveContent(c, `leilegheitsbilete (${count} opplasta)`), count ? `${count} bilete lasta opp.` : 'Ingen bilete vart lasta opp – sjekk filformatet.');
  res.redirect('/admin/eigedom');
});

router.post('/eigedom/framside', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  const id = str(req.body.id, 60);
  if (Number.isInteger(idx) && idx >= 0 && idx < c.properties.length) {
    const p = c.properties[idx];
    if ((p.images || []).includes(id) || p.image === id) {
      p.cover = id;
      await persist(req, store.saveContent(c, 'leilegheiter (framsidebilete)'), 'Framsidebiletet er sett.');
    }
  }
  res.redirect('/admin/eigedom');
});

router.post('/eigedom/fjern-bilete', async (req, res) => {
  const c = store.getContent();
  const idx = Number(req.body.index);
  const id = str(req.body.id, 60);
  if (Number.isInteger(idx) && idx >= 0 && idx < c.properties.length) {
    const p = c.properties[idx];
    p.images = (p.images || []).filter((x) => x !== id);
    if (p.image === id) p.image = '';
    if (p.cover === id) p.cover = p.images[0] || p.image || '';
    await persist(req, store.saveContent(c, 'leilegheitsbilete'), 'Biletet er teke ut av leilegheita (ligg framleis i biblioteket).');
  }
  res.redirect('/admin/eigedom');
});

// ---------- Bilete (mediebibliotek + galleri) ----------
router.get('/bilete', (req, res) => res.render('admin/bilete', {}));

router.post('/bilete/last-opp', upload.array('bilete', 20), auth.verifyCsrf, async (req, res) => {
  const c = store.getContent();
  c.media = c.media || [];
  c.gallery = c.gallery || [];
  const addToGallery = req.body.tilGalleri === 'on';
  let count = 0;
  for (const file of req.files || []) {
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) continue;
    try {
      const entry = await images.processUpload(
        file.buffer,
        file.originalname,
        c.media.map((m) => m.id)
      );
      c.media.push(entry);
      if (addToGallery) c.gallery.push({ image: entry.id });
      count++;
    } catch (err) {
      console.error('[opplasting]', err.message);
    }
  }
  await persist(req, store.saveContent(c, `bilete (${count} opplasta)`), count ? `${count} bilete lasta opp.` : 'Ingen bilete vart lasta opp – sjekk filformatet.');
  res.redirect('/admin/bilete');
});

router.post('/bilete/alt', async (req, res) => {
  const c = store.getContent();
  const m = (c.media || []).find((x) => x.id === req.body.id);
  if (m) {
    m.alt = str(req.body.alt, 200);
    await persist(req, store.saveContent(c, 'alt-tekst'), 'Alt-tekst lagra.');
  }
  res.redirect('/admin/bilete');
});

router.post('/bilete/slett', async (req, res) => {
  const c = store.getContent();
  const id = str(req.body.id, 60);
  c.media = (c.media || []).filter((m) => m.id !== id);
  c.gallery = (c.gallery || []).filter((g) => g.image !== id);
  for (const p of c.projects || []) {
    p.images = (p.images || []).filter((x) => x !== id);
    if (p.cover === id) p.cover = p.images[0] || '';
    if (p.before === id) p.before = '';
    if (p.after === id) p.after = '';
  }
  for (const e of c.properties || []) {
    e.images = (e.images || []).filter((x) => x !== id);
    if (e.image === id) e.image = '';
    if (e.cover === id) e.cover = e.images[0] || '';
  }
  images.deleteMedia(id);
  await persist(req, store.saveContent(c, 'sletta bilete'), 'Biletet er sletta.');
  res.redirect('/admin/bilete');
});

router.post('/galleri/toggle', async (req, res) => {
  const c = store.getContent();
  const id = str(req.body.id, 60);
  c.gallery = c.gallery || [];
  const idx = c.gallery.findIndex((g) => g.image === id);
  if (idx >= 0) c.gallery.splice(idx, 1);
  else c.gallery.push({ image: id });
  await store.saveContent(c, 'galleri').catch(() => {});
  res.redirect('/admin/bilete');
});

// ---------- Meldingar ----------
router.get('/meldingar', (req, res) => {
  res.render('admin/meldingar', { messages: store.getMessages(), mailConfigured: mail.configured, sync: store.syncStatus() });
});

router.post('/meldingar/lest', async (req, res) => {
  await store.markMessageRead(str(req.body.id, 40), req.body.lest !== '0').catch(() => {});
  res.redirect('/admin/meldingar');
});

router.post('/meldingar/slett', async (req, res) => {
  await persist(req, store.deleteMessage(str(req.body.id, 40)), 'Melding sletta.');
  res.redirect('/admin/meldingar');
});

// ---------- Innstillingar (passord + backup) ----------
router.get('/innstillingar', (req, res) => {
  res.render('admin/innstillingar', { sync: store.syncStatus(), mailConfigured: mail.configured });
});

router.post('/innstillingar/passord', async (req, res) => {
  const { gjeldande, nytt, gjenta } = req.body;
  if (!auth.verifyLogin(auth.ADMIN_USER, String(gjeldande || ''))) {
    flash(req, 'Gjeldande passord er feil.', 'feil');
  } else if (String(nytt || '').length < 10) {
    flash(req, 'Nytt passord må ha minst 10 teikn.', 'feil');
  } else if (nytt !== gjenta) {
    flash(req, 'Passorda er ikkje like.', 'feil');
  } else if (process.env.ADMIN_PASSWORD_HASH) {
    flash(req, 'Passordet er styrt av miljøvariabelen ADMIN_PASSWORD_HASH og kan ikkje endrast her.', 'feil');
  } else {
    try {
      await auth.setPassword(String(nytt));
      flash(req, 'Passordet er endra.');
    } catch (err) {
      flash(req, `Passordet er endra lokalt, men synk FEILA (${err.message}).`, 'feil');
    }
  }
  res.redirect('/admin/innstillingar');
});

router.get('/eksport', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="kravik-innhald.json"');
  res.type('application/json').send(JSON.stringify(store.getContent(), null, 2));
});

router.post('/import', upload.single('fil'), auth.verifyCsrf, async (req, res) => {
  try {
    const json = JSON.parse(req.file.buffer.toString('utf8'));
    if (!json.site || !json.pages) throw new Error('Fila manglar «site»/«pages».');
    await persist(req, store.saveContent(json, 'import av innhald'), 'Innhald importert.');
  } catch (err) {
    flash(req, `Import feila: ${err.message}`, 'feil');
  }
  res.redirect('/admin/innstillingar');
});

module.exports = router;
