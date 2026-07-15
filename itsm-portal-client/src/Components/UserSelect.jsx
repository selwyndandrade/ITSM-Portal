import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function UserSelect({ onSelect, onCancel }) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/users', { params: { query } })
        if (mounted) setUsers(res.data)
      } catch (ex) {
        console.error('User search failed', ex)
      } finally {
        if (mounted) setLoading(false)
      }
    }, 250)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [query])

  return (
    <div style={{ border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
      <div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users by email" />
        <button onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
      </div>

      {loading && <div>Loading...</div>}

      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {users.map((u) => (
          <li key={u.id} style={{ padding: 6, borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>{u.email}</div>
              <div>
                <button onClick={() => onSelect(u)}>Select</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
