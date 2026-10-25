// Prepara le richieste dei progetti senza attribuire privilegi al loro creatore.
import apiClient from './client'

// Richiede l'elenco dei progetti accessibili all'utente autenticato.
export async function getProjects() {
  const { data } = await apiClient.get('/projects')
  return data
}

// Richiede i dati e le statistiche di un progetto.
export async function getProjectById(projectId) {
  const { data } = await apiClient.get(`/projects/${projectId}`)
  return data
}

// Invia i dati del progetto; il backend esegue il salvataggio.
export async function createProject(payload) {
  const { data } = await apiClient.post('/projects', payload)
  return data
}
