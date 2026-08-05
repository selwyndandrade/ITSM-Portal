export function emitToast(message, tone = 'info', timeout = 3200) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent('kyro:toast', {
    detail: {
      id: `${Date.now()}-${Math.random()}`,
      message,
      tone,
      timeout
    }
  }))
}
