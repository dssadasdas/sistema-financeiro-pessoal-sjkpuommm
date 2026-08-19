import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2,
  Lock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  CreditCard,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { PaymentProvider } from '@/lib/payments'

export default function PaywallPage() {
  const {
    user,
    subscription,
    isSubscriptionActive,
    logout,
    startSubscriptionCheckout,
    refreshSubscription,
  } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Plano e provedor selecionados
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('anual')
  const [provider, setProvider] = useState<PaymentProvider>('stripe')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Reflete parâmetros da URL (?plan=anual|mensal, ?provider=stripe|mercadopago)
  // e estados de retorno (?canceled, ?pending, ?failed) que redirecionam para /obrigado
  useEffect(() => {
    const planParam = searchParams.get('plan')
    if (planParam === 'mensal' || planParam === 'anual') {
      setSelectedPlan(planParam)
    }
    const provParam = searchParams.get('provider')
    if (provParam === 'mercadopago' || provParam === 'stripe') {
      setProvider(provParam)
    }
    // Estados de retorno do provedor -> manda para a página de processamento
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

  const handleSubscribe = async () => {
    setErrorMsg('')
    setLoading(true)
    try {
      // Mapeia "mensal"/"anual" (locale do app) -> "monthly"/"annual" (API)
      const apiPlan = selectedPlan === 'anual' ? 'annual' : 'monthly'
      await startSubscriptionCheckout(provider, apiPlan)
      // O redirecionamento para o provedor acontece dentro de startSubscriptionCheckout.
      // Se não redirecionou (erro de config), o throw abaixo captura.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível iniciar o checkout.'
      setErrorMsg(msg)
      toast({
        title: 'Erro ao iniciar pagamento',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0B1220] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl py-8">
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
                    <Sparkles className="w-3 h-3" /> Economize 2 meses
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

            {/* Seletor de provedor de pagamento */}
            <Card className="mt-6 max-w-3xl mx-auto rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                  Forma de pagamento
                </p>
                <RadioGroup
                  value={provider}
                  onValueChange={(v) => setProvider(v as PaymentProvider)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="prov-stripe"
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      provider === 'stripe'
                        ? 'border-[#635BFF] bg-[#635BFF]/5 dark:bg-[#635BFF]/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem id="prov-stripe" value="stripe" />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Cartão de crédito
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        Stripe · parcelamento via Stripe
                      </span>
                    </div>
                    <CreditCard className="w-5 h-5 text-[#635BFF]" />
                  </Label>
                  <Label
                    htmlFor="prov-mercadopago"
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      provider === 'mercadopago'
                        ? 'border-[#00B1EA] bg-[#00B1EA]/5 dark:bg-[#00B1EA]/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem id="prov-mercadopago" value="mercadopago" />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Pix / Boleto / Cartão
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        Mercado Pago · checkout Pro
                      </span>
                    </div>
                    <span className="text-[#00B1EA] font-bold text-sm">MP</span>
                  </Label>
                </RadioGroup>
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

            {/* Botão de checkout real */}
            <div className="mt-6 max-w-3xl mx-auto">
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Assinar {selectedPlan === 'anual' ? 'Anual' : 'Mensal'} —{' '}
                    {selectedPlan === 'anual' ? 'R$ 119,99/ano' : 'R$ 11,99/mês'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                Você será redirecionado para o checkout seguro do{' '}
                {provider === 'mercadopago' ? 'Mercado Pago' : 'Stripe'}. Após o pagamento, seu
                acesso será liberado automaticamente.
              </p>
            </div>
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
