import { NavLink } from 'react-router-dom'
import AppLogo from './AppLogo'

function Sidebar() {
  return (
    <aside className="app-sidebar">
      <AppLogo size="small" />

      <nav className="sidebar-nav" aria-label="Primary navigation">
        <NavLink
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' is-active' : ''}`
          }
          to="/projects"
        >
          <span className="sidebar-nav-icon" aria-hidden="true">
            []
          </span>
          <span>Projects</span>
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' is-active' : ''}`
          }
          to="/dashboard"
        >
          <span className="sidebar-nav-icon" aria-hidden="true">
            #
          </span>
          <span>Dashboard</span>
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar
