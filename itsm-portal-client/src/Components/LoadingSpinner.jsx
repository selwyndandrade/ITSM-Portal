import React from 'react'

export default function LoadingSpinner({ size = 40 }) {
  const style = {
    width: size,
    height: size,
    border: '4px solid rgba(15,23,42,0.08)',
    borderTop: '4px solid #111827',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: 'auto'
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <div style={style} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
