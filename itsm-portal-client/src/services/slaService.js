import api from './api'

const BASE_URL = '/api/slapolicies'

export async function getSlaPolicies() {
  const response = await api.get(BASE_URL)
  const data = response.data
  return Array.isArray(data) ? data : data?.value || data?.$values || []
}

export async function updateSlaPolicy(priority, payload) {
  const response = await api.put(`${BASE_URL}/${encodeURIComponent(priority)}`, payload)
  return response.data
}

export default { getSlaPolicies, updateSlaPolicy }
