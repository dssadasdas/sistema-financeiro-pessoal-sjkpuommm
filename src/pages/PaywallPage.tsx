import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Lock, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'

export default function PaywallPage() {
  const { user, subscription, activateSubscriptionDemo, isSubscriptionActive, logout } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<'mensal' | 'anual' | null>(null)
  const navigate = useNavigate()

  const handleSubscribe = async (plan: 'mensal' | 'anual') => {
    setLoadingPlan(plan)
    try {
      await activateSubscriptionDemo(plan)
      navigate('/inicio')
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0B1220] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-black text-2xl">
              R
            </div>
            <span className="font-extrabold text-3xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Raiz
            </span>
          </div>

          <Badge className="mb-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            {isSubscriptionActive ? 'Acesso Liberado' : 'Assinatura Necessária'}
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
            {isSubscriptionActive
              ? 'Seu acesso foi liberado com sucesso!'
              : 'Assine o Raiz para liberar seu painel completo'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            {isSubscriptionActive
              ? 'Sua assinatura está ativa. Clique abaixo para entrar no seu painel financeiro.'
              : 'O painel fica bloqueado até a confirmação da assinatura. Escolha o melhor plano para você.'}
          </p>
        </div>

        {isSubscriptionActive ? (
          <Card className="rounded-2xl border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 p-8 text-center max-w-md mx-auto shadow-xl">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Tudo pronto, {user?.name || 'usuário'}!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Plano: <strong className="capitalize">{subscription?.plan || 'Anual'}</strong>{' '}
              (Status: Ativo)
            </p>
            <Button
              onClick={() => navigate('/inicio')}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/30"
            >
              Entrar no Painel <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Mensal */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-[#121A2B] shadow-lg">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Plano Mensal</h3>
                <p className="text-xs text-slate-500 mt-1">Flexibilidade mês a mês</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    R$ 11,99
                  </span>
                  <span className="text-slate-500 text-sm">/mês</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Todas as contas e bancos
                    ilimitados
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cartões de crédito e
                    importação de faturas
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Metas, Orçamento e
                    Previsão
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> IA Financeira integrada
                  </li>
                </ul>
              </div>
              <Button
                disabled={loadingPlan !== null}
                onClick={() => handleSubscribe('mensal')}
                className="w-full mt-8 h-12 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium"
              >
                {loadingPlan === 'mensal' ? 'Ativando...' : 'Assinar Mensal (R$ 11,99)'}
              </Button>
            </Card>

            {/* Anual (Destaque) */}
            <Card className="rounded-2xl border-2 border-emerald-500 p-6 sm:p-8 flex flex-col justify-between relative bg-emerald-50/30 dark:bg-[#121A2B] shadow-xl">
              <div className="absolute -top-3.5 right-6">
                <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3 shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Economize 2 meses
                </Badge>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Plano Anual</h3>
                <p className="text-xs text-slate-500 mt-1">Mais econômico e vantajoso</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    R$ 119,99
                  </span>
                  <span className="text-slate-500 text-sm">/ano</span>
                </div>
                <span className="text-xs font-semibold text-emerald-600 block mt-1">
                  Apenas R$ 9,99/mês (12 meses com valor de 10)
                </span>
                <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />{' '}
                    <strong>Todos os recursos ilimitados</strong>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Acesso liberado no celular
                    e computador
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 2 meses totalmente
                    gratuitos
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Suporte prioritário
                    dedicado
                  </li>
                </ul>
              </div>
              <Button
                disabled={loadingPlan !== null}
                onClick={() => handleSubscribe('anual')}
                className="w-full mt-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/30"
              >
                {loadingPlan === 'anual' ? 'Ativando...' : 'Assinar Anual (R$ 119,99)'}
              </Button>
            </Card>
          </div>
        )}

        <div className="mt-8 text-center flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Pagamento seguro e liberação imediata
          </span>
          <span>•</span>
          <button
            onClick={() => {
              logout()
              navigate('/entrar')
            }}
            className="text-slate-500 hover:text-red-500 underline"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}
