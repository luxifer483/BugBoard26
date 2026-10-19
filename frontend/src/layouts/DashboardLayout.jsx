import { useSearchParams } from 'react-router-dom'
import CreateIssueModal from '../components/CreateIssueModal'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function DashboardLayout({ children, projectId = '' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const isCreateIssueModalOpen = searchParams.get('modal') === 'create-issue'

  function handleCloseCreateIssueModal() {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('modal')
    setSearchParams(nextSearchParams)
  }

  return (
    <>
      <div className="app-layout">
        <Sidebar activeProjectId={projectId} />
        <div className="app-main-shell">
          <Topbar />
          <div className="app-content">{children}</div>
        </div>
      </div>
      <CreateIssueModal
        isOpen={Boolean(projectId) && isCreateIssueModalOpen}
        onClose={handleCloseCreateIssueModal}
        projectId={projectId}
      />
    </>
  )
}

export default DashboardLayout
