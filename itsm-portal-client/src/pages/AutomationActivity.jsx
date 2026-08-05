import React, { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const statusOptions = ['All', 'Succeeded', 'Failed', 'Skipped']
const triggerOptions = ['All', 'TicketCreated', 'TicketUpdated', 'ServiceRequestSubmitted', 'ServiceRequestApproved', 'ServiceRequestRejected', 'AssetAssigned']

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
  const [status, setStatus] = useState('All')
  const [triggerType, setTriggerType] = useState('All')
  const [loading, setLoading] = useState(true)

  async function loadActivities() {
    setLoading(true)
    try {
      const response = await api.get('/api/automationexecutions', {
        params: {
          search,
          status: status === 'All' ? '' : status,
          triggerType: triggerType === 'All' ? '' : triggerType,
          page,
          pageSize
        }
      })
      setItems(response.data?.items || [])
      setTotalCount(response.data?.totalCount || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [page, status, triggerType])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      loadActivities()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">AUTOMATION ACTIVITY</p>
          <h2>Execution history and outcomes</h2>
          <p>Monitor rule executions, trace related tickets and requests, and review automation outcomes.</p>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card__header" style={{ marginBottom: 12 }}>
          <div>
            <p className="dashboard-card__eyebrow">Activity feed</p>
            <h2>Recent automation runs</h2>
          </div>
        </div>

        <div className="asset-filters" style={{ marginBottom: 12, width: '100%' }}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rule, message, trigger" />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={triggerType} onChange={(event) => setTriggerType(event.target.value)}>
            {triggerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>

        {loading ? <div className="dashboard-empty">Loading activity…</div> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.length ? items.map((item) => (
              <div key={item.id} className="ticket-comment-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div className="ticket-comment-meta">{item.triggerEvent} • {item.ruleName}</div>
                    <strong>{item.message || 'No details recorded'}</strong>
                  </div>
                  <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status}</span>
                </div>
                <div style={{ marginTop: 6, color: '#6b7280' }}>
                  Related entity: {item.relatedEntityType || '—'} #{item.relatedEntityId || '—'} • {formatDate(item.triggeredAt)}
                </div>
              </div>
            )) : <div className="dashboard-empty">No automation activity matched the current filters.</div>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="dashboard-empty">Showing {items.length} of {totalCount}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="theme-button theme-button--secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <button type="button" className="theme-button theme-button--secondary" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
