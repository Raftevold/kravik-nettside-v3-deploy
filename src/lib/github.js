/**
 * GitHub-basert persistens for Render sitt flyktige filsystem.
 *
 * Ved kvar lagring i admin blir endra filer under data/ committa til
 * GitHub-repoet via Contents API. Ved oppstart blir siste versjon henta
 * ned att. Slik overlever innhald og opplasta bilete både dvale, omstart
 * og redeploy på gratisplanen – utan ekstern database.
 *
 * Krev miljøvariablane GITHUB_TOKEN og GITHUB_REPO (t.d. "brukar/repo").
 * Utan desse køyrer sida vidare med berre lokal lagring (og ei åtvaring).
 *
 * Merk: meldingar frå kontaktskjemaet (persondata) blir berre synkroniserte
 * om SYNC_MESSAGES=true – elles ligg dei kun lokalt, sidan git-historikk
 * aldri gløymer (GDPR art. 17).
 */
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.GITHUB_REPO || '';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API = 'https://api.github.com';
const SYNC_MESSAGES = process.env.SYNC_MESSAGES === 'true';

const enabled = Boolean(TOKEN && REPO);

let lastError = null;
let lastSyncAt = null;
let pulledOk = false; // ingen push før ein vellukka pull – hindrar at forelda data overskriv repoet
let queue = Promise.resolve();

function headers(extra) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'kravik-nettside',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  };
}

function toRepoPath(p) {
  return p.split(path.sep).join('/');
}

function contentsUrl(repoPath) {
  return `${API}/repos/${REPO}/contents/${encodeURIComponent(repoPath).replace(/%2F/g, '/')}?ref=${BRANCH}`;
}

async function getSha(repoPath) {
  const res = await fetch(contentsUrl(repoPath), { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${repoPath}: ${res.status}`);
  const json = await res.json();
  return json.sha || null;
}

async function putFileOnce(repoPath, buffer, message) {
  const sha = await getSha(repoPath);
  const body = {
    message,
    content: buffer.toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(contentsUrl(repoPath).split('?')[0], {
    method: 'PUT',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub PUT ${repoPath}: ${res.status} ${text.slice(0, 200)}`);
  }
}

async function deleteFileOnce(repoPath, message) {
  const sha = await getSha(repoPath);
  if (!sha) return;
  const res = await fetch(contentsUrl(repoPath).split('?')[0], {
    method: 'DELETE',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub DELETE ${repoPath}: ${res.status} ${text.slice(0, 200)}`);
  }
}

/**
 * Legg ein synk-operasjon i kø (seriell). Returnerer eit promise som
 * REJECTAR ved varig feil, slik at kallaren kan varsle brukaren – men
 * sjølve køa held alltid fram.
 */
function enqueue(fn, label) {
  if (!enabled) return Promise.resolve(false);
  const run = queue.then(async () => {
    if (!pulledOk) {
      throw new Error('synk er sperra: oppstartshenting frå GitHub har ikkje lukkast');
    }
    try {
      await fn();
    } catch (err) {
      // Eitt nytt forsøk etter kort pause (typisk transient feil / sha-konflikt)
      await new Promise((r) => setTimeout(r, 1200));
      await fn();
    }
    lastSyncAt = new Date().toISOString();
    lastError = null;
    return true;
  });
  queue = run.catch((err) => {
    lastError = `${label}: ${err.message}`;
    console.error('[github-sync]', lastError);
  });
  return run;
}

function pushFile(localPath, repoRelPath, message) {
  const repoPath = toRepoPath(repoRelPath);
  return enqueue(async () => {
    const buffer = fs.readFileSync(localPath);
    await putFileOnce(repoPath, buffer, message);
  }, `push ${repoPath}`);
}

function pushBuffer(buffer, repoRelPath, message) {
  const repoPath = toRepoPath(repoRelPath);
  return enqueue(() => putFileOnce(repoPath, buffer, message), `push ${repoPath}`);
}

function removeFile(repoRelPath, message) {
  const repoPath = toRepoPath(repoRelPath);
  return enqueue(() => deleteFileOnce(repoPath, message), `delete ${repoPath}`);
}

/** Ventar til synk-køa er tom (brukt ved SIGTERM). */
function flush() {
  return queue;
}

async function listDir(repoRelPath) {
  const repoPath = toRepoPath(repoRelPath);
  const res = await fetch(`${API}/repos/${REPO}/contents/${repoPath}?ref=${BRANCH}`, { headers: headers() });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub LIST ${repoPath}: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/**
 * Listar alle filer under eit prefiks via Git Trees API (recursive).
 * Contents API kuttar kataloglister stilt ved 1000 oppføringar – Trees
 * taklar ~100k og seier ifrå med eit truncated-flagg.
 */
async function listTree(prefix) {
  const res = await fetch(`${API}/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, { headers: headers() });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub TREE: ${res.status}`);
  const json = await res.json();
  if (json.truncated) console.warn('[github-sync] tre-listing avkorta – nokre filer kan mangle');
  return (json.tree || []).filter((e) => e.type === 'blob' && e.path.startsWith(`${prefix}/`));
}

async function downloadTo(url, localPath, raw = false) {
  const res = await fetch(url, {
    headers: headers(raw ? { Accept: 'application/vnd.github.raw+json' } : undefined),
  });
  if (!res.ok) throw new Error(`GitHub nedlasting: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buf);
}

/**
 * Hent siste innhald frå GitHub ved oppstart. Repoet er fasit.
 * Returnerer true berre når ALT gjekk bra – først då blir push-ar tillatne.
 */
async function pullAll(dataDir) {
  if (!enabled) return false;
  try {
    const entries = await listDir('data');
    for (const e of entries) {
      if (e.type !== 'file' || !e.download_url) continue;
      if (e.name === 'messages.json' && !SYNC_MESSAGES) continue;
      await downloadTo(e.download_url, path.join(dataDir, e.name));
    }
    const uploads = await listTree('data/uploads');
    for (const e of uploads) {
      const name = e.path.slice('data/uploads/'.length);
      const local = path.join(dataDir, 'uploads', name);
      if (!fs.existsSync(local) || fs.statSync(local).size !== e.size) {
        await downloadTo(`${API}/repos/${REPO}/git/blobs/${e.sha}`, local, true);
      }
    }
    lastSyncAt = new Date().toISOString();
    lastError = null;
    pulledOk = true;
    return true;
  } catch (err) {
    lastError = `pull: ${err.message}`;
    console.error('[github-sync]', lastError);
    return false;
  }
}

function status() {
  return { enabled, lastSyncAt, lastError, pulledOk, syncMessages: SYNC_MESSAGES, repo: enabled ? REPO : null, branch: BRANCH };
}

module.exports = { enabled, SYNC_MESSAGES, pushFile, pushBuffer, removeFile, pullAll, flush, status };
