function Topbar() {
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
          !
        </button>
        <button className="topbar-icon-button" type="button" aria-label="Settings">
          *
        </button>

        <div className="topbar-user">
          <div>
            <strong>John Doe</strong>
            <span>Developer</span>
          </div>
          <div className="topbar-avatar" aria-hidden="true">
            JD
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
