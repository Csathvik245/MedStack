// Gemini Vision: read a pill-bottle label from a photo and extract structured drug info.
// Uses the v1beta generateContent REST endpoint with inline base64 image data.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const EXTRACTION_PROMPT = `You are reading a photo of a prescription or over-the-counter medication label.
Extract the medication information. Respond with ONLY a JSON object, no markdown, no backticks, with this exact shape:
{
  "drug": "generic drug name in lowercase, single active ingredient (e.g. 'warfarin', 'ibuprofen'). If a brand name is shown, convert to the generic name.",
  "brand": "brand name if visible, else null",
  "dosage": "strength with units as printed (e.g. '5 mg', '200 mg'), else null",
  "frequency": "how often to take if printed (e.g. 'once daily', 'as needed'), else null",
  "confidence": "high | medium | low — your confidence that this is a real medication label"
}
If the image is not a medication label, return {"drug": null, "confidence": "low"}.`;

/**
 * @param {string} base64Image - raw base64 (no data: prefix)
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @returns {Promise<object>} parsed extraction
 */
export async function extractLabel(base64Image, mimeType = 'image/jpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not set');
    err.code = 'NO_GEMINI_KEY';
    throw err;
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACTION_PROMPT },
          { inlineData: { mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(GEMINI_ENDPOINT(GEMINI_MODEL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Gemini Vision error ${res.status}: ${text}`);
    err.code = 'GEMINI_ERROR';
    throw err;
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return safeParse(raw);
}

/**
 * Translate raw clinical interaction text into plain English with a severity rating.
 * @param {string} drugA
 * @param {string} drugB
 * @param {string} clinicalText - raw text scraped from the web
 * @returns {Promise<{severity:string, summary:string, action:string}>}
 */
export async function summarizeInteraction(drugA, drugB, clinicalText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not set');
    err.code = 'NO_GEMINI_KEY';
    throw err;
  }

  const prompt = `You are a clinical pharmacist assistant. Below is raw text about a possible interaction between ${drugA} and ${drugB}, scraped from a drug-information website.

Rewrite it for a worried family caregiver with no medical training. Respond with ONLY a JSON object, no markdown:
{
  "severity": "red | yellow | green",
  "summary": "one or two plain-English sentences describing the risk. No jargon.",
  "action": "one short sentence telling them what to do (e.g. 'Talk to a doctor or pharmacist before taking these together.')"
}
Severity guide: red = serious/dangerous, avoid or requires medical supervision; yellow = use caution, monitor; green = no significant interaction known.
If the text shows no meaningful interaction, return severity "green".

RAW TEXT:
${clinicalText.slice(0, 6000)}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };

  const res = await fetch(GEMINI_ENDPOINT(GEMINI_MODEL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Gemini summarize error ${res.status}: ${text}`);
    err.code = 'GEMINI_ERROR';
    throw err;
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const parsed = safeParse(raw);
  return {
    severity: ['red', 'yellow', 'green'].includes(parsed.severity) ? parsed.severity : 'yellow',
    summary: parsed.summary || 'Interaction information could not be summarized.',
    action: parsed.action || 'Check with a doctor or pharmacist.',
  };
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // strip markdown fences if the model added them despite instructions
    const cleaned = String(raw).replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }
}
