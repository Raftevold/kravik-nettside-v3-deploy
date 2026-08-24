const { createApp } = require('./src/app');
const store = require('./src/lib/store');
const github = require('./src/lib/github');
const stats = require('./src/lib/stats');
const mail = require('./src/lib/mail');
const googleReviews = require('./src/lib/googleReviews');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await store.init();
    stats.init();
    googleReviews.init(); // valfri, hentar i bakgrunnen
  } catch (err) {
    // Berre når det verken finst fersk ELLER lokal data å servere skal
    // prosessen døy (Render beheld då førre fungerande instans). Feila
    // GitHub-pull med lokalt innhald gjev i staden degradert modus i
    // store.init – sida held seg oppe, push er sperra, admin viser varsel.
    console.error('[boot] Klarte ikkje å initialisere datalager:', err);
    process.exit(1);
  }

  if (store.isDegradert()) {
    // Sei ifrå til eigaren med ein gong (om SMTP er sett opp) – dette er
    // typisk eit utgått GITHUB_TOKEN, og det hastar å byte det.
    mail.notifyDrift(
      'Nettsida køyrer i degradert modus',
      'Oppstartshentinga frå GitHub feila (typisk utgått GITHUB_TOKEN). Sida serverer innhaldet frå siste deploy, men admin-endringar blir IKKJE varig lagra før tokenet er bytt i Render. Sjå docs/DRIFT.md.'
    );
  }

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`Kr. A. Vik-nettsida køyrer på http://localhost:${PORT}`);
  });

  // Render sender SIGTERM ved redeploy/dvale – dren synk-køa før exit,
  // slik at siste lagringar når GitHub. Med hard frist: Render SIGKILL-ar
  // etter ~30 s, så vi må aldri henge i dreneringa.
  process.on('SIGTERM', async () => {
    console.log('[shutdown] SIGTERM – drenerer synk-køa …');
    server.close();
    const frist = new Promise((r) => setTimeout(r, 20000));
    try {
      await Promise.race([
        (async () => {
          await stats.flush(true);
          await github.flush();
        })(),
        frist,
      ]);
    } catch {
      /* logga i github.js */
    }
    process.exit(0);
  });
})();
