const { createApp } = require('./src/app');
const store = require('./src/lib/store');
const github = require('./src/lib/github');
const stats = require('./src/lib/stats');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await store.init();
    stats.init();
  } catch (err) {
    // Utan gyldig innhald (eller utan vellukka GitHub-pull) skal prosessen
    // døy, slik at Render restartar / beheld førre fungerande instans i
    // staden for å servere feilsider eller overskrive repoet med forelda data.
    console.error('[boot] Klarte ikkje å initialisere datalager:', err);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`Kr. A. Vik-nettsida køyrer på http://localhost:${PORT}`);
  });

  // Render sender SIGTERM ved redeploy/dvale – dren synk-køa før exit,
  // slik at siste lagringar når GitHub.
  process.on('SIGTERM', async () => {
    console.log('[shutdown] SIGTERM – drenerer synk-køa …');
    server.close();
    try {
      await stats.flush(true);
      await github.flush();
    } catch {
      /* logga i github.js */
    }
    process.exit(0);
  });
})();
