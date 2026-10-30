import { useState } from 'react'
import { deleteProject } from '../api/projectsApi'
import ConfirmDialog from './ConfirmDialog'
import Icon from './Icon'

export default function DeleteProjectDialog({ project, onCancel, onDeleted }) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  async function confirmDelete() {
    if (isPending) return
    setIsPending(true)
    setError('')
    try {
      await deleteProject(project.id)
    } catch (failure) {
      setError(failure.response?.data?.message || 'Unable to delete this project. Please try again.')
      setIsPending(false)
      return
    }
    onDeleted(project)
  }
  return <ConfirmDialog title="Delete project?"
    description="This permanently deletes the project and all its issues, images, comments, notifications and memberships. User accounts will be kept. This cannot be undone."
    confirmLabel="Delete project" pendingLabel="Deleting..." isPending={isPending}
    error={error} onCancel={onCancel} onConfirm={confirmDelete}>
    <div className="confirmation-project"><Icon name="folder" /><strong>{project.name}</strong></div>
  </ConfirmDialog>
}
