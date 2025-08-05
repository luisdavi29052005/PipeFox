import { useEffect, useState } from 'react'
import { me } from '../lib/api'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    me().then((u) => setUser(u)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Carregando...</div>

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-2">Bem-vindo</h2>
      <pre className="text-sm bg-gray-50 p-3 rounded-lg overflow-auto">{JSON.stringify(user, null, 2)}</pre>
      <div className="mt-6">
        <a href="/login" className="text-sm text-orange-600 underline">Sair</a>
      </div>
    </div>
  )
}
