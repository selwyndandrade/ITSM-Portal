import React from 'react'

export default function LoadingSpinner({ size = 40 }) {
  const style = {
    width: size,
    height: size,
    border: '4px solid rgba(0,0,0,0.1)',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: 'auto'
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
      <div style={style} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
