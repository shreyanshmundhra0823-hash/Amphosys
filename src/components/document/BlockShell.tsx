import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

interface BlockShellProps {
  label: string
  blockType: string
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onDelete: () => void
  children: ReactNode
}

/**
 * Shared per-block chrome: a small type label and move/duplicate/delete
 * controls, visible on hover/focus-within so the block content itself stays
 * uncluttered. `break-inside: avoid` (via .document-block) keeps a block
 * from being split awkwardly across the two-column layout.
 */
export function BlockShell({
  label,
  blockType,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  children
}: BlockShellProps) {
  return (
    <div data-block-type={blockType}
      className="document-block group relative rounded-lg p-2 outline outline-1 outline-transparent transition-colors hover:outline-ink/10 focus-within:outline-brand-300 dark:hover:outline-paper/10">
      <div className="mb-1 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/35 dark:text-paper/35">
          {label}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Move block up"
            disabled={isFirst}
            onClick={onMoveUp}
            className="flex h-6 w-6 items-center justify-center rounded text-ink/40 hover:bg-ink/5 disabled:opacity-30 dark:text-paper/40 dark:hover:bg-paper/10"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Move block down"
            disabled={isLast}
            onClick={onMoveDown}
            className="flex h-6 w-6 items-center justify-center rounded text-ink/40 hover:bg-ink/5 disabled:opacity-30 dark:text-paper/40 dark:hover:bg-paper/10"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Duplicate block"
            onClick={onDuplicate}
            className="flex h-6 w-6 items-center justify-center rounded text-ink/40 hover:bg-ink/5 dark:text-paper/40 dark:hover:bg-paper/10"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete block"
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded text-ink/40 hover:bg-red-50 hover:text-red-600 dark:text-paper/40 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}
