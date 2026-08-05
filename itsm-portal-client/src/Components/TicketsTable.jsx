import React from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from './Badge'
import EmptyState from './EmptyState'
import { useAuth } from '../contexts/AuthContext'

export default function TicketsTable({ tickets, loading, error, onAssignClick }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (loading) return <div className="dashboard-empty">Loading tickets...</div>
  if (error) return <div className="dashboard-form-error">Error loading tickets: {error}</div>

  if (!tickets || tickets.length === 0) return <EmptyState title="No tickets" description="There are no tickets to display." />

  const canAssign = onAssignClick && user && ['Admin', 'Technician'].includes(user.role)

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>SLA</th>
            <th>Created</th>
            <th>Created By</th>
            <th>Assigned To</th>
            {canAssign && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>
                <button type="button" onClick={() => navigate(`/tickets/${t.id}`)} className="dashboard-ticket-title" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                  {t.title}
                </button>
                <div className="dashboard-ticket-meta">{t.description && t.description.substring(0, 120)}</div>
              </td>
              <td><Badge type="priority" value={t.priority || 'Low'} /></td>
              <td><Badge type="status" value={t.status || 'Open'} /></td>
              <td><Badge type="sla" value={t.slaStatus || 'None'} /></td>
              <td>{new Date(t.createdDate).toLocaleString()}</td>
              <td>{t.createdBy ?? '—'}</td>
              <td>{t.assignedTo ?? '—'}</td>
              {canAssign && (
                <td>
                  <button type="button" onClick={() => onAssignClick(t)} className="dashboard-table-action">Assign</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
