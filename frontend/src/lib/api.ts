export const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type AuthBody = { email: string; password: string }

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) {
    let msg = 'Erro'
    try { msg = await res.text() } catch {}
    throw new Error(msg || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export async function login(body: AuthBody) {
  return req('/api/auth/login', { method: 'POST', body: JSON.stringify(body) })
}

export async function signup(body: AuthBody) {
  return req('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) })
}

export async function me() {
  return req('/api/auth/me', { method: 'GET' })
}

export async function logout() {
  return req('/api/auth/logout', { method: 'POST' })
}
