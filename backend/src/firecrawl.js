// Firecrawl: pull live drug-interaction data from the web in real time.
// We use Firecrawl's /scrape endpoint to fetch a drug-interactions page and
// return its text content, which Gemini then translates into plain English.

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';

/**
 * Scrape a live interaction-checker page for a drug pair and return raw text.
 * @param {string} drugA
 * @param {string} drugB
 * @returns {Promise<{text:string, sourceUrl:string}>}
 */
export async function fetchInteractionText(drugA, drugB) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    const err = new Error('FIRECRAWL_API_KEY is not set');
    err.code = 'NO_FIRECRAWL_KEY';
    throw err;
  }

  const a = drugA.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = drugB.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  // Drugs.com has a URL-addressable interactions page per drug-pair that renders
  // real interaction content directly in the page body (unlike the form-based
  // checker, which only returns an empty form). Drugs are sorted alphabetically.
  const [first, second] = [a, b].sort();
  const sourceUrl = `https://www.drugs.com/drug-interactions/${first},${second}.html`;

  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url: sourceUrl,
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 25000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Firecrawl error ${res.status}: ${text}`);
    err.code = 'FIRECRAWL_ERROR';
    throw err;
  }

  const data = await res.json();
  const text =
    data?.data?.markdown ||
    data?.data?.content ||
    data?.markdown ||
    '';

  return { text, sourceUrl };
}
