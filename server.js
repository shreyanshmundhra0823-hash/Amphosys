import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { extractJson } from './extractJson.js'
import { validateDocumentPayload } from './validateDocument.js'
import { getPdfPageCount, buildPageChunks, runWithConcurrency } from './pdfChunking.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

const PORT = Number(process.env.PORT || 3000)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
const MAX_FILE_MB = Math.min(Math.max(Number(process.env.MAX_FILE_MB || 25), 1), 50)
const GEMINI_MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 65536)
const PAGES_PER_CHUNK = Math.max(1, Number(process.env.PAGES_PER_CHUNK || 8))
const CHUNK_CONCURRENCY = Math.max(1, Number(process.env.CHUNK_CONCURRENCY || 2))
const CHUNK_MAX_RETRIES = Math.max(0, Number(process.env.CHUNK_MAX_RETRIES || 2))

if (!GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY is not set. Add it to the Render environment variables.')
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const distDir = path.join(__dirname, 'dist')
const indexFile = path.join(distDir, 'index.html')

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain'
])

const SPA_ROUTES = new Set([
  '/',
  '/library',
  '/create',
  '/settings',
  '/revision'
])

app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_MB * 1024 * 1024,
    files: 5
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`))
    }
    cb(null, true)
  }
})

function sendJson(res, status, body) {
  return res.status(status).type('application/json').json(body)
}

function sendJsonError(res, status, message, details) {
  const body = { error: message }
  if (details) body.details = details
  return sendJson(res, status, body)
}

const RESPONSE_SCHEMA_REMINDER = `
Return ONLY one complete JSON object. Do not output Markdown, code fences, explanations, preambles, postambles, or comments.

Top-level shape:
{
  "schemaVersion": 1,
  "provider": "gemini",
  "model": "string",
  "document": {
    "id": "string",
    "studyMaterialId": "string",
    "title": "string",
    "sections": [
      { "id": "string", "blocks": [ ...Block ] }
    ],
    "createdAt": 0,
    "updatedAt": 0
  },
  "questions": []
}

Allowed Block types ONLY:
heading, subheading, paragraph, bulletList, numberedList, table, flowchart, mnemonic, examBox, image.

Block shapes:
- heading/subheading/paragraph: {"id":"string","type":"...","runs":[{"text":"string","bold":true,"italic":false,"underline":false}]}
- bulletList/numberedList: {"id":"string","type":"...","items":[[{"text":"string"}],...]}
- table: {"id":"string","type":"table","rows":[["cell","cell"],...],"headerRow":true}
- flowchart: {"id":"string","type":"flowchart","nodes":[{"id":"string","text":"string"},...]}
- mnemonic: {"id":"string","type":"mnemonic","title":"string","content":"string"}
- examBox: {"id":"string","type":"examBox","content":"string"}
- image: {"id":"string","type":"image","caption":"string"} (sourceAssetId may be omitted)

Questions, when useful, must be [] or an array of:
{"id":"string","type":"mcq"|"shortAnswer","question":"string","options":[{"id":"string","text":"string"}],"answer":"string","explanation":"string"}

