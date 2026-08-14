/**
 * Types for the future revision/question engine (Phase 2+). Not implemented
 * or stored anywhere yet — declared now so the database layer can add these
 * tables later without reshaping StudyMaterial or StudyDocument.
 */

export type RevisionRound = 'learn' | 'recall' | 'test'

export interface RevisionQuestion {
  id: string
  studyMaterialId: string
  round: RevisionRound
  prompt: string
  answer: string
  category?: string
}

export interface UserAnswer {
  id: string
  questionId: string
  givenAnswer: string
  isCorrect: boolean
  answeredAt: number
}

export interface WeakTopic {
  id: string
  studyMaterialId: string
  topic: string
  missCount: number
  lastMissedAt: number
}

export interface Bookmark {
  id: string
  studyMaterialId: string
  blockId?: string
  createdAt: number
}

export interface Annotation {
  id: string
  studyMaterialId: string
  blockId?: string
  note: string
  createdAt: number
}
