
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react'
import { me, getStatsMock } from '../lib/api'
import Layout from '../components/layout/Layout'
import Sidebar from '../components/dashboard/Sidebar'
import StatsCards from '../components/dashboard/StatsCards'
import TrendChart from '../components/dashboard/TrendChart'
import ErrorsPanel from '../components/dashboard/ErrorsPanel'
import AccountsHealth from '../components/dashboard/AccountsHealth'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'

interface User {
  id: string
  email: string
  name?: string
}

interface DashboardStats {
  totals: {
    workflows_active: number;
    groups_monitored: number;
    keywords_configured: number;
    posts_24h: number;
    comments_24h: number;
    success_rate_24h: number;
    backlog: number;
  };
  trend_30d: Array<{
    day: string;
    posts: number;
    comments: number;
  }>;
  errors_24h: Array<{
    reason: string;
    count: number;
  }>;
  nodes_top_24h: Array<{
    id: string;
    node: string;
    posts: number;
    comments: number;
    success_rate: number;
  }>;
  accounts_health: Array<{
    id: string;
    name: string;
    status: string;
    health: string;
    last_seen_at: string;
    errors_24h: number;
  }>;
  economy: {
    cost_total_30d: number;
    cost_per_comment: number;
    tokens_30d: number;
  };
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const loadStats = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setRefreshing(true)
      else setLoading(true)
      
      setError(null)
      
      // Use mock data for development
      const statsData = await getStatsMock()
      setStats(statsData)
    } catch (err: any) {
      console.error('Failed to load stats:', err)
      setError('Falha ao carregar estatísticas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await me()
        setUser(userData)
        await loadStats()
      } catch (error) {
        console.error('Failed to load user data:', error)
        navigate('/login')
      }
    }

    loadData()
  }, [navigate])

  // Calculate health alerts
  const healthAlerts = stats ? [
    ...(stats.totals.success_rate_24h < 60 ? ['Taxa de sucesso baixa (< 60%)'] : []),
    ...(stats.accounts_health.filter(acc => acc.health !== 'ok').length > 0 ? ['Contas com problemas'] : []),
    ...(stats.errors_24h.length > 0 ? ['Erros detectados nas últimas 24h'] : [])
  ] : []

  if (loading) {
    return (
      <Layout showHeader={false}>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Activity className="w-8 h-8 text-white" />
            </motion.div>
            <div className="text-lg font-medium text-gray-700 dark:text-gray-300">Carregando seu dashboard...</div>
          </motion.div>
        </div>
      </Layout>
    )
  }

  if (!stats) {
    return (
      <Layout showHeader={false}>
        <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <Sidebar />
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <Alert variant="error" title="Erro ao carregar dados">
                {error || 'Falha ao carregar estatísticas do dashboard'}
                <div className="mt-4">
                  <Button onClick={() => loadStats()} variant="outline" size="sm">
                    Tentar novamente
                  </Button>
                </div>
              </Alert>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showHeader={false}>
      <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Sidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Visão geral do seu PipeFox
                </p>
              </div>
              
              <Button
                onClick={() => loadStats(true)}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </Button>
            </motion.div>

            {/* Health Alerts */}
            {healthAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="warning" title="Atenção">
                  <div className="space-y-1">
                    {healthAlerts.map((alert, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                </Alert>
              </motion.div>
            )}

            {/* Stats Cards */}
            <StatsCards stats={stats.totals} />

            {/* Charts and Panels Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Trend Chart - Takes 2 columns on xl screens */}
              <div className="xl:col-span-2">
                <TrendChart data={stats.trend_30d} />
              </div>
              
              {/* Errors Panel */}
              <ErrorsPanel errors={stats.errors_24h} />
            </div>

            {/* Bottom Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Nodes Table */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Top Grupos 24h
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Grupos com mais atividade
                  </p>
                </div>

                {stats.nodes_top_24h.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <Activity className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Nenhuma atividade nas últimas 24h</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.nodes_top_24h.map((node, index) => (
                      <motion.div
                        key={node.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {node.node}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {node.posts} posts
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {node.comments} comentários
                            </span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              {node.success_rate}% sucesso
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Accounts Health */}
              <AccountsHealth accounts={stats.accounts_health} />
            </div>

            {/* Economy Panel - Only show if there's cost data */}
            {stats.economy.cost_total_30d > 0 && (
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Economia
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Custos e tokens usados
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ${stats.economy.cost_total_30d.toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Custo Total 30d
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${stats.economy.cost_per_comment.toFixed(3)}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Por Comentário
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {stats.economy.tokens_30d.toLocaleString()}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">
                      Tokens 30d
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
