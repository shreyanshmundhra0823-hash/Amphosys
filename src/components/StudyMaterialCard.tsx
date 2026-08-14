import { FileText, Image as ImageIcon, Trash2, Type } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '@/lib/format'
import type { StudyMaterial } from '@/types/studyMaterial'

const sourceIcon = {
  pdf: FileText,
  image: ImageIcon,
  text: Type
}

interface StudyMaterialCardProps {
  material: StudyMaterial
  onDelete: (material: StudyMaterial) => void
}

export function StudyMaterialCard({ material, onDelete }: StudyMaterialCardProps) {
  const Icon = sourceIcon[material.sourceType]

  return (
    <div className="group relative flex items-start gap-3.5 rounded-xl border border-ink/10 bg-white p-4 transition-shadow hover:shadow-sm dark:border-paper/10 dark:bg-white/[0.03]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>

      <Link to={`/editor/${material.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-ink dark:text-paper">
            {material.title}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              material.status === 'completed'
                ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
            }`}
          >
            {material.status === 'completed' ? 'Completed' : 'Draft'}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink/50 dark:text-paper/50">
          {[material.subject, material.topic].filter(Boolean).join(' · ') || 'No subject set'}
        </p>
        <p className="mt-1.5 text-xs text-ink/40 dark:text-paper/40">
          Updated {formatRelativeTime(material.updatedAt)}
        </p>
      </Link>

      <button
        onClick={() => onDelete(material)}
        aria-label={`Delete ${material.title}`}
        className="shrink-0 rounded-lg p-2 text-ink/30 hover:bg-red-50 hover:text-red-600 dark:text-paper/30 dark:hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
