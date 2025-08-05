import { useEffect, useState } from 'react'
import { me, logout, getAccounts, getWorkflows, loginAccount, logoutAccount, createAccount, startWorkflow, stopWorkflow } from '../lib/api'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import StatCard from '../components/StatCard'
import AccountCard from '../components/AccountCard'
import ActivityItem from '../components/ActivityItem'
import WorkflowTable from '../components/WorkflowTable'

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
  const [activeSection, setActiveSection] = useState('dashboard')

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

  // Calculate metrics
  const totalLeads = 234
  const readyAccounts = accounts.filter(a => a.status === 'ready').length
  const activeWorkflows = workflows.filter(w => w.status === 'running').length
  const totalComments = 212

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header title={activeSection} />

        {/* Dashboard Content */}
        <main className="flex-1 p-8">
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  title="Leads"
                  value={totalLeads}
                  icon={
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  iconBgColor="bg-blue-100"
                />

                <StatCard
                  title="Facebook Accounts"
                  value={readyAccounts}
                  icon={
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  }
                  iconBgColor="bg-blue-600"
                />

                <StatCard
                  title="Workflows"
                  value={activeWorkflows}
                  icon={
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  }
                  iconBgColor="bg-green-100"
                />

                <StatCard
                  title="Comments"
                  value={totalComments}
                  icon={
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  }
                  iconBgColor="bg-purple-100"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Facebook Accounts */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Facebook Accounts</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {accounts.map(account => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onLogin={handleAccountLogin}
                        onLogout={handleAccountLogout}
                        showActions={false}
                      />
                    ))}
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <ActivityItem type="info" title="Lead created" time="2 hours ago" />
                    <ActivityItem type="success" title="Email Campaign paused" time="1 day ago" />
                    <ActivityItem type="warning" title="Import failed for 2 leads" time="3 days ago" />
                  </div>
                </div>
              </div>

              {/* Workflows Table */}
              <WorkflowTable
                workflows={workflows}
                onStart={handleWorkflowStart}
                onStop={handleWorkflowStop}
              />
            </div>
          )}

          {activeSection === 'accounts' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Facebook Accounts</h3>
                  <button 
                    onClick={handleCreateAccount}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    + Add Account
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {accounts.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onLogin={handleAccountLogin}
                    onLogout={handleAccountLogout}
                  />
                ))}
              </div>
            </div>
          )}

          {(activeSection === 'leads' || activeSection === 'workflows' || activeSection === 'activity' || activeSection === 'settings') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h3>
                <p className="text-gray-500">This section is coming soon...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}