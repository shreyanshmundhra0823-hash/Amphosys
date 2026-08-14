import { Outlet } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'

export function MainLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
