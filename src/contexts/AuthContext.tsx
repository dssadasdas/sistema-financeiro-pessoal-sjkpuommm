import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { User, Subscription } from '@/types/finance'
import type { SubscriptionPlan } from '@/types/finance'
import {
  startCheckout,
  cancelStripeSubscription,
  redirectToUrl,
  type PaymentProvider,
  type CheckoutPlan,
} from '@/lib/payments'
import { useRealtime } from '@/hooks/use-realtime'

// Status de assinatura derivado, consumido pelas páginas de paywall/obrigado.
type SubscriptionStatus = 'active' | 'inactive' | 'loading'

interface AuthContextType {
  user: User | null
  subscription: Subscription | null
  isLoading: boolean
  isSubscriptionActive: boolean
  // Campos derivados exigidos pela integração de pagamentos (frontend).
  subscriptionStatus: SubscriptionStatus
  subscriptionPlan: SubscriptionPlan
  subscriptionExpiry: Date | null
  hideValues: boolean
  setHideValues: (hide: boolean) => void
  toggleHideValues: () => void
  aiEnabled: boolean
  setAiEnabled: (enabled: boolean) => void
  login: (email: string, pass: string) => Promise<void>
  signup: (email: string, pass: string, name: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  refreshSubscription: () => Promise<void>
  activateSubscriptionDemo: (plan: 'mensal' | 'anual') => Promise<void>
  startSubscriptionCheckout: (provider: PaymentProvider, plan: CheckoutPlan) => Promise<void>
  cancelSubscription: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hideValues, setHideValuesState] = useState(() => {
    return localStorage.getItem('raiz_hide_values') === 'true'
  })
  const [aiEnabled, setAiEnabledState] = useState(() => {
    return localStorage.getItem('raiz_ai_enabled') !== 'false'
  })

  const setHideValues = (val: boolean) => {
    setHideValuesState(val)
    localStorage.setItem('raiz_hide_values', String(val))
  }

  const toggleHideValues = () => {
    setHideValues(!hideValues)
  }

  const setAiEnabled = (val: boolean) => {
    setAiEnabledState(val)
    localStorage.setItem('raiz_ai_enabled', String(val))
  }

