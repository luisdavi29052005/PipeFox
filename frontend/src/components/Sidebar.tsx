
interface SidebarItem {
  id: string
  icon: string
  label: string
}

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  userEmail?: string
  onLogout: () => void
}

export default function Sidebar({ activeSection, onSectionChange, userEmail, onLogout }: SidebarProps) {
  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'leads', icon: '👥', label: 'Leads' },
    { id: 'accounts', icon: '📘', label: 'Facebook Accounts' },
    { id: 'workflows', icon: '⚙️', label: 'Workflows' },
    { id: 'activity', icon: '📊', label: 'Activity' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ]

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            🦊
          </div>
          <span className="text-xl font-semibold text-gray-900">PipeFox</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {sidebarItems.map(item => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
              activeSection === item.id 
                ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {userEmail?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userEmail || 'User'}
            </p>
            <button 
              onClick={onLogout}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
