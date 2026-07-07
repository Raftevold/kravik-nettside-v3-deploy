/**
 * Datalager: content.json (alt redigerbart innhald), messages.json
 * (innsende kontaktskjema) og auth.json (admin-passordhash).
 * Alle skriv er atomiske lokalt og blir spegla til GitHub (sjå github.js).
 * Skriva returnerer promiset frå synk-køa, slik at kritiske handlingar
 * kan vente og varsle brukaren om synken feilar.
 */
const fs = require('fs');
const path = require('path');
const github = require('./github');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

let content = null;
let messages = null;

function atomicWrite(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function init() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (github.enabled) {
    console.log('[boot] Hentar siste innhald frå GitHub …');
    // Utan ein vellukka pull kan første lagring overskrive nyare data i
    // repoet med forelda data frå git-klonen – difor: retry, og gi opp høgt.
    let ok = false;
    for (let i = 0; i < 5 && !ok; i++) {
      if (i) {
        console.warn(`[boot] Pull feila – prøver igjen (${i + 1}/5) …`);
        await new Promise((r) => setTimeout(r, 3000 * i));
      }
      ok = await github.pullAll(DATA_DIR);
    }
    if (!ok) {
      throw new Error('Fekk ikkje henta siste data frå GitHub – nektar å starte med potensielt forelda data.');
    }
  } else {
    console.warn(
      '[boot] GITHUB_TOKEN/GITHUB_REPO er ikkje sett – admin-endringar blir IKKJE varig lagra på Render (flyktig filsystem).'
    );
  }
  content = readJson(path.join(DATA_DIR, 'content.json'), null);
  if (!content) throw new Error('data/content.json manglar eller er ugyldig');
  messages = readJson(path.join(DATA_DIR, 'messages.json'), []);
}

function getContent() {
  return content;
}

function saveContent(next, what = 'innhald') {
  next.updatedAt = new Date().toISOString();
  content = next;
  const file = path.join(DATA_DIR, 'content.json');
  atomicWrite(file, JSON.stringify(content, null, 2));
  return github.pushFile(file, 'data/content.json', `admin: oppdaterte ${what}`);
}

function getMessages() {
  return messages;
}

function saveMessages(what = 'meldingar') {
  const file = path.join(DATA_DIR, 'messages.json');
  atomicWrite(file, JSON.stringify(messages, null, 2));
  // Persondata: blir berre spegla til GitHub når SYNC_MESSAGES=true
  // (git-historikk kan ikkje slettast melding for melding – GDPR art. 17).
  if (github.SYNC_MESSAGES) {
    return github.pushFile(file, 'data/messages.json', `skjema: ${what}`);
  }
  return Promise.resolve(false);
}

function addMessage(msg) {
  messages.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...msg });
  if (messages.length > 500) messages = messages.slice(0, 500);
  return saveMessages('ny melding frå kontaktskjema');
}

function deleteMessage(id) {
  messages = messages.filter((m) => m.id !== id);
  return saveMessages('sletta melding');
}

function markMessageRead(id, read = true) {
  const m = messages.find((x) => x.id === id);
  if (m) m.read = read;
  return saveMessages(read ? 'melding lesen' : 'melding ulesen');
}

// --- Auth ---
function getAuth() {
  return readJson(path.join(DATA_DIR, 'auth.json'), {});
}

function saveAuth(auth) {
  const file = path.join(DATA_DIR, 'auth.json');
  atomicWrite(file, JSON.stringify(auth, null, 2));
  return github.pushFile(file, 'data/auth.json', 'admin: oppdaterte innlogging');
}

// --- Opplasta filer ---
function saveUpload(fileName, buffer) {
  const local = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(local, buffer);
  return github.pushBuffer(buffer, `data/uploads/${fileName}`, `admin: lasta opp ${fileName}`);
}

function deleteUpload(fileName) {
  const local = path.join(UPLOADS_DIR, fileName);
  if (fs.existsSync(local)) fs.unlinkSync(local);
  return github.removeFile(`data/uploads/${fileName}`, `admin: sletta ${fileName}`);
}

function uploadExists(fileName) {
  return fs.existsSync(path.join(UPLOADS_DIR, fileName));
}

module.exports = {
  ROOT,
  DATA_DIR,
  UPLOADS_DIR,
  init,
  getContent,
  saveContent,
  getMessages,
  addMessage,
  deleteMessage,
  markMessageRead,
  getAuth,
  saveAuth,
  saveUpload,
  deleteUpload,
  uploadExists,
  syncStatus: () => github.status(),
};
