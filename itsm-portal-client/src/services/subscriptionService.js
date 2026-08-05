import api from './api'

export async function getSubscriptionPlans() {
  const response = await api.get('/api/subscription/plans', { withCredentials: true })
  return response.data
}

export default { getSubscriptionPlans }
