// Mostra la navigazione globale, le azioni ADMIN, le notifiche e il menu del proprio profilo.
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ROUTES } from '../config/routeConfig'
import { useAuth } from '../hooks/useAuth'
import { formatRelativeDate, getInitials } from '../utils/formatters'
import AppLogo from './AppLogo'

function Topbar() {
  const navigate = useNavigate()
  const { user, notifications, isLoadingNotifications, notificationsError,
    refreshNotifications, readNotification, logout } = useAuth()
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
        if (isProfileOpen) profileRef.current?.querySelector('button')?.focus()
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
    if (!isNotificationsOpen) refreshNotifications()
    setIsNotificationsOpen((currentValue) => !currentValue)
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
      <Link className="topbar-brand" to={ROUTES.projects} aria-label="BugBoard26 home">
        <AppLogo size="medium" />
      </Link>

      <nav className="topbar-navigation" aria-label="Primary navigation">
        <NavLink className="topbar-nav-link" to={ROUTES.projects} end>Projects</NavLink>
        {user?.role === 'ADMIN' ? (
          <>
            <NavLink className="topbar-nav-link" to={ROUTES.users}>Users</NavLink>
            <Link className="topbar-nav-link topbar-create-user" to={`${ROUTES.users}?create=1`}>
              <span aria-hidden="true">+</span> Create user
            </Link>
            <NavLink className="topbar-nav-link topbar-create-project" to={ROUTES.createProject}>
              <span aria-hidden="true">+</span> Create project
            </NavLink>
          </>
        ) : null}
        <div className="topbar-notifications" ref={notificationsRef}>
          <button
            aria-expanded={isNotificationsOpen}
            aria-haspopup="dialog"
            aria-label="Notifications"
            title="Notifications"
            className={`topbar-icon-button${isNotificationsOpen ? ' is-active' : ''}`}
            onClick={handleToggleNotifications}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            {notifications.unreadCount > 0 ? <span className="notification-count">{notifications.unreadCount}</span> : null}
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
                {notificationsError ? (
                  <p role="alert" className="notifications-empty">
                    {notificationsError}
                    <button type="button" onClick={refreshNotifications}>Retry</button>
                  </p>
                ) : null}
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
                          onClick={async (event) => {
                            event.preventDefault()
                            if (notification.read || await readNotification(notification.id)) {
                              setIsNotificationsOpen(false)
                              void navigate(`/issues/${notification.issueId}`)
                            }
                          }}
                          to={`/issues/${notification.issueId}`}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button className="notification-item" key={notification.id} type="button"
                          onClick={() => readNotification(notification.id)} disabled={notification.read}>
                          {content}
                        </button>
                      )
                    })
                  : null}
              </div>
            </section>
          ) : null}
        </div>
      </nav>

      <div className="topbar-actions">
        <div className="topbar-profile" ref={profileRef}>
          <button
            aria-expanded={isProfileOpen}
            aria-controls="profile-panel"
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
            <section id="profile-panel" aria-label="Profile menu" className="profile-dropdown">
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
