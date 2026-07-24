// Firecrawl: resolve live drug-interaction data for ANY drug pair.
//
// Drugs.com addresses each real pairwise interaction with internal numeric ids,
// so the URL can't be guessed from drug names — guessing silently redirects to
// one drug's general interactions page, which looks like a successful scrape but
// never mentions the second drug. Instead we resolve in two steps:
//   1. Scrape {drugA}-index.html — the list of every drug that interacts with
//      drugA, each rendered as a link to its specific pairwise page.
//   2. Find the link on that index whose path names drugB, then scrape that
//      exact pairwise page (which carries the real severity word + writeup).
// If drugB is absent from drugA's index, Drugs.com genuinely lists no
// interaction between the two.

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const DRUGS_BASE = 'https://www.drugs.com';

// Each pair now costs two Firecrawl calls, so cache resolved results in memory
// keyed on the sorted drug pair.
const cache = new Map();

// Normalize a drug name to the hyphenated slug Drugs.com uses in its URLs.
const slug = (name) =>
  String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const cacheKey = (a, b) => [slug(a), slug(b)].sort().join('|');

/**
 * Scrape a single URL through Firecrawl and return its markdown (or '').
 * Throws an Error (with .code) on transport / HTTP / auth failure so callers
 * can surface an honest "unknown" state instead of a wrong answer.
 */
async function scrapeMarkdown(url, apiKey) {
  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 25000,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Firecrawl error ${res.status}: ${body}`);
    err.code = 'FIRECRAWL_ERROR';
    throw err;
  }

  const data = await res.json();
  return data?.data?.markdown || data?.data?.content || data?.markdown || '';
}

/**
 * Given the markdown of an interaction index page, find the pairwise-interaction
 * link whose path names `otherSlug`, and return it as an absolute Drugs.com URL
 * (or null if there is none). Pairwise pages look like:
 *   /drug-interactions/<a>-with-<b>-1310-0-2311-0.html
 * The two drugs can appear in either order (a-with-b or b-with-a), so both name
 * segments are checked; matching is case-insensitive.
 */
function findPairwiseUrl(markdown, otherSlug) {
  const re = /\/drug-interactions\/([a-z0-9-]+)-with-([a-z0-9-]+?)-\d[\d-]*-0\.html/gi;
  let weak = null;
  for (const [path, name1, name2] of markdown.matchAll(re)) {
    const a = name1.toLowerCase();
    const b = name2.toLowerCase();
    // Exact segment match is unambiguous — take it immediately.
    if (a === otherSlug || b === otherSlug) {
      return `${DRUGS_BASE}${path}`;
    }
    // Otherwise keep the first partial hit (e.g. a brand vs. its generic, or a
    // combination product like "sulfamethoxazole-trimethoprim") as a fallback.
    if (
      !weak &&
      (a.includes(otherSlug) ||
        b.includes(otherSlug) ||
        otherSlug.includes(a) ||
        otherSlug.includes(b))
    ) {
      weak = `${DRUGS_BASE}${path}`;
    }
  }
  return weak;
}

/**
 * Resolve live interaction text for a drug pair.
 *
 * @param {string} drugA
 * @param {string} drugB
 * @returns {Promise<{text:string, sourceUrl:string, containsBothDrugs:boolean, resolved:boolean, noInteractionListed?:boolean}>}
 *   - resolved:true with real `text` when a specific pairwise page was found.
 *   - noInteractionListed:true (text '', resolved false) when neither drug's
 *     index lists the other — Drugs.com genuinely shows no interaction.
 * Throws (propagating the Firecrawl error) if an index scrape itself fails.
 */
export async function fetchInteractionText(drugA, drugB) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    const err = new Error('FIRECRAWL_API_KEY is not set');
    err.code = 'NO_FIRECRAWL_KEY';
    throw err;
  }

  const key = cacheKey(drugA, drugB);
  if (cache.has(key)) return cache.get(key);

  const aSlug = slug(drugA);
  const bSlug = slug(drugB);
  const indexUrlA = `${DRUGS_BASE}/drug-interactions/${aSlug}-index.html`;

  // Step 1 + 2: scrape drugA's index and find the link that names drugB. If the
  // index scrape throws, it propagates so the caller's error path handles it.
  let pairwiseUrl = findPairwiseUrl(await scrapeMarkdown(indexUrlA, apiKey), bSlug);

  // drugA's index yielded nothing usable — retry once from drugB's index (the
  // listing is symmetric, but drugA's slug/index may have been off).
  if (!pairwiseUrl) {
    const indexUrlB = `${DRUGS_BASE}/drug-interactions/${bSlug}-index.html`;
    pairwiseUrl = findPairwiseUrl(await scrapeMarkdown(indexUrlB, apiKey), aSlug);
  }

  let result;
  if (pairwiseUrl) {
    // Step 3: the specific pairwise page holds the real severity word + writeup.
    const text = await scrapeMarkdown(pairwiseUrl, apiKey);
    result = { text, sourceUrl: pairwiseUrl, containsBothDrugs: true, resolved: true };
  } else {
    // Step 4: absent from both indexes — Drugs.com lists no interaction.
    result = {
      text: '',
      sourceUrl: indexUrlA,
      containsBothDrugs: false,
      resolved: false,
      noInteractionListed: true,
    };
  }

  cache.set(key, result);
  return result;
}
