import { PlusCircle, Library as LibraryIcon, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { SearchBar } from '@/components/SearchBar'
import { StudyMaterialList } from '@/components/StudyMaterialList'
import { useDeleteMaterial } from '@/hooks/useDeleteMaterial'
import { useStudyMaterials } from '@/hooks/useStudyMaterials'
import { updateStudyMaterial } from '@/db/studyMaterials'
import type { LibrarySortOption } from '@/types/studyMaterial'

const sortOptions: { value: LibrarySortOption; label: string }[] = [
  { value: 'updatedAt', label: 'Recently updated' }, { value: 'createdAt', label: 'Recently created' }, { value: 'title', label: 'Alphabetical' }
]
export function Library() {
  const navigate = useNavigate(); const [query,setQuery]=useState(''); const [sort,setSort]=useState<LibrarySortOption>('updatedAt'); const [favorites,setFavorites]=useState(false)
  const { materials, isLoading } = useStudyMaterials({ query, sort }); const { confirmAndDelete, ConfirmDialog } = useDeleteMaterial()
  const filtered = useMemo(() => (materials ?? []).filter((m) => !favorites || m.favorite), [materials, favorites])
  const toggleFavorite = async (id:string, value:boolean) => { await updateStudyMaterial(id,{favorite:value}) }
  return <div>
    <PageHeader title="Study Library" subtitle="Your offline-first medical study workspace." action={<Button onClick={()=>navigate('/create')}><PlusCircle className="h-4 w-4"/> Create</Button>} />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><SearchBar placeholder="Search title, subject or topic…" value={query} onChange={(e)=>setQuery(e.target.value)} className="flex-1"/><select value={sort} onChange={(e)=>setSort(e.target.value as LibrarySortOption)} className="h-11 rounded-lg border border-ink/15 bg-white px-3 text-sm dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper">{sortOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select><Button variant={favorites?'primary':'secondary'} onClick={()=>setFavorites(v=>!v)}><Star className="h-4 w-4"/> Favorites</Button></div>
    {isLoading?<LoadingState label="Loading your library…"/>:filtered.length?<StudyMaterialList materials={filtered} onDelete={confirmAndDelete} />:<EmptyState icon={LibraryIcon} title={favorites?'No favorites yet':'Your library is empty'} description={favorites?'Star important materials to find them here.':'Import a PDF, image or text to start creating study material.'} action={<Button onClick={()=>navigate('/create')}><PlusCircle className="h-4 w-4"/> Create Study Material</Button>}/>} {ConfirmDialog}
    {filtered.length>0 && <Card className="mt-5 p-4 text-xs text-ink/50 dark:text-paper/50">Tip: use Favorites for high-yield topics. Material changes are saved locally on this device.</Card>}
    {/* Favorite toggling remains available from future card actions; keep this helper wired for data compatibility. */}
    <div className="hidden">{filtered.map(m=><button key={m.id} onClick={()=>toggleFavorite(m.id,!m.favorite)} />)}</div>
  </div>
}
