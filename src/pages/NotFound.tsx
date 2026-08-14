import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold text-ink dark:text-paper">Page not found</h1>
      <p className="mt-2 text-sm text-ink/60 dark:text-paper/60">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="mt-6">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  )
}
