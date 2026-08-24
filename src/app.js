const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const store = require('./lib/store');
const stats = require('./lib/stats');
const googleReviews = require('./lib/googleReviews');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

// Valfri, personvernvennleg webanalyse (utan cookies): sett PLAUSIBLE_DOMAIN
// til domenet slik det er registrert hos plausible.io, så blir skriptet lagt til.
const PLAUSIBLE_DOMAIN = process.env.PLAUSIBLE_DOMAIN || '';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Cache-busting: versjonshash av CSS/JS rekna ut ved oppstart, brukt som
// ?v=… i malane slik at nye deployar slår gjennom trass lang cache-tid.
function assetVersion() {
  const files = [
    'public/css/site.css',
    'public/css/motion.css',
    'public/css/admin.css',
    'public/js/site.js',
    'public/js/motion.js',
    'public/js/admin.js',
  ];
  const h = crypto.createHash('sha1');
  for (const f of files) {
    try {
      h.update(fs.readFileSync(path.join(store.ROOT, f)));
    } catch {
      /* fila kan mangle i test */
    }
  }
  return h.digest('hex').slice(0, 10);
}

function createApp() {
  const app = express();
  const ASSET_V = assetVersion();
  app.set('view engine', 'ejs');
  app.set('views', path.join(store.ROOT, 'views'));
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(compression());

  // CSP med nonce for JSON-LD; kart-iframe (Google Maps) blir berre lasta etter samtykke.
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`, ...(PLAUSIBLE_DOMAIN ? ['https://plausible.io'] : [])],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          // ws.geonorge.no: Kartverket sitt opne adresse-API (autoforslag i admin)
          connectSrc: ["'self'", 'https://ws.geonorge.no', ...(PLAUSIBLE_DOMAIN ? ['https://plausible.io'] : [])],
          frameSrc: ['https://www.google.com', 'https://maps.google.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Helsesjekkar. VIKTIG skilje:
  //  - /health      (Render): 200 så lenge sida kan servere innhald – òg i
  //    degradert modus, elles ville Render restarta instansen i loop.
  //  - /health/synk (ekstern opptidsmonitor, t.d. UptimeRobot): 500 når
  //    GitHub-synken er nede eller tokenet snart utløper – DET er signalet
  //    som skal nå eigaren på e-post via monitoren.
  app.get('/health', (req, res) => {
    res.status(store.getContent() ? 200 : 500).type('text/plain').send(store.getContent() ? 'ok' : 'ingen innhaldsdata');
  });
  app.get('/health/synk', (req, res) => {
    const s = store.syncStatus();
    const problem = [];
    if (s.enabled) {
      if (!s.pulledOk) problem.push('oppstartshenting frå GitHub har ikkje lukkast (degradert modus)');
      if (s.lastError) problem.push(`siste synk-feil: ${s.lastError}`);
      if (s.tokenExpiresAt) {
        const dagarAtt = (new Date(s.tokenExpiresAt).getTime() - Date.now()) / 86400000;
        if (dagarAtt < 14) problem.push(`GITHUB_TOKEN utløper ${s.tokenExpiresAt.slice(0, 10)} (${Math.max(0, Math.floor(dagarAtt))} dagar att)`);
      }
    }
    res.status(problem.length ? 500 : 200).type('text/plain').send(problem.length ? problem.join('\n') : 'ok');
  });

  // Anonym sideteljing (ingen cookies, ingen IP – sjå src/lib/stats.js)
  app.use(stats.middleware);

  // Hjelpefunksjonar tilgjengelege i alle EJS-malar
  app.use((req, res, next) => {
    const content = store.getContent();
    if (!content) {
      return res.status(503).type('text/plain').send('Sida er under vedlikehald. Prøv igjen om litt.');
    }
    res.locals.content = content;
    res.locals.assetV = ASSET_V;
    res.locals.plausibleDomain = PLAUSIBLE_DOMAIN;
    res.locals.site = content.site;
    res.locals.alertBar = content.alert;
    res.locals.currentPath = req.path;
    res.locals.escapeHtml = escapeHtml;
    res.locals.mediaUrl = (id, size = 'md') => `/media/${id}-${size}.webp`;
    res.locals.srcset = (id) =>
      ['sm@400', 'md@800', 'lg@1600']
        .map((x) => {
          const [s, w] = x.split('@');
          return `/media/${id}-${s}.webp ${w}w`;
        })
        .join(', ');
    res.locals.mediaAlt = (id) => {
      const m = (content.media || []).find((x) => x.id === id);
      return m && m.alt ? m.alt : '';
    };
    res.locals.nl2p = (text) =>
      String(text ?? '')
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br />')}</p>`)
        .join('\n');
    res.locals.telHref = (phone) => `tel:+47${String(phone || '').replace(/\D/g, '')}`;
    res.locals.googleOmtalar = googleReviews.get();
    next();
  });

  // Statisk innhald med god cache
  app.use(
    '/media',
    express.static(store.UPLOADS_DIR, { maxAge: '30d', immutable: false, fallthrough: true })
  );
  app.use(express.static(path.join(store.ROOT, 'public'), { maxAge: '7d' }));

  app.use('/admin', adminRoutes);
  app.use('/', publicRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).render('pages/404', {
      seoTitle: 'Fann ikkje sida – Kr. A. Vik AS',
      seoDescription: 'Sida finst ikkje.',
      jsonLd: null,
    });
  });

  // Feilhandtering
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[feil]', err);
    if (res.headersSent) return;
    res.status(500).render('pages/500', {
      seoTitle: 'Noko gjekk gale – Kr. A. Vik AS',
      seoDescription: 'Ein feil oppstod.',
      jsonLd: null,
    });
  });

  return app;
}

module.exports = { createApp };
