import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header style={{ height: 64, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxShadow: '0 1px 4px rgba(16,24,40,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#334155', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>IT</div>
        <div>
          <div style={{ fontWeight: 700 }}>ITSM Portal</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Service Management</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{user.email}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{user.name ?? ''}</div>
            </div>
            <button onClick={() => logout()} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6 }}>Logout</button>
          </div>
        )}
      </div>
    </header>
  )
}