Make document.sections contain at least one section. Never invent unsupported medical facts. Ensure the JSON is complete and valid.
`.trim()

function buildPrompt(request, chunk) {
  const {
    mode,
    title,
    subject,
    topic,
    sourceType,
    sourceText,
    instruction
  } = request

  const chunkInstruction = chunk && chunk.total > 1
    ? [
        `This source document has ${chunk.end ? 'multiple pages' : 'multiple parts'} and is being processed in ${chunk.total} passes because it is long. This is pass ${chunk.index} of ${chunk.total}.`,
        chunk.start && chunk.end
          ? `Generate structured notes covering ONLY pages ${chunk.start} to ${chunk.end} (inclusive) of the source PDF. Do not summarize, skip, or condense pages outside this range — leave them for other passes.`
          : '',
        'Do NOT omit, compress, or skip any definition, classification, mechanism, diagnostic criterion, treatment detail, exception, numeric value, or exam-relevant point that appears within your assigned page range, even if the section is long. Completeness and faithfulness to the source within this range matters more than brevity.',
        'Do not repeat a top-level document title or full introduction unless it is genuinely part of this page range — treat this as one continuous section of a larger document, not a standalone summary.'
      ].filter(Boolean).join('\n')
    : 'Cover the entire source faithfully. Do NOT omit, compress, or skip any definition, classification, mechanism, diagnostic criterion, treatment detail, exception, numeric value, or exam-relevant point present in the source.'

  return [
    instruction || 'Convert the supplied source into structured Rubisco Medical Library study material.',
    RESPONSE_SCHEMA_REMINDER,
    chunkInstruction,
    `Generation mode: ${mode}`,
    `Title: ${title}`,
    subject ? `Subject: ${subject}` : '',
    topic ? `Topic: ${topic}` : '',
    `Source type: ${sourceType}`,
    sourceText ? `Source text:\n${sourceText}` : ''
  ].filter(Boolean).join('\n\n')
}

/**
 * Runs one Gemini generation call for a single chunk, with retries on
 * JSON-parse or schema-validation failure (a fresh call often succeeds
 * where a retry-with-same-output would not, since Gemini is not
 * deterministic).
 */
async function generateChunk({ request, files, chunk, studyMaterialId }) {
  const prompt = buildPrompt(request, chunk)
  const parts = [{ text: prompt }]
  for (const file of files) {
    parts.push({
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype
      }
    })
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      temperature: 0.2
    }
  })

  let lastError = null
  for (let attempt = 0; attempt <= CHUNK_MAX_RETRIES; attempt += 1) {
    try {
      const result = await model.generateContent(parts)
      const rawText = result?.response?.text?.() || ''
      if (!rawText.trim()) throw new Error('Gemini returned an empty response for this chunk.')

      const parsed = extractJson(rawText)
      const validated = validateDocumentPayload(parsed, { studyMaterialId, title: request.title })

      console.log(`Chunk ${chunk.index}/${chunk.total} (pages ${chunk.start ?? '?'}-${chunk.end ?? '?'}) succeeded on attempt ${attempt + 1}: ${validated.document.sections.length} section(s).`)
      return validated
    } catch (error) {
      lastError = error
      console.error(`Chunk ${chunk.index}/${chunk.total} attempt ${attempt + 1} failed:`, error?.message)
    }
  }

  throw new Error(`Chunk ${chunk.index}/${chunk.total} failed after ${CHUNK_MAX_RETRIES + 1} attempt(s): ${lastError?.message || 'unknown error'}`)
}

/**
 * Merges validated chunk results into one document, prefixing section/block
 * ids per chunk so ids never collide across passes, and preserving chunk
 * order so the final document reads top-to-bottom like the source.
 */
function mergeChunkResults(chunkResults, { studyMaterialId, title }) {
  const sections = []
  const questions = []

  chunkResults.forEach((result, chunkPos) => {
    for (const section of result.document.sections) {
      sections.push({
        ...section,
        id: `c${chunkPos + 1}-${section.id}`,
        blocks: section.blocks.map((block, bIndex) => ({
          ...block,
          id: `c${chunkPos + 1}-${section.id}-${bIndex}-${block.id}`
        }))
      })
    }
    questions.push(...result.questions)
  })

  return {
    document: {
      id: `doc-${Date.now()}`,
      studyMaterialId,
      title,
      sections,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    questions
  }
}

function normalizeRequest(value) {
  if (!value || typeof value !== 'object') throw new Error('Request must be a JSON object.')

  const required = ['mode', 'title', 'sourceType']
  for (const key of required) {
    if (typeof value[key] !== 'string' || !value[key].trim()) {
      throw new Error(`Request must include a non-empty "${key}".`)
    }
  }

  if (value.sourceText !== undefined && typeof value.sourceText !== 'string') {
    throw new Error('"sourceText" must be a string when supplied.')
  }
  if (value.instruction !== undefined && typeof value.instruction !== 'string') {
    throw new Error('"instruction" must be a string when supplied.')
  }

  return {
    mode: value.mode.trim(),
    title: value.title.trim(),
    subject: typeof value.subject === 'string' ? value.subject.trim() : '',
    topic: typeof value.topic === 'string' ? value.topic.trim() : '',
    sourceType: value.sourceType.trim(),
    sourceText: typeof value.sourceText === 'string' ? value.sourceText : '',
    instruction: typeof value.instruction === 'string' ? value.instruction : ''
  }
}

app.post('/api/ai/generate', upload.array('sourceFiles', 5), async (req, res) => {
  try {
    let request
    try {
      request = normalizeRequest(JSON.parse(req.body?.request || '{}'))
    } catch (error) {
      return sendJsonError(res, 400, error.message || 'Malformed "request" field.')
    }

    const files = Array.isArray(req.files) ? req.files : []
    const studyMaterialId = `material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Determine whether this source needs multi-pass chunked generation.
    // Only PDFs get page-based chunking; images/text go through in one pass.
    const pdfFile = files.find((f) => f.mimetype === 'application/pdf')
    let pageCount = null
    if (pdfFile) {
      pageCount = await getPdfPageCount(pdfFile.buffer)
    }
    const chunks = buildPageChunks(pageCount, PAGES_PER_CHUNK)

    console.log(`Generating "${request.title}": ${pdfFile ? `PDF, ${pageCount ?? 'unknown'} page(s)` : request.sourceType} -> ${chunks.length} chunk(s) of up to ${PAGES_PER_CHUNK} page(s) each.`)

    let chunkResults
    try {
      chunkResults = await runWithConcurrency(chunks, CHUNK_CONCURRENCY, (chunk) =>
        generateChunk({ request, files, chunk, studyMaterialId })
      )
    } catch (error) {
      console.error('Chunked generation failed:', error)
      return sendJsonError(res, 502, 'AI generation failed on one or more sections of the source.', error?.message)
    }

    console.log(`All ${chunkResults.length} chunk(s) succeeded for "${request.title}". Merging into one document.`)

    const merged = mergeChunkResults(chunkResults, { studyMaterialId, title: request.title })

    return sendJson(res, 200, {
      schemaVersion: 1,
      provider: 'gemini',
      model: GEMINI_MODEL,
      document: merged.document,
      questions: merged.questions
    })
  } catch (error) {
    console.error('Unexpected /api/ai/generate error:', error)
    return sendJsonError(res, 500, 'Unexpected server error.')
  }
})

