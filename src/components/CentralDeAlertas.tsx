import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Flame,
  Check,
  ChevronRight,
  Wallet,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export type AlertLevel = 'info' | 'warning' | 'high' | 'critical'

export interface SmartAlert {
  id: string
  level: AlertLevel
  title: string
  description: string
  category: 'contas' | 'saldo' | 'cartoes'
  targetPath: string
  date?: string
  value?: number
  badgeText?: string
}

export function useSmartAlerts(): SmartAlert[] {
  const { accounts, transactions, invoices } = useFinance()

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const alerts = useMemo(() => {
    const list: SmartAlert[] = []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threeDaysAhead = new Date(today)
    threeDaysAhead.setDate(threeDaysAhead.getDate() + 3)
    const threeDaysStr = threeDaysAhead.toISOString().slice(0, 10)

    // 1. Transações pendentes e vencidas / próximas (despesas e receitas)
    transactions.forEach((tx) => {
      if (tx.status === 'realizado') return
      const txDate = (tx.date || '').slice(0, 10)
      if (!txDate) return
      const isDespesa = tx.type === 'despesa'

      if (txDate < todayStr) {
        list.push({
          id: `tx-overdue-${tx.id}`,
          level: 'high',
          category: 'contas',
          title: `Lançamento ${isDespesa ? 'de Despesa' : 'de Receita'} Pendente`,
          description: `"${tx.description}" previsto para ${formatDate(txDate)} (${formatCurrency(tx.value)}) não foi concluído.`,
          targetPath: '/transacoes',
          date: txDate,
          value: tx.value,
          badgeText: 'Atrasado',
        })
      } else if (txDate <= threeDaysStr && txDate >= todayStr) {
        list.push({
          id: `tx-upcoming-${tx.id}`,
          level: 'info',
          category: 'contas',
          title: `Lançamento Previsto (${isDespesa ? 'Despesa' : 'Receita'})`,
          description: `"${tx.description}" agendado para ${formatDate(txDate)} (${formatCurrency(tx.value)}).`,
          targetPath: '/transacoes',
          date: txDate,
          value: tx.value,
          badgeText: 'Previsto',
        })
      }
    })

    // 2. Faturas de cartão abertas e com vencimento próximo ou vencido
    invoices.forEach((inv) => {
      if (inv.status === 'paga') return
      const due = (inv.due_date || '').slice(0, 10)
      if (!due || Number(inv.total || 0) <= 0) return

      if (due < todayStr) {
        list.push({
          id: `inv-overdue-${inv.id}`,
          level: 'critical',
          category: 'cartoes',
          title: `Fatura de Cartão Vencida`,
          description: `Fatura de ${formatCurrency(inv.total)} venceu em ${formatDate(due)}.`,
          targetPath: `/cartoes/${inv.credit_card}`,
          date: due,
          value: inv.total,
          badgeText: 'Fatura Vencida',
        })
      } else if (due <= threeDaysStr) {
        list.push({
          id: `inv-upcoming-${inv.id}`,
          level: 'high',
          category: 'cartoes',
          title: `Fatura de Cartão Vencendo`,
          description: `Fatura de ${formatCurrency(inv.total)} vence em ${formatDate(due)}.`,
          targetPath: `/cartoes/${inv.credit_card}`,
          date: due,
          value: inv.total,
          badgeText: 'Fatura Próxima',
        })
      }
    })

    // 3. Saldo baixo ou negativo nas contas bancárias
    accounts.forEach((acc) => {
      const bal = Number(acc.current_balance || 0)
      if (bal < 0) {
        list.push({
          id: `acc-negative-${acc.id}`,
          level: 'critical',
          category: 'saldo',
          title: `Saldo Negativo: ${acc.name}`,
          description: `A conta está com saldo negativo de ${formatCurrency(bal)}. Evite juros e encargos.`,
          targetPath: '/contas',
          value: bal,
          badgeText: 'Negativo',
        })
      } else if (bal <= 100) {
        list.push({
          id: `acc-low-${acc.id}`,
          level: 'warning',
          category: 'saldo',
          title: `Saldo Baixo: ${acc.name}`,
          description: `Saldo atual de ${formatCurrency(bal)} está abaixo do limite de segurança (R$ 100,00).`,
          targetPath: '/contas',
          value: bal,
          badgeText: 'Saldo Baixo',
        })
      }
    })

    // Ordenação por severidade: critical > high > warning > info
    const weight: Record<AlertLevel, number> = {
      critical: 4,
      high: 3,
      warning: 2,
      info: 1,
    }

    return list.sort((a, b) => weight[b.level] - weight[a.level])
  }, [accounts, transactions, invoices, todayStr])

  return alerts
}

