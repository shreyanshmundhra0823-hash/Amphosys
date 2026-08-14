export type RevisionRound = 'learn' | 'recall' | 'test'
export type QuestionType = 'shortAnswer' | 'mcq'

export interface RevisionQuestion {
  id: string
  studyMaterialId: string
  round: RevisionRound
  type: QuestionType
  prompt: string
  answer: string
  options?: string[]
  category?: string
  createdAt: number
}

export interface UserAnswer {
  id: string
  questionId: string
  studyMaterialId: string
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
