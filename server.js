import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { extractJson } from './extractJson.js'
import { validateDocumentPayload } from './validateDocument.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

const PORT = Number(process.env.PORT || 3000)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const MAX_FILE_MB = Math.min(Math.max(Number(process.env.MAX_FILE_MB || 25), 1), 50)

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

function buildPrompt(request) {
  const {
    mode,
    title,
    subject,
    topic,
    sourceType,
    sourceText,
    instruction
  } = request

  return [
    instruction || 'Convert the supplied source into structured Rubisco Medical Library study material.',
    RESPONSE_SCHEMA_REMINDER,
    `Generation mode: ${mode}`,
    `Title: ${title}`,
    subject ? `Subject: ${subject}` : '',
    topic ? `Topic: ${topic}` : '',
    `Source type: ${sourceType}`,
    sourceText ? `Source text:\n${sourceText}` : ''
  ].filter(Boolean).join('\n\n')
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

    const prompt = buildPrompt(request)
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
        maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 16384),
        temperature: 0.2
      }
    })

    let result
    try {
      result = await model.generateContent(parts)
    } catch (error) {
      console.error('Gemini request failed:', error)
      return sendJsonError(res, 502, 'Gemini API request failed.', error?.message)
    }

    const rawText = result?.response?.text?.() || ''
    if (!rawText.trim()) {
      return sendJsonError(res, 502, 'Gemini returned an empty response.')
    }

    let parsed
    try {
      parsed = extractJson(rawText)
    } catch (error) {
      console.error('Gemini JSON extraction failed:', error)
      return sendJsonError(res, 502, 'Gemini returned malformed or truncated JSON.', error?.message)
    }

    let validated
    try {
      validated = validateDocumentPayload(parsed, {
        studyMaterialId: `material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: request.title
      })
    } catch (error) {
      console.error('Gemini output validation failed:', error)
      return sendJsonError(res, 502, 'Gemini output failed document validation.', error?.message)
    }

    return sendJson(res, 200, {
      schemaVersion: 1,
      provider: 'gemini',
      model: GEMINI_MODEL,
      document: validated.document,
      questions: validated.questions
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
