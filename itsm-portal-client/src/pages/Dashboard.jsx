import React, { useEffect, useState, useMemo } from 'react'
import { getTickets, assignTicket } from '../services/ticketService'
import StatsCard from '../components/StatsCard'
import TicketsTable from '../components/TicketsTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import UserSelect from '../components/UserSelect'

export default function Dashboard() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [assigningFor, setAssigningFor] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await getTickets(1, 100)
      const items = Array.isArray(res) ? res : res.items || []
      setTickets(items)
    } catch (ex) {
      setError(ex?.response?.data?.message || ex.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    assigned: tickets.filter(t => t.status === 'Assigned').length
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false
      if (filterStatus && t.status !== filterStatus) return false
      if (filterPriority && t.priority !== filterPriority) return false
      return true
    })
  }, [tickets, query, filterStatus, filterPriority])

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

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <StatsCard title="Total Tickets" value={stats.total} />
        <StatsCard title="Open" value={stats.open} />
        <StatsCard title="Assigned" value={stats.assigned} />
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={error} />}
      {successMessage && <div style={{ background: '#e6ffed', padding: 8, borderRadius: 6, marginBottom: 12 }}>{successMessage}</div>}

      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input placeholder="Search title..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ padding: 8, flex: 1 }} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: 8 }}>
            <option value="">All Statuses</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ padding: 8 }}>
            <option value="">All Priorities</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>

        <TicketsTable tickets={filteredTickets} loading={loading} error={error} onAssignClick={(t) => setAssigningFor(t)} />
      </div>

      {assigningFor && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, width: 360 }}>
          <div style={{ background: 'white', padding: 12, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            <h4>Assign: {assigningFor.title}</h4>
            <UserSelect onSelect={handleSelectUser} onCancel={() => setAssigningFor(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
