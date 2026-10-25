// Prepara le richieste delle issue e carica gli allegati con il token della sessione.
import apiClient from './client'

// Richiede le issue accessibili, eventualmente limitate a un progetto.
export async function getIssues(projectId) {
  const { data } = projectId
    ? await apiClient.get(`/projects/${projectId}/issues`)
    : await apiClient.get('/issues')
  return data
}

// Richiede il dettaglio della issue al backend.
export async function getIssueById(issueId) {
  const { data } = await apiClient.get(`/issues/${issueId}`)
  return data
}

// Prepara i dati e l'eventuale immagine; il backend esegue il salvataggio.
export async function createIssue(payload) {
  const values = {
    projectId: payload.project.id,
    title: payload.title,
    description: payload.description,
    type: payload.type,
    priority: payload.priority ?? null,
    assigneeId: payload.assignee?.id ?? null,
  }
  // Con un file usa FormData; senza immagine conserva la richiesta JSON gia' esistente.
  let body = values
  if (payload.image) {
    body = new FormData()
    for (const [field, value] of Object.entries(values)) {
      if (value !== null && value !== undefined) body.append(field, String(value))
    }
    body.append('image', payload.image)
  }
  const { data } = await apiClient.post('/issues', body,
    payload.image ? { headers: { 'Content-Type': undefined } } : undefined)
  return data
}

// Scarica un'immagine privata come Blob, cosi' il browser non deve mettere il token nell'URL.
export async function getIssueImage(issueId) {
  const { data } = await apiClient.get(`/issues/${issueId}/image`, { responseType: 'blob' })
  return data
}

// Richiede il cambio stato; il server verifica assegnatario e transizione.
export async function updateIssueStatus(issueId, payload) {
  const { data } = await apiClient.patch(`/issues/${issueId}/status`, payload)
  return data
}

// Richiede un'assegnazione o la sua rimozione; il backend verifica i permessi.
export async function updateIssueAssignee(issueId, assignee) {
  const { data } = await apiClient.patch(`/issues/${issueId}/assignee`, {
    assigneeId: assignee?.id ?? null,
  })
  return data
}
