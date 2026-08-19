import pb from '@/lib/pocketbase/client'

export type PaymentProvider = 'stripe' | 'mercadopago'
export type CheckoutPlan = 'monthly' | 'annual'

export interface CheckoutResponse {
  url: string
  session_id?: string
  preference_id?: string
}

export interface CheckoutError {
  error: string
}

/**
 * Inicia o checkout do Stripe — redireciona o navegador para a URL do
 * Stripe Checkout. Retorna a URL (ou erro).
 */
export async function startStripeCheckout(plan: CheckoutPlan): Promise<CheckoutResponse> {
  const res = await pb.send('/backend/v1/payments/stripe/checkout', {
    method: 'POST',
    body: { plan },
  })
  return res as CheckoutResponse
}

/**
 * Inicia o checkout do Mercado Pago (Checkout Pro) — redireciona o navegador
 * para a URL (init_point) do MP.
 */
export async function startMercadoPagoCheckout(plan: CheckoutPlan): Promise<CheckoutResponse> {
  const res = await pb.send('/backend/v1/payments/mercadopago/checkout', {
    method: 'POST',
    body: { plan },
  })
  return res as CheckoutResponse
}

/**
 * Atalho unificado: escolhe o provedor e retorna a URL de checkout.
 */
export async function startCheckout(
  provider: PaymentProvider,
  plan: CheckoutPlan,
): Promise<CheckoutResponse> {
  if (provider === 'mercadopago') return startMercadoPagoCheckout(plan)
  return startStripeCheckout(plan)
}

/**
 * Cancela a assinatura no Stripe (no fim do ciclo atual).
 */
export async function cancelStripeSubscription(): Promise<{ canceled: boolean }> {
  const res = await pb.send('/backend/v1/payments/stripe/cancel', {
    method: 'POST',
    body: {},
  })
  return res
}

/**
 * Abre o Customer Portal do Stripe (gestão de cartão/fatura).
 */
export async function openStripePortal(): Promise<{ url: string }> {
  const res = await pb.send('/backend/v1/payments/stripe/portal', {
    method: 'POST',
    body: {},
  })
  return res
}

/**
 * Consulta o status de um pagamento no Mercado Pago (para polling pós-retorno).
 * Sem payment_id, retorna o status da assinatura local do usuário.
 */
export async function getMercadoPagoStatus(paymentId?: string): Promise<{
  status: string
  active?: boolean
  plan?: string
}> {
  const query: Record<string, string> = {}
  if (paymentId) query.payment_id = paymentId
  const res = await pb.send('/backend/v1/payments/mercadopago/status', {
    method: 'GET',
    query,
  })
  return res
}

/**
 * Faz redirect absoluto (para sair do app em direção ao provedor).
 */
export function redirectToUrl(url: string) {
  if (typeof window !== 'undefined' && url) {
    window.location.href = url
  }
}
