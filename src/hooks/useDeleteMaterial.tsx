import { useState } from 'react'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { deleteStudyMaterial } from '@/db/studyMaterials'
import { toFriendlyMessage } from '@/lib/errors'
import { useToast } from './useToast'
import type { StudyMaterial } from '@/types/studyMaterial'

/**
 * Shared "delete with confirmation" flow for study materials, so Dashboard
 * and Library don't duplicate the same modal + error handling logic.
 */
export function useDeleteMaterial() {
  const [pending, setPending] = useState<StudyMaterial | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { showToast } = useToast()

  const confirmAndDelete = (material: StudyMaterial) => setPending(material)

  const handleConfirm = async () => {
    if (!pending) return
    setIsDeleting(true)
    try {
      await deleteStudyMaterial(pending.id)
      showToast(`Deleted "${pending.title}"`, 'success')
      setPending(null)
    } catch (error) {
      showToast(toFriendlyMessage(error, 'Could not delete this material.'), 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const ConfirmDialog = (
    <Modal
      open={pending !== null}
      onClose={() => setPending(null)}
      title="Delete study material?"
      footer={
        <>
          <Button variant="secondary" onClick={() => setPending(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      {pending && (
        <p>
          This will permanently remove <strong>"{pending.title}"</strong> and its imported source
          from this device. This can't be undone.
        </p>
      )}
    </Modal>
  )

  return { confirmAndDelete, ConfirmDialog }
}
