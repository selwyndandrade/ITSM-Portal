import React from 'react'

export default function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', color: '#ef4444', padding: 12, borderRadius: 6, marginBottom: 12 }}>
      <strong>Error:</strong> {message}
    </div>
  )
}
