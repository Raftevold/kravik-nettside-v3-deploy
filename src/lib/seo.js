/**
 * SEO-hjelparar: JSON-LD (schema.org LocalBusiness/Plumber), sitemap og robots.
 */

function baseUrl(req) {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
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
  if (Array.isArray(s.openingHours) && s.openingHours.length) {
    ld.openingHours = s.openingHours.map((o) => `${o.label} ${o.value}`);
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
    ...(content.properties || []).filter((p) => p.slug).map((p) => ({ path: `/eigedom/${p.slug}`, priority: '0.5' })),
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
