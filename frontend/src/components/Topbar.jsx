import { useAuth } from '../hooks/useAuth'
import { getInitials } from '../utils/formatters'

function Topbar() {
  const { user, notifications, isLoadingNotifications } = useAuth()

  return (
    <header className="topbar">
      <label className="topbar-search" aria-label="Search issues">
        <span className="topbar-search-icon" aria-hidden="true">
          o
        </span>
        <input type="search" placeholder="Search issues..." />
      </label>

      <div className="topbar-actions">
        <button
          className="topbar-icon-button"
          type="button"
          aria-label="Notifications"
        >
          {isLoadingNotifications ? '...' : `!${notifications.unreadCount ? ` ${notifications.unreadCount}` : ''}`}
        </button>
        <button className="topbar-icon-button" type="button" aria-label="Settings">
          *
        </button>

        <div className="topbar-user">
          <div>
            <strong>{user?.fullName || 'Guest User'}</strong>
            <span>{user?.role || 'Visitor'}</span>
          </div>
          <div className="topbar-avatar" aria-hidden="true">
            {getInitials(user?.fullName)}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
