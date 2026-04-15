import apiClient from './client'
import { USE_MOCK_API } from '../config/apiConfig'
import { mockNotifications } from './mockData'

// Anche le notifiche possono arrivare da mock o da API reale in base alla env.
function delay(data) {
  // Piccolo ritardo artificiale per mantenere realistico il comportamento UI.
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function getNotifications() {
  // In mock restituisce l'elenco completo e calcola il numero di notifiche non lette.
  if (USE_MOCK_API) {
    const unreadCount = mockNotifications.filter((notification) => !notification.read).length

    return delay({
      items: mockNotifications,
      unreadCount,
    })
  }

  // In produzione/sviluppo con backend chiama l'endpoint dedicato alle notifiche.
  const { data } = await apiClient.get('/notifications')
  return data
}
