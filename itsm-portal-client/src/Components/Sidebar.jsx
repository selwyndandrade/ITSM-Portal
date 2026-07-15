import React from 'react'
import { NavLink } from 'react-router-dom'

const linkStyle = ({ isActive }) => ({
  display: 'block',
  padding: '10px 16px',
  color: isActive ? 'white' : '#374151',
  background: isActive ? '#334155' : 'transparent',
  textDecoration: 'none',
  borderRadius: 6,
  marginBottom: 6
})

export default function Sidebar() {
  return (
    <aside style={{ width: 240, padding: 20, boxSizing: 'border-box', background: '#0f172a', color: 'white' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>ITSM Portal</div>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>Service Management</div>
      </div>

      <nav>
        <NavLink to="/" style={linkStyle} end>Dashboard</NavLink>
        <NavLink to="/tickets/new" style={linkStyle}>Create Ticket</NavLink>
      </nav>
    </aside>
  )
}
