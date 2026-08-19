import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/constants'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  HelpCircle,
  Target,
  Calendar,
  ShieldCheck,
  Flame,
  ArrowRight,
  ChevronDown,
  Wallet,
  PiggyBank,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Scissors,
  BarChart3,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LoadingState, ErrorState } from '@/components/States'
import { cn } from '@/lib/utils'

type HealthLevel = 'otima' | 'boa' | 'atencao' | 'critica'

const HEALTH_META: Record<
  HealthLevel,
  { label: string; color: string; bg: string; bar: string; icon: string }
> = {
  otima: {
    label: 'Ótima',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    bar: 'bg-emerald-500',
    icon: '🟢',
  },
  boa: {
    label: 'Boa',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    bar: 'bg-blue-500',
    icon: '🔵',
  },
  atencao: {
    label: 'Atenção',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    bar: 'bg-amber-500',
    icon: '🟡',
  },
  critica: {
    label: 'Crítica',
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/40',
    bar: 'bg-red-500',
    icon: '🔴',
  },
}

type QuickQuestionId = 'cortar' | 'mes' | 'vencer' | 'investimentos'

const QUICK_QUESTIONS: Array<{
  id: QuickQuestionId
  question: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = [
  { id: 'cortar', question: 'Onde posso cortar gastos?', icon: Scissors, color: 'text-orange-600' },
  { id: 'mes', question: 'Como está meu mês?', icon: BarChart3, color: 'text-emerald-600' },
  { id: 'vencer', question: 'O que vai vencer?', icon: Calendar, color: 'text-blue-600' },
  {
    id: 'investimentos',
    question: 'Como estão meus investimentos?',
    icon: TrendingUp,
    color: 'text-indigo-600',
  },
]

export default function AiAdvisorPage() {
  const {
    transactions,
    accounts,
    creditCards,
    bills,
    budgets,
    investments,
    totalInvested,
    totalInvestmentsResult,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()
  const { user, hideValues } = useAuth()

  const [expandedQuestion, setExpandedQuestion] = useState<QuickQuestionId | null>(null)

  const analytics = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7)
    const todayStr = new Date().toISOString().slice(0, 10)

    // 1. Receitas e Despesas do Mês
    const monthTxns = transactions.filter((t) => (t.date || '').startsWith(currentMonthKey))
    const totalIncome = monthTxns
      .filter((t) => t.type === 'receita' && t.status === 'realizado')
      .reduce((acc, t) => acc + Number(t.value || 0), 0)
    const totalExpenses = monthTxns
      .filter((t) => t.type === 'despesa' && t.status === 'realizado')
      .reduce((acc, t) => acc + Number(t.value || 0), 0)
    const netSavings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

    // 2. Gastos por Categoria do Mês
    const catMap: Record<string, number> = {}
    monthTxns
      .filter((t) => t.type === 'despesa' && t.status === 'realizado')
      .forEach((t) => {
        const c = t.category || 'Outros'
        catMap[c] = (catMap[c] || 0) + Number(t.value || 0)
      })

    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
    const topCategory = sortedCats[0] || null
    const topCategoryPct =
      totalExpenses > 0 && topCategory ? Math.round((topCategory[1] / totalExpenses) * 100) : 0

    // 3. Contas a Vencer
    const pendingBills = bills.filter((b) => b.status !== 'pago')
    const overdueBills = pendingBills.filter((b) => (b.due_date || '').slice(0, 10) < todayStr)
    const upcomingBills = pendingBills
      .filter((b) => (b.due_date || '').slice(0, 10) >= todayStr)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 5)
    const totalBillsPending = pendingBills.reduce((acc, b) => acc + Number(b.value || 0), 0)

    // 4. Saldo em Contas
    const totalCash = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0)

    // 5. Investimentos
    const totalInvestCurrent = totalInvested + totalInvestmentsResult
    const investGain = totalInvestmentsResult
    const investGainPct = totalInvested > 0 ? (investGain / totalInvested) * 100 : 0

    // 6. Cartões estourados (>80% do limite)
    const cardsNearLimit = creditCards.filter((c) => (c.used_percentage || 0) > 80)

    // 7. Tendência de gastos (últimos 3 meses por categoria)
    const categoryTrend = (() => {
      const months: string[] = []
      const now = new Date()
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(d.toISOString().slice(0, 7))
      }
      const trendMap: Record<string, number[]> = {}
      months.forEach((mk) => {
        transactions
          .filter(
            (t) =>
              t.type === 'despesa' && t.status === 'realizado' && (t.date || '').startsWith(mk),
          )
          .forEach((t) => {
            const c = t.category || 'Outros'
            if (!trendMap[c]) trendMap[c] = [0, 0, 0]
            const idx = months.indexOf(mk)
            trendMap[c][idx] += Number(t.value || 0)
          })
      })
      const rising = Object.entries(trendMap)
        .filter(([, vals]) => vals[2] > vals[0] && vals[2] > 0)
        .map(([cat, vals]) => ({
          category: cat,
          values: vals,
          diff: vals[2] - vals[0],
          pct: vals[0] > 0 ? ((vals[2] - vals[0]) / vals[0]) * 100 : 100,
        }))
        .sort((a, b) => b.diff - a.diff)
      return { months, rising }
    })()

    // 8. Alerta de orçamento (>80%)
    const budgetAlerts = budgets
      .filter((b) => b.month === currentMonthKey && (b.percentage || 0) >= 80)
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))

    // 9. Sugestão de economia (gastos recorrentes médios)
    const recurringSuggestion = (() => {
      // média de despesa dos últimos 3 meses
      const now = new Date()
      let total3m = 0
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const mk = d.toISOString().slice(0, 7)
        total3m += transactions
          .filter(
            (t) =>
              t.type === 'despesa' && t.status === 'realizado' && (t.date || '').startsWith(mk),
          )
          .reduce((acc, t) => acc + Number(t.value || 0), 0)
      }
      const avgMonthly = total3m / 3
      // sugere investir 10% da média se houver sobra
      const suggested = Math.max(0, Math.round((avgMonthly * 0.1) / 50) * 50)
      return { avgMonthly, suggested }
    })()

    // 10. Saúde Financeira
    let healthScore = 70
    const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 1
    if (expenseRatio < 0.7) healthScore += 15
    else if (expenseRatio > 1) healthScore -= 25
    if (savingsRate > 20) healthScore += 5
    if (overdueBills.length > 0) healthScore -= 20
    if (cardsNearLimit.length > 0) healthScore -= 10
    if (totalCash > totalBillsPending) healthScore += 10
    healthScore = Math.max(5, Math.min(100, healthScore))

    let healthLevel: HealthLevel = 'critica'
    if (healthScore >= 80) healthLevel = 'otima'
    else if (healthScore >= 65) healthLevel = 'boa'
    else if (healthScore >= 45) healthLevel = 'atencao'

    return {
      currentMonthKey,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      topCategory,
      topCategoryPct,
      sortedCats,
      overdueBills,
      upcomingBills,
      pendingBills,
      totalBillsPending,
      totalCash,
      totalInvested,
      totalInvestCurrent,
      investGain,
      investGainPct,
      cardsNearLimit,
      categoryTrend,
      budgetAlerts,
      recurringSuggestion,
      healthScore,
      healthLevel,
    }
  }, [
    transactions,
    accounts,
    bills,
    investments,
    creditCards,
    budgets,
    totalInvested,
    totalInvestmentsResult,
  ])

  // Respostas das perguntas rápidas
  const getAnswer = (id: QuickQuestionId): React.ReactNode => {
    if (id === 'cortar') {
      if (analytics.sortedCats.length === 0) {
        return (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Você ainda não registrou despesas suficientes este mês. Registre seus lançamentos para
            identificarmos oportunidades de corte.
          </p>
        )
      }
      const rising = analytics.categoryTrend.rising.slice(0, 3)
      return (
        <div className="space-y-3 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            Analisamos suas categorias de gasto dos últimos 3 meses. Sua maior despesa atual é{' '}
            <strong className="text-slate-900 dark:text-white">{analytics.topCategory?.[0]}</strong>{' '}
            ({formatCurrency(analytics.topCategory?.[1] || 0, hideValues)}).
          </p>
          {rising.length > 0 ? (
            <>
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Categorias com tendência de alta (últimos 3 meses):
              </p>
              <div className="space-y-2">
                {rising.map((r) => (
                  <div
                    key={r.category}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {r.category}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatCurrency(r.values[0], hideValues)} →{' '}
                        {formatCurrency(r.values[2], hideValues)}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 font-bold">
                        <TrendingUp className="w-3 h-3 mr-0.5" />+{r.pct.toFixed(0)}%
                      </Badge>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Corte 15%:{' '}
                        <strong className="text-emerald-600">
                          {formatCurrency(r.values[2] * 0.15, hideValues)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-600 dark:text-slate-300">
              Nenhuma categoria apresenta tendência de alta significativa nos últimos 3 meses. Bom
              sinal!
            </p>
          )}
          <p className="text-xs text-slate-500 flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            Dica: definir um teto mensal na aba Orçamento para as categorias acima evita
            extrapolações.
          </p>
        </div>
      )
    }

    if (id === 'mes') {
      const ratio =
        analytics.totalIncome > 0 ? (analytics.totalExpenses / analytics.totalIncome) * 100 : 0
      return (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <div className="text-[11px] text-slate-500">Receitas</div>
              <div className="font-black text-emerald-600 tabular-nums">
                +{formatCurrency(analytics.totalIncome, hideValues)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30">
              <div className="text-[11px] text-slate-500">Despesas</div>
              <div className="font-black text-orange-600 tabular-nums">
                −{formatCurrency(analytics.totalExpenses, hideValues)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="text-[11px] text-slate-500">Saldo</div>
              <div
                className={cn(
                  'font-black tabular-nums',
                  analytics.netSavings >= 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {analytics.netSavings >= 0 ? '+' : ''}
                {formatCurrency(analytics.netSavings, hideValues)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="text-[11px] text-slate-500">Economia</div>
              <div className="font-black text-slate-900 dark:text-white">
                {analytics.savingsRate}%
              </div>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Você está gastando{' '}
            <strong className={ratio > 100 ? 'text-red-600' : 'text-slate-900 dark:text-white'}>
              {ratio.toFixed(0)}%
            </strong>{' '}
            da sua renda.{' '}
            {analytics.netSavings >= 0
              ? '🎉 Excelente! Você está fechando o mês no azul e gerando poupança.'
              : '⚠️ Atenção: suas despesas superaram as receitas. Recomendo conter novos gastos.'}
          </p>
          {analytics.sortedCats.length > 0 && (
            <div>
              <p className="text-slate-600 dark:text-slate-300 font-medium mb-1.5">
                Gastos por categoria (top 5):
              </p>
              <div className="space-y-1">
                {analytics.sortedCats.slice(0, 5).map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(val, hideValues)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (id === 'vencer') {
      if (analytics.upcomingBills.length === 0 && analytics.overdueBills.length === 0) {
        return (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Todas as suas contas cadastradas estão em dia! Nenhuma pendência no momento.
          </div>
        )
      }
      return (
        <div className="space-y-3 text-sm">
          {analytics.overdueBills.length > 0 && (
            <div>
              <p className="text-red-600 font-bold flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-4 h-4" />
                {analytics.overdueBills.length} conta(s) vencida(s):
              </p>
              <div className="space-y-1.5">
                {analytics.overdueBills.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/30"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {b.description}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1">
                        venceu em {formatDate(b.due_date)}
                      </span>
                    </div>
                    <span className="font-bold text-red-600 tabular-nums">
                      {formatCurrency(b.value, hideValues)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-1.5">
              Próximos compromissos:
            </p>
            <div className="space-y-1.5">
              {analytics.upcomingBills.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {b.description}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1">
                      {formatDate(b.due_date)}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(b.value, hideValues)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Total pendente:{' '}
            <strong>{formatCurrency(analytics.totalBillsPending, hideValues)}</strong> • Saldo em
            contas: <strong>{formatCurrency(analytics.totalCash, hideValues)}</strong>
          </p>
        </div>
      )
    }

    // investimentos
    if (investments.length === 0) {
      return (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Você ainda não cadastrou investimentos. Vá até a aba "Investimentos" para registrar CDB,
          CDI 100%, Ações, FIIs ou Criptomoedas.
        </p>
      )
    }
    const types = new Set(investments.map((i) => i.type))
    const diversificationTip = types.size < 3 && investments.length < 4
    return (
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <div className="text-[11px] text-slate-500">Total aplicado</div>
            <div className="font-black text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(analytics.totalInvested, hideValues)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
            <div className="text-[11px] text-slate-500">Patrimônio atual</div>
            <div className="font-black text-emerald-600 tabular-nums">
              {formatCurrency(analytics.totalInvestCurrent, hideValues)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <div className="text-[11px] text-slate-500">Rentabilidade</div>
            <div
              className={cn(
                'font-black tabular-nums',
                analytics.investGain >= 0 ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {analytics.investGain >= 0 ? '+' : ''}
              {analytics.investGainPct.toFixed(1)}%
            </div>
          </div>
        </div>
        <div>
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-1.5">Sua carteira:</p>
          <div className="space-y-1">
            {investments.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {inv.name}{' '}
                  <span className="text-[10px] uppercase text-slate-400">({inv.type})</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(inv.current_total_value || inv.applied_value, hideValues)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {diversificationTip && (
          <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl">
            <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Sua carteira está concentrada em poucos ativos. Considere diversificar entre renda fixa,
            variável e cripto para reduzir riscos.
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <LoadingState message="Analisando seus dados financeiros..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar a análise. Tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  const health = HEALTH_META[analytics.healthLevel]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">IA Financeira</h2>
            <Badge className="bg-emerald-500 text-white gap-1 text-[11px] font-bold py-0.5">
              <Sparkles className="w-3 h-3 fill-current" /> Análise Inteligente
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Diagnóstico completo em tempo real e insights acionáveis baseados nos seus dados
          </p>
        </div>
      </div>

      {/* Painel de análise: Saúde + Resumo do mês */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Saúde Financeira */}
        <Card
          className={cn(
            'rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-5',
            health.bg,
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saúde Financeira</span>
            <ShieldCheck className={cn('w-5 h-5', health.color)} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={cn('text-2xl font-black', health.color)}>{health.label}</span>
            <span className="text-xs font-bold font-mono text-slate-400">
              {analytics.healthScore}/100
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', health.bar)}
              style={{ width: `${analytics.healthScore}%` }}
            />
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-slate-500">
            {analytics.overdueBills.length > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" /> {analytics.overdueBills.length} conta(s)
                vencida(s)
              </div>
            )}
            {analytics.cardsNearLimit.length > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-3 h-3" /> {analytics.cardsNearLimit.length} cartão(ões)
                acima de 80% do limite
              </div>
            )}
            {analytics.overdueBills.length === 0 && analytics.cardsNearLimit.length === 0 && (
              <div className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Sem pendências críticas
              </div>
            )}
          </div>
        </Card>

        {/* Maior categoria de gasto */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Maior Categoria de Gasto</span>
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900 dark:text-white truncate">
              {analytics.topCategory?.[0] || 'Nenhuma'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-orange-600 tabular-nums">
                {formatCurrency(analytics.topCategory?.[1] || 0, hideValues)}
              </span>
              <span className="text-xs text-slate-400">{analytics.topCategoryPct}% do total</span>
            </div>
          </div>
        </Card>

        {/* Resumo do mês */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Resumo do Mês</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-slate-400">Receitas</div>
              <div className="font-bold text-emerald-600 tabular-nums">
                +{formatCurrency(analytics.totalIncome, hideValues)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Despesas</div>
              <div className="font-bold text-orange-600 tabular-nums">
                −{formatCurrency(analytics.totalExpenses, hideValues)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Saldo</div>
              <div
                className={cn(
                  'font-bold tabular-nums',
                  analytics.netSavings >= 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {formatCurrency(analytics.netSavings, hideValues)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Economia</div>
              <div className="font-bold text-slate-900 dark:text-white">
                {analytics.savingsRate}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Compromissos futuros + Investimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compromissos futuros */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Compromissos Futuros
            </h3>
            <Badge variant="outline" className="text-xs">
              {analytics.pendingBills.length} pendente(s)
            </Badge>
          </div>
          {analytics.upcomingBills.length === 0 && analytics.overdueBills.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center">
              Você está em dia com seus compromissos.
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.overdueBills.slice(0, 2).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/30"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {b.description}
                    </div>
                    <div className="text-[10px] text-red-600 font-medium">
                      Venceu em {formatDate(b.due_date)}
                    </div>
                  </div>
                  <span className="font-bold text-red-600 text-xs tabular-nums">
                    {formatCurrency(b.value, hideValues)}
                  </span>
                </div>
              ))}
              {analytics.upcomingBills.slice(0, 3).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {b.description}
                    </div>
                    <div className="text-[10px] text-slate-400">{formatDate(b.due_date)}</div>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs tabular-nums">
                    {formatCurrency(b.value, hideValues)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Investimentos */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Investimentos
            </h3>
            <Badge variant="outline" className="text-xs">
              {investments.length} ativo(s)
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-400">Patrimônio total</div>
              <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(analytics.totalInvestCurrent, hideValues)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Rentabilidade</div>
              <div
                className={cn(
                  'text-lg font-black tabular-nums',
                  analytics.investGain >= 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {analytics.investGain >= 0 ? '+' : ''}
                {analytics.investGainPct.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Ganho/perda: {formatCurrency(analytics.investGain, hideValues)}
          </div>
        </Card>
      </div>

      {/* Perguntas rápidas */}
      <div>
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          Perguntas Rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_QUESTIONS.map((q) => {
            const Icon = q.icon
            const isOpen = expandedQuestion === q.id
            return (
              <Card
                key={q.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedQuestion(isOpen ? null : q.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Icon className={cn('w-4 h-4', q.color)} />
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {q.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-slate-400 transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {getAnswer(q.id)}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Análises complementares */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tendência de gastos */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Tendência de Gastos
            </h3>
          </div>
          {analytics.categoryTrend.rising.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Nenhuma categoria com tendência de alta nos últimos 3 meses.
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.categoryTrend.rising.slice(0, 3).map((r) => (
                <div
                  key={r.category}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {r.category}
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold text-[10px]">
                    +{r.pct.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2">
            Comparativo dos últimos 3 meses por categoria.
          </p>
        </Card>

        {/* Alerta de orçamento */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Alerta de Orçamento
            </h3>
          </div>
          {analytics.budgetAlerts.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Todos os orçamentos estão dentro do limite.
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.budgetAlerts.map((b) => (
                <div key={b.id} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {b.category}
                    </span>
                    <span
                      className={cn(
                        'font-bold',
                        (b.percentage || 0) >= 100 ? 'text-red-600' : 'text-amber-600',
                      )}
                    >
                      {b.percentage}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, b.percentage || 0)}
                    className={cn(
                      'h-1.5 rounded-full',
                      (b.percentage || 0) >= 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500',
                    )}
                  />
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2">
            Categorias acima de 80% do orçamento do mês.
          </p>
        </Card>

        {/* Sugestão de economia */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
              Sugestão de Economia
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            Com base na sua média de gastos dos últimos 3 meses (
            <strong>
              {formatCurrency(analytics.recurringSuggestion.avgMonthly, hideValues)}/mês
            </strong>
            ), você poderia investir:
          </p>
          <div className="text-3xl font-black text-emerald-600 tabular-nums">
            {formatCurrency(analytics.recurringSuggestion.suggested, hideValues)}
          </div>
          <div className="text-xs text-slate-500 mt-1">por mês em aportes regulares</div>
          <div className="mt-3 flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
            <Target className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Aportes mensais constantes aceleram o efeito dos juros compostos.
          </div>
        </Card>
      </div>

      {/* Rodapé */}
      <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        Análise programática baseada nos seus dados reais de{' '}
        {formatMonthYear(analytics.currentMonthKey)}.
      </div>
    </div>
  )
}
