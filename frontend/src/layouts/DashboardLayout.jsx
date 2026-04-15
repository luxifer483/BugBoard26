import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function DashboardLayout({ children, projectId = '' }) {
  return (
    <div className="app-layout">
      <Sidebar activeProjectId={projectId} />
      <div className="app-main-shell">
        <Topbar />
        <div className="app-content">{children}</div>
      </div>
    </div>
  )
}

export default DashboardLayout
