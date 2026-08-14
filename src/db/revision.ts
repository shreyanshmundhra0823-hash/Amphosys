import { db } from './db'
import { generateId } from '@/lib/id'
import type { RevisionQuestion, UserAnswer, WeakTopic } from '@/types/revision'
import type { Block } from '@/types/document'

export async function listQuestions(studyMaterialId?: string) {
  return studyMaterialId
    ? db.revisionQuestions.where('studyMaterialId').equals(studyMaterialId).toArray()
    : db.revisionQuestions.orderBy('createdAt').reverse().toArray()
}

export async function saveQuestions(questions: RevisionQuestion[]) {
  if (!questions.length) return
  await db.revisionQuestions.bulkPut(questions)
}

export async function answerQuestion(input: Omit<UserAnswer, 'id' | 'answeredAt'>) {
  const answer: UserAnswer = { ...input, id: generateId(), answeredAt: Date.now() }
  await db.userAnswers.put(answer)
  if (!answer.isCorrect) {
    const topic = 'Needs review'
    const existing = (await db.weakTopics.where('studyMaterialId').equals(answer.studyMaterialId).toArray()).find((item) => item.topic === topic)
    const weak: WeakTopic = existing
      ? { ...existing, missCount: existing.missCount + 1, lastMissedAt: answer.answeredAt }
      : { id: generateId(), studyMaterialId: answer.studyMaterialId, topic, missCount: 1, lastMissedAt: answer.answeredAt }
    await db.weakTopics.put(weak)
  }
  return answer
}

export async function getQuestionStats(studyMaterialId?: string) {
  const answers = studyMaterialId
    ? await db.userAnswers.where('studyMaterialId').equals(studyMaterialId).toArray()
    : await db.userAnswers.toArray()
  const correct = answers.filter((a) => a.isCorrect).length
  return { total: answers.length, correct, accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0 }
}

export function questionsFromBlocks(studyMaterialId: string, blocks: Block[]): RevisionQuestion[] {
  const now = Date.now()
  const questions: RevisionQuestion[] = []
  for (const block of blocks) {
    if ((block.type === 'heading' || block.type === 'subheading') && block.runs.length) continue
    if (block.type === 'paragraph') {
      const text = block.runs.map((r) => r.text).join('').trim()
      if (text.length >= 35) {
        const first = text.split(/[.!?]/)[0].trim()
        if (first.length >= 20) {
          questions.push({ id: generateId(), studyMaterialId, round: 'recall', type: 'shortAnswer', prompt: `Explain: ${first}?`, answer: text, category: 'Notes', createdAt: now })
        }
      }
    }
    if (block.type === 'mnemonic') {
      questions.push({ id: generateId(), studyMaterialId, round: 'recall', type: 'shortAnswer', prompt: `What is the mnemonic for ${block.title}?`, answer: block.content, category: 'Mnemonic', createdAt: now })
    }
    if (block.type === 'examBox') {
      questions.push({ id: generateId(), studyMaterialId, round: 'test', type: 'shortAnswer', prompt: 'What is the key exam point?', answer: block.content, category: 'High yield', createdAt: now })
    }
  }
  return questions.slice(0, 50)
}
