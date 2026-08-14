import { ArrowDown, Plus, X } from 'lucide-react'
import { generateId } from '@/lib/id'
import type { FlowchartBlock } from '@/types/document'

interface Props {
  block: FlowchartBlock
  onChange: (updater: (b: FlowchartBlock) => FlowchartBlock) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
}

/**
 * Nodes render top-to-bottom in array order, connected by arrows — a
 * deliberately simple structured flowchart (see FlowchartBlock in
 * types/document.ts) rather than a freeform diagramming canvas.
 */
export function FlowchartBlockEditor({ block, onChange, onFocusBlock, onBlurBlock }: Props) {
  const setNodeText = (id: string, text: string) => {
    onChange((b) => ({ ...b, nodes: b.nodes.map((n) => (n.id === id ? { ...n, text } : n)) }))
  }

  const addNode = () => {
    onFocusBlock()
    onChange((b) => ({ ...b, nodes: [...b.nodes, { id: generateId(), text: '' }] }))
    onBlurBlock()
  }

  const removeNode = (id: string) => {
    onFocusBlock()
    onChange((b) => (b.nodes.length > 1 ? { ...b, nodes: b.nodes.filter((n) => n.id !== id) } : b))
    onBlurBlock()
  }

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {block.nodes.map((node, index) => (
        <div key={node.id} className="flex w-full max-w-sm flex-col items-center">
          <div className="group/node flex w-full items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
            <span
              contentEditable
              suppressContentEditableWarning
              onFocus={onFocusBlock}
              onBlur={(e) => {
                setNodeText(node.id, e.currentTarget.textContent ?? '')
                onBlurBlock()
              }}
              data-placeholder="Step"
              className="flex-1 text-sm text-brand-800 outline-none empty:before:text-brand-800/40 empty:before:content-[attr(data-placeholder)] dark:text-brand-200"
            >
              {node.text}
            </span>
            {block.nodes.length > 1 && (
              <button
                type="button"
                aria-label="Remove step"
                onClick={() => removeNode(node.id)}
                className="shrink-0 text-brand-700/40 opacity-0 hover:text-red-600 group-hover/node:opacity-100 dark:text-brand-300/40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {index < block.nodes.length - 1 && (
            <ArrowDown className="my-1 h-4 w-4 text-ink/25 dark:text-paper/25" />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addNode}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        <Plus className="h-3.5 w-3.5" /> Add step
      </button>
    </div>
  )
}
