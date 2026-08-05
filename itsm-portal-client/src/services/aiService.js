import api from './api'

const AI_URL = '/api/ai'
const KNOWLEDGE_URL = '/api/knowledgearticles'

const toCamel = (value) => {
  if (Array.isArray(value)) return value.map(toCamel)
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((result, [key, item]) => {
      result[key.charAt(0).toLowerCase() + key.slice(1)] = toCamel(item)
      return result
    }, {})
  }
  return value
}

// The AI module has its own endpoints; it never creates a ticket directly.
export async function sendAiMessage(payload) {
  const response = await api.post(`${AI_URL}/chat`, payload, {
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
  })
  return toCamel(response.data)
}

export async function generateTicketSummary(conversationId) {
  const response = await api.post(`${AI_URL}/ticket-summary`, { conversationId })
  return toCamel(response.data)
}

export async function analyzeText(text) {
  const response = await api.post(`${AI_URL}/analyze`, { text })
  return toCamel(response.data)
}

export async function getTicketAssist(ticketId) {
  const response = await api.get(`${AI_URL}/ticket-assist/${ticketId}`)
  return toCamel(response.data)
}

export async function getKnowledgeArticles(params = {}) {
  const response = await api.get(KNOWLEDGE_URL, { params })
  const data = toCamel(response.data)
  return Array.isArray(data) ? data : data.items || []
}

export async function getKnowledgeSummary() {
  const response = await api.get(`${KNOWLEDGE_URL}/summary`)
  return toCamel(response.data)
}

export async function getKnowledgeArticle(id) {
  const response = await api.get(`${KNOWLEDGE_URL}/${id}`)
  return toCamel(response.data)
}
