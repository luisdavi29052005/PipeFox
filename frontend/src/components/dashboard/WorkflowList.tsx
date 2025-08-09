
import { motion } from 'framer-motion'
import { Play, Square, Edit, Trash2, TrendingUp, AlertCircle } from 'lucide-react'

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
}

interface WorkflowListProps {
  workflows: Workflow[]
  onStart: (id: string) => void
  onStop: (id: string) => void
  onEdit: (id: string) => void
  isLoading?: boolean
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    running: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <Play className="w-3 h-3" />,
      text: 'Ativo'
    },
    stopped: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <Square className="w-3 h-3" />,
      text: 'Parado'
    },
    created: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <AlertCircle className="w-3 h-3" />,
      text: 'Criado'
    }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.created

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </span>
  )
}

const WorkflowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-12"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-12"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex space-x-2">
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>
    </td>
  </tr>
)

export default function WorkflowList({ 
  workflows, 
  onStart, 
  onStop, 
  onEdit,
  isLoading = false 
}: WorkflowListProps) {
  if (isLoading) {
    return (
      <motion.div
        className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Grupos</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Keywords</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Posts/h</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Erros/h</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, index) => (
                <WorkflowSkeleton key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    )
  }

  if (workflows.length === 0) {
    return (
      <motion.div
        className="bg-white rounded-2xl border border-gray-100 shadow-lg p-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <TrendingUp className="w-8 h-8 text-white" />
        </motion.div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Nenhum workflow encontrado
        </h3>
        <p className="text-gray-600 mb-6">
          Comece criando seu primeiro workflow para automatizar suas tarefas no Facebook
        </p>
        <motion.button
          onClick={() => window.location.href = '/workflow/create'}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="mr-2">✨</span>
          Criar Primeiro Workflow
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Grupos</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Keywords</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Posts/h</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Erros/h</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workflows.map((workflow, index) => {
              const activeGroups = workflow.workflow_nodes.filter(n => n.is_active).length
              const totalKeywords = workflow.workflow_nodes.reduce((acc, n) => acc + (n.keywords?.length || 0), 0)
              const postsPerHour = Math.floor(Math.random() * 50) + 10 // Mock data
              const errorsPerHour = Math.floor(Math.random() * 3) // Mock data

              return (
                <motion.tr
                  key={workflow.id}
                  className="hover:bg-gray-50 transition-colors duration-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{workflow.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={workflow.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 font-medium">{activeGroups}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 font-medium">{totalKeywords}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-green-600 font-medium">{postsPerHour}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${errorsPerHour > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {errorsPerHour}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {workflow.status === 'running' ? (
                        <motion.button
                          onClick={() => onStop(workflow.id)}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Square className="w-4 h-4" />
                        </motion.button>
                      ) : (
                        <motion.button
                          onClick={() => onStart(workflow.id)}
                          className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Play className="w-4 h-4" />
                        </motion.button>
                      )}
                      
                      <motion.button
                        onClick={() => onEdit(workflow.id)}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Edit className="w-4 h-4" />
                      </motion.button>
                      
                      <motion.button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja deletar este workflow?')) {
                            // Handle delete
                          }
                        }}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
