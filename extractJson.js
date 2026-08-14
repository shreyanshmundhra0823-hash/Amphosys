/**
 * Best-effort JSON extraction for LLM output.
 *
 * Handles:
 *  - ```json ... ``` fences
 *  - prose before/after the JSON object
 *  - trailing commas
 *  - truncated objects/arrays/strings
 *
 * Validation still happens after extraction, so a repaired-but-structurally
 * incomplete document is rejected rather than silently accepted.
 */
export function extractJson(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Model returned an empty response.')
  }

  let text = rawText.trim()

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced) text = fenced[1].trim()

  const direct = tryParse(text)
  if (direct) return direct

  const firstBrace = text.indexOf('{')
  if (firstBrace < 0) throw new Error('No JSON object was found in the model response.')

  // Use the entire suffix from the first object start. If there is prose after
  // the JSON, trim it by locating the last object terminator and retrying.
  const candidate = text.slice(firstBrace)
  const lastBrace = candidate.lastIndexOf('}')
  if (lastBrace > 0) {
    const bounded = candidate.slice(0, lastBrace + 1)
    const parsed = tryParse(bounded)
    if (parsed) return parsed
  }

  const repaired = repairJson(candidate)
  const parsed = tryParse(repaired)
  if (parsed) return parsed

  throw new Error('Could not recover valid JSON; the model response may be truncated.')
}

function tryParse(text) {
  try {
    return JSON.parse(removeTrailingCommas(text))
  } catch {
    return null
  }
}

function removeTrailingCommas(text) {
  let out = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      out += ch
      escaped = false
      continue
    }

    if (ch === '\\' && inString) {
      out += ch
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      out += ch
      continue
    }

    if (!inString && ch === ',') {
      let j = i + 1
      while (j < text.length && /\s/.test(text[j])) j++
      if (text[j] === '}' || text[j] === ']') continue
    }

    out += ch
  }

  return out
}

function repairJson(text) {
  let out = ''
  let inString = false
  let escaped = false
  const stack = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      out += ch
      escaped = false
      continue
    }

    if (ch === '\\' && inString) {
      out += ch
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      out += ch
      continue
    }

    if (!inString) {
      if (ch === '{' || ch === '[') stack.push(ch)
      else if (ch === '}' || ch === ']') {
        if (stack.length) stack.pop()
      }
    }

    out += ch
  }

  // If Gemini cut off in the middle of a string, close the string. This is
  // only a recovery attempt; schema validation is still mandatory afterwards.
  if (inString) out += '"'

  // A dangling comma before a synthetic closing delimiter is invalid JSON.
  out = out.replace(/,\s*$/, '')

  while (stack.length) {
    const open = stack.pop()
    out += open === '{' ? '}' : ']'
  }

  return removeTrailingCommas(out)
}
