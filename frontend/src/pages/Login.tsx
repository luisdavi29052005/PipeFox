import { useState } from 'react'
import { apiBase, login, signup, me } from '../lib/api'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signup') {
        if (password !== confirm) {
          setError('As senhas não coincidem')
          setLoading(false)
          return
        }
        await signup({ email, password })
      } else {
        await login({ email, password })
      }
      await me()
      window.location.href = '/app'
    } catch (err: any) {
      setError(err?.message || 'Falha na autenticação')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    window.location.href = `${apiBase}/api/auth/google`
  }

  return (
    <div className="w-full max-w-md bg-white shadow-sm rounded-2xl p-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
          <span className="text-2xl">🦊</span>
        </div>
        <h1 className="text-xl font-semibold">
          {mode === 'login' ? 'Entrar no PipeFox' : 'Criar conta no PipeFox'}
        </h1>
        <p className="text-sm text-gray-500">
          {mode === 'login' ? 'Automatize seus comentários com IA' : 'Leva 10 segundos'}
        </p>
      </div>

      <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setMode('login')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode==='login' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Entrar
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode==='signup' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">E-mail</label>
          <input
            type="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Senha</label>
          <input
            type="password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium mb-1">Confirmar senha</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 bg-orange-500 text-white font-medium disabled:opacity-60"
        >
          {loading ? 'Enviando...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs text-gray-500">ou</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full rounded-lg px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50"
      >
        {mode === 'login' ? 'Entrar com Google' : 'Criar conta com Google'}
      </button>

      <div className="mt-4 text-center text-sm text-gray-600">
        {mode === 'login' ? (
          <span>Não tem conta?{' '}
            <button onClick={() => setMode('signup')} className="text-orange-600 font-medium hover:underline">
              Criar conta
            </button>
          </span>
        ) : (
          <span>Já tem conta?{' '}
            <button onClick={() => setMode('login')} className="text-orange-600 font-medium hover:underline">
              Entrar
            </button>
          </span>
        )}
      </div>

      <div className="mt-2 text-center">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); alert('Envie seu e-mail, implementamos depois.'); }}
          className="text-sm text-orange-600 hover:underline"
        >
          Esqueci minha senha
        </a>
      </div>
    </div>
  )
}
