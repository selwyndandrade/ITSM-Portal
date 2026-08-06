import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAssets } from '../services/assetService'
import api from '../services/api'
import { getErrorMessage } from '../services/ticketService'
import DataGrid from '../Components/DataGrid'
import ErrorBanner from '../Components/ErrorBanner'

const statusOptions = ['Active', 'In Maintenance', 'Retired', 'Available', 'Deployed']
const categoryOptions = ['Hardware', 'Software', 'Network', 'Mobile', 'Accessory']
const statusDotColor = { Active: '#22c55e', Deployed: '#3b82f6', Available: '#0ea5e9', 'In Maintenance': '#eab308', Retired: '#94a3b8' }

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusDot({ value }) {
  return (
    <span className="dashboard-dot-label">
      <span className="dashboard-dot" style={{ background: statusDotColor[value] || '#94a3b8' }} />
      {value}
    </span>
  )
}

export default function Assets() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState([])
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Kyro Assets'
    return () => {
      document.title = 'Kyro'
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [assetsRes, departmentsRes, usersRes] = await Promise.all([
          getAssets({}),
          api.get('/api/users/departments'),
          api.get('/api/users')
        ])
        setAssets(assetsRes || [])
        setDepartments(departmentsRes.data || [])
        setUsers(usersRes.data || [])
      } catch (ex) {
        setError(getErrorMessage(ex, 'Assets could not be loaded.'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

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
          <p className="dashboard-eyebrow">Asset Management</p>
          <h2>Corporate asset inventory</h2>
          <p>Track hardware, ownership, warranty health, and ticket-related asset context from one workspace.</p>
        </div>
        <button type="button" className="theme-button" onClick={() => navigate('/assets/new')}>New asset</button>
      </div>

      <ErrorBanner message={error} />

      <div className="asset-metrics">
        <div className="asset-metric"><span>Total assets</span><strong>{metrics.total}</strong></div>
        <div className="asset-metric"><span>Active assets</span><strong>{metrics.active}</strong></div>
        <div className="asset-metric"><span>Assigned assets</span><strong>{metrics.assigned}</strong></div>
        <div className="asset-metric"><span>Available assets</span><strong>{metrics.available}</strong></div>
        <div className="asset-metric"><span>Expiring warranties</span><strong>{metrics.expiring}</strong></div>
        <div className="asset-metric"><span>Needs attention</span><strong>{metrics.attention}</strong></div>
      </div>

      <div className="dashboard-card asset-panel">
        <div className="dashboard-card__header">
          <div>
            <p className="dashboard-card__eyebrow">Inventory</p>
            <h2>Asset list</h2>
          </div>
        </div>

        <DataGrid
          columns={[
            {
              key: 'asset',
              label: 'Asset',
              filter: 'text',
              filterText: (a) => `${a.name || ''} ${a.assetTag || ''}`,
              sortValue: (a) => (a.name || '').toLowerCase(),
              render: (a) => (
                <Link to={`/assets/${a.id}`} className="asset-link">
                  <div className="asset-chip">{a.name?.slice(0, 2).toUpperCase() || 'AS'}</div>
                  <div>
                    <div className="dashboard-ticket-title">{a.name}</div>
                    <div className="dashboard-ticket-meta">{a.assetTag}</div>
                  </div>
                </Link>
              )
            },
            {
              key: 'category',
              label: 'Type',
              filter: 'select',
              filterOptions: categoryOptions,
              filterValue: (a) => a.category,
              sortValue: (a) => (a.category || '').toLowerCase()
            },
            {
              key: 'serialNumber',
              label: 'Serial',
              sortValue: (a) => (a.serialNumber || '').toLowerCase(),
              render: (a) => a.serialNumber || '—'
            },
            {
              key: 'assignedUserId',
              label: 'Assigned',
              filter: 'select',
              filterOptions: users.map((u) => ({ value: u.id, label: u.displayName || u.email })),
              filterValue: (a) => a.assignedUserId,
              sortValue: (a) => (a.assignedUserName || '').toLowerCase(),
              render: (a) => a.assignedUserName || 'Unassigned'
            },
            {
              key: 'departmentId',
              label: 'Department',
              filter: 'select',
              filterOptions: departments.map((d) => ({ value: d.id, label: d.name })),
              filterValue: (a) => a.departmentId,
              sortValue: (a) => (a.departmentName || '').toLowerCase(),
              render: (a) => a.departmentName || '—'
            },
            {
              key: 'status',
              label: 'Status',
              filter: 'select',
              filterOptions: statusOptions,
              filterValue: (a) => a.status || 'Active',
              sortValue: (a) => (a.status || '').toLowerCase(),
              render: (a) => <StatusDot value={a.status || 'Active'} />
            },
            {
              key: 'purchaseDate',
              label: 'Purchase',
              sortValue: (a) => new Date(a.purchaseDate).getTime() || 0,
              render: (a) => formatDate(a.purchaseDate)
            },
            {
              key: 'warrantyExpirationDate',
              label: 'Warranty',
              sortValue: (a) => new Date(a.warrantyExpirationDate).getTime() || 0,
              render: (a) => formatDate(a.warrantyExpirationDate)
            }
          ]}
          rows={assets}
          getRowKey={(a) => a.id}
          loading={loading}
          loadingMessage="Loading assets..."
          emptyTitle="No Assets"
          emptyDescription="There are no assets to display."
          noMatchMessage="No assets match these filters."
          initialSort={{ key: 'asset', dir: 'asc' }}
        />
      </div>
    </div>
  )
}
