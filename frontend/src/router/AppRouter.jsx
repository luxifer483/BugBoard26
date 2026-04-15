import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import DashboardPage from '../pages/DashboardPage'
import IssueDetailPage from '../pages/IssueDetailPage'
import LoginPage from '../pages/LoginPage'
import ProjectsPage from '../pages/ProjectsPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRouter() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/projects' : '/login'} replace />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/projects" replace /> : <LoginPage />}
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/:projectId"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
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
