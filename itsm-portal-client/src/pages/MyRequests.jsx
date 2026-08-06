import React, { useEffect, useState } from 'react'
import { approveServiceRequest, getServiceRequests, rejectServiceRequest } from '../services/catalogService'
import { getErrorMessage } from '../services/ticketService'
import DataGrid from '../Components/DataGrid'
import ErrorBanner from '../Components/ErrorBanner'

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [decisionDrafts, setDecisionDrafts] = useState({})
  const [actioningId, setActioningId] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getServiceRequests()
        setRequests(data || [])
      } catch (ex) {
        setError(getErrorMessage(ex, 'Requests could not be loaded.'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleDecision(requestId, decision) {
    setActioningId(requestId)
    setError(null)
    try {
      const payload = { comments: decisionDrafts[requestId] || '', decisionByUserId: null }
      if (decision === 'approve') {
        await approveServiceRequest(requestId, payload)
      } else {
        await rejectServiceRequest(requestId, payload)
      }
      const data = await getServiceRequests()
      setRequests(data || [])
    } catch (ex) {
      setError(getErrorMessage(ex, 'The decision could not be saved.'))
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">My Requests</p>
          <h2>Track your service requests</h2>
          <p>Follow the status of each catalog request and the linked ticket.</p>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="dashboard-card asset-panel">
        <div className="dashboard-card__header">
          <div>
            <p className="dashboard-card__eyebrow">Active Requests</p>
            <h2>Service request history</h2>
          </div>
        </div>

        <DataGrid
          columns={[
            {
              key: 'service',
              label: 'Service',
              filter: 'text',
              filterText: (r) => r.catalogItemName || 'Service',
              sortValue: (r) => (r.catalogItemName || '').toLowerCase(),
              render: (r) => r.catalogItemName || 'Service'
            },
            {
              key: 'status',
              label: 'Status',
              filter: 'select',
              filterOptions: [
                { value: 'submitted', label: 'Submitted' },
                { value: 'in progress', label: 'In Progress' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ],
              filterValue: (r) => (r.status || '').toLowerCase(),
              sortValue: (r) => (r.status || '').toLowerCase(),
              render: (r) => r.status
            },
            {
              key: 'approvalStatus',
              label: 'Approval',
              filter: 'select',
              filterOptions: [
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ],
              filterValue: (r) => (r.approvalStatus || '').toLowerCase(),
              sortValue: (r) => (r.approvalStatus || '').toLowerCase(),
              render: (r) => r.approvalStatus
            },
            {
              key: 'ticketId',
              label: 'Ticket',
              sortValue: (r) => Number(r.ticketId) || 0,
              render: (r) => (r.ticketId ? `#${r.ticketId}` : '—')
            },
            {
              key: 'createdDate',
              label: 'Created',
              sortValue: (r) => new Date(r.createdDate).getTime() || 0,
              render: (r) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span>{new Date(r.createdDate).toLocaleString()}</span>
                  {(r.approvalStatus || '').toLowerCase() === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        rows={2}
                        value={decisionDrafts[r.id] || ''}
                        onChange={(event) => setDecisionDrafts((current) => ({ ...current, [r.id]: event.target.value }))}
                        placeholder="Optional approval comment"
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="theme-button theme-button--secondary" disabled={actioningId === r.id} onClick={() => handleDecision(r.id, 'approve')}>Approve</button>
                        <button type="button" className="theme-button" disabled={actioningId === r.id} onClick={() => handleDecision(r.id, 'reject')}>Reject</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            }
          ]}
          rows={requests}
          getRowKey={(r) => r.id}
          loading={loading}
          loadingMessage="Loading requests..."
          emptyTitle="No Requests"
          emptyDescription="You haven't submitted any service requests yet."
          noMatchMessage="No requests match these filters."
          initialSort={{ key: 'createdDate', dir: 'desc' }}
        />
      </div>
    </div>
  )
}
