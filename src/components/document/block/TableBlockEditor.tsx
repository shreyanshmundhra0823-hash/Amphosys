import { Minus, Plus } from 'lucide-react'
import type { FocusEvent } from 'react'
import type { TableBlock } from '@/types/document'

interface Props {
  block: TableBlock
  onChange: (updater: (b: TableBlock) => TableBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

export function TableBlockEditor({ block, onChange, onFocusBlock, onBlurBlock }: Props) {
  const columnCount = block.rows[0]?.length ?? 0

  const setCell = (rowIndex: number, colIndex: number, text: string) => {
    onChange((b) => ({
      ...b,
      rows: b.rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? text : cell)) : row))
    }))
  }

  const handleCellBlur = (e: FocusEvent<HTMLTableCellElement>, r: number, c: number) => {
    setCell(r, c, e.currentTarget.textContent ?? '')
    onBlurBlock()
  }

  const addRow = () => {
    onFocusBlock()
    onChange((b) => ({ ...b, rows: [...b.rows, Array(columnCount).fill('')] }))
    onBlurBlock()
  }

  const removeRow = (index: number) => {
    onFocusBlock()
    onChange((b) => (b.rows.length > 1 ? { ...b, rows: b.rows.filter((_, i) => i !== index) } : b))
    onBlurBlock()
  }

  const addColumn = () => {
    onFocusBlock()
    onChange((b) => ({ ...b, rows: b.rows.map((row) => [...row, '']) }))
    onBlurBlock()
  }

  const removeColumn = (colIndex: number) => {
    onFocusBlock()
    onChange((b) =>
      columnCount > 1 ? { ...b, rows: b.rows.map((row) => row.filter((_, c) => c !== colIndex)) } : b
    )
    onBlurBlock()
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-ink/60 dark:text-paper/60">
          <input
            type="checkbox"
            checked={block.headerRow}
            onFocus={onFocusBlock}
            onChange={(e) => {
              onChange((b) => ({ ...b, headerRow: e.target.checked }))
              onBlurBlock()
            }}
          />
          First row is header
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-ink/10 dark:border-paper/10">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={onFocusBlock}
                    onBlur={(e) => handleCellBlur(e, r, c)}
                    className={`min-w-[6rem] border border-ink/10 px-2.5 py-1.5 outline-none focus:bg-brand-50 dark:border-paper/10 dark:focus:bg-brand-500/10 ${
                      block.headerRow && r === 0 ? 'font-semibold' : ''
                    }`}
                  >
                    {cell}
                  </td>
                ))}
                <td className="w-8 border-none px-1 text-center align-middle">
                  <button
                    type="button"
                    aria-label="Remove row"
                    onClick={() => removeRow(r)}
                    className="text-ink/25 hover:text-red-600 dark:text-paper/25"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              {Array.from({ length: columnCount }).map((_, c) => (
                <td key={c} className="border-none px-1 py-1 text-center">
                  <button
                    type="button"
                    aria-label="Remove column"
                    onClick={() => removeColumn(c)}
                    className="text-ink/25 hover:text-red-600 dark:text-paper/25"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </button>
        <button
          type="button"
          onClick={addColumn}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          <Plus className="h-3.5 w-3.5" /> Add column
        </button>
      </div>
    </div>
  )
}
