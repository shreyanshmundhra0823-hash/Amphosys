import type { ChangeEvent } from 'react'
import type { MnemonicBlock } from '@/types/document'

interface Props {
  block: MnemonicBlock
  onChange: (updater: (b: MnemonicBlock) => MnemonicBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

export function MnemonicBlockEditor({ block, onChange, onFocusBlock, onBlurBlock }: Props) {
  const handleTitle = (e: ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    onChange((b) => ({ ...b, title }))
  }
  const handleContent = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value
    onChange((b) => ({ ...b, content }))
  }

  return (
    <div className="rounded-lg border-l-4 border-brand-500 bg-brand-50/60 p-3.5 dark:bg-brand-500/10">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
        Mnemonic
      </p>
      <input
        value={block.title}
        onFocus={onFocusBlock}
        onBlur={onBlurBlock}
        onChange={handleTitle}
        placeholder="Mnemonic title"
        className="mb-1.5 w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-ink/30 dark:text-paper dark:placeholder:text-paper/30"
      />
      <textarea
        value={block.content}
        onFocus={onFocusBlock}
        onBlur={onBlurBlock}
        onChange={handleContent}
        rows={2}
        placeholder="e.g. one line per letter…"
        className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink/80 outline-none placeholder:text-ink/30 dark:text-paper/80 dark:placeholder:text-paper/30"
      />
    </div>
  )
}
