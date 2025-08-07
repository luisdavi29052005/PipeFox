// Centralized API client for PipeFox
export const apiBase =
  (import.meta as any).env?.VITE_API_URL ||
  (window.location.hostname.includes("replit")
    ? `https://${window.location.hostname}`
    : "http://0.0.0.0:5000");

type ReqInit = RequestInit & { json?: any };

async function req(path: string, init: ReqInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  const res = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (!res.ok) {
    let message = "Erro";
    try {
      const txt = await res.text();
      message = txt || message;
    } catch {}
    throw new Error(message);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

/* =========== AUTH =========== */
export function login(body: { email: string; password: string }) {
  return req("/api/auth/login", { method: "POST", json: body });
}
export function signup(body: { email: string; password: string }) {
  return req("/api/auth/signup", { method: "POST", json: body });
}
export function me() {
  return req("/api/auth/me", { method: "GET" });
}
export function logout() {
  return req("/api/auth/logout", { method: "POST" });
}
export function resetPassword(email: string) {
  return req("/api/auth/reset", { method: "POST", json: { email } });
}
export function deleteAccount() {
  return req("/api/auth/account", { method: "DELETE" });
}
export function loginWithGoogle() {
  // Redireciona para fluxo OAuth no backend
  window.location.href = `${apiBase}/api/auth/google`;
}

/* =========== ACCOUNTS =========== */
export function getAccounts() {
  return req("/api/accounts", { method: "GET" });
}
export function createAccount(body: { name: string }) {
  return req("/api/accounts", { method: "POST", json: body });
}
export function loginAccount(id: string) {
  return req(`/api/accounts/${id}/login`, { method: "POST" });
}
export function logoutAccount(id: string) {
  return req(`/api/accounts/${id}/logout`, { method: "POST" });
}
export function debugAccountSession(id: string) {
  return req(`/api/accounts/${id}/debug-session`, { method: "GET" });
}

/* =========== WORKFLOWS =========== */
export function getWorkflows() {
  return req("/api/workflows", { method: "GET" });
}
export function getWorkflow(id: string) {
  return req(`/api/workflows/${id}`, { method: "GET" });
}
export function createWorkflow(body: {
  name: string;
  account_id: string;
  webhook_url?: string;
  nodes?: Array<{
    group_url: string;
    group_name: string;
    prompt?: string;
    keywords?: string[];
    is_active?: boolean;
  }>;
}) {
  return req("/api/workflows", { method: "POST", json: body });
}
export function startWorkflow(id: string) {
  return req(`/api/workflows/${id}/start`, { method: "POST" });
}
export function stopWorkflow(id: string) {
  return req(`/api/workflows/${id}/stop`, { method: "POST" });
}
export function getWorkflowNodes(id: string) {
  return req(`/api/workflows/${id}/nodes`, { method: "GET" });
}

/* =========== WORKFLOW NODES =========== */
export function createWorkflowNode(body: {
  workflow_id: string;
  group_url: string;
  group_name: string;
  prompt?: string;
  keywords?: string[];
  is_active?: boolean;
}) {
  return req("/api/workflow-nodes", { method: "POST", json: body });
}
export function updateWorkflowNode(id: string, body: Partial<{
  group_url: string;
  group_name: string;
  prompt: string;
  keywords: string[];
  is_active: boolean;
}>) {
  return req(`/api/workflow-nodes/${id}`, { method: "PUT", json: body });
}
export function deleteWorkflowNode(id: string) {
  return req(`/api/workflow-nodes/${id}`, { method: "DELETE" });
}

/* =========== HEALTH =========== */
export function health() {
  return req("/health", { method: "GET" });
}