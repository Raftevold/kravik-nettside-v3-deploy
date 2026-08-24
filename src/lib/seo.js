/**
 * SEO-hjelparar: JSON-LD (schema.org LocalBusiness/Plumber), sitemap og robots.
 */

function baseUrl(req) {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

// Norske dagnamn → schema.org-dagar. Etikettane i admin er fritekst
// («Måndag–fredag | 07:30–15:30»), så vi tolkar det vanlegaste formatet og
// hoppar stille over linjer vi ikkje forstår (då gjeld berre vising på sida).
const DAG_TIL_SCHEMA = {
  mandag: 'Monday', måndag: 'Monday', man: 'Monday', mån: 'Monday',
  tysdag: 'Tuesday', tirsdag: 'Tuesday', tys: 'Tuesday', tir: 'Tuesday',
  onsdag: 'Wednesday', ons: 'Wednesday',
  torsdag: 'Thursday', tor: 'Thursday',
  fredag: 'Friday', fre: 'Friday',
  laurdag: 'Saturday', lørdag: 'Saturday', lau: 'Saturday', lør: 'Saturday',
  sundag: 'Sunday', søndag: 'Sunday', sun: 'Sunday', søn: 'Sunday',
};
const DAG_REKKJE = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function tolkOpningstid(o) {
  const tid = String(o.value || '').match(/(\d{1,2})[:.](\d{2})\s*[–\-−]\s*(\d{1,2})[:.](\d{2})/);
  if (!tid) return null;
  const opens = `${tid[1].padStart(2, '0')}:${tid[2]}`;
  const closes = `${tid[3].padStart(2, '0')}:${tid[4]}`;
  const label = String(o.label || '').toLowerCase();
  const range = label.match(/([a-zæøå]+)\s*[–\-−]\s*([a-zæøå]+)/);
  let dagar = [];
  if (range && DAG_TIL_SCHEMA[range[1]] && DAG_TIL_SCHEMA[range[2]]) {
    const fra = DAG_REKKJE.indexOf(DAG_TIL_SCHEMA[range[1]]);
    const til = DAG_REKKJE.indexOf(DAG_TIL_SCHEMA[range[2]]);
    if (fra >= 0 && til >= fra) dagar = DAG_REKKJE.slice(fra, til + 1);
  } else {
    const enkelt = label.match(/[a-zæøå]+/);
    if (enkelt && DAG_TIL_SCHEMA[enkelt[0]]) dagar = [DAG_TIL_SCHEMA[enkelt[0]]];
  }
  if (!dagar.length) return null;
  return { '@type': 'OpeningHoursSpecification', dayOfWeek: dagar, opens, closes };
}

function plumberJsonLd(content, url) {
  const s = content.site;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Plumber',
    '@id': `${url}/#verksemd`,
    name: s.name,
    legalName: s.legalName || s.name,
    url: `${url}/`,
    telephone: `+47 ${s.phone}`,
    email: s.email,
    foundingDate: '1933',
    identifier: {
      '@type': 'PropertyValue',
      name: 'Organisasjonsnummer',
      value: (s.orgnr || '').replace(/\s/g, ''),
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: s.address.street,
      postalCode: s.address.zip,
      addressLocality: s.address.city,
      addressCountry: 'NO',
    },
    areaServed: ['Stryn', 'Nordfjordeid', 'Nordfjord'],
  };
  if (content.pages.home.heroImage) {
    ld.image = `${url}/media/${content.pages.home.heroImage}-lg.webp`;
  }
  if (Array.isArray(s.openingHours) && s.openingHours.length) {
    const spec = s.openingHours.map(tolkOpningstid).filter(Boolean);
    if (spec.length) ld.openingHoursSpecification = spec;
  }
  if (Array.isArray(s.social) && s.social.length) {
    ld.sameAs = s.social.map((x) => x.url).filter(Boolean);
  }
  return ld;
}

function eigedomJsonLd(content, url) {
  const p = content.pages.eigedom;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kr. A. Vik Eigedom AS',
    url: `${url}/eigedom`,
    telephone: p.contactPhone ? `+47 ${p.contactPhone}` : undefined,
    email: p.contactEmail || undefined,
    identifier: p.orgnr
      ? { '@type': 'PropertyValue', name: 'Organisasjonsnummer', value: p.orgnr.replace(/\s/g, '') }
      : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: content.site.address.street,
      postalCode: content.site.address.zip,
      addressLocality: content.site.address.city,
      addressCountry: 'NO',
    },
  };
}

const ROUTES = [
  { path: '/', priority: '1.0' },
  { path: '/tenester', priority: '0.9' },
  { path: '/om-oss', priority: '0.8' },
  { path: '/butikk-og-landbruk', priority: '0.8' },
  { path: '/opplaeringsbedrift', priority: '0.6' },
  { path: '/eigedom', priority: '0.7' },
  { path: '/miljo-og-berekraft', priority: '0.5' },
  { path: '/prosjekt', priority: '0.7' },
  { path: '/kontakt', priority: '0.9' },
  { path: '/personvern', priority: '0.2' },
  { path: '/informasjonskapslar', priority: '0.2' },
];

function sitemapXml(content, url) {
  const lastmod = (content.updatedAt || new Date().toISOString()).slice(0, 10);
  const dynamic = [
    ...(content.projects || []).map((p) => ({ path: `/prosjekt/${p.id}`, priority: '0.6' })),
    // Tynne leilegheitssider (utan beskriving og utan bilete) held vi ute av
    // sitemap – dei er framleis lenka frå /eigedom, men ikkje framheva.
    ...(content.properties || [])
      .filter((p) => p.slug && (p.description || (p.images || []).length))
      .map((p) => ({ path: `/eigedom/${p.slug}`, priority: '0.5' })),
  ];
  const items = [...ROUTES, ...dynamic]
    .map((r) => `  <url><loc>${url}${r.path}</loc><lastmod>${lastmod}</lastmod><priority>${r.priority}</priority></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function robotsTxt(url) {
  return `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${url}/sitemap.xml\n`;
}

module.exports = { baseUrl, plumberJsonLd, eigedomJsonLd, sitemapXml, robotsTxt };
