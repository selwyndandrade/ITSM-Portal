import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTickets, assignTicket, getErrorMessage } from '../services/ticketService'
import TicketsTable from '../Components/TicketsTable'
import UserSelect from '../Components/UserSelect'
import RoleGuard from '../Components/RoleGuard'
import ErrorBanner from '../Components/ErrorBanner'

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigningFor, setAssigningFor] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await getTickets(1, 100, {
        search: searchTerm.trim(),
        status: statusFilter,
        priority: priorityFilter
      })
      const items = Array.isArray(res) ? res : res.items || []
      setTickets(items)
    } catch (ex) {
      setError(getErrorMessage(ex, 'Tickets could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, priorityFilter])

  useEffect(() => {
    const handleRefresh = () => load()
    window.addEventListener('tickets-updated', handleRefresh)
    return () => window.removeEventListener('tickets-updated', handleRefresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSelectUser(user) {
    if (!assigningFor) return
    try {
      await assignTicket(assigningFor.id, user.id)
      setSuccessMessage(`Assigned ${assigningFor.title} to ${user.email}`)
      setAssigningFor(null)
      await load()
      window.dispatchEvent(new Event('tickets-updated'))
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (ex) {
      setError(getErrorMessage(ex, 'Assign failed.'))
    }
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <p className="dashboard-eyebrow">TICKET QUEUE</p>
          <h1>Tickets</h1>
          <p className="dashboard-subtitle">Triage, filter, and assign every open request in one place.</p>
        </div>
        <div className="dashboard-hero__meta">
          <Link className="dashboard-action" to="/tickets/new">+ New Ticket</Link>
        </div>
      </div>

      {successMessage && <div className="dashboard-success">{successMessage}</div>}
      <ErrorBanner message={error} />

      <section className="dashboard-card">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search tickets"
            style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }}>
            <option value="">All statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} style={{ border: '1px solid #d9d3c7', borderRadius: '0.3rem', padding: '9px 10px' }}>
            <option value="">All priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <TicketsTable tickets={tickets} loading={loading} error={null} onAssignClick={(ticket) => setAssigningFor(ticket)} />
      </section>

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
