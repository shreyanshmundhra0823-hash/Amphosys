# Rubisco Medical Library

Rubisco Medical Library is a local-first React/Vite PWA for structured MBBS study material.

## Architecture
Source PDF/images/text -> AI provider abstraction -> validated structured Rubisco document -> editable document engine -> print/PDF.

Documents are stored as structured blocks in IndexedDB rather than flattened PDFs.

## Current consolidated build
This repository contains the consolidated implementation through the final planned feature set: document editing, AI generation contract, Rubisco two-column design/print system, active recall/revision, local bookmarks/annotations data model, library favorites/search, offline storage, JSON backup, responsive tablet/mobile polish, and PWA foundation.

## AI security
AI requests use a configurable backend endpoint. Provider credentials must remain server-side and are never embedded in frontend source.

## Development
```bash
npm install
npm run build
npm run dev
```

A real production build must be verified in an environment with npm registry access before release.
