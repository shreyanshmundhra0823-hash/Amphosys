import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/db/db'
import type { LibrarySortOption, StudyMaterial } from '@/types/studyMaterial'

interface UseStudyMaterialsOptions {
  query?: string
  sort?: LibrarySortOption
}

function matches(material: StudyMaterial, query: string): boolean {
  const haystack = [
    material.title,
    material.subject,
    material.topic,
    material.sourceFileName
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query.toLowerCase())
}

/** Live-reactive view of the library, with optional search and sort applied. */
export function useStudyMaterials(options: UseStudyMaterialsOptions = {}) {
  const { query = '', sort = 'updatedAt' } = options

  const materials = useLiveQuery(() => db.studyMaterials.toArray(), [])

  const filtered = useMemo(() => {
    if (!materials) return undefined
    const q = query.trim()
    const base = q ? materials.filter((m) => matches(m, q)) : materials

    return [...base].sort((a, b) => {
      switch (sort) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'createdAt':
          return b.createdAt - a.createdAt
        case 'updatedAt':
        default:
          return b.updatedAt - a.updatedAt
      }
    })
  }, [materials, query, sort])

  return {
    materials: filtered,
    isLoading: materials === undefined
  }
}

/** Most recently updated materials, for the Dashboard's Recent Material section. */
export function useRecentMaterials(limit = 5) {
  const materials = useLiveQuery(
    () => db.studyMaterials.orderBy('updatedAt').reverse().limit(limit).toArray(),
    [limit]
  )
  return { materials, isLoading: materials === undefined }
}

export function useLibraryStats() {
  const total = useLiveQuery(() => db.studyMaterials.count(), [])
  const recentCount = useLiveQuery(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return db.studyMaterials.where('createdAt').above(since).count()
  }, [])

  return {
    total: total ?? 0,
    recentlyCreated: recentCount ?? 0,
    // Revision items will be real once the revision engine (Phase 2) ships.
    revisionItems: 0,
    isLoading: total === undefined
  }
}
