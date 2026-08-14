import { PDFDocument } from 'pdf-lib'

/**
 * We do NOT physically split the PDF bytes into separate files. Gemini can
 * read the whole PDF fine — the failure mode is output truncation, not
 * input limits. So instead: send the SAME full PDF on every chunk call, but
 * instruct the model to only produce notes for one page range per call.
 * This is simpler and more reliable than byte-level PDF splitting (which
 * can break embedded fonts/images) and still solves the real problem.
 */
export async function getPdfPageCount(buffer) {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    return doc.getPageCount()
  } catch (error) {
    console.error('Could not read PDF page count, defaulting to single-pass:', error?.message)
    return null
  }
}

/**
 * Builds an array of { index, start, end } 1-based inclusive page ranges.
 * Returns a single range covering the whole document if pageCount is
 * unknown or small enough to not need chunking.
 */
export function buildPageChunks(pageCount, pagesPerChunk) {
  if (!pageCount || pageCount <= pagesPerChunk) {
    return [{ index: 1, start: 1, end: pageCount || null, total: 1 }]
  }

  const chunks = []
  let start = 1
  let index = 1
  const totalChunks = Math.ceil(pageCount / pagesPerChunk)
  while (start <= pageCount) {
    const end = Math.min(start + pagesPerChunk - 1, pageCount)
    chunks.push({ index, start, end, total: totalChunks })
    start = end + 1
    index += 1
  }
  return chunks
}

/**
 * Tiny concurrency-limited task runner so we don't fire all chunk requests
 * at Gemini simultaneously and trip rate limits.
 */
export async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0

  async function runNext() {
    while (cursor < items.length) {
      const current = cursor
      cursor += 1
      results[current] = await worker(items[current], current)
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, runNext)
  await Promise.all(runners)
  return results
}
