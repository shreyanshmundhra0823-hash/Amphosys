import { generateId } from './id'
import type {
  Block,
  BlockType,
  DocumentSection,
  StudyDocument
} from '@/types/document'

/** Creates a blank, valid block of the given type with a fresh ID. */
export function createBlankBlock(type: BlockType): Block {
  const id = generateId()
  switch (type) {
    case 'heading':
      return { id, type: 'heading', runs: [], align: 'left' }
    case 'subheading':
      return { id, type: 'subheading', runs: [], align: 'left' }
    case 'paragraph':
      return { id, type: 'paragraph', runs: [], align: 'left', size: 'base' }
    case 'bulletList':
      return { id, type: 'bulletList', items: [[]] }
    case 'numberedList':
      return { id, type: 'numberedList', items: [[]] }
    case 'table':
      return {
        id,
        type: 'table',
        headerRow: true,
        rows: [
          ['', ''],
          ['', '']
        ]
      }
    case 'flowchart':
      return {
        id,
        type: 'flowchart',
        nodes: [
          { id: generateId(), text: '' },
          { id: generateId(), text: '' }
        ]
      }
    case 'mnemonic':
      return { id, type: 'mnemonic', title: '', content: '' }
    case 'examBox':
      return { id, type: 'examBox', content: '' }
    case 'image':
      return { id, type: 'image', sourceAssetId: undefined, caption: '' }
  }
}

export function createBlankSection(): DocumentSection {
  return { id: generateId(), blocks: [] }
}

export function createBlankDocument(studyMaterialId: string, title: string): StudyDocument {
  const now = Date.now()
  return {
    id: generateId(),
    studyMaterialId,
    title,
    sections: [createBlankSection()],
    createdAt: now,
    updatedAt: now
  }
}

export const blockTypeLabels: Record<BlockType, string> = {
  heading: 'Heading',
  subheading: 'Subheading',
  paragraph: 'Paragraph',
  bulletList: 'Bullet list',
  numberedList: 'Numbered list',
  table: 'Table',
  flowchart: 'Flowchart',
  mnemonic: 'Mnemonic',
  examBox: 'Exam / high-yield box',
  image: 'Image'
}
