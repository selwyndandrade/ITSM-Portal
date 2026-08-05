import React from 'react'

export default function StatsCard({ title, value, hint, icon, trend, tone = 'neutral' }) {
  return (
    <div className={`stats-card stats-card--${tone}`}>
      <div className="stats-card__top">
        <span className="stats-card__icon">{icon || '•'}</span>
        <span className="stats-card__title">{title}</span>
      </div>
      <div className="stats-card__value">{value}</div>
      {hint && <div className="stats-card__hint">{hint}</div>}
      {trend && <div className="stats-card__trend">{trend}</div>}
    </div>
  )
}
