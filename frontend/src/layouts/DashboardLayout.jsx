// Compone la barra orizzontale, il contenuto della pagina e il modulo di creazione issue.
import { useSearchParams } from 'react-router-dom'
import CreateIssueModal from '../components/CreateIssueModal'
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
