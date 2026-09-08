const groups = [
  ['Profil og navigasjon', [
    ['logoImage','Eiga logo (tomt = den moderniserte Kravik-logoen)','image',''],
    ['darkColor','Mørk profilfarge','color','#052634'],['accentColor','Aksentfarge','color','#68dccf'],['paperColor','Bakgrunnsfarge','color','#f5f5ef'],
    ['navItems','Meny – éi linje: Tekst | /adresse','textarea','Tenester | /tenester\nInspirasjon | /prosjekt\nButikk | /butikk-og-landbruk\nOm oss | /om-oss\nKontakt | /kontakt'],
    ['navCta','Knapp i menyen','text','Be om tilbod'],['navCtaUrl','Lenkje på menyknappen','url','/kontakt#kontaktskjema'],
    ['footerLinks','Snarvegar nedst – éi linje: Tekst | /adresse','textarea','Tenester | /tenester\nInspirasjon og galleri | /prosjekt\nButikk og landbruk | /butikk-og-landbruk\nBli lærling | /opplaeringsbedrift\nMiljø og berekraft | /miljo-og-berekraft'],
    ['sectionOrder','Rekkjefølgje – tenester, handverk, utstilling, anter, avdelingar','text','tenester, handverk, utstilling, anter, avdelingar'],
  ]],
  ['Framside: topp og fagstripe', [
    ['heroEyebrow','Lita linje over hovudtittelen','text','Rørleggaren i Nordfjord · Sidan 1933'],
    ['heroPrimaryUrl','Lenkje på hovudknappen','url','/kontakt#kontaktskjema'],
    ['heroSecondary','Sekundær lenkjetekst','text','Utforsk tenestene'],['heroSecondaryUrl','Sekundær lenkje','url','/tenester'],
    ['heroCaption','Bildetekst (merk illustrasjonar tydeleg)','text','Baderomsinspirasjon · Illustrasjon'],
    ['heroImageCta','Lenkjetekst på biletet','text','Frå idé til ferdig bad'],['heroImageUrl','Lenkje på biletet','url','/tenester#baderom'],
    ['heroSignature','Tekst ved kjedelogo','textarea','Lokale fagfolk.\nEit større fellesskap.'],
    ['stripeTitle','Fagstripe: stad','text','Stryn & Nordfjordeid'],['stripeText','Fagstripe: undertekst','text','To avdelingar. Same faglege stoltheit.'],['stripeServices','Fagstripe: tenester','text','Bad & sanitær / Varme / Sprinkler & VA'],
  ]],
  ['Framside: tenester', [
    ['showServices','Vis tenesteseksjonen','checkbox',true],['servicesEyebrow','Seksjonsetikett','text','01 / Dette kan vi'],['servicesTitle','Overskrift','text','Alt det du ser.'],['servicesTitleSecondary','Andre linje','text','Og alt bak veggen.'],
    ['servicesIntro','Ingress','textarea','Eit flott bad krev meir enn fine overflater. Vi tek oss av røyr, varme og tekniske anlegg – i heimar, hytter og næringsbygg.'],
    ['serviceImage','Bilete','image','galleri-21'],['serviceImageEyebrow','Lita tekst på biletet','text','Planlegg det nye badet'],['serviceImageTitle','Tittel på biletet','textarea','Rom for ein\nbetre kvardag.'],['serviceImageUrl','Biletlenkje','url','/tenester#baderom'],
    ['featuredServices','Teneste-ID-ar som skal visast, skilde med komma','text','sanitar, varme, sprinkler, va'],
    ['servicesLink','Lenkjetekst under tenestene','text','Alle tenester – frå service til større prosjekt'],
  ]],
  ['Framside: handverk og historie', [
    ['showCraft','Vis historieseksjonen','checkbox',true],['craftImage','Bilete','image','header-kontakt'],['craftCaption','Bildetekst','text','Faget ligg i detaljane.'],['craftEyebrow','Seksjonsetikett','text','02 / Folk som kan faget'],['craftTitle','Overskrift','textarea','Godt handverk\ngår i arv.'],
    ['craftBody','Tekst (tom linje = nytt avsnitt)','textarea','Fire generasjonar. Eitt fag. Sidan 1933 har familien Vik hjelpt folk i Nordfjord med vatn, varme og løysingar dei kan stole på.\n\nDu møter oss i Stryn og på Nordfjordeid. Vi kjenner området, tek ansvar for arbeidet og er her når du treng oss.'],
    ['craftLink','Lenkjetekst','text','Møt Kr. A. Vik'],['craftUrl','Lenkje','url','/om-oss'],['facts','Fakta – éi linje: Tal | Forklaring','textarea','1933 | Historia vår starta\n4. | generasjon\n2 | avdelingar'],
  ]],
  ['Framside: baderomsinspirasjon', [
    ['showGallery','Vis inspirasjonsseksjonen','checkbox',true],['galleryEyebrow','Seksjonsetikett','text','03 / Sjå. Kjenn. Vel.'],['galleryTitle','Overskrift','text','Finn ditt uttrykk.'],
    ['galleryIntro','Ingress','textarea','Innreiing, armatur og dei små detaljane som gjer badet ditt. Sjå eit utval frå utstillinga vår, eller kom innom i Stryn.'],['galleryLink','Lenkjetekst','text','Besøk butikken'],['galleryUrl','Lenkje','url','/butikk-og-landbruk'],
    ['galleryNote','Merknad under bileta','text','Bilete frå utstillinga. Utval og utstillingar kan endre seg.'],
    ...[1,2,3].flatMap((n)=>[['galleryImage'+n,'Bilete '+n,'image',['galleri-38','galleri-34','galleri-04'][n-1]],['galleryLabel'+n,'Tittel '+n,'text',['Lune material','Din personlege stil','Detaljar som fungerer'][n-1]],['galleryText'+n,'Tekst '+n,'text',['Treverk, lys og rolege flater.','Fargar og former som passar deg.','Gode val for dusj og armatur.'][n-1]]]),
  ]],
  ['Anter og kjedetilknyting', [
    ['showChain','Vis kjedeseksjonen','checkbox',true],['chainName','Kjedenamn','text','Anter'],['chainUrl','Kjedeadresse','url','https://www.anter.no/'],['chainLogo','Eiga kjedelogo (tomt = Anter)','image',''],['chainEyebrow','Etikett','text','Ein del av'],
    ['chainTitle','Overskrift','textarea','Lokalt forankra.\nSterkare saman.'],['chainBody','Tekst','textarea','Vi tek med oss namnet, folka og historia vår inn i Anter. Eit fellesskap av rørleggarbedrifter som deler kunnskap og byggjer vidare på det lokale handverket.'],['chainLink','Lenkjetekst','text','Bli kjend med Anter'],
  ]],
  ['Avdelingar, lærling og kontaktband', [
    ['showDepartments','Vis avdelingane på framsida','checkbox',true],['departmentsEyebrow','Etikett','text','04 / Nær deg'],['departmentsTitle','Overskrift','text','Vi er her i Nordfjord.'],['departmentsIntro','Tekst','textarea','Ein liten jobb eller eit stort prosjekt.\nTa kontakt med avdelinga di.'],
    ['apprenticeText','Lærlinglinje','text','Framtida treng gode fagfolk. Vi er godkjend opplæringsbedrift.'],['apprenticeLink','Lærlinglenkje: tekst','text','Bli lærling hos oss'],['apprenticeUrl','Lærlinglenkje','url','/opplaeringsbedrift'],
    ['ctaTitle','Kontaktband: overskrift','text','Kva kan vi hjelpe deg med?'],['ctaText','Kontaktband: tekst','textarea','Ring oss, send ei melding eller stikk innom butikken i Stryn. Vi hjelper deg med stort og smått.'],['ctaButton','Kontaktband: knapp','text','Send ein førespurnad'],['ctaUrl','Kontaktband: lenkje','url','/kontakt#kontaktskjema'],
  ]],
  ['Personvern og driftstekst', [
    ['privacyExtra','Tilleggsinformasjon i personvernerklæringa','textarea',''],
    ['mailProvider','E-postleverandør som mottar nettskjema','text','Resend (utsending via HTTPS) og verksemda si e-postløysing'],
    ['messageRetentionDays','Slettefrist for mellombels admin-innboks (dagar, 1–90)','number','30'],
  ]],
  ['Referansar og bedriftspresentasjon', [
    ['showReviews','Vis kundeomtalar på framsida','checkbox',true],['reviewsTitle','Overskrift over kundeomtalar','text','Godt arbeid blir lagt merke til.'],
    ['aboutFacts','Fakta på Om oss – éi linje: Tal | Forklaring','textarea','1933 | grunnlagd\n4. | generasjon i familien Vik\n2 | avdelingar: Stryn og Nordfjordeid'],
    ['aboutCredentials','Faglege opplysningar – éi per linje','textarea','Sentralt godkjend verksemd\nMiljøfyrtårn-sertifisert i 2022\nGodkjend opplæringsbedrift'],
  ]],
];
const defaults = Object.fromEntries(groups.flatMap(([,fields])=>fields.map(([key,,,value])=>[key,value])));
const read = c => { const d={...defaults, ...(c.design || {})}; for(const key of ['serviceImage','craftImage'])d[key]=d[key]||defaults[key]; return d; };
function safeUrl(value, fallback = '') {
  const s = String(value || '').trim();
  if (/^\/(?![\/\\])[^\s\\]*$/.test(s) && !/%(?:0a|0d|5c)/i.test(s)) return s;
  try { const u = new URL(s); if (u.protocol === 'https:' && !u.username && !u.password) return u.href; } catch {}
  return fallback;
}
function rows(value) { return String(value || '').split('\n').map(r=>r.split('|').map(x=>x.trim())).filter(r=>r[0] && r[1]); }
function parse(body, content) {
  const out = {};
  for (const [, fields] of groups) for (const [key,label,type,fallback] of fields) {
    let val = String(body[key] || '').trim().slice(0,type==='textarea'?10000:500);
    if (type==='checkbox') val = body[key]==='on';
    if (type==='color' && !/^#[0-9a-f]{6}$/i.test(val)) throw new Error(label+': bruk ein gyldig seks-sifra farge.');
    if (type==='url' && val && !safeUrl(val)) throw new Error(label+': bruk /intern-adresse eller https://.');
    if (type==='image' && val && !(content.media||[]).some(m=>m.id===val)) throw new Error(label+': biletet finst ikkje.');
    if (type==='number' && (!/^\d+$/.test(val) || Number(val)<1 || Number(val)>90)) throw new Error(label+': vel eit tal mellom 1 og 90.');
    out[key]=val;
  }
  if ([out.navItems,out.footerLinks].some(value=>rows(value).some(([,url])=>!safeUrl(url)))) throw new Error('Menyen eller snarvegane inneheld ei ugyldig lenkje.');
  const lum=hex=>{const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  if(contrast(out.darkColor,out.paperColor)<4.5||contrast(out.darkColor,out.accentColor)<4.5)throw new Error('Fargane har for låg tekstkontrast. Vel ein mørkare profilfarge eller ein lysare bakgrunn/aksent.');
  if(lum(out.darkColor)>.1||lum(out.paperColor)<.65||lum(out.accentColor)<.4)throw new Error('For å behalde god kontrast må profilfargen vere mørk og bakgrunn/aksent lyse.');
  return out;
}
module.exports = {groups, defaults, read, safeUrl, rows, parse};
