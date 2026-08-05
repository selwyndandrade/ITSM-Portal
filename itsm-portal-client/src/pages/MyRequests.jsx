import React, { useEffect, useMemo, useState } from 'react'
import { approveServiceRequest, getServiceRequests, rejectServiceRequest } from '../services/catalogService'

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [decisionDrafts, setDecisionDrafts] = useState({})
  const [actioningId, setActioningId] = useState(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getServiceRequests()
        setRequests(data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredRequests = useMemo(() => {
    if (filter === 'all') return requests
    return requests.filter((request) => (request.status || '').toLowerCase() === filter)
  }, [filter, requests])

  async function handleDecision(requestId, decision) {
    setActioningId(requestId)
    setFeedback('')
    try {
      const payload = { comments: decisionDrafts[requestId] || '', decisionByUserId: null }
      if (decision === 'approve') {
        await approveServiceRequest(requestId, payload)
      } else {
        await rejectServiceRequest(requestId, payload)
      }
      const data = await getServiceRequests()
      setRequests(data || [])
    } catch (error) {
      console.error('Failed to update approval', error)
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">MY REQUESTS</p>
          <h2>Track your service requests</h2>
          <p>Follow the status of each catalog request and the linked ticket.</p>
        </div>
      </div>

      <div className="dashboard-card asset-panel">
        <div className="dashboard-card__header asset-toolbar">
          <div>
            <p className="dashboard-card__eyebrow">Active requests</p>
            <h2>Service request history</h2>
          </div>
          <div className="asset-filters">
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All requests</option>
              <option value="submitted">Submitted</option>
              <option value="in progress">In Progress</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        {loading ? <div className="dashboard-empty">Loading requests…</div> : (
          <div className="dashboard-table-wrap" style={{ padding: '0 24px 24px' }}>
            {filteredRequests.length === 0 ? (
              <div className="dashboard-empty">No requests matched the current filter.</div>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Ticket</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.catalogItemName || 'Service'}</td>
                      <td>{request.status}</td>
                      <td>{request.approvalStatus}</td>
                      <td>{request.ticketId ? `#${request.ticketId}` : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span>{new Date(request.createdDate).toLocaleString()}</span>
                          {(request.approvalStatus || '').toLowerCase() === 'pending' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <textarea
                                rows={2}
                                value={decisionDrafts[request.id] || ''}
                                onChange={(event) => setDecisionDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                                placeholder="Optional approval comment"
                              />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" className="theme-button theme-button--secondary" disabled={actioningId === request.id} onClick={() => handleDecision(request.id, 'approve')}>Approve</button>
                                <button type="button" className="theme-button" disabled={actioningId === request.id} onClick={() => handleDecision(request.id, 'reject')}>Reject</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
