// Prepara le richieste dei commenti associati a una issue.
import apiClient from './client'

// Richiede l'elenco dei commenti al backend.
export async function getComments(issueId) {
  const { data } = await apiClient.get(`/issues/${issueId}/comments`)
  return data
}

// Invia il testo; il server stabilisce l'autore ed esegue il salvataggio.
export async function createComment(issueId, payload) {
  const { data } = await apiClient.post(`/issues/${issueId}/comments`, { content: payload.content })
  return data
}
