import { ImageOff } from 'lucide-react'
import { useEffect, useState, type ChangeEvent } from 'react'
import { getSourceAssets } from '@/db/sourceAssets'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import type { SourceAsset } from '@/types/sourceAsset'
import type { ImageBlock } from '@/types/document'

interface Props {
  block: ImageBlock
  studyMaterialId: string
  onChange: (updater: (b: ImageBlock) => ImageBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

/**
 * Images are picked from this material's already-imported SourceAssets
 * (Phase 1) rather than uploaded fresh, so the document never duplicates
 * image bytes — it just stores the asset's ID.
 */
export function ImageBlockEditor({ block, studyMaterialId, onChange, onFocusBlock, onBlurBlock }: Props) {
  const [assets, setAssets] = useState<SourceAsset[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSourceAssets(studyMaterialId).then((found) => {
      setAssets(found)
      setLoaded(true)
    })
  }, [studyMaterialId])

  const selected = assets.find((a) => a.id === block.sourceAssetId)
  const selectedUrl = useObjectUrl(selected?.data)

  const handleCaption = (e: ChangeEvent<HTMLInputElement>) => {
    const caption = e.target.value
    onChange((b) => ({ ...b, caption }))
  }

  return (
    <div>
      {selected && selectedUrl ? (
        <figure>
          <img
            src={selectedUrl}
            alt={selected.fileName}
            className="w-full rounded-lg border border-ink/10 object-contain dark:border-paper/10"
          />
          <input
            value={block.caption ?? ''}
            onFocus={onFocusBlock}
            onBlur={onBlurBlock}
            onChange={handleCaption}
            placeholder="Caption (optional)"
            className="mt-1.5 w-full bg-transparent text-center text-xs text-ink/50 outline-none placeholder:text-ink/30 dark:text-paper/50 dark:placeholder:text-paper/30"
          />
        </figure>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink/15 py-8 text-center dark:border-paper/15">
          <ImageOff className="h-5 w-5 text-ink/30 dark:text-paper/30" strokeWidth={1.75} />
          <p className="text-xs text-ink/50 dark:text-paper/50">No image selected</p>
        </div>
      )}

      {loaded && assets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {assets.map((asset) => (
            <AssetThumb
              key={asset.id}
              asset={asset}
              isSelected={asset.id === block.sourceAssetId}
              onSelect={() => {
                onFocusBlock()
                onChange((b) => ({ ...b, sourceAssetId: asset.id }))
                onBlurBlock()
              }}
            />
          ))}
        </div>
      )}

      {loaded && assets.length === 0 && (
        <p className="mt-2 text-xs text-ink/40 dark:text-paper/40">
          This material has no imported images to reference. Import images for it under Create,
          or use this block on an image-sourced material.
        </p>
      )}
    </div>
  )
}

function AssetThumb({
  asset,
  isSelected,
  onSelect
}: {
  asset: SourceAsset
  isSelected: boolean
  onSelect: () => void
}) {
  const url = useObjectUrl(asset.data)
  if (!url) return null
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${
        isSelected ? 'border-brand-600' : 'border-transparent'
      }`}
    >
      <img src={url} alt={asset.fileName} className="h-full w-full object-cover" />
    </button>
  )
}
