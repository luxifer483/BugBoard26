import apiClient from './client'
import { USE_MOCK_API } from '../config/apiConfig'
import { mockUser } from './mockData'

// Separa le operazioni di profilo dall'autenticazione per mantenere le responsabilita' chiare.
function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function updateProfile(payload) {
  if (USE_MOCK_API) {
    return delay({
      ...mockUser,
      ...payload,
    })
  }

  const { data } = await apiClient.put('/users/me', payload)
  return data
}
