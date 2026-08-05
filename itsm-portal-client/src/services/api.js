import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function getStoredToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('itsm_token') || ''
}

export function resolveApiUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) return `${API_BASE}${path}`
  return `${API_BASE}/${path}`
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global response interceptor to handle auth failures and transient gateway errors
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status
    const message = error?.message || ''

    if (status === 401 || status === 403) {
      try {
        window.dispatchEvent(new Event('unauthorized'))
      } catch (e) {
        // ignore
      }
    }

    if (status === 502 || status === 503 || status === 504 || message.includes('Network Error') || message.includes('ERR_NETWORK')) {
      console.warn('Transient API gateway error detected:', error)
    }

    return Promise.reject(error)
  }
)

export default api
