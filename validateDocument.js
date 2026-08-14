const VALID_BLOCK_TYPES = new Set([
  'heading',
  'subheading',
  'paragraph',
  'bulletList',
  'numberedList',
  'table',
  'flowchart',
  'mnemonic',
  'examBox',
  'image'
])

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requireString(value, field) {
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`)
}

function normalizeRuns(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array.`)
  }

  return value.map((run, index) => {
    if (!isObject(run)) throw new Error(`${field}[${index}] must be an object.`)
    requireString(run.text, `${field}[${index}].text`)
    const normalized = { text: run.text }
    for (const key of ['bold', 'italic', 'underline']) {
      if (run[key] !== undefined) {
        if (typeof run[key] !== 'boolean') throw new Error(`${field}[${index}].${key} must be boolean.`)
        normalized[key] = run[key]
      }
    }
    if (run.color !== undefined) requireString(run.color, `${field}[${index}].color`)
    if (run.fontFamily !== undefined) requireString(run.fontFamily, `${field}[${index}].fontFamily`)
    return normalized
  })
}

function normalizeBlock(block, index) {
  if (!isObject(block)) throw new Error(`Block ${index + 1} is not an object.`)
  if (!VALID_BLOCK_TYPES.has(block.type)) {
    throw new Error(`Block ${index + 1} has unsupported type "${block.type}".`)
  }

  const id = typeof block.id === 'string' && block.id.trim()
    ? block.id
    : `block-${index + 1}-${Math.random().toString(36).slice(2, 8)}`

  switch (block.type) {
    case 'heading':
    case 'subheading':
    case 'paragraph': {
      const out = { id, type: block.type, runs: normalizeRuns(block.runs, `block ${id}.runs`) }
      if (block.align !== undefined) requireString(block.align, `block ${id}.align`)
      if (block.size !== undefined) requireString(block.size, `block ${id}.size`)
      if (block.align !== undefined) out.align = block.align
      if (block.size !== undefined && block.type === 'paragraph') out.size = block.size
      return out
    }

    case 'bulletList':
    case 'numberedList': {
      if (!Array.isArray(block.items)) throw new Error(`block ${id}.items must be an array.`)
      const items = block.items.map((item, i) => normalizeRuns(item, `block ${id}.items[${i}]`))
      return { id, type: block.type, items }
    }

    case 'table': {
      if (!Array.isArray(block.rows) || !block.rows.every(Array.isArray)) {
        throw new Error(`block ${id}.rows must be an array of arrays.`)
      }
      const rows = block.rows.map((row, r) => row.map((cell, c) => {
        requireString(cell, `block ${id}.rows[${r}][${c}]`)
        return cell
      }))
      if (typeof block.headerRow !== 'boolean') {
        throw new Error(`block ${id}.headerRow must be boolean.`)
      }
      return { id, type: 'table', rows, headerRow: block.headerRow }
    }

    case 'flowchart': {
      if (!Array.isArray(block.nodes)) throw new Error(`block ${id}.nodes must be an array.`)
      const nodes = block.nodes.map((node, i) => {
        if (!isObject(node)) throw new Error(`block ${id}.nodes[${i}] must be an object.`)
        requireString(node.text, `block ${id}.nodes[${i}].text`)
        return {
          id: typeof node.id === 'string' && node.id ? node.id : `node-${i + 1}`,
          text: node.text
        }
      })
      return { id, type: 'flowchart', nodes }
    }

    case 'mnemonic':
      requireString(block.title, `block ${id}.title`)
      requireString(block.content, `block ${id}.content`)
      return { id, type: 'mnemonic', title: block.title, content: block.content }

    case 'examBox':
      requireString(block.content, `block ${id}.content`)
      return { id, type: 'examBox', content: block.content }

    case 'image': {
      const out = { id, type: 'image' }
      if (block.sourceAssetId !== undefined) requireString(block.sourceAssetId, `block ${id}.sourceAssetId`)
      if (block.caption !== undefined) requireString(block.caption, `block ${id}.caption`)
      if (block.sourceAssetId !== undefined) out.sourceAssetId = block.sourceAssetId
      if (block.caption !== undefined) out.caption = block.caption
      return out
    }
  }
}

function normalizeQuestion(question, index) {
  if (!isObject(question)) throw new Error(`Question ${index + 1} is not an object.`)
  requireString(question.id, `questions[${index}].id`)
  requireString(question.type, `questions[${index}].type`)
  requireString(question.question, `questions[${index}].question`)
  if (question.type !== 'mcq' && question.type !== 'shortAnswer') {
    throw new Error(`Question ${index + 1} has unsupported type "${question.type}".`)
  }

  const out = {
    id: question.id,
    type: question.type,
    question: question.question
  }

  if (question.options !== undefined) {
    if (!Array.isArray(question.options)) throw new Error(`questions[${index}].options must be an array.`)
    out.options = question.options.map((option, i) => {
      if (!isObject(option)) throw new Error(`questions[${index}].options[${i}] must be an object.`)
      requireString(option.id, `questions[${index}].options[${i}].id`)
      requireString(option.text, `questions[${index}].options[${i}].text`)
      return { id: option.id, text: option.text }
    })
  }
  for (const key of ['answer', 'explanation']) {
    if (question[key] !== undefined) {
      requireString(question[key], `questions[${index}].${key}`)
      out[key] = question[key]
    }
  }
  return out
}

export function validateDocumentPayload(raw, { studyMaterialId, title } = {}) {
  if (!isObject(raw)) throw new Error('Model response was not a JSON object.')
  if (raw.schemaVersion !== undefined && raw.schemaVersion !== 1) {
    throw new Error('Unsupported schemaVersion.')
  }

  if (!isObject(raw.document)) throw new Error('Model response is missing document.')
  const source = raw.document

  if (!Array.isArray(source.sections) || source.sections.length === 0) {
    throw new Error('document.sections must contain at least one section.')
  }

  const sections = source.sections.map((section, sIndex) => {
    if (!isObject(section)) throw new Error(`Section ${sIndex + 1} is not an object.`)
    if (!Array.isArray(section.blocks)) throw new Error(`Section ${sIndex + 1}.blocks must be an array.`)
    return {
      id: typeof section.id === 'string' && section.id.trim() ? section.id : `section-${sIndex + 1}`,
      blocks: section.blocks.map((block, bIndex) => normalizeBlock(block, bIndex))
    }
  })

  const document = {
    id: typeof source.id === 'string' && source.id.trim() ? source.id : `doc-${Date.now()}`,
    studyMaterialId: studyMaterialId || (typeof source.studyMaterialId === 'string' ? source.studyMaterialId : `material-${Date.now()}`),
    title: title || (typeof source.title === 'string' ? source.title : 'Untitled'),
    sections,
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : Date.now()
  }

  let questions = []
  if (raw.questions !== undefined) {
    if (!Array.isArray(raw.questions)) throw new Error('questions must be an array.')
    questions = raw.questions.map(normalizeQuestion)
  }

  return { document, questions }
}
