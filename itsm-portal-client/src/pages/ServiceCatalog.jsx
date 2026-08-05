import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCatalogItems } from '../services/catalogService'

const defaultItems = [
  { id: 1, name: 'Password Reset', description: 'Recover access to your account quickly with identity verification.', category: 'Access', icon: '⟳', estimatedCompletionTime: 'Same day', requiresApproval: false },
  { id: 2, name: 'New Laptop Request', description: 'Request a new corporate workstation for a new role or replacement.', category: 'Hardware', icon: '💻', estimatedCompletionTime: '3-5 business days', requiresApproval: true },
  { id: 3, name: 'VPN Access', description: 'Grant secure remote access for approved employees.', category: 'Access', icon: '🔐', estimatedCompletionTime: '1-2 business days', requiresApproval: true },
  { id: 4, name: 'Software Installation', description: 'Install or update standard business software.', category: 'Software', icon: '⬢', estimatedCompletionTime: '1 business day', requiresApproval: false },
  { id: 5, name: 'New Employee Setup', description: 'Start onboarding essentials including accounts and device readiness.', category: 'Onboarding', icon: '👤', estimatedCompletionTime: '2-3 business days', requiresApproval: true },
  { id: 6, name: 'Hardware Replacement', description: 'Replace damaged or outdated corporate hardware.', category: 'Hardware', icon: '🛠️', estimatedCompletionTime: '2-4 business days', requiresApproval: true }
]

export default function ServiceCatalog() {
  const navigate = useNavigate()
  const [items, setItems] = useState(defaultItems)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [highlightedCategory, setHighlightedCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getCatalogItems({ query, category })
        if (Array.isArray(data) && data.length > 0) {
          setItems(data)
        }
      } catch (error) {
        console.error('Failed to load catalog', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [query, category])

  const categories = useMemo(() => ['Access', 'Hardware', 'Software', 'Onboarding'].filter(Boolean), [])
  const popular = useMemo(() => items.slice(0, 3), [items])
  const featured = useMemo(() => items.filter((item) => item.category === highlightedCategory || (!highlightedCategory && item.requiresApproval)).slice(0, 3), [items, highlightedCategory])

  return (
    <div className="asset-shell">
      <div className="asset-hero">
        <div>
          <p className="dashboard-eyebrow">SERVICE CATALOG</p>
          <h2>Request common IT services</h2>
          <p>Employees can request standardized services through Kyro instead of drafting a new ticket from scratch.</p>
        </div>
      </div>

      <div className="dashboard-card asset-panel">
        <div className="dashboard-card__header asset-toolbar">
          <div>
            <p className="dashboard-card__eyebrow">Marketplace</p>
            <h2>Available services</h2>
          </div>
          <div className="asset-filters">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search catalog" />
            <select value={category} onChange={(event) => {
              setCategory(event.target.value)
              setHighlightedCategory(event.target.value)
            }}>
              <option value="">All categories</option>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>

        <div className="dashboard-card__header asset-toolbar" style={{ paddingTop: 12 }}>
          <div>
            <p className="dashboard-card__eyebrow">Popular requests</p>
            <h3 style={{ margin: '6px 0' }}>Most common service requests</h3>
          </div>
          <div className="asset-filters">
            {popular.map((item) => (
              <button key={item.id} type="button" className="theme-button theme-button--secondary" onClick={() => navigate(`/catalog/${item.id}`)}>{item.name}</button>
            ))}
          </div>
        </div>

        {featured.length > 0 && (
          <div className="dashboard-actions" style={{ padding: '0 24px 8px', gap: 8 }}>
            {featured.map((item) => (
              <div key={item.id} className="dashboard-badge dashboard-badge--in-progress" style={{ padding: '8px 10px' }}>
                {item.name} • {item.estimatedCompletionTime || '1-2 business days'}
              </div>
            ))}
          </div>
        )}

        {loading ? <div className="dashboard-empty">Loading catalog…</div> : (
          <div className="dashboard-table-wrap" style={{ padding: '0 24px 24px' }}>
            <div className="catalog-grid">
              {items.map((item) => (
                <div key={item.id} className="catalog-card">
                  <div className="catalog-card__top">
                    <div className="catalog-icon">{item.icon || '◌'}</div>
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.category}</p>
                    </div>
                  </div>
                  <p>{item.description}</p>
                  <div className="catalog-meta">
                    <span>ETA {item.estimatedCompletionTime || '1-2 business days'}</span>
                    <span>{item.requiresApproval ? 'Approval required' : 'No approval'}</span>
                  </div>
                  <button type="button" className="theme-button" onClick={() => navigate(`/catalog/${item.id}`)}>Request service</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
