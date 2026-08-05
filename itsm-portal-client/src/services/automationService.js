import api from './api'

const normalizePayload = (payload) => ({
  ...payload,
  conditions: payload.conditions || [],
  actions: payload.actions || []
})

export const getAutomationRules = async () => {
  const response = await api.get('/api/automationrules')
  return response.data
}

export const getAutomationExecutions = async () => {
  const response = await api.get('/api/automationexecutions')
  return response.data
}

export const createAutomationRule = async (payload) => {
  const response = await api.post('/api/automationrules', normalizePayload(payload))
  return response.data
}

export const updateAutomationRule = async (id, payload) => {
  const response = await api.put(`/api/automationrules/${id}`, normalizePayload(payload))
  return response.data
}

export const deleteAutomationRule = async (id) => {
  const response = await api.delete(`/api/automationrules/${id}`)
  return response.data
}

export const testAutomationRule = async (rule, ticketId) => {
  const response = await api.post('/api/automationrules/test', { rule, ticketId })
  return response.data
}

export default { getAutomationRules, getAutomationExecutions, createAutomationRule, updateAutomationRule, deleteAutomationRule, testAutomationRule }
