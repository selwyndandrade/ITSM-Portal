import api from './api'

export const getCatalogItems = async (params = {}) => {
  const response = await api.get('/api/catalog', { params })
  return response.data
}

export const getCatalogItem = async (id) => {
  const response = await api.get(`/api/catalog/${id}`)
  return response.data
}

export const submitCatalogRequest = async (payload) => {
  const response = await api.post('/api/catalog/request', payload)
  return response.data
}

export const getServiceRequests = async (params = {}) => {
  const response = await api.get('/api/servicerequests', { params })
  return response.data
}

export const approveServiceRequest = async (id, payload = {}) => {
  const response = await api.put(`/api/servicerequests/${id}/approve`, payload)
  return response.data
}

export const rejectServiceRequest = async (id, payload = {}) => {
  const response = await api.put(`/api/servicerequests/${id}/reject`, payload)
  return response.data
}

export default { getCatalogItems, getCatalogItem, submitCatalogRequest, getServiceRequests, approveServiceRequest, rejectServiceRequest }
