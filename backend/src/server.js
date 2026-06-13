import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractLabel, summarizeInteraction } from './groq.js';
import { fetchInteractionText } from './firecrawl.js';
import { curatedInteraction } from './curated.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '12mb' })); // base64 images can be large

// ---- Health check (Cloud Run readiness) ----
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    groq: Boolean(process.env.GROQ_API_KEY),
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
  });
});

// ---- Scan a pill bottle label ----
// Body: { image: "<base64>", mimeType?: "image/jpeg" }
app.post('/api/scan', async (req, res) => {
  try {
    const { image, mimeType } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Missing image' });
    const clean = String(image).replace(/^data:[^;]+;base64,/, '');
    const result = await extractLabel(clean, mimeType || 'image/jpeg');
    if (!result.drug) {
      return res.status(422).json({ error: 'No medication detected on label', raw: result });
    }
    res.json(result);
  } catch (err) {
    console.error('[scan]', err.code, err.message);
    res.status(502).json({ error: 'Scan failed', code: err.code || 'UNKNOWN' });
  }
});

// ---- Check a single drug pair ----
// Body: { drugA, drugB }
// Strategy: live Firecrawl + Gemini first; curated fallback on any failure.
app.post('/api/interaction', async (req, res) => {
  const { drugA, drugB } = req.body || {};
  if (!drugA || !drugB) return res.status(400).json({ error: 'Need drugA and drugB' });

  const result = await resolveInteraction(drugA, drugB);
  res.json({ drugA, drugB, ...result });
});

// ---- Check an entire stack: every pair ----
// Body: { drugs: ["warfarin", "ibuprofen", ...] }
app.post('/api/stack-check', async (req, res) => {
  const { drugs } = req.body || {};
  if (!Array.isArray(drugs) || drugs.length < 2) {
    return res.json({ pairs: [], summary: { red: 0, yellow: 0, green: 0 } });
  }

const pairs = [];
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const r = await resolveInteraction(drugs[i], drugs[j]);
      pairs.push({ drugA: drugs[i], drugB: drugs[j], ...r });
      if (r.source === 'live') await new Promise((s) => setTimeout(s, 1200));
    }
  }

  const summary = pairs.reduce(
    (acc, p) => {
      acc[p.severity] = (acc[p.severity] || 0) + 1;
      return acc;
    },
    { red: 0, yellow: 0, green: 0 }
  );

  res.json({ pairs, summary });
});

/**
 * Core resolution: try live (Firecrawl -> Gemini), fall back to curated, then to
 * a safe "unknown/yellow" so the UI always gets a usable answer.
 */
const interactionCache = new Map();
const pairKey = (a, b) => [a, b].map((d) => d.trim().toLowerCase()).sort().join('|');

async function resolveInteraction(drugA, drugB) {
  const key = pairKey(drugA, drugB);
  if (interactionCache.has(key)) return interactionCache.get(key);
  const result = await computeInteraction(drugA, drugB);
  if (result.source === 'live' || result.source === 'curated') {
    interactionCache.set(key, result);
  }
  return result;
}

async function computeInteraction(drugA, drugB) {
  if (process.env.FIRECRAWL_API_KEY && process.env.GROQ_API_KEY) {
    try {
      const { text, sourceUrl } = await fetchInteractionText(drugA, drugB);
      if (text && text.length > 80) {
        const summary = await summarizeInteraction(drugA, drugB, text);
        return { ...summary, source: 'live', sourceUrl };
      }
    } catch (err) {
      console.warn(`[interaction] ${drugA}+${drugB} live failed:`, err.message);
    }
  }
  const curated = curatedInteraction(drugA, drugB);
  if (curated) return { ...curated, source: 'curated' };
  return {
    severity: 'yellow',
    summary: `No interaction data could be retrieved for ${drugA} and ${drugB}.`,
    action: 'Confirm with a pharmacist before combining.',
    source: 'unknown',
  };
}

// ---- Serve the built frontend (single Cloud Run service) ----
const clientDir = path.join(__dirname, '..', 'public');
app.use(express.static(clientDir));
app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));

app.listen(PORT, () => console.log(`MedStack backend listening on :${PORT}`));
