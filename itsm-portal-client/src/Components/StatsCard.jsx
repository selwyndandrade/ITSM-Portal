import React from 'react'

export default function StatsCard({ title, value, hint }) {
  return (
    <div style={{ flex: '1 1 180px', minWidth: 160, background: 'white', padding: 16, borderRadius: 8, boxShadow: '0 6px 18px rgba(15,23,42,0.06)', marginRight: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{hint}</div>}
    </div>
  )
}
