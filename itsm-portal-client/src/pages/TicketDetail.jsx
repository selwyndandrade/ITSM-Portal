import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket, postComment, updateStatus, getHistory } from '../services/ticketService'

import TicketHistory from '../components/TicketHistory'

export default function TicketDetail() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [status, setStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [history, setHistory] = useState([])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await getTicket(id)
      setTicket(res)
      setStatus(res.status || 'Open')
      // load history
      try {
        const h = await getHistory(id)
        setHistory(h)
      } catch (ex) {
        // ignore history load errors
      }
    } catch (ex) {
      setError(ex?.response?.data?.message || ex.message || 'Failed to load ticket')
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
      setError(ex?.response?.data?.message || ex.message || 'Failed to post comment')
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
      setError(ex?.response?.data?.message || ex.message || 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) return <div>Loading ticket...</div>
  if (error) return <div style={{ color: '#b00020' }}>{error}</div>
  if (!ticket) return <div>No ticket found.</div>

  return (
    <div style={{ padding: 16 }}>
      <h2>{ticket.title}</h2>
      <div style={{ marginBottom: 12 }}>{ticket.description}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <strong>Status:</strong>
          <div style={{ marginTop: 6 }}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8 }}>
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
            <button onClick={handleUpdateStatus} disabled={updatingStatus} style={{ marginLeft: 8, padding: '8px 10px' }}>{updatingStatus ? 'Updating...' : 'Update Status'}</button>
            {successMessage && <span style={{ marginLeft: 12, color: '#16a34a' }}>{successMessage}</span>}
          </div>
        </div>
        <div><strong>Priority:</strong> {ticket.priority}</div>
        <div><strong>Created:</strong> {new Date(ticket.createdDate).toLocaleString()}</div>
        <div><strong>Created By:</strong> {ticket.createdBy ?? '—'}</div>
        <div><strong>Assigned To:</strong> {ticket.assignedTo ?? '—'}</div>
      </div>

      <h3>Comments</h3>
      <div style={{ marginBottom: 12 }}>
        {ticket.comments && ticket.comments.length > 0 ? (
          ticket.comments.map(c => (
            <div key={c.id} style={{ padding: 8, border: '1px solid #eee', borderRadius: 6, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#555' }}>{c.createdBy} • {new Date(c.createdDate).toLocaleString()}</div>
              <div style={{ marginTop: 6 }}>{c.comment}</div>
            </div>
          ))
        ) : (
          <div>No comments yet.</div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} />
        <div style={{ marginTop: 8 }}>
          <button type="submit">Add Comment</button>
        </div>
      </form>

      <TicketHistory items={history} />
    </div>
  )
}
