
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

interface WorkflowTableProps {
  workflows: Workflow[]
  onStart: (workflowId: string) => void
  onStop: (workflowId: string) => void
}

export default function WorkflowTable({ workflows, onStart, onStop }: WorkflowTableProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'running':
        return { label: 'OK', className: 'bg-green-100 text-green-800' }
      case 'stopped':
        return { label: 'Error', className: 'bg-red-100 text-red-800' }
      default:
        return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Workflows</h3>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facebook Group</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workflows.map(workflow => {
              const statusConfig = getStatusConfig(workflow.status)
              return (
                <tr key={workflow.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{workflow.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {workflow.workflow_nodes[0]?.group_name || 'No groups'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {workflow.status === 'running' ? (
                      <button
                        onClick={() => onStop(workflow.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => onStart(workflow.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Start
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
