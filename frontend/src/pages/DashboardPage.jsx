import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import DashboardLayout from '../layouts/DashboardLayout'
import { getIssues } from '../api/issuesApi'
import { getProjectById } from '../api/projectsApi'
import { formatRelativeDate } from '../utils/formatters'

const STATUS_CLASS_MAP = {
  OPEN: 'is-red',
  IN_PROGRESS: 'is-orange',
  CLOSED: 'is-green',
}

function DashboardPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [issues, setIssues] = useState([])
  const [isLoading, setIsLoading] = useState(Boolean(projectId))
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      setIssues([])
      setIsLoading(false)
      setErrorMessage('')
      return
    }

    let isMounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [projectResponse, issuesResponse] = await Promise.all([
          getProjectById(projectId),
          getIssues(projectId),
        ])

        if (!isMounted) {
          return
        }

        if (!projectResponse) {
          setErrorMessage('Project not found.')
          setProject(null)
          setIssues([])
          return
        }

        setProject(projectResponse)
        setIssues(issuesResponse.items)
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load the selected project dashboard.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [projectId])

  const stats = [
    {
      label: 'Total Issues',
      value: issues.length,
      icon: '!',
      accentClass: 'is-blue',
    },
    {
      label: 'Open',
      value: issues.filter((issue) => issue.status === 'OPEN').length,
      icon: 'o',
      accentClass: 'is-red',
    },
    {
      label: 'In Progress',
      value: issues.filter((issue) => issue.status === 'IN_PROGRESS').length,
      icon: '~',
      accentClass: 'is-orange',
    },
    {
      label: 'Closed',
      value: issues.filter((issue) => issue.status === 'CLOSED').length,
      icon: 'v',
      accentClass: 'is-green',
    },
  ]

  return (
    <DashboardLayout>
      <main className="projects-page">
        <section className="projects-hero">
          <h1>Dashboard</h1>
          <p>
            {project
              ? `${project.name} issue overview`
              : 'Select a project to open its dashboard'}
          </p>
        </section>

        {!projectId ? (
          <section className="dashboard-empty">
            <p className="status-message">
              Open a project from the projects page to see its issues dashboard.
            </p>
            <Link className="dashboard-link" to={ROUTES.projects}>
              Go to projects
            </Link>
          </section>
        ) : null}

        {projectId ? (
          <>
            <section className="projects-stats" aria-label="Project issue statistics">
              {stats.map((item) => (
                <article className="project-stat-card" key={item.label}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className={`project-stat-icon ${item.accentClass}`} aria-hidden="true">
                    {item.icon}
                  </div>
                </article>
              ))}
            </section>

            <section className="issues-list" aria-label="Selected project issues">
              {isLoading ? <p className="status-message">Loading dashboard...</p> : null}
              {errorMessage ? <p className="status-message is-error">{errorMessage}</p> : null}
              {!isLoading && !errorMessage
                ? issues.map((issue) => (
                    <article className="issue-card" key={issue.id}>
                      <div className="issue-card-header">
                        <div className="project-card-badge is-blue" aria-hidden="true">
                          !
                        </div>
                        <div className="issue-card-title">
                          <span className="issue-card-code">{issue.code}</span>
                          <h2>{issue.title}</h2>
                          <p>{issue.description}</p>
                        </div>
                      </div>

                      <div className="issue-card-meta">
                        <span
                          className={`issue-status ${STATUS_CLASS_MAP[issue.status] || 'is-blue'}`}
                        >
                          {issue.status.replace('_', ' ')}
                        </span>
                        <span className="issue-chip">{issue.type}</span>
                        <span className="issue-chip">Priority {issue.priority}</span>
                      </div>

                      <div className="issue-card-details">
                        <div>
                          <span>Assignee</span>
                          <strong>{issue.assignee?.fullName || 'Unassigned'}</strong>
                        </div>
                        <div>
                          <span>Reporter</span>
                          <strong>{issue.reporter?.fullName || 'Unknown'}</strong>
                        </div>
                        <div>
                          <span>Last update</span>
                          <strong>{formatRelativeDate(issue.updatedAt)}</strong>
                        </div>
                      </div>
                    </article>
                  ))
                : null}
            </section>
          </>
        ) : null}
      </main>
    </DashboardLayout>
  )
}

export default DashboardPage
