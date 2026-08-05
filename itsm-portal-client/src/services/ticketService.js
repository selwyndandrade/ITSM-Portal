import api from './api'

const API_URL = '/api/tickets'

const toCamel = (obj) => {
    if (Array.isArray(obj)) return obj.map(toCamel)
    if (obj && typeof obj === 'object') {
        const res = {}
        Object.keys(obj).forEach((k) => {
            const nk = k.charAt(0).toLowerCase() + k.slice(1)
            res[nk] = toCamel(obj[k])
        })
        return res
    }
    return obj
}

const getErrorMessage = (error, fallback) => {
    const responseMessage = error?.response?.data?.message || error?.response?.data?.errors?.[0]
    if (responseMessage) return responseMessage
    if (error?.message?.includes('Network Error')) return 'The server is temporarily unavailable. Please try again in a moment.'
    return fallback
}

export const getTickets = async (page = 1, pageSize = 20, filters = {}) => {
    const params = { page, pageSize }
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.assignedTo) params.assignedTo = filters.assignedTo
    if (filters.category) params.category = filters.category
    if (filters.search) params.search = filters.search
    if (filters.createdRange) params.createdRange = filters.createdRange

    const response = await api.get(API_URL, { params })
    const data = response.data
    return toCamel(data)
}

export const getHistory = async (ticketId) => {
    const response = await api.get(`/api/tickets/${ticketId}/history`)
    const data = response.data
    return toCamel(data)
}

export const createTicket = async (payload) => {
    const response = await api.post(API_URL, payload)
    const data = response.data

    const normalized = toCamel(data)
    if (normalized && typeof normalized === 'object') {
        if (normalized.id != null) return normalized
        if (normalized.ticket) return normalized.ticket
    }

    return normalized
}

export const assignTicket = async (id, userId) => {
    const response = await api.put(`${API_URL}/${id}/assign`, JSON.stringify(userId), { headers: { 'Content-Type': 'application/json' } })
    return response.data
}

export const updateStatus = async (id, status) => {
    const response = await api.put(`${API_URL}/${id}/status`, JSON.stringify(status), { headers: { 'Content-Type': 'application/json' } })
    const data = response.data
    return toCamel(data)
}

export const getTicket = async (id) => {
    const response = await api.get(`${API_URL}/${id}`)
    const data = response.data

    const normalized = toCamel(data)
    // backend may return { ticket, history } wrapper — return the ticket object for compatibility
    if (normalized && typeof normalized === 'object' && normalized.ticket) return normalized.ticket
    return normalized
}

export const postComment = async (ticketId, payload) => {
    const response = await api.post(`/api/ticketcomments`, { ...payload, ticketId })
    const data = response.data
    return toCamel(data)
}

export const getStats = async () => {
    const response = await api.get('/api/tickets/stats')
    const data = response.data
    return toCamel(data)
}

export const getAttachments = async (ticketId) => {
    const response = await api.get('/api/ticketattachments', { params: { ticketId } })
    return toCamel(response.data)
}

export const uploadAttachment = async (ticketId, file) => {
    const formData = new FormData()
    formData.append('ticketId', ticketId)
    formData.append('file', file)
    const response = await api.post('/api/ticketattachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return toCamel(response.data)
}

export const downloadAttachment = async (attachmentId, fileName) => {
    const response = await api.get(`/api/ticketattachments/${attachmentId}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName || 'attachment')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
}

export const deleteAttachment = async (attachmentId) => {
    await api.delete(`/api/ticketattachments/${attachmentId}`)
}

export { getErrorMessage }
export default { getTickets, createTicket, assignTicket, updateStatus, getTicket, postComment, getHistory, getStats, getAttachments, uploadAttachment, downloadAttachment, deleteAttachment }
