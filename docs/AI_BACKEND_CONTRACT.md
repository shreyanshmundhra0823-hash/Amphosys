# Rubisco AI backend contract — Phase 3

The React app never stores provider API keys and never imports a provider SDK. It sends a `multipart/form-data` request to the configured backend endpoint.

## Request

Form fields:

- `request`: JSON string containing:
  - `provider`: `gemini | openai | claude | local`
  - `mode`: `notes | summary | qa | mnemonics | mcqs | revision`
  - `title`
  - optional `subject` and `topic`
  - `sourceType`: `pdf | image | text`
  - optional `sourceText`
  - optional `sourceFileName`
  - `instruction`: Rubisco generation instructions
- `sourceFiles`: zero or more source blobs. PDFs and imported images are sent here.

## Response

Return JSON with this shape:

```json
{
  "schemaVersion": 1,
  "provider": "gemini",
  "model": "provider-model-name",
  "document": {
    "id": "generated-id",
    "studyMaterialId": "material-id",
    "title": "Generated title",
    "sections": [
      {
        "id": "section-id",
        "blocks": []
      }
    ],
    "createdAt": 0,
    "updatedAt": 0
  },
  "questions": []
}
```

The `document.sections[].blocks[]` objects must use the existing Rubisco block schema in `src/types/document.ts`. The frontend validates the response before saving it to IndexedDB.

## Security requirements

- Provider API keys stay on the backend.
- Never put secrets in `VITE_*` variables or committed source files.
- The backend must authenticate/authorize requests as appropriate before production use.
- The backend should enforce file-size, MIME-type and request-size limits.
- The backend should reject unsupported block types and malformed model output.
- The backend should not trust the model to return safe or valid JSON without validation.

## Static-hosting note

The React/Vite frontend can remain a static Render site. `/api/ai/generate` is a backend concern and can be deployed separately or exposed through an appropriate production API gateway/reverse proxy later. The frontend defaults to `/api/ai/generate` so deployment architecture can change without rewriting the editor or document model.
