import { BookOpen, LayoutDashboard, PlusCircle, RotateCcw, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/create', label: 'Create', icon: PlusCircle },
  { to: '/revision', label: 'Revision', icon: RotateCcw },
  { to: '/settings', label: 'Settings', icon: Settings }
]
