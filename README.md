# MedStack

Point your phone at a pill bottle. MedStack reads the label, adds the drug to a
medication stack, and draws a **safety map**: every drug is a node, every
dangerous combination a colored line that appears the instant you scan a new
bottle. Tap a line for a plain-English warning with a severity rating, read aloud.

Winner, Best Use of Firecrawl.

## How it works

1. **Scan** - the browser camera captures the label; **Groq** (Llama 4 Scout
   vision) extracts drug name + dosage.
2. **Resolve** - for every pair in the stack, **Firecrawl** performs a two-step
   lookup: it scrapes the drug's interaction index page, finds the real
   pairwise URL for the other drug, then scrapes that specific page.
3. **Translate** - **Groq** (Llama 3.3) rewrites the raw clinical text into one
   plain sentence plus a green / yellow / red severity.
4. **See** - the safety map draws the line. Red = know before the first dose.

There is no bundled drug database and no hardcoded interaction table. Every
result in the app is scraped live at the moment you scan.

### Why two steps

Drugs.com's pairwise interaction pages are addressed by internal numeric IDs,
not drug names. A name-guessed URL silently redirects to one drug's general
interactions page, which returns a clean scrape that never mentions the second
drug. Resolving the real pairwise link from the index page first is what makes
arbitrary drug pairs work.

## Tech

- Frontend: React + Vite (mobile-first web app, runs in a phone browser, no app store)
- Backend: Node + Express (single service, also serves the built frontend)
- **Firecrawl** - live interaction data, two-step pairwise URL resolution
- **Groq** - Llama 4 Scout for label vision, Llama 3.3 for plain-English severity
- Browser APIs - camera capture and speech synthesis
- Deploy: Docker / GCP Cloud Run ready

No database. Results are resolved live, with an in-memory cache so each pair is
only scraped once per session.

## Run locally

You need two API keys. Put them in `backend/.env` (gitignored, never commit):

```
GROQ_API_KEY=your_groq_key
FIRECRAWL_API_KEY=your_firecrawl_key
PORT=8080
```

```bash
# backend
cd backend
npm install
node --env-file=.env --watch src/server.js   # http://localhost:8080

# frontend (separate terminal)
cd frontend
npm install
npm run dev                                   # http://localhost:5173
```

Check `localhost:8080/api/health` - both `groq` and `firecrawl` should be `true`.

> Camera and speech require HTTPS or localhost. On a phone, use a deployed
> HTTPS URL, not a LAN IP.

## Known limitations

- Brand names may not match Drugs.com's index links; generic names are more reliable.
- Each pair costs two Firecrawl calls plus one Groq call, so large stacks can hit
  free-tier rate limits. Add medications one at a time.
- If a pair is not listed in the index, the app reports that honestly rather than
  guessing.

## Not medical advice

MedStack is a prototype. It surfaces possible interactions to prompt a
conversation with a doctor or pharmacist. It does not replace one.