import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

function readAuthError(error) {
  const responseMessage = error?.response?.data?.message
  const details = error?.response?.data?.errors
  if (responseMessage) return responseMessage
  if (Array.isArray(details) && details[0]) return details[0]
  if (typeof details === 'string') return details
  if (error?.message?.includes('Network Error') || error?.message?.includes('ERR_NETWORK')) {
    return 'The API is currently unavailable. Please try again in a moment.'
  }
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return 'Your session has expired. Please sign in again.'
  }
  return 'We could not complete that request. Please try again.'
}

function getStoredUser() {
  const raw = localStorage.getItem('itsm_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function persistSession(user, token = null) {
  if (token) {
    localStorage.setItem('authToken', token)
    localStorage.setItem('itsm_token', token)
  }

  if (user) {
    localStorage.setItem('itsm_user', JSON.stringify(user))
  }
}

function clearSession() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('itsm_token')
  localStorage.removeItem('itsm_user')
}

function getStoredToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('itsm_token') || ''
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  async function refreshUser() {
    try {
      const res = await api.get('/api/profile')
      const profile = res?.data || {}
      const nextUser = {
        id: profile.id || user?.id || null,
        email: profile.email || user?.email || null,
        role: profile.role || user?.role || 'User',
        displayName: profile.displayName || null,
        bio: profile.bio || null,
        linkedInUrl: profile.linkedInUrl || null,
        gitHubUrl: profile.gitHubUrl || null,
        portfolioUrl: profile.portfolioUrl || null,
        profileImageUrl: profile.profileImageUrl || null,
        departmentName: profile.departmentName || profile.department || null,
        name: profile.displayName || user?.name || null
      }
      persistSession(nextUser, getStoredToken())
      setUser(nextUser)
      return nextUser
    } catch (ex) {
      if (ex?.response?.status === 401 || ex?.response?.status === 403) {
        clearSession()
        setUser(null)
        setAuthError('Your session has expired. Please sign in again.')
      }
      return user
    }
  }

  // listen for global unauthorized events from the shared api
  useEffect(() => {
    function onUnauthorized() {
      clearSession()
      setUser(null)
      setLoading(false)
    }
    window.addEventListener('unauthorized', onUnauthorized)
    return () => window.removeEventListener('unauthorized', onUnauthorized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchMe() {
    try {
      setLoading(true)

      const storedToken = getStoredToken()
      if (!storedToken) {
        clearSession()
        setUser(null)
        setAuthError(null)
        return
      }

      const res = await api.get('/api/auth/me')
      if (res?.data) {
        const normalizedUser = {
          id: res.data.id || null,
          email: res.data.email || null,
          role: res.data.role || 'User',
          displayName: res.data.displayName || null,
          bio: res.data.bio || null,
          linkedInUrl: res.data.linkedInUrl || null,
          gitHubUrl: res.data.gitHubUrl || null,
          portfolioUrl: res.data.portfolioUrl || null,
          profileImageUrl: res.data.profileImageUrl || null,
          departmentName: res.data.departmentName || null,
          name: res.data.displayName || null
        }

        if (normalizedUser.email) {
          persistSession(normalizedUser, getStoredToken())
          setUser(normalizedUser)
          setAuthError(null)
        } else {
          clearSession()
          setUser(null)
          setAuthError('Your session could not be restored. Please sign in again.')
        }
      } else {
        clearSession()
        setUser(null)
        setAuthError('Your session could not be restored. Please sign in again.')
      }
    } catch (ex) {
      const storedUser = getStoredUser()
      const isUnauthorized = ex?.response?.status === 401 || ex?.response?.status === 403
      const isTransient = ex?.response?.status === 502 || ex?.response?.status === 503 || ex?.response?.status === 504 || ex?.message?.includes('Network Error')

      if (isUnauthorized) {
        clearSession()
        setUser(null)
        setAuthError('Your session has expired. Please sign in again.')
      } else if (storedUser && !isTransient) {
        setUser(storedUser)
        setAuthError(null)
      } else if (!isTransient) {
        clearSession()
        setUser(null)
        setAuthError('We could not restore your session. Please sign in again.')
      } else {
        setAuthError('The API is currently unavailable. Please try again in a moment.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email, password) {
    try {
      const response = await api.post('/api/auth/login', { email, password }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      })

      if (response?.status >= 200 && response?.status < 300) {
        const token = response?.data?.token || null
        const loginData = response?.data || {}
        setAuthError(null)

        const normalizedUser = {
          id: loginData.id || loginData.user?.id || null,
          email: loginData.email || loginData.user?.email || email || null,
          role: loginData.role || loginData.user?.role || 'User',
          displayName: loginData.displayName || loginData.user?.displayName || null,
          bio: loginData.bio || loginData.user?.bio || null,
          linkedInUrl: loginData.linkedInUrl || loginData.user?.linkedInUrl || null,
          gitHubUrl: loginData.gitHubUrl || loginData.user?.gitHubUrl || null,
          portfolioUrl: loginData.portfolioUrl || loginData.user?.portfolioUrl || null,
          profileImageUrl: loginData.profileImageUrl || loginData.user?.profileImageUrl || null,
          departmentName: loginData.departmentName || loginData.user?.departmentName || null,
          name: loginData.displayName || loginData.user?.displayName || email || null
        }

        if (token) {
          persistSession(normalizedUser, token)
        } else {
          persistSession(normalizedUser)
        }
        setUser(normalizedUser)

        try {
          const meResponse = await api.get('/api/auth/me')
          if (meResponse?.data) {
            const refreshedUser = {
              id: meResponse.data.id || normalizedUser.id || null,
              email: meResponse.data.email || normalizedUser.email || null,
              role: meResponse.data.role || normalizedUser.role || 'User',
              displayName: meResponse.data.displayName || normalizedUser.displayName || null,
              bio: meResponse.data.bio || normalizedUser.bio || null,
              linkedInUrl: meResponse.data.linkedInUrl || normalizedUser.linkedInUrl || null,
              gitHubUrl: meResponse.data.gitHubUrl || normalizedUser.gitHubUrl || null,
              portfolioUrl: meResponse.data.portfolioUrl || normalizedUser.portfolioUrl || null,
              profileImageUrl: meResponse.data.profileImageUrl || normalizedUser.profileImageUrl || null,
              departmentName: meResponse.data.departmentName || normalizedUser.departmentName || null,
              name: meResponse.data.displayName || normalizedUser.displayName || normalizedUser.name || null
            }
            persistSession(refreshedUser, token)
            setUser(refreshedUser)
          }
        } catch (ex) {
          if (ex?.response?.status === 401 || ex?.response?.status === 403) {
            persistSession(normalizedUser, token)
            setUser(normalizedUser)
          }
        }

        return response
      }

      throw new Error('Login failed')
    } catch (error) {
      setAuthError(readAuthError(error))
      throw error
    }
  }

  async function register(email, password) {
    try {
      const registerResponse = await api.post('/api/auth/register', { email, password })
      if (registerResponse?.status >= 200 && registerResponse?.status < 300) {
        await login(email, password)
        return registerResponse
      }
      throw new Error('Registration failed')
    } catch (error) {
      console.error('Registration error in AuthContext:', error)
      console.error('Error response:', error?.response?.data)
      throw error
    }
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout', {}, { withCredentials: true })
    } catch (ex) {
      // ignore
    }
    clearSession()
    setUser(null)
    setAuthError(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    return {
      user: null,
      loading: false,
      authError: null,
      login: async () => { throw new Error('Auth context not ready') },
      register: async () => { throw new Error('Auth context not ready') },
      logout: async () => {}
    }
  }

  return context
}
