import axios from 'axios'
import { getToken } from './auth'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7286'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// attach token on each request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

export default api
