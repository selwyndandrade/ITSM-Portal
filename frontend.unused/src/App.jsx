import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import TicketsList from './components/TicketsList'
import TicketDetail from './components/TicketDetail'
import { getToken } from './lib/auth'

function Protected({ children }) {
  const token = getToken()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/tickets"
        element={
          <Protected>
            <TicketsList />
          </Protected>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <Protected>
            <TicketDetail />
          </Protected>
        }
      />
      <Route path="/" element={<Navigate to="/tickets" replace />} />
    </Routes>
  )
}
