
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Square, Edit, Trash2, Plus, Zap, Users, Search, Activity, MoreVertical } from 'lucide-react'
import { getWorkflows, startWorkflow, stopWorkflow, deleteWorkflow } from '../lib/api'
import Layout from '../components/layout/Layout'
import Sidebar from '../components/dashboard/Sidebar'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { me } from '../lib/api'

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
  status: 'running' | 'stopped' | 'created'
  workflow_nodes: WorkflowNode[]
  created_at: string
}

interface User {
  id: string
  email: string
  name?: string
}

export default function Workflows() {
  const [user, setUser] = useState<User | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [userData, workflowsData] = await Promise.all([
        me(),
        getWorkflows()
      ])
      setUser(userData)
      setWorkflows(workflowsData)
    } catch (err: any) {
      setError('Erro ao carregar workflows')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartWorkflow = async (id: string) => {
    try {
      await startWorkflow(id)
      await loadData()
    } catch (err: any) {
      setError('Erro ao iniciar workflow')
    }
  }

  const handleStopWorkflow = async (id: string) => {
    try {
      await stopWorkflow(id)
      await loadData()
    } catch (err: any) {
      setError('Erro ao parar workflow')
    }
  }

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este workflow?')) return
    
    try {
      await deleteWorkflow(id)
      await loadData()
    } catch (err: any) {
      setError('Erro ao deletar workflow')
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold"
    switch (status) {
      case 'running':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100`
      case 'stopped':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
    }
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
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <div className="text-lg font-medium text-gray-700 dark:text-gray-300">Carregando workflows...</div>
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
                    Workflows
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    Gerencie seus workflows de automação
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => navigate('/workflow/create')}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Criar Workflow
                  </Button>
                </motion.div>
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
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Workflows</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{workflows.length}</p>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
                    <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Workflows Ativos</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {workflows.filter(w => w.status === 'running').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                    <Play className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Grupos</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {workflows.reduce((acc, w) => acc + w.workflow_nodes.length, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Workflows List */}
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Todos os Workflows
                </h2>
              </div>

              {workflows.length === 0 ? (
                <div className="p-12 text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum workflow encontrado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Crie seu primeiro workflow para começar a automatizar suas ações no Facebook
                    </p>
                    <Button 
                      onClick={() => navigate('/workflow/create')}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Workflow
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {workflows.map((workflow, index) => (
                    <motion.div 
                      key={workflow.id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {workflow.name}
                            </h3>
                            <span className={getStatusBadge(workflow.status)}>
                              {workflow.status === 'running' ? 'Executando' : 
                               workflow.status === 'stopped' ? 'Parado' : 'Criado'}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{workflow.workflow_nodes.length} grupos</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Search className="w-4 h-4" />
                              <span>
                                {workflow.workflow_nodes.reduce((acc, node) => acc + (node.keywords?.length || 0), 0)} keywords
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className="w-4 h-4" />
                              <span>
                                Criado em {new Date(workflow.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {workflow.status === 'running' ? (
                            <Button
                              onClick={() => handleStopWorkflow(workflow.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900"
                            >
                              <Square className="w-4 h-4 mr-1" />
                              Parar
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleStartWorkflow(workflow.id)}
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Iniciar
                            </Button>
                          )}
                          
                          <Button
                            onClick={() => navigate(`/workflow/${workflow.id}`)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          
                          <Button
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
