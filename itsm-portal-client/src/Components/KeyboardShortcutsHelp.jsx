import React from 'react'

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette / global search' },
      { keys: ['D'], description: 'Go to Dashboard' },
      { keys: ['T'], description: 'Go to Tickets' },
      { keys: ['A'], description: 'Go to Assets' },
      { keys: ['S'], description: 'Go to Service Catalog' },
      { keys: ['R'], description: 'Go to Reports' },
      { keys: ['K'], description: 'Go to Knowledge Base' }
    ]
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['N'], description: 'Create a new ticket' },
      { keys: ['G'], description: 'Open the Meyon AI assistant' },
      { keys: ['?'], description: 'Show this shortcuts dialog' },
      { keys: ['Esc'], description: 'Close any open dialog or panel' }
    ]
  }
]

export default function KeyboardShortcutsHelp({ open, onClose }) {
  if (!open) return null

  return (
    <div className="command-palette-overlay" onMouseDown={onClose}>
      <div className="shortcuts-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
        <div className="shortcuts-dialog__header">
          <div>
            <p className="dashboard-card__eyebrow">Kyro shortcuts</p>
            <h2>Keyboard shortcuts</h2>
          </div>
          <button type="button" className="theme-header__notificationClear" onClick={onClose}>Close</button>
        </div>
        <p className="shortcuts-dialog__hint">Single-key shortcuts only apply when you're not typing in a field.</p>
        <div className="shortcuts-dialog__grid">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="shortcuts-dialog__group">
              <h3>{group.title}</h3>
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.description} className="shortcuts-dialog__row">
                  <span>{shortcut.description}</span>
                  <span className="shortcuts-dialog__keys">
                    {shortcut.keys.map((key) => <kbd key={key}>{key}</kbd>)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
