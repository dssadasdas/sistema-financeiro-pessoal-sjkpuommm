import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { User, Subscription } from '@/types/finance'

interface AuthContextType {
  user: User | null
  subscription: Subscription | null
  isLoading: boolean
  isSubscriptionActive: boolean
  hideValues: boolean
  setHideValues: (hide: boolean) => void
  toggleHideValues: () => void
  aiEnabled: boolean
  setAiEnabled: (enabled: boolean) => void
  login: (email: string, pass: string) => Promise<void>
  signup: (email: string, pass: string, name: string) => Promise<void>
  logout: () => void
  refreshSubscription: () => Promise<void>
  activateSubscriptionDemo: (plan: 'mensal' | 'anual') => Promise<void>
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

  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      const records = await pb.collection('subscriptions').getList<Subscription>(1, 1, {
        filter: `user = "${userId}"`,
        sort: '-created',
      })
      if (records.items.length > 0) {
        setSubscription(records.items[0])
      } else {
        // Cria subscription padrão pendente
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

  const refreshSubscription = async () => {
    if (user?.id) {
      await fetchSubscription(user.id)
    }
  }

  useEffect(() => {
    let unsubSub: (() => Promise<void>) | undefined

    const initAuth = async () => {
      try {
        if (pb.authStore.isValid && pb.authStore.model) {
          const authModel = pb.authStore.model as unknown as User
          setUser(authModel)
          await fetchSubscription(authModel.id)

          // Realtime na collection subscriptions para refletir liberação manual
          try {
            const fn = await pb.collection('subscriptions').subscribe('*', () => {
              if (authModel?.id) fetchSubscription(authModel.id)
            })
            unsubSub = fn
          } catch (e) {
            console.warn('Realtime subscriptions failed:', e)
          }
        }
      } catch (err) {
        console.warn('Auth init failed:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

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
      if (unsubSub) unsubSub().catch(() => {})
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

  const isSubscriptionActive = Boolean(
    subscription && (subscription.status === 'ativa' || subscription.admin_released === true),
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        isLoading,
        isSubscriptionActive,
        hideValues,
        setHideValues,
        toggleHideValues,
        aiEnabled,
        setAiEnabled,
        login,
        signup,
        logout,
        refreshSubscription,
        activateSubscriptionDemo,
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
