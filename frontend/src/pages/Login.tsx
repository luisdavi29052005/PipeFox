
import { useState } from 'react'
import { apiBase, login, signup, me } from '../lib/api'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Função para converter erros técnicos em mensagens amigáveis
  const getFriendlyErrorMessage = (error: string) => {
    const errorLower = error.toLowerCase()
    
    if (errorLower.includes('user already registered') || errorLower.includes('already exists')) {
      return 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.'
    }
    if (errorLower.includes('invalid login credentials') || errorLower.includes('invalid') || errorLower.includes('credentials') || errorLower.includes('user not found') || errorLower.includes('email not found')) {
      return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
    }
    if (errorLower.includes('email not confirmed') || errorLower.includes('not confirmed')) {
      return 'Verifique sua caixa de entrada e confirme seu e-mail antes de continuar.'
    }
    if (errorLower.includes('weak password') || errorLower.includes('password')) {
      return 'A senha deve ter pelo menos 6 caracteres. Tente uma senha mais forte.'
    }
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return 'Problema de conexão. Verifique sua internet e tente novamente.'
    }
    if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    }
    if (errorLower.includes('server') || errorLower.includes('internal')) {
      return 'Nossos servidores estão com problema. Tente novamente em alguns minutos.'
    }
    
    // Fallback para erros não mapeados - também mostra a mesma mensagem de credenciais inválidas
    return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      if (mode === 'signup') {
        if (password !== confirm) {
          setError('As senhas não coincidem. Digite a mesma senha nos dois campos.')
          setLoading(false)
          return
        }
        await signup({ email, password })
        
        // Mostrar mensagem de sucesso
        setSuccessMessage('Conta criada com sucesso! Verifique sua caixa de entrada e confirme seu e-mail antes de fazer login.')
        
        // Limpar os campos
        setEmail('')
        setPassword('')
        setConfirm('')
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          setMode('login')
          setSuccessMessage(null)
        }, 3000)
        
      } else {
        await login({ email, password })
        await me()
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      const friendlyMessage = getFriendlyErrorMessage(err?.message || 'Erro desconhecido')
      setError(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    window.location.href = `${apiBase}/api/auth/google`
  }

  return (
    <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shadow-sm transition-all duration-500 hover:scale-110">
          <span className="text-2xl">🦊</span>
        </div>
        <div className="overflow-hidden">
          <h1 className="text-xl font-semibold text-gray-800 transition-all duration-500 ease-in-out transform">
            {mode === 'login' ? 'Entrar no PipeFox' : 'Criar conta no PipeFox'}
          </h1>
        </div>
        <div className="overflow-hidden">
          <p className="text-sm text-gray-500 transition-all duration-500 ease-in-out transform">
            {mode === 'login' ? 'Automatize seus comentários com IA' : 'Leva 10 segundos'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setMode('login')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mode==='login' 
              ? 'bg-white shadow-sm transform scale-[1.02]' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Entrar
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mode==='signup' 
              ? 'bg-white shadow-sm transform scale-[1.02]' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="transition-all duration-300 ease-in-out transform hover:translate-y-[-1px]">
          <label className="block text-sm font-medium mb-1 text-gray-700 transition-colors duration-200">E-mail</label>
          <input
            type="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="transition-all duration-300 ease-in-out transform hover:translate-y-[-1px]">
          <label className="block text-sm font-medium mb-1 text-gray-700 transition-colors duration-200">Senha</label>
          <input
            type="password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
          mode === 'signup' 
            ? 'max-h-24 opacity-100 transform translate-y-0' 
            : 'max-h-0 opacity-0 transform -translate-y-2'
        }`}>
          <div className="transition-all duration-300 ease-in-out transform hover:translate-y-[-1px]">
            <label className="block text-sm font-medium mb-1 text-gray-700 transition-colors duration-200">Confirmar senha</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required={mode === 'signup'}
            />
          </div>
        </div>

        {successMessage && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800 font-medium">Sucesso!</p>
                  <p className="text-sm text-green-700 mt-1">{successMessage}</p>
                  <p className="text-xs text-green-600 mt-2">Redirecionando para o login...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-sm">⚠</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 font-medium">Oops!</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || successMessage !== null}
          className={`w-full rounded-lg px-4 py-2 font-medium disabled:opacity-60 active:transform active:scale-[0.98] transition-all duration-300 shadow-md hover:shadow-lg hover:translate-y-[-1px] disabled:hover:translate-y-0 ${
            successMessage 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          <div className="transition-all duration-300 ease-in-out">
            {successMessage ? (
              <div className="flex items-center justify-center">
                <span className="text-white text-sm mr-2">✓</span>
                Conta criada!
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {mode === 'signup' ? 'Criando conta...' : 'Entrando...'}
              </div>
            ) : (
              <span className="transition-all duration-300 ease-in-out">
                {mode === 'login' ? 'Entrar' : 'Criar conta'}
              </span>
            )}
          </div>
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs text-gray-500">ou</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full rounded-lg px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 active:transform active:scale-[0.98] transition-all duration-300 shadow-sm hover:shadow-md hover:translate-y-[-1px] flex items-center justify-center"
      >
        <svg className="w-4 h-4 mr-2 transition-transform duration-300 hover:scale-110" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span className="transition-all duration-300 ease-in-out">
          {mode === 'login' ? 'Entrar com Google' : 'Criar conta com Google'}
        </span>
      </button>

      <div className="mt-4 text-center text-sm text-gray-600">
        <div className="transition-all duration-300 ease-in-out">
          {mode === 'login' ? (
            <span>Não tem conta?{' '}
              <button 
                onClick={() => setMode('signup')} 
                className="text-orange-600 font-medium hover:underline transition-all duration-300 hover:text-orange-700 transform hover:scale-105 inline-block"
              >
                Criar conta
              </button>
            </span>
          ) : (
            <span>Já tem conta?{' '}
              <button 
                onClick={() => setMode('login')} 
                className="text-orange-600 font-medium hover:underline transition-all duration-300 hover:text-orange-700 transform hover:scale-105 inline-block"
              >
                Entrar
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); alert('Envie seu e-mail, implementamos depois.'); }}
          className="text-sm text-orange-600 hover:underline transition-all duration-200"
        >
          Esqueci minha senha
        </a>
      </div>
    </div>
  )
}
