import { Link, useParams } from 'react-router-dom'
import { getProjectDashboardRoute, ROUTES } from '../config/routeConfig'
import DashboardLayout from '../layouts/DashboardLayout'

const PAGE_CONTENT = {
  createIssue: {
    title: 'Create Issue',
    description: 'Issue creation will be added in the next step.',
  },
  profile: {
    title: 'Profile',
    description: 'User profile settings will be available here.',
  },
}

function PlaceholderPage({ type }) {
  const { projectId } = useParams()
  const content = PAGE_CONTENT[type] || PAGE_CONTENT.profile
  const backRoute = projectId ? getProjectDashboardRoute(projectId) : ROUTES.projects

  return (
    <DashboardLayout projectId={projectId}>
      <main className="placeholder-page">
        <section className="dashboard-empty">
          <h1>{content.title}</h1>
          <p className="status-message">{content.description}</p>
          <Link className="dashboard-link" to={backRoute}>
            Back to dashboard
          </Link>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default PlaceholderPage
