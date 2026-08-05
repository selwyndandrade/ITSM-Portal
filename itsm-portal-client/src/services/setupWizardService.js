import api from './api'

export async function createSetupWizard(payload) {
  const response = await api.post('/api/setupwizard', payload, { withCredentials: true })
  return response.data
}

export default { createSetupWizard }
