import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'kyro_theme_preference'

function getSystemPreference() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveEffectiveTheme(preference) {
  return preference === 'system' ? getSystemPreference() : preference
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system')
  const [effectiveTheme, setEffectiveTheme] = useState(() => resolveEffectiveTheme(preference))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, preference)
    const next = resolveEffectiveTheme(preference)
    setEffectiveTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system' || !window.matchMedia) return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange(event) {
      const next = event.matches ? 'dark' : 'light'
      setEffectiveTheme(next)
      document.documentElement.setAttribute('data-theme', next)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [preference])

  function toggleTheme() {
    setPreference((current) => {
      const currentEffective = resolveEffectiveTheme(current)
      return currentEffective === 'dark' ? 'light' : 'dark'
    })
  }

  return (
    <ThemeContext.Provider value={{ preference, effectiveTheme, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
