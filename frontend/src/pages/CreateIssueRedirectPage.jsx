import { Navigate, useParams } from 'react-router-dom'
import { getProjectDashboardRoute, ROUTES } from '../config/routeConfig'
import { USE_MOCK_API } from '../config/apiConfig'

function CreateIssueRedirectPage() {
  const { projectId } = useParams()
  const targetRoute = projectId
    ? `${getProjectDashboardRoute(projectId)}${USE_MOCK_API ? '?modal=create-issue' : ''}`
    : ROUTES.projects

  return <Navigate replace to={targetRoute} />
}

export default CreateIssueRedirectPage
