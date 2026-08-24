/**
 * Ekte Google-omtalar på framsida – henta server-side frå Places API (New).
 *
 * Aktiverast med miljøvariablane GOOGLE_PLACES_API_KEY og GOOGLE_PLACE_ID
 * (sjå DRIFT.md for korleis ein finn dei). Utan dei er funksjonen heilt av
 * og sida oppfører seg som før.
 *
 * - Berre omtalar med minst MIN_STJERNER (4) og tekst blir viste.
 * - Samla vurdering («4,8 av 27 omtalar») blir alltid vist når tilgjengeleg.
 * - Alt blir henta i bakgrunnen og mellomlagra i minnet – ingen kall frå
 *   nettlesaren til Google, og sida blir aldri treg eller ustabil av dette.
 */
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const PLACE_ID = process.env.GOOGLE_PLACE_ID || '';
const MIN_STJERNER = 4;
const OPPDATER_KVAR_MS = 12 * 60 * 60 * 1000; // 12 timar

const enabled = Boolean(API_KEY && PLACE_ID);

let data = null; // { rating, count, mapsUri, reviews: [...], fetchedAt }

async function hent() {
  if (!enabled) return;
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}?languageCode=no&regionCode=NO`,
      {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews',
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) throw new Error(`Places API ${res.status}`);
    const json = await res.json();
    data = {
      rating: json.rating || null,
      count: json.userRatingCount || 0,
      mapsUri: json.googleMapsUri || '',
      reviews: (json.reviews || [])
        .filter((r) => (r.rating || 0) >= MIN_STJERNER && r.text && r.text.text)
        .map((r) => ({
          rating: r.rating,
          text: String(r.text.text).slice(0, 400),
          author: (r.authorAttribution && r.authorAttribution.displayName) || 'Google-brukar',
          when: r.relativePublishTimeDescription || '',
        })),
      fetchedAt: new Date().toISOString(),
    };
    console.log(`[google-omtalar] Henta: ${data.rating} stjerner, ${data.count} omtalar, ${data.reviews.length} viste`);
  } catch (err) {
    // Behald førre data om vi har – funksjonen skal aldri velte noko
    console.error('[google-omtalar] Henting feila:', err.message);
  }
}

function init() {
  if (!enabled) return;
  hent();
  const timer = setInterval(hent, OPPDATER_KVAR_MS);
  timer.unref();
}

module.exports = { enabled, init, get: () => data };
