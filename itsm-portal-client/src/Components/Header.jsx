import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Avatar from './Avatar'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService'
import { formatRelativeTime, formatAbsoluteTime } from '../utils/time'

const pageTitles = {
  '/': 'Dashboard',
  '/tickets': 'Tickets',
  '/tickets/new': 'New Ticket',
  '/knowledge': 'Knowledge Base',
  '/reports': 'Reports',
  '/admin': 'Admin',
  '/profile': 'Profile'
}

export default function Header({ onOpenShortcuts } = {}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { effectiveTheme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const title = useMemo(() => {
    return pageTitles[location.pathname] || 'Workspace'
  }, [location.pathname])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      return
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('itsm_token')
    if (!token) {
      setNotifications([])
      return
    }

    let active = true

    async function loadNotifications() {
      try {
        const data = await getNotifications()
        if (active) setNotifications(Array.isArray(data) ? data : [])
      } catch (ex) {
        if (ex?.response?.status !== 401 && ex?.response?.status !== 403) {
          console.error('Failed to load notifications', ex)
        }
        if (active) setNotifications([])
      }
    }

    loadNotifications()
    const timer = window.setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [user])

  function handleProfileAction(path) {
    setMenuOpen(false)
    navigate(path)
  }

  function openNotifications() {
    setNotificationsOpen((open) => !open)
  }

  async function handleNotificationClick(item) {
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id)
        setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry))
      } catch (ex) {
        console.error('Failed to mark notification read', ex)
      }
    }

    if (item.relatedTicketId) {
      navigate(`/tickets/${item.relatedTicketId}`)
      setNotificationsOpen(false)
    }
  }

  return (
    <header className="theme-header">
      <div className="theme-header__left">
        <button type="button" className="theme-header__iconButton theme-header__iconButton--text" aria-label="Toggle sidebar">
          Menu
        </button>
        <span className="theme-header__titleInline">{title}</span>
      </div>

      <div className="theme-header__center">
        <button
          type="button"
          className="theme-header__search theme-header__search--button"
          onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
        >
          <span aria-hidden="true" className="theme-header__searchIcon">Q</span>
          <span className="theme-header__searchPlaceholder">Search tickets, assets, people, articles…</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>

      <div className="theme-header__actions">
        {user && (
          <>
            <div className="theme-header__notificationWrap">
              <button type="button" className="theme-header__iconButton theme-header__iconButton--badge theme-header__iconButton--text" aria-label="Notifications" onClick={openNotifications}>
                Alerts
                {unreadCount > 0 && <span className="theme-header__badge">{unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <div className="theme-header__notificationPanel">
                  <div className="theme-header__notificationHeader">
                    <div>
                      <strong>Notifications</strong>
                      <p>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                    </div>
                    <button type="button" className="theme-header__notificationClear" onClick={async () => {
                      try {
                        await markAllNotificationsRead()
                        setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
                      } catch (ex) {
                        console.error('Failed to clear notifications', ex)
                      }
                    }}>Mark all read</button>
                  </div>
                  <div className="theme-header__notificationList">
                    {notifications.length ? notifications.map((item) => (
                      <button key={item.id} type="button" className={`theme-header__notificationItem ${item.isRead ? '' : 'is-unread'}`} onClick={() => handleNotificationClick(item)}>
                        <div className="theme-header__notificationIcon">{item.type === 'TicketAssigned' ? '•' : item.type === 'TicketStatusChanged' ? '↻' : item.type === 'CommentAdded' ? '↳' : '•'}</div>
                        <div className="theme-header__notificationBody">
                          <strong>{item.title}</strong>
                          <p>{item.message}</p>
                          <span title={formatAbsoluteTime(item.createdDate)}>{formatRelativeTime(item.createdDate)}</span>
                        </div>
                      </button>
                    )) : <div className="theme-header__notificationEmpty">No notifications yet.</div>}
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="theme-header__iconButton theme-header__iconButton--text" aria-label="Toggle dark mode" onClick={toggleTheme}>
              {effectiveTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button type="button" className="theme-header__iconButton theme-header__iconButton--text" aria-label="Keyboard shortcuts" onClick={onOpenShortcuts}>Shortcuts</button>
            <div className="theme-header__profileWrap">
              <button type="button" className="theme-header__profileButton" onClick={() => setMenuOpen((open) => !open)}>
                <Avatar src={user?.profileImageUrl} name={user?.displayName || user?.email || 'KY'} size={36} />
                <div className="theme-header__profileMeta">
                  <strong>{user.displayName || user.email}</strong>
                  <span>{user.departmentName || user.role || 'User'}</span>
                </div>
              </button>

              {menuOpen && (
                <div className="theme-header__dropdown" role="menu">
                  <div className="theme-header__dropdownHeader">
                    <Avatar src={user?.profileImageUrl} name={user?.displayName || user?.email || 'KY'} size={48} />
                    <div>
                      <strong>{user.displayName || user.email}</strong>
                      <p>{user.role || 'User'}</p>
                    </div>
                  </div>
                  <button type="button" className="theme-header__dropdownItem" onClick={() => handleProfileAction('/profile')}>View Profile</button>
                  <button type="button" className="theme-header__dropdownItem" onClick={() => handleProfileAction('/profile')}>My Account</button>
                  <button type="button" className="theme-header__dropdownItem" onClick={() => handleProfileAction('/profile')}>Settings</button>
                  <button type="button" className="theme-header__dropdownItem" onClick={() => handleProfileAction('/profile')}>Notifications</button>
                  <button type="button" className="theme-header__dropdownItem" onClick={() => handleProfileAction('/profile')}>Help</button>
                  <div className="theme-header__dropdownDivider" />
                  <button type="button" className="theme-header__dropdownItem theme-header__dropdownItemDanger" onClick={() => logout()}>Sign Out</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
