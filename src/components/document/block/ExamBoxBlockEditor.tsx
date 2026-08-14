import type { ChangeEvent } from 'react'
import type { ExamBoxBlock } from '@/types/document'

interface Props {
  block: ExamBoxBlock
  onChange: (updater: (b: ExamBoxBlock) => ExamBoxBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

export function ExamBoxBlockEditor({ block, onChange, onFocusBlock, onBlurBlock }: Props) {
  const handleContent = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value
    onChange((b) => ({ ...b, content }))
  }

  return (
    <div className="rounded-lg border-2 border-brand-600 p-3.5">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
        Exam / High-yield
      </p>
      <textarea
        value={block.content}
        onFocus={onFocusBlock}
        onBlur={onBlurBlock}
        onChange={handleContent}
        rows={2}
        placeholder="Exam-relevant point…"
        className="w-full resize-none bg-transparent text-sm font-medium leading-relaxed text-ink outline-none placeholder:text-ink/30 dark:text-paper dark:placeholder:text-paper/30"
      />
    </div>
  )
}
