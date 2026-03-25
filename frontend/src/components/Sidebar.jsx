import AppLogo from './AppLogo'

function Sidebar() {
  return (
    <aside className="app-sidebar">
      <AppLogo size="small" />

      <nav className="sidebar-nav" aria-label="Primary navigation">
        <button className="sidebar-nav-item is-active" type="button">
          <span className="sidebar-nav-icon" aria-hidden="true">
            []
          </span>
          <span>Projects</span>
        </button>
      </nav>
    </aside>
  )
}

export default Sidebar
