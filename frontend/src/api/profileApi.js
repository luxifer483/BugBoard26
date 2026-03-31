import apiClient from './client'
import { mockUser } from './mockData'

// Separa le operazioni di profilo dall'autenticazione per mantenere le responsabilita' chiare.
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function updateProfile(payload) {
  if (useMockApi) {
    return delay({
      ...mockUser,
      ...payload,
    })
  }

  const { data } = await apiClient.put('/users/me', payload)
  return data
}
