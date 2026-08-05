import React from 'react'

export default function TicketHistory({ items = [] }) {
  if (!items || items.length === 0) return <div className="dashboard-empty">No activity yet.</div>

  return (
    <div className="ticket-history">
      <div className="dashboard-card__header">
        <div>
          <p className="dashboard-card__eyebrow">History</p>
          <h2>Timeline</h2>
        </div>
      </div>
      <div className="ticket-history-list">
        {items.map((it) => (
          <div key={it.id} className="ticket-history-item">
            <div className="ticket-comment-meta">{it.createdBy} • {new Date(it.createdDate).toLocaleString()}</div>
            <div><strong>{it.action}</strong> — {it.details}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
