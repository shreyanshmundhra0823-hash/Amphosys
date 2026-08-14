import { TextEditable } from '../TextEditable'
import type { HeadingBlock, SubheadingBlock, TextRun } from '@/types/document'

interface Props {
  block: HeadingBlock | SubheadingBlock
  historyVersion: number
  onChange: (updater: (b: HeadingBlock | SubheadingBlock) => HeadingBlock | SubheadingBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

export function HeadingBlockEditor({ block, historyVersion, onChange, onFocusBlock, onBlurBlock }: Props) {
  const isHeading = block.type === 'heading'

  const handleRuns = (runs: TextRun[]) => {
    onChange((b) => ({ ...b, runs }))
  }

  return (
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
      className={
        isHeading
          ? 'font-serif text-xl font-semibold text-ink dark:text-paper sm:text-2xl'
          : 'font-serif text-lg font-semibold text-ink/90 dark:text-paper/90'
      }
    />
  )
}
