import { NavLink } from 'react-router-dom'
import { navItems } from '@/lib/navigation'

export function MobileNavigation() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink/10 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-paper/10 dark:bg-[#1c1a19]/95 md:hidden"
    >
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink/50 dark:text-paper/50'
            }`
          }
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
