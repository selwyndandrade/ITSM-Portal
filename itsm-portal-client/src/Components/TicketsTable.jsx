import React from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from './Badge'
import EmptyState from './EmptyState'

export default function TicketsTable({ tickets, loading, error, onAssignClick }) {
  if (loading) return <div>Loading tickets...</div>
  if (error) return <div style={{ color: '#b00020' }}>Error loading tickets: {error}</div>

  if (!tickets || tickets.length === 0) return <EmptyState title="No tickets" description="There are no tickets to display." />
  const navigate = useNavigate()

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, minWidth: 800 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e6eef8' }}>
            <th style={{ padding: 12 }}>Title</th>
            <th style={{ padding: 12 }}>Priority</th>
            <th style={{ padding: 12 }}>Status</th>
            <th style={{ padding: 12 }}>Created</th>
            <th style={{ padding: 12 }}>Created By</th>
            <th style={{ padding: 12 }}>Assigned To</th>
            <th style={{ padding: 12 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: 12 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/tickets/${t.id}`) }} style={{ color: '#0f172a', fontWeight: 700 }}>{t.title}</a>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{t.description && t.description.substring(0, 120)}</div>
              </td>
              <td style={{ padding: 12 }}><Badge type="priority" value={t.priority || 'Low'} /></td>
              <td style={{ padding: 12 }}><Badge type="status" value={t.status || 'Open'} /></td>
              <td style={{ padding: 12 }}>{new Date(t.createdDate).toLocaleString()}</td>
              <td style={{ padding: 12 }}>{t.createdBy ?? '—'}</td>
              <td style={{ padding: 12 }}>{t.assignedTo ?? '—'}</td>
              <td style={{ padding: 12 }}>
                <button onClick={() => onAssignClick(t)} style={{ padding: '8px 10px', borderRadius: 6, background: '#0f172a', color: 'white', border: 'none' }}>Assign</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
