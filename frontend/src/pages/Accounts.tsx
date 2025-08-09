import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Plus, Settings, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { getAccounts, createAccount, loginAccount, logoutAccount, deleteFbAccount, me } from '../lib/api';
import Layout from '../components/layout/Layout'
import Sidebar from '../components/dashboard/Sidebar'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import Input from '../components/ui/Input'

interface Account {
  id: string
  name: string
  status: 'ready' | 'not_ready' | 'logging_in' | 'error' | 'conflict'
  fb_user_id?: string
  created_at: string
  updated_at: string
}

interface User {
  id: string
  email: string
  name?: string
}

export default function Accounts() {
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [userData, accountsData] = await Promise.all([
        me(),
        getAccounts()
      ])
      setUser(userData)
      setAccounts(accountsData)
    } catch (err: any) {
      setError('Erro ao carregar contas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccountName.trim()) return

    try {
      setCreating(true)
      await createAccount({ name: newAccountName })
      setNewAccountName('')
      setShowCreateForm(false)
      await loadData()
    } catch (err: any) {
      setError('Erro ao criar conta')
    } finally {
      setCreating(false)
    }
  }

  const handleLoginAccount = async (id: string) => {
    try {
      await loginAccount(id)
      await loadData()
    } catch (err: any) {
      setError('Erro ao fazer login na conta')
    }
  }

  const handleLogoutAccount = async (id: string) => {
    try {
      await logoutAccount(id)
      await loadData()
    } catch (err: any) {
      setError('Erro ao fazer logout da conta')
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta conta?')) return
    
    try {
      await deleteFbAccount(id)
      await loadData()
    } catch (err: any) {
      setError('Erro ao deletar conta')
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ready':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          label: 'Conectada',
          description: 'Conta conectada e pronta para uso',
          badgeClass: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
        }
      case 'not_ready':
        return {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          label: 'Não Conectada',
          description: 'Faça login para conectar esta conta',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
        }
      case 'logging_in':
        return {
          icon: <Clock className="w-5 h-5 text-yellow-500 animate-spin" />,
          label: 'Conectando...',
          description: 'Fazendo login na conta do Facebook',
          badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
        }
      case 'error':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          label: 'Erro',
          description: 'Erro ao conectar com a conta',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
        }
      case 'conflict':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
          label: 'Conflito',
          description: 'Conflito detectado na conta',
          badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
        }
      default:
        return {
          icon: <XCircle className="w-5 h-5 text-gray-500" />,
          label: 'Desconhecido',
          description: 'Status desconhecido',
          badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }
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
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <User className="w-8 h-8 text-white" />
            </motion.div>
            <div className="text-lg font-medium text-gray-700 dark:text-gray-300">Carregando contas...</div>
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
                    Contas do Facebook
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    Gerencie suas contas conectadas para automação
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => setShowCreateForm(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Adicionar Conta
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
              className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Contas</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{accounts.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conectadas</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {accounts.filter(a => a.status === 'ready').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Desconectadas</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {accounts.filter(a => a.status === 'not_ready').length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-xl">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Com Erro</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {accounts.filter(a => a.status === 'error' || a.status === 'conflict').length}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Create Account Form */}
            {showCreateForm && (
              <motion.div 
                className="mb-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg p-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Adicionar Nova Conta
                </h3>
                <form onSubmit={handleCreateAccount} className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Nome da conta (ex: Minha Conta Principal)"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={creating || !newAccountName.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    {creating ? 'Criando...' : 'Criar Conta'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewAccountName('')
                    }}
                  >
                    Cancelar
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Accounts List */}
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Suas Contas
                </h2>
              </div>

              {accounts.length === 0 ? (
                <div className="p-12 text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhuma conta encontrada
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Adicione uma conta do Facebook para começar a usar a automação
                    </p>
                    <Button 
                      onClick={() => setShowCreateForm(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeira Conta
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {accounts.map((account, index) => {
                    const statusInfo = getStatusInfo(account.status)
                    return (
                      <motion.div 
                        key={account.id}
                        className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {account.name}
                              </h3>
                              <div className="flex items-center space-x-3 mt-1">
                                {statusInfo.icon}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.badgeClass}`}>
                                  {statusInfo.label}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {statusInfo.description}
                                </span>
                              </div>
                              {account.fb_user_id && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  ID: {account.fb_user_id}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {account.status === 'ready' ? (
                              <Button
                                onClick={() => handleLogoutAccount(account.id)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900"
                              >
                                Desconectar
                              </Button>
                            ) : account.status === 'logging_in' ? (
                              <Button
                                disabled
                                variant="outline"
                                size="sm"
                              >
                                Conectando...
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleLoginAccount(account.id)}
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900"
                              >
                                Conectar
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => handleDeleteAccount(account.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
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
