# Rubisco AI backend

Implements `/api/ai/generate` per `docs/AI_BACKEND_CONTRACT.md` from the frontend repo.
Talks to Gemini and returns a validated Rubisco document — fixes the
"AI service returned invalid JSON" error by:

1. Asking Gemini to natively return `application/json` (no markdown fences).
2. Still defensively stripping fences / recovering truncated JSON if it happens anyway (`extractJson.js`).
3. Validating the block structure before sending anything back (`validateDocument.js`).
4. Making sure literally every response from this server — success, error, or 404 — is valid JSON, never an HTML error page.

## Deploy on Render

1. Push this folder to its own GitHub repo (or a `/backend` folder in your existing repo).
2. Render dashboard → New → Web Service → connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variable `GEMINI_API_KEY` (Render dashboard → Environment). Get a key at https://aistudio.google.com/apikey — never commit it.
6. Optional: set `GEMINI_MODEL` (defaults to `gemini-2.0-flash`).
7. Once deployed, your backend URL will be something like `https://rubisco-ai-backend.onrender.com`.

## Point the frontend at it

In the Rubisco app, go to **Settings → AI endpoint** and set it to:

```
https://rubisco-ai-backend.onrender.com/api/ai/generate
```

(Or if you deploy this backend on the *same* Render service as the frontend using a rewrite/proxy, you can leave the default `/api/ai/generate`.)

## Local test

```bash
npm install
cp .env.example .env   # then fill in GEMINI_API_KEY
npm start
curl http://localhost:3001/api/health
```


## Single Render Web Service deployment

This repository is now a single Express + Vite application.

- Build command: `npm install && npm run build`
- Start command: `node server.js`
- Add `GEMINI_API_KEY` as a Render environment variable.
- Optional: set `GEMINI_MODEL` (default: `gemini-2.5-flash`).
- The Express server serves the Vite `dist/` output and `/api/ai/generate` from the same origin/port.
- The Gemini API key is server-side only and is never placed in the Vite bundle.

The `/api/ai/generate` endpoint accepts `multipart/form-data` with:
- `request`: JSON string containing `mode`, `title`, `subject`, `topic`, `sourceType`, `sourceText`, and `instruction`
- zero or more `sourceFiles`: PDF, PNG, JPEG, WebP, or text files

API failures and unknown `/api/*` routes are JSON responses, so the frontend can safely call `response.json()` even on errors.


## Whole-PDF generation and token budget

PDFs are split into 4-page chunks by default. Each chunk gets up to 65,536 Gemini output tokens. `MAX_TOTAL_OUTPUT_TOKENS` is only a logged advisory ceiling on the theoretical worst-case total (chunk count × per-chunk limit) — **it no longer blocks generation**. It used to: any request whose chunk count × `GEMINI_MAX_OUTPUT_TOKENS` exceeded `MAX_TOTAL_OUTPUT_TOKENS` was rejected outright with a 413, before Gemini was ever called. Since `GEMINI_MAX_OUTPUT_TOKENS` is a worst-case ceiling per chunk (not what a chunk actually uses), this rejected any real textbook PDF longer than roughly 32 pages at the recommended settings — which is why complete notes were never generated for normal-length chapters. The real safety net is the per-chunk retry + auto-bisection + coverage-check pipeline, which handles chunk failures individually; a long PDF now just means more Gemini calls, not a rejected request.

Recommended Render environment variables:
- `GEMINI_MAX_OUTPUT_TOKENS=65536`
- `PDF_CHUNK_PAGES=4`
- `MAX_TOTAL_OUTPUT_TOKENS=524288` (advisory/logging only)
- `MAX_PARALLEL_CHUNKS=3`
