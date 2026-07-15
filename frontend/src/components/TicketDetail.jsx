import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'

export default function TicketDetail() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get(`/api/tickets/${id}`)
        if (mounted) setTicket(res.data)
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load ticket')
      }
    })()
    return () => (mounted = false)
  }, [id])

  if (error) return <div className="error">{error}</div>
  if (!ticket) return <div>Loading...</div>

  return (
    <div className="ticket-detail">
      <h2>{ticket.title}</h2>
      <div>{ticket.description}</div>
      <div>Status: {ticket.status}</div>
      <div>Priority: {ticket.priority}</div>
      <div>Created: {new Date(ticket.createdDate).toLocaleString()}</div>
      <div>CreatedBy: {ticket.createdBy ?? '—'}</div>
      <div>AssignedTo: {ticket.assignedTo ?? '—'}</div>

      <div style={{ marginTop: 12 }}>
        <h3>Assign Ticket</h3>
        <input placeholder="UserId to assign" value={assignUserId} onChange={e => setAssignUserId(e.target.value)} />
        <button onClick={async () => {
          try {
            await api.put(`/api/tickets/${id}/assign`, JSON.stringify(assignUserId), { headers: { 'Content-Type': 'application/json' } })
            const res = await api.get(`/api/tickets/${id}`)
            setTicket(res.data)
          } catch (ex) {
            setError(ex?.response?.data?.message || 'Assign failed')
          }
        }}>Assign</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <h3>Update Status</h3>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">-- select --</option>
          <option>Open</option>
          <option>Assigned</option>
          <option>In Progress</option>
          <option>Pending</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
        <button onClick={async () => {
          try {
            if (!status) return
            await api.put(`/api/tickets/${id}/status`, JSON.stringify(status), { headers: { 'Content-Type': 'application/json' } })
            const res = await api.get(`/api/tickets/${id}`)
            setTicket(res.data)
          } catch (ex) {
            setError(ex?.response?.data?.message || 'Status update failed')
          }
        }}>Update</button>
      </div>

      <h3>Comments</h3>
      <ul>
        {ticket.comments?.map((c) => (
          <li key={c.id}>
            <div>{c.comment}</div>
            <div>
              <small>
                {c.createdBy} - {new Date(c.createdDate).toLocaleString()}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
