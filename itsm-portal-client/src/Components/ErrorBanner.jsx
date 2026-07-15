import React from 'react'

export default function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div style={{ background: '#ffe6e6', color: '#8a1f1f', padding: 12, borderRadius: 6, marginBottom: 12 }}>
      <strong>Error:</strong> {message}
    </div>
  )
}
