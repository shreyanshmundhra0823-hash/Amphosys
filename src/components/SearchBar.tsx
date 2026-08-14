import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

type SearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function SearchBar({ className = '', ...props }: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40 dark:text-paper/40"
        aria-hidden="true"
      />
      <input
        type="search"
        className="h-11 w-full rounded-lg border border-ink/15 bg-white pl-10 pr-3.5 text-sm text-ink placeholder:text-ink/40 focus:border-brand-500 dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper dark:placeholder:text-paper/40"
        {...props}
      />
    </div>
  )
}
