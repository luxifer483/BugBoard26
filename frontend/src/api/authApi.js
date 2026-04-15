import apiClient from './client'
import { USE_MOCK_API } from '../config/apiConfig'
import { mockUser } from './mockData'

// L'API auth puo' lavorare in due modalita':
// mock locale per lo sviluppo rapido oppure backend reale.
function delay(data) {
  // Simula la latenza di rete quando si usano dati finti.
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 250)
  })
}

export async function login(payload) {
  // In modalita' mock restituisce un token fittizio e copia l'email inserita nel form.
  if (USE_MOCK_API) {
    return delay({
      token: 'mock-token-bugboard26',
      user: {
        ...mockUser,
        email: payload.email || mockUser.email,
      },
    })
  }

  // Con backend reale delega la login all'endpoint REST e ritorna solo il body.
  const { data } = await apiClient.post('/auth/login', payload)
  return data
}
