import React from 'react'

const palette = {
  status: {
    Open: { bg: '#eef2ff', color: '#3730a3' },
    Assigned: { bg: '#ecfdf5', color: '#065f46' },
    'In Progress': { bg: '#fff7ed', color: '#92400e' },
    Resolved: { bg: '#ecfeff', color: '#0f766e' },
    Closed: { bg: '#f3f4f6', color: '#374151' }
  },
  priority: {
    Low: { bg: '#eef2ff', color: '#3730a3' },
    Medium: { bg: '#fff7ed', color: '#92400e' },
    High: { bg: '#fff1f2', color: '#991b1b' }
  }
}

export default function Badge({ type = 'status', value }) {
  const p = (palette[type] && palette[type][value]) || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ background: p.bg, color: p.color, padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{value}</span>
  )
}
