import apiClient from './client'
import { mockProjects } from './mockData'

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 250)
  })
}

export async function getProjects() {
  if (useMockApi) {
    return delay({
      items: mockProjects,
      totalCount: mockProjects.length,
    })
  }

  const { data } = await apiClient.get('/projects')
  return data
}
