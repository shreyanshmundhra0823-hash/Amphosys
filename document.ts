/**
 * Future-proof document model.
 *
 * A StudyMaterial (see studyMaterial.ts) can eventually own one generated
 * StudyDocument, made of Sections, made of Blocks. None of this is rendered
 * or generated in Phase 1 — it exists so later phases (AI note generation,
 * the block editor, PDF export) can be built without changing the schema
 * of what already shipped.
 */

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'bulletList'
  | 'numberedList'
  | 'table'
  | 'flowchart'
  | 'callout'
  | 'mnemonic'
  | 'examPoint'
  | 'image'
  | 'divider'
  | 'question'
  | 'answer'

export interface BaseBlock {
  id: string
  type: BlockType
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading'
  level: 1 | 2 | 3
  text: string
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  text: string
}

export interface BulletListBlock extends BaseBlock {
  type: 'bulletList'
  items: string[]
}

export interface NumberedListBlock extends BaseBlock {
  type: 'numberedList'
  items: string[]
}

export interface TableBlock extends BaseBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
}

export interface FlowchartBlock extends BaseBlock {
  type: 'flowchart'
  nodes: { id: string; label: string }[]
  edges: { from: string; to: string; label?: string }[]
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout'
  variant: 'info' | 'warning' | 'clinical'
  text: string
}

export interface MnemonicBlock extends BaseBlock {
  type: 'mnemonic'
  phrase: string
  expansion: string[]
}

export interface ExamPointBlock extends BaseBlock {
  type: 'examPoint'
  text: string
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  assetId: string
  caption?: string
}

export interface DividerBlock extends BaseBlock {
  type: 'divider'
}

export interface QuestionBlock extends BaseBlock {
  type: 'question'
  text: string
}

export interface AnswerBlock extends BaseBlock {
  type: 'answer'
  text: string
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | BulletListBlock
  | NumberedListBlock
  | TableBlock
  | FlowchartBlock
  | CalloutBlock
  | MnemonicBlock
  | ExamPointBlock
  | ImageBlock
  | DividerBlock
  | QuestionBlock
  | AnswerBlock

export interface DocumentSection {
  id: string
  title?: string
  blocks: Block[]
}

export interface StudyDocument {
  id: string
  studyMaterialId: string
  sections: DocumentSection[]
  createdAt: number
  updatedAt: number
}
