import axios from 'axios'

// Default to backend URL when env var isn't set so requests go to the ASP.NET Core API.
// Keep withCredentials enabled because backend auth uses HttpOnly cookie.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7060'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Global response interceptor to handle 401 -> broadcast an event
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Notify app that authorization failed
      try {
        window.dispatchEvent(new Event('unauthorized'))
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(error)
  }
)

export default api
