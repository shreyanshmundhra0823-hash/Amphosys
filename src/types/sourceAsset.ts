/**
 * A single stored binary asset (currently: one imported image) belonging to
 * a StudyMaterial's source. Kept in its own table rather than embedded on
 * StudyMaterial so a material can own multiple images without denormalizing
 * blobs onto that record, and so future asset types (e.g. per-page PDF
 * renders) can reuse the same shape without another schema rewrite.
 */
export interface SourceAsset {
  id: string
  studyMaterialId: string
  fileName: string
  mimeType: string
  /** Raw file bytes. */
  data: Blob
  /** Selection order, so galleries render images in the order they were added. */
  order: number
  createdAt: number
}
