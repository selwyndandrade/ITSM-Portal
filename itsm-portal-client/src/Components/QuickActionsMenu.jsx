import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function QuickActionsMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  const actions = [
    { label: 'New ticket', hint: 'Log a new incident or request', onSelect: () => navigate('/tickets/new') },
    { label: 'New asset', hint: 'Register a new asset', onSelect: () => navigate('/assets/new'), adminOnly: true },
    { label: 'New service request', hint: 'Request from the catalog', onSelect: () => navigate('/catalog') },
    { label: 'Ask Meyon AI', hint: 'Open the AI assistant', onSelect: () => window.dispatchEvent(new Event('open-meyon-assistant')) },
    { label: 'Search everything', hint: 'Open command palette', onSelect: () => window.dispatchEvent(new Event('open-command-palette')) }
  ].filter((action) => !action.adminOnly || isAdmin)

  function handleSelect(action) {
    action.onSelect()
    setOpen(false)
  }

  return (
    <div className="quick-actions">
      {open && (
        <div className="quick-actions__menu" role="menu">
          {actions.map((action) => (
            <button type="button" key={action.label} className="quick-actions__item" onClick={() => handleSelect(action)}>
              <strong>{action.label}</strong>
              <span>{action.hint}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`quick-actions__toggle${open ? ' is-open' : ''}`}
        aria-label="Quick actions"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? '×' : '+'}
      </button>
    </div>
  )
}
