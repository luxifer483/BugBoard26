// Gestisce gli account globali senza aggiungerli automaticamente a un progetto.
import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { createUser, getUsers } from '../api/usersApi'
import UserForm from '../components/UserForm'
import UserList from '../components/UserList'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import DashboardLayout from '../layouts/DashboardLayout'

function UsersPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const canManageUsers = user?.role === 'ADMIN'
  const isCreateOpen = searchParams.get('create') === '1'
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Carica l'elenco globale soltanto per gli amministratori.
  useEffect(() => {
    if (!canManageUsers) return undefined
    let active = true
    getUsers()
      .then((response) => { if (active) setUsers(response.items) })
      .catch(() => { if (active) setErrorMessage('Unable to load user accounts.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [canManageUsers])

  // Chiude il modulo lasciando visibile l'elenco degli account.
  function closeCreateForm() {
    const next = new URLSearchParams(searchParams)
    next.delete('create')
    setSearchParams(next)
  }

  // Salva solo l'account: l'appartenenza ai progetti viene gestita nell'altra schermata.
  async function handleCreateUser(payload) {
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const created = await createUser(payload)
      setUsers((current) => [...current, created].sort((a, b) => a.fullName.localeCompare(b.fullName)))
      setSuccessMessage(`${created.fullName}'s account has been created.`)
      closeCreateForm()
      return true
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to create the account.')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canManageUsers) return <Navigate to={ROUTES.projects} replace />

  return (
    <DashboardLayout>
      <main className="user-management-page">
        <header className="page-heading">
          <div><h1>User accounts</h1><p>Create accounts here, then add them to projects.</p></div>
          {!isCreateOpen ? <Link className="primary-button" to={`${ROUTES.users}?create=1`}>Create user</Link> : null}
        </header>
        {isLoading ? <p className="status-message">Loading user accounts...</p> : null}
        {errorMessage ? <p role="alert" className="status-message is-error">{errorMessage}</p> : null}
        {successMessage ? <p role="status" className="status-message is-success">{successMessage}</p> : null}
        <div className={isCreateOpen ? 'user-management-grid' : 'accounts-list'}>
          {!isLoading ? <UserList members={users} title="All accounts" showJoinedDate={false} /> : null}
          {isCreateOpen && !isLoading ? <UserForm onCreateUser={handleCreateUser} onCancel={closeCreateForm} isSubmitting={isSubmitting} /> : null}
        </div>
      </main>
    </DashboardLayout>
  )
}

export default UsersPage
