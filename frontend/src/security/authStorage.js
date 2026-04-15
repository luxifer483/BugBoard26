import { STORAGE_KEYS } from '../config/storageKeys'

const EMPTY_SESSION = {
  token: '',
  user: null,
}

export function readStoredSession() {
  const savedSession = window.localStorage.getItem(STORAGE_KEYS.session)

  if (!savedSession) {
    return EMPTY_SESSION
  }

  try {
    return JSON.parse(savedSession)
  } catch {
    return EMPTY_SESSION
  }
}

export function writeStoredSession(session) {
  window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
}

export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEYS.session)
}