export function AlertBadgeIcon({ level }: { level: AlertLevel }) {
  switch (level) {
    case 'critical':
      return <Flame className="w-4 h-4 text-red-600 dark:text-red-400" />
    case 'high':
      return <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
    case 'info':
    default:
      return <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />
  }
}

export function getLevelConfig(level: AlertLevel) {
  switch (level) {
    case 'critical':
      return {
        label: 'Crítico',
        border: 'border-red-500/40 bg-red-50/60 dark:bg-red-950/20 text-red-700 dark:text-red-300',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300',
        dot: 'bg-red-600',
      }
    case 'high':
      return {
        label: 'Importante',
        border:
          'border-orange-500/40 bg-orange-50/60 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300',
        badge:
          'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-300',
        dot: 'bg-orange-600',
      }
    case 'warning':
      return {
        label: 'Atenção',
        border:
          'border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
        badge:
          'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300',
        dot: 'bg-amber-500',
      }
    case 'info':
    default:
      return {
        label: 'Informação',
        border:
          'border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300',
        dot: 'bg-blue-500',
      }
  }
}

interface AlertCenterProps {
  variant?: 'header-button' | 'modal'
}

export default function CentralDeAlertas({ variant = 'header-button' }: AlertCenterProps) {
  const alerts = useSmartAlerts()
  const navigate = useNavigate()
  const { hideValues } = useAuth()
  const [filterLevel, setFilterLevel] = useState<'todos' | AlertLevel>('todos')
  const [dialogOpen, setDialogOpen] = useState(false)

  const criticalCount = alerts.filter((a) => a.level === 'critical').length
  const highCount = alerts.filter((a) => a.level === 'high').length
  const totalAlerts = alerts.length

  const filteredAlerts = useMemo(() => {
    if (filterLevel === 'todos') return alerts
    return alerts.filter((a) => a.level === filterLevel)
  }, [alerts, filterLevel])

  const handleAlertClick = (alert: SmartAlert) => {
    setDialogOpen(false)
    navigate(alert.targetPath)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          title="Central de Alertas"
          aria-label="Abrir Central de Alertas"
        >
          <Bell className="w-[18px] h-[18px]" />
          {totalAlerts > 0 && (
            <span
              className={`absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full ${
                criticalCount > 0
                  ? 'bg-red-600 animate-pulse'
                  : highCount > 0
                    ? 'bg-orange-500'
                    : 'bg-emerald-500'
              }`}
            />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-2xl bg-white dark:bg-[#121A2B] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header da Central de Alertas */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                Central de Alertas
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitor inteligente em tempo real
              </p>
            </div>
          </div>
          {totalAlerts > 0 && (
            <Badge
              variant="outline"
              className={`text-xs font-bold ${
                criticalCount > 0
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
            >
              {totalAlerts} {totalAlerts === 1 ? 'notificação' : 'notificações'}
            </Badge>
          )}
        </div>

        {/* Resumo de níveis */}
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterLevel('todos')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              filterLevel === 'todos'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Todos ({alerts.length})
          </button>
          <button
            onClick={() => setFilterLevel('critical')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              filterLevel === 'critical'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Crítico ({alerts.filter((a) => a.level === 'critical').length})
          </button>
          <button
            onClick={() => setFilterLevel('high')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              filterLevel === 'high'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Importante ({alerts.filter((a) => a.level === 'high').length})
          </button>
          <button
            onClick={() => setFilterLevel('warning')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              filterLevel === 'warning'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Atenção ({alerts.filter((a) => a.level === 'warning').length})
          </button>
          <button
            onClick={() => setFilterLevel('info')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              filterLevel === 'info'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Info ({alerts.filter((a) => a.level === 'info').length})
          </button>
        </div>

        {/* Lista de alertas com scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[55vh]">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Tudo em ordem por aqui!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {filterLevel === 'todos'
                  ? 'Nenhum alerta pendente. Suas contas, limites e orçamentos estão sob controle.'
                  : `Nenhum alerta de nível "${filterLevel}" no momento.`}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const cfg = getLevelConfig(alert.level)
              return (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className={`p-3.5 rounded-xl border ${cfg.border} hover:shadow-md transition-all cursor-pointer flex items-start gap-3 group`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <AlertBadgeIcon level={alert.level} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                        {alert.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 px-1.5 font-bold ${cfg.badge}`}
                      >
                        {cfg.label}
                      </Badge>
                      {alert.badgeText && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                          {alert.badgeText}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé explicativo */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Clique em um alerta para acessar o item</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setDialogOpen(false)
              navigate('/transacoes')
            }}
            className="text-[11px] text-emerald-600 p-0 h-auto"
          >
            Ver Transações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
