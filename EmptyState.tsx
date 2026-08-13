import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink/15 px-6 py-16 text-center dark:border-paper/15">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-ink dark:text-paper">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink/60 dark:text-paper/60">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
