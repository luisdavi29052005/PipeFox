
interface Account {
  id: string
  name: string
  status: 'ready' | 'not_ready' | 'logging_in' | 'error' | 'conflict'
  fb_user_id?: string
  created_at: string
  updated_at: string
}

interface AccountCardProps {
  account: Account
  onLogin: (accountId: string) => void
  onLogout: (accountId: string) => void
  showActions?: boolean
}

export default function AccountCard({ account, onLogin, onLogout, showActions = true }: AccountCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500'
      case 'logging_in': return 'bg-yellow-500'
      default: return 'bg-red-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'Ready'
      case 'logging_in': return 'Logging in...'
      default: return 'Not ready'
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className={`w-4 h-4 rounded-full ${getStatusColor(account.status)}`}></div>
        <div>
          <h4 className="font-medium text-gray-900">{account.name}</h4>
          <p className="text-sm text-gray-500">
            Status: {getStatusText(account.status)}
          </p>
          {account.status === 'not_ready' && (
            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded mt-1 inline-block">
              exclusively
            </span>
          )}
        </div>
      </div>
      {showActions && (
        <div className="space-x-2">
          {account.status === 'ready' ? (
            <button
              onClick={() => onLogout(account.id)}
              className="px-4 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => onLogin(account.id)}
              disabled={account.status === 'logging_in'}
              className="px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {account.status === 'logging_in' ? 'Logging in...' : 'Login'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
