import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileNavigation } from './MobileNavigation'
import { Logo } from './Logo'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper dark:bg-ink">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-ink/10 px-4 dark:border-paper/10 md:hidden">
          <Logo size="sm" />
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 md:px-10 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        <MobileNavigation />
      </div>
    </div>
  )
}
