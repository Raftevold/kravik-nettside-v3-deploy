# Flytte kravik.no til den nye sida – utan å røre e-posten

Kartlagt 9. juli 2026 (offentlege DNS-/registeroppslag).

## Dagens oppsett

| Kva | Leverandør | Detaljar |
|---|---|---|
| Domene (registrar) | **Domeneshop AS** | kravik.no, DNS-sona ligg òg her (ns1–3.hyp.net) |
| Nettside i dag | **Sico Data AS** | Gamal ASP.NET-løysing på eigen server (IP 77.88.105.236, GlobalConnect-nett) |
| E-post | **Microsoft 365** | MX → kravik-no.mail.protection.outlook.com |
| Andre utsendarar | Fjordane IT («straumpost.no») | Står i SPF-recorden – truleg faktura-/systemutsending. MÅ bli ståande. |

**Nøkkelinnsikt:** E-posten går gjennom Microsoft og har INGENTING med webserveren
å gjere. Byttet endrar berre kvar *nettsida* peikar – MX/SPF/TXT står urørde.
Domenet blir verande hjå Domeneshop; vi flyttar ikkje registrar og endrar
ikkje namnetenarar.

## Før byttet (gjer klart i god tid)

1. **Avklar innlogging til Domeneshop.** Kunden (eller Sico) har kontoen.
   Be om tilgang, eller send Sico/Domeneshop endringane i punkt «Sjølve byttet».
2. **Oppgrader Render til Starter** ($7/mnd) – free-planen søv ved inaktivitet,
   det kan ikkje kundane til Kravik møte.
3. **Byt testpassordet** i admin (ADMIN_PASSWORD_HASH på Render) til noko sterkt.
4. **Legg inn domena i Render:** Dashboard → kravik-nettside-v3 → Settings →
   Custom Domains → legg til `kravik.no` (www blir lagt til og omdirigert
   automatisk). Render viser då dei eksakte DNS-verdiane og ordnar
   HTTPS-sertifikat sjølv.
5. **Oppdater `SITE_URL`** på Render til `https://kravik.no` (styrer canonical,
   sitemap og strukturerte data). Manuell deploy etterpå.
6. *(Valfritt, bra for SEO)*: legg inn 301-omdirigeringar frå gamle URL-ar
   (t.d. `/kr-a-vik-eigedom-as` → `/eigedom`) før byttet.

## Sjølve byttet (2 postar i Domeneshop sitt DNS-panel)

| Post | Frå | Til |
|---|---|---|
| `kravik.no` (A) | 77.88.105.236 | **216.24.57.1** (Render sin load-balancer) |
| `www.kravik.no` | (peikar på same IP i dag) | **CNAME → kravik-nettside-v3.onrender.com** |

**Ikkje rør noko anna** – ikkje MX, ikkje TXT/SPF, ikkje autodiscover eller
andre postar. Dei høyrer til e-posten og faktura-utsendinga.

Domeneshop har normalt 1 times TTL – endringa slår gjennom for dei fleste
innan ein time.

## Verifisering (same dag)

- [ ] https://kravik.no viser den nye sida med gyldig sertifikat (hengelås)
- [ ] https://www.kravik.no omdirigerer til kravik.no
- [ ] Send ein e-post TIL post@kravik.no og sjå at han kjem fram
- [ ] Send ein e-post FRÅ ei @kravik.no-adresse og sjå at han kjem fram
- [ ] Kontaktskjemaet på nye sida fungerer (meldinga dukkar opp i admin)
- [ ] Admin-innlogging og ei prøveendring fungerer på det nye domenet

## Tilbakerulling (om noko skulle skjere seg)

Sett A-posten for `kravik.no` tilbake til `77.88.105.236` og fjern
CNAME-endringa for www. Gamlesida er tilbake innan TTL-en (~1 time).
E-posten er uansett upåverka gjennom heile prosessen.

## Etterpå

- La abonnementet hjå Sico Data stå i t.d. 2–4 veker til alt er stadfesta
  stabilt, og sei det så opp (sjekk oppseiingstid). Ver tydeleg på at berre
  *web* skal seiast opp – IKKJE noko som gjeld e-post eller anna IT-drift dei
  eventuelt leverer.
- Domeneshop-abonnementet (domenet) skal IKKJE seiast opp – det er sjølve
  domenet og DNS-en.
- Microsoft 365 held fram nøyaktig som før.
