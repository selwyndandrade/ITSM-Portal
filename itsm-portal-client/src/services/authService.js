const TOKEN_KEY = 'itsm_token'

export function saveToken(token) {
  if (!token) return
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Small helper to check if token exists
export function hasToken() {
  return !!getToken()
}

// Store user info (including role)
const USER_KEY = 'itsm_user'

export function saveUser(user) {
  if (!user) return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function removeUser() {
  localStorage.removeItem(USER_KEY)
}

export function getUserRole() {
  const user = getUser()
  return user?.role || null
}

export function hasRole(role) {
  const userRole = getUserRole()
  if (!userRole) return false
  if (Array.isArray(role)) {
    return role.includes(userRole)
  }
  return userRole === role
}

export default { saveToken, getToken, removeToken, hasToken, saveUser, getUser, removeUser, getUserRole, hasRole }
