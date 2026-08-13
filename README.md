# Rubisco Medical Library — Phase 1

A local-first study library foundation for MBBS students, built with React,
TypeScript, Vite, Tailwind CSS, and Dexie (IndexedDB).

This is **Phase 1**: the application shell, routing, local-first storage,
and the create → save → browse → delete flow for study material. AI
generation, OCR, PDF export, and the revision engine are intentionally not
implemented yet — see "What's not implemented" below.

## Run it

```bash
npm install
npm run dev       # starts the dev server
npm run build     # type-checks and builds for production into dist/
npm run preview   # serves the production build locally
```

## Deploy on Render

This is a static site once built. On Render, create a **Static Site** with:

- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`

Push this folder to a GitHub repo and connect it to Render for auto-deploy
on every push.

## What Phase 1 supports

- Dashboard with a real greeting, library stats (computed from IndexedDB,
  never fabricated), and a recent-material list.
- Study Library with search (title, subject, topic, source filename) and
  sort (recently updated / recently created / alphabetical).
- Create flow for PDF (single file), image (multiple files — select several
  at once, remove any before saving), or pasted text, with title/subject/topic
  metadata, saved as a real local `StudyMaterial` record. Imported images are
  stored as separate `SourceAsset` rows (see `src/db/sourceAssets.ts`), keyed
  by `studyMaterialId`, rather than embedded on the material itself.
- Delete, with a confirmation dialog, that actually removes the record.
- Settings: theme (system/light/dark, persisted), local storage usage,
  clear-library with a warning, and version info.
- A typed, modular Dexie database layer (`src/db`) — no IndexedDB calls
  live inside components.
- A future-proof block-based document model (`src/types/document.ts`) and
  revision-engine types (`src/types/revision.ts`) that nothing writes to
  yet, so Phase 2 can build on top without a schema rewrite.
- A provider-agnostic AI service interface (`src/services/aiService.ts`)
  that intentionally throws if called — nothing fake-generates content.
- PWA scaffolding (manifest + service worker via `vite-plugin-pwa`) so the
  shell and saved materials stay available offline after first load.
- Responsive layout: sidebar nav on desktop/tablet, bottom nav on phone,
  no horizontal overflow, touch targets sized for a tablet + S Pen.

## What's intentionally NOT implemented yet

- AI note generation, OCR, and PDF parsing — `/create` stores the raw file(s)
  or text only; nothing is processed.
- The rich document/block editor. `/editor/:id` is currently a **read-only
  Source Material viewer**: it loads the real saved `StudyMaterial`, updates
  `lastOpenedAt`, and displays the title/subject/topic/status/dates plus the
  actual source — pasted text inline, a PDF in an embedded viewer (with an
  "open in new tab" fallback), or all stored images in a vertical gallery.
  It cannot yet be edited, and says so on the page ("Full editor will be
  added in a later phase").
- The spaced-repetition revision engine at `/revision` — placeholder only.
- PDF export.
- Any backend or sync — everything lives in this device's IndexedDB.

## Project structure

```
src/
  components/   Reusable UI (AppShell, Sidebar, Card, Modal, FileDropzone…)
  pages/        One file per route (Dashboard, Library, Create, Settings,
                SourceMaterial — the read-only viewer at /editor/:id …)
  layouts/      MainLayout wraps every route in AppShell
  db/           Dexie schema + StudyMaterial CRUD, plus sourceAssets.ts
                (stored image blobs, keyed by studyMaterialId) — the only
                IndexedDB code
  types/        StudyMaterial, the block-based document model, revision types
  hooks/        useStudyMaterials, useTheme, useToast, useDeleteMaterial
  lib/          id generation, date/byte formatting, nav config, AppError
  services/     aiService.ts — the unimplemented provider abstraction
```

## A note on this build

This project is being developed in a sandboxed environment with no network
access (`npm install` fails with a 403 from the registry here), so
`npm install` / `npm run build` still cannot be executed in this
environment to confirm a green build or generate `package-lock.json`.
Please run `npm install && npm run build` yourself as the real verification
step before deploying; if it turns up an error, send me the message and
I'll fix it directly.