app.get('/api/health', (_req, res) => {
  return sendJson(res, 200, {
    ok: true,
    service: 'rubisco-medical-library',
    provider: 'gemini',
    model: GEMINI_MODEL
  })
})

// Any unknown API route gets JSON, never Express's default HTML 404.
app.use('/api', (req, res) => {
  return sendJsonError(res, 404, `No API route for ${req.method} ${req.path}`)
})

// Serve Vite output. Assets are served directly.
app.use(express.static(distDir, {
  index: false,
  fallthrough: true
}))

// React Router routes need index.html. Dynamic editor/document routes are
// recognized explicitly; all other unknown browser paths get JSON 404.
app.get(['/editor/:id', '/document/:materialId'], (_req, res) => {
  return res.sendFile(indexFile)
})

for (const route of SPA_ROUTES) {
  app.get(route, (_req, res) => res.sendFile(indexFile))
}

// Browser navigation fallback for extensionless paths that are clearly
// application routes; asset-like missing paths are returned as JSON.
app.get('*', (req, res) => {
  if (!path.extname(req.path)) {
    return sendJsonError(res, 404, `Frontend route not found: ${req.path}`)
  }
  return sendJsonError(res, 404, `File not found: ${req.path}`)
})

// Multer/file/parser errors are also JSON.
app.use((error, _req, res, _next) => {
  console.error('Server middleware error:', error)
  const status = error?.code === 'LIMIT_FILE_SIZE' ? 413 : 400
  return sendJsonError(res, status, error?.message || 'Request failed.')
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rubisco Medical Library listening on port ${PORT}`)
})
