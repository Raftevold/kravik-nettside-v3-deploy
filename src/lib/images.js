/**
 * Biletpipeline: alle opplasta bilete blir konverterte til WebP i tre
 * storleikar (sm 400px, md 800px, lg 1600px breidd). Filnamn:
 * <id>-sm.webp / <id>-md.webp / <id>-lg.webp under data/uploads/.
 */
const path = require('path');
const sharp = require('sharp');
const store = require('./store');

const SIZES = [
  { suffix: 'lg', width: 1600, quality: 80 },
  { suffix: 'md', width: 800, quality: 78 },
  { suffix: 'sm', width: 400, quality: 75 },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[æå]/g, 'a')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'bilete';
}

// Reserverer id-en synkront, slik at to samtidige opplastingar med same
// filnamn ikkje kan få same id (sharp-prosesseringa tek fleire hundre ms).
const inFlight = new Set();

function uniqueId(base, existingIds) {
  let id = base;
  let i = 2;
  while (existingIds.includes(id) || inFlight.has(id) || store.uploadExists(`${id}-lg.webp`)) {
    id = `${base}-${i++}`;
  }
  return id;
}

async function processUpload(buffer, originalName, existingIds) {
  const id = uniqueId(slugify(originalName), existingIds);
  inFlight.add(id);
  try {
    return await doProcess(buffer, id);
  } finally {
    inFlight.delete(id);
  }
}

async function doProcess(buffer, id) {
  const image = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new Error('Fila ser ikkje ut til å vere eit gyldig bilete.');

  for (const size of SIZES) {
    const out = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: size.width, withoutEnlargement: true })
      .webp({ quality: size.quality })
      .toBuffer();
    store.saveUpload(`${id}-${size.suffix}.webp`, out);
  }

  return {
    id,
    w: meta.width,
    h: meta.height,
    alt: '',
  };
}

function deleteMedia(id) {
  for (const size of SIZES) {
    store.deleteUpload(`${id}-${size.suffix}.webp`);
  }
}

module.exports = { processUpload, deleteMedia, SIZES };
