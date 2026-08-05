import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAssets } from '../services/assetService'
import api from '../services/api'

const statusOptions = ['Active', 'In Maintenance', 'Retired', 'Available', 'Deployed']
const categoryOptions = ['Hardware', 'Software', 'Network', 'Mobile', 'Accessory']

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

export default function Assets() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState([])
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')

  useEffect(() => {
    document.title = 'Kyro Assets'
    return () => {
      document.title = 'Kyro'
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [assetsRes, departmentsRes, usersRes] = await Promise.all([
          getAssets({ query, category, status, departmentId: departmentId || undefined, assignedUserId: assignedUserId || undefined }),
          api.get('/api/users/departments'),
          api.get('/api/users')
        ])
        setAssets(assetsRes || [])
        setDepartments(departmentsRes.data || [])
        setUsers(usersRes.data || [])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [query, category, status, departmentId, assignedUserId])

  const metrics = useMemo(() => {
    const total = assets.length
    const active = assets.filter((asset) => asset.status === 'Active' || asset.status === 'Deployed').length
    const assigned = assets.filter((asset) => asset.assignedUserId).length
    const available = assets.filter((asset) => asset.status === 'Available').length
    const expiring = assets.filter((asset) => {
      if (!asset.warrantyExpirationDate) return false
      const date = new Date(asset.warrantyExpirationDate)
      const dayDiff = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return dayDiff <= 90 && dayDiff >= 0
    }).length
    const attention = assets.filter((asset) => asset.status === 'In Maintenance' || asset.status === 'Retired').length
    return { total, active, assigned, available, expiring, attention }
  }, [assets])

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">ASSET MANAGEMENT</p>
          <h2>Corporate asset inventory</h2>
          <p>Track hardware, ownership, warranty health, and ticket-related asset context from one workspace.</p>
        </div>
        <button type="button" className="theme-button" onClick={() => navigate('/assets/new')}>New asset</button>
      </div>

      <div className="asset-metrics">
        <div className="asset-metric"><span>Total assets</span><strong>{metrics.total}</strong></div>
        <div className="asset-metric"><span>Active assets</span><strong>{metrics.active}</strong></div>
        <div className="asset-metric"><span>Assigned assets</span><strong>{metrics.assigned}</strong></div>
        <div className="asset-metric"><span>Available assets</span><strong>{metrics.available}</strong></div>
        <div className="asset-metric"><span>Expiring warranties</span><strong>{metrics.expiring}</strong></div>
        <div className="asset-metric"><span>Needs attention</span><strong>{metrics.attention}</strong></div>
      </div>

      <div className="dashboard-card asset-panel">
        <div className="dashboard-card__header asset-toolbar">
          <div>
            <p className="dashboard-card__eyebrow">Inventory</p>
            <h2>Asset list</h2>
          </div>
          <div className="asset-filters">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All status</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
              <option value="">All users</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.displayName || user.email}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-empty">Loading assets…</div>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Serial</th>
                  <th>Assigned</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Purchase</th>
                  <th>Warranty</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <Link to={`/assets/${asset.id}`} className="asset-link">
                        <div className="asset-chip">{asset.name?.slice(0, 2).toUpperCase() || 'AS'}</div>
                        <div>
                          <div className="dashboard-ticket-title">{asset.name}</div>
                          <div className="dashboard-ticket-meta">{asset.assetTag}</div>
                        </div>
                      </Link>
                    </td>
                    <td>{asset.category}</td>
                    <td>{asset.serialNumber || '—'}</td>
                    <td>{asset.assignedUserName || 'Unassigned'}</td>
                    <td>{asset.departmentName || '—'}</td>
                    <td><span className={getAssetStatusClass(asset.status)}>{asset.status || 'Active'}</span></td>
                    <td>{formatDate(asset.purchaseDate)}</td>
                    <td>{formatDate(asset.warrantyExpirationDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
