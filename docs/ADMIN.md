# Administrasjonssida – brukarrettleiing

> 💡 Det finst òg ei innebygd handbok direkte i admin: **Admin → ❓ Handbok**
> – kort forklaring på alt, alltid oppdatert der du treng ho.

## Innlogging

- **URL:** `https://<di-adresse>/admin` (lenkje «Logg inn» ligg òg nedst i footeren)
- **Brukarnamn:** `admin`
- **Passord:** utlevert separat. Byt det under «Innstillingar» første gong du
  loggar inn (minst 10 teikn).
- Du blir logga ut automatisk etter 8 timar. Etter 10 feilforsøk på rad blir
  innlogginga sperra i 15 minutt (vern mot gjetting).

## Kva kan du endre?

| Meny | Innhald |
|---|---|
| **Oversikt** | Ferie-/driftsmodus (slå på varsellinja med eitt klikk frå ferdige malar), besøksstatistikk, status og snarvegar |
| **Meldingar** | Innboks for kontaktskjema, tilbodsførespurnadar (merkte «Tilbod» med jobbtype/adresse) og lærling-søknader (merkte «Lærling») |
| **Sider og SEO** | Tekstane på kvar side + SEO-tittel og -beskriving |
| **Tenester** | Legg til, endre, slette og flytte tenester |
| **Kontaktpersonar** | Folk med telefon/e-post (vist på Om oss + Kontakt) |
| **Bilete og galleri** | Last opp (auto-komprimering), alt-tekst, slett, galleri av/på |
| **Referansar** | Kundeomtalar (vist på framsida når minst éin finst) |
| **Leilegheiter** | Adresse med autoforslag frå Kartverket (kartet på sida kjem automatisk), fleire bilete per leilegheit med val av framsidebilete, status, beskriving og nøkkelinfo |
| **Varsellinje** | Smal melding øvst på alle sider – av/på, tekst og valfri lenkje |
| **Kontaktinfo m.m.** | Adresse, telefon, e-post, org.nr, avdelingar, opningstider, sosiale medium, kart |
| **Innstillingar** | Byt passord, sikkerheitskopi (eksport/import), teknisk status |

## Tips

- **Avsnitt:** tom linje i tekstfelta gir nytt avsnitt på sida.
- **Opningstider:** éi linje per oppføring, t.d. `Måndag–fredag|07.30–15.30`.
  Dei blir viste automatisk på framsida, kontakt- og butikksida – og i
  Google-søkjeresultat (strukturert data).
- **Alt-tekstar** på bilete hjelper både synshemma og Google – skriv kort kva
  biletet viser.
- **Varsellinja** er perfekt til feriestenging og kampanjar: skriv tekst, huk av
  «Vis varsellinja», lagre. Fyller du ut lenkje (t.d. `/kontakt`) blir heile
  linja klikkbar.

## Kvar hamnar meldingane frå kontaktskjemaet?

Alle innsendingar ligg under **Meldingar** i admin. Om de vil ha dei på e-post
i tillegg: sett opp SMTP (sjå `docs/DRIFT.md`).
