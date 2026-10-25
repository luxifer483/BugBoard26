import axios from 'axios'
import { API_BASE_URL, DEFAULT_HEADERS } from '../config/apiConfig'
import { clearStoredSession, readStoredSession } from '../security/authStorage'

// Client HTTP condiviso da tutti i moduli API.
// Usa la base URL configurata via env e imposta JSON come formato di default.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: DEFAULT_HEADERS,
  timeout: 10000,
})

// Unico punto che aggiunge il token alle richieste, leggendolo dalla sessione anche dopo un ricaricamento.
apiClient.interceptors.request.use((request) => {
  const token = readStoredSession().token
  if (token && request.url !== '/auth/login') {
    request.headers.Authorization = `Bearer ${token}`
  } else {
    delete request.headers.Authorization
  }
  return request
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const currentToken = readStoredSession().token
    if (error.response?.status === 401 && error.config?.url !== '/auth/login'
        && (!currentToken || error.config?.headers?.Authorization === `Bearer ${currentToken}`)) {
      clearStoredSession()
      window.dispatchEvent(new Event('bugboard26:session-expired'))
    }
    return Promise.reject(error)
  },
)

export default apiClient
