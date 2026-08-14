/**
 * Core entity representing a single unit of study material in the library.
 * This is intentionally kept flat and simple in Phase 1. Generated notes,
 * blocks, and revision data are modeled separately (see document.ts and
 * revision.ts) so this table never needs a breaking rewrite.
 */

export type SourceType = 'pdf' | 'image' | 'text'

export type MaterialStatus = 'draft' | 'completed'

export interface StudyMaterial {
  /** UUID, generated client-side */
  id: string
  title: string
  subject?: string
  topic?: string

  sourceType: SourceType
  /** Original file name, when imported from a PDF or image */
  sourceFileName?: string
  /** Original file MIME type, when imported from a PDF or image */
  sourceMimeType?: string
  /** Raw file bytes, stored locally for PDF sources */
  sourceFileData?: Blob
  /** Raw pasted/typed text, for text sources */
  sourceText?: string
  /**
   * IDs of stored SourceAsset images (see sourceAsset.ts), for
   * sourceType = 'image'. Order matches selection order. The materials
   * table stays flat — the actual image blobs live in the sourceAssets
   * table, keyed by studyMaterialId.
   */
  sourceImageIds?: string[]

  status: MaterialStatus

  createdAt: number
  updatedAt: number
  lastOpenedAt?: number
  tags?: string[]
  favorite?: boolean
  progress?: number
}

export interface CreateStudyMaterialInput {
  title: string
  subject?: string
  topic?: string
  sourceType: SourceType
  sourceFileName?: string
  sourceMimeType?: string
  sourceFileData?: Blob
  sourceText?: string
  /** Raw image files to store, for sourceType = 'image'. Supports multiple. */
  sourceImages?: File[]
  status?: MaterialStatus
}

export type UpdateStudyMaterialInput = Partial<
  Omit<StudyMaterial, 'id' | 'createdAt'>
>

export type LibrarySortOption = 'updatedAt' | 'createdAt' | 'title'
