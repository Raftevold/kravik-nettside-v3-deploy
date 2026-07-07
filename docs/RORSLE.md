# Rørslelaget (v3)

v3 legg animasjonar og liv oppå v2 utan å endre innhald, struktur eller admin.
Alt ligg i to filer:

| Fil | Innhald |
|---|---|
| `public/css/motion.css` | Alle animasjonar, overgangar og hover-effektar |
| `public/js/motion.js` | Scroll-avduking, teljarar, canvas, bølgje, dropeklikk m.m. |

I tillegg: éi lenkje i `views/partials/top.ejs`, éin script-tag i
`views/partials/bottom.ejs`, og dei to filene er lagde til i
`assetVersion()`-lista i `src/app.js` (cache-busting).

## Prinsipp

1. **Progressiv forbetring.** JS merkjer sjølv opp elementa (`data-avduk`) og
   legg klassa `har-js` på `<html>`. All «skjult før avduking»-CSS er gata bak
   `html.har-js` – utan JavaScript er sida nøyaktig som v2, med alt synleg.
2. **`prefers-reduced-motion: reduce` slår av alt.** motion.js avsluttar før
   det gjer noko som helst; all animasjons-CSS ligg i
   `@media (prefers-reduced-motion: no-preference)`; og site.css har frå før
   ein global kill-switch. Trippel sikring.
3. **CSP-trygt.** CSP-en blokkerer inline `style=""`-attributt. Rørslelaget
   kommuniserer difor berre via klassar og CSS-variablar sette med
   `el.style.setProperty(...)` (CSSOM – lovleg). Ingen bibliotek, ingen CDN.
4. **Billeg.** Berre `transform`/`opacity` i overgangar (null CLS), éin
   lettvektig canvas per side som pausar når fana er gøymd eller flata er
   utanfor skjermen, DPR avgrensa til 1,5, og spare-modus (`saveData` /
   få CPU-kjernar) hoppar over canvasen heilt.
5. **Eitt formspråk.** Felles easing-tokens (`--ease-ut`, `--ease-mikro`,
   `--ease-skvulp`) og varigheitsskala (`--t-blip` … `--t-tal`), så alt
   kjennest som éin designar. Rørleggar = vatn/flyt (petrol/koppar),
   eigedom = varmt kveldslys.

## Effektane

### Framsida / rørleggar
- **Hero-koreografi**: merke → tittel (ord for ord or kvar si «lomme») →
  ingress → knappar → truverd-liste, med roleg innzooming av heltebiletet
- **Luftbobler** (canvas): stig roleg og vik unna musepeikaren
- **Bølgje** nedst i heroen, to lag som driv kvar sin veg (26 s / 17 s)
- **Scroll-avduking** med stagger over alle seksjonar/kort/galleri
- **H2-maskereveal**: overskrifter stig opp, så blir ein kort koppar-strek
  «lagd som eit røyr» under
- **Teljande tal**: 1933 tel frå 1900, 21 og 2 frå null (tabulære siffer –
  ingen hopping)
- **Koppardråpe**: mørkare koppar «fyller» primærknappar nedanfrå ved hover
- **Vassring** der du klikkar/tek på knappar og galleribilete
- **Koparglød** som følgjer peikaren over kort; ikonet «dryp» ved hover
- **Dampen** (skjult perle): varme-ikonet dampar så lenge du held over
- **Skrollmedviten header**: skygge + komprimering, gøymer seg på veg ned
  (etter 400 px), kjem att ved første rørsle opp eller tastaturfokus
- **Leseprogress**: tynn koparlinje øvst
- **CTA-bandet**: sakte glidande gradient + to rolege ringar som veks fram
  éin gong og blir ståande
- **Før/etter-glidaren** nudgar seg sjølv éin gong (50→42→50) for å vise at
  han kan dragast – avbrytast momentant om brukaren tek i han
- **Footer-gardina**: sida løftar seg og avdekkjer footeren (berre når
  footeren får plass i viewporten – JS måler)
- **Skjema**: koppar-strek fyller feltet ved fokus; kvitteringa «feirar» éin gong
- **Sidebyte**: mjuk kryssfading via View Transitions (Chromium, gratis)

### Eigedom (eige register: «gyllen time»)
- **Lysstøv-canvas** i sidehovudet: varme lyskorn + tynne diagonale linjer
- **Leilegheitskorta**: sakte ken burns-zoom (5 s) som aldri blir «ferdig»,
  varmt kveldslys stig opp i biletet ved hover
- **Ledig-merket** pulserer rolege sonar-ringar (0,36 Hz – langt under
  WCAG-grensa på 3 blink/s); «Utleigd» står bom stille med vilje

## Universell utforming

- **Synleg rørsle-brytar** («Slå av animasjonar») i footeren på alle sider
  (WCAG 2.2.2). Valet ligg i localStorage og gjeld til det blir slått på att.
  OS-innstillinga `prefers-reduced-motion` blir sjølvsagt òg respektert.
- Alt dekorativt er `aria-hidden="true"` og `pointer-events: none`
- Hover-effektar har fokus-ekvivalentar (`:focus-visible`/`:focus-within`)
- Headeren viser seg alltid att ved tastaturfokus (`focusin`)
- Ord-splittinga av hero-tittelen brukar vanlege tekstnodar i `<span>` –
  skjermlesarar les tittelen som før
- Ingenting blinkar over 3 Hz; ingen autoplay utan pause-åtferd
- Med `prefers-reduced-motion` eller utan JS: statisk side, alt innhald synleg

## Vedlikehald

- Ny seksjon/kort-type som skal avdukast? Legg selektoren i `AVDUK`-lista
  øvst i `motion.js` – ferdig.
- Nye ikon med damp: JS kjenner att varme-ikonet på SVG-pathen; endrar du
  ikonet, oppdater prefikset i `motion.js` (søk etter `kort-ikon-varme`).
- Fjerne alt liv mellombels? Slett dei to `<link>`/`<script>`-linjene i
  `top.ejs`/`bottom.ejs` – sida fell tilbake til v2.
