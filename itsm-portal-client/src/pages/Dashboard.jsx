import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getTickets, assignTicket, getStats } from '../services/ticketService'
import { getAssets } from '../services/assetService'
import { getDashboard } from '../services/dashboardService'
import { getApprovalRequests } from '../services/approvalService'
import { getAutomationRules } from '../services/automationService'
import StatsCard from '../Components/StatsCard'
import LoadingSpinner from '../Components/LoadingSpinner'
import ErrorBanner from '../Components/ErrorBanner'
import UserSelect from '../Components/UserSelect'
import RoleGuard from '../Components/RoleGuard'
import TicketList from '../Components/TicketList'
import { useAuth } from '../contexts/AuthContext'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getBadgeClass(value, type) {
  const normalized = (value || '').toString().toLowerCase()
  if (type === 'priority') {
    if (normalized.includes('high') || normalized.includes('critical')) return 'dashboard-badge dashboard-badge--high'
    if (normalized.includes('medium')) return 'dashboard-badge dashboard-badge--medium'
    return 'dashboard-badge dashboard-badge--low'
  }

  if (type === 'status') {
    if (normalized.includes('in progress')) return 'dashboard-badge dashboard-badge--in-progress'
    if (normalized.includes('pending')) return 'dashboard-badge dashboard-badge--pending'
    if (normalized.includes('resolved') || normalized.includes('closed')) return 'dashboard-badge dashboard-badge--resolved'
    return 'dashboard-badge dashboard-badge--open'
  }

  return 'dashboard-badge'
}

function normalizePresetValue(value) {
  return (value || '').toString().trim().toLowerCase()
}

function getSlaState(ticket) {
  const status = normalizePresetValue(ticket.status)
  const priority = normalizePresetValue(ticket.priority)
  if (['resolved', 'closed'].includes(status)) return 'none'

  const updated = new Date(ticket.lastUpdated || ticket.updatedDate || ticket.createdDate || 0)
  if (Number.isNaN(updated.getTime())) return 'none'

  const ageDays = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24)

  if (priority === 'critical' || priority === 'high') {
    if (ageDays > 7) return 'breached'
    if (ageDays > 3) return 'warning'
  }

  return 'none'
}

function matchesPreset(ticket, preset, user) {
  const status = normalizePresetValue(ticket.status)
  const priority = normalizePresetValue(ticket.priority)
  const assignee = normalizePresetValue(ticket.assignedTo || ticket.assignedToName || 'Unassigned')
  const currentUser = normalizePresetValue(user?.displayName || user?.email || '')

  switch (preset) {
    case 'my-tickets':
      return assignee === currentUser || assignee === normalizePresetValue(user?.email || '')
    case 'unassigned':
      return !ticket.assignedTo || ticket.assignedTo === 'Unassigned' || assignee === 'unassigned'
    case 'open':
      return status === 'open'
    case 'in-progress':
      return status === 'in progress' || status === 'in_progress'
    case 'waiting-on-customer':
      return status === 'pending' || status === 'waiting on customer' || status.includes('customer') || status.includes('waiting')
    case 'resolved':
      return status === 'resolved'
    case 'closed':
      return status === 'closed'
    case 'high-priority':
      return priority === 'high'
    case 'critical':
      return priority === 'critical' || (priority === 'high' && ['open', 'pending', 'in progress'].includes(status))
    case 'needs-attention':
      return !['resolved', 'closed'].includes(status) && (priority === 'high' || priority === 'critical' || ['open', 'pending', 'in progress'].includes(status))
    case 'sla-warning':
      return getSlaState(ticket) === 'warning'
    case 'sla-breached':
      return getSlaState(ticket) === 'breached'
    default:
      return true
  }
}

