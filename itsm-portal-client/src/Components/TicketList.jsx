import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function getBadgeClass(value, type) {
  const normalized = (value || '').toString().toLowerCase()
  if (type === 'priority') {
    if (normalized.includes('high')) return 'dashboard-badge dashboard-badge--high'
    if (normalized.includes('medium')) return 'dashboard-badge dashboard-badge--medium'
    return 'dashboard-badge dashboard-badge--low'
  }

  if (type === 'status') {
    if (normalized.includes('in progress')) return 'dashboard-badge dashboard-badge--in-progress'
    if (normalized.includes('pending')) return 'dashboard-badge dashboard-badge--pending'
    if (normalized.includes('resolved') || normalized.includes('closed')) return 'dashboard-badge dashboard-badge--resolved'
    return 'dashboard-badge dashboard-badge--open'
  }

  return 'dashboard-badge'
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TicketList({ tickets = [], loading, error, onAssignClick }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  if (loading) return <div className="dashboard-empty">Loading your queue…</div>
  if (error) return <div style={{ color: '#b00020' }}>We could not refresh the queue right now. Please try again shortly.</div>
  if (!tickets.length) return <div className="dashboard-empty">No active tickets yet. Create a request or submit a new issue to get started.</div>

  const canAssign = user && ['Admin', 'Technician'].includes(user.role)

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ticket</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned</th>
            <th>Created</th>
            <th>Updated</th>
            {canAssign ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>#{ticket.id}</td>
              <td>
                <button type="button" onClick={() => navigate(`/tickets/${ticket.id}`)} className="dashboard-ticket-title" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#111827', textAlign: 'left' }}>
                  {ticket.title || 'Untitled ticket'}
                </button>
                <div className="dashboard-ticket-meta">{ticket.description ? ticket.description.slice(0, 80) : 'No summary provided'}</div>
              </td>
              <td>{ticket.category || 'Software'}</td>
              <td><span className={getBadgeClass(ticket.priority, 'priority')}>{ticket.priority || 'Medium'}</span></td>
              <td><span className={getBadgeClass(ticket.status, 'status')}>{ticket.status || 'Open'}</span></td>
              <td>{ticket.assignedTo || 'Unassigned'}</td>
              <td>{formatDate(ticket.createdDate || ticket.createdAt)}</td>
              <td>{formatDate(ticket.lastUpdated || ticket.updatedDate)}</td>
              {canAssign ? (
                <td>
                  <button type="button" onClick={() => onAssignClick?.(ticket)} style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', background: '#fff', padding: '8px 10px', cursor: 'pointer' }}>
                    Assign
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
