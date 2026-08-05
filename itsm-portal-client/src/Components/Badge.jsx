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
    High: { bg: '#fff1f2', color: '#991b1b' },
    Critical: { bg: '#450a0a', color: '#fecaca' }
  },
  sla: {
    OnTrack: { bg: '#ecfdf5', color: '#065f46' },
    AtRisk: { bg: '#fff7ed', color: '#92400e' },
    Breached: { bg: '#fff1f2', color: '#991b1b' },
    Met: { bg: '#ecfeff', color: '#0f766e' },
    None: { bg: '#f3f4f6', color: '#374151' }
  }
}

export default function Badge({ type = 'status', value }) {
  const p = (palette[type] && palette[type][value]) || { bg: '#f3f4f6', color: '#374151' }
  const label = type === 'sla' ? String(value || 'None').replace(/([a-z])([A-Z])/g, '$1 $2') : value
  return (
    <span style={{ background: p.bg, color: p.color, padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid transparent' }}>{label}</span>
  )
}