function matchesQueueFilters(ticket, filters) {
  const normalizedSearch = (filters.searchTerm || '').trim().toLowerCase()
  const matchesSearch = !normalizedSearch || [ticket.title, ticket.description, ticket.category, ticket.assignedTo, ticket.status, ticket.priority].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch)
  const matchesStatus = !filters.statusFilter || normalizePresetValue(ticket.status) === normalizePresetValue(filters.statusFilter)
  const matchesPriority = !filters.priorityFilter || normalizePresetValue(ticket.priority) === normalizePresetValue(filters.priorityFilter)
  const matchesAssignee = !filters.assigneeFilter || normalizePresetValue(ticket.assignedTo || ticket.assignedToName || 'Unassigned') === normalizePresetValue(filters.assigneeFilter)
  const matchesCategory = !filters.categoryFilter || normalizePresetValue(ticket.category) === normalizePresetValue(filters.categoryFilter)
  const matchesDate = !filters.dateFilter || (() => {
    const created = new Date(ticket.createdDate || ticket.createdAt || 0)
    if (Number.isNaN(created.getTime())) return false
    const now = new Date()
    if (filters.dateFilter === 'today') return created.toDateString() === now.toDateString()
    if (filters.dateFilter === 'week') return created >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (filters.dateFilter === 'month') return created >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return true
  })()
  const matchesPresetFilter = matchesPreset(ticket, filters.preset, filters.user)
  return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesCategory && matchesDate && matchesPresetFilter
}

