# Rubisco Medical Library — Phase 3

A local-first study library and structured medical-document platform for MBBS
students, built with React, TypeScript, Vite, Tailwind CSS, and Dexie
(IndexedDB).

## Five-phase master roadmap

The project is intentionally consolidated into **five longer phases** rather
than eight short phases:

1. **Phase 1 — Foundation & Source Library**: app shell, routing, local-first
   storage, PDF/image/text import, source viewer, PWA foundation and settings.
2. **Phase 2 — Rubisco Document Engine**: structured editable blocks,
   formatting, tables, flowcharts, images, undo/redo, autosave and the
   two-column document foundation.
3. **Phase 3 — AI Study Engine & Rubisco Notes Design System**: provider-
   agnostic AI generation, structured AI output validation, notes/summary/
   Q&A/mnemonic/MCQ/revision modes, AI settings, and the core red-heading,
   high-yield and medical-notes visual hierarchy.
4. **Phase 4 — Export, Active Recall & Study Management**: high-quality PDF
   export, print pipeline, MCQ/revision interaction, answers, performance,
   subjects/topics/tags/search/bookmarks/history and stronger offline study
   workflows.
5. **Phase 5 — Production Polish & Release**: tablet/S Pen UX, accessibility,
   performance, security, large-source testing, error handling, PWA install,
   GitHub/Render deployment and release hardening.

## Run it

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Render frontend

The React/Vite frontend remains a **Static Site** on Render:

- Build command: `npm install && npm run build`
- Publish directory: `dist`

AI provider credentials must not be placed in frontend source code. Phase 3
uses a backend endpoint for AI calls; that backend can be deployed separately
without changing the document/editor architecture.

## Phase 3 — AI Study Engine & Rubisco Notes Design System

### AI architecture

The browser does not import Gemini/OpenAI/Claude SDKs and does not store API
keys. `src/services/aiService.ts` is the single frontend AI boundary. It sends
source material to a configurable backend endpoint and receives validated,
structured Rubisco document data.

Supported provider identifiers:

- `gemini`
- `openai`
- `claude`
- `local`

Supported generation modes:

- Study notes
- Summary
- Question & answer
- Mnemonics
- MCQs
- Revision material

The response is validated by `src/lib/aiValidation.ts` before it can be
saved to IndexedDB. Invalid JSON, unsupported block types, malformed sections,
invalid questions, or unsupported providers are rejected rather than silently
being inserted into the editor.

### Source handling

- **Text** sources are sent as structured source text.
- **PDF** sources are sent as the stored PDF blob.
- **Image** sources are loaded from the existing `sourceAssets` table and sent
  in their original order.

The generated result is saved into the existing `StudyDocument` model. It is
not flattened into HTML or PDF, so every generated heading, paragraph, table,
flowchart, mnemonic, exam box and image reference remains editable.

### AI settings

Settings now exposes:

- provider selection
- backend endpoint

The default endpoint is `/api/ai/generate`. The endpoint is stored in local
browser settings, and no secret is stored there.

See `docs/AI_BACKEND_CONTRACT.md` for the exact multipart request and JSON
response contract required by the backend.

### Rubisco visual hierarchy

Phase 3 extends the Phase 2 document foundation with the first core Rubisco
notes styling:

- white page surface
- two-column layout on tablet/desktop
- vertical column divider
- red major headings in bordered boxes
- red-accented subheadings
- red-accented mnemonic boxes
- high-yield/exam boxes
- black/ink body text
- existing tables, flowcharts and image blocks remain structured/editable

The styling is implemented at the block level, not by converting the document
to a static image.

## Phase 2 document model retained

`src/types/document.ts` remains the source of truth for the editable model.
A `StudyDocument` contains sections and typed blocks:

- `heading`
- `subheading`
- `paragraph`
- `bulletList`
- `numberedList`
- `table`
- `flowchart`
- `mnemonic`
- `examBox`
- `image`

Rich text remains represented by `TextRun[]`, not raw HTML. Images reference
existing local `SourceAsset` records instead of duplicating image bytes.

## Project structure

```text
src/
  components/
    ai/
      GenerationPanel.tsx
    document/
      AddBlockMenu.tsx
      BlockRenderer.tsx
      BlockShell.tsx
      RichTextToolbar.tsx
      TextEditable.tsx
      blocks/
        ...one editor per structured block type
  db/
    db.ts
    documents.ts
    sourceAssets.ts
    studyMaterials.ts
  hooks/
    useDocumentEditor.ts
    useDocumentHistory.ts
    useObjectUrl.ts
    ...
  lib/
    aiValidation.ts
    documentBlocks.ts
    richText.ts
    ...
  pages/
    SourceMaterial.tsx
    DocumentEditor.tsx
    Settings.tsx
    ...
  services/
    aiService.ts
  types/
    ai.ts
    document.ts
    revision.ts
    sourceAsset.ts
    studyMaterial.ts

docs/
  AI_BACKEND_CONTRACT.md
```

## Verification note

This ZIP was prepared in a sandbox without reliable npm registry access. A
real `npm install` could not complete in this environment, so a green
`npm run build` has **not** been claimed. Run `npm install && npm run build`
in a networked environment before merging/deploying this phase. No new npm
dependencies were introduced for Phase 3.
