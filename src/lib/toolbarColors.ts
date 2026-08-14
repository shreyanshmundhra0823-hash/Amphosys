const STORAGE_KEY = 'rubisco.editor.toolbarColors.v1'

export const DEFAULT_TOOLBAR_COLORS = ['#7A1229', '#1D4ED8', '#15803D', '#B45309', '#4C1D95']

export function loadToolbarColors(): string[] {
  if (typeof window === 'undefined') return DEFAULT_TOOLBAR_COLORS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_TOOLBAR_COLORS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length !== 5 || !parsed.every((c) => typeof c === 'string')) {
      return DEFAULT_TOOLBAR_COLORS
    }
    return parsed
  } catch {
    return DEFAULT_TOOLBAR_COLORS
  }
}

export function saveToolbarColors(colors: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colors.slice(0, 5)))
}
