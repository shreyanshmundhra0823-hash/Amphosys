import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Pencil, Plus, Underline, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Block, TextAlign, TextSize } from '@/types/document'
import { fontFamilyCss } from '@/lib/richText'
import { addCustomFont, listCustomFonts, loadAllCustomFonts, type CustomFont } from '@/lib/fontLibrary'
import { loadToolbarColors, saveToolbarColors, DEFAULT_TOOLBAR_COLORS } from '@/lib/toolbarColors'
import { withRestoredSelection } from '@/lib/selectionMemory'

const PRESET_FONTS: { label: string; value: string }[] = [
  { label: 'Sans', value: 'sans' },
  { label: 'Georgia', value: 'serif' },
  { label: 'Arial', value: 'arial' },
  { label: 'Times New Roman', value: 'times' },
  { label: 'Monospace', value: 'mono' }
]

interface RichTextToolbarProps {
  activeBlock: Block | undefined
  onSetAlign: (align: TextAlign) => void
  onSetSize: (size: TextSize) => void
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
      onClick={() => withRestoredSelection(onClick)}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-ink/70 hover:bg-ink/5 dark:text-paper/70 dark:hover:bg-paper/10 ${
        active ? 'bg-ink/10 dark:bg-paper/15' : ''
      }`}
    >
      {children}
    </button>
  )
}

export function RichTextToolbar({ activeBlock, onSetAlign, onSetSize }: RichTextToolbarProps) {
  const supportsTextControls =
    activeBlock?.type === 'heading' || activeBlock?.type === 'subheading' || activeBlock?.type === 'paragraph'

  const [customFonts, setCustomFonts] = useState<CustomFont[]>([])
  const [colors, setColors] = useState<string[]>(DEFAULT_TOOLBAR_COLORS)
  const [editingColors, setEditingColors] = useState(false)
  const [showFontImport, setShowFontImport] = useState(false)
  const [fontImportValue, setFontImportValue] = useState('')

  useEffect(() => {
    loadAllCustomFonts()
    setCustomFonts(listCustomFonts())
    setColors(loadToolbarColors())
  }, [])

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
  }

  const applyFont = (value: string) => {
    // value is either a preset key ('serif', 'arial', ...) or a custom font's real name.
    const isPreset = PRESET_FONTS.some((p) => p.value === value)
    const cssFont = isPreset ? fontFamilyCss(value as never) : `"${value}", sans-serif`
    exec('fontName', cssFont)
  }

  const handleColorClick = (index: number, color: string) => {
    if (editingColors) {
      const input = document.createElement('input')
      input.type = 'color'
      input.value = color
      input.oninput = () => {
        const next = colors.slice()
        next[index] = input.value
        setColors(next)
        saveToolbarColors(next)
      }
      input.click()
      return
    }
    withRestoredSelection(() => exec('foreColor', color))
  }

  const handleImportFont = () => {
    const font = addCustomFont(fontImportValue)
    if (font) {
      setCustomFonts(listCustomFonts())
      setFontImportValue('')
      setShowFontImport(false)
      withRestoredSelection(() => applyFont(font.name))
    }
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

      {colors.map((color, i) => (
        <button
          key={i}
          type="button"
          title={editingColors ? `Edit color ${i + 1}` : `Apply color ${i + 1}`}
          aria-label={editingColors ? `Edit color ${i + 1}` : `Apply color ${i + 1}`}
          onClick={() => handleColorClick(i, color)}
          className={`h-6 w-6 shrink-0 rounded-full border ${editingColors ? 'border-2 border-dashed border-ink/40 dark:border-paper/40' : 'border-ink/15 dark:border-paper/20'}`}
          style={{ backgroundColor: color }}
        />
      ))}
      <button
        type="button"
        title={editingColors ? 'Done editing colors' : 'Edit the 5 color swatches'}
        aria-label={editingColors ? 'Done editing colors' : 'Edit the 5 color swatches'}
        onClick={() => setEditingColors((v) => !v)}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-ink/5 dark:text-paper/50 dark:hover:bg-paper/10 ${editingColors ? 'bg-ink/10 dark:bg-paper/15' : ''}`}
      >
        <Pencil className="h-3 w-3" strokeWidth={2} />
      </button>

      {supportsTextControls && (
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

          <div className="mx-1 h-5 w-px bg-ink/10 dark:bg-paper/10" />
          <select
            aria-label="Font family"
            onChange={(e) => {
              if (e.target.value === '__import__') {
                setShowFontImport(true)
                return
              }
              withRestoredSelection(() => applyFont(e.target.value))
            }}
            defaultValue="sans"
            className="h-8 rounded-md border border-ink/15 bg-transparent px-2 text-xs text-ink dark:border-paper/15 dark:text-paper"
          >
            {PRESET_FONTS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
            {customFonts.length > 0 && (
              <optgroup label="Imported">
                {customFonts.map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </optgroup>
            )}
            <option value="__import__">+ Import font…</option>
          </select>

          <div className="mx-1 h-5 w-px bg-ink/10 dark:bg-paper/10" />
          <select
            aria-label="Text size"
            onChange={(e) => withRestoredSelection(() => onSetSize(e.target.value as TextSize))}
            defaultValue="base"
            className="h-8 rounded-md border border-ink/15 bg-transparent px-2 text-xs text-ink dark:border-paper/15 dark:text-paper"
          >
            <option value="sm">Small</option>
            <option value="base">Normal</option>
            <option value="lg">Large</option>
          </select>
        </>
      )}

      {showFontImport && (
        <div className="mt-1 flex w-full items-center gap-1.5 basis-full">
          <input
            type="text"
            value={fontImportValue}
            onChange={(e) => setFontImportValue(e.target.value)}
            placeholder="Google Font name, e.g. Roboto Slab"
            className="h-8 flex-1 rounded-md border border-ink/15 bg-transparent px-2 text-xs text-ink dark:border-paper/15 dark:text-paper"
          />
          <button
            type="button"
            onClick={handleImportFont}
            className="flex h-8 items-center gap-1 rounded-md bg-brand-600 px-2 text-xs font-medium text-white"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} /> Add
          </button>
          <button
            type="button"
            onClick={() => { setShowFontImport(false); setFontImportValue('') }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink/50 hover:bg-ink/5 dark:text-paper/50 dark:hover:bg-paper/10"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
