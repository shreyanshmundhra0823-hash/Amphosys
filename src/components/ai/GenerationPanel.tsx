import { Sparkles, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { getSourceAssets } from '@/db/sourceAssets'
import { getDocumentByMaterialId, saveDocument } from '@/db/documents'
import { toFriendlyMessage } from '@/lib/errors'
import { aiGenerationModes, generateStudyMaterial, getAIServiceConfig } from '@/services/aiService'
import { getGeneratedBlockStats, type AIGenerationMode } from '@/types/ai'
import type { StudyMaterial } from '@/types/studyMaterial'

export function GenerationPanel({ material }: { material: StudyMaterial }) {
  const navigate = useNavigate()
  const config = getAIServiceConfig()
  const [mode, setMode] = useState<AIGenerationMode>('notes')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultSummary, setResultSummary] = useState<string | null>(null)

  const handleGenerate = async () => {
    setError(null)
    setResultSummary(null)
    setIsGenerating(true)

    try {
      const files: Blob[] = []
      if (material.sourceType === 'pdf' && material.sourceFileData) files.push(material.sourceFileData)
      if (material.sourceType === 'image') {
        const assets = await getSourceAssets(material.id)
        files.push(...assets.map((asset) => asset.data))
      }

      const result = await generateStudyMaterial({
        provider: config.provider,
        endpoint: config.endpoint,
        files,
        request: {
          mode,
          title: material.title,
          subject: material.subject,
          topic: material.topic,
          sourceType: material.sourceType,
          sourceText: material.sourceType === 'text' ? material.sourceText : undefined,
          sourceFileName: material.sourceFileName
        }
      })

      const existing = await getDocumentByMaterialId(material.id)
      const hasExistingContent = existing?.sections.some((section) => section.blocks.length > 0) ?? false
      if (hasExistingContent && !window.confirm('This material already has an editable document. Replace it with the newly generated content?')) {
        setResultSummary('Generation completed, but the existing document was kept unchanged.')
        return
      }

      const document = {
        ...result.document,
        id: existing?.id ?? result.document.id,
        studyMaterialId: material.id,
        updatedAt: Date.now()
      }
      await saveDocument(document)

      const blocks = document.sections.flatMap((section) => section.blocks)
      const stats = getGeneratedBlockStats(blocks)
      const questionCount = result.questions.length
      setResultSummary(
        `Generated ${stats.total} structured blocks${questionCount ? ` and ${questionCount} question${questionCount === 1 ? '' : 's'}` : ''}.`
      )
      navigate(`/document/${material.id}`)
    } catch (err) {
      setError(toFriendlyMessage(err, 'Could not generate study material.'))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="mb-6 border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/20 dark:bg-brand-500/5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-brand-600 p-2 text-paper">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-ink dark:text-paper">Generate with AI</h2>
            <p className="mt-1 text-sm text-ink/60 dark:text-paper/60">
              AI converts this source into structured Rubisco blocks. It does not generate a flattened PDF.
            </p>
          </div>
          <Link
            to="/settings"
            aria-label="AI settings"
            className="rounded-lg p-2 text-ink/50 hover:bg-white/70 hover:text-ink dark:text-paper/50 dark:hover:bg-white/10 dark:hover:text-paper"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label htmlFor="ai-generation-mode" className="mb-1.5 block text-sm font-medium text-ink dark:text-paper">
              Generation type
            </label>
            <select
              id="ai-generation-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as AIGenerationMode)}
              disabled={isGenerating}
              className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3.5 text-sm text-ink outline-none focus:border-brand-500 dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper"
            >
              {aiGenerationModes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} — {item.description}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            {isGenerating ? 'Generating…' : 'Generate'}
          </Button>
        </div>

        <p className="text-xs text-ink/50 dark:text-paper/50">
          Provider: <span className="font-medium uppercase">{config.provider}</span> · Endpoint: <span className="font-medium">{config.endpoint}</span>
        </p>

        {resultSummary && <p className="text-sm font-medium text-green-700 dark:text-green-400">{resultSummary}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Card>
  )
}
