import api from './api'

// Fetches a modest page of each entity type and lets the caller fuzzy-filter client-side.
// Kept intentionally simple (no dedicated backend "search" endpoint) since demo data volumes are small;
// each request already has its own auth/tenant scoping applied server-side.
export async function fetchSearchableData() {
  const [ticketsRes, usersRes, assetsRes, knowledgeRes, requestsRes] = await Promise.allSettled([
    api.get('/api/tickets', { params: { page: 1, pageSize: 50 } }),
    api.get('/api/users'),
    api.get('/api/assets'),
    api.get('/api/knowledgearticles'),
    api.get('/api/servicerequests')
  ])

  function unwrap(result) {
    if (result.status !== 'fulfilled') return []
    const data = result.value?.data
    return Array.isArray(data) ? data : data?.items || []
  }

  return {
    tickets: unwrap(ticketsRes),
    users: unwrap(usersRes),
    assets: unwrap(assetsRes),
    knowledge: unwrap(knowledgeRes),
    requests: unwrap(requestsRes)
  }
}
