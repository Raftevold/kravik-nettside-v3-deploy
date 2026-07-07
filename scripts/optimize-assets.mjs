/**
 * Eingongs-skript (køyrt lokalt under utvikling): konverterer bileta som vart
 * lasta ned frå gamle kravik.no til WebP i tre storleikar under data/uploads/,
 * kopierer logoar til public/img/ og registrerer alt i data/content.json.
 *
 * Bruk: node scripts/optimize-assets.mjs <sti-til-nedlasta-assets>
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) {
  console.error('Oppgi sti til assets-mappa (med images/, gallery/, headers/)');
  process.exit(1);
}

const ROOT = path.join(import.meta.dirname, '..');
const UPLOADS = path.join(ROOT, 'data', 'uploads');
const PUBIMG = path.join(ROOT, 'public', 'img');
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(PUBIMG, { recursive: true });

const SIZES = [
  { suffix: 'lg', width: 1600, quality: 80 },
  { suffix: 'md', width: 800, quality: 78 },
  { suffix: 'sm', width: 400, quality: 75 },
];

const media = [];

async function toUploads(file, id, alt) {
  const buf = fs.readFileSync(file);
  const meta = await sharp(buf).metadata();
  for (const s of SIZES) {
    await sharp(buf)
      .rotate()
      .resize({ width: s.width, withoutEnlargement: true })
      .webp({ quality: s.quality })
      .toFile(path.join(UPLOADS, `${id}-${s.suffix}.webp`));
  }
  media.push({ id, w: meta.width, h: meta.height, alt });
  console.log(`uploads: ${id} (${meta.width}x${meta.height})`);
}

// --- Toppbilete/heroar ---
await toUploads(path.join(SRC, 'images', 'kampanjeside011.png'), 'hero-framsida', 'Moderne baderom med servant, spegel og badekar');
await toUploads(path.join(SRC, 'headers', 'header5.jpg.jpg'), 'header-om-oss', '');
await toUploads(path.join(SRC, 'headers', 'header2.jpg.jpg'), 'header-kontakt', '');
await toUploads(path.join(SRC, 'headers', 'header3.jpg.jpg'), 'header-opplaering', '');
await toUploads(path.join(SRC, 'headers', 'header6.jpg.jpg'), 'header-eigedom', '');
await toUploads(path.join(SRC, 'headers', 'Forside nettsiden (WEB & MOB) (15).jpg.jpg'), 'header-miljo', '');

// --- Portrett og leilegheiter ---
await toUploads(path.join(SRC, 'images', 'hilde.jpg'), 'hilde', 'Hilde Eikenæs Vik');
const leil = ['1catimg.jpg', '2catimg.jpg', '3camimg.jpg', '4camimg.jpg', '5camimg.jpg', '6camimg.jpg'];
for (let i = 0; i < leil.length; i++) {
  await toUploads(path.join(SRC, 'images', leil[i]), `leilegheit-${i + 1}`, '');
}

// --- Galleri (42 bilete frå gamle sida) ---
const galleryFiles = fs.readdirSync(path.join(SRC, 'gallery')).filter((f) => /\.jpe?g/i.test(f)).sort();
const gallery = [];
let n = 1;
for (const f of galleryFiles) {
  const id = `galleri-${String(n).padStart(2, '0')}`;
  await toUploads(path.join(SRC, 'gallery', f), id, '');
  gallery.push({ image: id });
  n++;
}

// --- Logoar til public/img (statiske) ---
const logoMap = {
  'logokravik.png': 'logo-kravik.png',
  'SG_GULL_SORTBOKS.png': 'sentralt-godkjent.png',
  'comfortlogo3.png': 'logo-comfort.png',
  'hysqvarna.png': 'logo-husqvarna.png',
  'kellfrilogo2.png': 'logo-kellfri.png',
};
for (const [src, dest] of Object.entries(logoMap)) {
  fs.copyFileSync(path.join(SRC, 'images', src), path.join(PUBIMG, dest));
  console.log(`public/img: ${dest}`);
}

// Kvit variant av logoen til footer (svart → kvit, beheld alfa)
await sharp(path.join(SRC, 'images', 'logokravik.png'))
  .negate({ alpha: false })
  .png()
  .toFile(path.join(PUBIMG, 'logo-kravik-kvit.png'));
console.log('public/img: logo-kravik-kvit.png');

// Apple touch-ikon frå favicon-designet
const faviconSvg = fs.readFileSync(path.join(ROOT, 'public', 'favicon.svg'));
await sharp(faviconSvg, { density: 300 }).resize(180, 180).png().toFile(path.join(ROOT, 'public', 'apple-touch-icon.png'));
console.log('public: apple-touch-icon.png');

// --- Oppdater content.json ---
const contentPath = path.join(ROOT, 'data', 'content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
content.media = media;
content.gallery = gallery;
fs.writeFileSync(contentPath, JSON.stringify(content, null, 2));
console.log(`content.json: ${media.length} bilete i media, ${gallery.length} i galleriet`);
