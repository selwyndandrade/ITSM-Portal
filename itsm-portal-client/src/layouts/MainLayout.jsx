import React from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function MainLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ padding: 20, width: '100%', boxSizing: 'border-box' }}>{children}</main>
      </div>
    </div>
  )
}
