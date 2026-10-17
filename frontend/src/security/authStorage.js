import { USE_MOCK_API } from '../config/apiConfig'
import { STORAGE_KEYS } from '../config/storageKeys'
import { mockUser } from '../api/mockData'

const EMPTY_SESSION = {
  token: '',
  user: null,
}

function normalizeStoredSession(session) {
  const expectedMode = USE_MOCK_API ? 'mock' : 'real'
  if (session?.mode !== expectedMode || typeof session.token !== 'string' || !session.user?.id) {
    return EMPTY_SESSION
  }
  if (!USE_MOCK_API || !session?.token || !session.user) {
    return session
  }

  return {
    ...session,
    user: {
      ...session.user,
      id: mockUser.id,
      fullName: mockUser.fullName,
      role: mockUser.role,
      avatarUrl: mockUser.avatarUrl,
    },
  }
}

export function readStoredSession() {
  const savedSession = window.localStorage.getItem(STORAGE_KEYS.session)

  if (!savedSession) {
    return EMPTY_SESSION
  }

  try {
    return normalizeStoredSession(JSON.parse(savedSession))
  } catch {
    return EMPTY_SESSION
  }
}

export function writeStoredSession(session) {
  window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
    ...session,
    mode: USE_MOCK_API ? 'mock' : 'real',
  }))
}

export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEYS.session)
  window.sessionStorage.removeItem('bugboard26.activeProjectId')
}
