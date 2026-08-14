import { FileText, Image as ImageIcon, Type, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { FileDropzone } from '@/components/FileDropzone'
import { PageHeader } from '@/components/PageHeader'
import { createStudyMaterial } from '@/db/studyMaterials'
import { toFriendlyMessage } from '@/lib/errors'
import { useToast } from '@/hooks/useToast'
import type { SourceType } from '@/types/studyMaterial'

const methods: { type: SourceType; label: string; icon: typeof FileText; hint: string }[] = [
  { type: 'pdf', label: 'PDF', icon: FileText, hint: 'Import a textbook chapter or notes file' },
  { type: 'image', label: 'Images', icon: ImageIcon, hint: 'Import a scanned page or photo' },
  { type: 'text', label: 'Text', icon: Type, hint: 'Paste or type source material directly' }
]

/** A single selected image row, with a thumbnail preview and a remove button. */
function SelectedImageRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink/10 bg-white p-2.5 dark:border-paper/10 dark:bg-white/[0.03]">
      <img
        src={url}
        alt=""
        className="h-12 w-12 shrink-0 rounded-md object-cover"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-ink dark:text-paper">{file.name}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="shrink-0 rounded-lg p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600 dark:text-paper/40 dark:hover:bg-red-500/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Create() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [sourceType, setSourceType] = useState<SourceType>('text')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maybeAutoTitle = (fileName: string) => {
    if (!title.trim()) {
      setTitle(fileName.replace(/\.[^/.]+$/, ''))
    }
  }

  const handlePdfSelected = (files: File[]) => {
    const selected = files[0]
    if (!selected) return
    setPdfFile(selected)
    maybeAutoTitle(selected.name)
  }

  const handleImagesSelected = (files: File[]) => {
    if (files.length === 0) return
    setImageFiles((prev) => [...prev, ...files])
    maybeAutoTitle(files[0].name)
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const canSave =
    title.trim().length > 0 &&
    (sourceType === 'text'
      ? sourceText.trim().length > 0
      : sourceType === 'pdf'
        ? pdfFile !== null
        : imageFiles.length > 0)

  const handleSave = async () => {
    setError(null)
    if (!canSave) {
      setError(
        sourceType === 'text'
          ? 'Add a title and some source text before saving.'
          : sourceType === 'pdf'
            ? 'Add a title and select a PDF before saving.'
            : 'Add a title and select at least one image before saving.'
      )
      return
    }

    setIsSaving(true)
    try {
      await createStudyMaterial({
        title,
        subject,
        topic,
        sourceType,
        sourceText: sourceType === 'text' ? sourceText : undefined,
        sourceFileName: sourceType === 'pdf' ? pdfFile?.name : undefined,
        sourceMimeType: sourceType === 'pdf' ? pdfFile?.type : undefined,
        sourceFileData: sourceType === 'pdf' ? (pdfFile ?? undefined) : undefined,
        sourceImages: sourceType === 'image' ? imageFiles : undefined
      })
      showToast('Study material saved', 'success')
      navigate('/library')
    } catch (err) {
      setError(toFriendlyMessage(err, 'Could not save this material. Try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Create Study Material"
        subtitle="Start with your textbook, notes or source material."
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {methods.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => {
              setSourceType(type)
              setError(null)
            }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors sm:p-5 ${
              sourceType === type
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-ink/10 bg-white hover:border-ink/20 dark:border-paper/10 dark:bg-white/[0.03]'
            }`}
          >
            <Icon
              className={`h-5 w-5 ${sourceType === type ? 'text-brand-600' : 'text-ink/50 dark:text-paper/50'}`}
              strokeWidth={1.75}
            />
            <span
              className={`text-sm font-medium ${sourceType === type ? 'text-brand-700 dark:text-brand-300' : 'text-ink dark:text-paper'}`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {sourceType === 'text' && (
          <div>
            <label htmlFor="source-text" className="mb-1.5 block text-sm font-medium text-ink dark:text-paper">
              Source text
            </label>
            <textarea
              id="source-text"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={8}
              placeholder="Paste or type your source material here…"
              className="w-full rounded-lg border border-ink/15 bg-white p-3.5 text-sm text-ink placeholder:text-ink/40 focus:border-brand-500 dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper dark:placeholder:text-paper/40"
            />
          </div>
        )}

        {sourceType === 'pdf' && (
          <div>
            <FileDropzone
              accept="application/pdf"
              label="Select a PDF file"
              hint="Tap to browse, or drag and drop"
              onFilesSelected={handlePdfSelected}
            />
            {pdfFile && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-ink/10 bg-white p-2.5 dark:border-paper/10 dark:bg-white/[0.03]">
                <FileText className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink dark:text-paper">
                  {pdfFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  aria-label="Remove selected PDF"
                  className="shrink-0 rounded-lg p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600 dark:text-paper/40 dark:hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {sourceType === 'image' && (
          <div>
            <FileDropzone
              accept="image/*"
              label="Select image files"
              hint="Tap to browse, or drag and drop — you can select more than one"
              multiple
              onFilesSelected={handleImagesSelected}
            />
            {imageFiles.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-ink/50 dark:text-paper/50">
                  {imageFiles.length} {imageFiles.length === 1 ? 'image' : 'images'} selected
                </p>
                <div className="flex flex-col gap-2">
                  {imageFiles.map((file, index) => (
                    <SelectedImageRow
                      key={`${file.name}-${file.lastModified}-${index}`}
                      file={file}
                      onRemove={() => removeImage(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-ink dark:text-paper">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pulmonary Oedema — Pathology"
            className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3.5 text-sm text-ink placeholder:text-ink/40 focus:border-brand-500 dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper dark:placeholder:text-paper/40"
          />
        </div>
        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-ink dark:text-paper">
            Subject <span className="font-normal text-ink/40 dark:text-paper/40">(optional)</span>
          </label>
          <input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Pathology"
            className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3.5 text-sm text-ink placeholder:text-ink/40 focus:border-brand-500 dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper dark:placeholder:text-paper/40"
          />
        </div>
        <div>
          <label htmlFor="topic" className="mb-1.5 block text-sm font-medium text-ink dark:text-paper">
            Topic <span className="font-normal text-ink/40 dark:text-paper/40">(optional)</span>
          </label>
          <input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Cardiovascular Pathology"
            className="h-11 w-full rounded-lg border border-ink/15 bg-white px-3.5 text-sm text-ink placeholder:text-ink/40 focus:border-brand-500 dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper dark:placeholder:text-paper/40"
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save Material'}
        </Button>
      </div>
    </div>
  )
}
