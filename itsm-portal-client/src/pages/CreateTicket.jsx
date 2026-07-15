import React, { useState } from 'react'
import { createTicket } from '../services/ticketService'
import { useNavigate } from 'react-router-dom'

export default function CreateTicket() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Low')
  const [category, setCategory] = useState('General')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Only send fields that the backend Ticket model expects.
      // Omitting 'category' to avoid potential model binding issues on the server.
      const payload = { title, description, priority }
      const res = await createTicket(payload)
      // created ticket returns DTO with id
      navigate(`/tickets/${res.id}`)
    } catch (ex) {
      console.error('Create ticket failed', ex)
      setError(ex?.response?.data?.message || ex.message || 'Create failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2>Create Ticket</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} style={{ width: '100%', padding: 8 }} />
        </label>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1 }}>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '100%', padding: 8 }}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label style={{ flex: 1 }}>
            Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: 8 }} />
          </label>
        </div>

        {error && <div style={{ color: '#b91c1c' }}>{error}</div>}

        <div>
          <button type="submit" disabled={loading} style={{ padding: '10px 14px', borderRadius: 6, background: '#0f172a', color: 'white', border: 'none' }}>{loading ? 'Creating...' : 'Create Ticket'}</button>
        </div>
      </form>
    </div>
  )
}
