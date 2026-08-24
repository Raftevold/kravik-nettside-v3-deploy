# Drift

## Helsesjekk og overvaking

- `GET /health` – 200 så lenge sida kan servere innhald. Dette er Render sin
  helsesjekk (`healthCheckPath` i render.yaml): han skal IKKJE feile berre
  fordi GitHub-synken er nede, elles restartar Render den fungerande instansen.
- `GET /health/synk` – 500 når GitHub-synken er nede, oppstartshentinga feila
  (degradert modus) eller GITHUB_TOKEN utløper om mindre enn 14 dagar.
  **Tilråding:** registrer denne adressa hos ein gratis opptidsmonitor
  (t.d. UptimeRobot) med e-postvarsling – då får de beskjed FØR sida får
  problem. (Bonus: monitor-trafikken held òg tenesta vaken.)

## Degradert modus (utgått GITHUB_TOKEN)

Feilar oppstartshentinga frå GitHub (typisk 401 = utgått token), startar sida
likevel – med innhaldet frå siste deploy. Push til GitHub er sperra, admin
viser raudt varsel, og det går driftsvarsel på e-post (om SMTP er sett opp).
Fiks: lag nytt fine-grained token (Contents read/write på deploy-repoet),
oppdater `GITHUB_TOKEN` i Render, og restart tenesta. Admin varslar òg når
tokenet har mindre enn 14 dagar att.

## Miljøvariablar (Render → Environment)

| Variabel | Påkravd | Forklaring |
|---|---|---|
| `SITE_URL` | tilrådd | Offentleg adresse (til sitemap/canonical/JSON-LD) |
| `SESSION_SECRET` | ja | Lang tilfeldig streng – held admin-innlogging gyldig over omstart |
| `ADMIN_USER` | nei | Standard `admin` |
| `ADMIN_PASSWORD_HASH` | nei | Overstyrer passordet i `data/auth.json` (bcrypt-hash) |
| `ADMIN_PASSWORD` | nei | Set startpassord ved første oppstart (blir hasha og lagra). Har ingen effekt om hash alt finst. Fjern frå Render etter bruk – ligg i klartekst der. |
| `SYNC_MESSAGES` | nei | `true` = kontaktmeldingar blir òg synka til GitHub-repoet. Standard AV, sjå «Personvern i drift». |
| `PLAUSIBLE_DOMAIN` | nei | Slår på Plausible-analyse (cookie-fri). Sett til domenet slik det er registrert hos plausible.io (t.d. `kravik.no`) – krev eige Plausible-abonnement. |
| `GITHUB_TOKEN` | ja* | Token med `contents: read/write` på dette repoet |
| `GITHUB_REPO` | ja* | T.d. `Raftevold/kravik-nettside` |
| `GITHUB_BRANCH` | nei | Standard `main` |
| `SMTP_HOST/PORT/USER/PASS` | nei | Aktiverer e-postvarsling for kontaktskjema og driftsvarsel |
| `MAIL_FROM` | nei* | Avsendaradresse. Påkravd når SMTP_USER ikkje er ei e-postadresse (t.d. Resend) |
| `CONTACT_EMAIL` | nei | Mottakar for varsling (standard: SMTP_USER) |

\* Utan GitHub-variablane køyrer sida fint, men admin-endringar forsvinn når
tenesta startar på nytt (Render gratisplan har flyktig filsystem). Med dei blir
kvar lagring committa til repoet og henta ned att ved oppstart.

**Om admin-passordet:** `data/auth.json` blir MEDVITE ikkje synka til GitHub
(deploy-repoet er offentleg – passordhashen skal aldri dit). Byter du passord i
admin, viser flash-meldinga den nye bcrypt-hashen: legg han inn i
`ADMIN_PASSWORD_HASH` i Render, elles gjeld ikkje endringa etter neste omstart.

**Tilråding:** bruk ein *fine-grained personal access token* avgrensa til dette
eine repoet (GitHub → Settings → Developer settings → Fine-grained tokens →
Repository access: berre dette repoet → Permissions: Contents read/write).

## Render gratisplan – kjende avgrensingar

- **Dvale:** tenesta søv etter ~15 min utan trafikk; første besøk etterpå tek
  30–60 sekund. Betalt plan fjernar dette.
- **Flyktig filsystem:** løyst med GitHub-synk (sjå over).
- **Deploy ved innhaldsendring:** `render.yaml` har `buildFilter.ignoredPaths:
  data/**`, så innhaldscommits frå admin utløyser IKKJE ny deploy.

## Statistikk

Sida tel sidevisingar anonymt (utan cookies/IP) og viser tala på
admin-dashbordet. Tala ligg i `data/stats.json` og blir synka til GitHub maks
kvar 30. minutt. For meir avansert analyse: opprett konto hos plausible.io og
sett `PLAUSIBLE_DOMAIN` – skriptet og CSP-reglane blir lagde til automatisk.

## Sikkerheitskopi

- Admin → Innstillingar → «Last ned innhald (JSON)».
- Heile historikken ligg dessutan i git – kvar admin-lagring er ein commit.
  Rull tilbake ved å reverte commiten og starte tenesta på nytt.

## E-post for kontaktskjema

Meldingar blir alltid lagra i admin-innboksen. For e-postvarsling i tillegg:
sett SMTP-variablane.

**Tilrådd oppsett (Resend):** Microsoft pensjonerer passordbasert SMTP i
Exchange Online (av som standard frå des. 2026), så bruk ein dedikert
utsendingsteneste i staden for @kravik.no-kontoen:

- `SMTP_HOST` = `smtp.resend.com`, `SMTP_PORT` = `465`
- `SMTP_USER` = `resend`, `SMTP_PASS` = API-nøkkel frå resend.com
- `MAIL_FROM` = `onboarding@resend.dev` (før domeneverifisering)
- `CONTACT_EMAIL` = mottakaradressa

Utan verifisert domene leverer Resend berre til kontoeigaren si adresse.
Ved domenebytet: verifiser kravik.no i Resend (DNS: SPF/DKIM-postar, rører
ikkje MX/e-posten elles), og byt MAIL_FROM til t.d. `nettside@kravik.no`
og CONTACT_EMAIL til `post@kravik.no`.

## Personvern i drift

- Meldingar frå kontaktskjemaet inneheld persondata. Som standard blir dei
  **ikkje** synkroniserte til GitHub – git-historikk kan nemleg ikkje slettast
  melding for melding, og då ville sletteplikta i GDPR art. 17 vore vanskeleg
  å oppfylle. Konsekvens på Render gratisplan: admin-innboksen kan bli tømd
  ved omstart/dvale.
- **Tilråding: sett opp SMTP-varsling** (over), slik at e-postkassa til
  bedrifta er den varige kanalen for kundemeldingar. Innboksen i admin er då
  eit praktisk arbeidsverktøy, ikkje arkivet.
- Om de heller vil ha varig innboks i admin: sett `SYNC_MESSAGES=true` og
  hald repoet **privat**. Ver då klar over at sletta meldingar framleis ligg
  i git-historikken til repoet.
- Slett gamle meldingar i admin når dei er ferdig behandla.
