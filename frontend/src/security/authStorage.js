// Conserva una sola sessione, composta dal token e dall'account restituiti dal backend.
import { STORAGE_KEYS } from '../config/storageKeys'

const EMPTY_SESSION = {
  token: '',
  user: null,
}

function normalizeStoredSession(session) {
  if (typeof session?.token !== 'string' || !session.token || !session.user?.id) {
    return EMPTY_SESSION
  }
  return { token: session.token, user: session.user }
}

// Legge la sessione salvata; AuthProvider la verifica poi con il backend.
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

// Salva soltanto i dati della sessione ricevuta dal server.
export function writeStoredSession(session) {
  window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
    token: session.token,
    user: session.user,
  }))
}

// Rimuove la sessione al logout o quando il backend rifiuta il token.
export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEYS.session)
}
