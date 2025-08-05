export const apiBase = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes('replit') ? 
    `https://${window.location.hostname}` : 
    'http://0.0.0.0:5000')

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

// Account APIs
export async function getAccounts() {
  return req('/api/accounts', { method: 'GET' })
}

export async function createAccount(data: { name: string }) {
  return req('/api/accounts', { method: 'POST', body: JSON.stringify(data) })
}

export async function loginAccount(accountId: string) {
  return req(`/api/accounts/${accountId}/login`, { method: 'POST' })
}

export async function logoutAccount(accountId: string) {
  return req(`/api/accounts/${accountId}/logout`, { method: 'POST' })
}

export async function getAccountDebug(accountId: string) {
  return req(`/api/accounts/${accountId}/debug-session`, { method: 'GET' })
}

// Workflow APIs
export async function getWorkflows() {
  return req('/api/workflows', { method: 'GET' })
}

export async function createWorkflow(data: any) {
  return req('/api/workflows', { method: 'POST', body: JSON.stringify(data) })
}

export async function startWorkflow(workflowId: string) {
  return req(`/api/workflows/${workflowId}/start`, { method: 'POST' })
}

export async function stopWorkflow(workflowId: string) {
  return req(`/api/workflows/${workflowId}/stop`, { method: 'POST' })
}
