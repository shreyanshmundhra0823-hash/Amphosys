const STORAGE_KEY = 'rubisco.editor.customFonts.v1'
const injectedLinks = new Set<string>()

export interface CustomFont {
  /** Real CSS font-family name, also used as the value stored on TextRun.fontFamily. */
  name: string
  /** Google Fonts family slug (spaces -> +) used to build the stylesheet URL. */
  googleFamily: string
}

export function listCustomFonts(): CustomFont[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((f): f is CustomFont => typeof f?.name === 'string' && typeof f?.googleFamily === 'string')
  } catch {
    return []
  }
}

function persist(fonts: CustomFont[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts.slice(0, 20)))
}

/** Injects (once per session) the Google Fonts stylesheet <link> for a font so it actually renders. */
export function ensureFontLoaded(font: CustomFont) {
  if (typeof document === 'undefined') return
  if (injectedLinks.has(font.googleFamily)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFamily}:wght@400;600;700&display=swap`
  document.head.appendChild(link)
  injectedLinks.add(font.googleFamily)
}

export function loadAllCustomFonts() {
  listCustomFonts().forEach(ensureFontLoaded)
}

/** Adds (or promotes if it already exists) a font by its display name, e.g. "Roboto Slab". */
export function addCustomFont(displayName: string): CustomFont | null {
  const name = displayName.trim()
  if (!name) return null
  const googleFamily = name.replace(/\s+/g, '+')
  const font: CustomFont = { name, googleFamily }

  const existing = listCustomFonts().filter((f) => f.name.toLowerCase() !== name.toLowerCase())
  const next = [font, ...existing]
  persist(next)
  ensureFontLoaded(font)
  return font
}
