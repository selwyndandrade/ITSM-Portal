import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Header from '../Components/Header'
import Breadcrumbs from '../Components/Breadcrumbs'
import MeyonAssistant from '../Components/NovaAssistant'
import ToastContainer from '../Components/ToastContainer'
import CommandPalette from '../Components/CommandPalette'
import KeyboardShortcutsHelp from '../Components/KeyboardShortcutsHelp'
import QuickActionsMenu from '../Components/QuickActionsMenu'

const SINGLE_KEY_ROUTES = {
  d: '/',
  t: '/tickets',
  a: '/assets',
  s: '/catalog',
  r: '/reports',
  k: '/knowledge',
  n: '/tickets/new'
}

function isTypingInField(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export default function MainLayout({ children }) {
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    function openPalette() { setPaletteOpen(true) }
    window.addEventListener('open-command-palette', openPalette)
    return () => window.removeEventListener('open-command-palette', openPalette)
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      const isModifierK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
      if (isModifierK) {
        event.preventDefault()
        setPaletteOpen(true)
        return
      }

      if (paletteOpen || shortcutsOpen) return
      if (isTypingInField(event.target)) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (event.key === '?') {
        event.preventDefault()
        setShortcutsOpen(true)
        return
      }

      if (event.key.toLowerCase() === 'g') {
        event.preventDefault()
        window.dispatchEvent(new Event('open-meyon-assistant'))
        return
      }

      const path = SINGLE_KEY_ROUTES[event.key.toLowerCase()]
      if (path) {
        event.preventDefault()
        navigate(path)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, paletteOpen, shortcutsOpen])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="theme-shell">
        <Header onOpenShortcuts={() => setShortcutsOpen(true)} />
        <div className="theme-pageBar">
          <Breadcrumbs />
        </div>
        <main className="theme-main">{children}</main>
      </div>
      <MeyonAssistant />
      <QuickActionsMenu />
      <ToastContainer />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}

