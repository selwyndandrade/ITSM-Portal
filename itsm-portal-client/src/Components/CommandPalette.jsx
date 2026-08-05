import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchSearchableData } from '../services/searchService'
import { fuzzyFilter } from '../utils/fuzzy'

const NAV_ACTIONS = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', path: '/', keywords: 'dashboard home overview' },
  { id: 'nav-tickets', label: 'Go to Tickets', path: '/tickets', keywords: 'tickets queue triage' },
  { id: 'new-ticket', label: 'Create new ticket', path: '/tickets/new', keywords: 'new ticket create incident request' },
  { id: 'nav-assets', label: 'Go to Assets', path: '/assets', keywords: 'assets inventory hardware' },
  { id: 'new-asset', label: 'Create new asset', path: '/assets/new', keywords: 'new asset create hardware' },
  { id: 'nav-catalog', label: 'Go to Service Catalog', path: '/catalog', keywords: 'catalog services request' },
  { id: 'nav-my-requests', label: 'Go to My Requests', path: '/my-requests', keywords: 'my requests track' },
  { id: 'nav-knowledge', label: 'Go to Knowledge Base', path: '/knowledge', keywords: 'knowledge base articles help' },
  { id: 'nav-reports', label: 'Go to Reports', path: '/reports', keywords: 'reports insights analytics kpi' },
  { id: 'nav-approvals', label: 'Go to Approvals', path: '/approvals', keywords: 'approvals pending decisions' },
  { id: 'nav-automation-rules', label: 'Go to Automation Rules', path: '/automation-rules', keywords: 'automation rules workflow' },
  { id: 'nav-automation-activity', label: 'Go to Automation Activity', path: '/automation-activity', keywords: 'automation activity execution history' },
  { id: 'nav-admin', label: 'Go to Admin', path: '/admin', keywords: 'admin administration settings users' },
  { id: 'nav-profile', label: 'Go to Profile', path: '/profile', keywords: 'profile account settings' },
  { id: 'open-ai', label: 'Open Meyon AI Assistant', keywords: 'ai assistant meyon chat help', action: 'open-ai' }
]

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [data, setData] = useState({ tickets: [], users: [], assets: [], knowledge: [], requests: [] })
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    setLoading(true)
    fetchSearchableData()
      .then((result) => setData(result))
      .finally(() => setLoading(false))
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const groups = useMemo(() => {
    const actions = fuzzyFilter(NAV_ACTIONS, query, (item) => `${item.label} ${item.keywords}`)
      .slice(0, query ? 8 : 6)
      .map(({ item }) => ({
        key: `action-${item.id}`,
        label: item.label,
        sublabel: 'Quick action',
        onSelect: () => {
          if (item.action === 'open-ai') {
            window.dispatchEvent(new Event('open-meyon-assistant'))
          } else {
            navigate(item.path)
          }
        }
      }))

    const tickets = fuzzyFilter(data.tickets, query, (t) => `${t.title || ''} ${t.description || ''} ${t.category || ''}`)
      .slice(0, 6)
      .map(({ item }) => ({
        key: `ticket-${item.id}`,
        label: item.title || `Ticket #${item.id}`,
        sublabel: `${item.status || 'Open'} · ${item.priority || 'Medium'}`,
        onSelect: () => navigate(`/tickets/${item.id}`)
      }))

    const assets = fuzzyFilter(data.assets, query, (a) => `${a.name || ''} ${a.assetTag || ''} ${a.category || ''}`)
      .slice(0, 6)
      .map(({ item }) => ({
        key: `asset-${item.id}`,
        label: item.name || item.assetTag || `Asset #${item.id}`,
        sublabel: item.assetTag ? `Tag ${item.assetTag}` : 'Asset',
        onSelect: () => navigate(`/assets/${item.id}`)
      }))

    const users = fuzzyFilter(data.users, query, (u) => `${u.displayName || ''} ${u.email || ''}`)
      .slice(0, 6)
      .map(({ item }) => ({
        key: `user-${item.id}`,
        label: item.displayName || item.email,
        sublabel: item.role || 'User',
        onSelect: () => navigate('/admin')
      }))

    const knowledge = fuzzyFilter(data.knowledge, query, (k) => `${k.title || ''} ${k.summary || ''}`)
      .slice(0, 6)
      .map(({ item }) => ({
        key: `kb-${item.id}`,
        label: item.title || 'Article',
        sublabel: 'Knowledge article',
        onSelect: () => navigate(`/knowledge/${item.id}`)
      }))

    const requests = fuzzyFilter(data.requests, query, (r) => `${r.catalogItemName || ''} ${r.requestedByUserName || ''}`)
      .slice(0, 6)
      .map(({ item }) => ({
        key: `req-${item.id}`,
        label: item.catalogItemName || `Service request #${item.id}`,
        sublabel: `${item.status || 'Pending'} · requested by ${item.requestedByUserName || 'someone'}`,
        onSelect: () => navigate('/my-requests')
      }))

    return [
      { title: 'Quick actions', items: actions },
      { title: 'Tickets', items: tickets },
      { title: 'Assets', items: assets },
      { title: 'Users', items: users, hidden: user?.role !== 'Admin' },
      { title: 'Knowledge base', items: knowledge },
      { title: 'Service requests', items: requests }
    ].filter((group) => !group.hidden && group.items.length > 0)
  }, [data, query, navigate, user])

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, flatItems.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const target = flatItems[activeIndex]
      if (target) {
        target.onSelect()
        onClose()
      }
    }
  }

  if (!open) return null

  let runningIndex = -1

  return (
    <div className="command-palette-overlay" onMouseDown={onClose}>
      <div className="command-palette" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="command-palette__input-row">
          <span className="command-palette__icon" aria-hidden="true">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets, assets, people, articles… or type a command"
            aria-label="Command palette search"
          />
          <kbd>Esc</kbd>
        </div>

        <div className="command-palette__results">
          {loading && <div className="command-palette__loading">Loading workspace data…</div>}
          {!loading && flatItems.length === 0 && <div className="command-palette__empty">No matches found.</div>}
          {groups.map((group) => (
            <div className="command-palette__group" key={group.title}>
              <p className="command-palette__group-title">{group.title}</p>
              {group.items.map((item) => {
                runningIndex += 1
                const index = runningIndex
                return (
                  <button
                    type="button"
                    key={item.key}
                    className={`command-palette__item${index === activeIndex ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => { item.onSelect(); onClose() }}
                  >
                    <span>{item.label}</span>
                    <span className="command-palette__sublabel">{item.sublabel}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="command-palette__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
