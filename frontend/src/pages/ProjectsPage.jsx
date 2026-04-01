import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjectDashboardRoute } from '../config/routeConfig'
import DashboardLayout from '../layouts/DashboardLayout'
import { getProjects } from '../api/projectsApi'
import { formatRelativeDate, getProjectAccent } from '../utils/formatters'

function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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

  const stats = [
    {
      label: 'Total Projects',
      value: projects.length,
      icon: '[]',
      accentClass: 'is-blue',
    },
    {
      label: 'Total Issues',
      value: projects.reduce((sum, project) => sum + project.totalIssues, 0),
      icon: '!',
      accentClass: 'is-orange',
    },
    {
      label: 'Open Issues',
      value: projects.reduce((sum, project) => sum + project.openIssues, 0),
      icon: 'o',
      accentClass: 'is-red',
    },
    {
      label: 'Closed Issues',
      value: projects.reduce((sum, project) => sum + project.closedIssues, 0),
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
                {item.icon}
              </div>
            </article>
          ))}
        </section>

        <section className="projects-grid" aria-label="Projects list">
          {isLoading ? <p className="status-message">Loading projects...</p> : null}
          {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}
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

                  <div className="project-card-stats">
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
                  </div>

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
