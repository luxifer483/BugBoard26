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
    const user = {
      id: Math.max(0, ...mockUsers.map((item) => item.id)) + 1,
      avatarUrl: '',
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      role: payload.role,
      createdAt: new Date().toISOString(),
    }
    mockUsers.push(user)
    return delay(user)
  }

  const { data } = await apiClient.post('/users', payload)
  return data
}
