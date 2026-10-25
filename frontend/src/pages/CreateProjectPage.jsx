// Raccoglie i dati di un progetto e apre la sua panoramica dopo il salvataggio.
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { createProject } from '../api/projectsApi'
import { getProjectDashboardRoute, ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import DashboardLayout from '../layouts/DashboardLayout'

function CreateProjectPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ name: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Invia la creazione alle API; il backend aggiunge l'amministratore come primo membro.
  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const created = await createProject({ name: draft.name.trim(), description: draft.description.trim() })
      void navigate(getProjectDashboardRoute(created.id))
    } catch (failure) {
      setError(failure.response?.data?.message || 'Unable to create the project.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (user?.role !== 'ADMIN') return <Navigate to={ROUTES.projects} replace />

  return (
    <DashboardLayout>
      <main className="create-project-page">
        <header className="page-heading">
          <div><h1>Create project</h1><p>A shared space for your team and its issues</p></div>
        </header>
        <section className="user-form-card project-create-card">
          <form onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Name</span>
              <input required maxLength={120} value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="form-field">
              <span>Description</span>
              <textarea required rows={4} maxLength={2000} value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            {error ? <p role="alert" className="status-message is-error">{error}</p> : null}
            <div className="page-heading-actions">
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create project'}
              </button>
              <Link className="secondary-button" to={ROUTES.projects}>Cancel</Link>
            </div>
          </form>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default CreateProjectPage
