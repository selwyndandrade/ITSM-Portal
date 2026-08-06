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

const dotColors = {
  status: {
    Open: '#3b82f6',
    Assigned: '#8b5cf6',
    'In Progress': '#f59e0b',
    Resolved: '#0d9488',
    Closed: '#94a3b8'
  },
  priority: {
    Low: '#22c55e',
    Medium: '#eab308',
    High: '#f97316',
    Critical: '#dc2626'
  },
  sla: {
    OnTrack: '#22c55e',
    AtRisk: '#eab308',
    Breached: '#dc2626',
    Met: '#0ea5e9',
    None: '#94a3b8'
  }
}

function formatLabel(type, value) {
  return type === 'sla' ? String(value || 'None').replace(/([a-z])([A-Z])/g, '$1 $2') : value
}

export default function Badge({ type = 'status', value, variant = 'pill' }) {
  const label = formatLabel(type, value)

  if (variant === 'dot') {
    const dotColor = (dotColors[type] && dotColors[type][value]) || '#94a3b8'
    return (
      <span className="dashboard-dot-label">
        <span className="dashboard-dot" style={{ background: dotColor }} />
        {label}
      </span>
    )
  }

  const p = (palette[type] && palette[type][value]) || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ background: p.bg, color: p.color, padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid transparent' }}>{label}</span>
  )
}
