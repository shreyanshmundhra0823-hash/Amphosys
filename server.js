import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import pdfParse from 'pdf-parse'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { extractJson } from './extractJson.js'
import { validateDocumentPayload } from './validateDocument.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

const PORT = Number(process.env.PORT || 3000)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
const MAX_FILE_MB = Math.min(Math.max(Number(process.env.MAX_FILE_MB || 25), 1), 50)
const PDF_CHUNK_PAGES = Math.min(Math.max(Number(process.env.PDF_CHUNK_PAGES || 1), 1), 12)
const MAX_PARALLEL_CHUNKS = Math.min(Math.max(Number(process.env.MAX_PARALLEL_CHUNKS || 2), 1), 5)
const GEMINI_MAX_OUTPUT_TOKENS = Math.min(Math.max(Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 65536), 8192), 65536)
const TEXT_CHUNK_CHARS = Math.min(Math.max(Number(process.env.TEXT_CHUNK_CHARS || 30000), 10000), 60000)
const MAX_TOTAL_OUTPUT_TOKENS = Math.max(Number(process.env.MAX_TOTAL_OUTPUT_TOKENS || 524288), GEMINI_MAX_OUTPUT_TOKENS)
const CHUNK_MAX_RETRIES = Math.min(Math.max(Number(process.env.CHUNK_MAX_RETRIES || 3), 0), 5)
// If a chunk's structured output has fewer words than this fraction of the
// source chunk's own word count, we treat it as an incomplete/summarized
// result — even though the JSON was technically valid — and retry/bisect it
// exactly like a truncation failure. This catches the model quietly
// producing a short "overview" instead of exhaustive notes.
const COVERAGE_MIN_RATIO = Math.min(Math.max(Number(process.env.COVERAGE_MIN_RATIO || 0.6), 0), 1)
// Below this many source words, we don't bother enforcing the ratio (a
// near-empty page/chunk can legitimately produce a short result).
const COVERAGE_MIN_SOURCE_WORDS = Math.max(Number(process.env.COVERAGE_MIN_SOURCE_WORDS || 40), 0)

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
    `STRICT ANTI-SUMMARIZATION RULE: A short, summarized, or "overview" response is treated as a FAILED response, not a valid one. If this chunk contains multiple headings, sub-topics, bullet points, or table rows, your output MUST contain a corresponding block for EVERY one of them — not just the first topic or the first few bullets. Do not truncate a list partway through. Do not condense a comparison table into prose. If you are running low on output budget, prioritize finishing coverage of every topic over elaborate prose for any single topic.`,
    `FORBIDDEN OUTPUT SHAPE: Do NOT respond with a single bullet/numbered list where each item is just a topic name plus a short clause (i.e. a table of contents or syllabus outline standing in for the notes). That is a FAILED response even if it lists every topic in the chunk, because it names the subjects without teaching any of them. Every topic/heading present in the source MUST become its own heading block followed by real explanatory content underneath (paragraphs, sub-bullets of actual facts, tables, mnemonics, exam boxes) — definitions, mechanisms, values, criteria, steps, exceptions — not just the topic's name.`,
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

async function buildPdfChunkFromRange(sourcePdf, originalName, start, end, sourceBuffer) {
  // start/end are 0-based [start, end) page indices.
  const chunkPdf = await PDFDocument.create()
  const pages = await chunkPdf.copyPages(sourcePdf, Array.from({ length: end - start }, (_, i) => start + i))
  pages.forEach((page) => chunkPdf.addPage(page))
  const bytes = await chunkPdf.save()
  return {
    kind: 'pdf',
    data: Buffer.from(bytes),
    mimeType: 'application/pdf',
    label: `${originalName} — pages ${start + 1}-${end}`,
    pageStart: start + 1,
    pageEnd: end,
    // Kept so a failing chunk can be re-split into smaller page ranges from
    // the ORIGINAL source bytes (not the already-shrunk chunk bytes), which
    // keeps embedded fonts/images intact at any bisection depth.
    sourceBuffer,
    originalName
  }
}

