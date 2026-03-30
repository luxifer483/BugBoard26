import apiClient from './client'
import { mockNotifications } from './mockData'

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

function delay(data) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 200)
  })
}

export async function getNotifications() {
  if (useMockApi) {
    const unreadCount = mockNotifications.filter((notification) => !notification.read).length

    return delay({
      items: mockNotifications,
      unreadCount,
    })
  }

  const { data } = await apiClient.get('/notifications')
  return data
}
