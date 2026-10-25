// Prepara le richieste di gestione degli account riservate agli amministratori.
import apiClient from './client'

// Richiede gli account registrati al backend.
export async function getUsers() {
  const { data } = await apiClient.get('/users')
  return data
}

// Invia i dati del nuovo account; validazione e salvataggio avvengono nel backend.
export async function createUser(payload) {
  const { data } = await apiClient.post('/users', payload)
  return data
}
