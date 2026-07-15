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

export default { saveToken, getToken, removeToken, hasToken }
