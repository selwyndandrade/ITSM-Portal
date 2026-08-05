import React from 'react'

export default function EmptyState({ title = 'No items', description = '' }) {
  return (
    <div style={{ padding: 36, textAlign: 'center', color: '#64748b', border: '1px dashed #e2e8f0', borderRadius: 20, background: '#f8fafc' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{title}</div>
      {description && <div style={{ marginTop: 6, lineHeight: 1.6 }}>{description}</div>}
    </div>
  )
}
