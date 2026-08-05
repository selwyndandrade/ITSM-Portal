import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCatalogItem, submitCatalogRequest } from '../services/catalogService'

export default function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getCatalogItem(id)
      setItem(data)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const response = await submitCatalogRequest({ catalogItemId: Number(id), ticketDescription: details || `Service request for ${item?.name}` })
      setMessage(`Request submitted. Ticket #${response.ticketId} was created for this service.${item?.requiresApproval ? ' Approval is pending.' : ''}`)
      setTimeout(() => navigate('/my-requests'), 1000)
    } catch (error) {
      setMessage('Unable to submit this request right now. Please try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="dashboard-empty">Loading service…</div>
  if (!item) return <div className="dashboard-empty">Service not found.</div>

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">SERVICE REQUEST</p>
          <h2>{item.name}</h2>
          <p>{item.description}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <p className="dashboard-card__eyebrow">Request details</p>
              <h2>Start service delivery</h2>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="asset-form">
            <label>
              Why do you need this service?
              <textarea rows={5} value={details} onChange={(event) => setDetails(event.target.value)} placeholder={`Describe the need for ${item.name}`} />
            </label>
            <div className="catalog-meta">
              <span>Category {item.category}</span>
              <span>ETA {item.estimatedCompletionTime}</span>
              <span>{item.requiresApproval ? 'Approval required' : 'No approval'}</span>
            </div>
            <div className="dashboard-empty" style={{ padding: 0, textAlign: 'left' }}>
              {item.requiresApproval ? 'This request will route through approval before delivery begins.' : 'This request will be sent directly into the service delivery queue.'}
            </div>
            <button type="submit" className="theme-button" disabled={submitting}>{submitting ? 'Submitting request...' : 'Submit request'}</button>
            {message && <div className="dashboard-empty" style={{ color: '#0f766e' }}>{message}</div>}
          </form>
        </div>
      </div>
    </div>
  )
}
