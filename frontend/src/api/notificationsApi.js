// Prepara le richieste delle notifiche personali dell'utente autenticato.
import apiClient from './client'

// Richiede al server le notifiche accessibili e il numero di quelle non lette.
export async function getNotifications() {
  const { data } = await apiClient.get('/notifications')
  return data
}

// Richiede al server di segnare una notifica come letta.
export async function markNotificationRead(id) {
  const { data } = await apiClient.patch(`/notifications/${id}/read`)
  return data
}
