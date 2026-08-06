const TOKEN_KEY = 'itsm_jwt'

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
