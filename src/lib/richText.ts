import type { FontFamily, TextRun } from '@/types/document'

/** Plain text -> a single unstyled run. */
export function plainTextToRuns(text: string): TextRun[] {
  return text ? [{ text }] : []
}

export function runsToPlainText(runs: TextRun[]): string {
  return runs.map((run) => run.text).join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Serializes runs to a small, fixed set of inline tags for contentEditable init. */
export function runsToHtml(runs: TextRun[]): string {
  if (runs.length === 0) return ''
  return runs
    .map((run) => {
      let html = escapeHtml(run.text)
      const styles: string[] = []
      if (run.color) styles.push(`color:${run.color}`)
      if (run.fontFamily) styles.push(`font-family:${fontFamilyCss(run.fontFamily)}`)
      if (styles.length) html = `<span style="${styles.join(';')}">${html}</span>`
      if (run.underline) html = `<u>${html}</u>`
      if (run.italic) html = `<i>${html}</i>`
      if (run.bold) html = `<b>${html}</b>`
      return html
    })
    .join('')
}

interface ActiveFormat {
  bold: boolean
  italic: boolean
  underline: boolean
  color?: string
  fontFamily?: FontFamily
}

/**
 * Walks a contentEditable element's live DOM (after execCommand formatting)
 * and rebuilds the structured TextRun[] it represents. Handles the tags
 * browsers actually produce for execCommand('bold'|'italic'|'underline')
 * and a color-carrying <span style="color:...">.
 */
export function domToRuns(root: Node): TextRun[] {
  const runs: TextRun[] = []

  function visit(node: Node, format: ActiveFormat) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (text.length === 0) return
      const last = runs[runs.length - 1]
      const sameFormat =
        last &&
        !!last.bold === format.bold &&
        !!last.italic === format.italic &&
        !!last.underline === format.underline &&
        last.color === format.color &&
        last.fontFamily === format.fontFamily
      if (sameFormat) {
        last.text += text
      } else {
        runs.push({
          text,
          bold: format.bold || undefined,
          italic: format.italic || undefined,
          underline: format.underline || undefined,
          color: format.color,
          fontFamily: format.fontFamily
        })
      }
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    const tag = el.tagName

    if (tag === 'BR') {
      const last = runs[runs.length - 1]
      if (last) last.text += '\n'
      else runs.push({ text: '\n' })
      return
    }

    const next: ActiveFormat = { ...format }
    if (tag === 'B' || tag === 'STRONG') next.bold = true
    if (tag === 'I' || tag === 'EM') next.italic = true
    if (tag === 'U') next.underline = true
    const styleColor = el.style?.color
    if (styleColor) next.color = styleColor
    const styleFont = el.style?.fontFamily || (tag === 'FONT' ? el.getAttribute('face') : '')
    if (styleFont) next.fontFamily = cssToFontFamily(styleFont)

    el.childNodes.forEach((child) => visit(child, next))
  }

  root.childNodes.forEach((child) =>
    visit(child, { bold: false, italic: false, underline: false })
  )

  return runs
}

function fontFamilyCss(font: FontFamily): string {
  switch (font) {
    case 'serif': return 'Georgia, serif'
    case 'mono': return 'ui-monospace, SFMono-Regular, Menlo, monospace'
    case 'arial': return 'Arial, sans-serif'
    case 'times': return 'Times New Roman, serif'
    case 'sans':
    default: return 'system-ui, sans-serif'
  }
}

function cssToFontFamily(value: string): FontFamily {
  const v = value.toLowerCase()
  if (v.includes('georgia') || v.includes('serif')) return 'serif'
  if (v.includes('mono') || v.includes('menlo') || v.includes('consolas')) return 'mono'
  if (v.includes('arial')) return 'arial'
  if (v.includes('times')) return 'times'
  return 'sans'
}
