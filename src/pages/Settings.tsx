import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Modal } from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { clearLibrary, estimateStorageUsage } from '@/db/studyMaterials'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { formatBytes } from '@/lib/format'
import { toFriendlyMessage } from '@/lib/errors'
import { getAIServiceConfig, saveAIServiceConfig } from '@/services/aiService'
import type { AIProvider } from '@/types/ai'

const APP_VERSION = '0.1.0'

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

function SectionCard({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50 dark:text-paper/50">
        {title}
      </h2>
      {children}
    </Card>
  )
}

export function Settings() {
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const initialAIConfig = getAIServiceConfig()
  const [aiProvider, setAIProvider] = useState<AIProvider>(initialAIConfig.provider)
  const [aiEndpoint, setAIEndpoint] = useState(initialAIConfig.endpoint)
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    estimateStorageUsage().then(setStorage)
  }, [])

  const handleClearLibrary = async () => {
    setIsClearing(true)
    try {
      await clearLibrary()
      showToast('Local library cleared', 'success')
      setConfirmClearOpen(false)
    } catch (error) {
      showToast(toFriendlyMessage(error, 'Could not clear your library.'), 'error')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="flex flex-col gap-5">
        <SectionCard title="Appearance">
          <p className="mb-3 text-sm text-ink/70 dark:text-paper/70">Theme</p>
          <div className="inline-flex rounded-lg border border-ink/15 p-1 dark:border-paper/15">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  theme === opt.value
                    ? 'bg-brand-600 text-paper'
                    : 'text-ink/60 hover:text-ink dark:text-paper/60 dark:hover:text-paper'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Library">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/70 dark:text-paper/70">Local storage used</span>
            <span className="font-medium text-ink dark:text-paper">
              {storage ? `${formatBytes(storage.usage)} of ${formatBytes(storage.quota)}` : '—'}
            </span>
          </div>
          <div className="mt-4 border-t border-ink/10 pt-4 dark:border-paper/10">
            <Button variant="danger" onClick={() => setConfirmClearOpen(true)}>
              Clear local library
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="AI">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ai-provider" className="mb-1.5 block text-sm font-medium text-ink dark:text-paper">
                Provider
              </label>
              <select
                id="ai-provider"
                value={aiProvider}
                onChange={(event) => setAIProvider(event.target.value as AIProvider)}
                className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3.5 text-sm text-ink dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper"
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
                <option value="local">Local model</option>
              </select>
            </div>
            <div>
              <label htmlFor="ai-endpoint" className="mb-1.5 block text-sm font-medium text-ink dark:text-paper">
                Backend endpoint
              </label>
              <input
                id="ai-endpoint"
                value={aiEndpoint}
                onChange={(event) => setAIEndpoint(event.target.value)}
                placeholder="/api/ai/generate"
                className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3.5 text-sm text-ink placeholder:text-ink/40 dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                try {
                  saveAIServiceConfig({ provider: aiProvider, endpoint: aiEndpoint })
                  showToast('AI settings saved', 'success')
                } catch (error) {
                  showToast(toFriendlyMessage(error, 'Could not save AI settings.'), 'error')
                }
              }}
            >
              Save AI settings
            </Button>
            <p className="text-xs text-ink/50 dark:text-paper/50">API keys are never stored in the frontend.</p>
          </div>
        </SectionCard>

        <SectionCard title="About">
          <p className="text-sm font-medium text-ink dark:text-paper">Rubisco Medical Library</p>
          <p className="mt-0.5 text-sm text-ink/50 dark:text-paper/50">Version {APP_VERSION}</p>
        </SectionCard>
      </div>

      <Modal
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear local library?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmClearOpen(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleClearLibrary} disabled={isClearing}>
              {isClearing ? 'Clearing…' : 'Clear everything'}
            </Button>
          </>
        }
      >
        <p>
          This permanently deletes every study material stored on this device. This can't be
          undone, and there is no cloud backup yet.
        </p>
      </Modal>
    </div>
  )
}
