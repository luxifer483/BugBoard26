// Icone decorative: il nome accessibile resta nel testo del controllo.
const paths = {
  warning: 'M10.3 3.8 1.8 19a1.3 1.3 0 0 0 1.2 2h18a1.3 1.3 0 0 0 1.2-2L13.7 3.8a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  folder: 'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  issues: 'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
  todo: 'M12 8v4l3 2',
  progress: 'M12 3a9 9 0 1 1-9 9M3 7V3h4M9 8l7 4-7 4Z',
  closed: 'm8 12 3 3 5-6',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  users: 'M16 21v-2a5 5 0 0 0-10 0v2M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M18 3a4 4 0 0 1 0 8M20 15a5 5 0 0 1 2 4v2',
  admin: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7ZM8 12l3 3 5-6',
  userPlus: 'M16 21v-2a6 6 0 0 0-12 0v2M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 7v6M17 10h6',
  folderPlus: 'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM12 10v7M8.5 13.5h7',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  logout: 'M9 3H4v18h5M9 12h12m-4-4 4 4-4 4',
  close: 'm6 6 12 12M6 18 18 6',
  plus: 'M12 4v16M4 12h16',
  bug: 'M8 8V6a4 4 0 0 1 8 0v2M7 8h10v7a5 5 0 0 1-10 0ZM12 8v12M3 9l4 2M17 11l4-2M3 15h4m10 0h4M4 21l4-3m8 0 4 3',
  feature: 'M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0l-1 2H9Z',
  document: 'M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h8',
  question: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01',
}

export default function Icon({ name, size = 20 }) {
  return (
    <svg className="app-icon" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false">
      {['todo', 'closed', 'question'].includes(name) ? <circle cx="12" cy="12" r="9" /> : null}
      <path d={paths[name] || paths.issues} />
    </svg>
  )
}
