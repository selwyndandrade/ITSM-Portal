import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket, postComment, updateStatus, getHistory, getErrorMessage, getAttachments, uploadAttachment, downloadAttachment, deleteAttachment } from '../services/ticketService'
import { useAuth } from '../contexts/AuthContext'
import TicketHistory from '../Components/TicketHistory'
import RoleGuard from '../Components/RoleGuard'
import Avatar from '../Components/Avatar'
import Badge from '../Components/Badge'
import { getTicketAssist } from '../services/aiService'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function getStatusBadgeClass(value) {
  const normalized = (value || '').toString().toLowerCase()
  if (normalized.includes('in progress')) return 'dashboard-badge dashboard-badge--in-progress'
  if (normalized.includes('pending')) return 'dashboard-badge dashboard-badge--pending'
  if (normalized.includes('resolved') || normalized.includes('closed')) return 'dashboard-badge dashboard-badge--resolved'
  return 'dashboard-badge dashboard-badge--open'
}

function getPriorityBadgeClass(value) {
  const normalized = (value || '').toString().toLowerCase()
  if (normalized.includes('high')) return 'dashboard-badge dashboard-badge--high'
  if (normalized.includes('medium')) return 'dashboard-badge dashboard-badge--medium'
  return 'dashboard-badge dashboard-badge--low'
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TicketDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [status, setStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [attachmentError, setAttachmentError] = useState(null)
  const [aiAssist, setAiAssist] = useState(null)
  const [aiAssistLoading, setAiAssistLoading] = useState(false)
  const [aiAssistError, setAiAssistError] = useState(null)

  const canUpdateStatus = user && ['Admin', 'Technician'].includes(user.role)
  const requesterName = ticket?.requester || ticket?.createdBy || 'Unassigned'
  const assignedName = ticket?.assignedTechnician || ticket?.assignedTo || 'Unassigned'
  const assetLabel = ticket?.assetName || ticket?.assetTag || (ticket?.assetId ? 'Asset linked' : 'No asset linked')

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await getTicket(id)
      const ticketData = res && typeof res === 'object' && res.ticket ? res.ticket : res
      setTicket(ticketData)
      setStatus(ticketData?.status || 'Open')
      // load history
      try {
        const h = await getHistory(id)
        setHistory(h)
      } catch (ex) {
        // ignore history load errors
      }
      // load attachments
      try {
        const a = await getAttachments(id)
        setAttachments(Array.isArray(a) ? a : [])
      } catch (ex) {
        // ignore attachment load errors
      }
    } catch (ex) {
      setError(getErrorMessage(ex, 'Failed to load ticket. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    try {
      await postComment(ticket.id, { comment: commentText })
      setCommentText('')
      await load()
    } catch (ex) {
      setError(getErrorMessage(ex, 'Failed to post comment. Please try again.'))
    }
  }

  async function handleUpdateStatus() {
    if (!ticket) return
    setUpdatingStatus(true)
    setSuccessMessage(null)
    try {
      await updateStatus(ticket.id, status)
      setSuccessMessage('Status updated')
      await load()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (ex) {
      setError(getErrorMessage(ex, 'Failed to update status. Please try again.'))
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file || !ticket) return
    setAttachmentError(null)
    setUploading(true)
    try {
      await uploadAttachment(ticket.id, file)
      await load()
    } catch (ex) {
      setAttachmentError(getErrorMessage(ex, 'Failed to upload attachment. Please try again.'))
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(attachment) {
    setAttachmentError(null)
    try {
      await downloadAttachment(attachment.id, attachment.fileName)
    } catch (ex) {
      setAttachmentError(getErrorMessage(ex, 'Failed to download attachment. Please try again.'))
    }
  }

  async function handleDeleteAttachment(attachment) {
    setAttachmentError(null)
    try {
      await deleteAttachment(attachment.id)
      await load()
    } catch (ex) {
      setAttachmentError(getErrorMessage(ex, 'Failed to delete attachment. Please try again.'))
    }
  }

  async function handleGetAiAssist() {
    if (!ticket) return
    setAiAssistLoading(true)
    setAiAssistError(null)
    try {
      const result = await getTicketAssist(ticket.id)
      setAiAssist(result)
    } catch (ex) {
      setAiAssistError(getErrorMessage(ex, 'AI assist is unavailable right now.'))
    } finally {
      setAiAssistLoading(false)
    }
  }

  if (loading) return <div className="dashboard-empty">Loading ticket…</div>
  if (error) return <div className="dashboard-empty" style={{ color: '#b00020' }}>{error}</div>
  if (!ticket) return <div className="dashboard-empty">No ticket found.</div>

  return (
    <div className="ticket-detail-shell">
      <div className="ticket-detail-hero">
        <div>
          <p className="dashboard-eyebrow">KYRO TICKET DETAIL</p>
          <h2>{ticket.title}</h2>
          <p>{ticket.description}</p>
        </div>
        <div className="ticket-detail-actions">
          <span className={getPriorityBadgeClass(ticket.priority)}>{ticket.priority || 'Medium'}</span>
          <span className={getStatusBadgeClass(ticket.status)}>{ticket.status || 'Open'}</span>
        </div>
      </div>

      <div className="ticket-detail-tabs">
        <button type="button" className={`ticket-detail-tab${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button type="button" className={`ticket-detail-tab${activeTab === 'activity' ? ' active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</button>
      </div>

      {activeTab === 'overview' ? (
        <div className="ticket-detail-grid">
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Summary</p>
                <h2>Service details</h2>
              </div>
            </div>
            <div className="ticket-detail-meta">
              <div><span>Status</span><strong>{ticket.status || 'Open'}</strong></div>
              <div><span>Priority</span><strong>{ticket.priority || 'Medium'}</strong></div>
              <div><span>Category</span><strong>{ticket.category || 'General'}</strong></div>
              <div><span>Requester</span><strong>{requesterName}</strong></div>
              <div><span>Assigned technician</span><strong>{assignedName}</strong></div>
              <div><span>Linked asset</span><strong>{assetLabel}</strong></div>
              <div><span>SLA</span><strong><Badge type="sla" value={ticket?.slaStatus || 'None'} /></strong></div>
              <div><span>Created</span><strong>{formatDate(ticket.createdDate)}</strong></div>
              <div><span>Updated</span><strong>{formatDate(ticket.updatedDate || ticket.updatedDate || ticket.createdDate)}</strong></div>
              {ticket.responseDeadline ? <div><span>Response due</span><strong>{formatDate(ticket.responseDeadline)}</strong></div> : null}
              {ticket.resolutionDeadline ? <div><span>Resolution due</span><strong>{formatDate(ticket.resolutionDeadline)}</strong></div> : null}
            </div>

            <div className="ticket-insight-card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>Timeline snapshot</strong>
                <span className={getStatusBadgeClass(ticket.status)}>{ticket.status || 'Open'}</span>
              </div>
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                Requester: {requesterName}<br />
                Assigned technician: {assignedName}<br />
                Last updated: {formatDate(ticket.updatedDate || ticket.createdDate)}
              </div>
            </div>

            <RoleGuard roles={['Admin', 'Technician']}>
              <div className="ticket-detail-status-block">
                <label htmlFor="ticket-status">Update status</label>
                <select id="ticket-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option>Open</option>
                  <option>Assigned</option>
                  <option>In Progress</option>
                  <option>Pending</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
                <button type="button" onClick={handleUpdateStatus} disabled={updatingStatus}>{updatingStatus ? 'Updating...' : 'Update status'}</button>
                {successMessage && <span className="ticket-detail-success">{successMessage}</span>}
              </div>
            </RoleGuard>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Comments</p>
                <h2>Conversation</h2>
              </div>
            </div>
            <div className="ticket-comment-list">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment) => (
                  <div key={comment.id} className="ticket-comment-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Avatar src={comment.profileImageUrl || null} name={comment.createdBy || 'User'} size={34} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{comment.createdBy || 'User'}</div>
                        <div className="ticket-comment-meta">{formatDate(comment.createdDate)}</div>
                      </div>
                    </div>
                    <div>{comment.comment}</div>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty">No comments yet.</div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="ticket-comment-form">
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={4} placeholder="Add a follow-up or status update" />
              <button type="submit">Add comment</button>
            </form>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Files</p>
                <h2>Attachments</h2>
              </div>
            </div>
            {attachmentError && <div className="dashboard-empty" style={{ color: '#b00020' }}>{attachmentError}</div>}
            <div className="ticket-comment-list">
              {attachments.length > 0 ? (
                attachments.map((attachment) => (
                  <div key={attachment.id} className="ticket-comment-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{attachment.fileName}</div>
                      <div className="ticket-comment-meta">{formatBytes(attachment.fileSizeBytes)} · {attachment.uploadedBy} · {formatDate(attachment.uploadedDate)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => handleDownload(attachment)}>Download</button>
                      {(user?.email === attachment.uploadedBy || ['Admin', 'Technician'].includes(user?.role)) && (
                        <button type="button" onClick={() => handleDeleteAttachment(attachment)}>Delete</button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty">No attachments yet.</div>
              )}
            </div>
            <div className="ticket-comment-form">
              <input type="file" onChange={handleFileUpload} disabled={uploading} />
              {uploading && <span className="ticket-comment-meta">Uploading…</span>}
            </div>
          </div>

          <RoleGuard roles={['Admin', 'Technician']}>
            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <p className="dashboard-card__eyebrow">AI Assist</p>
                  <h2>Suggested response &amp; root cause</h2>
                </div>
                <button type="button" onClick={handleGetAiAssist} disabled={aiAssistLoading}>
                  {aiAssistLoading ? 'Thinking…' : aiAssist ? 'Refresh suggestions' : 'Get AI suggestions'}
                </button>
              </div>
              {aiAssistError && <div className="dashboard-empty" style={{ color: '#b00020' }}>{aiAssistError}</div>}
              {!aiAssist && !aiAssistLoading && !aiAssistError && (
                <div className="dashboard-empty">Get an AI-drafted reply, a likely root cause, and next steps for this ticket.</div>
              )}
              {aiAssist && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <strong>Suggested response</strong>
                    <p style={{ marginTop: 6, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiAssist.suggestedResponse}</p>
                  </div>
                  <div>
                    <strong>Likely root cause</strong>
                    <p style={{ marginTop: 6, color: '#334155', lineHeight: 1.6 }}>{aiAssist.rootCauseSuggestion}</p>
                  </div>
                  {aiAssist.nextSteps && aiAssist.nextSteps.length > 0 && (
                    <div>
                      <strong>Next steps</strong>
                      <ul style={{ marginTop: 6, color: '#334155', lineHeight: 1.6, paddingLeft: 20 }}>
                        {aiAssist.nextSteps.map((step, index) => <li key={index}>{step}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </RoleGuard>
        </div>
      ) : (
        <div className="dashboard-card ticket-history-card"><TicketHistory items={history} /></div>
      )}
    </div>
  )
}
