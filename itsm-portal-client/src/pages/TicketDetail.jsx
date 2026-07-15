import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket, postComment } from '../services/ticketService'

export default function TicketDetail() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [commentText, setCommentText] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await getTicket(id)
      setTicket(res)
    } catch (ex) {
      setError(ex?.response?.data?.message || ex.message || 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
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

  if (loading) return <div>Loading ticket...</div>
  if (error) return <div style={{ color: '#b00020' }}>{error}</div>
  if (!ticket) return <div>No ticket found.</div>

  return (
    <div style={{ padding: 16 }}>
      <h2>{ticket.title}</h2>
      <div style={{ marginBottom: 12 }}>{ticket.description}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div><strong>Status:</strong> {ticket.status}</div>
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
    </div>
  )
}
