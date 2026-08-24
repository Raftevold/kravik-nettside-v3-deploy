const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const store = require('./store');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';

function getPasswordHash() {
  if (process.env.ADMIN_PASSWORD_HASH) return process.env.ADMIN_PASSWORD_HASH;
  const auth = store.getAuth();
  if (auth && auth.passwordHash) return auth.passwordHash;
  if (process.env.ADMIN_PASSWORD) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
    store.saveAuth({ passwordHash: hash, updatedAt: new Date().toISOString() });
    return hash;
  }
  return null;
}

// Dummy-hash slik at bcrypt alltid blir køyrd – lik svartid anten
// brukarnamnet finst eller ikkje (ingen enumerasjon via timing).
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);

function verifyLogin(user, password) {
  const hash = getPasswordHash();
  const gyldigKonto = Boolean(hash) && user === ADMIN_USER;
  const passordOk = bcrypt.compareSync(password, gyldigKonto ? hash : DUMMY_HASH);
  return gyldigKonto && passordOk;
}

function setPassword(newPassword) {
  const hash = bcrypt.hashSync(newPassword, 12);
  store.saveAuth({ passwordHash: hash, updatedAt: new Date().toISOString() });
  return hash; // vis hashen til admin, så han kan leggjast i ADMIN_PASSWORD_HASH
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user === ADMIN_USER) return next();
  return res.redirect('/admin/logg-inn');
}

function verifyCsrf(req, res, next) {
  const token = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (req.session && req.session.csrf && token === req.session.csrf) return next();
  return res.status(403).send('Ugyldig CSRF-token. Gå tilbake og prøv på nytt.');
}

function startSession(req) {
  req.session.user = ADMIN_USER;
  req.session.csrf = crypto.randomBytes(24).toString('hex');
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'For mange innloggingsforsøk. Prøv igjen om 15 minutt.',
});

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'For mange innsendingar. Prøv igjen seinare.',
});

module.exports = {
  ADMIN_USER,
  verifyLogin,
  setPassword,
  requireAuth,
  verifyCsrf,
  startSession,
  loginLimiter,
  formLimiter,
  hasPassword: () => Boolean(getPasswordHash()),
};
