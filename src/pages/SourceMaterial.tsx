import { FileText, FileWarning } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/Card'
import { GenerationPanel } from '@/components/ai/GenerationPanel'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { getSourceAssets } from '@/db/sourceAssets'
import { getStudyMaterial, touchLastOpened } from '@/db/studyMaterials'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { formatDate } from '@/lib/format'
import type { SourceAsset } from '@/types/sourceAsset'
import type { StudyMaterial } from '@/types/studyMaterial'

function StoredImage({ asset }: { asset: SourceAsset }) {
  const url = useObjectUrl(asset.data)
  if (!url) return null
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 dark:border-paper/10">
      <img src={url} alt={asset.fileName} className="w-full" />
      <p className="truncate border-t border-ink/10 bg-white px-3 py-2 text-xs text-ink/50 dark:border-paper/10 dark:bg-white/[0.03] dark:text-paper/50">
        {asset.fileName}
      </p>
    </div>
  )
}

type LoadStatus = 'loading' | 'found' | 'not-found'

export function SourceMaterial() {
  const { id } = useParams<{ id: string }>()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [material, setMaterial] = useState<StudyMaterial | null>(null)
  const [images, setImages] = useState<SourceAsset[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setMaterial(null)
      setImages([])

      if (!id) {
        setStatus('not-found')
        return
      }

      const found = await getStudyMaterial(id)
      if (cancelled) return

      if (!found) {
        setStatus('not-found')
        return
      }

      setMaterial(found)
      touchLastOpened(id)

      if (found.sourceType === 'image') {
        const assets = await getSourceAssets(id)
        if (!cancelled) setImages(assets)
      }

      if (!cancelled) setStatus('found')
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const pdfUrl = useObjectUrl(
    material?.sourceType === 'pdf' ? material.sourceFileData ?? null : null
  )

  if (status === 'loading') {
    return <LoadingState label="Loading source material…" />
  }

  if (status === 'not-found' || !material) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Study material not found"
        description="This item may have been deleted from your local library."
        action={
          <Link
            to="/library"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Back to Library
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={material.title}
        subtitle={[material.subject, material.topic].filter(Boolean).join(' · ') || undefined}
      />

      <Card className="mb-6 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40 dark:text-paper/40">
            Source type
          </p>
          <p className="mt-1 text-sm font-medium capitalize text-ink dark:text-paper">
            {material.sourceType}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40 dark:text-paper/40">
            Status
          </p>
          <p className="mt-1 text-sm font-medium capitalize text-ink dark:text-paper">
            {material.status}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40 dark:text-paper/40">
            Created
          </p>
          <p className="mt-1 text-sm font-medium text-ink dark:text-paper">
            {formatDate(material.createdAt)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40 dark:text-paper/40">
            Updated
          </p>
          <p className="mt-1 text-sm font-medium text-ink dark:text-paper">
            {formatDate(material.updatedAt)}
          </p>
        </div>
      </Card>

      <GenerationPanel material={material} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm dark:bg-brand-500/10">
        <div>
          <span className="font-semibold text-brand-700 dark:text-brand-300">Source Material</span>
          <span className="text-brand-700/70 dark:text-brand-300/70"> — this is the imported source, read-only.</span>
        </div>
        <Link
          to={`/document/${material.id}`}
          className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-paper hover:bg-brand-700"
        >
          Open Document Editor
        </Link>
      </div>

      {material.sourceType === 'text' && (
        <Card className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-ink dark:text-paper">
          {material.sourceText}
        </Card>
      )}

      {material.sourceType === 'pdf' &&
        (pdfUrl ? (
          <Card className="overflow-hidden p-0">
            <object data={pdfUrl} type="application/pdf" className="h-[75vh] w-full">
              <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-ink/60 dark:text-paper/60">
                <FileText className="h-6 w-6" />
                <p>Your browser can't preview PDFs inline.</p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Open {material.sourceFileName ?? 'PDF'} in a new tab
                </a>
              </div>
            </object>
          </Card>
        ) : (
          <EmptyState
            icon={FileWarning}
            title="PDF unavailable"
            description="The stored PDF file could not be loaded."
          />
        ))}

      {material.sourceType === 'image' &&
        (images.length > 0 ? (
          <div>
            <p className="mb-3 text-sm text-ink/60 dark:text-paper/60">
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </p>
            <div className="flex flex-col gap-4">
              {images.map((asset) => (
                <StoredImage key={asset.id} asset={asset} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FileWarning}
            title="No images found"
            description="No stored images were found for this material."
          />
        ))}
    </div>
  )
}
