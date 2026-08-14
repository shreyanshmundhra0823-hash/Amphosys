import Dexie, { type Table } from 'dexie'
import type { StudyMaterial } from '@/types/studyMaterial'
import type { StudyDocument } from '@/types/document'
import type { SourceAsset } from '@/types/sourceAsset'
import type { Annotation, Bookmark, RevisionQuestion, UserAnswer, WeakTopic } from '@/types/revision'

export class RubiscoDB extends Dexie {
  studyMaterials!: Table<StudyMaterial, string>
  documents!: Table<StudyDocument, string>
  sourceAssets!: Table<SourceAsset, string>
  revisionQuestions!: Table<RevisionQuestion, string>
  userAnswers!: Table<UserAnswer, string>
  weakTopics!: Table<WeakTopic, string>
  bookmarks!: Table<Bookmark, string>
  annotations!: Table<Annotation, string>

  constructor() {
    super('rubisco-db')
    this.version(1).stores({
      studyMaterials: 'id, title, subject, topic, sourceType, status, createdAt, updatedAt, lastOpenedAt',
      documents: 'id, studyMaterialId, createdAt, updatedAt'
    })
    this.version(2).stores({
      studyMaterials: 'id, title, subject, topic, sourceType, status, createdAt, updatedAt, lastOpenedAt',
      documents: 'id, studyMaterialId, createdAt, updatedAt',
      sourceAssets: 'id, studyMaterialId, createdAt'
    })
    this.version(3).stores({
      studyMaterials: 'id, title, subject, topic, sourceType, status, favorite, createdAt, updatedAt, lastOpenedAt',
      documents: 'id, studyMaterialId, createdAt, updatedAt',
      sourceAssets: 'id, studyMaterialId, createdAt',
      revisionQuestions: 'id, studyMaterialId, round, type, category, createdAt',
      userAnswers: 'id, questionId, studyMaterialId, answeredAt, isCorrect',
      weakTopics: 'id, studyMaterialId, topic, lastMissedAt',
      bookmarks: 'id, studyMaterialId, blockId, createdAt',
      annotations: 'id, studyMaterialId, blockId, createdAt'
    })
  }
}

export const db = new RubiscoDB()
