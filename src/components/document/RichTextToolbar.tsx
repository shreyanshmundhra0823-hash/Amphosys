import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import type { Block, TextAlign, TextSize } from '@/types/document'

const COLOR_SWATCHES = [
  { label: 'Default', value: '' },
  { label: 'Rubisco red', value: '#7A1229' },
  { label: 'Blue', value: '#1D4ED8' },
  { label: 'Green', value: '#15803D' }
]

interface RichTextToolbarProps {
  activeBlock: Block | undefined
  onSetAlign: (align: TextAlign) => void
  onSetSize: (size: TextSize) => void
}

/** Prevents the toolbar button from stealing focus away from the contentEditable it acts on. */
function preserveFocus(e: MouseEvent) {
  e.preventDefault()
}

function ToolbarButton({
  onClick,
  active,
  label,
  children
}: {
  onClick: () => void
  active?: boolean
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={preserveFocus}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-ink/70 hover:bg-ink/5 dark:text-paper/70 dark:hover:bg-paper/10 ${
        active ? 'bg-ink/10 dark:bg-paper/15' : ''
      }`}
    >
      {children}
    </button>
  )
}

/**
 * A single persistent toolbar acting on whichever TextEditable currently has
 * focus. Bold/italic/underline/color run through document.execCommand,
 * which applies to the live browser selection — no per-block wiring needed.
 * Alignment and size are block-level metadata, so those act on
 * `activeBlock` (tracked separately via focus events) instead.
 */
export function RichTextToolbar({ activeBlock, onSetAlign, onSetSize }: RichTextToolbarProps) {
  const supportsAlign = activeBlock?.type === 'heading' || activeBlock?.type === 'subheading' || activeBlock?.type === 'paragraph'
  const supportsSize = activeBlock?.type === 'paragraph'

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
  }

  return (
    <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center gap-1 rounded-lg border border-ink/10 bg-white/95 p-1.5 backdrop-blur dark:border-paper/10 dark:bg-[#1c1a19]/95 md:top-4">
      <ToolbarButton label="Bold" onClick={() => exec('bold')}>
        <Bold className="h-4 w-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => exec('italic')}>
        <Italic className="h-4 w-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label="Underline" onClick={() => exec('underline')}>
        <Underline className="h-4 w-4" strokeWidth={2} />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-ink/10 dark:bg-paper/10" />

      {COLOR_SWATCHES.map((swatch) => (
        <button
          key={swatch.label}
          type="button"
          title={swatch.label}
          aria-label={swatch.label}
          onMouseDown={preserveFocus}
          onClick={() => exec('foreColor', swatch.value || '#1c1a19')}
          className="h-6 w-6 shrink-0 rounded-full border border-ink/15 dark:border-paper/20"
          style={{ backgroundColor: swatch.value || '#1c1a19' }}
        />
      ))}

      {supportsAlign && (
        <>
          <div className="mx-1 h-5 w-px bg-ink/10 dark:bg-paper/10" />
          <ToolbarButton label="Align left" onClick={() => onSetAlign('left')}>
            <AlignLeft className="h-4 w-4" strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Align center" onClick={() => onSetAlign('center')}>
            <AlignCenter className="h-4 w-4" strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton label="Align right" onClick={() => onSetAlign('right')}>
            <AlignRight className="h-4 w-4" strokeWidth={2} />
          </ToolbarButton>
        </>
      )}

      {supportsAlign && (
        <>
          <div className="mx-1 h-5 w-px bg-ink/10 dark:bg-paper/10" />
          <select
            aria-label="Font family"
            onMouseDown={preserveFocus}
            onChange={(e) => exec('fontName', e.target.value)}
            defaultValue="sans"
            className="h-8 rounded-md border border-ink/15 bg-transparent px-2 text-xs text-ink dark:border-paper/15 dark:text-paper"
          >
            <option value="sans">Sans</option>
            <option value="serif">Georgia</option>
            <option value="arial">Arial</option>
            <option value="times">Times New Roman</option>
            <option value="mono">Monospace</option>
          </select>
        </>
      )}

      {supportsSize && (
        <>
          <div className="mx-1 h-5 w-px bg-ink/10 dark:bg-paper/10" />
          <select
            aria-label="Text size"
            onMouseDown={preserveFocus}
            onChange={(e) => onSetSize(e.target.value as TextSize)}
            defaultValue="base"
            className="h-8 rounded-md border border-ink/15 bg-transparent px-2 text-xs text-ink dark:border-paper/15 dark:text-paper"
          >
            <option value="sm">Small</option>
            <option value="base">Normal</option>
            <option value="lg">Large</option>
          </select>
        </>
      )}
    </div>
  )
}
