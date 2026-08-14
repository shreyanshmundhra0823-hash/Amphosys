import { AlertTriangle, ArrowLeft, Download, Printer, Redo2, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AddBlockMenu } from '@/components/document/AddBlockMenu'
import { BlockRenderer } from '@/components/document/BlockRenderer'
import { RichTextToolbar } from '@/components/document/RichTextToolbar'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { getOrCreateDocument } from '@/db/documents'
import { getStudyMaterial } from '@/db/studyMaterials'
import { useDocumentEditor } from '@/hooks/useDocumentEditor'
import type { StudyDocument } from '@/types/document'
import type { StudyMaterial } from '@/types/studyMaterial'

export function DocumentEditor() {
  const { materialId } = useParams<{ materialId: string }>()
  const [material, setMaterial] = useState<StudyMaterial | null | undefined>(undefined)
  const [initialDoc, setInitialDoc] = useState<StudyDocument | null>(null)

  useEffect(() => {
    if (!materialId) return
    let cancelled = false
    ;(async () => {
      const found = await getStudyMaterial(materialId)
      if (cancelled) return
      if (!found) {
        setMaterial(null)
        return
      }
      setMaterial(found)
      const doc = await getOrCreateDocument(materialId, found.title)
      if (!cancelled) setInitialDoc(doc)
    })()
    return () => {
      cancelled = true
    }
  }, [materialId])

  if (material === undefined || (material && !initialDoc)) {
    return <LoadingState label="Loading document…" />
  }

  if (material === null) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Study material not found"
        description="This material may have been deleted from this device."
        action={
          <Link to="/library" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Back to Library
          </Link>
        }
      />
    )
  }

  return <DocumentEditorInner material={material} initialDoc={initialDoc as StudyDocument} />
}

function DocumentEditorInner({
  material,
  initialDoc
}: {
  material: StudyMaterial
  initialDoc: StudyDocument
}) {
  const editor = useDocumentEditor(initialDoc)
  const activeBlock = editor.blocks.find((b) => b.id === editor.activeBlockId)

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur dark:border-paper/10 dark:bg-ink/95 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10">
        <Link
          to={`/editor/${material.id}`}
          className="flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink dark:text-paper/60 dark:hover:text-paper"
        >
          <ArrowLeft className="h-4 w-4" /> Source Material
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <SaveIndicator status={editor.saveStatus} />
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden items-center gap-1.5 rounded-md border border-ink/10 bg-paper px-2.5 py-1.5 text-xs font-medium text-ink/70 hover:border-brand-300 hover:text-brand-700 dark:border-paper/10 dark:bg-ink dark:text-paper/70 dark:hover:border-brand-500/40 dark:hover:text-brand-300 sm:flex"
          >
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </button>
          <button
            type="button"
            aria-label="Undo"
            disabled={!editor.canUndo}
            onClick={editor.undo}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink/60 hover:bg-ink/5 disabled:opacity-30 dark:text-paper/60 dark:hover:bg-paper/10"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Redo"
            disabled={!editor.canRedo}
            onClick={editor.redo}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink/60 hover:bg-ink/5 disabled:opacity-30 dark:text-paper/60 dark:hover:bg-paper/10"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="document-editor-heading mb-4 flex items-start justify-between gap-4">
        <input
          value={editor.title}
        onFocus={editor.beginEdit}
        onBlur={editor.endEdit}
        onChange={(e) => editor.setTitleLive(e.target.value)}
        placeholder="Document title"
          className="w-full bg-transparent font-serif text-2xl font-semibold tracking-tight text-ink outline-none placeholder:text-ink/30 dark:text-paper dark:placeholder:text-paper/30 sm:text-3xl"
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-1 flex shrink-0 items-center gap-1.5 rounded-md border border-brand-600/20 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-400/30 dark:text-brand-300 dark:hover:bg-brand-500/10 sm:hidden"
          aria-label="Print or save as PDF"
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
      </div>

      <RichTextToolbar
        activeBlock={activeBlock}
        onSetAlign={(align) => {
          if (!editor.activeBlockId) return
          editor.updateBlockLive(editor.activeBlockId, (b) =>
            b.type === 'heading' || b.type === 'subheading' || b.type === 'paragraph'
              ? { ...b, align }
              : b
          )
        }}
        onSetSize={(size) => {
          if (!editor.activeBlockId) return
          editor.updateBlockLive(editor.activeBlockId, (b) => (b.type === 'paragraph' ? { ...b, size } : b))
        }}
      />

      <div className="document-page">
        {editor.blocks.length === 0 ? (
          <p className="text-sm text-ink/40 dark:text-paper/40">
            This document is empty. Add your first block below.
          </p>
        ) : (
          editor.blocks.map((block, index) => (
            <BlockRenderer
              key={block.id}
              block={block}
              studyMaterialId={material.id}
              historyVersion={editor.historyVersion}
              isFirst={index === 0}
              isLast={index === editor.blocks.length - 1}
              onChange={(updater) => editor.updateBlockLive(block.id, updater as never)}
              onFocusBlock={() => {
                editor.setActiveBlockId(block.id)
                editor.beginEdit()
              }}
              onBlurBlock={editor.endEdit}
              onMoveUp={() => editor.moveBlock(block.id, 'up')}
              onMoveDown={() => editor.moveBlock(block.id, 'down')}
              onDuplicate={() => editor.duplicateBlock(block.id)}
              onDelete={() => editor.deleteBlock(block.id)}
            />
          ))
        )}
      </div>

      <div className="mt-6">
        <AddBlockMenu onAdd={(type) => editor.addBlock(type, editor.activeBlockId)} />
      </div>
    </div>
  )
}

function SaveIndicator({ status }: { status: 'saved' | 'saving' | 'unsaved' | 'error' }) {
  const label = {
    saved: 'Saved',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    error: "Couldn't save — check storage"
  }[status]
  const dotClass = {
    saved: 'bg-green-500',
    saving: 'bg-amber-500',
    unsaved: 'bg-ink/30 dark:bg-paper/30',
    error: 'bg-red-500'
  }[status]

  return (
    <span className="flex items-center gap-1.5 text-xs text-ink/50 dark:text-paper/50">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}
