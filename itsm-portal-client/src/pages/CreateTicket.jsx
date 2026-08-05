import React, { useEffect, useState } from 'react'
import { createTicket, getErrorMessage } from '../services/ticketService'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { analyzeText } from '../services/aiService'

const categoryOptions = ['General', 'Hardware', 'Software', 'Access', 'Network', 'Security', 'Billing']

export default function CreateTicket() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Low')
  const [category, setCategory] = useState('General')
  const [assetId, setAssetId] = useState('')
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    async function loadAssets() {
      try {
        const res = await api.get('/api/assets')
        setAssets(res.data || [])
      } catch (ex) {
        console.error('Failed to load assets', ex)
      }
    }

    loadAssets()
  }, [])

  useEffect(() => {
    const draft = location.state?.aiDraft
    if (!draft) return
    setTitle(draft.title || '')
    setDescription(draft.description || '')
    setPriority(draft.priority || 'Medium')
    setCategory(draft.category || 'General')
  }, [location.state])

  async function handleAiSuggest() {
    if (!description.trim()) {
      setAiError('Enter a description first so AI has something to analyze.')
      return
    }

    setAiLoading(true)
    setAiError(null)
    try {
      const result = await analyzeText(description)
      setTitle((current) => result.title || current)
      setPriority(result.priority || 'Medium')
      setCategory(result.category || 'General')
      setAiSuggestion(result)
    } catch (ex) {
      console.error('AI suggestion failed', ex)
      setAiError(getErrorMessage(ex, 'AI suggestion is unavailable right now.'))
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError('Please enter a title and description')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = { title, description, priority, category, assetId: assetId ? Number(assetId) : null }
      const res = await createTicket(payload)
      const ticketId = res?.id ?? res?.ticket?.id
      if (ticketId) {
        window.dispatchEvent(new Event('tickets-updated'))
        navigate(`/tickets/${ticketId}`)
      } else {
        throw new Error('Ticket created but no id was returned')
      }
    } catch (ex) {
      console.error('Create ticket failed', ex)
      setError(getErrorMessage(ex, 'Ticket creation failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="asset-shell" style={{ maxWidth: 860 }}>
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">CREATE TICKET</p>
          <h2>Start a new request</h2>
          <p>Share the issue details clearly so the right team can respond quickly and confidently.</p>
        </div>
      </div>

      <form className="dashboard-card asset-form" onSubmit={handleSubmit}>
        <div className="dashboard-card__header" style={{ marginBottom: 8, paddingBottom: 8 }}>
          <div>
            <p className="dashboard-card__eyebrow">Request details</p>
            <h2>Capture the essentials</h2>
          </div>
        </div>

        <div className="asset-form-grid">
          <label className="dashboard-field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Summarize the request" />
          </label>

          <label className="dashboard-field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </label>

          <label className="dashboard-field">
            <span>Asset</span>
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">No asset linked</option>
              {assets.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.assetTag})</option>)}
            </select>
          </label>

          <label className="dashboard-field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <label className="dashboard-field">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Describe what happened, what is affected, and when it started" />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="theme-button theme-button--secondary" onClick={handleAiSuggest} disabled={aiLoading}>
            {aiLoading ? 'Analyzing…' : '✨ Suggest with AI'}
          </button>
          <span className="dashboard-empty" style={{ padding: 0 }}>AI can suggest a title, category, and priority from your description.</span>
        </div>

        {aiError && <div style={{ color: '#b00020', background: '#fef2f2', padding: 12, borderRadius: 12, border: '1px solid #fecaca' }}>{aiError}</div>}

        {aiSuggestion && (
          <div className="dashboard-empty" style={{ padding: 12, lineHeight: 1.6, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12 }}>
            AI filled in the title, category, and priority below. Suggested assignment group: <strong>{aiSuggestion.suggestedAssignmentGroup}</strong>. Review and adjust before submitting.
          </div>
        )}

        <div className="dashboard-empty" style={{ padding: 0, lineHeight: 1.6 }}>
          Include the impact, affected service, and any relevant context so the team can respond with the right level of urgency.
        </div>

        {error && <div style={{ color: '#b00020', background: '#fef2f2', padding: 12, borderRadius: 12, border: '1px solid #fecaca' }}>{error}</div>}

        <div className="asset-form__footer">
          <span className="dashboard-empty" style={{ padding: 0 }}>Requests are routed into the service queue immediately after submission.</span>
          <button type="submit" className="theme-button" disabled={loading}>{loading ? 'Creating request...' : 'Create request'}</button>
        </div>
      </form>
    </div>
  )
}
