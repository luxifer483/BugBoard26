import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getProjectById } from '../api/projectsApi'
import {
  getProjectDashboardRoute,
  getProjectUserManagementRoute,
  ROUTES,
} from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import AppLogo from './AppLogo'

const ACTIVE_PROJECT_STORAGE_KEY = 'bugboard26.activeProjectId'

function Sidebar({ activeProjectId = '' }) {
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [storedProjectId, setStoredProjectId] = useState(() => {
    return window.sessionStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) || ''
  })
  const [project, setProject] = useState(null)
  const currentProjectId = activeProjectId || projectId || storedProjectId

  useEffect(() => {
    if (location.pathname === ROUTES.projects) {
      window.sessionStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY)
      setStoredProjectId('')
      setProject(null)
      return
    }

    if (activeProjectId || projectId) {
      const nextProjectId = activeProjectId || projectId
      window.sessionStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, nextProjectId)
      setStoredProjectId(nextProjectId)
    }
  }, [activeProjectId, location.pathname, projectId])

  useEffect(() => {
    if (!currentProjectId) {
      setProject(null)
      return
    }

    let isMounted = true

    async function loadProjectNavigation() {
      const projectResponse = await getProjectById(currentProjectId)

      if (isMounted) {
        setProject(projectResponse)
      }
    }

    loadProjectNavigation()

    return () => {
      isMounted = false
    }
  }, [currentProjectId])

  const dashboardRoute = currentProjectId
    ? getProjectDashboardRoute(currentProjectId)
    : ROUTES.dashboard
  const isCreateIssueOpen = location.search.includes('modal=create-issue')

  function handleOpenCreateIssue() {
    if (!currentProjectId) {
      return
    }

    const searchParams = new URLSearchParams(location.search)
    searchParams.set('modal', 'create-issue')

    navigate({
      pathname: location.pathname,
      search: searchParams.toString(),
    })
  }

  return (
    <aside className="app-sidebar">
      <AppLogo size="small" />

      {project ? (
        <section className="sidebar-project" aria-label="Current project">
          <div className="sidebar-project-icon" aria-hidden="true">
            []
          </div>
          <div>
            <strong>{project.name}</strong>
            <span>Active Project</span>
          </div>
        </section>
      ) : null}

      <nav className="sidebar-nav" aria-label="Primary navigation">
        <NavLink
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' is-active' : ''}`
          }
          to={ROUTES.projects}
        >
          <span className="sidebar-nav-icon" aria-hidden="true">
            []
          </span>
          <span>Projects</span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' is-active' : ''}`
          }
          to={dashboardRoute}
        >
          <span className="sidebar-nav-icon" aria-hidden="true">
            #
          </span>
          <span>Dashboard</span>
        </NavLink>
        {currentProjectId ? (
          <button
            className={`sidebar-nav-item${isCreateIssueOpen ? ' is-active' : ''}`}
            onClick={handleOpenCreateIssue}
            type="button"
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              +
            </span>
            <span>Create Issue</span>
          </button>
        ) : null}
        {currentProjectId && user?.role === 'Admin' ? (
          <NavLink
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' is-active' : ''}`
            }
            to={getProjectUserManagementRoute(currentProjectId)}
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              oo
            </span>
            <span>User Management</span>
          </NavLink>
        ) : null}
        <NavLink
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' is-active' : ''}`
          }
          to={ROUTES.profile}
        >
          <span className="sidebar-nav-icon" aria-hidden="true">
            o
          </span>
          <span>Profile</span>
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar
