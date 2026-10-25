// Prepara le richieste di autenticazione al backend.
import apiClient from './client'

// Invia le credenziali e restituisce token e utente verificati dal server.
export async function login(payload) {
  const { data } = await apiClient.post('/auth/login', payload)
  return data
}

// Legge l'account associato al token inviato dal client HTTP.
export async function getCurrentUser() {
  const { data } = await apiClient.get('/users/me')
  return data
}
