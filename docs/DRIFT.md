# Drift

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
| `SMTP_HOST/PORT/USER/PASS` | nei | Aktiverer e-postvarsling for kontaktskjema |
| `CONTACT_EMAIL` | nei | Mottakar for varsling (standard: SMTP_USER) |

\* Utan GitHub-variablane køyrer sida fint, men admin-endringar forsvinn når
tenesta startar på nytt (Render gratisplan har flyktig filsystem). Med dei blir
kvar lagring committa til repoet og henta ned att ved oppstart.

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
sett SMTP-variablane (t.d. frå Domeneshop/One.com/Microsoft 365 som bedrifta
alt brukar for @kravik.no-adressene).

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
