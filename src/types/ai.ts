import type { Block, StudyDocument } from '@/types/document'

/** AI providers are selected by the backend; no provider SDK or secret belongs in the app. */
export type AIProvider = 'gemini' | 'openai' | 'claude' | 'local'

/** Generation modes exposed in Phase 3. All modes return structured Rubisco content. */
export type AIGenerationMode =
  | 'notes'
  | 'summary'
  | 'qa'
  | 'mnemonics'
  | 'mcqs'
  | 'revision'

export interface AIServiceConfig {
  provider: AIProvider
  endpoint: string
}

export interface AIGenerationRequest {
  provider: AIProvider
  mode: AIGenerationMode
  title: string
  subject?: string
  topic?: string
  sourceType: 'pdf' | 'image' | 'text'
  sourceText?: string
  sourceFileName?: string
  instruction: string
}

export interface AIQuestionOption {
  id: string
  text: string
}

export interface AIQuestion {
  id: string
  type: 'mcq' | 'shortAnswer'
  question: string
  options?: AIQuestionOption[]
  answer?: string
  explanation?: string
}

export interface AIGenerationResponse {
  schemaVersion: 1
  document: StudyDocument
  questions?: AIQuestion[]
  provider: AIProvider
  model?: string
}

export interface ValidatedAIGenerationResult {
  document: StudyDocument
  questions: AIQuestion[]
  provider: AIProvider
  model?: string
}

export interface GeneratedBlockStats {
  total: number
  headings: number
  paragraphs: number
  tables: number
  flowcharts: number
  mnemonics: number
  examBoxes: number
  images: number
}

export function getGeneratedBlockStats(blocks: Block[]): GeneratedBlockStats {
  return blocks.reduce<GeneratedBlockStats>(
    (stats, block) => {
      stats.total += 1
      if (block.type === 'heading' || block.type === 'subheading') stats.headings += 1
      if (block.type === 'paragraph' || block.type === 'bulletList' || block.type === 'numberedList') stats.paragraphs += 1
      if (block.type === 'table') stats.tables += 1
      if (block.type === 'flowchart') stats.flowcharts += 1
      if (block.type === 'mnemonic') stats.mnemonics += 1
      if (block.type === 'examBox') stats.examBoxes += 1
      if (block.type === 'image') stats.images += 1
      return stats
    },
    { total: 0, headings: 0, paragraphs: 0, tables: 0, flowcharts: 0, mnemonics: 0, examBoxes: 0, images: 0 }
  )
}
