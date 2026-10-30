import ConfirmDialog from '../components/ConfirmDialog'
import Icon from '../components/Icon'
// Gestisce solo le appartenenze al progetto, scegliendo account gia esistenti.
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { addExistingUserToProject, getProjectMembers, removeUserFromProject } from '../api/projectMembersApi'
import { getProjectById } from '../api/projectsApi'
import { getUsers } from '../api/usersApi'
import UserList from '../components/UserList'
import { getProjectDashboardRoute, ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import DashboardLayout from '../layouts/DashboardLayout'

function ProjectMembersPage() {
  const { projectId } = useParams()
  return <ProjectMembersContent key={projectId} projectId={projectId} />
}

function ProjectMembersContent({ projectId }) {
  const { user } = useAuth()
  const canManageMembers = user?.role === 'ADMIN'
  const [project, setProject] = useState(null)
  const [users, setUsers] = useState([])
  const [members, setMembers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [memberToRemove, setMemberToRemove] = useState(null)

  // Legge separatamente progetto, account disponibili e membri attuali.
  useEffect(() => {
    if (!canManageMembers) return undefined
    let active = true
    Promise.all([getProjectById(projectId), getUsers(), getProjectMembers(projectId)])
      .then(([loadedProject, accounts, memberships]) => {
        if (!active) return
        if (!loadedProject) throw new Error('Project not found')
        setProject(loadedProject)
        setUsers(accounts.items)
        setMembers(memberships.items)
      })
      .catch(() => { if (active) setErrorMessage('Unable to load project members.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [projectId, canManageMembers])

  const availableUsers = users.filter((account) => !members.some((member) => String(member.userId) === String(account.id)))

  // Aggiunge una membership senza creare o modificare l'account selezionato.
  async function handleAddMember(event) {
    event.preventDefault()
    if (!selectedUserId) return
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const member = await addExistingUserToProject({ projectId: Number(projectId), userId: Number(selectedUserId) })
      setMembers((current) => [...current, member])
      setSelectedUserId('')
      setSuccessMessage(`${member.fullName} has been added to the project.`)
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to add this member.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Rimuove solo l'appartenenza; l'account e il suo ruolo globale restano disponibili.
  async function handleRemoveMember(member) {
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await removeUserFromProject({ projectId: Number(projectId), userId: member.userId })
      setMembers((current) => current.filter((item) => item.userId !== member.userId))
      setSuccessMessage(`${member.fullName} has been removed from the project.`)
      setMemberToRemove(null)
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to remove this member.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canManageMembers) return <Navigate to={ROUTES.projects} replace />

  return (
    <DashboardLayout projectId={projectId}>
      <main className="user-management-page">
        <header className="page-heading">
          <div><h1>Project members</h1><p>{project?.name || 'Manage the project team'}</p></div>
          <Link className="secondary-button" to={getProjectDashboardRoute(projectId)}>Back to issues</Link>
        </header>
        {isLoading ? <p className="status-message">Loading project members...</p> : null}
        {errorMessage ? <p role="alert" className="status-message is-error">{errorMessage}</p> : null}
        {successMessage ? <p role="status" className="status-message is-success">{successMessage}</p> : null}
        {!isLoading && project ? (
          <div className="user-management-grid">
            <UserList members={members} onRemove={(member) => { setErrorMessage(''); setMemberToRemove(member) }} isSubmitting={isSubmitting} />
            <section className="user-form-card">
              <h2>Add a member</h2>
              <p>Choose an existing account to join this project.</p>
              <form className="user-form" onSubmit={handleAddMember}>
                <label className="form-field">
                  <span>User account</span>
                  <select required value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}
                    disabled={isSubmitting || !availableUsers.length}>
                    <option value="">Select an account</option>
                    {availableUsers.map((account) => <option key={account.id} value={account.id}>{account.fullName} — {account.email}</option>)}
                  </select>
                </label>
                {!availableUsers.length ? <p>All registered accounts are already members.</p> : null}
                <button className="user-form-submit" type="submit" disabled={isSubmitting || !selectedUserId}>
                  {isSubmitting ? 'Adding...' : 'Add to project'}
                </button>
              </form>
              <Link className="account-management-link" to={ROUTES.users}>Manage user accounts</Link>
            </section>
          </div>
        ) : null}
        {memberToRemove ? (
          <ConfirmDialog title="Remove project member?"
            description="This user will lose membership access to the project. Their account and global role will be kept. Administrators retain their global access."
            confirmLabel="Remove member" pendingLabel="Removing..." isPending={isSubmitting}
            error={errorMessage} onCancel={() => setMemberToRemove(null)}
            onConfirm={() => handleRemoveMember(memberToRemove)}>
            <div className="confirmation-member">
              <span className="confirmation-member-icon"><Icon name="user" size={24} /></span>
              <div><strong>{memberToRemove.fullName}</strong><span>{memberToRemove.email}</span></div>
            </div>
            <div className="confirmation-project"><Icon name="folder" /><strong>{project?.name}</strong></div>
          </ConfirmDialog>
        ) : null}
      </main>
    </DashboardLayout>
  )
}

export default ProjectMembersPage
