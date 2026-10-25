import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import CreateIssueRedirectPage from '../pages/CreateIssueRedirectPage'
import DashboardPage from '../pages/DashboardPage'
import IssueDetailPage from '../pages/IssueDetailPage'
import LoginPage from '../pages/LoginPage'
import ProfilePage from '../pages/ProfilePage'
import CreateProjectPage from '../pages/CreateProjectPage'
import ProjectMembersPage from '../pages/ProjectMembersPage'
import ProjectsPage from '../pages/ProjectsPage'
import UsersPage from '../pages/UsersPage'
import RouteGuard from '../security/RouteGuard'

function AppRouter() {
  const { isAuthenticated, isRestoringSession } = useAuth()

  if (isRestoringSession) {
    return <main className="dashboard-empty" role="status">Restoring session...</main>
  }

  return (
    <Routes>
      <Route
        path={ROUTES.home}
        element={<Navigate to={isAuthenticated ? ROUTES.projects : ROUTES.login} replace />}
      />
      <Route
        path={ROUTES.login}
        element={isAuthenticated ? <Navigate to={ROUTES.projects} replace /> : <LoginPage />}
      />
      <Route
        path={ROUTES.projects}
        element={
          <RouteGuard>
            <ProjectsPage />
          </RouteGuard>
        }
      />
      <Route
        path={ROUTES.dashboard}
        element={
          <Navigate to={ROUTES.projects} replace />
        }
      />
      <Route
        path={`${ROUTES.dashboard}/:projectId`}
        element={
          <RouteGuard>
            <DashboardPage />
          </RouteGuard>
        }
      />
      <Route
        path="/issues/:issueId"
        element={
          <RouteGuard>
            <IssueDetailPage />
          </RouteGuard>
        }
      />
      <Route
        path={ROUTES.users}
        element={
          <RouteGuard>
            <UsersPage />
          </RouteGuard>
        }
      />
      <Route path={ROUTES.createProject} element={<RouteGuard><CreateProjectPage /></RouteGuard>} />
      <Route path={`${ROUTES.projects}/:projectId/members`}
        element={<RouteGuard><ProjectMembersPage /></RouteGuard>} />
      <Route path={`${ROUTES.projects}/:projectId/users`}
        element={<RouteGuard><ProjectMembersPage /></RouteGuard>} />
      <Route
        path={`${ROUTES.createIssue}/:projectId`}
        element={
          <RouteGuard>
            <CreateIssueRedirectPage />
          </RouteGuard>
        }
      />
      <Route
        path={ROUTES.profile}
        element={
          <RouteGuard>
            <ProfilePage />
          </RouteGuard>
        }
      />
    </Routes>
  )
}

export default AppRouter
