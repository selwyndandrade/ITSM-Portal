import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getApprovalDetails, approveRequest, rejectRequest } from '../services/approvalService'
import { emitToast } from '../utils/toast'

export default function ApprovalDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadDetail() {
    setLoading(true)
    try {
      const data = await getApprovalDetails(id)
      setRequest(data)
    } catch (error) {
      emitToast('Unable to load approval details.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  async function handleDecision(decision) {
    setSaving(true)
    try {
      if (decision === 'approve') {
        await approveRequest(id, { comments: 'Approved from detail view', decisionByUserId: null })
      } else {
        await rejectRequest(id, { comments: 'Rejected from detail view', decisionByUserId: null })
      }
      emitToast(`Request ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`, 'success')
      await loadDetail()
    } catch (error) {
      emitToast('Approval action failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="dashboard-empty">Loading approval details…</div>
  if (!request) return <div className="dashboard-empty">Approval request not found.</div>

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">APPROVAL DETAILS</p>
          <h2>{request.requestType || 'Approval request'}</h2>
          <p>Inspect the request context and complete a decision from one place.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Request information</p>
              <h3>{request.requestType || 'Service request'}</h3>
            </div>
          </div>
          <div className="automation-rule-card__stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 8 }}>
            <div><span>Requester</span><strong>{request.requesterName || 'Unknown'}</strong></div>
            <div><span>Email</span><strong>{request.requesterEmail || 'Unknown'}</strong></div>
            <div><span>Department</span><strong>{request.department || 'Unknown'}</strong></div>
            <div><span>Status</span><strong>{request.status || 'Pending'}</strong></div>
          </div>
          <div className="automation-card__helper" style={{ marginTop: 10 }}>
            <strong>Business justification</strong>
            <p>{request.businessJustification || 'No justification provided.'}</p>
          </div>
          <div className="automation-actions" style={{ marginTop: 12 }}>
            <button type="button" className="theme-button" disabled={saving} onClick={() => handleDecision('approve')}>Approve request</button>
            <button type="button" className="theme-button theme-button--secondary" disabled={saving} onClick={() => handleDecision('reject')}>Reject request</button>
            <button type="button" className="theme-button theme-button--secondary" onClick={() => navigate('/approvals')}>Back to queue</button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Timeline</p>
              <h3>Approval history</h3>
            </div>
          </div>
          {Array.isArray(request.history) && request.history.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {request.history.map((entry) => (
                <div key={entry.id} className="ticket-comment-item">
                  <div className="ticket-comment-meta">{entry.decision || 'Pending'} • {entry.decisionByUserName || 'System'}</div>
                  <div>{entry.comments || 'No comments provided.'}</div>
                  <div>{new Date(entry.createdDate).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : <div className="dashboard-empty">No approval history yet.</div>}
        </div>
      </div>
    </div>
  )
}
