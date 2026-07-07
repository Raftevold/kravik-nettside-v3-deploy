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

function verifyLogin(user, password) {
  const hash = getPasswordHash();
  if (!hash || user !== ADMIN_USER) return false;
  return bcrypt.compareSync(password, hash);
}

function setPassword(newPassword) {
  const hash = bcrypt.hashSync(newPassword, 12);
  return store.saveAuth({ passwordHash: hash, updatedAt: new Date().toISOString() });
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
