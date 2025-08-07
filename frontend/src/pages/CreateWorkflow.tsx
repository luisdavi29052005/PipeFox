
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccounts, createWorkflow } from '../lib/api'

interface Account {
  id: string
  name: string
  status: string
}

interface WorkflowGroup {
  id: string
  url: string
  name: string
  prompt: string
  keywords: string[]
}

export default function CreateWorkflow() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    account_id: '',
    webhook_url: ''
  })
  const [groups, setGroups] = useState<WorkflowGroup[]>([
    { id: '1', url: '', name: '', prompt: '', keywords: [] }
  ])

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const data = await getAccounts()
      setAccounts(data.filter((acc: Account) => acc.status === 'ready'))
    } catch (err) {
      console.error('Error loading accounts:', err)
    }
  }

  const addGroup = () => {
    const newId = (Math.max(...groups.map(g => parseInt(g.id))) + 1).toString()
    setGroups([...groups, { id: newId, url: '', name: '', prompt: '', keywords: [] }])
  }

  const removeGroup = (id: string) => {
    if (groups.length > 1) {
      setGroups(groups.filter(g => g.id !== id))
    }
  }

  const updateGroup = (id: string, field: keyof WorkflowGroup, value: any) => {
    setGroups(groups.map(g => 
      g.id === id ? { ...g, [field]: value } : g
    ))
  }

  const handleKeywordsChange = (id: string, keywordsText: string) => {
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k)
    updateGroup(id, 'keywords', keywords)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.account_id) {
      alert('Nome e conta são obrigatórios')
      return
    }

    const validGroups = groups.filter(g => g.url.trim())
    if (!validGroups.length) {
      alert('Pelo menos um grupo é obrigatório')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        groups: validGroups.map(g => ({
          url: g.url,
          name: g.name || g.url,
          prompt: g.prompt,
          keywords: g.keywords
        }))
      }

      const result = await createWorkflow(payload)
      alert('Workflow criado com sucesso!')
      navigate(`/workflow/${result.workflow.id}`)
    } catch (err: any) {
      console.error('Error creating workflow:', err)
      alert(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Criar Novo Workflow</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-700"
            >
              ← Voltar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Workflow *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: Captura de Leads - Empreendedorismo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conta do Facebook *
                </label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL (opcional)
              </label>
              <input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://seu-webhook.com/endpoint"
              />
            </div>

            {/* Grupos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Grupos do Facebook</h3>
                <button
                  type="button"
                  onClick={addGroup}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  + Adicionar Grupo
                </button>
              </div>

              <div className="space-y-4">
                {groups.map((group, index) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Grupo #{index + 1}</h4>
                      {groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGroup(group.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          🗑️ Remover
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          URL do Grupo *
                        </label>
                        <input
                          type="url"
                          value={group.url}
                          onChange={(e) => updateGroup(group.id, 'url', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="https://www.facebook.com/groups/exemplo"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nome do Grupo (opcional)
                        </label>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Nome personalizado para o grupo"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Palavras-chave (separadas por vírgula)
                      </label>
                      <input
                        type="text"
                        value={group.keywords.join(', ')}
                        onChange={(e) => handleKeywordsChange(group.id, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="empreendedorismo, negócio, startup, renda extra"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prompt para Comentários
                      </label>
                      <textarea
                        value={group.prompt}
                        onChange={(e) => updateGroup(group.id, 'prompt', e.target.value)}
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Descreva como o bot deve responder aos posts relevantes..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Workflow'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
