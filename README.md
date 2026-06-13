# MedStack

Point your phone at a pill bottle. MedStack reads the label, adds the drug to a
medication stack, and draws a **safety map** — every drug is a node, every
dangerous combination a colored line that appears the instant you scan a new
bottle. Tap a line for a plain-English warning with a severity rating, read aloud.

## How it works

1. **Scan** — the browser camera captures the label; **Gemini Vision** extracts
   drug name + dosage.
2. **Check** — for every pair in the stack, **Firecrawl** scrapes live
   interaction data from the web in real time.
3. **Translate** — **Gemini** rewrites the raw clinical text into one plain
   sentence + a green / yellow / red severity.
4. **See** — the safety map draws the line. Red = know before the first dose.

If the live path fails (network, timeout), a curated layer covers well-known
pairs so the demo never shows a wrong "safe."

## Tech

- Frontend: React + Vite (mobile-first web app — runs in a phone browser, no app store)
- Backend: Node + Express (single service, also serves the built frontend)
- Gemini Vision + Gemini (label reading + plain-English translation)
- Firecrawl (live web interaction data)
- Deploy: GCP Cloud Run (satisfies the GCP track)

## Run locally

You need two API keys as environment variables. **Never commit them.**

```bash
# backend
cd backend
npm install
export GEMINI_API_KEY=your_key
export FIRECRAWL_API_KEY=your_rotated_key   # rotate the one shared in chat!
npm run dev          # http://localhost:8080

# frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to :8080
```

Without keys, the app still runs fully on the curated interaction layer — good
for offline demos.

> Camera + speech need HTTPS (or localhost). On a phone, use the deployed
> Cloud Run URL, not a LAN IP.

## Deploy to Cloud Run

```bash
gcloud run deploy medstack \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL=gemini-2.5-flash

# set secrets separately so they're not in shell history / source
gcloud run services update medstack --region us-central1 \
  --update-env-vars GEMINI_API_KEY=YOUR_KEY,FIRECRAWL_API_KEY=YOUR_ROTATED_KEY
```

The `Dockerfile` builds the frontend, copies it into the backend's `public/`,
and runs one container on `$PORT` (8080) — exactly what Cloud Run expects.

## Security note

The Firecrawl key shared during development should be **rotated** — anything
pasted in plaintext is considered exposed. Keys live only in environment
variables / Cloud Run secrets, never in the repo (`.env` is gitignored).

## Not medical advice

MedStack is a prototype. It surfaces possible interactions to prompt a
conversation with a doctor or pharmacist — it does not replace one.
