import { db } from './db'
import { AppError } from '@/lib/errors'
import { createBlankDocument } from '@/lib/documentBlocks'
import type { StudyDocument } from '@/types/document'

/** Loads the StudyDocument belonging to a StudyMaterial, if one exists yet. */
export async function getDocumentByMaterialId(
  studyMaterialId: string
): Promise<StudyDocument | undefined> {
  try {
    return await db.documents.where('studyMaterialId').equals(studyMaterialId).first()
  } catch (error) {
    throw new AppError('Could not load the document for this material.', error)
  }
}

/**
 * Loads the existing document for a material, or creates and persists a
 * blank one (seeded with the material's title) if none exists yet.
 */
export async function getOrCreateDocument(
  studyMaterialId: string,
  defaultTitle: string
): Promise<StudyDocument> {
  const existing = await getDocumentByMaterialId(studyMaterialId)
  if (existing) return existing

  const blank = createBlankDocument(studyMaterialId, defaultTitle)
  try {
    await db.documents.add(blank)
  } catch (error) {
    throw new AppError('Could not create a document for this material.', error)
  }
  return blank
}

/** Upserts the full document — the editor's single save path (autosave + explicit save). */
export async function saveDocument(document: StudyDocument): Promise<void> {
  try {
    await db.documents.put({ ...document, updatedAt: Date.now() })
  } catch (error) {
    throw new AppError('Could not save your document. Your latest changes may be lost.', error)
  }
}
