import { Navigate, useParams } from 'react-router-dom'
import { getProjectDashboardRoute, ROUTES } from '../config/routeConfig'

function CreateIssueRedirectPage() {
  const { projectId } = useParams()
  const targetRoute = projectId
    ? `${getProjectDashboardRoute(projectId)}?modal=create-issue`
    : ROUTES.projects

  return <Navigate replace to={targetRoute} />
}

export default CreateIssueRedirectPage
