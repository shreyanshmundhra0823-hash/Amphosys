import { AppError } from '@/lib/errors'
import { validateAIGenerationResponse } from '@/lib/aiValidation'
import type {
  AIGenerationMode,
  AIGenerationRequest,
  AIProvider,
  AIServiceConfig,
  ValidatedAIGenerationResult
} from '@/types/ai'

const CONFIG_KEY = 'rubisco.ai.config.v1'
const DEFAULT_ENDPOINT = '/api/ai/generate'
const DEFAULT_PROVIDER: AIProvider = 'gemini'

export const aiGenerationModes: { value: AIGenerationMode; label: string; description: string }[] = [
  { value: 'notes', label: 'Study notes', description: 'Convert the source into structured, exam-oriented notes.' },
  { value: 'summary', label: 'Summary', description: 'Create a concise structured summary.' },
  { value: 'qa', label: 'Question & answer', description: 'Create structured recall questions with answers.' },
  { value: 'mnemonics', label: 'Mnemonics', description: 'Extract and create useful medical mnemonics.' },
  { value: 'mcqs', label: 'MCQs', description: 'Generate clinically relevant multiple-choice questions.' },
  { value: 'revision', label: 'Revision material', description: 'Create high-yield revision content from the source.' }
]

export function getAIServiceConfig(): AIServiceConfig {
  if (typeof window === 'undefined') return { provider: DEFAULT_PROVIDER, endpoint: DEFAULT_ENDPOINT }
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY)
    if (!raw) return { provider: DEFAULT_PROVIDER, endpoint: DEFAULT_ENDPOINT }
    const parsed = JSON.parse(raw) as Partial<AIServiceConfig>
    const provider = parsed.provider
    const endpoint = parsed.endpoint
    if (!provider || !['gemini', 'openai', 'claude', 'local'].includes(provider)) {
      return { provider: DEFAULT_PROVIDER, endpoint: DEFAULT_ENDPOINT }
    }
    if (!endpoint || typeof endpoint !== 'string') return { provider, endpoint: DEFAULT_ENDPOINT }
    return { provider, endpoint }
  } catch {
    return { provider: DEFAULT_PROVIDER, endpoint: DEFAULT_ENDPOINT }
  }
}

export function saveAIServiceConfig(config: AIServiceConfig): void {
  if (typeof window === 'undefined') return
  const endpoint = config.endpoint.trim()
  if (!endpoint) throw new AppError('AI endpoint cannot be empty.')
  try {
    new URL(endpoint, window.location.origin)
  } catch {
    throw new AppError('AI endpoint is not a valid URL or path.')
  }
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...config, endpoint }))
}

function buildInstruction(mode: AIGenerationMode): string {
  const common = [
    'You are the Rubisco Medical Library study-content engine.',
    'Use only information supported by the supplied source; clearly avoid inventing facts.',
    'Preserve important medical terminology, mechanisms, classifications, diagnostic criteria, treatment details, exceptions and high-yield distinctions when present.',
    'Return structured Rubisco document data, never HTML, Markdown, or a flattened PDF.',
    'Use the available block types intelligently: headings, subheadings, paragraphs, lists, tables, flowcharts, mnemonics, exam boxes and images when appropriate.',
    'Do not add unnecessary numbering to major headings.',
    'Keep the result readable and exam-oriented for an MBBS student.'
  ]

  const modeInstruction: Record<AIGenerationMode, string> = {
    notes: 'Produce comprehensive structured study notes. Cover the source faithfully and organize it in a logical teaching sequence.',
    summary: 'Produce a concise but information-dense structured summary. Prioritize the most important concepts and relationships.',
    qa: 'Produce question-and-answer revision material. Put the questions and answers into the structured content and also return machine-readable questions.',
    mnemonics: 'Identify useful existing mnemonics from the source and create additional medically sensible mnemonics only where they genuinely improve recall.',
    mcqs: 'Produce clinically and exam-relevant MCQs. Return machine-readable MCQs with options, correct answers and explanations, while also creating a structured document overview.',
    revision: 'Produce high-yield revision material emphasizing definitions, classifications, mechanisms, differences, key values, complications, investigations and management points when present.'
  }

  return [...common, modeInstruction[mode]].join('\n')
}

export interface GenerateStudyMaterialInput {
  request: Omit<AIGenerationRequest, 'provider' | 'instruction'>
  files?: Blob[]
  provider?: AIProvider
  endpoint?: string
}

/**
 * Provider-agnostic AI boundary. The browser sends source material to a backend
 * endpoint; provider SDKs and API keys must remain server-side. The response is
 * validated before it is allowed into the editable Rubisco document model.
 */
export async function generateStudyMaterial(input: GenerateStudyMaterialInput): Promise<ValidatedAIGenerationResult> {
  const config = getAIServiceConfig()
  const provider = input.provider ?? config.provider
  const endpoint = input.endpoint?.trim() || config.endpoint

  if (!endpoint) throw new AppError('Configure an AI endpoint in Settings before generating content.')

  const payload: AIGenerationRequest = {
    ...input.request,
    provider,
    instruction: buildInstruction(input.request.mode)
  }

  const form = new FormData()
  form.append('request', JSON.stringify(payload))
  for (const file of input.files ?? []) form.append('sourceFiles', file, file instanceof File ? file.name : 'source-file')

  let response: Response
  try {
    response = await fetch(endpoint, { method: 'POST', body: form })
  } catch (error) {
    throw new AppError('Could not reach the AI service. Check your internet connection and AI endpoint.', error)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    const suffix = detail ? ` ${detail.slice(0, 180)}` : ''
    throw new AppError(`AI service returned ${response.status}.${suffix}`)
  }

  let json: unknown
  try {
    json = await response.json()
  } catch (error) {
    throw new AppError('AI service returned invalid JSON.', error)
  }

  return validateAIGenerationResponse(json)
}
