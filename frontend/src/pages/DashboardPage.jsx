import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import DashboardLayout from '../layouts/DashboardLayout'
import { getIssues } from '../api/issuesApi'
import { getProjectById } from '../api/projectsApi'
import { formatEnumLabel, formatRelativeDate } from '../utils/formatters'

const STATUS_CLASS_MAP = {
  OPEN: 'is-red',
  IN_PROGRESS: 'is-orange',
  CLOSED: 'is-green',
}

const ISSUE_TYPE_OPTIONS = ['BUG', 'FEATURE', 'DOCUMENTATION', 'QUESTION']
const ISSUE_STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'CLOSED']
const ISSUE_PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const EMPTY_FILTERS = {
  type: '',
  status: '',
  priority: '',
}

function formatIssueCount(count) {
  return `${count} issue${count === 1 ? '' : 's'}`
}

function DashboardPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [issues, setIssues] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
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

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesType = !filters.type || issue.type === filters.type
    const matchesStatus = !filters.status || issue.status === filters.status
    const matchesPriority = !filters.priority || issue.priority === filters.priority

    return matchesType && matchesStatus && matchesPriority
  })

  const hasActiveFilters = Boolean(filters.type || filters.status || filters.priority)

  const stats = [
    {
      label: 'Total Issues',
      value: filteredIssues.length,
      icon: '!',
      accentClass: 'is-blue',
    },
    {
      label: 'Open',
      value: filteredIssues.filter((issue) => issue.status === 'OPEN').length,
      icon: 'o',
      accentClass: 'is-red',
    },
    {
      label: 'In Progress',
      value: filteredIssues.filter((issue) => issue.status === 'IN_PROGRESS').length,
      icon: '~',
      accentClass: 'is-orange',
    },
    {
      label: 'Closed',
      value: filteredIssues.filter((issue) => issue.status === 'CLOSED').length,
      icon: 'v',
      accentClass: 'is-green',
    },
  ]

  let filterSummary = `Showing all ${formatIssueCount(issues.length)}`

  if (hasActiveFilters) {
    filterSummary = `Showing ${formatIssueCount(filteredIssues.length)} of ${formatIssueCount(issues.length)}`
  }

  if (isLoading) {
    filterSummary = 'Loading issues for this project...'
  }

  if (errorMessage) {
    filterSummary = 'Issue filters will be available once the dashboard loads correctly.'
  }

  return (
    <DashboardLayout projectId={projectId}>
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
            <section className="issues-toolbar" aria-label="Issue filters">
              <div className="issues-toolbar-header">
                <div>
                  <strong>Filter Issues</strong>
                  <p>{filterSummary}</p>
                </div>
                <button
                  className="issues-filter-reset"
                  disabled={!hasActiveFilters}
                  onClick={clearFilters}
                  type="button"
                >
                  Clear filters
                </button>
              </div>

              <div className="issues-filters">
                <label className="issues-filter-field">
                  <span>Type</span>
                  <select
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    disabled={isLoading || Boolean(errorMessage)}
                  >
                    <option value="">All types</option>
                    {ISSUE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatEnumLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="issues-filter-field">
                  <span>Status</span>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    disabled={isLoading || Boolean(errorMessage)}
                  >
                    <option value="">All statuses</option>
                    {ISSUE_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatEnumLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="issues-filter-field">
                  <span>Priority</span>
                  <select
                    name="priority"
                    value={filters.priority}
                    onChange={handleFilterChange}
                    disabled={isLoading || Boolean(errorMessage)}
                  >
                    <option value="">All priorities</option>
                    {ISSUE_PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatEnumLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

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
              {!isLoading && !errorMessage && !filteredIssues.length ? (
                <section className="dashboard-empty issues-empty">
                  <p className="status-message">
                    {hasActiveFilters
                      ? 'No issues match the selected filters.'
                      : 'No issues have been created for this project yet.'}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      className="issues-filter-reset"
                      onClick={clearFilters}
                      type="button"
                    >
                      Reset filters
                    </button>
                  ) : null}
                </section>
              ) : null}
              {!isLoading && !errorMessage
                ? filteredIssues.map((issue) => (
                    <Link
                      className="issue-card issue-card-link"
                      key={issue.id}
                      to={`/issues/${issue.id}`}
                    >
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
                          {formatEnumLabel(issue.status)}
                        </span>
                        <span className="issue-chip">{formatEnumLabel(issue.type)}</span>
                        <span className="issue-chip">
                          Priority {formatEnumLabel(issue.priority)}
                        </span>
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
                    </Link>
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
