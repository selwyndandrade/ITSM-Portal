import api from './api'

export const getApprovalRequests = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.requester) params.set('requester', filters.requester)
  if (filters.department) params.set('department', filters.department)
  if (filters.requestType) params.set('requestType', filters.requestType)
  const response = await api.get(`/api/servicerequests/approvals?${params.toString()}`)
  return response.data
}

export const getApprovalDetails = async (id) => {
  const response = await api.get(`/api/servicerequests/approvals/${id}`)
  return response.data
}

export const approveRequest = async (id, payload = {}) => {
  const response = await api.put(`/api/servicerequests/${id}/approve`, payload)
  return response.data
}

export const rejectRequest = async (id, payload = {}) => {
  const response = await api.put(`/api/servicerequests/${id}/reject`, payload)
  return response.data
}

export default { getApprovalRequests, getApprovalDetails, approveRequest, rejectRequest }
