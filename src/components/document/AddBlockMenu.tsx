import {
  Heading1,
  Heading2,
  Image as ImageIcon,
  List,
  ListOrdered,
  Table as TableIcon,
  Type,
  Workflow,
  type LucideIcon
} from 'lucide-react'
import { blockTypeLabels } from '@/lib/documentBlocks'
import type { BlockType } from '@/types/document'

const icons: Record<BlockType, LucideIcon> = {
  heading: Heading1,
  subheading: Heading2,
  paragraph: Type,
  bulletList: List,
  numberedList: ListOrdered,
  table: TableIcon,
  flowchart: Workflow,
  mnemonic: Type,
  examBox: Type,
  image: ImageIcon
}

const order: BlockType[] = [
  'heading',
  'subheading',
  'paragraph',
  'bulletList',
  'numberedList',
  'table',
  'flowchart',
  'mnemonic',
  'examBox',
  'image'
]

export function AddBlockMenu({ onAdd }: { onAdd: (type: BlockType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-dashed border-ink/15 p-3 dark:border-paper/15 sm:grid-cols-5">
      {order.map((type) => {
        const Icon = icons[type]
        return (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-center hover:bg-ink/5 dark:hover:bg-paper/5"
          >
            <Icon className="h-4 w-4 text-ink/50 dark:text-paper/50" strokeWidth={1.75} />
            <span className="text-[11px] font-medium text-ink/70 dark:text-paper/70">
              {blockTypeLabels[type]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
