import { TextEditable } from '../TextEditable'
import type { HeadingBlock, SubheadingBlock, TextRun, TextSize } from '@/types/document'

interface Props {
  block: HeadingBlock | SubheadingBlock
  historyVersion: number
  onChange: (updater: (b: HeadingBlock | SubheadingBlock) => HeadingBlock | SubheadingBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

const HEADING_SIZE_CLASS: Record<TextSize, string> = {
  sm: 'text-lg sm:text-xl',
  base: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-3xl'
}

const SUBHEADING_SIZE_CLASS: Record<TextSize, string> = {
  sm: 'text-base',
  base: 'text-lg',
  lg: 'text-xl'
}

export function HeadingBlockEditor({ block, historyVersion, onChange, onFocusBlock, onBlurBlock }: Props) {
  const isHeading = block.type === 'heading'
  const sizeClass = (isHeading ? HEADING_SIZE_CLASS : SUBHEADING_SIZE_CLASS)[block.size ?? 'base']

  const handleRuns = (runs: TextRun[]) => {
    onChange((b) => ({ ...b, runs }))
  }

  return (
    <div
      className={
        isHeading
          ? 'rounded-md border-2 border-brand-600 bg-white px-3 py-2 dark:bg-ink'
          : 'border-l-4 border-brand-500 bg-brand-50/40 px-3 py-1.5 dark:bg-brand-500/10'
      }
    >
      <TextEditable
        editId={block.id}
        tag={isHeading ? 'h2' : 'h3'}
        runs={block.runs}
        align={block.align}
        onChangeRuns={handleRuns}
        onFocusEditable={onFocusBlock}
        onBlurEditable={onBlurBlock}
        historyVersion={historyVersion}
        placeholder={isHeading ? 'Heading' : 'Subheading'}
        className={`font-serif font-semibold text-brand-700 dark:text-brand-300 ${sizeClass}`}
      />
    </div>
  )
}
