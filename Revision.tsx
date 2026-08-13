import { RotateCcw } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export function Revision() {
  return (
    <div>
      <PageHeader title="Revision" subtitle="Coming in a later phase." />
      <EmptyState
        icon={RotateCcw}
        title="The revision engine isn't built yet"
        description="Spaced-repetition questions and weak-topic tracking will land in a future phase, once AI note generation is in place."
      />
    </div>
  )
}
