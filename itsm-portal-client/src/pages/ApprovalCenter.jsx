import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApprovalRequests, approveRequest, rejectRequest } from '../services/approvalService'
import { emitToast } from '../utils/toast'

const statusOptions = ['All', 'Pending', 'Approved', 'Rejected', 'Overdue']

function getStatusBadge(status) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'approved') return 'status-badge status-badge--active'
  if (normalized === 'rejected') return 'status-badge status-badge--disabled'
  if (normalized === 'pending') return 'status-badge status-badge--draft'
  return 'status-badge status-badge--disabled'
}

export default function ApprovalCenter() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'Pending', requester: '', department: '', requestType: '' })
  const [savingId, setSavingId] = useState(null)

  async function loadApprovals() {
    setLoading(true)
    try {
      const data = await getApprovalRequests(filters)
      setRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      emitToast('Unable to load approvals right now.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApprovals()
  }, [])

  const filtered = useMemo(() => requests || [], [requests])

  async function handleDecision(id, decision) {
    setSavingId(id)
    try {
      if (decision === 'approve') {
        await approveRequest(id, { comments: 'Approved from approval center', decisionByUserId: null })
      } else {
        await rejectRequest(id, { comments: 'Rejected from approval center', decisionByUserId: null })
      }
      emitToast(`Request ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`, 'success')
      await loadApprovals()
    } catch (error) {
      emitToast('Approval action failed.', 'error')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">APPROVAL CENTER</p>
          <h2>Manager approval workspace</h2>
          <p>Review, decide, and track service request approvals from a single executive-ready dashboard.</p>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="dashboard-card__header">
          <div>
            <p className="dashboard-card__eyebrow">Filters</p>
            <h3>Find approvals quickly</h3>
          </div>
        </div>
        <div className="automation-rule-card__stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginTop: 8 }}>
          <div>
            <span>Status</span>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              {statusOptions.map((option) => <option key={option} value={option === 'All' ? '' : option}>{option}</option>)}
            </select>
          </div>
          <div>
            <span>Requester</span>
            <input value={filters.requester} onChange={(event) => setFilters({ ...filters, requester: event.target.value })} placeholder="Name or email" />
          </div>
          <div>
            <span>Department</span>
            <input value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })} placeholder="Department" />
          </div>
          <div>
            <span>Request type</span>
            <input value={filters.requestType} onChange={(event) => setFilters({ ...filters, requestType: event.target.value })} placeholder="Service type" />
          </div>
        </div>
        <div className="automation-actions" style={{ marginTop: 12 }}>
          <button type="button" className="theme-button" onClick={loadApprovals}>Apply filters</button>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card__header">
          <div>
            <p className="dashboard-card__eyebrow">Approval queue</p>
            <h3>{filters.status || 'All'} approvals</h3>
          </div>
        </div>

        {loading ? <div className="dashboard-empty">Loading approvals…</div> : null}

        {!loading && !filtered.length ? <div className="dashboard-empty">No approvals match the current filters.</div> : null}

        {!loading && filtered.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map((request) => (
              <div key={request.id} className="automation-rule-card">
                <div className="automation-rule-card__top">
                  <div>
                    <div className={getStatusBadge(request.status)}>{request.status || 'Pending'}</div>
                    <div className="automation-rule-card__title">{request.requestType || 'Service request'}</div>
                    <div className="automation-rule-card__description">Requested by {request.requesterName || 'Unknown'} • {request.department || 'Unknown department'}</div>
                  </div>
                  <div className="automation-rule-card__meta">
                    <div>Created {new Date(request.createdDate).toLocaleString()}</div>
                    <div>{request.ticketTitle || 'No linked ticket'}</div>
                  </div>
                </div>

                <div className="automation-rule-card__summary">Business justification: {request.businessJustification || 'No business justification provided.'}</div>

                <div className="automation-rule-card__stats">
                  <div>
                    <span>Workflow</span>
                    <strong>{request.workflowStatus || 'Pending'}</strong>
                  </div>
                  <div>
                    <span>Requester</span>
                    <strong>{request.requesterEmail || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span>History</span>
                    <strong>{Array.isArray(request.approvalHistory) ? request.approvalHistory.length : 0} entries</strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>{request.completedDate ? new Date(request.completedDate).toLocaleString() : 'Pending'}</strong>
                  </div>
                </div>

                <div className="automation-rule-card__actions">
                  <button type="button" className="theme-button theme-button--secondary" onClick={() => navigate(`/approvals/${request.id}`)}>View details</button>
                  <button type="button" className="theme-button" disabled={savingId === request.id} onClick={() => handleDecision(request.id, 'approve')}>Approve</button>
                  <button type="button" className="theme-button theme-button--secondary" disabled={savingId === request.id} onClick={() => handleDecision(request.id, 'reject')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
