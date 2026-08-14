import { Plus, X } from 'lucide-react'
import { TextEditable } from '../TextEditable'
import type { BulletListBlock, NumberedListBlock, TextRun } from '@/types/document'

interface Props {
  block: BulletListBlock | NumberedListBlock
  historyVersion: number
  onChange: (updater: (b: BulletListBlock | NumberedListBlock) => BulletListBlock | NumberedListBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

export function ListBlockEditor({ block, historyVersion, onChange, onFocusBlock, onBlurBlock }: Props) {
  const ordered = block.type === 'numberedList'

  const setItemRuns = (index: number, runs: TextRun[]) => {
    onChange((b) => ({ ...b, items: b.items.map((it, i) => (i === index ? runs : it)) }))
  }

  const addItem = () => {
    onFocusBlock()
    onChange((b) => ({ ...b, items: [...b.items, []] }))
    onBlurBlock()
  }

  const removeItem = (index: number) => {
    onFocusBlock()
    onChange((b) => ({ ...b, items: b.items.filter((_, i) => i !== index) }))
    onBlurBlock()
  }

  return (
    <div className="flex flex-col gap-1.5">
      {block.items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-sm text-ink/40 dark:text-paper/40">
            {ordered ? `${index + 1}.` : '•'}
          </span>
          <TextEditable
            editId={`${block.id}:item:${index}`}
            runs={item}
            onChangeRuns={(runs) => setItemRuns(index, runs)}
            onFocusEditable={onFocusBlock}
            onBlurEditable={onBlurBlock}
            historyVersion={historyVersion}
            placeholder="List item"
            className="flex-1 text-sm leading-relaxed text-ink/85 dark:text-paper/85"
          />
          {block.items.length > 1 && (
            <button
              type="button"
              aria-label="Remove item"
              onClick={() => removeItem(index)}
              className="mt-0.5 shrink-0 text-ink/30 hover:text-red-600 dark:text-paper/30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="mt-1 flex w-fit items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        <Plus className="h-3.5 w-3.5" /> Add item
      </button>
    </div>
  )
}
