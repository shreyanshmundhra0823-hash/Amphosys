import { StudyMaterialCard } from './StudyMaterialCard'
import type { StudyMaterial } from '@/types/studyMaterial'

interface StudyMaterialListProps {
  materials: StudyMaterial[]
  onDelete: (material: StudyMaterial) => void
}

export function StudyMaterialList({ materials, onDelete }: StudyMaterialListProps) {
  return (
    <div className="flex flex-col gap-3">
      {materials.map((material) => (
        <StudyMaterialCard key={material.id} material={material} onDelete={onDelete} />
      ))}
    </div>
  )
}
