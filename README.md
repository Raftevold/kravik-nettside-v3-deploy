# Kr. A. Vik AS – nettside (v3 «levande»)

Moderne, rask og universelt utforma nettside for Kr. A. Vik AS – familieeigd
rørleggarbedrift i Stryn og på Nordfjordeid sidan 1933. Bygd som erstatning for
gamle kravik.no.

**v3** legg eit gjennomarbeidd rørslelag oppå v2: sida kjennest levande og
engasjerande, men aldri masete. Temaspråket er henta frå faget – vatn, flyt og
varme for rørleggardelen, varmt kveldslys for eigedomsdelen. Sjå
`docs/RORSLE.md` for full oversikt over effektane og prinsippa bak.

## Rørslelaget i korte trekk

- **Signaturaugneblink**: hero med luftbobler som vik unna peikaren (canvas),
  ord-for-ord-avduking av tittelen og ei levande bølgje der vatnet møter
  innhaldet
- **Scroll-avduking** med stagger på kort, galleri og seksjonar – merka opp av
  JS, så malane er urørte
- **Mikrointeraksjonar**: koppardråpe-fyll på primærknappar, vassring ved kvart
  klikk/tap, koparglød som følgjer peikaren over kort, ikon som «dryp», damp på
  varme-ikonet (skjult perle)
- **Eigedom = eige register**: sakte «gyllen time»-zoom og kveldslys på
  leilegheitskorta, lysstøv-canvas i sidehovudet, sonar-puls på Ledig-merket
- **Alt er progressiv forbetring**: utan JavaScript, eller med
  `prefers-reduced-motion`, er sida identisk med v2 – alt innhald fullt synleg
- **CSP-trygt og billeg**: ingen bibliotek, ingen inline-stilar, berre
  transform/opacity + éin lettvektig canvas som pausar utanfor skjermen

## Teknologi

- **Node.js 22 + Express + EJS** – server-rendert HTML, ingen byggjesteg
- **Innebygd CMS** på `/admin` – all tekst, bilete, tenester, kontaktinfo,
  opningstider, referansar, SEO-felt og varsellinje kan endrast utan kode
- **sharp** – alle bilete blir automatisk konverterte til WebP i tre storleikar
- **GitHub-basert persistens** – innhald og opplasta bilete blir committa til
  dette repoet og henta ned att ved oppstart, slik at endringar overlever
  Render gratisplan sitt flyktige filsystem
- **Tryggleik** – helmet (CSP med nonce), bcrypt, rate-limiting, CSRF-vern,
  signerte sesjonscookies

## Kom i gang lokalt

```bash
npm install
npm start          # http://localhost:3000
```

Innlogging til admin: sjå `docs/ADMIN.md`.

## Deploy

Sjå `render.yaml` (Render Blueprint) og `docs/DRIFT.md` for miljøvariablar,
GitHub-synk og e-postoppsett.

## Dokumentasjon

- `docs/ANALYSE.md` – vurdering av gamle sida + strategi for den nye
- `docs/ADMIN.md` – brukarrettleiing for administrasjonssida
- `docs/DRIFT.md` – drift, miljøvariablar, backup og kjende avgrensingar