async function splitPdfIntoChunks(buffer, originalName) {
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pageCount = sourcePdf.getPageCount()
  if (!pageCount) throw new Error(`PDF "${originalName}" contains no pages.`)

  const chunks = []
  for (let start = 0; start < pageCount; start += PDF_CHUNK_PAGES) {
    const end = Math.min(start + PDF_CHUNK_PAGES, pageCount)
    chunks.push(await buildPdfChunkFromRange(sourcePdf, originalName, start, end, buffer))
  }
  return chunks
}

/**
 * Splits a failing PDF chunk into two half-size page-range chunks, built
 * fresh from the ORIGINAL source bytes (chunk.sourceBuffer), not from the
 * already-generated (and failing) chunk bytes.
 */
async function bisectPdfChunk(chunk) {
  const sourcePdf = await PDFDocument.load(chunk.sourceBuffer, { ignoreEncryption: true })
  const startIdx = chunk.pageStart - 1
  const endIdx = chunk.pageEnd
  const mid = startIdx + Math.ceil((endIdx - startIdx) / 2)
  const first = await buildPdfChunkFromRange(sourcePdf, chunk.originalName, startIdx, mid, chunk.sourceBuffer)
  const second = await buildPdfChunkFromRange(sourcePdf, chunk.originalName, mid, endIdx, chunk.sourceBuffer)
  return [first, second]
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

function countWords(text) {
  if (!text) return 0
  const matches = String(text).trim().match(/\S+/g)
  return matches ? matches.length : 0
}

async function estimatePdfWordCount(buffer) {
  try {
    const { text } = await pdfParse(buffer)
    return countWords(text)
  } catch (error) {
    console.warn('Could not extract PDF text for coverage check:', error?.message)
    return 0
  }
}

/** Sums up words across every text-bearing field in a generated document, so we can compare it against the source. */
function countDocumentWords(document) {
  let total = 0
  const addRuns = (runs) => { (runs || []).forEach((r) => { total += countWords(r?.text) }) }

  for (const section of document.sections || []) {
    for (const block of section.blocks || []) {
      switch (block.type) {
        case 'heading':
        case 'subheading':
        case 'paragraph':
          addRuns(block.runs)
          break
        case 'bulletList':
        case 'numberedList':
          (block.items || []).forEach(addRuns)
          break
        case 'table':
          (block.rows || []).forEach((row) => (row || []).forEach((cell) => { total += countWords(cell) }))
          break
        case 'flowchart':
          (block.nodes || []).forEach((n) => { total += countWords(n?.text) })
          break
        case 'mnemonic':
          total += countWords(block.title) + countWords(block.content)
          break
        case 'examBox':
          total += countWords(block.content)
          break
        default:
          break
      }
    }
  }
  return total
}

/** Blocks that represent actual developed explanation, as opposed to a block that merely names a topic (a list item). */
const DEVELOPED_CONTENT_TYPES = new Set(['heading', 'subheading', 'paragraph', 'table', 'mnemonic', 'examBox', 'flowchart'])

function countDevelopedContentBlocks(document) {
  let count = 0
  for (const section of document.sections || []) {
    for (const block of section.blocks || []) {
      if (DEVELOPED_CONTENT_TYPES.has(block.type)) count += 1
    }
  }
  return count
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

  let validated
  try {
    validated = validateDocumentPayload(parsed, {
      studyMaterialId: 'temporary-chunk-material',
      title: request.title
    })
  } catch (error) {
    throw new Error(`Gemini output failed validation for ${chunk.label}: ${error?.message || 'invalid document'}`)
  }

  // Coverage check: catches the model quietly writing a short "overview"
  // instead of exhaustive notes — a failure mode that produces perfectly
  // valid JSON, so nothing above this point would ever catch it.
  if (chunk.kind === 'pdf') {
    const sourceWords = await estimatePdfWordCount(chunk.data)
    const outputWords = countDocumentWords(validated.document)
    if (sourceWords >= COVERAGE_MIN_SOURCE_WORDS) {
      const ratio = sourceWords > 0 ? outputWords / sourceWords : 1
      if (ratio < COVERAGE_MIN_RATIO) {
        throw new Error(
          `Output for ${chunk.label} covers only ~${Math.round(ratio * 100)}% of the source (source ~${sourceWords} words, notes ~${outputWords} words) — looks like a summary, not exhaustive notes.`
        )
      }

      // Structural check: a dense single bullet list of topic names can pass
      // the word-count ratio above (its total word count can look fine)
      // while still being a table of contents rather than real notes — it
      // names every topic without teaching any of them. Require a minimum
      // amount of actually-developed content (headings/paragraphs/tables/
      // mnemonics/exam boxes/flowcharts), scaled to source length, so a
      // topic-index shaped response is caught and retried like any other
      // incomplete result.
      const developedBlocks = countDevelopedContentBlocks(validated.document)
      const minDevelopedBlocks = Math.max(2, Math.ceil(sourceWords / 150))
      if (developedBlocks < minDevelopedBlocks) {
        throw new Error(
          `Output for ${chunk.label} has only ${developedBlocks} developed content block(s) (heading/paragraph/table/mnemonic/examBox/flowchart) for ~${sourceWords} source words (expected at least ${minDevelopedBlocks}) — looks like a table of contents, not developed notes.`
        )
      }
    }
  }

  return validated
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retries a single chunk up to CHUNK_MAX_RETRIES times, with a short
 * backoff between attempts (helps with transient rate-limit failures, not
 * just content-driven truncation). Never throws.
 */
async function generateOneChunkWithRetries(model, request, chunk, chunkIndex, totalChunks) {
  let lastError = null
  for (let attempt = 0; attempt <= CHUNK_MAX_RETRIES; attempt += 1) {
    try {
      const validated = await generateOneChunk(model, request, chunk, chunkIndex, totalChunks)
      if (attempt > 0) {
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} (${chunk.label}) succeeded on retry ${attempt}.`)
      }
      return { ok: true, chunk, validated }
    } catch (error) {
      lastError = error
      console.error(`Chunk ${chunkIndex + 1}/${totalChunks} (${chunk.label}) attempt ${attempt + 1}/${CHUNK_MAX_RETRIES + 1} failed:`, error?.message)
      if (attempt < CHUNK_MAX_RETRIES) await sleep(800 * (attempt + 1))
    }
  }
  return { ok: false, chunk, error: lastError }
}

/**
 * The real "never give up" layer: if a PDF chunk still fails after every
 * retry, split it into two half-size page ranges (built from the ORIGINAL
 * source bytes) and recurse on each half. A one-page chunk essentially
 * never overflows Gemini's output limit, so bisecting down converges on
 * success — total failure only happens if a SINGLE page truly cannot be
 * processed (e.g. corrupt page), which gets reported explicitly rather than
 * silently dropped.
 */
async function generateChunkResilient(model, request, chunk, chunkIndex, totalChunks, depth = 0) {
  const result = await generateOneChunkWithRetries(model, request, chunk, chunkIndex, totalChunks)
  if (result.ok) return [result]

  const canBisect = chunk.kind === 'pdf' && chunk.pageEnd > chunk.pageStart && depth < 6
  if (!canBisect) return [result]

  console.warn(`Chunk ${chunkIndex + 1}/${totalChunks} (${chunk.label}) failed after retries — splitting pages ${chunk.pageStart}-${chunk.pageEnd} in half and retrying each half (depth ${depth + 1}).`)

  let halves
  try {
    halves = await bisectPdfChunk(chunk)
  } catch (error) {
    console.error(`Could not bisect ${chunk.label}:`, error?.message)
    return [result]
  }

  const subResults = []
  for (const half of halves) {
    const subResult = await generateChunkResilient(model, request, half, chunkIndex, totalChunks, depth + 1)
    subResults.push(...subResult)
  }
  return subResults
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
  const failedChunks = []

  results.forEach((result, index) => {
    if (!result.ok) {
      failedChunks.push(result.chunk.label)
      sections.push({
        id: `section-${index + 1}-failed`,
        blocks: [{
          id: `chunk-${index + 1}-failed-notice`,
          type: 'examBox',
          content: `⚠ Could not generate notes for ${result.chunk.label} after ${CHUNK_MAX_RETRIES + 1} attempt(s): ${result.error?.message || 'unknown error'}. Try regenerating, or reduce PDF_CHUNK_PAGES on the backend and retry.`
        }]
      })
      return
    }
    result.validated.document.sections.forEach((section, sectionIndex) => {
      sections.push({
        ...section,
        id: `section-${index + 1}-${sectionIndex + 1}`,
        blocks: section.blocks.map((block, blockIndex) => ({
          ...block,
          id: `chunk-${index + 1}-block-${blockIndex + 1}`
        }))
      })
    })
    for (const question of result.validated.questions) {
      const id = question.id || `question-${questions.length + 1}`
      if (seenQuestionIds.has(id)) continue
      seenQuestionIds.add(id)
      questions.push({ ...question, id: `chunk-${index + 1}-${id}` })
    }
  })

  if (failedChunks.length) {
    console.warn(`${failedChunks.length}/${results.length} chunk(s) failed even after retries and were replaced with a notice: ${failedChunks.join(', ')}`)
  }

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
    questions,
    warnings: failedChunks.length
      ? [`${failedChunks.length} of ${results.length} source section(s) could not be generated: ${failedChunks.join(', ')}`]
      : []
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

    // NOTE: this used to be a hard reject — if chunks.length * GEMINI_MAX_OUTPUT_TOKENS
    // (a worst-case ceiling, not a real cost estimate) exceeded MAX_TOTAL_OUTPUT_TOKENS,
    // the ENTIRE request was rejected with a 413 before Gemini was ever called. Because
    // GEMINI_MAX_OUTPUT_TOKENS is the max any one chunk *could* use, not what it actually
    // uses, this rejected any real textbook PDF longer than ~8-32 pages (depending on
    // PDF_CHUNK_PAGES) outright — which is almost certainly why "complete PDF" notes were
    // never generated for normal-length chapters. The real safety net is the per-chunk
    // retry + auto-bisection + coverage-check pipeline below, which already handles
    // failures chunk-by-chunk. A long PDF just means more chunks/more calls, which is
    // fine — it is not a reason to refuse the request. This is now advisory only.
    const theoreticalOutputBudget = chunks.length * GEMINI_MAX_OUTPUT_TOKENS
    if (theoreticalOutputBudget > MAX_TOTAL_OUTPUT_TOKENS) {
      console.warn(`"${request.title}": theoretical output budget ${theoreticalOutputBudget.toLocaleString()} exceeds MAX_TOTAL_OUTPUT_TOKENS (${MAX_TOTAL_OUTPUT_TOKENS.toLocaleString()}) — proceeding anyway; this is a worst-case estimate, not a real cost.`)
    }

    const model = makeModel()
    console.log(`Generating ${chunks.length} source chunk(s) for "${request.title}" with concurrency ${MAX_PARALLEL_CHUNKS}; max ${GEMINI_MAX_OUTPUT_TOKENS} output tokens/chunk; up to ${CHUNK_MAX_RETRIES} retries + auto-bisection/chunk; theoretical total ${theoreticalOutputBudget}.`)

    const resultGroups = await mapInBatches(
      chunks,
      (chunk, index) => generateChunkResilient(model, request, chunk, index, chunks.length),
      MAX_PARALLEL_CHUNKS
    )
    const results = resultGroups.flat()

    const succeededCount = results.filter((r) => r.ok).length
    console.log(`Chunk generation finished for "${request.title}": ${succeededCount}/${results.length} section(s) succeeded (after bisection).`)

    if (succeededCount === 0) {
      return sendJsonError(res, 502, 'AI generation failed for every section of the source.', results[0]?.error?.message)
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
  maxTotalOutputTokens: MAX_TOTAL_OUTPUT_TOKENS,
  chunkMaxRetries: CHUNK_MAX_RETRIES,
  coverageMinRatio: COVERAGE_MIN_RATIO,
  coverageMinSourceWords: COVERAGE_MIN_SOURCE_WORDS,
  version: 'v4-coverage-check'
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
