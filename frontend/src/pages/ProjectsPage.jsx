import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjectDashboardRoute } from '../config/routeConfig'
import DashboardLayout from '../layouts/DashboardLayout'
import { createProject, getProjects } from '../api/projectsApi'
import { USE_MOCK_API } from '../config/apiConfig'
import { useAuth } from '../hooks/useAuth'
import { formatRelativeDate, getProjectAccent } from '../utils/formatters'

function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [projectDraft, setProjectDraft] = useState({ name: '', description: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadProjects() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await getProjects()

        if (isMounted) {
          setProjects(response.items)
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load projects right now.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProjects()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleCreateProject(event) {
    event.preventDefault()
    setIsCreating(true)
    setCreateError('')
    try {
      const created = await createProject(projectDraft)
      setProjects((current) => [created, ...current])
      setProjectDraft({ name: '', description: '' })
    } catch (error) {
      setCreateError(error.response?.data?.message || 'Unable to create the project.')
    } finally {
      setIsCreating(false)
    }
  }

  const stats = [
    {
      label: 'Total Projects',
      value: projects.length,
      icon: '[]',
      accentClass: 'is-blue',
    },
    {
      label: 'Total Issues',
      value: projects.reduce((sum, project) => sum + (project.totalIssues ?? 0), 0),
      icon: '!',
      accentClass: 'is-orange',
    },
    {
      label: 'Open Issues',
      value: projects.reduce((sum, project) => sum + (project.openIssues ?? 0), 0),
      icon: 'o',
      accentClass: 'is-red',
    },
    {
      label: 'Closed Issues',
      value: projects.reduce((sum, project) => sum + (project.closedIssues ?? 0), 0),
      icon: 'v',
      accentClass: 'is-green',
    },
  ]

  return (
    <DashboardLayout>
      <main className="projects-page">
        <section className="projects-hero">
          <h1>Projects</h1>
          <p>Select a project to view and manage issues</p>
        </section>

        <section className="projects-stats" aria-label="Project statistics">
          {stats.filter((item) => USE_MOCK_API || item.label === 'Total Projects').map((item) => (
            <article className="project-stat-card" key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div
                className={`project-stat-icon ${item.accentClass}`}
                aria-hidden="true"
              >
                {item.icon}
              </div>
            </article>
          ))}
        </section>

        {user?.role === 'ADMIN' ? (
          <section className="user-form-card project-create-card" aria-label="Create project">
            <h2>Create Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="form-field-grid">
                <label className="form-field">
                  <span>Name</span>
                  <input required maxLength={120} value={projectDraft.name}
                    onChange={(event) => setProjectDraft((draft) => ({ ...draft, name: event.target.value }))} />
                </label>
                <label className="form-field">
                  <span>Description</span>
                  <input required maxLength={2000} value={projectDraft.description}
                    onChange={(event) => setProjectDraft((draft) => ({ ...draft, description: event.target.value }))} />
                </label>
              </div>
              {createError ? <p role="alert" className="status-message is-error">{createError}</p> : null}
              <button className="primary-button" type="submit" disabled={isCreating || isLoading || Boolean(errorMessage)}>
                {isCreating ? 'Creating...' : 'Create Project'}
              </button>
            </form>
          </section>
        ) : null}

        <section className="projects-grid" aria-label="Projects list">
          {isLoading ? <p className="status-message">Loading projects...</p> : null}
          {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}
          {!isLoading && !errorMessage && !projects.length ? (
            <p className="status-message">{user?.role === 'ADMIN'
              ? 'No projects yet. Create your first project above.'
              : 'You do not belong to any projects yet. Contact an administrator.'}</p>
          ) : null}
          {!isLoading && !errorMessage
            ? projects.map((project) => (
                <Link
                  className="project-card project-card-link"
                  key={project.id}
                  to={getProjectDashboardRoute(project.id)}
                >
                  <div className="project-card-header">
                    <div
                      className={`project-card-badge ${getProjectAccent(project.id)}`}
                      aria-hidden="true"
                    >
                      []
                    </div>
                    <div>
                      <h2>{project.name}</h2>
                      <p>{project.description}</p>
                    </div>
                  </div>

                  {USE_MOCK_API ? <div className="project-card-stats">
                    <div>
                      <span>Total</span>
                      <strong>{project.totalIssues}</strong>
                    </div>
                    <div>
                      <span>Open</span>
                      <strong className="project-open-count">{project.openIssues}</strong>
                    </div>
                    <div>
                      <span>Closed</span>
                      <strong className="project-closed-count">{project.closedIssues}</strong>
                    </div>
                  </div> : <p className="status-message">Status: {project.status}</p>}

                  <div className="project-card-footer">
                    <span>{project.memberCount} members</span>
                    <span>{formatRelativeDate(project.updatedAt)}</span>
                  </div>
                </Link>
              ))
            : null}
        </section>
      </main>
    </DashboardLayout>
  )
}

export default ProjectsPage
