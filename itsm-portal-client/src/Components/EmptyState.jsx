import React from 'react'

export default function EmptyState({ title = 'No items', description = '' }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{title}</div>
      {description && <div style={{ marginTop: 6 }}>{description}</div>}
    </div>
  )
}
