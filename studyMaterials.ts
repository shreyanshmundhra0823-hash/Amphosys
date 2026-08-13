import { db } from './db'
import { addSourceAssets, deleteSourceAssets } from './sourceAssets'
import { generateId } from '@/lib/id'
import { AppError } from '@/lib/errors'
import type {
  CreateStudyMaterialInput,
  StudyMaterial,
  UpdateStudyMaterialInput
} from '@/types/studyMaterial'

/** Creates and persists a new StudyMaterial record. */
export async function createStudyMaterial(
  input: CreateStudyMaterialInput
): Promise<StudyMaterial> {
  const title = input.title.trim()
  if (!title) {
    throw new AppError('Give your study material a title before saving.')
  }
  if (input.sourceType === 'text' && !input.sourceText?.trim()) {
    throw new AppError('Add some source text before saving.')
  }
  if (input.sourceType === 'image' && !input.sourceImages?.length) {
    throw new AppError('Select at least one image before saving.')
  }
  if (input.sourceType === 'pdf' && !input.sourceFileData) {
    throw new AppError('Select a PDF file before saving.')
  }

  const now = Date.now()
  const id = generateId()

  // Images are stored as separate SourceAsset rows, keyed by this ID, so we
  // generate the ID up front rather than letting `db.studyMaterials.add`
  // assign one.
  let sourceImageIds: string[] | undefined
  if (input.sourceType === 'image' && input.sourceImages) {
    sourceImageIds = await addSourceAssets(id, input.sourceImages)
  }

  const material: StudyMaterial = {
    id,
    title,
    subject: input.subject?.trim() || undefined,
    topic: input.topic?.trim() || undefined,
    sourceType: input.sourceType,
    sourceFileName: input.sourceFileName,
    sourceMimeType: input.sourceMimeType,
    sourceFileData: input.sourceType === 'pdf' ? input.sourceFileData : undefined,
    sourceText: input.sourceType === 'text' ? input.sourceText : undefined,
    sourceImageIds,
    status: input.status ?? 'draft',
    createdAt: now,
    updatedAt: now
  }

  try {
    await db.studyMaterials.add(material)
  } catch (error) {
    // Roll back any images we already stored so we don't leave orphans.
    if (sourceImageIds) await deleteSourceAssets(id)
    throw new AppError('Could not save this material to your device.', error)
  }

  return material
}

export async function updateStudyMaterial(
  id: string,
  changes: UpdateStudyMaterialInput
): Promise<void> {
  try {
    const updated = await db.studyMaterials.update(id, {
      ...changes,
      updatedAt: Date.now()
    })
    if (!updated) {
      throw new AppError('That study material no longer exists.')
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Could not update this material.', error)
  }
}

export async function touchLastOpened(id: string): Promise<void> {
  try {
    await db.studyMaterials.update(id, { lastOpenedAt: Date.now() })
  } catch {
    // Non-critical — opening the material should not fail because of this.
  }
}

/**
 * Deletes a StudyMaterial along with any associated StudyDocument and
 * stored source images, so nothing is left orphaned in the local database.
 */
export async function deleteStudyMaterial(id: string): Promise<void> {
  try {
    await db.transaction('rw', db.studyMaterials, db.documents, db.sourceAssets, async () => {
      await db.documents.where('studyMaterialId').equals(id).delete()
      await db.sourceAssets.where('studyMaterialId').equals(id).delete()
      await db.studyMaterials.delete(id)
    })
  } catch (error) {
    throw new AppError('Could not delete this material. Try again.', error)
  }
}

export async function getStudyMaterial(id: string): Promise<StudyMaterial | undefined> {
  try {
    return await db.studyMaterials.get(id)
  } catch (error) {
    throw new AppError('Could not load this material.', error)
  }
}

export async function clearLibrary(): Promise<void> {
  try {
    await db.studyMaterials.clear()
    await db.documents.clear()
    await db.sourceAssets.clear()
  } catch (error) {
    throw new AppError('Could not clear your local library.', error)
  }
}

export async function estimateStorageUsage(): Promise<{
  usage: number
  quota: number
} | null> {
  if (!('storage' in navigator) || !navigator.storage.estimate) return null
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota }
  } catch {
    return null
  }
}
