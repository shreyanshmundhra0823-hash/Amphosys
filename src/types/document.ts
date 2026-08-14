/**
 * The Rubisco Document Engine's structured document model (Phase 2).
 *
 * A StudyMaterial (see studyMaterial.ts) can own one StudyDocument, made of
 * Sections, made of Blocks. This is the real, editable model — nothing here
 * is flattened to HTML or an image. AI generation (Phase 3) will eventually
 * populate this same structure; it does not exist yet.
 *
 * Rich text is represented as an array of TextRun — small styled text
 * fragments — rather than raw HTML, so formatting survives as data.
 */

export type TextAlign = 'left' | 'center' | 'right'
export type TextSize = 'sm' | 'base' | 'lg'
/**
 * A small set of presets, plus any custom font family name a user has
 * imported (e.g. via Google Fonts) in the toolbar. Presets keep their
 * short internal keys ('serif', 'mono', ...); custom fonts are stored as
 * their real CSS font-family name (e.g. "Roboto Slab").
 */
export type FontFamily = 'sans' | 'serif' | 'mono' | 'arial' | 'times' | (string & {})

export interface TextRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  /** CSS color value, e.g. '#7A1229'. Omitted means default ink color. */
  color?: string
  fontFamily?: FontFamily
}

export type BlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'bulletList'
  | 'numberedList'
  | 'table'
  | 'flowchart'
  | 'mnemonic'
  | 'examBox'
  | 'image'

export interface BaseBlock {
  id: string
  type: BlockType
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading'
  runs: TextRun[]
  align?: TextAlign
  size?: TextSize
}

export interface SubheadingBlock extends BaseBlock {
  type: 'subheading'
  runs: TextRun[]
  align?: TextAlign
  size?: TextSize
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  runs: TextRun[]
  align?: TextAlign
  size?: TextSize
}

export interface BulletListBlock extends BaseBlock {
  type: 'bulletList'
  items: TextRun[][]
}

export interface NumberedListBlock extends BaseBlock {
  type: 'numberedList'
  items: TextRun[][]
}

export interface TableBlock extends BaseBlock {
  type: 'table'
  rows: string[][]
  headerRow: boolean
}

export interface FlowchartNode {
  id: string
  text: string
}

/**
 * Nodes render as a top-to-bottom sequence connected by arrows, in array
 * order. This is a deliberate Phase 2 simplification — a genuine structured
 * flowchart (nodes + auto-derived sequential edges) without a freeform
 * drag/connect canvas, which is out of scope for this phase. The data
 * remains structured, so a richer layout can be added later without
 * changing what's stored.
 */
export interface FlowchartBlock extends BaseBlock {
  type: 'flowchart'
  nodes: FlowchartNode[]
}

export interface MnemonicBlock extends BaseBlock {
  type: 'mnemonic'
  title: string
  content: string
}

export interface ExamBoxBlock extends BaseBlock {
  type: 'examBox'
  content: string
}

/**
 * References an existing SourceAsset (see sourceAsset.ts) by ID rather than
 * duplicating image bytes into the document. Only materials imported as
 * images have SourceAssets to pick from in Phase 2.
 */
export interface ImageBlock extends BaseBlock {
  type: 'image'
  sourceAssetId?: string
  caption?: string
}

export type Block =
  | HeadingBlock
  | SubheadingBlock
  | ParagraphBlock
  | BulletListBlock
  | NumberedListBlock
  | TableBlock
  | FlowchartBlock
  | MnemonicBlock
  | ExamBoxBlock
  | ImageBlock

export interface DocumentSection {
  id: string
  blocks: Block[]
}

export interface StudyDocument {
  id: string
  studyMaterialId: string
  title: string
  sections: DocumentSection[]
  createdAt: number
  updatedAt: number
}