export default function Dashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [assigningFor, setAssigningFor] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [stats, setStats] = useState(null)
  const [assets, setAssets] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [businessMetrics, setBusinessMetrics] = useState(null)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [activeAutomationRuleCount, setActiveAutomationRuleCount] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await getTickets(1, 100, {
        search: searchTerm.trim(),
        status: statusFilter,
        priority: priorityFilter,
        assignedTo: assigneeFilter,
        category: categoryFilter,
        createdRange: dateFilter
      })
      const items = Array.isArray(res) ? res : res.items || []
      setTickets(items)

      try {
        const statsData = await getStats()
        setStats(statsData)
      } catch (ex) {
        console.error('Failed to load stats:', ex)
      }

      try {
        const assetResponse = await getAssets({ status: 'In Maintenance' })
        setAssets(Array.isArray(assetResponse) ? assetResponse : [])
      } catch (ex) {
        console.error('Failed to load assets:', ex)
      }
    } catch (ex) {
      setError(ex?.response?.data?.message || ex.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [searchTerm, statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter])

  useEffect(() => {
    let active = true
    getDashboard().then((data) => {
      if (active) setBusinessMetrics(data)
    }).catch((ex) => {
      console.error('Failed to load business metrics:', ex)
      if (active) setBusinessMetrics(null)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getApprovalRequests({ status: 'Pending' }).then((data) => {
      if (!active) return
      const items = Array.isArray(data) ? data : data?.items || []
      setPendingApprovalsCount(items.length)
    }).catch((ex) => {
      console.error('Failed to load pending approvals:', ex)
      if (active) setPendingApprovalsCount(0)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (user?.role !== 'Admin') return
    let active = true
    getAutomationRules().then((data) => {
      if (!active) return
      const items = Array.isArray(data) ? data : data?.items || []
      setActiveAutomationRuleCount(items.filter((rule) => rule.isActive !== false).length)
    }).catch((ex) => {
      console.error('Failed to load automation rules:', ex)
      if (active) setActiveAutomationRuleCount(null)
    })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    const handleRefresh = () => load()
    window.addEventListener('tickets-updated', handleRefresh)
    return () => window.removeEventListener('tickets-updated', handleRefresh)
  }, [])

  useEffect(() => {
    document.title = 'Kyro Dashboard'
    return () => {
      document.title = 'Kyro'
    }
  }, [])

  const effectiveTickets = useMemo(() => {
    return (Array.isArray(tickets) ? tickets : []).map((ticket) => ({
      ...ticket,
      category: ticket.category || 'Software',
      priority: ticket.priority || 'Medium',
      status: ticket.status || 'Open',
      assignedTo: ticket.assignedTo || ticket.assignedToName || 'Unassigned',
      createdDate: ticket.createdDate || ticket.createdAt || ticket.lastUpdated || new Date().toISOString(),
      lastUpdated: ticket.lastUpdated || ticket.updatedDate || ticket.createdDate || new Date().toISOString()
    }))
  }, [tickets])

  const summary = useMemo(() => {
    const open = effectiveTickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'open').length
    const inProgress = effectiveTickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'in progress').length
    const pending = effectiveTickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'pending').length
    const resolved = effectiveTickets.filter((ticket) => ['resolved', 'closed'].includes((ticket.status || '').toLowerCase())).length
    const highPriority = effectiveTickets.filter((ticket) => (ticket.priority || '').toLowerCase() === 'high').length
    const unassigned = effectiveTickets.filter((ticket) => !ticket.assignedTo || ticket.assignedTo === 'Unassigned').length

    return {
      open: businessMetrics?.openTickets ?? stats?.totalOpen ?? open,
      inProgress: businessMetrics?.inProgressTickets ?? stats?.inProgress ?? inProgress,
      pending,
      resolved: stats?.resolvedToday ?? resolved,
      highPriority,
      unassigned,
      resolvedThisMonth: resolved
    }
  }, [stats, businessMetrics, effectiveTickets])

  const recentTickets = useMemo(() => {
    const filtered = effectiveTickets.filter((ticket) => matchesQueueFilters(ticket, {
      preset: filter,
      user,
      searchTerm,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      categoryFilter,
      dateFilter
    }))

    return [...filtered]
      .sort((a, b) => new Date(b.lastUpdated || b.updatedDate || b.createdDate || 0) - new Date(a.lastUpdated || a.updatedDate || a.createdDate || 0))
      .slice(0, 8)
  }, [effectiveTickets, filter, user, searchTerm, statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter])

  const queuePresetOptions = useMemo(() => {
    const presets = [
      { value: 'all', label: 'All Tickets' },
      { value: 'my-tickets', label: 'My Tickets' },
      { value: 'unassigned', label: 'Unassigned' },
      { value: 'open', label: 'Open' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'waiting-on-customer', label: 'Waiting on Customer' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'closed', label: 'Closed' },
      { value: 'high-priority', label: 'High Priority' },
      { value: 'critical', label: 'Critical' },
      { value: 'needs-attention', label: 'Needs Attention' },
      { value: 'sla-warning', label: 'SLA Warning' },
      { value: 'sla-breached', label: 'SLA Breached' }
    ]

    return presets.map((option) => ({
      ...option,
      count: effectiveTickets.filter((ticket) => matchesQueueFilters(ticket, {
        preset: option.value,
        user,
        searchTerm,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        categoryFilter,
        dateFilter
      })).length
    }))
  }, [effectiveTickets, user, searchTerm, statusFilter, priorityFilter, assigneeFilter, categoryFilter, dateFilter])

  const activeFilterOption = queuePresetOptions.find((option) => option.value === filter) || queuePresetOptions[0]
  const hasActiveFilters = Boolean(searchTerm || statusFilter || priorityFilter || assigneeFilter || categoryFilter || dateFilter || filter !== 'all')

  const operationalSummary = useMemo(() => {
    const openTickets = effectiveTickets.filter((ticket) => !['resolved', 'closed'].includes((ticket.status || '').toLowerCase())).length
    const awaitingResponse = effectiveTickets.filter((ticket) => ['pending', 'open'].includes((ticket.status || '').toLowerCase())).length
    const slaWarning = effectiveTickets.filter((ticket) => (ticket.priority || '').toLowerCase() === 'high' && !['resolved', 'closed'].includes((ticket.status || '').toLowerCase())).length
    const assetAlerts = assets.filter((asset) => ['In Maintenance', 'Retired'].includes(asset.status)).length
    const totalTickets = businessMetrics?.totalTickets ?? effectiveTickets.length
    const slaBreaches = businessMetrics?.slaBreaches ?? 0
    const slaCompliance = totalTickets > 0 ? Math.round(100 * (totalTickets - slaBreaches) / totalTickets) : 100

    return {
      openTickets,
      awaitingResponse,
      slaWarning,
      assetAlerts,
      slaCompliance
    }
  }, [effectiveTickets, assets, businessMetrics])

  const needsAttention = useMemo(() => {
    const items = []
    const highPriorityOpen = effectiveTickets.filter((ticket) => (ticket.priority || '').toLowerCase() === 'high' && !['resolved', 'closed'].includes((ticket.status || '').toLowerCase()))
    if (highPriorityOpen.length > 0) {
      items.push({ title: 'Critical incidents', detail: `${highPriorityOpen.length} high-priority tickets need immediate follow-up.`, tone: 'critical' })
    }

    const unassigned = effectiveTickets.filter((ticket) => !ticket.assignedTo || ticket.assignedTo === 'Unassigned')
    if (unassigned.length > 0) {
      items.push({ title: 'Unassigned tickets', detail: `${unassigned.length} requests are waiting for triage.`, tone: 'warning' })
    }

    const pending = effectiveTickets.filter((ticket) => (ticket.status || '').toLowerCase() === 'pending')
    if (pending.length > 0) {
      items.push({ title: 'Pending follow-up', detail: `${pending.length} tickets are waiting on a response or next action.`, tone: 'info' })
    }

    if (items.length === 0) {
      items.push({ title: 'SaaS health is strong', detail: 'No critical follow-ups are currently blocking the workspace.', tone: 'success' })
    }

    return items.slice(0, 3)
  }, [effectiveTickets])

  const analytics = useMemo(() => {
    const statusCounts = ['Open', 'In Progress', 'Pending', 'Resolved'].map((label) => ({
      label,
      count: effectiveTickets.filter((ticket) => (ticket.status || '').toLowerCase() === label.toLowerCase() || (label === 'In Progress' && (ticket.status || '').toLowerCase() === 'in progress')).length
    }))

    const categoryCounts = ['Hardware', 'Software', 'Access', 'Network'].map((label) => ({
      label,
      count: effectiveTickets.filter((ticket) => (ticket.category || '').toLowerCase() === label.toLowerCase()).length
    }))

    return { statusCounts, categoryCounts }
  }, [effectiveTickets])

  async function handleSelectUser(user) {
    if (!assigningFor) return
    try {
      await assignTicket(assigningFor.id, user.id)
      setSuccessMessage(`Assigned ${assigningFor.title} to ${user.email}`)
      setAssigningFor(null)
      await load()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (ex) {
      setError(ex?.response?.data?.message || ex.message || 'Assign failed')
    }
  }

  function openMeyon() {
    window.dispatchEvent(new Event('open-meyon-assistant'))
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="dashboard-shell">
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <p className="dashboard-eyebrow">KYRO IT SERVICE MANAGEMENT</p>
          <h1>{getGreeting()}, {displayName}</h1>
          <p className="dashboard-subtitle">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} • Clear visibility across incidents, access requests, and service delivery for your team.</p>
        </div>
        <div className="dashboard-hero__meta">
          <span className="dashboard-pill dashboard-pill--soft">Live workspace</span>
          <span className="dashboard-pill dashboard-pill--soft">{summary.highPriority} high priority</span>
        </div>
      </div>

      <div className="dashboard-kpis">
        <StatsCard title="Open Tickets" value={summary.open} hint="Needs action" trend={`${summary.open} in queue`} icon="◌" tone="alert" />
        <StatsCard title="Pending Approvals" value={pendingApprovalsCount} hint="Awaiting a decision" trend={pendingApprovalsCount === 1 ? '1 request to review' : `${pendingApprovalsCount} requests to review`} icon="◐" tone="neutral" />
        <StatsCard title="SLA Health" value={`${operationalSummary.slaCompliance}%`} hint="Healthy operating window" trend={`${operationalSummary.slaWarning} at risk`} icon="●" tone="warning" />
        <StatsCard title="Asset Alerts" value={operationalSummary.assetAlerts} hint="Maintenance or retirements" trend={`${operationalSummary.assetAlerts} assets flagged`} icon="◍" tone="success" />
      </div>

      {businessMetrics && (
        <div className="dashboard-grid">
          <section className="dashboard-card dashboard-card--wide">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Business metrics</p>
                <h2>Service desk performance</h2>
              </div>
            </div>
            <div className="admin-overview">
              <div className="admin-overview__card">
                <p className="dashboard-card__eyebrow">Total tickets</p>
                <strong>{businessMetrics.totalTickets}</strong>
                <span>{businessMetrics.openTickets} open / {businessMetrics.resolvedTickets} resolved</span>
              </div>
              <div className="admin-overview__card">
                <p className="dashboard-card__eyebrow">Avg resolution time</p>
                <strong>{businessMetrics.avgResolutionHours}h</strong>
                <span>Based on completed tickets</span>
              </div>
              <div className="admin-overview__card">
                <p className="dashboard-card__eyebrow">SLA breaches</p>
                <strong>{businessMetrics.slaBreaches}</strong>
                <span>{businessMetrics.slaAtRisk} at risk of breaching</span>
              </div>
              <div className="admin-overview__card">
                <p className="dashboard-card__eyebrow">Closed tickets</p>
                <strong>{businessMetrics.closedTickets}</strong>
                <span>{businessMetrics.inProgressTickets} in progress</span>
              </div>
            </div>
            <div className="report-panels" style={{ marginTop: 16 }}>
              <div>
                <p className="dashboard-card__eyebrow">Tickets by priority</p>
                <div className="report-list">
                  {(businessMetrics.priorityBreakdown || []).map((item) => (
                    <div key={item.label} className="report-row">
                      <div className="report-row__label"><span>{item.label}</span><strong>{item.count}</strong></div>
                      <div className="dashboard-bar"><div className="dashboard-bar__fill" style={{ width: `${Math.max(12, (item.count / Math.max(businessMetrics.totalTickets, 1)) * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="dashboard-card__eyebrow">Tickets by category</p>
                <div className="report-list">
                  {(businessMetrics.categoryBreakdown || []).map((item) => (
                    <div key={item.label} className="report-row">
                      <div className="report-row__label"><span>{item.label}</span><strong>{item.count}</strong></div>
                      <div className="dashboard-bar"><div className="dashboard-bar__fill dashboard-bar__fill--subtle" style={{ width: `${Math.max(12, (item.count / Math.max(businessMetrics.totalTickets, 1)) * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={error} />}
      {successMessage && <div className="dashboard-success">{successMessage}</div>}

      <div className="dashboard-grid">
        <section className="dashboard-card dashboard-card--wide">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Service queue</p>
              <h2>Recent activity</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="ticket-view-filter" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>Filter queue</label>
              <select id="ticket-view-filter" className="dashboard-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
                {queuePresetOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label} ({option.count})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="dashboard-badge dashboard-badge--in-progress" style={{ padding: '8px 12px' }}>
              Active filter: {activeFilterOption.label} · {recentTickets.length} matching
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                className="theme-button theme-button--secondary"
                onClick={() => {
                  setFilter('all')
                  setSearchTerm('')
                  setStatusFilter('')
                  setPriorityFilter('')
                  setAssigneeFilter('')
                  setCategoryFilter('')
                  setDateFilter('')
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="dashboard-actions" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 12 }}>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search tickets" style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }}>
              <option value="">All statuses</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }}>
              <option value="">All priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }}>
              <option value="">All assignees</option>
              <option value="Unassigned">Unassigned</option>
              {Array.from(new Set(effectiveTickets.map((ticket) => ticket.assignedTo).filter(Boolean))).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }}>
              <option value="">All categories</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Access">Access</option>
              <option value="Network">Network</option>
              <option value="Security">Security</option>
            </select>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }}>
              <option value="">Any date</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </div>

          <div className="dashboard-table-wrap">
            <TicketList tickets={recentTickets} loading={loading} error={error} onAssignClick={(ticket) => setAssigningFor(ticket)} />
          </div>
        </section>

        <aside className="dashboard-side">
          <section className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Operational pulse</p>
                <h2>Action queue</h2>
              </div>
            </div>
            <div className="dashboard-attention">
              {needsAttention.length === 0 ? (
                <div className="dashboard-empty">Everything looks steady right now.</div>
              ) : (
                needsAttention.map((item) => (
                  <div key={item.title} className="dashboard-attention__item">
                    <div>
                      <strong>{item.title}</strong>
                      <div className="dashboard-ticket-meta">{item.detail}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Shared services</p>
                <h2>My assigned work</h2>
              </div>
            </div>
            <div className="dashboard-attention">
              {recentTickets.filter((ticket) => (ticket.assignedTo || '').toLowerCase() === (user?.displayName || user?.email || '').toLowerCase() || (ticket.assignedTo || '').toLowerCase() === (user?.email || '').toLowerCase()).slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="dashboard-attention__item">
                  <div>
                    <strong>#{ticket.id} {ticket.title}</strong>
                    <div className="dashboard-ticket-meta">{ticket.status} • {ticket.priority}</div>
                  </div>
                </div>
              ))}
              {recentTickets.filter((ticket) => (ticket.assignedTo || '').toLowerCase() === (user?.displayName || user?.email || '').toLowerCase() || (ticket.assignedTo || '').toLowerCase() === (user?.email || '').toLowerCase()).length === 0 && (
                <div className="dashboard-empty">No tickets assigned to you right now.</div>
              )}
            </div>
          </section>

          <section className="dashboard-card dashboard-ai">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Meyon AI Assistant</p>
                <h2>Productive by design</h2>
              </div>
            </div>
            <p className="dashboard-ai__copy">Meyon now helps teams summarize incidents, recommend knowledge articles, predict urgency, and suggest next actions in seconds.</p>
            <div className="dashboard-ai__actions">
              <button type="button" className="dashboard-ai__button" onClick={openMeyon}>Summarize incidents</button>
              <button type="button" className="dashboard-ai__button" onClick={openMeyon}>Suggest a resolution</button>
              <button type="button" className="dashboard-ai__button" onClick={openMeyon}>Recommend knowledge</button>
              <button type="button" className="dashboard-ai__button" onClick={openMeyon}>Prioritize work</button>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <p className="dashboard-card__eyebrow">Quick actions</p>
                <h2>Start here</h2>
              </div>
            </div>
            <div className="dashboard-actions">
              <Link className="dashboard-action" to="/tickets/new">Create Ticket</Link>
              <Link className="dashboard-action" to="/">View Tickets</Link>
              <Link className="dashboard-action" to="/knowledge">Knowledge Base</Link>
              <Link className="dashboard-action" to="/">Reports</Link>
            </div>
          </section>
        </aside>
      </div>

      <div className="dashboard-analytics">
        <section className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Customer experience</p>
              <h2>Service overview</h2>
            </div>
          </div>
          <div className="dashboard-analytics__list">
            <div className="dashboard-analytics__row">
              <div className="dashboard-analytics__label"><span>Open tickets</span><strong>{summary.open}</strong></div>
              <div className="dashboard-bar"><div className="dashboard-bar__fill" style={{ width: `${effectiveTickets.length > 0 ? Math.min(100, Math.round((operationalSummary.openTickets / effectiveTickets.length) * 100)) : 0}%` }} /></div>
            </div>
            <div className="dashboard-analytics__row">
              <div className="dashboard-analytics__label"><span>SLA health</span><strong>{operationalSummary.slaCompliance}%</strong></div>
              <div className="dashboard-bar"><div className="dashboard-bar__fill dashboard-bar__fill--subtle" style={{ width: `${operationalSummary.slaCompliance}%` }} /></div>
            </div>
            {user?.role === 'Admin' && (
              <div className="dashboard-analytics__row">
                <div className="dashboard-analytics__label"><span>Automation rules active</span><strong>{activeAutomationRuleCount ?? '—'}</strong></div>
                <div className="dashboard-bar"><div className="dashboard-bar__fill" style={{ width: `${Math.min(100, (activeAutomationRuleCount || 0) * 20)}%` }} /></div>
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Analytics</p>
              <h2>Tickets by status</h2>
            </div>
          </div>
          <div className="dashboard-analytics__list">
            {analytics.statusCounts.map((item) => {
              const maxCount = Math.max(1, ...analytics.statusCounts.map((entry) => entry.count))
              return (
                <div key={item.label} className="dashboard-analytics__row">
                  <div className="dashboard-analytics__label">
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="dashboard-bar">
                    <div className="dashboard-bar__fill" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Analytics</p>
              <h2>Tickets by category</h2>
            </div>
          </div>
          <div className="dashboard-analytics__list">
            {analytics.categoryCounts.map((item) => {
              const maxCount = Math.max(1, ...analytics.categoryCounts.map((entry) => entry.count))
              return (
                <div key={item.label} className="dashboard-analytics__row">
                  <div className="dashboard-analytics__label">
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="dashboard-bar">
                    <div className="dashboard-bar__fill dashboard-bar__fill--subtle" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <RoleGuard roles={['Admin', 'Technician']}>
        {assigningFor && (
          <div className="dashboard-assign-modal">
            <div className="dashboard-assign-panel">
              <h4>Assign: {assigningFor.title}</h4>
              <UserSelect onSelect={handleSelectUser} onCancel={() => setAssigningFor(null)} />
            </div>
          </div>
        )}
      </RoleGuard>
    </div>
  )
}
