
interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  iconBgColor: string
}

export default function StatCard({ title, value, icon, iconBgColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
