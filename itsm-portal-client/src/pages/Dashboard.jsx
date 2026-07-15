import React, { useEffect, useState } from 'react'
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
        <TicketsTable tickets={tickets} loading={loading} error={error} onAssignClick={(t) => setAssigningFor(t)} />
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
