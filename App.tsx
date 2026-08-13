import { Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Library } from '@/pages/Library'
import { Create } from '@/pages/Create'
import { Settings } from '@/pages/Settings'
import { SourceMaterial } from '@/pages/SourceMaterial'
import { Revision } from '@/pages/Revision'
import { NotFound } from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/library" element={<Library />} />
        <Route path="/create" element={<Create />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/editor/:id" element={<SourceMaterial />} />
        <Route path="/revision" element={<Revision />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
