import { db } from './db'
import { generateId } from '@/lib/id'
import type { Annotation, Bookmark } from '@/types/revision'

export async function listBookmarks(studyMaterialId: string) { return db.bookmarks.where('studyMaterialId').equals(studyMaterialId).toArray() }
export async function addBookmark(input: Omit<Bookmark, 'id' | 'createdAt'>) { const item={...input,id:generateId(),createdAt:Date.now()}; await db.bookmarks.put(item); return item }
export async function removeBookmark(id: string) { await db.bookmarks.delete(id) }
export async function listAnnotations(studyMaterialId: string) { return db.annotations.where('studyMaterialId').equals(studyMaterialId).toArray() }
export async function saveAnnotation(input: Omit<Annotation, 'id' | 'createdAt'>) { const item={...input,id:generateId(),createdAt:Date.now()}; await db.annotations.put(item); return item }
