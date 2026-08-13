/**
 * Provider-agnostic AI service abstraction.
 *
 * NOT implemented in Phase 1. Nothing in the UI calls this yet — it exists
 * so Phase 2+ can plug in a real provider (Gemini, OpenAI, Claude, a local
 * model) behind one call site, without React components ever importing a
 * provider SDK or holding an API key. API keys must never live in frontend
 * code; a real implementation will call a backend endpoint that holds them.
 */

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'local'

export interface GenerateStudyMaterialOptions {
  provider: AIProvider
  /** e.g. flowchart-first notes, MCQ generation, mnemonic pass */
  mode?: 'notes' | 'questions' | 'flashcards'
}

export interface GenerateStudyMaterialInput {
  sourceText?: string
  sourceFileName?: string
}

/**
 * Intentionally unimplemented. Calling this in Phase 1 throws, so nothing
 * in the UI can silently pretend to generate AI content.
 */
export async function generateStudyMaterial(
  _input: GenerateStudyMaterialInput,
  _options: GenerateStudyMaterialOptions
): Promise<never> {
  throw new Error(
    'AI generation is not available yet. This provider will be configured in a later phase.'
  )
}
