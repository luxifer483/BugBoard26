import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import { formatRelativeDate, getInitials } from '../utils/formatters'

function Topbar() {
  const { user, notifications, isLoadingNotifications, logout } = useAuth()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const notificationsRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    if (!isNotificationsOpen && !isProfileOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false)
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false)
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationsOpen, isProfileOpen])

  function handleToggleNotifications() {
    setIsProfileOpen(false)
    setIsNotificationsOpen((currentValue) => !currentValue)
  }

  function handleCloseNotifications() {
    setIsNotificationsOpen(false)
  }

  function handleToggleProfile() {
    setIsNotificationsOpen(false)
    setIsProfileOpen((currentValue) => !currentValue)
  }

  function handleLogout() {
    setIsProfileOpen(false)
    logout()
  }

  return (
    <header className="topbar">
      <label className="topbar-search" aria-label="Search issues">
        <span className="topbar-search-icon" aria-hidden="true">
          o
        </span>
        <input type="search" placeholder="Search issues..." />
      </label>

      <div className="topbar-actions">
        <div className="topbar-notifications" ref={notificationsRef}>
          <button
            aria-expanded={isNotificationsOpen}
            aria-haspopup="dialog"
            className={`topbar-icon-button${isNotificationsOpen ? ' is-active' : ''}`}
            onClick={handleToggleNotifications}
            type="button"
          >
            {isLoadingNotifications ? '...' : `!${notifications.unreadCount ? ` ${notifications.unreadCount}` : ''}`}
          </button>

          {isNotificationsOpen ? (
            <section
              aria-label="Notifications panel"
              className="notifications-dropdown"
              role="dialog"
            >
              <div className="notifications-dropdown-header">
                <div>
                  <strong>Notifications</strong>
                  <span>
                    {notifications.unreadCount
                      ? `${notifications.unreadCount} unread`
                      : 'Everything is up to date'}
                  </span>
                </div>
              </div>

              <div className="notifications-dropdown-list">
                {isLoadingNotifications ? (
                  <p className="notifications-empty">Loading notifications...</p>
                ) : null}

                {!isLoadingNotifications && !notifications.items.length ? (
                  <p className="notifications-empty">No notifications yet.</p>
                ) : null}

                {!isLoadingNotifications
                  ? notifications.items.map((notification) => {
                      const content = (
                        <>
                          <div className={`notification-dot${notification.read ? '' : ' is-unread'}`} />
                          <div className="notification-content">
                            <p>{notification.message}</p>
                            <span>{formatRelativeDate(notification.createdAt)}</span>
                          </div>
                        </>
                      )

                      return notification.issueId ? (
                        <Link
                          className="notification-item"
                          key={notification.id}
                          onClick={handleCloseNotifications}
                          to={`/issues/${notification.issueId}`}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="notification-item" key={notification.id}>
                          {content}
                        </div>
                      )
                    })
                  : null}
              </div>
            </section>
          ) : null}
        </div>
        <button className="topbar-icon-button" type="button" aria-label="Settings">
          *
        </button>

        <div className="topbar-profile" ref={profileRef}>
          <button
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
            className={`topbar-user-button${isProfileOpen ? ' is-active' : ''}`}
            onClick={handleToggleProfile}
            type="button"
          >
            <div className="topbar-user">
              <div>
                <strong>{user?.fullName || 'Guest User'}</strong>
                <span>{user?.role || 'Visitor'}</span>
              </div>
              <div className="topbar-avatar" aria-hidden="true">
                {getInitials(user?.fullName)}
              </div>
            </div>
          </button>

          {isProfileOpen ? (
            <section aria-label="Profile menu" className="profile-dropdown" role="menu">
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-avatar" aria-hidden="true">
                  {getInitials(user?.fullName)}
                </div>
                <div>
                  <strong>{user?.fullName || 'Guest User'}</strong>
                  <span>{user?.role || 'Visitor'}</span>
                </div>
              </div>

              <Link
                className="profile-dropdown-link"
                onClick={() => setIsProfileOpen(false)}
                to={ROUTES.profile}
              >
                View profile
              </Link>
              <button className="profile-dropdown-logout" onClick={handleLogout} type="button">
                Logout
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Topbar
