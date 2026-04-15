import apiClient from './client'
import { USE_MOCK_API } from '../config/apiConfig'
import { mockProjects } from './mockData'

// Il modulo progetti espone la stessa interfaccia sia con mock sia con backend reale.
function delay(data) {
  // Ritardo simulato per avvicinare il mock al comportamento di una chiamata HTTP.
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 250)
  })
}

export async function getProjects() {
  // In mock ritorna i progetti gia' presenti in memoria e il conteggio totale.
  if (USE_MOCK_API) {
    return delay({
      items: mockProjects,
      totalCount: mockProjects.length,
    })
  }

  // Con API reale effettua una GET su /projects e ritorna il payload della risposta.
  const { data } = await apiClient.get('/projects')
  return data
}

export async function getProjectById(projectId) {
  if (USE_MOCK_API) {
    const project = mockProjects.find((item) => item.id === Number(projectId)) || null
    return delay(project)
  }

  const { data } = await apiClient.get(`/projects/${projectId}`)
  return data
}
