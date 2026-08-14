import { useCallback, useEffect, useRef, useState } from 'react'
import { useDocumentHistory } from './useDocumentHistory'
import { saveDocument } from '@/db/documents'
import { createBlankBlock } from '@/lib/documentBlocks'
import { generateId } from '@/lib/id'
import type { Block, BlockType, StudyDocument } from '@/types/document'

const AUTOSAVE_DELAY_MS = 700

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

function deepClone(doc: StudyDocument): StudyDocument {
  return JSON.parse(JSON.stringify(doc))
}

/**
 * Owns editing state for a single StudyDocument: undo/redo, block CRUD, and
 * debounced autosave to Dexie. `document` here always refers to the single
 * (Phase 2) section at index 0 for convenience methods, though the
 * underlying model keeps `sections: DocumentSection[]` for future use.
 */
export function useDocumentEditor(initial: StudyDocument) {
  const history = useDocumentHistory(initial)
  const { document, setLive, commitPending, historyVersion } = history

  const pendingSnapshot = useRef<StudyDocument | null>(null)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const saveTimer = useRef<number | null>(null)
  const isFirstRender = useRef(true)

  // Debounced autosave whenever the document changes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setSaveStatus('unsaved')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await saveDocument(document)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, AUTOSAVE_DELAY_MS)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document])

  /** Call on focus of any editable field, to snapshot state before the edit session. */
  const beginEdit = useCallback(() => {
    if (!pendingSnapshot.current) pendingSnapshot.current = deepClone(document)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Call on blur, to close out the edit session as one undo step. */
  const endEdit = useCallback(() => {
    if (pendingSnapshot.current) {
      commitPending(pendingSnapshot.current)
      pendingSnapshot.current = null
    }
  }, [commitPending])

  const setTitleLive = useCallback(
    (title: string) => {
      setLive((current) => ({ ...current, title }))
    },
    [setLive]
  )

  const updateBlockLive = useCallback(
    (blockId: string, updater: (block: Block) => Block) => {
      setLive((current) => ({
        ...current,
        sections: current.sections.map((section, i) =>
          i === 0
            ? { ...section, blocks: section.blocks.map((b) => (b.id === blockId ? updater(b) : b)) }
            : section
        )
      }))
    },
    [setLive]
  )

  /** Discrete, immediately-committed structural change (its own undo step). */
  const mutateStructure = useCallback(
    (updater: (blocks: Block[]) => Block[]) => {
      history.commit((current) => ({
        ...current,
        sections: current.sections.map((section, i) =>
          i === 0 ? { ...section, blocks: updater(section.blocks) } : section
        )
      }))
    },
    [history]
  )

  const addBlock = useCallback(
    (type: BlockType, afterId?: string | null) => {
      const block = createBlankBlock(type)
      mutateStructure((blocks) => {
        if (!afterId) return [...blocks, block]
        const index = blocks.findIndex((b) => b.id === afterId)
        if (index === -1) return [...blocks, block]
        return [...blocks.slice(0, index + 1), block, ...blocks.slice(index + 1)]
      })
      setActiveBlockId(block.id)
    },
    [mutateStructure]
  )

  const deleteBlock = useCallback(
    (blockId: string) => {
      mutateStructure((blocks) => blocks.filter((b) => b.id !== blockId))
    },
    [mutateStructure]
  )

  const duplicateBlock = useCallback(
    (blockId: string) => {
      mutateStructure((blocks) => {
        const index = blocks.findIndex((b) => b.id === blockId)
        if (index === -1) return blocks
        const copy: Block = { ...deepCloneBlock(blocks[index]), id: generateId() }
        return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]
      })
    },
    [mutateStructure]
  )

  const moveBlock = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      mutateStructure((blocks) => {
        const index = blocks.findIndex((b) => b.id === blockId)
        if (index === -1) return blocks
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= blocks.length) return blocks
        const next = [...blocks]
        ;[next[index], next[target]] = [next[target], next[index]]
        return next
      })
    },
    [mutateStructure]
  )

  const blocks = document.sections[0]?.blocks ?? []

  return {
    document,
    blocks,
    title: document.title,
    setTitleLive,
    updateBlockLive,
    addBlock,
    deleteBlock,
    duplicateBlock,
    moveBlock,
    beginEdit,
    endEdit,
    activeBlockId,
    setActiveBlockId,
    saveStatus,
    saveNow: () => saveDocument(document).then(() => setSaveStatus('saved')),
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    historyVersion
  }
}

function deepCloneBlock(block: Block): Block {
  return JSON.parse(JSON.stringify(block))
}
