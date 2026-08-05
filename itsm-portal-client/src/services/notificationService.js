import api from './api'

export async function getNotifications() {
  try {
    const response = await api.get('/api/notifications')
    return response.data || []
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return []
    }
    throw error
  }
}

export async function markNotificationRead(id) {
  await api.put(`/api/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  await api.put('/api/notifications/read-all')
}
