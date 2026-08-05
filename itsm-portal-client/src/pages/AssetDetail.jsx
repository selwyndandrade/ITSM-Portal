import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { assignAsset, getAsset } from '../services/assetService'
import api from '../services/api'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getAssetStatusClass(value) {
  const normalized = (value || '').toString().toLowerCase()
  if (normalized.includes('maintenance')) return 'dashboard-badge dashboard-badge--pending'
  if (normalized.includes('retired')) return 'dashboard-badge dashboard-badge--resolved'
  if (normalized.includes('available')) return 'dashboard-badge dashboard-badge--low'
  return 'dashboard-badge dashboard-badge--in-progress'
}

export default function AssetDetail() {
  const { id } = useParams()
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assignmentNote, setAssignmentNote] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignmentMessage, setAssignmentMessage] = useState('')

  async function load() {
    setLoading(true)
    const data = await getAsset(id)
    setAsset(data)
    setSelectedUserId(data.assignedUserId || '')
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await api.get('/api/users', { params: { query: '' } })
        setUsers(response.data || [])
      } catch (error) {
        console.error('Unable to load users for assignment', error)
      }
    }

    loadUsers()
  }, [])

  async function handleAssign(event) {
    event.preventDefault()
    setAssigning(true)
    setAssignmentMessage('')
    try {
      await assignAsset(id, { assignedUserId: selectedUserId || null, notes: assignmentNote })
      await load()
      setAssignmentMessage('Asset ownership updated successfully.')
      setAssignmentNote('')
    } catch (error) {
      setAssignmentMessage('Unable to update assignment right now.')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return <div className="dashboard-empty">Loading asset…</div>
  if (!asset) return <div className="dashboard-empty">Asset not found.</div>

  return (
    <div className="asset-detail-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">ASSET DETAIL</p>
          <h2>{asset.name}</h2>
          <p>{asset.description || 'Enterprise asset record with service history and ownership context.'}</p>
        </div>
        <div className="asset-hero__actions">
          <span className={getAssetStatusClass(asset.status)}>{asset.status || 'Active'}</span>
          <Link to="/assets" className="theme-button theme-button--secondary">Back to assets</Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Asset information</p>
              <h2>{asset.assetTag}</h2>
            </div>
          </div>
          <div className="ticket-detail-meta">
            <div><span>Category</span><strong>{asset.category}</strong></div>
            <div><span>Manufacturer</span><strong>{asset.manufacturer || '—'}</strong></div>
            <div><span>Model</span><strong>{asset.model || '—'}</strong></div>
            <div><span>Serial number</span><strong>{asset.serialNumber || '—'}</strong></div>
            <div><span>Status</span><strong>{asset.status}</strong></div>
            <div><span>Location</span><strong>{asset.location || '—'}</strong></div>
            <div><span>Updated</span><strong>{formatDate(asset.updatedDate)}</strong></div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Ownership</p>
              <h2>Assigned employee</h2>
            </div>
          </div>
          <form onSubmit={handleAssign} className="asset-form">
            <label>
              Assign to
              <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.displayName || user.email}</option>)}
              </select>
            </label>
            <label>
              Notes
              <textarea rows={3} value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} placeholder="Add a short note for the handoff" />
            </label>
            <button type="submit" className="theme-button" disabled={assigning}>{assigning ? 'Updating assignment...' : 'Save assignment'}</button>
            {assignmentMessage ? <div className="dashboard-empty" style={{ color: '#0f766e' }}>{assignmentMessage}</div> : null}
          </form>
          <div className="ticket-detail-meta" style={{ marginTop: 16 }}>
            <div><span>Assigned user</span><strong>{asset.assignedUserName || 'Unassigned'}</strong></div>
            <div><span>Department</span><strong>{asset.departmentName || '—'}</strong></div>
            <div><span>Purchase date</span><strong>{formatDate(asset.purchaseDate)}</strong></div>
            <div><span>Warranty expires</span><strong>{formatDate(asset.warrantyExpirationDate)}</strong></div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">History</p>
              <h2>Maintenance history</h2>
            </div>
          </div>
          <div className="ticket-comment-list">
            {asset.history?.length ? asset.history.map((item) => (
              <div key={item.id} className="ticket-comment-item">
                <div className="ticket-comment-meta">{item.action} • {formatDate(item.date)}</div>
                <div>{item.changedBy || 'System'} updated the asset timeline for this record.</div>
              </div>
            )) : <div className="dashboard-empty">No maintenance history available.</div>}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Related work</p>
              <h2>Related tickets</h2>
            </div>
          </div>
          <div className="ticket-comment-list">
            {asset.relatedTickets?.length ? asset.relatedTickets.map((ticket) => (
              <div key={ticket.id} className="ticket-comment-item">
                <div className="ticket-comment-meta">#{ticket.id} • {ticket.status}</div>
                <Link to={`/tickets/${ticket.id}`} className="asset-link">{ticket.title}</Link>
              </div>
            )) : <div className="dashboard-empty">No related tickets yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
