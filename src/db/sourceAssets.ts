import { db } from './db'
import { generateId } from '@/lib/id'
import { AppError } from '@/lib/errors'
import type { SourceAsset } from '@/types/sourceAsset'

/**
 * Persists image files as SourceAssets linked to a StudyMaterial, preserving
 * selection order. Returns the generated asset IDs in the same order so the
 * caller can store them on the StudyMaterial as `sourceImageIds`.
 */
export async function addSourceAssets(
  studyMaterialId: string,
  files: File[]
): Promise<string[]> {
  const now = Date.now()
  const assets: SourceAsset[] = files.map((file, index) => ({
    id: generateId(),
    studyMaterialId,
    fileName: file.name,
    mimeType: file.type,
    data: file,
    order: index,
    createdAt: now
  }))

  try {
    await db.sourceAssets.bulkAdd(assets)
  } catch (error) {
    throw new AppError('Could not save the selected images to your device.', error)
  }

  return assets.map((asset) => asset.id)
}

/** Loads all stored images for a StudyMaterial, in selection order. */
export async function getSourceAssets(studyMaterialId: string): Promise<SourceAsset[]> {
  try {
    const assets = await db.sourceAssets
      .where('studyMaterialId')
      .equals(studyMaterialId)
      .toArray()
    return assets.sort((a, b) => a.order - b.order)
  } catch (error) {
    throw new AppError('Could not load the stored images.', error)
  }
}

/** Deletes every stored image belonging to a StudyMaterial. */
export async function deleteSourceAssets(studyMaterialId: string): Promise<void> {
  await db.sourceAssets.where('studyMaterialId').equals(studyMaterialId).delete()
}
