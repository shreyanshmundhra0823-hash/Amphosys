let savedRange: Range | null = null

function isInsideEditable(node: Node | null): boolean {
  let el = node instanceof Element ? node : node?.parentElement ?? null
  while (el) {
    if (el.getAttribute?.('contenteditable') === 'true') return true
    el = el.parentElement
  }
  return false
}

/**
 * Call once (e.g. from a top-level layout) to keep the last in-editor
 * selection available. We deliberately do NOT use `selectionchange` alone on
 * mobile Safari/Chrome, since it fires very late/inconsistently there;
 * `mouseup`/`touchend`/`keyup` inside the editable itself is more reliable.
 */
export function initSelectionTracking() {
  if (typeof document === 'undefined') return

  const capture = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    if (!isInsideEditable(sel.anchorNode)) return
    savedRange = sel.getRangeAt(0).cloneRange()
  }

  document.addEventListener('selectionchange', capture)
  document.addEventListener('mouseup', capture)
  document.addEventListener('touchend', capture)
  document.addEventListener('keyup', capture)
}

/** Restores the last known in-editor selection, if any. Returns whether it succeeded. */
export function restoreSelection(): boolean {
  if (!savedRange) return false
  const sel = window.getSelection()
  if (!sel) return false
  sel.removeAllRanges()
  sel.addRange(savedRange)
  return true
}

/** Runs `fn` after restoring the saved selection, so exec/format commands land where the user last had their cursor. */
export function withRestoredSelection(fn: () => void) {
  restoreSelection()
  fn()
}
