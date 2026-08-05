import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function RoleGuard({ children, roles }) {
  const { user } = useAuth()

  if (!user) return null
  if (!roles) return children

  const userRole = user.role
  if (!userRole) return null

  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  if (!allowedRoles.includes(userRole)) return null

  return children
}
