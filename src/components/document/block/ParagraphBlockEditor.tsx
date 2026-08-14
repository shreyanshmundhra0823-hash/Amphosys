import { TextEditable } from '../TextEditable'
import type { ParagraphBlock, TextRun } from '@/types/document'

interface Props {
  block: ParagraphBlock
  historyVersion: number
  onChange: (updater: (b: ParagraphBlock) => ParagraphBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

export function ParagraphBlockEditor({ block, historyVersion, onChange, onFocusBlock, onBlurBlock }: Props) {
  const handleRuns = (runs: TextRun[]) => onChange((b) => ({ ...b, runs }))

  return (
    <TextEditable
      editId={block.id}
      runs={block.runs}
      align={block.align}
      size={block.size}
      onChangeRuns={handleRuns}
      onFocusEditable={onFocusBlock}
      onBlurEditable={onBlurBlock}
      historyVersion={historyVersion}
      placeholder="Write a paragraph…"
      className="leading-relaxed text-ink/85 dark:text-paper/85"
    />
  )
}
