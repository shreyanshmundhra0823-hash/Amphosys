import { PlusCircle, Library as LibraryIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { SearchBar } from '@/components/SearchBar'
import { StudyMaterialList } from '@/components/StudyMaterialList'
import { useDeleteMaterial } from '@/hooks/useDeleteMaterial'
import { useStudyMaterials } from '@/hooks/useStudyMaterials'
import type { LibrarySortOption } from '@/types/studyMaterial'

const sortOptions: { value: LibrarySortOption; label: string }[] = [
  { value: 'updatedAt', label: 'Recently updated' },
  { value: 'createdAt', label: 'Recently created' },
  { value: 'title', label: 'Alphabetical' }
]

export function Library() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<LibrarySortOption>('updatedAt')
  const { materials, isLoading } = useStudyMaterials({ query, sort })
  const { confirmAndDelete, ConfirmDialog } = useDeleteMaterial()

  return (
    <div>
      <PageHeader
        title="Study Library"
        subtitle="Everything you've imported and created, in one place."
        action={
          <Button onClick={() => navigate('/create')}>
            <PlusCircle className="h-4 w-4" />
            Create
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          placeholder="Search your study material..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as LibrarySortOption)}
          aria-label="Sort study material"
          className="h-11 shrink-0 rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading your library…" />
      ) : materials && materials.length > 0 ? (
        <StudyMaterialList materials={materials} onDelete={confirmAndDelete} />
      ) : query ? (
        <EmptyState
          icon={LibraryIcon}
          title="No matches"
          description={`Nothing in your library matches "${query}".`}
        />
      ) : (
        <EmptyState
          icon={LibraryIcon}
          title="Your library is empty"
          description="Import a PDF, image or text to start creating study material."
          action={
            <Button onClick={() => navigate('/create')}>
              <PlusCircle className="h-4 w-4" />
              Create Study Material
            </Button>
          }
        />
      )}

      {ConfirmDialog}
    </div>
  )
}
