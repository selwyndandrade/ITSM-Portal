import api from './api'

const API_URL = '/api/tickets'

export const getTickets = async (page = 1, pageSize = 20) => {
    const response = await api.get(API_URL, { params: { page, pageSize } })
    const data = response.data

    // Normalize server response keys (PascalCase) to camelCase used by React components
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

    return toCamel(data)
}

export const getHistory = async (ticketId) => {
    const response = await api.get(`/api/tickets/${ticketId}/history`)
    const data = response.data

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

    return toCamel(data)
}

export const createTicket = async (payload) => {
    const response = await api.post(API_URL, payload)
    const data = response.data

    // Normalize PascalCase -> camelCase for consistency with other service methods
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

    return toCamel(data)
}

export const assignTicket = async (id, userId) => {
    const response = await api.put(`${API_URL}/${id}/assign`, JSON.stringify(userId), { headers: { 'Content-Type': 'application/json' } })
    return response.data
}

export const updateStatus = async (id, status) => {
    const response = await api.put(`${API_URL}/${id}/status`, JSON.stringify(status), { headers: { 'Content-Type': 'application/json' } })
    const data = response.data
    // normalize
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
    return toCamel(data)
}

export const getTicket = async (id) => {
    const response = await api.get(`${API_URL}/${id}`)
    const data = response.data

    // Normalize PascalCase -> camelCase
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

    const normalized = toCamel(data)
    // backend may return { ticket, history } wrapper — return the ticket object for compatibility
    if (normalized && typeof normalized === 'object' && normalized.ticket) return normalized.ticket
    return normalized
}

export const postComment = async (ticketId, payload) => {
    const response = await api.post(`/api/ticketcomments`, { ...payload, ticketId })
    const data = response.data

    // Normalize response
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

    return toCamel(data)
}

export default { getTickets, createTicket, assignTicket, updateStatus, getTicket, postComment, getHistory }
