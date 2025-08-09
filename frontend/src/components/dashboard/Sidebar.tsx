
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  Zap, 
  Users, 
  Target, 
  LogOut, 
  Menu, 
  X,
  Settings
} from 'lucide-react'
import { logout } from '../../lib/api'
import DarkModeToggle from '../ui/DarkModeToggle'

export default function Sidebar() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/workflows', label: 'Workflows', icon: Zap },
    { path: '/accounts', label: 'Contas', icon: Users },
    { path: '/leads', label: 'Leads', icon: Target },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <motion.button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        onClick={() => setIsCollapsed(!isCollapsed)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isCollapsed ? <Menu size={20} /> : <X size={20} />}
      </motion.button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCollapsed(true)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`
          fixed md:static inset-y-0 left-0 z-50 
          w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transform ${isCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
          transition-transform duration-300 ease-in-out md:transition-none
          flex flex-col h-full
        `}
        initial={false}
        animate={{ x: isCollapsed ? (window.innerWidth < 768 ? -256 : 0) : 0 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              🦊
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">PipeFox</h1>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path
              const IconComponent = item.icon
              
              return (
                <motion.li
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link to={item.path}>
                    <motion.button
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                        ${isActive 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`
                        p-1 rounded-md
                        ${isActive ? 'bg-blue-100 dark:bg-blue-800/30' : ''}
                      `}>
                        <IconComponent size={18} />
                      </div>
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div
                          className="ml-auto w-2 h-2 bg-blue-500 rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Tema</span>
            <DarkModeToggle />
          </div>

          {/* Settings */}
          <motion.button
            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings size={18} />
            <span>Configurações</span>
          </motion.button>

          {/* Logout */}
          <motion.button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut size={18} />
            <span>Sair</span>
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}
