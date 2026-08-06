import React from 'react'

export default function DashboardCard({ eyebrow, title, action, wide = false, className = '', children }) {
  const cardClassName = ['dashboard-card', wide ? 'dashboard-card--wide' : '', className].filter(Boolean).join(' ')

  return (
    <section className={cardClassName}>
      {(eyebrow || title || action) && (
        <div className="dashboard-card__header">
          <div>
            {eyebrow && <p className="dashboard-card__eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
