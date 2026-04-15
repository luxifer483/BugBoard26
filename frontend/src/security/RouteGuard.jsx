import { Navigate } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'

function RouteGuard({ children }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />
  }

  return children
}

export default RouteGuard
