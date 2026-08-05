import api from './api'

const DASHBOARD_URL = '/api/dashboard'

export async function getDashboard() {
  const response = await api.get(DASHBOARD_URL)
  return response.data
}

export async function getDashboardReports() {
  const response = await api.get(`${DASHBOARD_URL}/reports`)
  return response.data
}
