/**
 * Enkel, anonym besøksstatistikk – utan informasjonskapslar, IP-adresser
 * eller anna persondata. Tel berre sidevisingar per dag per side.
 *
 * Tala blir haldne i minnet, skrivne til data/stats.json kvart 5. minutt,
 * og spegla til GitHub maks kvar 30. minutt (pluss ved SIGTERM), slik at
 * statistikken overlever dvale/omstart på Render utan å lage commit-støy.
 *
 * Vil de ha meir avansert statistikk: sett PLAUSIBLE_DOMAIN (sjå DRIFT.md).
 */
const fs = require('fs');
const path = require('path');
const store = require('./store');
const github = require('./github');

const FILE = path.join(store.DATA_DIR, 'stats.json');
const MAX_DAYS = 180; // eldre dagar blir sletta
const MAX_PATHS_PER_DAY = 150; // vern mot URL-søppel

let data = {};
let dirty = false;
let lastPushAt = 0;

function init() {
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    data = {};
  }
  const disk = setInterval(() => flush(false), 5 * 60 * 1000);
  disk.unref();
}

function prune() {
  const days = Object.keys(data).sort();
  while (days.length > MAX_DAYS) {
    delete data[days.shift()];
  }
}

function hit(p) {
  const day = new Date().toISOString().slice(0, 10);
  if (!data[day]) {
    data[day] = {};
    prune();
  }
  const d = data[day];
  d._total = (d._total || 0) + 1;
  if (d[p] || Object.keys(d).length < MAX_PATHS_PER_DAY) {
    d[p] = (d[p] || 0) + 1;
  }
  dirty = true;
}

function flush(forcePush) {
  if (!dirty && !forcePush) return Promise.resolve();
  try {
    fs.writeFileSync(FILE, JSON.stringify(data));
    dirty = false;
  } catch (err) {
    console.error('[stats] klarte ikkje å skrive stats.json:', err.message);
  }
  const now = Date.now();
  if (forcePush || now - lastPushAt > 30 * 60 * 1000) {
    lastPushAt = now;
    return github.pushFile(FILE, 'data/stats.json', 'stats: oppdatert teljing').catch(() => {});
  }
  return Promise.resolve();
}

/** Siste n dagar som [{ day, total }], eldst først (inkluderer tomme dagar). */
function lastDays(n = 14) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, total: (data[key] && data[key]._total) || 0 });
  }
  return out;
}

/** Mest viste sider siste n dagar. */
function topPages(days = 30, limit = 6) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const sums = {};
  for (const [day, entries] of Object.entries(data)) {
    if (day < cutoffKey) continue;
    for (const [p, n] of Object.entries(entries)) {
      if (p === '_total') continue;
      sums[p] = (sums[p] || 0) + n;
    }
  }
  return Object.entries(sums)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([p, count]) => ({ path: p, count }));
}

function totals(days = 30) {
  return lastDays(days).reduce((sum, d) => sum + d.total, 0);
}

const BOT_RE = /bot|crawl|spider|slurp|curl|wget|monitor|pingdom|lighthouse|headless/i;

/** Express-middleware: tel vellukka HTML-sidevisingar frå vanlege nettlesarar. */
function middleware(req, res, next) {
  if (req.method === 'GET' && !req.path.startsWith('/admin') && !BOT_RE.test(req.get('user-agent') || '')) {
    res.on('finish', () => {
      if (res.statusCode === 200 && String(res.get('Content-Type') || '').includes('text/html')) {
        hit(req.path);
      }
    });
  }
  next();
}

module.exports = { init, hit, flush, lastDays, topPages, totals, middleware };