  // Busca a assinatura mais recente do usuário na coleção `subscriptions`.
  // Se não existir, cria um registro inicial inativo (status=bloqueada) para
  // que o fluxo de paywall tenha um registro para atualizar no checkout.
  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      const records = await pb.collection('subscriptions').getList<Subscription>(1, 1, {
        filter: `user = "${userId}"`,
        sort: '-created',
      })
      if (records.items.length > 0) {
        setSubscription(records.items[0])
      } else {
        const created = await pb.collection('subscriptions').create<Subscription>({
          user: userId,
          plan: 'anual',
          price: 119.99,
          status: 'bloqueada',
          admin_released: false,
        })
        setSubscription(created)
      }
    } catch (err) {
      console.warn('Erro ao carregar assinatura:', err)
    }
  }, [])

  const refreshSubscription = useCallback(async () => {
    // `user` é capturado em closure, mas buscamos o id atual do authStore para
    // cobrir chamadas imediatas pós-login (quando o estado ainda não
    // re-renderizou).
    const id = user?.id || (pb.authStore.model as { id?: string } | null)?.id
    if (id) {
      await fetchSubscription(id)
    }
  }, [user?.id, fetchSubscription])

  // Atualização em tempo real: quando qualquer assinatura muda (ativação por
  // webhook, liberação manual, cancelamento), refletimos no contexto.
  useRealtime(
    'subscriptions',
    () => {
      const id = user?.id || (pb.authStore.model as { id?: string } | null)?.id
      if (id) fetchSubscription(id)
    },
    Boolean(user?.id),
  )

  const refreshUser = async () => {
    if (!user?.id) return
    try {
      const updated = await pb.collection('users').getOne<User>(user.id)
      setUser(updated)
      // Mantém o authStore em sincronia com o registro atualizado.
      // O PocketBase exige um RecordModel; usamos cast pois `updated` é o
      // registro retornado pela collection users.
      pb.authStore.save(pb.authStore.token, updated as unknown as RecordModel)
    } catch (err) {
      console.warn('Erro ao recarregar usuário:', err)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (pb.authStore.isValid && pb.authStore.model) {
          const authModel = pb.authStore.model as unknown as User
          setUser(authModel)
          await fetchSubscription(authModel.id)
        }
      } catch (err) {
        console.warn('Auth init failed:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // O realtime de subscriptions fica a cargo do hook `useRealtime` acima,
    // ativo sempre que há um usuário autenticado.
    const unsubscribe = pb.authStore.onChange(async (_, model) => {
      if (model) {
        const u = model as unknown as User
        setUser(u)
        await fetchSubscription(u.id)
      } else {
        setUser(null)
        setSubscription(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [fetchSubscription])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword<User>(email, pass)
    setUser(authData.record)
    await fetchSubscription(authData.record.id)
  }

  const signup = async (email: string, pass: string, name: string) => {
    const newRecord = await pb.collection('users').create<User>({
      email,
      password: pass,
      passwordConfirm: pass,
      name,
      emailVisibility: true,
    })

    // Loga automaticamente
    const authData = await pb.collection('users').authWithPassword<User>(email, pass)
    setUser(authData.record)

    // Cria registro inicial de assinatura inativa
    const sub = await pb.collection('subscriptions').create<Subscription>({
      user: newRecord.id,
      plan: 'anual',
      price: 119.99,
      status: 'bloqueada',
      admin_released: false,
    })
    setSubscription(sub)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setSubscription(null)
  }

  const activateSubscriptionDemo = async (plan: 'mensal' | 'anual') => {
    if (!user) return
    const price = plan === 'mensal' ? 11.99 : 119.99
    const now = new Date()
    const expires = new Date()
    if (plan === 'mensal') {
      expires.setMonth(expires.getMonth() + 1)
    } else {
      expires.setFullYear(expires.getFullYear() + 1)
    }

    if (subscription) {
      const updated = await pb.collection('subscriptions').update<Subscription>(subscription.id, {
        plan,
        price,
        status: 'ativa',
        started_at: now.toISOString(),
        renewed_at: now.toISOString(),
        expires_at: expires.toISOString(),
        admin_released: true,
      })
      setSubscription(updated)
    } else {
      const created = await pb.collection('subscriptions').create<Subscription>({
        user: user.id,
        plan,
        price,
        status: 'ativa',
        started_at: now.toISOString(),
        renewed_at: now.toISOString(),
        expires_at: expires.toISOString(),
        admin_released: true,
      })
      setSubscription(created)
    }
  }

  // Inicia checkout real no provedor escolhido (Stripe ou Mercado Pago).
  // Redireciona o navegador para a URL do checkout externo.
  const startSubscriptionCheckout = async (provider: PaymentProvider, plan: CheckoutPlan) => {
    if (!user) throw new Error('Usuário não autenticado.')
    const res = await startCheckout(provider, plan)
    if (!res || !res.url) {
      throw new Error('Não foi possível iniciar o checkout. Tente novamente.')
    }
    redirectToUrl(res.url)
  }

  // Cancela a assinatura ativa no provedor (atualmente Stripe). Para o
  // Mercado Pago (pagamento único) não há assinatura recorrente para
  // cancelar — o usuário simplesmente não renova.
  const cancelSubscription = async () => {
    if (!user || !subscription) return
    // Só cancelamos no provedor se houver provider_subscription_id e provider
    const provider = subscription.provider
    if (provider === 'stripe' && subscription.provider_subscription_id) {
      await cancelStripeSubscription()
    } else {
      // Sem provedor externo: marca localmente como cancelada no fim do ciclo
      const now = new Date()
      await pb.collection('subscriptions').update<Subscription>(subscription.id, {
        cancel_at_period_end: true,
        renewed_at: now.toISOString(),
      })
    }
    await refreshSubscription()
  }

  const isSubscriptionActive = Boolean(
    subscription && (subscription.status === 'ativa' || subscription.admin_released === true),
  )

  // Campos derivados (status/plan/expiry) consumidos pelas páginas de
  // paywall/obrigado. Usamos useMemo para estabilizar a referência e evitar
  // re-renderizações desnecessárias nos consumers.
  const { subscriptionStatus, subscriptionPlan, subscriptionExpiry } = useMemo(() => {
    if (isLoading || !user) {
      return {
        subscriptionStatus: 'loading' as const,
        subscriptionPlan: 'none' as SubscriptionPlan,
        subscriptionExpiry: null,
      }
    }
    const active = Boolean(
      subscription && (subscription.status === 'ativa' || subscription.admin_released === true),
    )
    // Considera expirada se expires_at estiver no passado.
    let expired = false
    if (subscription?.expires_at) {
      const exp = new Date(subscription.expires_at)
      if (!Number.isNaN(exp.getTime())) {
        expired = exp.getTime() < Date.now()
      }
    }
    const plan: SubscriptionPlan =
      subscription && !expired && active
        ? subscription.plan === 'anual'
          ? 'yearly'
          : 'monthly'
        : 'none'
    const status = active && !expired ? ('active' as const) : ('inactive' as const)
    const expiry =
      subscription?.expires_at && !Number.isNaN(new Date(subscription.expires_at).getTime())
        ? new Date(subscription.expires_at)
        : null
    return { subscriptionStatus: status, subscriptionPlan: plan, subscriptionExpiry: expiry }
  }, [subscription, isLoading, user])

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        isLoading,
        isSubscriptionActive,
        subscriptionStatus,
        subscriptionPlan,
        subscriptionExpiry,
        hideValues,
        setHideValues,
        toggleHideValues,
        aiEnabled,
        setAiEnabled,
        login,
        signup,
        logout,
        refreshUser,
        refreshSubscription,
        activateSubscriptionDemo,
        startSubscriptionCheckout,
        cancelSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
