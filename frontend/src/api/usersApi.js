import apiClient from './client'
import { mockUsers } from './mockData'

// Prepara le operazioni utente che serviranno per amministrazione e assegnazioni.
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function getUsers() {
  if (useMockApi) {
    return delay({
      items: mockUsers,
      totalCount: mockUsers.length,
    })
  }

  const { data } = await apiClient.get('/users')
  return data
}

export async function createUser(payload) {
  if (useMockApi) {
    return delay({
      id: Date.now(),
      avatarUrl: '',
      ...payload,
    })
  }

  const { data } = await apiClient.post('/users', payload)
  return data
}
