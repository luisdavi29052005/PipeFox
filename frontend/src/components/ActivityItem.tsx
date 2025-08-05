
interface ActivityItemProps {
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  time: string
  icon?: React.ReactNode
}

export default function ActivityItem({ type, title, time, icon }: ActivityItemProps) {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          defaultIcon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        }
      case 'warning':
        return {
          bgColor: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          defaultIcon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        }
      case 'info':
        return {
          bgColor: 'bg-orange-100',
          iconColor: 'text-orange-500',
          defaultIcon: <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
        }
      default:
        return {
          bgColor: 'bg-gray-100',
          iconColor: 'text-gray-600',
          defaultIcon: <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
        }
    }
  }

  const config = getTypeConfig(type)

  return (
    <div className="flex items-center space-x-3">
      <div className={`w-8 h-8 ${config.bgColor} rounded-full flex items-center justify-center`}>
        <div className={config.iconColor}>
          {icon || config.defaultIcon}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
      <button className="text-gray-400 hover:text-gray-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
