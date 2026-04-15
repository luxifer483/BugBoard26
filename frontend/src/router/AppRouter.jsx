import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import DashboardPage from '../pages/DashboardPage'
import IssueDetailPage from '../pages/IssueDetailPage'
import LoginPage from '../pages/LoginPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import ProjectsPage from '../pages/ProjectsPage'
import UserManagementPage from '../pages/UserManagementPage'
import RouteGuard from '../security/RouteGuard'

function AppRouter() {
  const { isAuthenticated } = useAuth()

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
          <RouteGuard>
            <DashboardPage />
          </RouteGuard>
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
        path={`${ROUTES.projects}/:projectId/users`}
        element={
          <RouteGuard>
            <UserManagementPage />
          </RouteGuard>
        }
      />
      <Route
        path={`${ROUTES.createIssue}/:projectId`}
        element={
          <RouteGuard>
            <PlaceholderPage type="createIssue" />
          </RouteGuard>
        }
      />
      <Route
        path={ROUTES.profile}
        element={
          <RouteGuard>
            <PlaceholderPage type="profile" />
          </RouteGuard>
        }
      />
    </Routes>
  )
}

export default AppRouter
