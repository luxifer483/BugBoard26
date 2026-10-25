// Prepara le richieste di lettura e gestione delle appartenenze ai progetti.
import apiClient from './client'

// Richiede i membri attuali di un progetto.
export async function getProjectMembers(projectId) {
  const { data } = await apiClient.get(`/projects/${projectId}/members`)
  return data
}

// Richiede al backend di aggiungere un account esistente al progetto.
export async function addExistingUserToProject(payload) {
  const { data } = await apiClient.post(`/projects/${payload.projectId}/members`, { userId: payload.userId })
  return data
}

// Richiede al backend di rimuovere soltanto la membership, conservando l'account.
export async function removeUserFromProject(payload) {
  const { data } = await apiClient.delete(
    `/projects/${payload.projectId}/members/${payload.userId}`,
  )
  return data
}
