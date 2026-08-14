import { useRef, type FocusEvent } from 'react'
import { domToRuns, runsToHtml } from '@/lib/richText'
import type { TextAlign, TextRun, TextSize } from '@/types/document'

const alignClass: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

const sizeClass: Record<TextSize, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg'
}

interface TextEditableProps {
  /** Unique across the whole document; remounts (fresh init) when this or historyVersion changes. */
  editId: string
  runs: TextRun[]
  onChangeRuns: (runs: TextRun[]) => void
  onFocusEditable: () => void
  onBlurEditable: () => void
  historyVersion: number
  placeholder?: string
  align?: TextAlign
  size?: TextSize
  className?: string
  tag?: 'div' | 'h2' | 'h3'
}

/**
 * A single rich-text editable surface backed by structured TextRun[], not
 * raw HTML. Uncontrolled by design: initial content comes from `runs` at
 * mount, the browser owns keystrokes, and the DOM is walked back into runs
 * on blur (immediately, for the undo checkpoint) and on input (live, so
 * autosave stays current without waiting for blur).
 */
export function TextEditable({
  editId,
  runs,
  onChangeRuns,
  onFocusEditable,
  onBlurEditable,
  historyVersion,
  placeholder,
  align = 'left',
  size,
  className = '',
  tag = 'div'
}: TextEditableProps) {
  const ref = useRef<HTMLElement | null>(null)
  const Tag = tag as 'div'

  const handleInput = () => {
    if (ref.current) onChangeRuns(domToRuns(ref.current))
  }

  const handleBlur = (_e: FocusEvent<HTMLElement>) => {
    if (ref.current) onChangeRuns(domToRuns(ref.current))
    onBlurEditable()
  }

  return (
    <Tag
      key={`${editId}-${historyVersion}`}
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onFocus={onFocusEditable}
      onBlur={handleBlur}
      onInput={handleInput}
      dangerouslySetInnerHTML={{ __html: runsToHtml(runs) }}
      className={`empty:before:pointer-events-none empty:before:text-ink/30 empty:before:content-[attr(data-placeholder)] dark:empty:before:text-paper/30 outline-none ${alignClass[align]} ${size ? sizeClass[size] : ''} ${className}`}
    />
  )
}
