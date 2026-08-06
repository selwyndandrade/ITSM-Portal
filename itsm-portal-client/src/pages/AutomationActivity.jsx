import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { getErrorMessage } from '../services/ticketService'
import DataGrid from '../Components/DataGrid'
import DashboardCard from '../Components/DashboardCard'
import ErrorBanner from '../Components/ErrorBanner'

const statusOptions = ['Succeeded', 'Failed', 'Skipped']
const triggerOptions = ['TicketCreated', 'TicketUpdated', 'ServiceRequestSubmitted', 'ServiceRequestApproved', 'ServiceRequestRejected', 'AssetAssigned']
const statusDotColor = { Succeeded: '#22c55e', Failed: '#dc2626', Skipped: '#94a3b8' }

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export default function AutomationActivity() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [triggerType, setTriggerType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadActivities() {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/api/automationexecutions', {
        params: { search, status, triggerType, page, pageSize }
      })
      setItems(response.data?.items || [])
      setTotalCount(response.data?.totalCount || 0)
    } catch (ex) {
      setError(getErrorMessage(ex, 'Automation activity could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, triggerType])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      loadActivities()
    }, 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleFilterChange(key, value) {
    setPage(1)
    if (key === 'triggerType') setTriggerType(value)
    else if (key === 'status') setStatus(value)
    else if (key === 'message') setSearch(value)
  }

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">Automation Activity</p>
          <h2>Execution history and outcomes</h2>
          <p>Monitor rule executions, trace related tickets and requests, and review automation outcomes.</p>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="dashboard-card">
        <div className="dashboard-card__header">
          <div>
            <p className="dashboard-card__eyebrow">Activity Feed</p>
            <h2>Recent automation runs</h2>
          </div>
        </div>

        <DataGrid
          serverMode
          columns={[
            {
              key: 'triggerType',
              label: 'Trigger',
              filter: 'select',
              filterOptions: triggerOptions,
              sortable: false,
              render: (item) => item.triggerEvent
            },
            {
              key: 'message',
              label: 'Rule / Message',
              filter: 'text',
              placeholder: 'Search rule, message, trigger',
              sortable: false,
              render: (item) => (
                <>
                  <div className="dashboard-ticket-meta">{item.ruleName}</div>
                  <div className="dashboard-ticket-title">{item.message || 'No details recorded'}</div>
                </>
              )
            },
            {
              key: 'status',
              label: 'Status',
              filter: 'select',
              filterOptions: statusOptions,
              sortable: false,
              render: (item) => (
                <span className="dashboard-dot-label">
                  <span className="dashboard-dot" style={{ background: statusDotColor[item.status] || '#94a3b8' }} />
                  {item.status}
                </span>
              )
            },
            {
              key: 'relatedEntity',
              label: 'Related Entity',
              sortable: false,
              render: (item) => `${item.relatedEntityType || '—'} #${item.relatedEntityId || '—'}`
            },
            {
              key: 'triggeredAt',
              label: 'Triggered At',
              sortable: false,
              render: (item) => formatDate(item.triggeredAt)
            }
          ]}
          rows={items}
          getRowKey={(item) => item.id}
          loading={loading}
          loadingMessage="Loading activity..."
          emptyTitle="No Automation Activity"
          emptyDescription="No automation activity has been recorded yet."
          noMatchMessage="No automation activity matched the current filters."
          selectable={false}
          filters={{ triggerType, status, message: search }}
          onFilterChange={handleFilterChange}
          page={page}
          onPageChange={setPage}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      </div>
    </div>
  )
}
