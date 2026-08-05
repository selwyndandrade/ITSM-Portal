import React from 'react'

export default function EmptyState({ title = 'No items', description = '' }) {
  return (
    <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 20, background: 'var(--surface-hover)' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</div>
      {description && <div style={{ marginTop: 6, lineHeight: 1.6 }}>{description}</div>}
    </div>
  )
}
