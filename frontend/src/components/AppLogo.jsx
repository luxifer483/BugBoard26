function AppLogo({ size = 'medium', showText = true, stacked = false }) {
  const className = [
    'app-logo',
    `is-${size}`,
    stacked ? 'is-stacked' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <div className="app-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img" focusable="false">
          <rect x="2" y="2" width="44" height="44" rx="10" fill="url(#logoBg)" />
          <path
            d="M24 15.5a4.7 4.7 0 1 1 0 9.4a4.7 4.7 0 0 1 0-9.4Z"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.2 32.4v-6a5.8 5.8 0 0 1 5.8-5.8h0a5.8 5.8 0 0 1 5.8 5.8v6"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.2 18.6l2 1.1M31.8 19.7l2-1.1M12.8 24h2.3M32.9 24h2.3M15.2 29.4l1.9-1.1M30.9 28.3l1.9 1.1M18.4 14.9l1 2.1M28.6 17l1-2.1"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="logoBg" x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText ? <span className="app-logo-text">BugBoard26</span> : null}
    </div>
  )
}

export default AppLogo
