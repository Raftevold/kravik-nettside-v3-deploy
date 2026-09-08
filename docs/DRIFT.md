# Drift av Kravik / Anter

## Helsesjekk
- `GET /health`: 200 når nettsida har innhald å vise. Dette er Render sin helsesjekk.
- `GET /health/synk`: 500 ved feil i GitHub-synken, degradert oppstart eller token som utløper om mindre enn 14 dagar.
- Ved degradert modus blir deploy-versjonen vist. Synk er sperra til oppstartshenting lukkast. Oppdater GitHub-tokenet i Render dersom det er utgått.

## Miljøvariablar
| Variabel | Bruk |
|---|---|
| SITE_URL | Endeleg offentleg adresse for canonical, sitemap og JSON-LD |
| SESSION_SECRET | Lang tilfeldig sesjonsnøkkel |
| ADMIN_USER / ADMIN_PASSWORD_HASH | Administratorbrukar og bcrypt-hash for passord |
| GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH | Varig lagring av offentleg CMS-innhald og bilete |
| SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS | Transport for skjema og driftsvarsel |
| MAIL_FROM | Verifisert avsendaradresse |
| CONTACT_EMAIL | Standard mottakar; kan overstyrast i Admin → Generelt → Mottakar for nettskjema |
| DATA_DIR | Valfri absolutt datamappe for ei teneste med varig disk |
| PLAUSIBLE_DOMAIN | Valfri cookie-fri analyse; krev separat oppsett |

Bruk eit GitHub-token avgrensa til Contents read/write på berre deploy-repoet. Innhald og offentlege bilete kan liggje i GitHub; kundemeldingar, vedlegg og passordhashar skal aldri dit. SYNC_MESSAGES er slått permanent av i kode.

Admin-passordet blir medvite ikkje synka til GitHub. Ved passordbyte viser admin ein ny bcrypt-hash som må setjast i ADMIN_PASSWORD_HASH i Render for å overleve neste omstart. Ikkje publiser hashen. Sjå også [lanseringsmerknadene](LEVERANSE-ANTER.md).

## Render og publisering
Kjelda ligg i main i det private utviklingsrepoet. Deploy-spegelens main blir bygd av Render. Innhaldscommits under data/ skal ikkje starte ny deploy (buildFilter i render.yaml).

Render Free har flyktig filsystem og kan gå i dvale. GitHub-synk bevarer det offentlege CMS-innhaldet, men erstattar ikkje varig lagring av kundemeldingar. Til ordinær produksjon bør eigaren velje eit driftsoppsett med kapasitet og varig lagring tilpassa verksemda. Sjå https://render.com/docs/free.

## Kontaktskjema og e-post
Skjemaet er tilgjengeleg når e-posttransporten er konfigurert. Ei melding blir først stadfesta som sendt når transporten har akseptert henne. Ved leveringsfeil får brukaren feilmelding og behaldne tekstfelt; den mellombelse meldinga blir sletta. Akseptert transport er ikkje garanti for innbokslevering.

Med SMTP_HOST=smtp.resend.com blir Resend sitt HTTPS-API brukt. Andre SMTP-vertar bruker Nodemailer. Verifiser avsendardomenet og mottakaren i leverandøren før reell bruk. Den eksisterande førehandsvisinga har ein test-/eigarmottakar, ikkje post@kravik.no. Ingen reell testmelding er sendt i denne leveransen.

Innboksen i admin er mellombels og kan forsvinne ved omstart på Free. Aksepterte meldingar med vedlegg blir sende til e-postmottakaren. Admin viser e-poststatus. Sett slettefrist i Framside og profil (1–90 dagar, standard 30); gamle lokale meldingar og vedlegg blir sletta ved oppstart, kvar time og ved bruk av innboksen. Verksemda må i tillegg ha sletterutinar for e-post og fagsystem.

## Innhald og sikkerheitskopi
- Framside og profil: fargar, logo, meny, bilete, seksjonar, rekkjefølgje og tekstar.
- Sider, tenester, prosjekt, galleri, kontaktpersonar og partnarar: eigne redigeringssider.
- Innstillingar: last ned innhald som JSON. Import blir validert og tek ein lokal kopi før overskriving.
- Git-historikken tek vare på offentlege innhaldsendringar. Last også ned opplasta bilete ved full backup.
- Passord og kundemeldingar skal ikkje vere del av ein offentleg backup.

## Personvern og statistikk
Ingen kart blir lasta før samtykke. Kartvalet blir lagra lokalt i nettlesaren i inntil 180 dagar og kan endrast i botnmenyen. Det er ikkje behov for samtykkebanner ved vanleg sidevising utan eksternt kart.

Sidevisingar blir talde utan IP-adresse eller besøks-ID. Lokal statistikk kan synkast til GitHub. Kundemeldingar er aldri ein del av denne statistikken. Personverninformasjonen må haldast i samsvar med dei faktiske leverandørane, avtalane, mottakarane og sletterutinane.
