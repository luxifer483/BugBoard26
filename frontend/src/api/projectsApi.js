import apiClient from './client'
import { mockProjects } from './mockData'

// Il modulo progetti espone la stessa interfaccia sia con mock sia con backend reale.
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

function delay(data) {
  // Ritardo simulato per avvicinare il mock al comportamento di una chiamata HTTP.
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 250)
  })
}

export async function getProjects() {
  // In mock ritorna i progetti gia' presenti in memoria e il conteggio totale.
  if (useMockApi) {
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
  if (useMockApi) {
    const project = mockProjects.find((item) => item.id === Number(projectId)) || null
    return delay(project)
  }

  const { data } = await apiClient.get(`/projects/${projectId}`)
  return data
}
