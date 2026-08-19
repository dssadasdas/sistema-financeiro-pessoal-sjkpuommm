import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, BANK_CONFIGS } from '@/lib/constants'
import { useRealtime } from '@/hooks/use-realtime'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'
import {
  TrendingUp,
  Clock,
  CreditCard as CreditCardIcon,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronRight,
  PieChart as PieChartIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import TransactionModal from '@/components/modals/TransactionModal'

const MONTHS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export default function DashboardPage() {
  const {
    totalCurrentBalance,
    totalProjectedBalance,
    monthIncomeReceived,
    monthExpensePaid,
    monthIncomePending,
    monthExpensePending,
    monthOpenInvoicesTotal,
    totalInvested,
    totalInvestmentsResult,
    transactions,
    goals,
    budgets,
    bills,
    creditCards,
    accounts,
    investments,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()

  const { hideValues } = useAuth()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'receita' | 'despesa' | 'ajuste'>('receita')

  // Realtime: refresh data on any change to key collections
  useRealtime('transactions', () => refreshAll())
  useRealtime('accounts', () => refreshAll())
  useRealtime('credit_cards', () => refreshAll())
  useRealtime('invoices', () => refreshAll())
  useRealtime('goals', () => refreshAll())
  useRealtime('goal_contributions', () => refreshAll())
  useRealtime('investments', () => refreshAll())
  useRealtime('bills', () => refreshAll())
  useRealtime('recurring_bills', () => refreshAll())
  useRealtime('budgets', () => refreshAll())

  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  const savingsAmount = monthIncomeReceived - monthExpensePaid

  // Histórico real dos últimos 6 meses (saldo = receitas - despesas realizadas)
  const monthlyHistory = useMemo(() => {
    const now = new Date()
    const months: { label: string; balance: number; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthTxns = transactions.filter((t) => (t.date || '').startsWith(prefix))
      const income = monthTxns
        .filter((t) => t.type === 'receita' && t.status === 'realizado')
        .reduce((acc, t) => acc + Number(t.value || 0), 0)
      const expense = monthTxns
        .filter((t) => t.type === 'despesa' && t.status === 'realizado')
        .reduce((acc, t) => acc + Number(t.value || 0), 0)
      months.push({
        label: MONTHS_PT[d.getMonth()],
        balance: income - expense,
        income,
        expense,
      })
    }
    return months
  }, [transactions])

  const maxAbsBalance = Math.max(1, ...monthlyHistory.map((m) => Math.abs(m.balance)))

  // 5 Próximos compromissos pendentes
  const pendingBillsAndTxns = useMemo(() => {
    const items = [
      ...bills
        .filter((b) => b.status === 'não_pago')
        .map((b) => ({
          id: b.id,
          title: b.description,
          value: b.value,
          date: b.due_date,
          type: 'despesa' as const,
          category: b.category || 'Boleto',
        })),
      ...transactions
        .filter((t) => t.status === 'pendente')
        .map((t) => ({
          id: t.id,
          title: t.description,
          value: t.value,
          date: t.date,
          type: t.type,
          category: t.category || 'Lançamento',
        })),
    ]
    return items
      .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())
      .slice(0, 5)
  }, [bills, transactions])

  const topGoals = goals.slice(0, 3)
  const currentMonthPrefix = new Date().toISOString().slice(0, 7)
  const monthBudgets = budgets.filter((b) => b.month === currentMonthPrefix).slice(0, 3)

  // Contas a pagar / a receber do mês corrente (não pagas) vindas da coleção bills
  const monthBillsToPay = bills
    .filter(
      (b) =>
        (b.type || 'pagar') === 'pagar' &&
        b.status !== 'pago' &&
        (b.due_date || '').slice(0, 7) === currentMonthPrefix,
    )
    .reduce((acc, b) => acc + Number(b.value || 0), 0)
  const monthBillsToReceive = bills
    .filter(
      (b) =>
        b.type === 'receber' &&
        b.status !== 'pago' &&
        (b.due_date || '').slice(0, 7) === currentMonthPrefix,
    )
    .reduce((acc, b) => acc + Number(b.value || 0), 0)

  const openNewTransaction = (type: 'receita' | 'despesa') => {
    setModalType(type)
    setModalOpen(true)
  }

  if (isLoading) {
    return <LoadingState message="Carregando seu resumo financeiro..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar seus dados financeiros do servidor. Verifique sua conexão e tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo Rápido Line */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 capitalize">
              Resumo rápido de {currentMonthName}
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Você recebeu{' '}
              <span className="text-emerald-600 font-bold">
                {formatCurrency(monthIncomeReceived, hideValues)}
              </span>{' '}
              e gastou{' '}
              <span className="text-orange-600 font-bold">
                {formatCurrency(monthExpensePaid, hideValues)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`font-semibold text-xs px-3 py-1 ${
              savingsAmount >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-300'
            }`}
          >
            {savingsAmount >= 0
              ? `Economia: +${formatCurrency(savingsAmount, hideValues)}`
              : `Déficit: ${formatCurrency(savingsAmount, hideValues)}`}
          </Badge>
          <Button
            size="sm"
            onClick={() => openNewTransaction('receita')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl h-8 gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Nova
          </Button>
        </div>
      </div>

      {/* Hero Saldo + Investimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Hero Saldo */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-[#121A2B] dark:to-[#0d1422] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Saldo Financeiro Total
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 font-bold text-xs">
                Contas Bancárias
              </Badge>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-2">
              {formatCurrency(totalCurrentBalance, hideValues)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Saldo previsto com pendentes:{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {formatCurrency(totalProjectedBalance, hideValues)}
              </span>{' '}
              • {accounts.length} conta(s) cadastrada(s)
            </p>
          </div>

          {/* Barras reais dos últimos 6 meses */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Saldo líquido por mês (últimos 6 meses)</span>
            </div>
            <div className="grid grid-cols-6 gap-2 items-end h-20">
              {monthlyHistory.map((m, idx) => {
                const heightPct = Math.round((Math.abs(m.balance) / maxAbsBalance) * 100)
                const positive = m.balance >= 0
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-1 h-full justify-end"
                    title={`${m.label}: ${formatCurrency(m.balance, hideValues)}`}
                  >
                    <div
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        idx === 5
                          ? positive
                            ? 'bg-emerald-600 shadow-sm'
                            : 'bg-red-500 shadow-sm'
                          : positive
                            ? 'bg-emerald-200 dark:bg-emerald-900/60'
                            : 'bg-red-200 dark:bg-red-900/60'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400">{m.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Card Investimentos */}
        <Card
          onClick={() => navigate('/investimentos')}
          className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all cursor-pointer bg-white dark:bg-[#121A2B]"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Investimentos
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
              {formatCurrency(totalInvested + totalInvestmentsResult, hideValues)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                className={`text-xs font-bold ${
                  totalInvestmentsResult >= 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                }`}
              >
                {totalInvestmentsResult >= 0 ? '+' : ''}
                {formatCurrency(totalInvestmentsResult, hideValues)}
              </Badge>
              <span className="text-xs text-slate-500">{investments.length} ativo(s)</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>Cripto, CDI & FIIs</span>
            <span className="text-emerald-600 font-semibold flex items-center">
              Ver carteira <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </Card>
      </div>

      {/* Grid de 4 Cards: Receitas, Despesas, A Receber, A Pagar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Receitas Recebidas */}
        <Card
          onClick={() => navigate('/transacoes')}
          className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B]"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="truncate">Receitas Recebidas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 tabular-nums">
            +{formatCurrency(monthIncomeReceived, hideValues)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Realizadas no mês</span>
        </Card>

        {/* Despesas Pagas */}
        <Card
          onClick={() => navigate('/transacoes')}
          className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B]"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="truncate">Despesas Pagas</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center flex-shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-orange-600 tabular-nums">
            −{formatCurrency(monthExpensePaid, hideValues)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Pagas no mês</span>
        </Card>

        {/* A Receber */}
        <Card
          onClick={() => navigate('/transacoes')}
          className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B]"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="truncate">A Receber</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {formatCurrency(monthIncomePending + monthBillsToReceive, hideValues)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Receitas previstas</span>
        </Card>

        {/* A Pagar */}
        <Card
          onClick={() => navigate('/contas-a-pagar')}
          className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B]"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="truncate">A Pagar</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-red-600 tabular-nums">
            {formatCurrency(
              monthBillsToPay + monthExpensePending + monthOpenInvoicesTotal,
              hideValues,
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Compromissos em aberto</span>
        </Card>
      </div>

      {/* Seção Faturas de Cartão + Metas + Compromissos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cartões & Faturas */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 shadow-sm bg-white dark:bg-[#121A2B]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCardIcon className="w-4 h-4 text-purple-600" />
              Faturas dos Cartões
            </h3>
            <Link to="/cartoes" className="text-xs text-emerald-600 font-semibold hover:underline">
              Ver todos
            </Link>
          </div>

          {creditCards.length === 0 ? (
            <EmptyState
              icon={CreditCardIcon}
              title="Nenhum cartão cadastrado"
              description="Cadastre seu primeiro cartão de crédito para acompanhar as faturas."
            />
          ) : (
            <div className="space-y-3">
              {creditCards.map((card) => {
                const config = BANK_CONFIGS[card.bank] || BANK_CONFIGS['Outro']
                return (
                  <div
                    key={card.id}
                    onClick={() => navigate(`/cartoes/${card.id}`)}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: config.cardBg }}
                      >
                        {card.last_four}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {card.name}
                        </div>
                        <div className="text-[10px] text-slate-400">Vence dia {card.due_day}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(card.current_invoice_total, hideValues)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {card.used_percentage}% limite
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Metas Top 3 */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 shadow-sm bg-white dark:bg-[#121A2B]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-teal-600" />
              Metas Financeiras
            </h3>
            <Link to="/metas" className="text-xs text-emerald-600 font-semibold hover:underline">
              Ver todas
            </Link>
          </div>

          {topGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma meta criada"
              description="Defina metas financeiras para acompanhar sua evolução."
            />
          ) : (
            <div className="space-y-4">
              {topGoals.map((g) => (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {g.name}
                    </span>
                    <span className="font-bold text-emerald-600">{g.percentage}%</span>
                  </div>
                  <Progress value={g.percentage} className="h-2 rounded-full" />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatCurrency(g.accumulated, hideValues)}</span>
                    <span>Meta: {formatCurrency(g.target_value, hideValues)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Compromissos Futuros (5 próximos) */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 shadow-sm bg-white dark:bg-[#121A2B]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Compromissos Futuros
            </h3>
            <Link
              to="/contas-e-boletos"
              className="text-xs text-emerald-600 font-semibold hover:underline"
            >
              Ver agenda
            </Link>
          </div>

          {pendingBillsAndTxns.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nenhum compromisso pendente"
              description="Você está em dia com seus compromissos financeiros."
            />
          ) : (
            <div className="space-y-2.5">
              {pendingBillsAndTxns.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs"
                >
                  <div className="overflow-hidden mr-2">
                    <div className="font-semibold truncate text-slate-800 dark:text-slate-200">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-400">{formatDate(item.date)}</div>
                  </div>
                  <div
                    className={`font-bold tabular-nums whitespace-nowrap ${
                      item.type === 'receita' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {item.type === 'receita' ? '+' : '−'}
                    {formatCurrency(item.value, hideValues)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Orçamentos do mês */}
      {monthBudgets.length > 0 && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 shadow-sm bg-white dark:bg-[#121A2B]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              Orçamentos de {currentMonthName}
            </h3>
            <Link
              to="/orcamento"
              className="text-xs text-emerald-600 font-semibold hover:underline"
            >
              Gerenciar
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthBudgets.map((b) => {
              const overspent = (b.spent || 0) > b.limit_value
              return (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {b.category}
                    </span>
                    <span
                      className={`font-bold ${overspent ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      {b.percentage}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, b.percentage || 0)}
                    className={`h-2 rounded-full ${overspent ? '[&>div]:bg-red-500' : ''}`}
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatCurrency(b.spent, hideValues)}</span>
                    <span>Limite: {formatCurrency(b.limit_value, hideValues)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <TransactionModal open={modalOpen} onOpenChange={setModalOpen} initialType={modalType} />
    </div>
  )
}
