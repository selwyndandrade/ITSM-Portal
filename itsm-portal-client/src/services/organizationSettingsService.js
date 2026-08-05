import api from './api'

const BASE_URL = '/api/organizationsettings'

export async function getOrganizationSettings() {
  const response = await api.get(BASE_URL)
  return response.data
}

export async function updateOrganizationSettings(payload) {
  const response = await api.put(BASE_URL, payload)
  return response.data
}

export async function uploadOrganizationLogo(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(`${BASE_URL}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export async function resetDemoData() {
  const response = await api.post(`${BASE_URL}/reset-demo-data`)
  return response.data
}

export default { getOrganizationSettings, updateOrganizationSettings, uploadOrganizationLogo, resetDemoData }
