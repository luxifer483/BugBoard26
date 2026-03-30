import apiClient from './client'
import { mockUser } from './mockData'

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 250)
  })
}

export async function login(payload) {
  if (useMockApi) {
    return delay({
      token: 'mock-token-bugboard26',
      user: {
        ...mockUser,
        email: payload.email || mockUser.email,
      },
    })
  }

  const { data } = await apiClient.post('/auth/login', payload)
  return data
}
