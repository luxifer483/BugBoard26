import apiClient from './client'
import { USE_MOCK_API } from '../config/apiConfig'
import { mockUsers } from './mockData'

// Prepara le operazioni utente che serviranno per amministrazione e assegnazioni.
function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function getUsers() {
  if (USE_MOCK_API) {
    return delay({
      items: mockUsers,
      totalCount: mockUsers.length,
    })
  }

  const { data } = await apiClient.get('/users')
  return data
}

export async function createUser(payload) {
  if (USE_MOCK_API) {
    return delay({
      id: Date.now(),
      avatarUrl: '',
      ...payload,
    })
  }

  const { data } = await apiClient.post('/users', payload)
  return data
}
