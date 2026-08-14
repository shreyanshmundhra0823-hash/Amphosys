import { AppError } from '@/lib/errors'
import type { Block, StudyDocument, TextRun } from '@/types/document'
import type { AIGenerationResponse, AIQuestion, AIProvider, ValidatedAIGenerationResult } from '@/types/ai'

const blockTypes = new Set([
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

const providers = new Set<AIProvider>(['gemini', 'openai', 'claude', 'local'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string') throw new AppError(`AI response is invalid: ${field} must be text.`)
}

function assertOptionalString(value: unknown, field: string): void {
  if (value !== undefined && typeof value !== 'string') throw new AppError(`AI response is invalid: ${field} must be text.`)
}

function assertStringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new AppError(`AI response is invalid: ${field} must be an array of text.`)
  }
}

function validateRuns(value: unknown, field: string): asserts value is TextRun[] {
  if (!Array.isArray(value)) throw new AppError(`AI response is invalid: ${field} must be an array.`)
  for (const [index, run] of value.entries()) {
    if (!isRecord(run)) throw new AppError(`AI response is invalid: ${field}[${index}] is malformed.`)
    assertString(run.text, `${field}[${index}].text`)
    for (const key of ['bold', 'italic', 'underline']) {
      if (run[key] !== undefined && typeof run[key] !== 'boolean') {
        throw new AppError(`AI response is invalid: ${field}[${index}].${key} must be boolean.`)
      }
    }
    assertOptionalString(run.color, `${field}[${index}].color`)
    assertOptionalString(run.fontFamily, `${field}[${index}].fontFamily`)
  }
}

function validateBlock(value: unknown): asserts value is Block {
  if (!isRecord(value)) throw new AppError('AI response is invalid: a document block is malformed.')
  assertString(value.id, 'block.id')
  assertString(value.type, 'block.type')
  if (!blockTypes.has(value.type)) throw new AppError(`AI response contains an unsupported block type: ${value.type}.`)

  switch (value.type) {
    case 'heading':
    case 'subheading':
      validateRuns(value.runs, `block ${value.id}.runs`)
      assertOptionalString(value.align, `block ${value.id}.align`)
      break
    case 'paragraph':
      validateRuns(value.runs, `block ${value.id}.runs`)
      assertOptionalString(value.align, `block ${value.id}.align`)
      assertOptionalString(value.size, `block ${value.id}.size`)
      break
    case 'bulletList':
    case 'numberedList':
      if (!Array.isArray(value.items)) throw new AppError(`AI response is invalid: block ${value.id}.items must be an array.`)
      for (const [index, item] of value.items.entries()) validateRuns(item, `block ${value.id}.items[${index}]`)
      break
    case 'table':
      if (typeof value.headerRow !== 'boolean' || !Array.isArray(value.rows)) {
        throw new AppError(`AI response is invalid: table block ${value.id} is malformed.`)
      }
      for (const [rowIndex, row] of value.rows.entries()) assertStringArray(row, `block ${value.id}.rows[${rowIndex}]`)
      break
    case 'flowchart':
      if (!Array.isArray(value.nodes)) throw new AppError(`AI response is invalid: flowchart block ${value.id}.nodes must be an array.`)
      for (const [index, node] of value.nodes.entries()) {
        if (!isRecord(node)) throw new AppError(`AI response is invalid: flowchart node ${index + 1} is malformed.`)
        assertString(node.id, `block ${value.id}.nodes[${index}].id`)
        assertString(node.text, `block ${value.id}.nodes[${index}].text`)
      }
      break
    case 'mnemonic':
      assertString(value.title, `block ${value.id}.title`)
      assertString(value.content, `block ${value.id}.content`)
      break
    case 'examBox':
      assertString(value.content, `block ${value.id}.content`)
      break
    case 'image':
      assertOptionalString(value.sourceAssetId, `block ${value.id}.sourceAssetId`)
      assertOptionalString(value.caption, `block ${value.id}.caption`)
      break
  }
}

function validateDocument(value: unknown): asserts value is StudyDocument {
  if (!isRecord(value)) throw new AppError('AI response is invalid: document is missing.')
  assertString(value.id, 'document.id')
  assertString(value.studyMaterialId, 'document.studyMaterialId')
  assertString(value.title, 'document.title')
  if (!Array.isArray(value.sections) || value.sections.length === 0) {
    throw new AppError('AI response is invalid: document.sections must contain at least one section.')
  }

  for (const [index, section] of value.sections.entries()) {
    if (!isRecord(section) || typeof section.id !== 'string' || !Array.isArray(section.blocks)) {
      throw new AppError(`AI response is invalid: section ${index + 1} is malformed.`)
    }
    for (const block of section.blocks) validateBlock(block)
  }

  if (typeof value.createdAt !== 'number' || typeof value.updatedAt !== 'number') {
    throw new AppError('AI response is invalid: document timestamps are missing.')
  }
}

function validateQuestions(value: unknown): AIQuestion[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new AppError('AI response is invalid: questions must be an array.')

  return value.map((question, index) => {
    if (!isRecord(question)) throw new AppError(`AI response is invalid: question ${index + 1} is malformed.`)
    assertString(question.id, `questions[${index}].id`)
    assertString(question.type, `questions[${index}].type`)
    assertString(question.question, `questions[${index}].question`)
    if (question.type !== 'mcq' && question.type !== 'shortAnswer') {
      throw new AppError(`AI response is invalid: question ${index + 1} has an unsupported type.`)
    }
    if (question.options !== undefined) {
      if (!Array.isArray(question.options)) throw new AppError(`AI response is invalid: question ${index + 1} options must be an array.`)
      for (const [optionIndex, option] of question.options.entries()) {
        if (!isRecord(option)) throw new AppError(`AI response is invalid: question ${index + 1} option ${optionIndex + 1} is malformed.`)
        assertString(option.id, `questions[${index}].options[${optionIndex}].id`)
        assertString(option.text, `questions[${index}].options[${optionIndex}].text`)
      }
    }
    assertOptionalString(question.answer, `questions[${index}].answer`)
    assertOptionalString(question.explanation, `questions[${index}].explanation`)
    return question as unknown as AIQuestion
  })
}

export function validateAIGenerationResponse(value: unknown): ValidatedAIGenerationResult {
  if (!isRecord(value)) throw new AppError('AI response is not valid JSON.')
  if (value.schemaVersion !== 1) throw new AppError('AI response uses an unsupported schema version.')
  validateDocument(value.document)
  assertString(value.provider, 'provider')
  if (!providers.has(value.provider as AIProvider)) throw new AppError('AI response contains an unsupported provider.')

  const questions = validateQuestions(value.questions)
  const response = value as unknown as AIGenerationResponse
  return {
    document: response.document,
    questions,
    provider: response.provider,
    model: typeof value.model === 'string' ? value.model : undefined
  }
}
