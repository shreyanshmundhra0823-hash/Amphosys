import Dexie, { type Table } from 'dexie'
import type { StudyMaterial } from '@/types/studyMaterial'
import type { StudyDocument } from '@/types/document'
import type { SourceAsset } from '@/types/sourceAsset'

/**
 * Local-first database for Rubisco Medical Library.
 *
 * Only `studyMaterials` and `sourceAssets` are actively used in Phase 1.
 * `documents` is declared now (empty) so the block-based document model has
 * a home once note generation and the editor ship, without a schema
 * migration surprise.
 *
 * Future tables (revisionQuestions, userAnswers, weakTopics, bookmarks,
 * annotations, appSettings) can be added in a later `this.version(3)` block
 * without touching what's here.
 */
export class RubiscoDB extends Dexie {
  studyMaterials!: Table<StudyMaterial, string>
  documents!: Table<StudyDocument, string>
  sourceAssets!: Table<SourceAsset, string>

  constructor() {
    super('rubisco-db')

    this.version(1).stores({
      studyMaterials:
        'id, title, subject, topic, sourceType, status, createdAt, updatedAt, lastOpenedAt',
      documents: 'id, studyMaterialId, createdAt, updatedAt'
    })

    // v2: adds `sourceAssets`, a dedicated table for multi-image sources so a
    // single StudyMaterial can own several stored images without
    // denormalizing blobs onto the material record. This is a pure addition
    // (new table only) — existing studyMaterials/documents data is left
    // untouched by the upgrade.
    this.version(2).stores({
      studyMaterials:
        'id, title, subject, topic, sourceType, status, createdAt, updatedAt, lastOpenedAt',
      documents: 'id, studyMaterialId, createdAt, updatedAt',
      sourceAssets: 'id, studyMaterialId, createdAt'
    })
  }
}

export const db = new RubiscoDB()
