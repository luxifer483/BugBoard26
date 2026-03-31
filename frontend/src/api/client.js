import axios from 'axios'

// Client HTTP condiviso da tutti i moduli API.
// Usa la base URL configurata via env e imposta JSON come formato di default.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export function setAuthToken(token) {
  // Se presente, aggiunge il bearer token alle richieste successive.
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
    return
  }

  // In logout o token assente rimuove l'header per evitare richieste autenticate.
  delete apiClient.defaults.headers.common.Authorization
}

export default apiClient
