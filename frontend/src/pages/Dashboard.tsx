
import { useEffect, useState } from 'react'
import { me, logout, getAccounts, getWorkflows, loginAccount, logoutAccount, createAccount, startWorkflow, stopWorkflow } from '../lib/api'

async function getWorkflowNodes(workflowId: string) {
  const response = await fetch(`/api/workflows/${workflowId}/nodes`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  if (!response.ok) throw new Error('Failed to fetch workflow nodes')
  return response.json()
}

interface User {
  id: string
  email: string
  name?: string
}

interface Account {
  id: string
  name: string
  status: 'ready' | 'not_ready' | 'logging_in' | 'error' | 'conflict'
  fb_user_id?: string
  created_at: string
  updated_at: string
}

interface WorkflowNode {
  id: string
  group_url: string
  group_name: string
  is_active: boolean
  keywords?: string[]
}

interface Workflow {
  id: string
  name: string
  status: 'created' | 'running' | 'stopped'
  account_id: string
  webhook_url?: string
  workflow_nodes: WorkflowNode[]
  created_at: string
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load user data
      try {
        const userData = await me()
        setUser(userData.user)
      } catch (err) {
        console.error('Error loading user:', err)
      }

      // Load accounts data
      try {
        const accountsData = await getAccounts()
        setAccounts(accountsData)
      } catch (err) {
        console.error('Error loading accounts:', err)
      }

      // Load workflows data
      try {
        const workflowsData = await getWorkflows()
        // Add workflow_nodes to each workflow for compatibility
        const workflowsWithNodes = await Promise.all(
          workflowsData.map(async (workflow: any) => {
            try {
              const nodes = await getWorkflowNodes(workflow.id)
              return { ...workflow, workflow_nodes: nodes }
            } catch (err) {
              console.error('Error loading workflow nodes:', err)
              return { ...workflow, workflow_nodes: [] }
            }
          })
        )
        setWorkflows(workflowsWithNodes)
      } catch (err) {
        console.error('Error loading workflows:', err)
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleAccountLogin = async (accountId: string) => {
    try {
      await loginAccount(accountId)
      alert('Janela de login aberta. Faça login no Facebook e feche a janela quando terminar.')
      setTimeout(() => refreshData(), 2000)
    } catch (err) {
      console.error('Login error:', err)
    }
  }

  const handleAccountLogout = async (accountId: string) => {
    try {
      await logoutAccount(accountId)
      refreshData()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleWorkflowStart = async (workflowId: string) => {
    try {
      await startWorkflow(workflowId)
      refreshData()
    } catch (err: any) {
      console.error('Start workflow error:', err)
      alert(`Erro: ${err.message}`)
    }
  }

  const handleWorkflowStop = async (workflowId: string) => {
    try {
      await stopWorkflow(workflowId)
      refreshData()
    } catch (err) {
      console.error('Stop workflow error:', err)
    }
  }

  const refreshData = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  const handleCreateAccount = async () => {
    const accountName = prompt('Digite o nome da nova conta:')
    if (!accountName) return

    try {
      await createAccount({ name: accountName })
      refreshData()
      alert('Conta criada com sucesso!')
    } catch (err: any) {
      console.error('Create account error:', err)
      alert(`Erro ao criar conta: ${err.message}`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '🟢'
      case 'running': return '🟢'
      case 'not_ready': return '🔴'
      case 'stopped': return '🔴'
      case 'logging_in': return '🟡'
      case 'created': return '🟡'
      default: return '⚪'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'ready'
      case 'running': return 'Ativo'
      case 'not_ready': return 'not_ready'
      case 'stopped': return 'Parado'
      case 'logging_in': return 'fazendo login...'
      case 'created': return 'Criado'
      default: return status
    }
  }

  // Calculate metrics
  const activeWorkflows = workflows.filter(w => w.status === 'running').length
  const totalGroups = workflows.reduce((acc, w) => acc + w.workflow_nodes.filter(n => n.is_active).length, 0)
  const totalKeywords = workflows.reduce((acc, w) => 
    acc + w.workflow_nodes.reduce((nodeAcc, n) => nodeAcc + (n.keywords?.length || 0), 0), 0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-orange-500">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                🦊 PipeFox Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Olá, {user?.name || user?.email}! 
                <button 
                  onClick={handleLogout}
                  className="ml-2 text-orange-600 hover:text-orange-700 underline text-sm"
                >
                  [Logoff]
                </button>
              </p>
            </div>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">=== Métricas rápidas ===</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>Leads capturados: <span className="font-bold">-</span></div>
            <div>Novos hoje: <span className="font-bold">-</span></div>
            <div>Comentários feitos: <span className="font-bold">-</span></div>
            <div>Grupos ativos: <span className="font-bold">{totalGroups}</span></div>
            <div>Workflows ativos: <span className="font-bold">{activeWorkflows}</span></div>
            <div>Total keywords: <span className="font-bold">{totalKeywords}</span></div>
          </div>
        </div>

        {/* Facebook Accounts */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">=== Contas do Facebook ===</h2>
          <div className="space-y-3">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <span>{getStatusIcon(account.status)}</span>
                  <span className="font-medium">{account.name}</span>
                  <span className="text-sm text-gray-500">({getStatusText(account.status)})</span>
                </div>
                <div className="space-x-2">
                  {account.status === 'ready' ? (
                    <button
                      onClick={() => handleAccountLogout(account.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Logout
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAccountLogin(account.id)}
                      disabled={account.status === 'logging_in'}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                    >
                      {account.status === 'logging_in' ? 'Logando...' : 'Login'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="text-center">
              <button 
                onClick={handleCreateAccount}
                className="text-orange-600 hover:text-orange-700 text-sm"
              >
                + Conectar nova conta
              </button>
            </div>
          </div>
        </div>

        {/* Workflows */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">=== Workflows ===</h2>
          <div className="space-y-3">
            {workflows.map(workflow => {
              const activeNodes = workflow.workflow_nodes.filter(n => n.is_active)
              const keywordCount = activeNodes.reduce((acc, n) => acc + (n.keywords?.length || 0), 0)
              
              return (
                <div key={workflow.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-4">
                    <span>{getStatusIcon(workflow.status)}</span>
                    <span className="font-medium">{workflow.name}</span>
                    <span className="text-sm text-gray-500">
                      {getStatusText(workflow.status)} | {activeNodes.length} grupos | {keywordCount} palavras-chave
                    </span>
                  </div>
                  <div>
                    {workflow.status === 'running' ? (
                      <button
                        onClick={() => handleWorkflowStop(workflow.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Parar workflow"
                      >
                        ⏸
                      </button>
                    ) : (
                      <button
                        onClick={() => handleWorkflowStart(workflow.id)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        title="Iniciar workflow"
                      >
                        ▶
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <div className="text-center">
              <button className="text-orange-600 hover:text-orange-700 text-sm">
                + Novo workflow
              </button>
            </div>
          </div>
        </div>

        {/* Latest Leads */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">=== Últimos Leads ===</h2>
          <div className="space-y-3">
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum lead capturado ainda.</p>
              <p className="text-sm mt-2">Os leads aparecerão aqui quando os workflows estiverem ativos.</p>
            </div>
            <div className="text-center">
              <button className="text-orange-600 hover:text-orange-700 text-sm">
                Ver todos os leads →
              </button>
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">=== Logs recentes ===</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className="text-center py-4 text-gray-500">
              Nenhum log disponível ainda.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
