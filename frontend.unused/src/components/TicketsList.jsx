import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { Link } from 'react-router-dom'

export default function TicketsList() {
  const [tickets, setTickets] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get('/api/tickets', { params: { page, pageSize } })
        if (mounted) {
          setTickets(res.data.items || [])
          setTotal(res.data.totalCount || 0)
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load tickets')
      }
    })()
    return () => (mounted = false)
  }, [page, pageSize])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.post('/api/tickets', { title: newTitle, description: newDescription })
      setNewTitle('')
      setNewDescription('')
      // refresh list
      setPage(1)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create ticket')
    } finally {
      setCreating(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (error) return <div className="error">{error}</div>

  return (
    <div className="tickets-container">
      <h2>Tickets</h2>

      <form onSubmit={handleCreate} style={{ marginBottom: 12 }}>
        <h3>Create Ticket</h3>
        <input required placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <input required placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
        <button type="submit" disabled={creating}>Create</button>
      </form>

      <ul>
        {tickets.map((t) => (
          <li key={t.id} className="ticket">
            <Link to={`/tickets/${t.id}`}>
              <strong>{t.title}</strong>
            </Link>
            <div>Status: {t.status}</div>
            <div>Priority: {t.priority}</div>
            <div>Created: {new Date(t.createdDate).toLocaleString()}</div>
            <div>CreatedBy: {t.createdBy ?? '—'}</div>
            <div>AssignedTo: {t.assignedTo ?? '—'}</div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
        <span style={{ margin: '0 8px' }}>Page {page} / {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
      </div>
    </div>
  )
}
