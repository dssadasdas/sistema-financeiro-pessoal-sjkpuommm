import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Lock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  CreditCard,
  Landmark,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { PaymentProvider } from '@/lib/payments'

// Tipos locais — a UI usa "mensal"/"anual" (locale do app), mas a API espera
// "monthly"/"yearly".
type LocalPlan = 'mensal' | 'anual'

// -------------------------------------------------------------------
// PaywallPage — exibida quando o usuário não tem assinatura ativa.
// Mostra os planos Mensal (R$ 11,99/mês) e Anual (R$ 119,99/ano, com badge
// "Melhor escolha") e dois botões de pagamento: Stripe (cartão) e Mercado
// Pago (PIX/boleto). Cada botão chama a rota de checkout correspondente do
// backend e redireciona para a URL retornada.
// Se a assinatura já estiver ativa, redireciona para /inicio.
// -------------------------------------------------------------------
export default function PaywallPage() {
  const {
    user,
    subscription,
    isSubscriptionActive,
    subscriptionStatus,
    logout,
    startSubscriptionCheckout,
    refreshSubscription,
  } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Plano selecionado e provedor em uso no clique atual.
  const [selectedPlan, setSelectedPlan] = useState<LocalPlan>('anual')
  // Qual provedor está processando no momento ('stripe' | 'mercadopago' | null).
  const [processingProvider, setProcessingProvider] = useState<PaymentProvider | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Reflete parâmetros da URL (?plan=anual|mensal) e estados de retorno do
  // provedor (?canceled, ?pending, ?failed, ?success) -> /obrigado.
  useEffect(() => {
    const planParam = searchParams.get('plan')
    if (planParam === 'mensal' || planParam === 'anual') {
      setSelectedPlan(planParam)
    }
    const provParam = searchParams.get('provider') as PaymentProvider | null
    if (searchParams.get('canceled') === '1') {
      navigate('/obrigado?canceled=1&provider=' + (provParam || 'stripe'), { replace: true })
    } else if (searchParams.get('pending') === '1') {
      navigate(
        '/obrigado?pending=1&provider=' +
          (provParam || 'mercadopago') +
          (searchParams.get('payment_id') ? '&payment_id=' + searchParams.get('payment_id') : ''),
        { replace: true },
      )
    } else if (searchParams.get('failed') === '1') {
      navigate('/obrigado?failed=1&provider=' + (provParam || 'mercadopago'), { replace: true })
    } else if (searchParams.get('success') === '1') {
      navigate('/obrigado?provider=' + (provParam || 'stripe'), { replace: true })
    }
  }, [searchParams, navigate])

  // Redireciona para o painel assim que a assinatura fica ativa (ex: retorno
  // de checkout confirmado por webhook enquanto a aba estava aberta).
  useEffect(() => {
    if (subscriptionStatus === 'active') {
      navigate('/inicio', { replace: true })
    }
  }, [subscriptionStatus, navigate])

  const handleSubscribe = async (provider: PaymentProvider) => {
    setErrorMsg('')
    setProcessingProvider(provider)
    try {
      // Mapeia "mensal"/"anual" (locale do app) -> "monthly"/"annual" (API).
      // O backend (CheckoutPlan) usa "annual", não "yearly".
      const apiPlan = selectedPlan === 'anual' ? 'annual' : 'monthly'
      await startSubscriptionCheckout(provider, apiPlan)
      // O redirecionamento para o provedor acontece dentro de
      // startSubscriptionCheckout. Se não redirecionou (erro de config), o
      // throw abaixo captura.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível iniciar o checkout.'
      setErrorMsg(msg)
      toast({
        title: 'Erro ao iniciar pagamento',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setProcessingProvider(null)
    }
  }

  const loading = processingProvider !== null
  const planPriceLabel = selectedPlan === 'anual' ? 'R$ 119,99/ano' : 'R$ 11,99/mês'

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0B1220] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl py-8">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-black text-2xl">
              S
            </div>
            <span className="font-extrabold text-3xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Semia
            </span>
          </div>

          <Badge className="mb-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            {isSubscriptionActive ? 'Acesso Liberado' : 'Assinatura Necessária'}
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
            {isSubscriptionActive
              ? 'Seu acesso foi liberado com sucesso!'
              : 'Assine o Semia para liberar seu painel completo'}
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
          <>
            {/* Seletor de plano */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Mensal */}
              <Card
                className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-[#121A2B] shadow-lg transition-all cursor-pointer ${
                  selectedPlan === 'mensal'
                    ? 'border-2 border-slate-900 dark:border-slate-100'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
                onClick={() => setSelectedPlan('mensal')}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Plano Mensal
                    </h3>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'mensal'
                          ? 'border-slate-900 dark:border-slate-100'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedPlan === 'mensal' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
                      )}
                    </div>
                  </div>
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
              </Card>

              {/* Anual (Destaque) */}
              <Card
                className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative transition-all cursor-pointer ${
                  selectedPlan === 'anual'
                    ? 'border-2 border-emerald-500 bg-emerald-50/30 dark:bg-[#121A2B] shadow-xl'
                    : 'border-2 border-emerald-500/40 bg-emerald-50/30 dark:bg-[#121A2B] hover:border-emerald-500'
                }`}
                onClick={() => setSelectedPlan('anual')}
              >
                <div className="absolute -top-3.5 right-6">
                  <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3 shadow-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Melhor escolha
                  </Badge>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Plano Anual
                    </h3>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'anual'
                          ? 'border-emerald-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedPlan === 'anual' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Mais econômico e vantajoso</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      R$ 119,99
                    </span>
                    <span className="text-slate-500 text-sm">/ano</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 block mt-1">
                    Equivalente a apenas R$ 10,00/mês
                  </span>
                  <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />{' '}
                      <strong>Todos os recursos ilimitados</strong>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Acesso liberado no
                      celular e computador
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
              </Card>
            </div>

            {/* Resumo do plano selecionado + botões de pagamento */}
            <Card className="mt-6 max-w-3xl mx-auto rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Plano selecionado</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      Plano {selectedPlan === 'anual' ? 'Anual' : 'Mensal'} — {planPriceLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await refreshSubscription()
                    }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline self-start sm:self-auto"
                  >
                    Já paguei? Atualizar
                  </button>
                </div>

                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                  Escolha a forma de pagamento
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Stripe — Cartão de crédito */}
                  <Button
                    type="button"
                    onClick={() => handleSubscribe('stripe')}
                    disabled={loading}
                    className="h-14 bg-[#635BFF] hover:bg-[#5a52e8] text-white font-bold text-base shadow-lg shadow-[#635BFF]/20 flex items-center justify-center gap-2"
                  >
                    {processingProvider === 'stripe' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Pagar com Stripe
                      </>
                    )}
                  </Button>

                  {/* Mercado Pago — PIX / Boleto */}
                  <Button
                    type="button"
                    onClick={() => handleSubscribe('mercadopago')}
                    disabled={loading}
                    className="h-14 bg-[#00B1EA] hover:bg-[#009fd0] text-white font-bold text-base shadow-lg shadow-[#00B1EA]/20 flex items-center justify-center gap-2"
                  >
                    {processingProvider === 'mercadopago' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Landmark className="w-5 h-5" />
                        Pagar com Mercado Pago
                      </>
                    )}
                  </Button>
                </div>

                <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  Você será redirecionado para o checkout seguro do provedor escolhido. Após o
                  pagamento, seu acesso será liberado automaticamente.
                </p>

                {/* Forma de pagamento suportada (hint) */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" /> Stripe · cartão de crédito
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-3 h-3" /> Mercado Pago · PIX / boleto
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mensagem de erro */}
            {errorMsg && (
              <div className="mt-4 max-w-3xl mx-auto p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Não foi possível iniciar o pagamento</p>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-center flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Pagamento seguro e liberação imediata
          </span>
          <span>•</span>
          {user ? (
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="text-slate-500 hover:text-red-500 underline"
            >
              Sair da conta
            </button>
          ) : (
            <Link to="/login" className="text-slate-500 hover:text-emerald-600 underline">
              Já tenho conta
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
