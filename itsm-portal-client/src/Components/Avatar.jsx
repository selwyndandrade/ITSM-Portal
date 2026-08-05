import React, { useMemo } from 'react'
import { resolveApiUrl } from '../services/api'

export default function Avatar({
  src,
  name = 'KY',
  size = 36,
  className = '',
  style = {}
}) {
  const initials = useMemo(() => {
    const value = name || 'KY'
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'KY'
  }, [name])

  const resolvedSrc = useMemo(() => resolveApiUrl(src || ''), [src])

  return (
    <div
      className={['theme-avatar', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.42)), ...style }}
      title={name}
    >
      {resolvedSrc ? <img src={resolvedSrc} alt={name} /> : <span>{initials}</span>}
    </div>
  )
}
