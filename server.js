import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
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
const PDF_CHUNK_PAGES = Math.min(Math.max(Number(process.env.PDF_CHUNK_PAGES || 4), 1), 12)
const MAX_PARALLEL_CHUNKS = Math.min(Math.max(Number(process.env.MAX_PARALLEL_CHUNKS || 3), 1), 5)
const GEMINI_MAX_OUTPUT_TOKENS = Math.min(Math.max(Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 65536), 8192), 65536)
const TEXT_CHUNK_CHARS = Math.min(Math.max(Number(process.env.TEXT_CHUNK_CHARS || 30000), 10000), 60000)
const MAX_TOTAL_OUTPUT_TOKENS = Math.max(Number(process.env.MAX_TOTAL_OUTPUT_TOKENS || 524288), GEMINI_MAX_OUTPUT_TOKENS)

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

const SPA_ROUTES = new Set(['/', '/library', '/create', '/settings', '/revision'])

app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error(`Unsupported file type: ${file.mimetype}`))
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
    "sections": [{ "id": "string", "blocks": [ ...Block ] }],
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
- image: {"id":"string","type":"image","caption":"string"}

Questions may be [] or an array of mcq/shortAnswer objects.
Ensure the JSON is complete and valid. Never invent unsupported medical facts.
`.trim()

function buildPrompt(request, chunkInfo = '') {
  const { mode, title, subject, topic, sourceType, sourceText, instruction } = request
  return [
    instruction || 'Convert the supplied source into structured Rubisco Medical Library study material.',
    RESPONSE_SCHEMA_REMINDER,
    `Generation mode: ${mode}`,
    `Title: ${title}`,
    subject ? `Subject: ${subject}` : '',
    topic ? `Topic: ${topic}` : '',
    `Source type: ${sourceType}`,
    chunkInfo,
    sourceText ? `Source text:\n${sourceText}` : '',
    `IMPORTANT COVERAGE RULE: This is one chunk of a larger source. Extract and preserve ALL medically meaningful information present in this supplied chunk. Do not stop early, do not give only an overview, and do not omit tables, classifications, mechanisms, examples, exceptions, diagnostic points, treatment points, or exam-relevant details. Organize the material clearly instead of copying the source verbatim.`,
    `Do not claim to cover pages that are not supplied in this chunk. Do not refer to other chunks.`
  ].filter(Boolean).join('\n\n')
}

function normalizeRequest(value) {
  if (!value || typeof value !== 'object') throw new Error('Request must be a JSON object.')
  for (const key of ['mode', 'title', 'sourceType']) {
    if (typeof value[key] !== 'string' || !value[key].trim()) throw new Error(`Request must include a non-empty "${key}".`)
  }
  if (value.sourceText !== undefined && typeof value.sourceText !== 'string') throw new Error('"sourceText" must be a string when supplied.')
  if (value.instruction !== undefined && typeof value.instruction !== 'string') throw new Error('"instruction" must be a string when supplied.')
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

function makeModel() {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      temperature: 0.15
    }
  })
}

function createChunkId(prefix = 'chunk') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function splitPdfIntoChunks(buffer, originalName) {
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pageCount = sourcePdf.getPageCount()
  if (!pageCount) throw new Error(`PDF "${originalName}" contains no pages.`)

  const chunks = []
  for (let start = 0; start < pageCount; start += PDF_CHUNK_PAGES) {
    const end = Math.min(start + PDF_CHUNK_PAGES, pageCount)
    const chunkPdf = await PDFDocument.create()
    const pages = await chunkPdf.copyPages(sourcePdf, Array.from({ length: end - start }, (_, i) => start + i))
    pages.forEach((page) => chunkPdf.addPage(page))
    const bytes = await chunkPdf.save()
    chunks.push({
      kind: 'pdf',
      data: Buffer.from(bytes),
      mimeType: 'application/pdf',
      label: `${originalName} — pages ${start + 1}-${end}`,
      pageStart: start + 1,
      pageEnd: end
    })
  }
  return chunks
}

function splitTextIntoChunks(text) {
  if (text.length <= TEXT_CHUNK_CHARS) return [{ kind: 'text', text, label: 'text source' }]
  const chunks = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + TEXT_CHUNK_CHARS, text.length)
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end)
      const sentenceBreak = text.lastIndexOf('. ', end)
      if (paragraphBreak > start + TEXT_CHUNK_CHARS * 0.65) end = paragraphBreak + 2
      else if (sentenceBreak > start + TEXT_CHUNK_CHARS * 0.65) end = sentenceBreak + 2
    }
    chunks.push({ kind: 'text', text: text.slice(start, end), label: `text characters ${start + 1}-${end}` })
    start = end
  }
  return chunks
}

async function generateOneChunk(model, request, chunk, chunkIndex, totalChunks) {
  const chunkInfo = `Chunk ${chunkIndex + 1} of ${totalChunks}: ${chunk.label}`
  const prompt = buildPrompt({ ...request, sourceText: chunk.kind === 'text' ? chunk.text : '' }, chunkInfo)
  const parts = [{ text: prompt }]
  if (chunk.kind === 'pdf' || chunk.kind === 'image') {
    parts.push({ inlineData: { data: chunk.data.toString('base64'), mimeType: chunk.mimeType } })
  }

  let result
  try {
    result = await model.generateContent(parts)
  } catch (error) {
    throw new Error(`Gemini failed for ${chunk.label}: ${error?.message || 'unknown API error'}`)
  }

  const candidate = result?.response?.candidates?.[0]
  const finishReason = candidate?.finishReason
  if (finishReason === 'MAX_TOKENS') {
    throw new Error(`Gemini hit the output limit for ${chunk.label}; this chunk is too large to represent completely.`)
  }

  const rawText = result?.response?.text?.() || ''
  if (!rawText.trim()) throw new Error(`Gemini returned an empty response for ${chunk.label}.`)

  let parsed
  try {
    parsed = extractJson(rawText)
  } catch (error) {
    throw new Error(`Gemini returned incomplete JSON for ${chunk.label}: ${error?.message || 'invalid JSON'}`)
  }

  try {
    return validateDocumentPayload(parsed, {
      studyMaterialId: 'temporary-chunk-material',
      title: request.title
    })
  } catch (error) {
    throw new Error(`Gemini output failed validation for ${chunk.label}: ${error?.message || 'invalid document'}`)
  }
}

async function mapInBatches(items, worker, concurrency) {
  const results = new Array(items.length)
  let cursor = 0
  async function runner() {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner))
  return results
}

function mergeChunkResults(results, request) {
  const studyMaterialId = `material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const sections = []
  const questions = []
  const seenQuestionIds = new Set()

  results.forEach((result, index) => {
    result.document.sections.forEach((section, sectionIndex) => {
      sections.push({
        ...section,
        id: `section-${index + 1}-${sectionIndex + 1}`,
        blocks: section.blocks.map((block, blockIndex) => ({
          ...block,
          id: `chunk-${index + 1}-block-${blockIndex + 1}`
        }))
      })
    })
    for (const question of result.questions) {
      const id = question.id || `question-${questions.length + 1}`
      if (seenQuestionIds.has(id)) continue
      seenQuestionIds.add(id)
      questions.push({ ...question, id: `chunk-${index + 1}-${id}` })
    }
  })

  return {
    schemaVersion: 1,
    provider: 'gemini',
    model: GEMINI_MODEL,
    document: {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studyMaterialId,
      title: request.title,
      sections,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    questions
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
    if (!files.length && !request.sourceText.trim()) {
      return sendJsonError(res, 400, 'No source material was supplied.')
    }

    const chunks = []
    if (files.length) {
      for (const file of files) {
        if (file.mimetype === 'application/pdf') {
          try {
            const pdfChunks = await splitPdfIntoChunks(file.buffer, file.originalname || 'source.pdf')
            chunks.push(...pdfChunks)
          } catch (error) {
            return sendJsonError(res, 400, `Could not read PDF "${file.originalname || 'source.pdf'}".`, error?.message)
          }
        } else {
          chunks.push({
            kind: file.mimetype.startsWith('image/') ? 'image' : 'text',
            data: file.buffer,
            text: file.mimetype === 'text/plain' ? file.buffer.toString('utf8') : '',
            mimeType: file.mimetype,
            label: file.originalname || file.mimetype
          })
        }
      }
    }

    if (request.sourceText.trim()) chunks.push(...splitTextIntoChunks(request.sourceText))

    const theoreticalOutputBudget = chunks.length * GEMINI_MAX_OUTPUT_TOKENS
    if (theoreticalOutputBudget > MAX_TOTAL_OUTPUT_TOKENS) {
      return sendJsonError(res, 413, `This source would require a theoretical maximum of ${theoreticalOutputBudget.toLocaleString()} output tokens across ${chunks.length} Gemini calls, above the configured total budget of ${MAX_TOTAL_OUTPUT_TOKENS.toLocaleString()}. Reduce chunk size or raise MAX_TOTAL_OUTPUT_TOKENS.`)
    }

    const model = makeModel()
    console.log(`Generating ${chunks.length} source chunk(s) for "${request.title}" with concurrency ${MAX_PARALLEL_CHUNKS}; max ${GEMINI_MAX_OUTPUT_TOKENS} output tokens/chunk; theoretical total ${theoreticalOutputBudget}.`)

    let results
    try {
      results = await mapInBatches(
        chunks,
        (chunk, index) => generateOneChunk(model, request, chunk, index, chunks.length),
        MAX_PARALLEL_CHUNKS
      )
    } catch (error) {
      console.error('Chunked Gemini generation failed:', error)
      return sendJsonError(res, 502, 'AI generation failed while processing the complete source.', error?.message)
    }

    const merged = mergeChunkResults(results, request)
    return sendJson(res, 200, merged)
  } catch (error) {
    console.error('Unexpected /api/ai/generate error:', error)
    return sendJsonError(res, 500, 'Unexpected server error.')
  }
})

