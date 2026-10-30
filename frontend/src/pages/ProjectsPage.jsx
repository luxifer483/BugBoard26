import DeleteProjectDialog from '../components/DeleteProjectDialog'
import Icon from '../components/Icon'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjectDashboardRoute } from '../config/routeConfig'
import DashboardLayout from '../layouts/DashboardLayout'
import { getProjects } from '../api/projectsApi'
import { useAuth } from '../hooks/useAuth'
import { formatRelativeDate, getProjectAccent } from '../utils/formatters'

function ProjectsPage() {
  const { user, refreshNotifications } = useAuth()
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

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

    void loadProjects()

    return () => {
      isMounted = false
    }
  }, [])

  function handleProjectDeleted(project) {
    setProjects((current) => current.filter((item) => item.id !== project.id))
    setProjectToDelete(null)
    setSuccessMessage(`Project "${project.name}" deleted.`)
    refreshNotifications?.()
  }

  const stats = [
    {
      label: 'Total Projects',
      value: projects.length,
      icon: 'folder',
      accentClass: 'is-blue',
    },
    {
      label: 'Total Issues',
      value: projects.reduce((sum, project) => sum + (project.totalIssues ?? 0), 0),
      icon: 'issues',
      accentClass: 'is-orange',
    },
    {
      label: 'To Do Issues',
      value: projects.reduce((sum, project) => sum + (project.openIssues ?? 0), 0),
      icon: 'todo',
      accentClass: 'is-red',
    },
    {
      label: 'Closed Issues',
      value: projects.reduce((sum, project) => sum + (project.closedIssues ?? 0), 0),
      icon: 'closed',
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
          {stats.map((item) => (
            <article className="project-stat-card" key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div
                className={`project-stat-icon ${item.accentClass}`}
                aria-hidden="true"
              >
                <Icon name={item.icon} />
              </div>
            </article>
          ))}
        </section>

        {successMessage ? <p role="status" className="status-message is-success">{successMessage}</p> : null}
        <section className="projects-grid" aria-label="Projects list">
          {isLoading ? <p className="status-message">Loading projects...</p> : null}
          {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}
          {!isLoading && !errorMessage && !projects.length ? (
            <p className="status-message">{user?.role === 'ADMIN'
              ? 'No projects yet. Create a project to get started.'
              : 'You do not belong to any projects yet. Contact an administrator.'}</p>
          ) : null}
          {!isLoading && !errorMessage
            ? projects.map((project) => (
                <article className="project-card-container" key={project.id}>
                <Link
                  className="project-card project-card-link"
                  to={getProjectDashboardRoute(project.id)}
                >
                  <div className="project-card-header">
                    <div
                      className={`project-card-badge ${getProjectAccent(project.id)}`}
                      aria-hidden="true"
                    >
                      <Icon name="folder" />
                    </div>
                    <div>
                      <h2>{project.name}</h2>
                      <p>{project.description}</p>
                    </div>
                  </div>

                  <div className="project-card-stats">
                    <div>
                      <span>Total</span>
                      <strong>{project.totalIssues}</strong>
                    </div>
                    <div>
                      <span>To do</span>
                      <strong className="project-open-count">{project.openIssues}</strong>
                    </div>
                    <div>
                      <span>Closed</span>
                      <strong className="project-closed-count">{project.closedIssues}</strong>
                    </div>
                  </div>

                  <div className="project-card-footer">
                    <span>{project.memberCount} members</span>
                    <span>{formatRelativeDate(project.updatedAt)}</span>
                  </div>
                </Link>
                {user?.role === 'ADMIN' ? (
                  <div className="project-card-actions">
                    <button className="project-delete-button" type="button"
                      aria-label={`Delete project ${project.name}`}
                      onClick={() => setProjectToDelete(project)}>
                      <Icon name="trash" size={18} />
                      Delete project
                    </button>
                  </div>
                ) : null}
                </article>
              ))
            : null}
        </section>
        {projectToDelete ? <DeleteProjectDialog project={projectToDelete}
          onCancel={() => setProjectToDelete(null)} onDeleted={handleProjectDeleted} /> : null}
      </main>
    </DashboardLayout>
  )
}

export default ProjectsPage
