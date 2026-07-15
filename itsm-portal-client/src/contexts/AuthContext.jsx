import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)


  // listen for global unauthorized events from the shared api
  useEffect(() => {
    function onUnauthorized() {
      setUser(null)
    }
    window.addEventListener('unauthorized', onUnauthorized)
    return () => window.removeEventListener('unauthorized', onUnauthorized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchMe() {
    try {
      setLoading(true)
      const res = await api.get('/api/auth/me')
      setUser(res.data)
    } catch (ex) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email, password) {
    // Server sets HttpOnly cookie; afterwards call /me to get user info
    await api.post('/api/auth/login', { email, password }, { withCredentials: true })
    await fetchMe()
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout', {}, { withCredentials: true })
    } catch (ex) {
      // ignore
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