app.get('/api/health', (_req, res) => sendJson(res, 200, {
  ok: true,
  service: 'rubisco-medical-library',
  provider: 'gemini',
  model: GEMINI_MODEL,
  pdfChunkPages: PDF_CHUNK_PAGES,
  maxParallelChunks: MAX_PARALLEL_CHUNKS,
  geminiMaxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
  maxTotalOutputTokens: MAX_TOTAL_OUTPUT_TOKENS
}))

app.use('/api', (req, res) => sendJsonError(res, 404, `No API route for ${req.method} ${req.path}`))

app.use(express.static(distDir, { index: false, fallthrough: true }))
app.get(['/editor/:id', '/document/:materialId'], (_req, res) => res.sendFile(indexFile))
for (const route of SPA_ROUTES) app.get(route, (_req, res) => res.sendFile(indexFile))

app.get('*', (req, res) => sendJsonError(res, 404, `Frontend route not found: ${req.path}`))

app.use((error, _req, res, _next) => {
  console.error('Server middleware error:', error)
  const status = error?.code === 'LIMIT_FILE_SIZE' ? 413 : 400
  return sendJsonError(res, status, error?.message || 'Request failed.')
})

app.listen(PORT, '0.0.0.0', () => console.log(`Rubisco Medical Library listening on port ${PORT}`))
