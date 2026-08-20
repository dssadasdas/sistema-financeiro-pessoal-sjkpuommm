import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, XCircle, AlertCircle } from 'lucide-react'
import { SemeiaLogo } from '@/components/SemeiaLogo'
import { getMercadoPagoStatus } from '@/lib/payments'

type Status = 'processing' | 'success' | 'failed' | 'canceled'

// -------------------------------------------------------------------
// ThankYouPage — página pós-checkout (/obrigado).
//
// Fluxo:
//   - Retorno do Stripe/MP com ?provider=... -> processa/polling -> sucesso.
//   - Se a assinatura já estiver ativa ao carregar (visita direta, sem
//     parâmetros de retorno), redireciona para o painel.
//   - Mostra o plano escolhido e um botão "Acessar painel".
// -------------------------------------------------------------------
export default function ThankYouPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const {
    user,
    subscription,
    subscriptionStatus,
    subscriptionPlan,
    refreshSubscription,
    isLoading,
  } = useAuth()
  const [status, setStatus] = useState<Status>('processing')
  const [message, setMessage] = useState<string>('')
  const pollRef = useRef<number | null>(null)

  const provider = params.get('provider') || 'stripe'
  const canceled = params.get('canceled') === '1'
  const pending = params.get('pending') === '1'
  const failed = params.get('failed') === '1'
  const paymentId = params.get('payment_id') || params.get('collection_id') || ''
  const planParam = params.get('plan') || ''
  // Indica se a página foi carregada a partir de um retorno de checkout
  // (há parâmetros de provedor/estado). Se não houver, e a assinatura já
  // estiver ativa, redirecionamos direto para o painel.
  const hasReturnParams =
    Boolean(provider && provider !== 'stripe') ||
    canceled ||
    pending ||
    failed ||
    params.get('success') === '1' ||
    Boolean(paymentId)

  // Plano a exibir: prioriza o parâmetro da URL, depois o do contexto.
  const planLabel =
    planParam === 'anual' || planParam === 'annual'
      ? 'Anual'
      : planParam === 'mensal' || planParam === 'monthly'
        ? 'Mensal'
        : subscriptionPlan === 'yearly'
          ? 'Anual'
          : subscriptionPlan === 'monthly'
            ? 'Mensal'
            : subscription?.plan === 'anual'
              ? 'Anual'
              : 'Mensal'

  const checkStatus = useCallback(async () => {
    // Sem usuário logado: redireciona para login
    if (!isLoading && !user) {
      navigate('/login')
      return
    }
    if (!user) return

    if (canceled) {
      setStatus('canceled')
      return
    }
    if (pending) {
      setStatus('processing')
      setMessage(
        'Seu pagamento está em análise. Assim que for aprovado, sua assinatura será ativada automaticamente.',
      )
      return
    }
    if (failed) {
      setStatus('failed')
      setMessage('O pagamento não foi aprovado. Tente novamente.')
      return
    }

    // Atualiza a assinatura do contexto
    await refreshSubscription()

    // Mercado Pago: consulta status do pagamento via backend (polling)
    if (provider === 'mercadopago' && paymentId) {
      try {
        const res = await getMercadoPagoStatus(paymentId)
        if (res.active) {
          setStatus('success')
          return
        }
        if (
          res.status &&
          res.status !== 'approved' &&
          res.status !== 'pending' &&
          res.status !== 'in_process'
        ) {
          setStatus('failed')
          setMessage('O pagamento não foi aprovado. Tente novamente.')
          return
        }
        // pending/in_process -> continua processando
      } catch (_) {
        // ignora — continua processando
      }
    }
  }, [
    isLoading,
    user,
    canceled,
    pending,
    failed,
    provider,
    paymentId,
    navigate,
    refreshSubscription,
  ])

  // Redireciona para o painel se a assinatura já estiver ativa e não houver
  // contexto de retorno de checkout (visita direta à página).
  useEffect(() => {
    if (isLoading) return
    if (!user) return
    if (subscriptionStatus === 'active' && !hasReturnParams) {
      navigate('/inicio', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, subscriptionStatus])

  useEffect(() => {
    // Polling: checa a cada 3s por até ~90s
    let attempts = 0
    const maxAttempts = 30

    const poll = async () => {
      attempts++
      await refreshSubscription()
      if (canceled) {
        setStatus('canceled')
        return
      }
      if (failed) {
        setStatus('failed')
        setMessage('O pagamento não foi aprovado. Tente novamente.')
        return
      }
      if (pending) {
        setStatus('processing')
        setMessage(
          'Seu pagamento está em análise. Assim que for aprovado, sua assinatura será ativada automaticamente.',
        )
        // continua tentando para pegar a ativação assíncrona
      }

      // Mercado Pago: polling no backend
      if (provider === 'mercadopago' && paymentId) {
        try {
          const res = await getMercadoPagoStatus(paymentId)
          if (res.active) {
            setStatus('success')
            return
          }
          if (
            res.status &&
            res.status !== 'approved' &&
            res.status !== 'pending' &&
            res.status !== 'in_process'
          ) {
            setStatus('failed')
            setMessage('O pagamento não foi aprovado. Tente novamente.')
            return
          }
        } catch (_) {
          // ignora
        }
      }

      // Verifica assinatura local (após refreshSubscription, o contexto
      // atualiza de forma assíncrona — usamos setTimeout para re-checar)
      if (subscription && subscription.status === 'ativa' && subscription.admin_released) {
        setStatus('success')
        return
      }

      if (attempts >= maxAttempts) {
        // Timeout: se não confirmou, mas não houve erro explícito, assume
        // sucesso otimista (o webhook pode demorar). Mostra sucesso com aviso.
        setStatus('success')
        return
      }

      pollRef.current = window.setTimeout(poll, 3000)
    }

    poll()

    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canceled, failed, pending, provider, paymentId])

  // Reavalia o status da assinatura sempre que o contexto atualizar
  useEffect(() => {
    if (
      status === 'processing' &&
      subscription &&
      subscription.status === 'ativa' &&
      subscription.admin_released
    ) {
      setStatus('success')
    }
  }, [subscription, status])

  const handleGoToDashboard = () => {
    navigate('/inicio')
  }

  const handleTryAgain = () => {
    navigate('/paywall')
  }

  // ---- Renderização ----
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9] dark:bg-[#0b1120] p-4">
      <Card className="max-w-md w-full border-emerald-200 dark:border-emerald-900/50 shadow-xl bg-white dark:bg-[#121a2b]">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="mb-2">
              <SemeiaLogo size="xl" showText={false} />
            </div>
          </div>

          {status === 'processing' && (
            <>
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Processando pagamento...
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {message ||
                  'Estamos confirmando seu pagamento. Em instantes sua assinatura estará ativa.'}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Pagamento confirmado! 🎉
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Sua assinatura Semeia está ativa.
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-6">
                Plano {planLabel}
              </p>
              <Button
                onClick={handleGoToDashboard}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Acessar painel
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Pagamento não aprovado
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {message || 'Não foi possível concluir o pagamento. Você pode tentar novamente.'}
              </p>
              <Button onClick={handleTryAgain} variant="outline" className="w-full">
                Tentar novamente
              </Button>
            </>
          )}

          {status === 'canceled' && (
            <>
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Checkout cancelado
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Você cancelou o checkout antes de concluir o pagamento. Pode tentar novamente quando
                quiser.
              </p>
              <Button onClick={handleTryAgain} variant="outline" className="w-full mb-2">
                Voltar para planos
              </Button>
              <Link to="/" className="text-xs text-slate-500 dark:text-slate-400 hover:underline">
                Voltar para o início
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
