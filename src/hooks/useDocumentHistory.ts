import { useCallback, useRef, useState } from 'react'
import type { StudyDocument } from '@/types/document'

const MAX_HISTORY = 50

/**
 * Document-level undo/redo over full StudyDocument snapshots. Callers push a
 * new snapshot at discrete commit points (block add/delete/move/duplicate,
 * or text committed on blur) rather than on every keystroke, so history
 * stays meaningful instead of one entry per character.
 */
export function useDocumentHistory(initial: StudyDocument) {
  const [present, setPresent] = useState(initial)
  const past = useRef<StudyDocument[]>([])
  const future = useRef<StudyDocument[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  // Bumped only by undo/redo, so editable blocks know to re-sync their DOM
  // from state instead of staying uncontrolled.
  const [historyVersion, setHistoryVersion] = useState(0)

  const syncFlags = useCallback(() => {
    setCanUndo(past.current.length > 0)
    setCanRedo(future.current.length > 0)
  }, [])

  /** Commits a new state as a fresh undo point. */
  const commit = useCallback(
    (next: StudyDocument | ((current: StudyDocument) => StudyDocument)) => {
      setPresent((current) => {
        const resolved = typeof next === 'function' ? (next as (c: StudyDocument) => StudyDocument)(current) : next
        if (documentsEqual(current, resolved)) return current
        past.current.push(current)
        if (past.current.length > MAX_HISTORY) past.current.shift()
        future.current = []
        syncFlags()
        return resolved
      })
    },
    [syncFlags]
  )

  /** Replaces the present state without creating an undo point (e.g. initial load, live typing before commit). */
  const setLive = useCallback((next: StudyDocument | ((current: StudyDocument) => StudyDocument)) => {
    setPresent(next)
  }, [])

  const undo = useCallback(() => {
    if (past.current.length === 0) return
    setPresent((current) => {
      const previous = past.current.pop() as StudyDocument
      future.current.push(current)
      syncFlags()
      return previous
    })
    setHistoryVersion((v) => v + 1)
  }, [syncFlags])

  const redo = useCallback(() => {
    if (future.current.length === 0) return
    setPresent((current) => {
      const next = future.current.pop() as StudyDocument
      past.current.push(current)
      syncFlags()
      return next
    })
    setHistoryVersion((v) => v + 1)
  }, [syncFlags])

  /**
   * Pushes a pre-edit snapshot onto history without altering `present`.
   * Used for focus/blur-scoped text edit sessions: `present` is already kept
   * live-updated via `setLive` while the user types, so committing only
   * needs to record what it looked like *before* the session began.
   */
  const commitPending = useCallback(
    (snapshot: StudyDocument) => {
      setPresent((current) => {
        if (documentsEqual(snapshot, current)) return current
        past.current.push(snapshot)
        if (past.current.length > MAX_HISTORY) past.current.shift()
        future.current = []
        syncFlags()
        return current
      })
    },
    [syncFlags]
  )

  return {
    document: present,
    commit,
    setLive,
    commitPending,
    undo,
    redo,
    canUndo,
    canRedo,
    historyVersion
  }
}

function documentsEqual(a: StudyDocument, b: StudyDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
