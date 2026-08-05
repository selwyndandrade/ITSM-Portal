import React, { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Breadcrumbs() {
  const location = useLocation()

  const items = useMemo(() => {
    const pathname = location.pathname
    const crumbs = [{ label: 'Dashboard', path: '/' }]

    if (pathname === '/knowledge') {
      crumbs.push({ label: 'Knowledge Base', path: '/knowledge' })
    } else if (pathname.startsWith('/knowledge/')) {
      crumbs.push({ label: 'Knowledge Base', path: '/knowledge' })
      crumbs.push({ label: 'Article', path: pathname })
    } else if (pathname === '/reports') {
      crumbs.push({ label: 'Reports', path: '/reports' })
    } else if (pathname === '/admin') {
      crumbs.push({ label: 'Admin', path: '/admin' })
    } else if (pathname === '/profile') {
      crumbs.push({ label: 'Profile', path: '/profile' })
    } else if (pathname === '/tickets') {
      crumbs.push({ label: 'Tickets', path: '/tickets' })
    } else if (pathname === '/tickets/new') {
      crumbs.push({ label: 'Tickets', path: '/tickets' })
      crumbs.push({ label: 'New Ticket', path: '/tickets/new' })
    } else if (pathname.startsWith('/tickets/')) {
      crumbs.push({ label: 'Tickets', path: '/tickets' })
      const ticketId = pathname.split('/').filter(Boolean).pop()
      crumbs.push({ label: `Ticket #${ticketId}`, path: pathname })
    }

    return crumbs
  }, [location.pathname])

  return (
    <nav className="theme-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={item.path} className="theme-breadcrumbs__item">
            {isLast ? (
              <span className="theme-breadcrumbs__current">{item.label}</span>
            ) : (
              <><Link to={item.path}>{item.label}</Link><span className="theme-breadcrumbs__separator">/</span></>
            )}
          </span>
        )
      })}
    </nav>
  )
}
