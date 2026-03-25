import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function DashboardLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-shell">
        <Topbar />
        <div className="app-content">{children}</div>
      </div>
    </div>
  )
}

export default DashboardLayout
