# Anter-utgåva — levering 8. september 2026

## Levert
Ny visuell profil med djup marineblå, Anter-aqua, typografisk hierarki og store baderomsbilete. Forsida balanserer baderomsinspirasjon med sanitær, varme, sprinkler, VA, lokal historie og avdelingar. Kravik-logoen er varsamt forenkla som vektorordmerke. Nynorsk er vidareført.

Eigedomsdelen er fjerna frå navigasjon, søkjemotorkart og admin. Gamle adresser får HTTP 410. Gamle malar blir ikkje distribuerte. Comfort er fjerna frå synleg tekst og valde bilete. Det eldre prosjektet med illustrerte før/etter-bilete er bevart som upublisert utkast.

Administrasjonen har eiga visuell oppgradering. Framside/profil har over 80 strukturerte felt, seksjonsbrytarar og rekkjefølgje. Logoar, fargar, tekstar, bilete, meny, fakta, referansar, kjede og kontaktband kan redigerast. Partnarar, sider, tenester, prosjekt, kontaktpersonar, kontaktopplysningar og mottakar for nettskjema har eigne redigeringsflater. Profilfargar blir kontrastkontrollerte. Varsel om ulagrede endringar, biletførehandsvising, importvalidering, konfliktvern i dei nye redigeringsflatene og vern mot sletting av brukte bilete.

## Innhaldskjelder
- Kravik: https://www.kravik.no/om-oss og https://www.kravik.no/kontakt
- Miljøopplysningar: https://www.kravik.no/miljø-og-bærekraft
- Anter og modellen med lokale selskap: https://www.anter.no/ og https://www.anter.no/vare-selskaper/
- Inspirasjon: https://bvr.no/ og https://www.rorpartner-vvs.no/
- Brønnøysundregistrene (organisasjon/MVA): https://data.brreg.no/enhetsregisteret/api/enheter/917176442

Anter-tilknytinga er opplyst av oppdragsgivaren. Ingen ny leverandøravtale er funnen på Anters offentlege sider; selskap i Anter er ikkje framstilte som produktleverandørar. Husqvarna og Kellfri er vidareførte frå Kraviks eigne opplysningar.

## Bilete og logoar
- Original Anter-logo: https://www.anter.no/wp-content/uploads/2025/05/Anter-hovedlogo.svg og Anter-hoved-logo-negativ.svg.
- Kravik-vektor: public/img/logo-kravik-modern.svg. Opphavleg logo er bevart.
- Eitt nytt baderomsbilete er laga med den innebygde Imagegen-tenesta, merka «Baderomsinspirasjon · Illustrasjon». Optimaliserte prosjektfiler: data/uploads/bad-nordfjord-{sm,md,lg}.webp.
- Prompt: “Photorealistic architectural editorial interior photograph of a believable contemporary Norwegian bathroom. Natural oak floating vanity with two drawers, white washbasin and brushed nickel tap, wide rectangular softly backlit mirror, muted grey limestone-look ceramic wall and floor tiles, walk-in shower with clear glass and precise visible metal hardware. Natural daylight from one window. Landscape 3:2, straight verticals, normal eye height; centered composition useful in a 4:5 crop. Restrained real materials and clean plumbing detail. No people, logos, text, watermark, grandiose spa, arches, impossible fixtures, or gaudy gold.”
- Utstillings- og rørleggjarbilete kjem frå det eksisterande kundematerialet. Dei er ikkje merkte som nye kundeprosjekt. Synleg Comfort-profil er teken ut av det publiserte utvalet. Rettane til vidare bruk av kundemateriale og logoar må vere avklarte av eigaren.
- Manrope blir levert lokalt med SIL Open Font License i public/fonts/OFL-Manrope.txt. Anters kommersielle skrifttype er ikkje kopiert.

## Kontroll
Automatiske testar dekkjer offentlege ruter og lokale ressursar, metadata/landemerke, pensjonerte ruter, innlogging/CSRF, adminrendering, CMS-endringar, ugyldige importdata, kontrastval, avviste skjema, leveringsfeil, akseptert levering med simulert transport, øydelagde bilete og automatisk sletting av gamle meldingar/vedlegg. npm audit: ingen kjende sårbarheiter ved kontroll. Ingen reell testmelding er sendt til kunde eller eigar.

Ingen full manuell nettlesar-/skjermlesarrevisjon eller juridisk sertifisering er utført. Innebygd tastaturstøtte, synlege fokusmarkeringar, redusert rørsle, semantikk og responsiv CSS er vidareførte/forbetra.

## Før endeleg lansering på kravik.no
Den noverande Render-tenesta er Free og e-postoppsettet bruker ein eksisterande mottakar som ikkje er post@kravik.no. Førehandsvisinga beheld dette oppsettet. Vel korrekt mottakar i admin og verifiser reell levering til Kravik før domenelansering. Render Free kan bruke om lag eitt minutt på oppvakning og er ikkje tilrådd av Render for produksjon: https://render.com/docs/free.

Eit administrator-passordhash har historisk vore spora i deploy-repoet (seinare fjerna). Kjøretidsfilene er no ekskluderte. Bruk eit nytt administratorpassord før endeleg lansering dersom det historiske passordet framleis er i bruk; omskriving av git-historikken er ikkje utført.

Verksemda må stadfeste datoen for kjedebytet, godkjenne marknadsføringsinnhald, inngå/avklare nødvendige databehandlaravtalar og overføringsgrunnlag, og følgje sletterutinane for e-post og fagsystem. Personverninformasjonen beskriver dette oppsettet. Automatisk sletting gjeld den mellombelse nettsideinnboksen, ikkje e-postarkivet.

Regelgrunnlag brukt: https://www.uutilsynet.no/regelverk/kva-seier-forskrifta/153 , https://www.datatilsynet.no/personvern-pa-ulike-omrader/internett-og-apper/bruk-av-informasjonskapsler-og-andre-sporingsteknologier/ , https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/informasjon-og-apenhet/hva-skal-virksomheten-gi-informasjon-om/ .

## UI-finjustering etter tilbakemelding
Samla overskrift, ingress og lenkje i ei felles lesegruppe. Redusert seksjonsluft, fjerna forskyving i galleriet og retta avdelingsraden til to fylte kolonnar. Lærlinglinja er samla i ei eiga, kompakt flate. Framside er lagd til i den redigerbare menyen.

Partnarane har jamne kort med mørke logoflater og tydelege handlingar. Logo-bakgrunn kan veljast lys/mørk i admin. Telefonikon og nummer har fast storleik og blir ikkje brotne over fleire linjer. Botnområdet har ikkje lenger dobbel topp-padding.

Visuell kontroll av forside, galleri, mobilmeny og partnarar i nettlesar. Layout kontrollert ved breidder 320, 390, 768, 1024, 1440 og 1920 px. Dei 12 eksisterande funksjonstestane passerer. Dette er ei målretta UI-kontroll, ikkje ein full skjermlesarrevisjon.
