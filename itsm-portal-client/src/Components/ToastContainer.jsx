import React, { useEffect, useState } from 'react'

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    function handleToast(event) {
      const detail = event.detail || {}
      const toast = {
        id: detail.id || `${Date.now()}-${Math.random()}`,
        message: detail.message || 'Done',
        tone: detail.tone || 'info'
      }

      setToasts((current) => [...current, toast])
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id))
      }, detail.timeout || 3200)
    }

    window.addEventListener('kyro:toast', handleToast)
    return () => window.removeEventListener('kyro:toast', handleToast)
  }, [])

  if (!toasts.length) return null

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
