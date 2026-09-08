# Kr. A. Vik — Anter-utgåva

Oppdatert nettstad for Kr. A. Vik AS i Stryn og på Nordfjordeid. Serverrendert HTML, lokal skrifttype, responsive WebP-bilete og små klientscript. Node 22 eller nyare, Express og EJS.

- Nettstad: https://kravik-nettside-v3.onrender.com
- Administrasjon: /admin
- Privat kjelderepo: https://github.com/Raftevold/kravik-nettside-v3
- Render-repo: https://github.com/Raftevold/kravik-nettside-v3-deploy

## Lokalt
```sh
npm ci
npm start
npm test
```

## Administrasjon
**Framside og profil** styrer tekst, bilete, fargar, meny, seksjonsrekkjefølgje, synlegheit, kjedeprofil, fakta og kontaktband. **Sider og SEO** styrer hovudinnhald, overskrifter og søkjemotorfelt. **Samarbeidspartnarar** styrer namn, logo, lenkje, beskriving og synlegheit. Kontaktpersonar, tenester, prosjekt, bilete, referansar, opningstider og varsel har eigne redigeringssider.

Prosjekt kan lagrast som utkast. Den gamle demonstrasjonen av baderomsrenovering er eit utkast; utstillingsbilete blir presenterte som inspirasjon. Eigedomsrutene svarer 410.

## Drift
Innhald og publiserbare bilete blir synkroniserte til GitHub. Passord, kundemeldingar og private vedlegg blir aldri synkroniserte. Skjema gir først positiv kvittering når e-postleverandøren har akseptert meldinga. Leveringsfeil gir forståeleg feilmelding; utan oppsett blir direkte telefon/e-post vist.

Nødvendige driftsverdiar: SESSION_SECRET, ADMIN_PASSWORD_HASH, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH og SITE_URL. E-post krev SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM og CONTACT_EMAIL. Resend bruker HTTPS. Mottakaren kan overstyrast under Kontaktinfo i admin.

Render-adressa er ei førehandsvising og blir ikkje indeksert. Ved domenelansering: set SITE_URL til faktisk domene. Render Free har dvale og flyktig disk; vel produksjonsdrift før endeleg lansering. DATA_DIR kan peike til ein privat varig disk (må initialiserast med content.json). Innboksen blir automatisk rydda etter 30 dagar, justerbart 1–90 i admin. E-postarkivet må følgjast opp separat.

Sjå docs/LEVERANSE-ANTER.md for innhaldskjelder, bilete, kontrollar og nødvendige driftsavklaringar.
