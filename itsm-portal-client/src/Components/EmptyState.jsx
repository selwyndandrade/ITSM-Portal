import React from 'react'

function AllCaughtUpIllustration() {
  return (
    <svg width="112" height="112" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ marginBottom: 4 }}>
      <circle cx="60" cy="62" r="42" fill="var(--accent)" opacity="0.08" />

      {/* clipboard */}
      <rect x="34" y="26" width="52" height="68" rx="8" fill="var(--surface)" stroke="var(--border-color)" strokeWidth="2" />
      <rect x="48" y="20" width="24" height="12" rx="4" fill="var(--surface)" stroke="var(--border-color)" strokeWidth="2" />

      {/* completed list lines */}
      <line x1="44" y1="48" x2="76" y2="48" stroke="var(--border-color)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="58" x2="68" y2="58" stroke="var(--border-color)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="68" x2="72" y2="68" stroke="var(--border-color)" strokeWidth="2" strokeLinecap="round" />

      {/* checkmark badge */}
      <circle cx="80" cy="78" r="18" fill="var(--accent)" />
      <path d="M72 78l6 6 12-12" stroke="var(--surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* sparkle accents */}
      <path d="M22 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--accent)" opacity="0.5" />
      <circle cx="98" cy="32" r="2.5" fill="var(--accent)" opacity="0.4" />
    </svg>
  )
}

export default function EmptyState({ title = 'No items', description = '' }) {
  return (
    <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 20, background: 'var(--surface-hover)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <AllCaughtUpIllustration />
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</div>
      {description && <div style={{ marginTop: 6, lineHeight: 1.6 }}>{description}</div>}
    </div>
  )
}
