import { NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import { navItems } from '@/lib/navigation'

const APP_VERSION = '0.8.0'

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/10 bg-white dark:border-paper/10 dark:bg-[#1c1a19] md:flex">
      <div className="flex h-16 items-center border-b border-ink/10 px-5 dark:border-paper/10">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'text-ink/65 hover:bg-ink/5 hover:text-ink dark:text-paper/65 dark:hover:bg-paper/5 dark:hover:text-paper'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink/10 px-5 py-4 text-xs text-ink/40 dark:border-paper/10 dark:text-paper/40">
        Rubisco Medical Library
        <br />
        Version {APP_VERSION}
      </div>
    </aside>
  )
}
