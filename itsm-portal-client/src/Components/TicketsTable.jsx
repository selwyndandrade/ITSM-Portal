import React from 'react'
import { useNavigate } from 'react-router-dom'
import DataGrid from './DataGrid'
import Badge from './Badge'
import { useAuth } from '../contexts/AuthContext'

const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 }
const SLA_RANK = { Breached: 4, AtRisk: 3, OnTrack: 2, Met: 1, None: 0 }

function formatNumber(id) {
  return `TCK${String(id ?? 0).padStart(7, '0')}`
}

function formatOptionLabel(value) {
  return String(value).replace(/([a-z])([A-Z])/g, '$1 $2')
}

function selectOptions(values) {
  return values.map((value) => ({ value, label: formatOptionLabel(value) }))
}

export default function TicketsTable({ tickets, loading, error, onAssignClick }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const canAssign = onAssignClick && user && ['Admin', 'Technician'].includes(user.role)

  const columns = [
    {
      key: 'number',
      label: 'Number',
      filter: 'text',
      filterText: (t) => String(t.id),
      sortValue: (t) => Number(t.id) || 0,
      render: (t) => (
        <button type="button" onClick={() => navigate(`/tickets/${t.id}`)} className="dashboard-ticket-number">
          {formatNumber(t.id)}
        </button>
      )
    },
    {
      key: 'description',
      label: 'Short Description',
      filter: 'text',
      filterText: (t) => `${t.title || ''} ${t.description || ''}`,
      sortValue: (t) => (t.title || '').toLowerCase(),
      render: (t) => (
        <>
          <div className="dashboard-ticket-title">{t.title}</div>
          <div className="dashboard-ticket-meta">{t.description && t.description.substring(0, 120)}</div>
        </>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      filter: 'select',
      filterOptions: selectOptions(['Critical', 'High', 'Medium', 'Low']),
      filterValue: (t) => t.priority || 'Low',
      sortValue: (t) => PRIORITY_RANK[t.priority] || 0,
      render: (t) => <Badge type="priority" value={t.priority || 'Low'} variant="dot" />
    },
    {
      key: 'status',
      label: 'Status',
      filter: 'select',
      filterOptions: selectOptions(['Open', 'In Progress', 'Pending', 'Resolved', 'Closed']),
      filterValue: (t) => t.status || 'Open',
      sortValue: (t) => (t.status || '').toLowerCase(),
      render: (t) => t.status || 'Open'
    },
    {
      key: 'sla',
      label: 'SLA',
      filter: 'select',
      filterOptions: selectOptions(['OnTrack', 'AtRisk', 'Breached', 'Met', 'None']),
      filterValue: (t) => t.slaStatus || 'None',
      sortValue: (t) => SLA_RANK[t.slaStatus] ?? -1,
      render: (t) => <Badge type="sla" value={t.slaStatus || 'None'} variant="dot" />
    },
    {
      key: 'createdDate',
      label: 'Created',
      sortValue: (t) => new Date(t.createdDate).getTime() || 0,
      render: (t) => new Date(t.createdDate).toLocaleString()
    },
    {
      key: 'createdBy',
      label: 'Created By',
      filter: 'text',
      sortValue: (t) => (t.createdBy || '').toLowerCase(),
      render: (t) => t.createdBy ?? '—'
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      filter: 'text',
      sortValue: (t) => (t.assignedTo || '').toLowerCase(),
      render: (t) => t.assignedTo ?? '—'
    }
  ]

  return (
    <DataGrid
      columns={columns}
      rows={tickets}
      getRowKey={(t) => t.id}
      loading={loading}
      error={error}
      loadingMessage="Loading tickets..."
      errorPrefix="Error loading tickets"
      emptyTitle="No Tickets"
      emptyDescription="There are no tickets to display."
      noMatchMessage="No tickets match these filters."
      initialSort={{ key: 'createdDate', dir: 'desc' }}
      actionsColumn={canAssign ? { label: 'Actions', render: (t) => <button type="button" onClick={() => onAssignClick(t)} className="dashboard-table-action">Assign</button> } : null}
    />
  )
}
