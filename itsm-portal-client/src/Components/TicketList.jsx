import React from 'react'
import { useNavigate } from 'react-router-dom'
import DataGrid from './DataGrid'
import Badge from './Badge'
import { useAuth } from '../contexts/AuthContext'

function formatNumber(id) {
  return `TCK${String(id ?? 0).padStart(7, '0')}`
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

  const canAssign = onAssignClick && user && ['Admin', 'Technician'].includes(user.role)

  return (
    <DataGrid
      columns={[
        {
          key: 'number',
          label: 'Number',
          sortValue: (t) => Number(t.id) || 0,
          render: (t) => (
            <button type="button" onClick={() => navigate(`/tickets/${t.id}`)} className="dashboard-ticket-number">
              {formatNumber(t.id)}
            </button>
          )
        },
        {
          key: 'ticket',
          label: 'Ticket',
          sortValue: (t) => (t.title || '').toLowerCase(),
          render: (t) => (
            <>
              <div className="dashboard-ticket-title">{t.title || 'Untitled ticket'}</div>
              <div className="dashboard-ticket-meta">{t.description ? t.description.slice(0, 80) : 'No summary provided'}</div>
            </>
          )
        },
        {
          key: 'category',
          label: 'Category',
          sortValue: (t) => (t.category || '').toLowerCase(),
          render: (t) => t.category || 'Software'
        },
        {
          key: 'priority',
          label: 'Priority',
          sortValue: (t) => ({ Critical: 4, High: 3, Medium: 2, Low: 1 }[t.priority] || 0),
          render: (t) => <Badge type="priority" value={t.priority || 'Medium'} variant="dot" />
        },
        {
          key: 'status',
          label: 'Status',
          sortValue: (t) => (t.status || '').toLowerCase(),
          render: (t) => t.status || 'Open'
        },
        {
          key: 'assignedTo',
          label: 'Assigned',
          sortValue: (t) => (t.assignedTo || '').toLowerCase(),
          render: (t) => t.assignedTo || 'Unassigned'
        },
        {
          key: 'createdDate',
          label: 'Created',
          sortValue: (t) => new Date(t.createdDate || t.createdAt).getTime() || 0,
          render: (t) => formatDate(t.createdDate || t.createdAt)
        },
        {
          key: 'lastUpdated',
          label: 'Updated',
          sortValue: (t) => new Date(t.lastUpdated || t.updatedDate).getTime() || 0,
          render: (t) => formatDate(t.lastUpdated || t.updatedDate)
        }
      ]}
      rows={tickets}
      getRowKey={(t) => t.id}
      loading={loading}
      error={error}
      loadingMessage="Loading your queue..."
      errorPrefix="Could not refresh the queue"
      emptyTitle="No Active Tickets"
      emptyDescription="No active tickets yet. Create a request or submit a new issue to get started."
      initialSort={{ key: 'createdDate', dir: 'desc' }}
      selectable={false}
      showPagination={false}
      pageSize={tickets.length || 1}
      actionsColumn={canAssign ? { label: 'Action', render: (t) => <button type="button" onClick={() => onAssignClick?.(t)} className="dashboard-table-action">Assign</button> } : null}
    />
  )
}
