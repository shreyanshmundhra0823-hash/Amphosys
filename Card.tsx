import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-ink/10 bg-white dark:border-paper/10 dark:bg-white/[0.03] ${className}`}
      {...props}
    />
  )
}
