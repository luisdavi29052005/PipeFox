
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Eye, MessageCircle, ExternalLink, Calendar, Filter, Download, TrendingUp } from 'lucide-react'
import { me } from '../lib/api'
import Layout from '../components/layout/Layout'
import Sidebar from '../components/dashboard/Sidebar'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'

interface Lead {
  id: string
  post_url: string
  status: 'captured' | 'processed' | 'commented' | 'failed'
  generated_comment?: string
  created_at: string
  updated_at: string
  node: {
    group_name: string
    workflow: {
      name: string
    }
  }
}

interface User {
  id: string
  email: string
  name?: string
}

// Mock data - replace with real API call
const mockLeads: Lead[] = [
  {
    id: '1',
    post_url: 'https://facebook.com/groups/example/posts/123',
    status: 'commented',
    generated_comment: 'Que foto incrível! 📸 Se precisar restaurar alguma foto antiga, posso ajudar! 😊',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:35:00Z',
    node: {
      group_name: 'Fotografia Digital',
      workflow: {
        name: 'Captação de Leads - Restauração de Fotos'
      }
    }
  },
  {
    id: '2',
    post_url: 'https://facebook.com/groups/example/posts/124',
    status: 'processed',
    generated_comment: 'Excelente trabalho! Se quiser dar uma melhorada na qualidade, tenho algumas dicas! 🎯',
    created_at: '2024-01-15T09:15:00Z',
    updated_at: '2024-01-15T09:20:00Z',
    node: {
      group_name: 'Design Gráfico Brasil',
      workflow: {
        name: 'Leads para Serviços de Design'
      }
    }
  },
  {
    id: '3',
    post_url: 'https://facebook.com/groups/example/posts/125',
    status: 'captured',
    created_at: '2024-01-15T08:45:00Z',
    updated_at: '2024-01-15T08:45:00Z',
    node: {
      group_name: 'Empreendedores Online',
      workflow: {
        name: 'Captação Empreendedorismo'
      }
    }
  },
  {
    id: '4',
    post_url: 'https://facebook.com/groups/example/posts/126',
    status: 'failed',
    created_at: '2024-01-15T07:30:00Z',
    updated_at: '2024-01-15T07:35:00Z',
    node: {
      group_name: 'Marketing Digital 2024',
      workflow: {
        name: 'Leads Marketing'
      }
    }
  }
]

export default function Leads() {
  const [user, setUser] = useState<User | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'captured' | 'processed' | 'commented' | 'failed'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const userData = await me()
      setUser(userData)
      
      // TODO: Replace with real API call
      // const leadsData = await getLeads()
      setLeads(mockLeads)
    } catch (err: any) {
      setError('Erro ao carregar leads')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'captured':
        return {
          label: 'Capturado',
          description: 'Lead identificado e capturado',
          badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
          icon: <Target className="w-4 h-4" />
        }
      case 'processed':
        return {
          label: 'Processado',
          description: 'Comentário gerado pela IA',
          badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
          icon: <MessageCircle className="w-4 h-4" />
        }
      case 'commented':
        return {
          label: 'Comentado',
          description: 'Comentário publicado com sucesso',
          badgeClass: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
          icon: <MessageCircle className="w-4 h-4" />
        }
      case 'failed':
        return {
          label: 'Falhou',
          description: 'Erro ao processar o lead',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
          icon: <Target className="w-4 h-4" />
        }
      default:
        return {
          label: 'Desconhecido',
          description: 'Status não identificado',
          badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
          icon: <Target className="w-4 h-4" />
        }
    }
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter(lead => lead.status === filter)

  const getStatsForStatus = (status: string) => {
    return leads.filter(lead => lead.status === status).length
  }

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
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Target className="w-8 h-8 text-white" />
            </motion.div>
            <div className="text-lg font-medium text-gray-700 dark:text-gray-300">Carregando leads...</div>
          </motion.div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showHeader={false}>
      <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Sidebar user={user} />

        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    Leads Capturados
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    Monitore e analise os leads gerados pelos seus workflows
                  </p>
                </div>
                <div className="flex space-x-3">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={() => {/* TODO: Export functionality */}}
                      variant="outline"
                      className="border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Exportar
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {error && (
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              </motion.div>
            )}

            {/* Stats Cards */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Leads</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{leads.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                    <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Capturados</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{getStatsForStatus('captured')}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                    <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Processados</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{getStatsForStatus('processed')}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-xl">
                    <MessageCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Comentados</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{getStatsForStatus('commented')}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                    <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taxa de Sucesso</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {leads.length > 0 ? Math.round((getStatsForStatus('commented') / leads.length) * 100) : 0}%
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Filters */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="flex items-center space-x-4">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="flex space-x-2">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'captured', label: 'Capturados' },
                    { key: 'processed', label: 'Processados' },
                    { key: 'commented', label: 'Comentados' },
                    { key: 'failed', label: 'Falharam' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        filter === key
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {label} ({key === 'all' ? leads.length : getStatsForStatus(key)})
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Leads List */}
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {filter === 'all' ? 'Todos os Leads' : `Leads ${filter}`} ({filteredLeads.length})
                </h2>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="p-12 text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum lead encontrado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {filter === 'all' 
                        ? 'Seus workflows ainda não capturaram nenhum lead'
                        : `Não há leads com status "${filter}"`
                      }
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredLeads.map((lead, index) => {
                    const statusInfo = getStatusInfo(lead.status)
                    return (
                      <motion.div 
                        key={lead.id}
                        className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="flex items-center space-x-2">
                                {statusInfo.icon}
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.badgeClass}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {statusInfo.description}
                              </span>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium mr-2">Workflow:</span>
                                <span>{lead.node.workflow.name}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium mr-2">Grupo:</span>
                                <span>{lead.node.group_name}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>
                                  {new Date(lead.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            </div>

                            {lead.generated_comment && (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Comentário Gerado:
                                </p>
                                <p className="text-gray-900 dark:text-gray-100">
                                  {lead.generated_comment}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => window.open(lead.post_url, '_blank')}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Ver Post
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
