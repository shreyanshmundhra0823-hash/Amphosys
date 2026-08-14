import { db } from '@/db/db'
export async function exportLibraryJSON() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), studyMaterials: await db.studyMaterials.toArray(), documents: await db.documents.toArray(), sourceAssets: await db.sourceAssets.toArray(), revisionQuestions: await db.revisionQuestions.toArray(), userAnswers: await db.userAnswers.toArray(), weakTopics: await db.weakTopics.toArray(), bookmarks: await db.bookmarks.toArray(), annotations: await db.annotations.toArray() }
  return JSON.stringify(payload, (_key, value) => value instanceof Blob ? undefined : value, 2)
}
export function downloadText(filename:string, text:string, type='application/json') { const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url) }
