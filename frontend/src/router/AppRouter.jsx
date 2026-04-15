import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import DashboardPage from '../pages/DashboardPage'
import IssueDetailPage from '../pages/IssueDetailPage'
import LoginPage from '../pages/LoginPage'
import ProjectsPage from '../pages/ProjectsPage'
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
          <ProtectedRoute>
            <IssueDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default AppRouter
