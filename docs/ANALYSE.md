# Analyse av dagens kravik.no og strategi for ny nettside

*Utarbeidd 2. juli 2026. Grunnlag: full gjennomgang av alle sider på www.kravik.no,
inkl. den «skjulte» sida /kr-a-vik-eigedom-as, samt oppslag i Einingsregisteret (Brreg).*

## 1. Ærleg vurdering av dagens side

Dagens side er bygd på ein ASP.NET WebForms-plattform frå SicoData (copyright 2017)
og ber preg av å ikkje ha vore vedlikehalden på fleire år.

**Teknisk / fart**
- jQuery 3.3 (2018), Bootstrap, DevExpress-komponentar og fleire CSS/JS-filer som
  blokkerer rendering. ViewState-blob på fleire kilobyte blir sendt med kvar side.
- Hero-biletet på framsida er ein 1,9 MB PNG. Galleriet lastar 42 bilete på éi side.
- Ingen moderne biletformat (WebP/AVIF), ingen `srcset`, ingen lazy-loading.

**SEO**
- Sidetittel er berre «Kr A Vik» på alle sider – ingen unike titlar.
- Ingen meta-descriptions, ingen strukturert data (LocalBusiness), ingen sitemap.xml.
- Søkeord folk faktisk brukar («rørleggar Stryn», «bad Nordfjordeid», «varmepumpe»)
  finst knapt i tekstane.

**Innhald / truverd**
- Framsida sitt hovudbilete har alt-tekst `asdasdasdasda`.
- To av tre «partnar-boksar» på framsida har feil tekst: Husqvarna- og Kellfri-boksane
  viser Comfort sin tekst om oljefyr-forbodet **frå 2020** – seks år utdatert.
- «Kampanje»-sida inneheld berre eit statisk bilete utan lenke til aktuell kampanje.
- «Tegn badet ditt»-lenka i footeren peikar til ein død tredjeparts-URL med
  hardkoda `jsessionid`.
- E-postlenka til Sam Kjetil Torheim er feil (`/sam@kravik.no` – relativ URL, ikkje mailto).
- Opningstider, org.nr, referansar og sosiale medium finst ikkje på sida.
- Eigedomsselskapet er nesten usynleg – berre ei lita lenke øvst til høgre.

**Mobil / tilgjenge (WCAG)**
- Gamalt «Show navigation»-mønster, små klikkflater, manglande fokusmarkering.
- Tomme alt-attributt på nesten alle bilete, div-basert semantikk.
- Cookie-banner utan reelt samtykke («Ved å bruke nettstedet godtar du…» er ikkje
  gyldig samtykke etter GDPR) – samstundes som personvernsida nemner sporing frå
  Facebook, DoubleClick og Adform.

**Konvertering**
- Kontaktskjemaet har placeholder-tekst *inne i* felta (forsvinn ved fokus, WCAG-brot)
  og gir inga stadfesting.
- Ingen tydeleg CTA. Telefonnummeret er ikkje klikkbart. Dei tre store boksane på
  framsida sender trafikk *ut* av sida (til comfort.no, husqvarna.com, kellfri.no).

## 2. Kva bedrifta faktisk sel (og til kven)

Kr. A. Vik AS er ein solid, familieeigd rørleggarverksemd (sidan 1933, 4. generasjon,
21 tilsette, org.nr 917 176 442) med:

1. **Rørleggartenester** privat + prosjekt: sanitæranlegg, bad, varmeanlegg/varmepumper,
   sprinkler, VA, speilsveising, elektromuffesveising, kamera-/videoinspeksjon, kjerneboring.
2. **Butikk** i Stryn (Comfort-kjeden) + avdeling på Nordfjordeid.
3. **Landbruksavdeling**: maskiner og utstyr frå Husqvarna og Kellfri.
4. **Eigedomsutleige** gjennom søsterselskapet Kr. A. Vik Eigedom AS (30 leilegheiter).

Målgrupper: hus- og hytteeigarar i Nordfjord, byggherrar/entreprenørar, bønder,
ungdom som vurderer lærlingplass, og leigetakarar.

## 3. Primære konverteringshandlingar

1. **Ring oss** – klikkbart telefonnummer synleg i header, hero, footer og botnlinje på mobil.
2. **Be om tilbod / send melding** – kort skjema med tydeleg stadfesting, tilgjengeleg frå alle sider.
3. **Besøk butikken** – adresse, kart og (redigerbare) opningstider.

Sekundært: lærling-søknad (rekruttering) og leige-førespurnad (eigedom).

## 4. Sidestruktur

| Side | Føremål |
|---|---|
| `/` | Hero med CTA, truverdsmerke (1933, Sentralt godkjend, Miljøfyrtårn, Comfort), tenester, avdelingar, galleri-utdrag, kontakt |
| `/tenester` | Alle tenester med eigne ankerpunkt – SEO-sider for «rørleggar Stryn» m.m. |
| `/om-oss` | Historia sidan 1933, folka, sertifiseringar |
| `/butikk-og-landbruk` | Comfort-butikken + Husqvarna/Kellfri |
| `/opplaeringsbedrift` | Lærlingar / rekruttering med CTA |
| `/eigedom` | Kr. A. Vik Eigedom AS med leilegheitsgalleri (løftar fram det som i dag er gøymt) |
| `/miljo-og-berekraft` | Miljøfyrtårn + dokument |
| `/kontakt` | Skjema, kontaktpersonar, kart (samtykkestyrt), avdelingar |
| `/personvern`, `/informasjonskapslar` | GDPR |

Gamle URL-ar (`/om-oss`, `/kontakt`, `/opplæringsbedrift`, `/comfortavisa`,
`/miljø-og-bærekraft`, `/kr-a-vik-eigedom-as`, `/om-informasjonskapsler`) får
301-redirect slik at eksisterande lenker og SEO-verdi ikkje går tapt.

## 5. Teknologival

**Node.js 22 + Express + EJS (server-rendert) + vanilla CSS/JS.**

- Rein HTML frå serveren = raskt, robust og SEO-vennleg. Ingen byggjesteg.
- Køyrer på Render sin gratisplan utan database: alt innhald ligg i `data/content.json`
  + `data/uploads/`, og blir **synkronisert til GitHub-repoet ved kvar lagring** og
  henta ned att ved oppstart. Dermed overlever admin-endringar både dvale, omstart
  og redeploy – utan ekstern databaseteneste.
- `sharp` genererer WebP i tre storleikar for alle opplasta bilete.
- Tryggleik: helmet (CSP med nonce), bcrypt, rate-limiting, CSRF-vern, signerte
  sesjonscookies.
