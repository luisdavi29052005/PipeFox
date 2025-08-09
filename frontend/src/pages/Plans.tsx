
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Zap, Users, Calendar, CreditCard } from 'lucide-react'
import { getPlans, getSubscription, checkout } from '../lib/api'
import Layout from '../components/layout/Layout'
import Sidebar from '../components/dashboard/Sidebar'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  limits: {
    workflows: number
    fb_accounts: number
    posts_per_day: number
    credits_per_month: number
  }
}

interface Subscription {
  id: string
  status: string
  plan: Plan
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [plansRes, subscriptionRes] = await Promise.all([
        getPlans(),
        getSubscription()
      ])
      
      setPlans(plansRes.data)
      setCurrentSubscription(subscriptionRes.data.subscription)
    } catch (error) {
      console.error('Error loading plans:', error)
      setError('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    try {
      setProcessingPlan(planId)
      setError(null)
      
      await checkout(planId, 'credit_card')
      setSuccess('Assinatura realizada com sucesso!')
      await loadData()
    } catch (error) {
      console.error('Error subscribing to plan:', error)
      setError(error instanceof Error ? error.message : 'Erro ao processar assinatura')
    } finally {
      setProcessingPlan(null)
    }
  }

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return <Zap className="w-8 h-8 text-blue-600" />
      case 'pro':
        return <Crown className="w-8 h-8 text-purple-600" />
      case 'enterprise':
        return <Users className="w-8 h-8 text-orange-600" />
      default:
        return <Zap className="w-8 h-8 text-gray-600" />
    }
  }

  const formatLimit = (value: number) => {
    return value === -1 ? 'Ilimitado' : value.toLocaleString()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          </main>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Planos e Assinaturas
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Escolha o plano ideal para suas necessidades
              </p>

              {error && (
                <motion.div 
                  className="mb-6"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                </motion.div>
              )}

              {success && (
                <motion.div 
                  className="mb-6"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant="success" onClose={() => setSuccess(null)}>
                    {success}
                  </Alert>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan, index) => {
                  const isCurrentPlan = currentSubscription?.plan.id === plan.id
                  const isPopular = plan.name.toLowerCase() === 'pro'
                  
                  return (
                    <motion.div
                      key={plan.id}
                      className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 ${
                        isPopular 
                          ? 'border-purple-500 shadow-xl' 
                          : 'border-gray-200 dark:border-gray-700'
                      } p-8 shadow-lg ${isCurrentPlan ? 'ring-2 ring-orange-500' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                            Mais Popular
                          </span>
                        </div>
                      )}

                      {isCurrentPlan && (
                        <div className="absolute -top-4 right-4">
                          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Plano Atual
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                          {getPlanIcon(plan.name)}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {plan.name}
                        </h3>
                        <div className="mb-4">
                          <span className="text-4xl font-bold text-gray-900 dark:text-white">
                            R$ {plan.price.toFixed(2)}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            /mês
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex items-center">
                          <Check className="w-5 h-5 text-green-500 mr-3" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatLimit(plan.limits.workflows)} workflows
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Check className="w-5 h-5 text-green-500 mr-3" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatLimit(plan.limits.fb_accounts)} contas Facebook
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Check className="w-5 h-5 text-green-500 mr-3" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatLimit(plan.limits.posts_per_day)} posts/dia
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Check className="w-5 h-5 text-green-500 mr-3" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatLimit(plan.limits.credits_per_month)} créditos/mês
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isCurrentPlan || processingPlan === plan.id}
                        className={`w-full ${
                          isPopular 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                      >
                        {processingPlan === plan.id ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processando...
                          </div>
                        ) : isCurrentPlan ? (
                          'Plano Atual'
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Assinar
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </Layout>
  )
}
