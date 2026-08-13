import { Library, PlusCircle, RotateCcw } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { StudyMaterialList } from '@/components/StudyMaterialList'
import { useLibraryStats, useRecentMaterials } from '@/hooks/useStudyMaterials'
import { useDeleteMaterial } from '@/hooks/useDeleteMaterial'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const navigate = useNavigate()
  const { materials, isLoading } = useRecentMaterials(5)
  const stats = useLibraryStats()
  const { confirmAndDelete, ConfirmDialog } = useDeleteMaterial()

  return (
    <div>
      <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{greeting()}</p>
      <div className="mt-1.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink dark:text-paper sm:text-3xl">
            Your Medical Study Library
          </h1>
          <p className="mt-1.5 text-sm text-ink/60 dark:text-paper/60 sm:text-base">
            Create, organize and revise smarter.
          </p>
        </div>
        <Button onClick={() => navigate('/create')} className="shrink-0">
          <PlusCircle className="h-4 w-4" />
          Create Study Material
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <p className="text-2xl font-semibold text-ink dark:text-paper sm:text-3xl">
            {stats.total}
          </p>
          <p className="mt-0.5 text-xs text-ink/50 dark:text-paper/50 sm:text-sm">
            Total materials
          </p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-2xl font-semibold text-ink dark:text-paper sm:text-3xl">
            {stats.recentlyCreated}
          </p>
          <p className="mt-0.5 text-xs text-ink/50 dark:text-paper/50 sm:text-sm">
            Created this week
          </p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-2xl font-semibold text-ink dark:text-paper sm:text-3xl">
            {stats.revisionItems}
          </p>
          <p className="mt-0.5 text-xs text-ink/50 dark:text-paper/50 sm:text-sm">
            Revision items
          </p>
        </Card>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink dark:text-paper">Recent material</h2>
          {materials && materials.length > 0 && (
            <Link
              to="/library"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              <Library className="h-3.5 w-3.5" />
              View library
            </Link>
          )}
        </div>

        {isLoading ? (
          <LoadingState label="Loading your library…" />
        ) : materials && materials.length > 0 ? (
          <StudyMaterialList materials={materials} onDelete={confirmAndDelete} />
        ) : (
          <EmptyState
            icon={RotateCcw}
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
      </div>

      {ConfirmDialog}
    </div>
  )
}
