import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getOrganizationSettings } from '../services/organizationSettingsService'
import { getDashboard } from '../services/dashboardService'
import { resolveApiUrl } from '../services/api'

const primaryLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/tickets', label: 'Tickets' },
  { to: '/assets', label: 'Assets' },
  { to: '/catalog', label: 'Service Catalog' },
  { to: '/my-requests', label: 'My Requests' },
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/reports', label: 'Reports' }
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [branding, setBranding] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    if (!user) return
    let active = true
    getOrganizationSettings()
      .then((data) => { if (active) setBranding(data) })
      .catch(() => { if (active) setBranding(null) })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true

    function loadStats() {
      setStatsLoading(true)
      getDashboard()
        .then((data) => {
          if (!active) return
          setStats(data)
          setStatsError(false)
        })
        .catch(() => {
          if (!active) return
          setStats(null)
          setStatsError(true)
        })
        .finally(() => {
          if (active) setStatsLoading(false)
        })
    }

    loadStats()
    window.addEventListener('tickets-updated', loadStats)
    return () => {
      active = false
      window.removeEventListener('tickets-updated', loadStats)
    }
  }, [user])

  const orgName = branding?.organizationName || 'Kyro'
  const brandInitial = orgName.trim().charAt(0).toUpperCase() || 'K'
  const brandColorStyle = branding?.primaryColor ? { '--brand-primary': branding.primaryColor } : undefined
  const links = isAdmin
    ? [
        ...primaryLinks,
        { to: '/approvals', label: 'Approvals' },
        { to: '/automation-rules', label: 'Automation Rules' },
        { to: '/automation-activity', label: 'Automation Activity' }
      ]
    : primaryLinks

  function handleQuickAction(path) {
    setMenuOpen(false)
    navigate(path)
  }

  return (
    <aside className="theme-sidebar">
      <div className="theme-sidebar__hero" style={brandColorStyle}>
        <div className="theme-sidebar__brand-mark">
          {branding?.logoUrl ? <img src={resolveApiUrl(branding.logoUrl)} alt={orgName} /> : brandInitial}
        </div>
        <div>
          <p className="theme-sidebar__eyebrow">{orgName}</p>
          <h2>Service operations workspace</h2>
        </div>
        <button
          type="button"
          className="theme-sidebar__menuButton"
          aria-label="Open workspace actions"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ⋯
        </button>
      </div>

      {menuOpen && (
        <div className="theme-sidebar__menu" role="menu">
          <button type="button" className="theme-sidebar__menuItem" onClick={() => handleQuickAction('/profile')}>Profile</button>
          <button type="button" className="theme-sidebar__menuItem" onClick={() => window.dispatchEvent(new Event('open-meyon-assistant'))}>Open Meyon</button>
          <button type="button" className="theme-sidebar__menuItem" onClick={() => handleQuickAction('/reports')}>Reports</button>
        </div>
      )}

      <div className="theme-sidebar__stats">
        <div>
          <strong>{statsLoading ? '—' : statsError ? '–' : (stats?.openTickets ?? 0)}</strong>
          <span>Open</span>
        </div>
        <div>
          <strong>{statsLoading ? '—' : statsError ? '–' : (stats?.inProgressTickets ?? 0)}</strong>
          <span>In progress</span>
        </div>
      </div>

      <nav className="theme-nav">
        {links.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `theme-link${isActive ? ' active' : ''}`} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="theme-sidebar__assistant"
        onClick={() => window.dispatchEvent(new Event('open-meyon-assistant'))}
      >
        <span>AI</span>
        <div>
          <strong>Meyon AI</strong>
          <small>Get guidance and draft a response</small>
        </div>
      </button>
    </aside>
  )
}
