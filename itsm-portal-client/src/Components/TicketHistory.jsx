import React from 'react'

export default function TicketHistory({ items = [] }) {
  if (!items || items.length === 0) return <div>No activity yet.</div>

  return (
    <div style={{ marginTop: 16 }}>
      <h3>History</h3>
      <div>
        {items.map((it) => (
          <div key={it.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 12, color: '#555' }}>{it.createdBy} • {new Date(it.createdDate).toLocaleString()}</div>
            <div style={{ marginTop: 6 }}><strong>{it.action}</strong> — {it.details}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
